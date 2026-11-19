-- Control Plane tables are global to the platform and must not have Row-Level Security enabled.
ALTER TABLE IF EXISTS tenant_branding DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tenant_branding NO FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON tenant_branding;
DROP POLICY IF EXISTS tenant_boundary ON tenant_branding;
