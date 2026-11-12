#!/usr/bin/env python3
"""Run a fixed, isolated Pool experiment. Never restores the nckh-report databases."""
import csv, hashlib, json, os, re, shutil, statistics, subprocess, sys, tarfile, time, uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen
ROOT=Path(__file__).resolve().parents[3]
os.chdir(ROOT)
PROTOCOL=json.loads(Path('experiments/report/controlled/protocol.json').read_text())
STAMP=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
OUT=ROOT/'experiments/results/controlled'/STAMP
OUT.mkdir(parents=True)
PRIVATE=Path('/tmp')/f'nckh-controlled-{STAMP}'; PRIVATE.mkdir(mode=0o700)
NODE='/home/hung/.nvm/versions/node/v22.23.4/bin/node'
COMPOSE=['docker','compose','-p','nckh-experiment','--env-file','infra/.env','-f','infra/compose.yaml','-f','infra/compose.report.yaml','-f','experiments/report/controlled/compose.yaml']
PG='nckh-experiment-postgres-1'; API='nckh-experiment-api-1'
ENV=os.environ.copy();ENV.update(EXPERIMENT_PORT='18081',FIXTURE_FILE=str(PRIVATE/'fixtures.json'))
# Parse only standard KEY=value records without evaluating shell code.
for line in Path('infra/.env').read_text().splitlines():
 if line and not line.startswith('#') and '=' in line:
  k,v=line.split('=',1);ENV.setdefault(k,v.strip().strip('"').strip("'"))
ADMIN=ENV.get('POSTGRES_ADMIN_USER','postgres')

def now():return datetime.now(timezone.utc).isoformat()
def save(p,obj):p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def command(args,log=None,input=None,env=None,check=True):
 with (open(log,'wb') if log else open(os.devnull,'wb')) as stream:
  r=subprocess.run(args,input=input,stdout=stream,stderr=subprocess.STDOUT,env=env or ENV)
 if check and r.returncode:raise RuntimeError(f'Command failed ({r.returncode}): {args[0:4]}; log={log}')
 return r.returncode
def capture(args,input=None):return subprocess.check_output(args,input=input,env=ENV)
def sql(db,text):return capture(['docker','exec','-i',PG,'psql','-U',ADMIN,'-d',db,'-v','ON_ERROR_STOP=1','-At'],text.encode()).decode()
def ready():
 for _ in range(120):
  try:
   if json.load(urlopen('http://accounts.localhost:18081/actuator/health/readiness',timeout=2)).get('status')=='UP':return
  except Exception:pass
  time.sleep(2)
 raise RuntimeError('Experimental API not ready')
def start(rate,cache,log):
 e={**ENV,'RATE_LIMIT_ENABLED':str(rate).lower(),'CACHE_ENABLED':str(cache).lower()}
 command(COMPOSE+['up','-d','--no-build','api','web','caddy','prometheus'],log,env=e);ready()
def restore():
 command(COMPOSE+['stop','api','worker'])
 for db in ['control_db','pool_db']:
  sql('postgres',f'DROP DATABASE IF EXISTS {db} WITH (FORCE);')
  command(['docker','exec','-i',PG,'pg_restore','-U',ADMIN,'-d','postgres','--create'],input=(PRIVATE/f'{db}.dump').read_bytes())
 command(['docker','exec','nckh-experiment-redis-1','redis-cli','FLUSHDB']) # dedicated experimental Redis only
 time.sleep(PROTOCOL['cooldown_seconds'])
def metrics(path):
 try:path.write_bytes(capture(['docker','exec',API,'curl','--max-time','5','-fsS','http://localhost:8080/actuator/prometheus']))
 except subprocess.CalledProcessError:path.write_text('# Metrics endpoint unavailable within 5s; consult Docker stats and HTTP raw data.\n')
def stats_sampler(stopfile,path):
 return subprocess.Popen([sys.executable,str(Path(__file__).with_name('sample.py')),str(stopfile),str(path)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

started=now();manifest={'protocol_id':PROTOCOL['protocol_id'],'run_class':'controlled','data_kind':'measured','started_at':started,'status':'running','protocol_sha256':sha(Path('experiments/report/controlled/protocol.json')),'runs':[],'private_state':str(PRIVATE),'limitations':['Local WSL host shared with demo and load generator.','Protocol fills report placeholders; no external approval or population significance claimed.','Combined cache/limiter comparison does not isolate individual effects.']}
save(OUT/'protocol.json',PROTOCOL);save(OUT/'manifest.json',manifest)
try:
 print(f'OUTPUT {OUT}',flush=True)
 # Freeze an auditable source archive; original worktree need not be committed.
 archive=OUT/'source.tar.gz'
 with tarfile.open(archive,'w:gz') as tar:
  for root in ['apps/api/src','apps/api/pom.xml','apps/web/src','apps/web/package.json','apps/web/package-lock.json','infra','scripts','experiments/report']:
   for p in ([Path(root)] if Path(root).is_file() else sorted(Path(root).rglob('*'))):
    if p.is_file() and p.name!='.env' and '.env.' not in p.name:tar.add(p,arcname=str(p))
 manifest['source_archive_sha256']=sha(archive)
 manifest['git_commit']=capture(['git','rev-parse','HEAD']).decode().strip();manifest['git_dirty']=True
 manifest['report_sha256']=sha(Path('Report (1).docx'))
 manifest['environment']=capture(['docker','inspect','--format','{{.Name}} {{.Config.Image}} {{.Image}} CPU={{.HostConfig.NanoCpus}} RAM={{.HostConfig.Memory}}',API,PG,'nckh-experiment-redis-1','nckh-experiment-web-1']).decode()
 manifest['tools']={'node':capture([NODE,'--version']).decode().strip(),'k6':capture(['docker','run','--rm','grafana/k6:0.57.0','version']).decode().strip(),'docker':capture(['docker','--version']).decode().strip()}
 save(OUT/'manifest.json',manifest)
 resume=os.environ.get('CONTROLLED_RESUME_FROM')
 if resume:
  previous=Path(resume).resolve();old=json.loads((previous/'manifest.json').read_text())
  PRIVATE=Path(old['private_state']);ENV['FIXTURE_FILE']=str(PRIVATE/'fixtures.json')
  manifest['private_state']=str(PRIVATE);manifest['snapshots']=old['snapshots']
  manifest['component_provenance']={'directory':str(previous),'protocol_id':old['protocol_id'],'reason':'Same application and data; functional/SQL design unchanged. V2 fixes generator allocation and mount. V1 load pilot not part of final five pairs.'}
  for name in ['fixtures.json','dataset-counts.txt','database-isolation.json','query-plans.json','rls-overhead.json','sql.log']:
   shutil.copy2(previous/name,OUT/name)
  for r in old['runs']:
   if r['kind']=='functional':
    shutil.copytree(previous/r['directory'],OUT/r['directory']);manifest['runs'].append(r)
  save(OUT/'manifest.json',manifest)
 else:
  ready();command(COMPOSE+['stop','worker'])
  command([NODE,'experiments/report/controlled/api.mjs','prepare',str(PRIVATE/'fixtures.json')],OUT/'prepare.log')
  fixtures=json.loads((PRIVATE/'fixtures.json').read_text())
  # All bulk imports are confined to the isolated DB and committed before snapshots.
  statements=['BEGIN;','ALTER TABLE tasks DISABLE TRIGGER USER;']
  for role,spec in PROTOCOL['dataset'].items():
   f=fixtures[role];n=spec['tasks_per_board'];groups=[]
   for b in range(spec['boards']):
    board=f['boardId'] if b==0 else str(uuid.uuid4());columns=f['columns'] if b==0 else [str(uuid.uuid4()) for _ in f['columns']]
    if b:
     statements.append(f"INSERT INTO boards(id,tenant_id,project_id,name) VALUES ('{board}','{f['tenantId']}','{f['projectId']}','Controlled {role} {b}');")
     for j,c in enumerate(columns):statements.append(f"INSERT INTO board_columns(id,tenant_id,board_id,name,position,completed) VALUES ('{c}','{f['tenantId']}','{board}','Column {j}',{(j+1)*1000},{str(j==len(columns)-1).lower()});")
    taskid=str(uuid.uuid4())
    if b==0:f['taskId']=taskid
    data="jsonb_build_object('channel','Web','budget_usd',800)" if role=='large' else ("jsonb_build_object('story_points',8,'sprint','Sprint 1')" if role=='small' else "'{}'::jsonb")
    statements.append(f"INSERT INTO tasks(id,tenant_id,project_id,board_id,board_column_id,title,position,created_by,custom_data) SELECT CASE WHEN i=1 THEN '{taskid}'::uuid ELSE gen_random_uuid() END,'{f['tenantId']}','{f['projectId']}','{board}','{columns[0]}','Controlled card '||i,i*1000,'{f['userId']}',{data} FROM generate_series(1,{n}) i;")
   statements.append(f"UPDATE boards SET content_version=content_version+1 WHERE tenant_id='{f['tenantId']}';")
  statements+=['ALTER TABLE tasks ENABLE TRIGGER USER;','COMMIT;','ANALYZE;']
  sql('pool_db','\n'.join(statements));save(PRIVATE/'fixtures.json',fixtures);save(OUT/'fixtures.json',fixtures)
  (OUT/'dataset-counts.txt').write_text(sql('pool_db','SELECT tenant_id,count(DISTINCT board_id),count(*) FROM tasks WHERE deleted_at IS NULL GROUP BY tenant_id ORDER BY tenant_id;'))
  # Exports are private because the control snapshot contains password hashes.
  command(COMPOSE+['stop','api'])
  for db in ['control_db','pool_db']:
   (PRIVATE/f'{db}.dump').write_bytes(capture(['docker','exec',PG,'pg_dump','-U',ADMIN,'-Fc',db]))
  manifest['snapshots']={db:sha(PRIVATE/f'{db}.dump') for db in ['control_db','pool_db']};save(OUT/'manifest.json',manifest)
  # Five independent functional trials, with exact seed restoration each time.
  for repeat in range(1,6):
   folder=OUT/f'functional-{repeat}';folder.mkdir();restore();start(False,True,folder/'startup.log')
   since=now();e={**ENV,'REPEAT_ID':str(repeat)}
   code=command([NODE,'experiments/report/controlled/api.mjs','verify',str(folder/'evidence.json')],folder/'run.log',env=e,check=False)
   logs=capture(['docker','logs','--since',since,API]);(folder/'api.jsonl').write_bytes(logs)
   audits={}
   for line in logs.decode(errors='replace').splitlines():
    try:d=json.loads(line)
    except ValueError:continue
    rid=d.get('request_id','')
    if rid.startswith(f'controlled-{repeat}-') and 'tenant_request_audit' in d.get('message',''):audits[rid]=d
   evidence=json.loads((folder/'evidence.json').read_text());mismatches=[];expected=0
   for case in evidence['cases']:
    if case['id']=='KB-1.2':
     for sample in case['samples']:
      expected+=1;audit=audits.get(sample['id']);
      if not audit or audit.get('tenant_id')!=sample['tenant']:mismatches.append(sample['id'])
   save(folder/'audit-check.json',{'expected':expected,'matched':expected-len(mismatches),'mismatches':mismatches,'threads':sorted({a.get('thread_name') for a in audits.values()})})
   manifest['runs'].append({'kind':'functional','repeat':repeat,'exit_code':code,'audit_mismatches':len(mismatches),'directory':folder.name});save(OUT/'manifest.json',manifest)
   print(f'FUNCTIONAL {repeat}/5 exit={code} audit_mismatches={len(mismatches)}',flush=True)
  # Benchmark/security SQL is executed on actual isolated tables; see sql.py.
  command([sys.executable,'experiments/report/controlled/sql.py',str(OUT),str(PRIVATE/'fixtures.json')],OUT/'sql.log')
 for pair,order in enumerate(PROTOCOL['pair_order'],1):
  for variant in order:
   folder=OUT/f'pair-{pair}-{variant}';folder.mkdir();restore();start(variant=='after',variant=='after',folder/'startup.log')
   (folder/'architecture.json').write_bytes(urlopen('http://accounts.localhost:18081/api/v1/architecture',timeout=5).read())
   metrics(folder/'metrics-before.prom');stop=folder/'sampler.stop';sampler=stats_sampler(stop,folder/'docker-stats.jsonl')
   e={**ENV,'VARIANT':variant,'WARMUP_SECONDS':str(PROTOCOL['warmup_seconds']),'MEASURE_SECONDS':str(PROTOCOL['measurement_seconds']),'SLO_P95_MS':str(PROTOCOL['slo']['victim_p95_ms'])}
   args=['docker','run','--rm','--network','nckh-experiment_saas','--user',f'{os.getuid()}:{os.getgid()}',
     '-v',f'{ROOT}/experiments/report/controlled:/scripts:ro','-v',f'{OUT}:/private:ro','-v',f'{folder}:/results',
     *[x for key in ['DEMO_OWNER_EMAIL','DEMO_OWNER_PASSWORD','VARIANT','WARMUP_SECONDS','MEASURE_SECONDS','SLO_P95_MS'] for x in ['-e',key]],
     'grafana/k6:0.57.0','run','--summary-export','/results/summary.json','--out','json=/results/raw-metrics.json','/scripts/load.js']
   runstart=now();code=command(args,folder/'k6.log',env=e,check=False);stop.touch();sampler.wait(timeout=30);metrics(folder/'metrics-after.prom')
   run={'kind':'load','pair':pair,'variant':variant,'exit_code':code,'started_at':runstart,'finished_at':now(),'directory':folder.name,'snapshot_sha256':manifest['snapshots']}
   manifest['runs'].append(run);save(OUT/'manifest.json',manifest)
   print(f'LOAD pair={pair}/5 variant={variant} exit={code}',flush=True)
 manifest['status']='completed';manifest['finished_at']=now();save(OUT/'manifest.json',manifest)
 command([sys.executable,'experiments/report/controlled/analyze.py',str(OUT)],OUT/'analysis.log')
 print(f'COMPLETE {OUT}',flush=True)
except Exception as error:
 manifest['status']='interrupted';manifest['error']=str(error);manifest['finished_at']=now();save(OUT/'manifest.json',manifest);raise
finally:
 # Keep the user demo untouched; experimental API is returned to its protected mode.
 try:start(True,True,OUT/'final-startup.log')
 except Exception:pass
