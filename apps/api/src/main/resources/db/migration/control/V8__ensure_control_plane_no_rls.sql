-- Control Plane tables are global to the platform and must not have Row-Level Security enabled.
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', tbl);
    END LOOP;
END $$;

DROP POLICY IF EXISTS tenant_isolation ON tenant_branding;
DROP POLICY IF EXISTS tenant_boundary ON tenant_branding;
