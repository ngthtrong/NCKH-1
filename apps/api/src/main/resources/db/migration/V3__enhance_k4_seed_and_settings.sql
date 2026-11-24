-- =============================================================================
-- V3: Enhance K4 Tenant Settings, Density, and WIP Seed Data
-- Allows clean rolling migration without checksum mismatch or volume deletion
-- =============================================================================

-- 1. Upgrade t-acme: ENTERPRISE tier, 300 rpm, 100 max members, FULL density, STRICT WIP
UPDATE tenants
SET tier = 'ENTERPRISE',
    rate_limit_rpm = 300,
    max_members = 100,
    settings = settings || '{"cardDensity": "FULL", "cardDisplayMode": "FULL", "wipMode": "STRICT"}'::jsonb
WHERE slug = 't-acme';

-- 2. Upgrade t-lotus: COMPACT density, WARN WIP
UPDATE tenants
SET settings = settings || '{"cardDensity": "COMPACT", "cardDisplayMode": "COMPACT", "wipMode": "WARN"}'::jsonb
WHERE slug = 't-lotus';

-- 3. Upgrade t-noisy: COMPACT density
UPDATE tenants
SET settings = settings || '{"cardDensity": "COMPACT", "cardDisplayMode": "COMPACT"}'::jsonb
WHERE slug = 't-noisy';

-- 4. Seed 3rd card in t-lotus 'Sản xuất' column (limit 2) to demonstrate WARN mode (3/2)
SELECT set_config('app.current_tenant_id', '22222222-2222-2222-2222-222222222222', true);

INSERT INTO cards (id, tenant_id, column_id, assignee_id, title, description, position, version, custom_fields)
VALUES (
    'cb000005-0000-0000-0000-000000000005',
    '22222222-2222-2222-2222-222222222222',
    'bc000002-0000-0000-0000-000000000002',
    'bbbbbbbb-3333-3333-3333-333333333333',
    'Thu âm Podcast Phỏng vấn Chuyên gia',
    'Tập 12 chuyên đề Content Creator 2026',
    2,
    1,
    '{"channel": "YouTube", "budget_vnd": 18000000, "publish_date": "2026-11-29"}'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET custom_fields = EXCLUDED.custom_fields,
    title = EXCLUDED.title,
    description = EXCLUDED.description;
