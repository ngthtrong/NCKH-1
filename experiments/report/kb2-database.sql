-- Read-only application-plane isolation checks, then an isolated TEMP benchmark.
-- Run inside the report PostgreSQL container as its bootstrap admin, with
-- psql variables runtime_role and tenant_a (no secrets in the SQL file).
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE :runtime_role;
SELECT count(*) AS rows_without_tenant_context FROM tasks;
DO $$ BEGIN
    IF (SELECT count(*) FROM tasks) <> 0 THEN RAISE EXCEPTION 'RLS leaked rows without context'; END IF;
END $$;
SELECT set_config('app.tenant_id', :'tenant_a', true);
SELECT count(*) FILTER (WHERE tenant_id <> :'tenant_a'::uuid) AS foreign_rows_without_where FROM tasks;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM tasks WHERE tenant_id<>current_setting('app.tenant_id')::uuid)
    THEN RAISE EXCEPTION 'RLS leaked foreign tenant rows'; END IF;
END $$;
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM tasks WHERE tenant_id=:'tenant_a'::uuid AND deleted_at IS NULL ORDER BY board_id,position LIMIT 20;
ROLLBACK;

-- This benchmark never disables RLS on a business table. The probe uses the
-- same app role and SELECT predicate before/after enabling its tenant policy.
BEGIN;
CREATE TEMP TABLE rls_probe AS SELECT gen_random_uuid() AS id,
  CASE WHEN i%2=0 THEN '10000000-0000-0000-0000-000000000001'::uuid
       ELSE '20000000-0000-0000-0000-000000000002'::uuid END AS tenant_id
  FROM generate_series(1,100000) AS i;
CREATE INDEX ON rls_probe(tenant_id,id);
ANALYZE rls_probe;
GRANT SELECT ON rls_probe TO :runtime_role;
SELECT format('GRANT USAGE ON SCHEMA %I TO %I', nspname, :'runtime_role') FROM pg_namespace WHERE oid=pg_my_temp_schema() \gexec
SET LOCAL ROLE :runtime_role;
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM rls_probe WHERE tenant_id='10000000-0000-0000-0000-000000000001' ORDER BY id LIMIT 50;
RESET ROLE;
ALTER TABLE rls_probe ENABLE ROW LEVEL SECURITY;
ALTER TABLE rls_probe FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_boundary ON rls_probe
USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid);
SET LOCAL ROLE :runtime_role;
SELECT set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',true);
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM rls_probe WHERE tenant_id='10000000-0000-0000-0000-000000000001' ORDER BY id LIMIT 50;
ROLLBACK;
