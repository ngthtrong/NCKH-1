-- =============================================================================
-- TenantFlow V1 Schema: Pool Level 3 Multi-Tenant Kanban (5 Tables + FORCE RLS)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Control Plane: tenants
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('FREE', 'STANDARD', 'PRO', 'ENTERPRISE')),
    rate_limit_rpm INT NOT NULL DEFAULT 120 CHECK (rate_limit_rpm > 0),
    max_members INT NOT NULL DEFAULT 50 CHECK (max_members > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Control Plane: tenant_users (1-to-1 binding: 1 account belongs to 1 tenant_id)
CREATE TABLE tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(180) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    role VARCHAR(24) NOT NULL CHECK (role IN ('TENANT_ADMIN', 'MEMBER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, email)
);

CREATE INDEX idx_tenant_users_email ON tenant_users (email);

-- 3. Data Plane: boards
CREATE TABLE boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_boards_tenant_created ON boards (tenant_id, created_at DESC);

-- 4. Data Plane: board_columns
CREATE TABLE board_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    position INT NOT NULL,
    wip_limit INT NULL CHECK (wip_limit IS NULL OR wip_limit > 0)
);

CREATE INDEX idx_columns_tenant_board_pos ON board_columns (tenant_id, board_id, position);

-- 5. Data Plane: cards
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    column_id UUID NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
    assignee_id UUID NULL REFERENCES tenant_users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    position INT NOT NULL DEFAULT 0,
    version INT NOT NULL DEFAULT 1,
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cards_tenant_col_pos ON cards (tenant_id, column_id, position);
CREATE INDEX idx_cards_custom_fields_gin ON cards USING GIN (custom_fields jsonb_path_ops);

-- =============================================================================
-- Grants for runtime role (kanban_app_user)
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON tenants, tenant_users, boards, board_columns, cards TO kanban_app_user;

-- =============================================================================
-- Fail-Closed FORCE ROW LEVEL SECURITY on all 3 Data Plane tables
-- =============================================================================
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards FORCE ROW LEVEL SECURITY;
CREATE POLICY p_boards_isolation ON boards FOR ALL TO PUBLIC
    USING      (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_columns FORCE ROW LEVEL SECURITY;
CREATE POLICY p_board_columns_isolation ON board_columns FOR ALL TO PUBLIC
    USING      (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards FORCE ROW LEVEL SECURITY;
CREATE POLICY p_cards_isolation ON cards FOR ALL TO PUBLIC
    USING      (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
