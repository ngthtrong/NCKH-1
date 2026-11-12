"""RLS checks and five paired benchmarks on the isolated experimental database only."""
import json,os,subprocess,sys
from pathlib import Path
out=Path(sys.argv[1]);fixtures=json.loads(Path(sys.argv[2]).read_text());pg='nckh-experiment-postgres-1'
admin=os.environ.get('POSTGRES_ADMIN_USER','postgres');role=os.environ.get('POOL_DB_USER','pool_api')
def sql(text):
 r=subprocess.run(['docker','exec','-i',pg,'psql','-qAt','-U',admin,'-d','pool_db','-v','ON_ERROR_STOP=1'],input=text,text=True,capture_output=True)
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout
# role identifiers originate from the private, operator-controlled env and must be identifiers.
if not role.replace('_','').isalnum():raise ValueError('Invalid role')
a=fixtures['small']['tenantId'];b=fixtures['large']['tenantId']
checks=sql(f"""BEGIN; SET LOCAL ROLE {role};
SELECT json_build_object('case','KB-2.3','rows',count(*)) FROM tasks;
SELECT set_config('app.tenant_id','{a}',true);
SELECT json_build_object('case','KB-2.1','own_rows',count(*) FILTER(WHERE tenant_id='{a}'),'foreign_rows',count(*) FILTER(WHERE tenant_id<>'{a}')) FROM tasks;
ROLLBACK;
BEGIN; SET LOCAL ROLE {role};
SELECT json_build_object('case','KB-2.3-reused-connection','rows',count(*)) FROM tasks;
ROLLBACK;
""")
records=[json.loads(s) for s in checks.splitlines() if s.startswith('{')]
if any(r.get('foreign_rows',r.get('rows',0))!=0 for r in records):raise RuntimeError('RLS boundary failure')
(out/'database-isolation.json').write_text(json.dumps(records,indent=2))
plans={}
for name,f in fixtures.items():
 text=sql(f"""BEGIN;SET LOCAL ROLE {role};SELECT set_config('app.tenant_id','{f['tenantId']}',true);
EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT * FROM tasks WHERE tenant_id='{f['tenantId']}' AND board_id='{f['boardId']}' AND deleted_at IS NULL ORDER BY board_column_id,position;ROLLBACK;""")
 plans[name]=json.loads(text[text.index('['):])
(out/'query-plans.json').write_text(json.dumps(plans,indent=2))
# No business RLS setting is changed outside nckh-experiment. Always restore it.
results=[]
try:
 for repeat in range(1,6):
  order=['off','on'] if repeat%2 else ['on','off']
  for variant in order:
   f=fixtures['large'];tid=f['tenantId'];board=f['boardId']
   query=f"SELECT * FROM tasks WHERE tenant_id='{tid}' AND board_id='{board}' AND deleted_at IS NULL ORDER BY board_column_id,position LIMIT 200"
   escaped=query.replace("'","''")
   ddl='ENABLE' if variant=='on' else 'DISABLE'
   context=f"PERFORM set_config('app.tenant_id','{tid}',true);" if variant=='on' else ''
   raw=sql(f"""BEGIN; ALTER TABLE tasks {ddl} ROW LEVEL SECURITY;
CREATE TEMP TABLE timings(i int, elapsed_ms double precision, plan jsonb);
GRANT SELECT,INSERT ON timings TO {role};
SELECT format('GRANT USAGE ON SCHEMA %I TO %I',nspname,'{role}') FROM pg_namespace WHERE oid=pg_my_temp_schema() \gexec
SET LOCAL ROLE {role};
DO $$ DECLARE t timestamptz; p jsonb; BEGIN
 FOR i IN 1..70 LOOP
  t:=clock_timestamp(); {context}
  EXECUTE 'EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) {escaped}' INTO p;
  IF i>20 THEN INSERT INTO timings VALUES(i,extract(epoch FROM clock_timestamp()-t)*1000,p); END IF;
 END LOOP;END $$;
SELECT coalesce(json_agg(t),'[]') FROM timings t;ROLLBACK;
""")
   samples=json.loads(raw.strip());results.append({'repeat':repeat,'variant':variant,'role':role,'samples':samples})
finally:sql('ALTER TABLE tasks ENABLE ROW LEVEL SECURITY; ALTER TABLE tasks FORCE ROW LEVEL SECURITY;')
(out/'rls-overhead.json').write_text(json.dumps({'description':'Five pairs on actual isolated tasks; same runtime role, query and warm shared buffers. elapsed_ms includes SET LOCAL via set_config for on and EXPLAIN instrumentation; plan Execution Time is executor time only. 20 warmup + 50 samples per branch. No network latency claim.', 'runs':results},indent=2))
print('RLS boundary checks, query plans and five paired SQL benchmarks completed')
