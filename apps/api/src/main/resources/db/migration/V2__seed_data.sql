-- =============================================================================
-- TenantFlow V2 Seed Data: 3 Tenants (t-acme, t-lotus, t-noisy)
-- Strict 1-to-1 User-Tenant binding (Password: Password123!)
-- =============================================================================

-- Tenant 1: Acme Software (ENTERPRISE, 300 rpm, STRICT WIP)
INSERT INTO tenants (id, slug, name, tier, rate_limit_rpm, max_members, status, settings)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    't-acme',
    'Acme Software',
    'ENTERPRISE',
    300,
    100,
    'ACTIVE',
    '{
      "theme": {
        "primary": "#0d6efd",
        "accent": "#0ea5e9",
        "logoText": "ACME",
        "tagline": "Phát triển phần mềm chuẩn mực"
      },
      "wipMode": "STRICT",
      "defaultWipLimit": 2,
      "cardDisplayMode": "FULL",
      "cardDensity": "FULL",
      "defaultColumns": ["Backlog", "In Progress", "Code Review", "Done"],
      "customFields": [
        { "key": "story_points", "label": "Story Points", "type": "NUMBER", "required": true, "options": [] },
        { "key": "bug_severity", "label": "Mức độ lỗi", "type": "SELECT", "required": false, "options": ["Low", "Medium", "Critical"] },
        { "key": "pull_request_url", "label": "Pull Request URL", "type": "TEXT", "required": false, "options": [] }
      ]
    }'::jsonb
);

-- Tenant 2: Lotus Media (PRO, 120 rpm, WARN WIP)
INSERT INTO tenants (id, slug, name, tier, rate_limit_rpm, max_members, status, settings)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    't-lotus',
    'Lotus Media',
    'PRO',
    120,
    50,
    'ACTIVE',
    '{
      "theme": {
        "primary": "#fd7e14",
        "accent": "#be185d",
        "logoText": "LOTUS",
        "tagline": "Sáng tạo nội dung đa nền tảng"
      },
      "wipMode": "WARN",
      "defaultWipLimit": 2,
      "cardDisplayMode": "COMPACT",
      "cardDensity": "COMPACT",
      "defaultColumns": ["Ý tưởng", "Sản xuất", "Duyệt nội dung", "Xuất bản"],
      "customFields": [
        { "key": "channel", "label": "Kênh phát hành", "type": "SELECT", "required": false, "options": ["Facebook", "TikTok", "YouTube"] },
        { "key": "budget_vnd", "label": "Ngân sách (VNĐ)", "type": "NUMBER", "required": false, "options": [] },
        { "key": "publish_date", "label": "Ngày xuất bản", "type": "DATE", "required": false, "options": [] }
      ]
    }'::jsonb
);

-- Tenant 3: Noisy Corp (FREE, 30 rpm for KB-3 HTTP 429 demonstration, OFF WIP)
INSERT INTO tenants (id, slug, name, tier, rate_limit_rpm, max_members, status, settings)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    't-noisy',
    'Noisy Corp',
    'FREE',
    30,
    10,
    'ACTIVE',
    '{
      "theme": {
        "primary": "#475569",
        "accent": "#ef4444",
        "logoText": "NOISY",
        "tagline": "Kiểm thử lưu lượng & Rate Limit (30 rpm)"
      },
      "wipMode": "OFF",
      "defaultWipLimit": null,
      "cardDisplayMode": "COMPACT",
      "cardDensity": "COMPACT",
      "defaultColumns": ["To Do", "Doing", "Done"],
      "customFields": []
    }'::jsonb
);

-- Users (1-to-1 binding per tenant)
INSERT INTO tenant_users (id, tenant_id, email, password_hash, full_name, role)
VALUES
    ('aaaaaaaa-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'hung@acme.vn', crypt('Password123!', gen_salt('bf', 10)), 'Nguyễn Văn Hùng', 'TENANT_ADMIN'),
    ('aaaaaaaa-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'member@acme.vn', crypt('Password123!', gen_salt('bf', 10)), 'Trần Thị Mai', 'MEMBER'),
    ('bbbbbbbb-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'lan@lotus.vn', crypt('Password123!', gen_salt('bf', 10)), 'Lê Ngọc Lan', 'TENANT_ADMIN'),
    ('bbbbbbbb-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'minh@lotus.vn', crypt('Password123!', gen_salt('bf', 10)), 'Phạm Minh', 'MEMBER'),
    ('cccccccc-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'admin@noisy.vn', crypt('Password123!', gen_salt('bf', 10)), 'Ngô Bảo', 'TENANT_ADMIN'),
    ('cccccccc-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'bot@noisy.vn', crypt('Password123!', gen_salt('bf', 10)), 'Load Test Bot', 'MEMBER');

-- =============================================================================
-- Seed Data Plane for t-acme
-- =============================================================================
SELECT set_config('app.current_tenant_id', '11111111-1111-1111-1111-111111111111', true);

INSERT INTO boards (id, tenant_id, name)
VALUES ('a1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Phát triển Nền tảng TenantFlow');

INSERT INTO board_columns (id, tenant_id, board_id, name, position, wip_limit)
VALUES
    ('ac000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000001', 'Backlog', 0, NULL),
    ('ac000002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000001', 'In Progress', 1, 2),
    ('ac000003-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000001', 'Code Review', 2, 2),
    ('ac000004-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000001', 'Done', 3, NULL);

INSERT INTO cards (id, tenant_id, column_id, assignee_id, title, description, position, version, custom_fields)
VALUES
    ('ca000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'ac000001-0000-0000-0000-000000000001', 'aaaaaaaa-2222-2222-2222-222222222222', 'Tối ưu chỉ mục GIN cho JSONB', 'Kiểm tra EXPLAIN ANALYZE với jsonb_path_ops', 0, 1, '{"story_points": 5, "bug_severity": "Medium", "pull_request_url": "https://github.com/acme/pr/42"}'::jsonb),
    ('ca000002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'ac000001-0000-0000-0000-000000000001', 'aaaaaaaa-1111-1111-1111-111111111111', 'Cấu hình Redis Pub/Sub Invalidation', 'Đồng bộ xóa đệm Caffeine L1 < 50ms', 1, 1, '{"story_points": 3, "bug_severity": "Low"}'::jsonb),
    ('ca000003-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'ac000002-0000-0000-0000-000000000002', 'aaaaaaaa-1111-1111-1111-111111111111', 'Triển khai JwtTenantFilter (K1)', 'Đối soát Host subdomain với JWT slug + ThreadLocal.clear()', 0, 1, '{"story_points": 8, "bug_severity": "Critical", "pull_request_url": "https://github.com/acme/pr/39"}'::jsonb),
    ('ca000004-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'ac000002-0000-0000-0000-000000000002', 'aaaaaaaa-2222-2222-2222-222222222222', 'Kích hoạt FORCE RLS 3 bảng (K2)', 'Fail-Closed policy cho kanban_app_user', 1, 1, '{"story_points": 5, "bug_severity": "Critical"}'::jsonb),
    ('ca000005-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'ac000003-0000-0000-0000-000000000003', 'aaaaaaaa-1111-1111-1111-111111111111', 'Kiểm thử Token Bucket Rate Limit (K3)', 'Chạy tải 80 VUs kiểm tra p95 < 500ms', 0, 1, '{"story_points": 5, "bug_severity": "Medium"}'::jsonb),
    ('ca000006-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'ac000004-0000-0000-0000-000000000004', 'aaaaaaaa-2222-2222-2222-222222222222', 'Thiết kế kiến trúc Pool Level 3', 'Hoàn thiện tài liệu SRS & ERD 5 bảng', 0, 1, '{"story_points": 3, "bug_severity": "Low"}'::jsonb);

-- =============================================================================
-- Seed Data Plane for t-lotus
-- =============================================================================
SELECT set_config('app.current_tenant_id', '22222222-2222-2222-2222-222222222222', true);

INSERT INTO boards (id, tenant_id, name)
VALUES ('b1000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Chiến dịch Truyền thông Q4');

INSERT INTO board_columns (id, tenant_id, board_id, name, position, wip_limit)
VALUES
    ('bc000001-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000001', 'Ý tưởng', 0, NULL),
    ('bc000002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000001', 'Sản xuất', 1, 2),
    ('bc000003-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000001', 'Duyệt nội dung', 2, 3),
    ('bc000004-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000001', 'Xuất bản', 3, NULL);

INSERT INTO cards (id, tenant_id, column_id, assignee_id, title, description, position, version, custom_fields)
VALUES
    ('cb000001-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'bc000001-0000-0000-0000-000000000001', 'bbbbbbbb-3333-3333-3333-333333333333', 'Video giới thiệu Bộ sưu tập Thu Đông', 'Quay dựng TVC 45s cho chiến dịch mới', 0, 1, '{"channel": "TikTok", "budget_vnd": 35000000, "publish_date": "2026-11-25"}'::jsonb),
    ('cb000002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'bc000002-0000-0000-0000-000000000002', 'bbbbbbbb-1111-1111-1111-111111111111', 'Thiết kế Banner Landing Page', 'Bộ nhận diện màu cam chủ đạo Lotus', 0, 1, '{"channel": "Facebook", "budget_vnd": 12000000, "publish_date": "2026-11-22"}'::jsonb),
    ('cb000003-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'bc000002-0000-0000-0000-000000000002', 'bbbbbbbb-3333-3333-3333-333333333333', 'Video Review Sản phẩm mới', 'Hợp tác KOL quay YouTube Shorts', 1, 1, '{"channel": "YouTube", "budget_vnd": 25000000, "publish_date": "2026-11-28"}'::jsonb),
    ('cb000005-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'bc000002-0000-0000-0000-000000000002', 'bbbbbbbb-3333-3333-3333-333333333333', 'Thu âm Podcast Phỏng vấn Chuyên gia', 'Tập 12 chuyên đề Content Creator 2026', 2, 1, '{"channel": "YouTube", "budget_vnd": 18000000, "publish_date": "2026-11-29"}'::jsonb),
    ('cb000004-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'bc000004-0000-0000-0000-000000000004', 'bbbbbbbb-1111-1111-1111-111111111111', 'Bản tin Email Khách hàng Thân thiết', 'Đã gửi đợt 1 tới 15.000 người đăng ký', 0, 1, '{"channel": "Facebook", "budget_vnd": 5000000, "publish_date": "2026-11-15"}'::jsonb);

-- =============================================================================
-- Seed Data Plane for t-noisy
-- =============================================================================
SELECT set_config('app.current_tenant_id', '33333333-3333-3333-3333-333333333333', true);

INSERT INTO boards (id, tenant_id, name)
VALUES ('c1000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Stress Test Board');

INSERT INTO board_columns (id, tenant_id, board_id, name, position, wip_limit)
VALUES
    ('cc000001-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'c1000000-0000-0000-0000-000000000001', 'To Do', 0, NULL),
    ('cc000002-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'c1000000-0000-0000-0000-000000000001', 'Doing', 1, NULL),
    ('cc000003-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'c1000000-0000-0000-0000-000000000001', 'Done', 2, NULL);

INSERT INTO cards (id, tenant_id, column_id, assignee_id, title, description, position, version, custom_fields)
VALUES
    ('cd000001-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'cc000001-0000-0000-0000-000000000001', 'cccccccc-2222-2222-2222-222222222222', 'Kịch bản bắn tải 80 VUs (KB-3)', 'Kiểm tra giới hạn 30 rpm -> HTTP 429', 0, 1, '{}'::jsonb);
