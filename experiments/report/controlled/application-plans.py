import json,subprocess,sys
from pathlib import Path
out=Path(sys.argv[1]);fixtures=json.loads((out/'fixtures.json').read_text());results={}
for name,f in fixtures.items():
 samples=[]
 for repeat in range(1,6):
  query=f"""BEGIN;SET LOCAL ROLE pool_api;SELECT set_config('app.tenant_id','{f['tenantId']}',true);
EXPLAIN(ANALYZE,BUFFERS,FORMAT JSON)
SELECT t.*,
(SELECT count(*)FROM tasks st WHERE st.tenant_id=t.tenant_id AND st.parent_task_id=t.id AND st.deleted_at IS NULL)subtask_count,
(SELECT count(*)FROM tasks st JOIN board_columns sc ON sc.tenant_id=st.tenant_id AND sc.id=st.board_column_id WHERE st.tenant_id=t.tenant_id AND st.parent_task_id=t.id AND st.deleted_at IS NULL AND sc.completed=true)completed_subtask_count,
(SELECT count(*)FROM comments c WHERE c.tenant_id=t.tenant_id AND c.task_id=t.id AND c.deleted_at IS NULL)comment_count
FROM tasks t WHERE t.tenant_id='{f['tenantId']}'AND t.board_id='{f['boardId']}'AND t.deleted_at IS NULL ORDER BY t.board_column_id,t.position;
ROLLBACK;"""
  r=subprocess.run(['docker','exec','-i','nckh-experiment-postgres-1','psql','-qAt','-U','postgres','-d','pool_db','-v','ON_ERROR_STOP=1'],input=query,text=True,capture_output=True,check=True)
  samples.append({'repeat':repeat,'plan':json.loads(r.stdout[r.stdout.index('['):])})
 results[name]=samples
(out/'application-query-plans.json').write_text(json.dumps({'description':'Actual board task SELECT including correlated subtask/comment counts, executed with runtime role and tenant context. Five samples per role after controlled load, warm DB; executor time excludes HTTP/auth/cache/serialization.', 'roles':results},indent=2))
print('Saved five actual application query plans per role')
