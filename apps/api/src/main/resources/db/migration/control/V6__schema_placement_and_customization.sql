ALTER TABLE tenant_placements
    DROP CONSTRAINT tenant_placements_placement_type_check;

ALTER TABLE tenant_placements
    ADD CONSTRAINT tenant_placements_placement_type_check
    CHECK (placement_type IN ('POOL','SCHEMA_PER_TENANT','SILO_DATABASE'));

ALTER TABLE tenant_placements ADD COLUMN schema_name varchar(63);

UPDATE tenant_placements
SET schema_name = 'public'
WHERE placement_type IN ('POOL','SILO_DATABASE') AND schema_name IS NULL;

CREATE TABLE tenant_capabilities (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    capability varchar(40) NOT NULL CHECK (capability IN ('BRANDING','CUSTOM_DATA','APPROVALS','AUTOMATION')),
    granted boolean NOT NULL DEFAULT true,
    enabled boolean NOT NULL DEFAULT true,
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    UNIQUE (tenant_id, capability)
);

CREATE TABLE tenant_branding (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    primary_color varchar(7) NOT NULL DEFAULT '#4F46E5',
    accent_color varchar(7) NOT NULL DEFAULT '#0EA5E9',
    logo_storage_key varchar(1000),
    logo_content_type varchar(100),
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);

CREATE TABLE tenant_config_events (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_user_id uuid REFERENCES user_accounts(id),
    event_type varchar(80) NOT NULL,
    details_json text NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);

CREATE INDEX idx_tenant_config_events_tenant_created
    ON tenant_config_events(tenant_id, created_at DESC);

INSERT INTO tenant_capabilities(id, tenant_id, capability, granted, enabled, version, created_at, updated_at)
SELECT gen_random_uuid(), tenants.id, capability.name,
       capability.name = 'BRANDING', capability.name = 'BRANDING', 0, now(), now()
FROM tenants
CROSS JOIN (VALUES ('BRANDING'),('CUSTOM_DATA'),('APPROVALS'),('AUTOMATION')) AS capability(name)
ON CONFLICT (tenant_id, capability) DO NOTHING;
