ALTER TABLE resources
    ADD COLUMN kind varchar(10) NOT NULL DEFAULT 'FILE'
        CHECK (kind IN ('FILE', 'LINK')),
    ADD COLUMN link_url text,
    ADD COLUMN deleted_at timestamptz,
    ALTER COLUMN storage_key DROP NOT NULL;

ALTER TABLE resources
    ADD CONSTRAINT ck_resources_kind_payload CHECK (
        (kind = 'FILE' AND storage_key IS NOT NULL AND link_url IS NULL)
        OR (kind = 'LINK' AND storage_key IS NULL AND link_url IS NOT NULL)
    );

CREATE INDEX idx_resources_tenant_active
    ON resources(tenant_id, created_at DESC)
    WHERE deleted_at IS NULL;
