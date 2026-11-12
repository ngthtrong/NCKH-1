CREATE TABLE tenant_kanban_settings (
    tenant_id uuid PRIMARY KEY,
    settings jsonb NOT NULL DEFAULT '{"wipMode":"OFF","wipLimit":2,"cardStyle":"FULL","defaultColumns":["To do","In progress","Done"],"fields":[]}'::jsonb,
    version bigint NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (jsonb_typeof(settings) = 'object')
);
ALTER TABLE tenant_kanban_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kanban_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenant_kanban_settings
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE tasks ADD COLUMN custom_data jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE tasks ADD CONSTRAINT task_custom_data_object CHECK (jsonb_typeof(custom_data) = 'object');
