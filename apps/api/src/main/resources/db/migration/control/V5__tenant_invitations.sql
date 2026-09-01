CREATE TABLE tenant_invitations (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email varchar(320) NOT NULL,
    role varchar(30) NOT NULL CHECK (role IN ('ADMIN','MEMBER')),
    token_hash varchar(64) NOT NULL UNIQUE,
    status varchar(30) NOT NULL CHECK (status IN ('PENDING','ACCEPTED','REJECTED','REVOKED','EXPIRED')),
    invited_by uuid NOT NULL REFERENCES user_accounts(id),
    accepted_by_user_id uuid REFERENCES user_accounts(id),
    expires_at timestamptz NOT NULL,
    responded_at timestamptz,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);

CREATE INDEX idx_tenant_invitations_tenant_created
    ON tenant_invitations(tenant_id, created_at DESC);

CREATE UNIQUE INDEX uq_tenant_invitations_pending_email
    ON tenant_invitations(tenant_id, lower(email))
    WHERE status = 'PENDING';
