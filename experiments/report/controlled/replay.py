#!/usr/bin/env python3
"""Replay an explicitly documented invalid harness branch, preserving the failed artifact."""
import json,os,subprocess,sys,time
from pathlib import Path
from datetime import datetime,timezone
from urllib.request import urlopen
root=Path(__file__).resolve().parents[3];os.chdir(root)
out=Path(sys.argv[1]).resolve();variant=sys.argv[2];folder=out/sys.argv[3];folder.mkdir(exist_ok=True)
manifest=json.loads((out/'manifest.json').read_text());private=Path(manifest['private_state']);protocol=json.loads((out/'protocol.json').read_text());env=os.environ.copy()
for line in Path('infra/.env').read_text().splitlines():
 if line and not line.startswith('#') and '='in line:
  k,v=line.split('=',1);env.setdefault(k,v.strip().strip('"').strip("'"))
admin=env['POSTGRES_ADMIN_USER'];compose=['docker','compose','-p','nckh-experiment','--env-file','infra/.env','-f','infra/compose.yaml','-f','infra/compose.report.yaml','-f','experiments/report/controlled/compose.yaml']
def run(args,input=None,log=None,check=True,e=None):
 with open(log or os.devnull,'wb')as f:r=subprocess.run(args,input=input,stdout=f,stderr=subprocess.STDOUT,env=e or env)
 if check and r.returncode:raise RuntimeError(f'{args[:4]} returned {r.returncode}')
 return r.returncode
def ready():
 for _ in range(120):
  try:
   if json.load(urlopen('http://accounts.localhost:18081/actuator/health/readiness',timeout=2))['status']=='UP':return
  except Exception:pass
  time.sleep(2)
 raise RuntimeError('readiness timed out')
def start(v):
 e={**env,'RATE_LIMIT_ENABLED':str(v=='after').lower(),'CACHE_ENABLED':str(v=='after').lower()};run(compose+['up','-d','--no-build','api','web','caddy','prometheus'],e=e,log=folder/f'startup-{v}.log');ready()
run(compose+['stop','api','worker'])
for db in ['control_db','pool_db']:
 run(['docker','exec','nckh-experiment-postgres-1','psql','-U',admin,'-d','postgres','-v','ON_ERROR_STOP=1','-c',f'DROP DATABASE IF EXISTS {db} WITH (FORCE);'])
 run(['docker','exec','-i','nckh-experiment-postgres-1','pg_restore','-U',admin,'-d','postgres','--create'],input=(private/f'{db}.dump').read_bytes())
run(['docker','exec','nckh-experiment-redis-1','redis-cli','FLUSHDB']);time.sleep(protocol['cooldown_seconds'])
if variant=='restore-after':
 start('after');print('Restored canonical snapshot in protected mode',flush=True);sys.exit(0)
start(variant)
def metrics(p):p.write_bytes(subprocess.check_output(['docker','exec','nckh-experiment-api-1','curl','-fsS','http://localhost:8080/actuator/prometheus']))
metrics(folder/'metrics-before.prom');stop=folder/'sampler.stop'
if stop.exists():stop.unlink()
sampler=subprocess.Popen([sys.executable,'experiments/report/controlled/sample.py',str(stop),str(folder/'docker-stats.jsonl')])
e={**env,'VARIANT':variant,'WARMUP_SECONDS':str(protocol['warmup_seconds']),'MEASURE_SECONDS':str(protocol['measurement_seconds']),'SLO_P95_MS':str(protocol['slo']['victim_p95_ms'])}
args=['docker','run','--rm','--network','nckh-experiment_saas','--user',f'{os.getuid()}:{os.getgid()}','-v',f'{root}/experiments/report/controlled:/scripts:ro','-v',f'{out}:/private:ro','-v',f'{folder}:/results',*[x for k in ['DEMO_OWNER_EMAIL','DEMO_OWNER_PASSWORD','VARIANT','WARMUP_SECONDS','MEASURE_SECONDS','SLO_P95_MS']for x in ['-e',k]],'grafana/k6:0.57.0','run','--summary-export','/results/summary.json','--out','json=/results/raw-metrics.json','/scripts/load.js']
started=datetime.now(timezone.utc).isoformat();code=run(args,log=folder/'k6.log',check=False,e=e);stop.touch();sampler.wait(timeout=30);metrics(folder/'metrics-after.prom')
(folder/'replay-manifest.json').write_text(json.dumps({'variant':variant,'exit_code':code,'started_at':started,'finished_at':datetime.now(timezone.utc).isoformat(),'snapshot_sha256':manifest['snapshots'],'reason':'Original branch emitted no load because Docker could not mount the WSL /tmp fixture. Input location corrected, workload and protocol unchanged.'},indent=2))
print(f'REPLAY {variant} exit={code}',flush=True)
# Restore the expected next branch before the suspended controller resumes.
start('after')
