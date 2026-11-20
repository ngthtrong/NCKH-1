import json,os,subprocess,sys,time
from pathlib import Path
out=Path(sys.argv[1]);fixtures=json.loads((out/'fixtures.json').read_text());a=fixtures['small'];b=fixtures['large'];records=[]
def query(text,check=True):
 start=time.perf_counter();r=subprocess.run(['docker','exec','-i','nckh-experiment-postgres-1','psql','-qAt','-U','postgres','-d','pool_db','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'],input=text,text=True,capture_output=True)
 if check and r.returncode:raise RuntimeError(r.stderr)
 return r,time.perf_counter()-start
for repeat in range(1,6):
 text=f"""BEGIN;SET LOCAL ROLE pool_api;
SELECT json_build_object('missing_context',count(*)) FROM tasks;
SELECT set_config('app.tenant_id','{a['tenantId']}',true);
SELECT json_build_object('foreign_rows',count(*)FILTER(WHERE tenant_id<>'{a['tenantId']}'),'own_rows',count(*)FILTER(WHERE tenant_id='{a['tenantId']}')) FROM tasks;
WITH changed AS(UPDATE tasks SET title='must not apply' WHERE tenant_id='{b['tenantId']}' RETURNING id)SELECT json_build_object('foreign_updates',count(*))FROM changed;
WITH changed AS(DELETE FROM tasks WHERE tenant_id='{b['tenantId']}' RETURNING id)SELECT json_build_object('foreign_deletes',count(*))FROM changed;
ROLLBACK;
BEGIN;SET LOCAL ROLE pool_api;SELECT json_build_object('context_after_rollback',count(*))FROM tasks;ROLLBACK;"""
 r,elapsed=query(text);checks=[json.loads(s)for s in r.stdout.splitlines()if s.startswith('{')]
 for c in checks:
  for k,v in c.items():
   if k!='own_rows'and v!=0:raise RuntimeError(f'RLS failed {k}={v}')
 insert=f"BEGIN;SET LOCAL ROLE pool_api;SELECT set_config('app.tenant_id','{a['tenantId']}',true);INSERT INTO tasks(id,tenant_id,project_id,board_id,board_column_id,title,position,created_by)VALUES(gen_random_uuid(),'{b['tenantId']}','{b['projectId']}','{b['boardId']}','{b['columns'][0]}','must not insert',1,'{b['userId']}');ROLLBACK;"
 ri,insert_elapsed=query(insert,False)
 if ri.returncode==0 or '42501' not in ri.stderr or 'row-level security'not in ri.stderr:raise RuntimeError('Foreign INSERT was not rejected by RLS')
 records.append({'repeat':repeat,'status':'PASS','checks':checks,'foreign_insert_sqlstate':'42501','sql_session_roundtrip_ms':elapsed*1000,'insert_roundtrip_ms':insert_elapsed*1000})
(out/'database-isolation-repeated.json').write_text(json.dumps(records,indent=2))
print('Five direct SQL read/update/delete/insert and rollback-context trials passed')
