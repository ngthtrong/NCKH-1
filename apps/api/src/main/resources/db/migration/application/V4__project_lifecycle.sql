ALTER TABLE projects
    ADD COLUMN status varchar(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'ARCHIVED', 'DELETED')),
    ADD COLUMN archived_at timestamptz,
    ADD COLUMN deleted_at timestamptz;

CREATE INDEX idx_projects_tenant_status ON projects(tenant_id, status, updated_at DESC);
