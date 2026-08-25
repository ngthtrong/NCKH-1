CREATE TABLE user_accounts (
    id uuid PRIMARY KEY,
    email varchar(320) NOT NULL UNIQUE,
    display_name varchar(160) NOT NULL,
    password_hash varchar(200) NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    system_admin boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);

CREATE TABLE tenants (
    id uuid PRIMARY KEY,
    slug varchar(63) NOT NULL UNIQUE,
    name varchar(160) NOT NULL,
    tier varchar(40) NOT NULL,
    status varchar(40) NOT NULL CHECK (status IN ('PENDING_PAYMENT','PROVISIONING','ACTIVE','FAILED','SUSPENDED')),
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);

CREATE TABLE tenant_memberships (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    role varchar(30) NOT NULL CHECK (role IN ('OWNER','ADMIN','MEMBER')),
    active boolean NOT NULL DEFAULT true,
    security_version bigint NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    UNIQUE (tenant_id, user_id)
);

CREATE INDEX idx_tenant_membership_user ON tenant_memberships(user_id, active);

CREATE TABLE tenant_placements (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    placement_type varchar(40) NOT NULL CHECK (placement_type IN ('POOL','SILO_DATABASE')),
    database_host varchar(255),
    database_port integer,
    database_name varchar(63),
    database_username varchar(63),
    encrypted_password varchar(1000),
    schema_version varchar(50),
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);

CREATE TABLE tenant_session_grants (
    id uuid PRIMARY KEY,
    code_hash varchar(64) NOT NULL UNIQUE,
    user_id uuid NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);

CREATE TABLE refresh_sessions (
    id uuid PRIMARY KEY,
    token_hash varchar(64) NOT NULL UNIQUE,
    user_id uuid NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);

CREATE TABLE payment_transactions (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider varchar(40) NOT NULL,
    provider_reference varchar(120) NOT NULL UNIQUE,
    idempotency_key varchar(120) NOT NULL UNIQUE,
    status varchar(30) NOT NULL CHECK (status IN ('CREATED','PENDING','SUCCEEDED','FAILED','EXPIRED')),
    amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
    currency varchar(3) NOT NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);

CREATE TABLE provisioning_jobs (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    idempotency_key varchar(120) NOT NULL UNIQUE,
    status varchar(40) NOT NULL CHECK (status IN ('QUEUED','RUNNING','SUCCEEDED','RETRYABLE_FAILED','FAILED_ROLLED_BACK')),
    attempts integer NOT NULL DEFAULT 0,
    next_attempt_at timestamptz,
    last_error_code varchar(80),
    last_error_message varchar(500),
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);

CREATE INDEX idx_provisioning_jobs_due ON provisioning_jobs(status, next_attempt_at);
