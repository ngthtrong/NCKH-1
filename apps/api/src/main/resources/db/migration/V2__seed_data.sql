-- =============================================================================
-- TenantFlow V2 Seed Data (SRS Section 8.2: t-acme vs t-lotus)
-- Default password for all demo accounts: Password123!
-- =============================================================================

-- Tenant 1: Acme Software (ENTERPRISE, STRICT WIP)
INSERT INTO tenants (id, slug, name, tier, status, settings)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    't-acme',
    'Acme Software',
    'ENTERPRISE',
    'ACTIVE',
    '{
      "theme": { "primary": "#1D4ED8", "accent": "#0EA5E9" },
      "wipMode": "STRICT",
      "defaultWipLimit": 2,
      "cardDisplayMode": "FULL",
      "defaultColumns": ["Chờ xử lý", "Đang làm", "Rà soát", "Hoàn thành"],
      "customFields": [
        { "key": "story_points", "label": "Điểm nỗ lực", "type": "NUMBER", "required": true },
        { "key": "sprint", "label": "Đợt phát triển", "type": "TEXT", "required": false }
      ]
    }'::jsonb
);

-- Tenant 2: Lotus Media (PRO, WARN WIP)
INSERT INTO tenants (id, slug, name, tier, status, settings)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    't-lotus',
    'Lotus Media',
    'PRO',
    'ACTIVE',
    '{
      "theme": { "primary": "#BE185D", "accent": "#F59E0B" },
      "wipMode": "WARN",
      "defaultWipLimit": 2,
      "cardDisplayMode": "COMPACT",
      "defaultColumns": ["Ý tưởng", "Sản xuất", "Phát hành"],
      "customFields": [
        { "key": "channel", "label": "Kênh phát hành", "type": "TEXT", "required": false },
        { "key": "budget_usd", "label": "Ngân sách (USD)", "type": "NUMBER", "required": false }
      ]
    }'::jsonb
);

-- Users (hung@acme.vn belongs to BOTH t-acme and t-lotus)
INSERT INTO tenant_users (id, tenant_id, email, password_hash, full_name, role)
VALUES
    ('aaaaaaaa-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'hung@acme.vn', crypt('Password123!', gen_salt('bf', 10)), 'Nguyễn Văn Hùng', 'TENANT_ADMIN'),
    ('aaaaaaaa-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'member@acme.vn', crypt('Password123!', gen_salt('bf', 10)), 'Trần Thị Mai', 'MEMBER'),
    ('bbbbbbbb-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'lan@lotus.vn', crypt('Password123!', gen_salt('bf', 10)), 'Lê Ngọc Lan', 'TENANT_ADMIN'),
    ('bbbbbbbb-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'hung@acme.vn', crypt('Password123!', gen_salt('bf', 10)), 'Nguyễn Văn Hùng', 'MEMBER'),
    ('bbbbbbbb-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'minh@lotus.vn', crypt('Password123!', gen_salt('bf', 10)), 'Phạm Minh', 'MEMBER');

-- =============================================================================
-- Seed Data Plane for t-acme (set RLS session context)
-- =============================================================================
SELECT set_config('app.current_tenant_id', '11111111-1111-1111-1111-111111111111', true);

INSERT INTO boards (id, tenant_id, name)
VALUES ('a1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Phát triển Nền tảng TenantFlow');

INSERT INTO board_columns (id, tenant_id, board_id, name, position, wip_limit)
VALUES
    ('ac000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000001', 'Chờ xử lý', 0, NULL),
    ('ac000002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000001', 'Đang làm', 1, 2),
    ('ac000003-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000001', 'Rà soát', 2, 2),
    ('ac000004-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000001', 'Hoàn thành', 3, NULL);

INSERT INTO cards (id, tenant_id, column_id, assignee_id, title, description, position, version, custom_fields)
VALUES
    ('ca000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'ac000001-0000-0000-0000-000000000001', 'aaaaaaaa-2222-2222-2222-222222222222', 'Tối ưu chỉ mục GIN cho JSONB', 'Kiểm tra EXPLAIN ANALYZE với jsonb_path_ops', 0, 1, '{"story_points": 5, "sprint": "Sprint 12"}'::jsonb),
    ('ca000002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'ac000001-0000-0000-0000-000000000001', 'aaaaaaaa-1111-1111-1111-111111111111', 'Cấu hình Redis Pub/Sub Invalidation', 'Đồng bộ xóa đệm Caffeine L1 < 50ms', 1, 1, '{"story_points": 3, "sprint": "Sprint 12"}'::jsonb),
    ('ca000003-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'ac000002-0000-0000-0000-000000000002', 'aaaaaaaa-1111-1111-1111-111111111111', 'Triển khai JwtTenantFilter (K1)', 'Đối soát Host subdomain với JWT slug + ThreadLocal.clear()', 0, 1, '{"story_points": 8, "sprint": "Sprint 11"}'::jsonb),
    ('ca000004-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'ac000002-0000-0000-0000-000000000002', 'aaaaaaaa-2222-2222-2222-222222222222', 'Kích hoạt FORCE RLS 3 bảng (K2)', 'Fail-Closed policy cho kanban_app_user', 1, 1, '{"story_points": 5, "sprint": "Sprint 11"}'::jsonb),
    ('ca000005-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'ac000003-0000-0000-0000-000000000003', 'aaaaaaaa-1111-1111-1111-111111111111', 'Kiểm thử Token Bucket Rate Limit (K3)', 'Chạy tải 80 VUs kiểm tra p95 < 500ms', 0, 1, '{"story_points": 5, "sprint": "Sprint 11"}'::jsonb),
    ('ca000006-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'ac000004-0000-0000-0000-000000000004', 'aaaaaaaa-2222-2222-2222-222222222222', 'Thiết kế kiến trúc Pool Level 3', 'Hoàn thiện tài liệu SRS & ERD 5 bảng', 0, 1, '{"story_points": 3, "sprint": "Sprint 10"}'::jsonb);

-- =============================================================================
-- Seed Data Plane for t-lotus (switch RLS session context)
-- =============================================================================
SELECT set_config('app.current_tenant_id', '22222222-2222-2222-2222-222222222222', true);

INSERT INTO boards (id, tenant_id, name)
VALUES ('b1000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Chiến dịch Truyền thông Q4');

INSERT INTO board_columns (id, tenant_id, board_id, name, position, wip_limit)
VALUES
    ('bc000001-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000001', 'Ý tưởng', 0, NULL),
    ('bc000002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000001', 'Sản xuất', 1, 2),
    ('bc000003-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000001', 'Phát hành', 2, NULL);

INSERT INTO cards (id, tenant_id, column_id, assignee_id, title, description, position, version, custom_fields)
VALUES
    ('cb000001-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'bc000001-0000-0000-0000-000000000001', 'bbbbbbbb-3333-3333-3333-333333333333', 'Video giới thiệu Bộ sưu tập Thu Đông', 'Quay dựng TVC 45s cho chiến dịch mới', 0, 1, '{"channel": "TikTok", "budget_usd": 1500}'::jsonb),
    ('cb000002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'bc000002-0000-0000-0000-000000000002', 'bbbbbbbb-1111-1111-1111-111111111111', 'Thiết kế Banner Landing Page', 'Bộ nhận diện màu hồng chủ đạo Lotus', 0, 1, '{"channel": "Web", "budget_usd": 600}'::jsonb),
    ('cb000003-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'bc000002-0000-0000-0000-000000000002', 'bbbbbbbb-2222-2222-2222-222222222222', 'Bài viết PR Báo điện tử', 'Viết bài phỏng vấn CEO về chiến lược Q4', 1, 1, '{"channel": "PR", "budget_usd": 1200}'::jsonb),
    ('cb000004-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'bc000003-0000-0000-0000-000000000003', 'bbbbbbbb-1111-1111-1111-111111111111', 'Bản tin Email Khách hàng Thân thiết', 'Đã gửi đợt 1 tới 15.000 người đăng ký', 0, 1, '{"channel": "Email", "budget_usd": 250}'::jsonb);
