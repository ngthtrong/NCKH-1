# ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)
## Ứng dụng Quản lý Công việc Kanban theo Kiến trúc Đa thuê bao (TenantFlow)

* **Mã số đề tài:** THS2026-67
* **Phiên bản tài liệu:** 1.0 (Bám sát Báo cáo V4 – Phạm vi MVP Chứng minh Kiến trúc)
* **Kiến trúc mục tiêu:** SaaS Multi-Tenant – Mô hình **Pool Cấp độ 3** (1 bộ mã nguồn, 1 tiến trình ứng dụng, 1 CSDL, 1 lược đồ `public` dùng chung).

---

## 1. Tổng quan & Phạm vi Sản phẩm

### 1.1. Mục tiêu của Nguyên mẫu (MVP)
Ứng dụng **TenantFlow** là nguyên mẫu phần mềm quản lý công việc theo phương pháp Kanban nhằm chứng minh trực quan 4 cơ chế kỹ thuật cốt lõi của kiến trúc Đa thuê bao (**K1–K4**):
1. **K1 – Định danh & Ngữ cảnh:** Phân giải thuê bao qua tên miền phụ (`Host`), xác thực thẻ bài mật mã JWT chứa `tenant_id`, quản lý ngữ cảnh luồng `ThreadLocal` kèm thu hồi bắt buộc `try/finally`.
2. **K2 – Cô lập Dữ liệu:** Phòng thủ chiều sâu bằng `FORCE ROW LEVEL SECURITY` (Fail-Closed) trong PostgreSQL 16 kết hợp biến phiên giao dịch `SET LOCAL app.current_tenant_id`.
3. **K3 – Cô lập Hiệu năng (Chống Hàng xóm ồn ào):** Giới hạn lưu lượng theo từng thuê bao bằng Redis Token Bucket (Lua script), Cache 2 tầng (Caffeine L1 W-TinyLFU + Redis L2) với tiền tố khóa `tenant:{id}:*` và chỉ mục tổ hợp B-Tree dẫn đầu bởi `tenant_id`.
4. **K4 – Tùy biến Động 3 lớp lúc chạy:** Cùng 1 mã nguồn và 1 cấu trúc bảng vật lý nhưng mỗi thuê bao tự cấu hình độc lập: (1) Nhận diện thương hiệu/màu sắc, (2) Cột quy trình & luật giới hạn WIP (`STRICT`/`WARN`), (3) Trường dữ liệu mở rộng (`JSONB`).

### 1.2. Chuẩn hóa Thuật ngữ (Tránh nhầm lẫn khi code & demo)
* **Tổ chức / Thuê bao (`Tenant`):** Đơn vị khách hàng tổ chức (ví dụ: *Acme Software*, *Lotus Media*). **Lưu ý:** Toàn bộ cấu hình tùy biến 3 lớp nằm ở **cấp Tenant** (`tenants.settings`), áp dụng thống nhất cho mọi bảng bên trong tổ chức đó (không tùy biến giao diện/chức năng riêng lẻ theo từng bảng).
* **Bảng công việc (`Board`):** Tương đương 1 dự án/bảng Kanban thuộc quyền sở hữu của một `Tenant`. Không tạo thêm bảng `projects` để giữ đúng lược đồ 5 bảng của báo cáo.
* **Cột trạng thái (`Board Column`):** Các giai đoạn công việc trên bảng (có thể cấu hình ngưỡng `wip_limit`).
* **Thẻ công việc (`Card`):** Tác vụ cụ thể nằm trong một cột, hỗ trợ lưu thuộc tính mở rộng trong cột `custom_fields` (JSONB).

### 1.3. Phạm vi Thực hiện (In-Scope vs. Out-of-Scope)
* **Làm (In-Scope):**
  * Khởi tạo, gán gói cước (Tier/Rate Limit), khóa/mở Tenant.
  * Đăng nhập, liệt kê tổ chức tham gia, chuyển đổi Tenant (tái cấp JWT + điều hướng Subdomain).
  * Cấu hình tùy biến 3 lớp ở cấp Tenant & đồng bộ xóa đệm L1 qua Redis Pub/Sub.
  * Quản lý thành viên và phân quyền (`TENANT_ADMIN`, `MEMBER`).
  * Quản lý Bảng (Board), Cột (Column), Thẻ (Card), kéo – thả thẻ dưới sự kiểm soát của luật WIP (`STRICT`/`WARN`), tìm kiếm & lọc thẻ (kể cả theo trường JSONB).
* **KHÔNG làm (Out-of-Scope):**
  * Không tạo bảng `projects`, không làm bình luận (comments), không làm đính kèm tệp (attachments), không làm thông báo thời gian thực (WebSocket), không phát triển ứng dụng di động.
  * Thanh điều hướng (Sidebar) chỉ giữ các mục hoạt động thật: *Kanban*, *Thành viên*, *Cài đặt Tổ chức* (cho Tenant Admin), và *Quản trị Hệ thống* (cho System Admin).

---

## 2. Kiến trúc Hệ thống & Ngăn xếp Công nghệ

| Tầng Kiến trúc | Thành phần / Dịch vụ | Công nghệ Chuẩn | Vai trò Đa thuê bao |
| :--- | :--- | :--- | :--- |
| **Biên (Edge)** | `caddy-proxy` | Caddy v2 | Reverse Proxy định tuyến Wildcard Subdomain (`*.domain`), chuyển tiếp tiêu đề `Host` gốc vào API. |
| **Giao diện (SPA)** | `kanban-web` | React 18, TypeScript, Vite | Render động màu sắc qua CSS Variables, form trường mở rộng JSONB, giao diện kéo – thả Kanban. |
| **Ứng dụng (API)** | `kanban-api` | Java 21 LTS, Spring Boot 3.3, HikariCP (max 25), Flyway, Caffeine | Chuỗi bộ lọc `JwtTenantFilter` (K1) → `RateLimitFilter` (K3) → `KanbanService` (K4) → `RlsConnectionInterceptor` (K2). |
| **Trung gian** | `redis-cache` | Redis 7.2 | Lưu Token Bucket (Lua script), Cache L2 (`tenant:{id}:*`), kênh Pub/Sub `tenant:config:invalidate`. |
| **Cơ sở dữ liệu** | `postgres-db` | PostgreSQL 16 | 1 DB `kanban_saas_db`, 1 schema `public`, 5 bảng, bật `FORCE RLS` trên 3 bảng Data Plane. |

---

## 3. Phân rã Tác nhân & Phân quyền (RBAC)

1. **Quản trị viên Hệ thống (`System Admin` – Control Plane):**
   * Tạo mới hoặc tạm khóa (`SUSPENDED`) các tổ chức thuê bao.
   * Thiết lập gói dịch vụ (`FREE`, `PRO`, `ENTERPRISE`) tương ứng với hạn mức Rate Limit.
2. **Quản trị viên Tổ chức (`TENANT_ADMIN` – Control Plane & Data Plane):**
   * Chỉ có quyền trong phạm vi `tenant_id` của tổ chức mình.
   * Thiết lập cấu hình tùy biến 3 lớp (màu sắc, cột mặc định, luật WIP `STRICT`/`WARN`, danh mục trường mở rộng).
   * Mời/quản lý thành viên và gán vai trò trong tổ chức.
   * Kế thừa toàn bộ quyền của `MEMBER` và có thêm quyền tạo/sửa/xóa Bảng (Board), Cột (Column).
3. **Thành viên Dự án (`MEMBER` – Data Plane):**
   * Một email có thể thuộc nhiều tổ chức khác nhau (Multi-Tenant Membership).
   * Xem bảng Kanban, tạo/sửa thẻ công việc (nhập trường chuẩn và trường mở rộng), kéo – thả thẻ giữa các cột theo luật WIP, lọc và tìm kiếm thẻ.

---

## 4. Đặc tả Yêu cầu Chức năng (10 Ca sử dụng Cốt lõi)

### 4.1. Mặt phẳng Điều khiển (Control Plane)

* **UC01 – Khởi tạo & Quản lý Vòng đời Thuê bao (`System Admin`)**
  * Tạo tổ chức với `slug` duy nhất (VD: `t-acme`, `t-lotus`), tên tổ chức, gói `tier`.
  * Hệ thống tự động khởi tạo `settings` 3 lớp mặc định và 1 bảng Kanban mẫu.
  * Hỗ trợ cập nhật trạng thái `ACTIVE` / `SUSPENDED` (tổ chức bị `SUSPENDED` sẽ bị từ chối đăng nhập/truy cập API).

* **UC02 – Đăng nhập & Chuyển đổi Tổ chức (`Tất cả người dùng`)**
  * Bước 1: Đăng nhập bằng `email` và `password` → Trả về danh sách các tổ chức mà email đó là thành viên.
  * Bước 2: Chọn tổ chức (`tenantSlug`) → Hệ thống xác minh tư cách thành viên, cấp phát thẻ bài **JWT** ký `HMAC-SHA256` chứa claims `{sub, tenant_id, slug, role, tier, exp}` và điều hướng trình duyệt sang subdomain `<slug>.<domain>`.

* **UC03 – Cấu hình Thương hiệu & Chính sách WIP (`TENANT_ADMIN`)**
  * Cập nhật màu chủ đạo (`primary`), màu nhấn (`accent`), chế độ hiển thị thẻ (`FULL` / `COMPACT`), danh sách cột mặc định (`defaultColumns`), ngưỡng WIP mặc định (`defaultWipLimit`) và chế độ cưỡng chế WIP (`STRICT` hoặc `WARN`).
  * Lưu vào cột `tenants.settings` (JSONB).

* **UC04 – Khai báo Trường Dữ liệu Mở rộng (`TENANT_ADMIN`)**
  * Thêm/sửa/xóa định nghĩa trường động trong `tenants.settings.customFields`, mỗi trường gồm: `key` (mã trường), `label` (tên hiển thị), `type` (`TEXT` | `NUMBER`), `required` (`true` | `false`).
  * Ngay sau khi lưu cấu hình (UC03/UC04), backend bắt buộc xóa khóa `tenant:{tenant_id}:config` trên Redis L2 và phát thông điệp lên kênh Pub/Sub `tenant:config:invalidate` để các nút ứng dụng xóa đệm L1 Caffeine tức thời.

* **UC05 – Quản lý Thành viên & Phân quyền (`TENANT_ADMIN`)**
  * Xem danh sách thành viên, thêm thành viên theo `email`, `full_name`, mật khẩu khởi tạo và gán vai trò (`TENANT_ADMIN` hoặc `MEMBER`) trong phạm vi `tenant_id`.

### 4.2. Mặt phẳng Dữ liệu (Data Plane)

* **UC06 – Quản lý Bảng Kanban (`TENANT_ADMIN` / `MEMBER`)**
  * Xem danh sách bảng thuộc `tenant_id` hiện tại.
  * `TENANT_ADMIN` có quyền tạo bảng mới (tự động sinh các cột dựa trên `defaultColumns` và `defaultWipLimit` của Tenant; cột đầu và cột cuối mặc định miễn WIP tức `wip_limit = NULL`), đổi tên hoặc xóa bảng.

* **UC07 – Cấu hình Cột & Hạn mức WIP (`TENANT_ADMIN`)**
  * Thêm cột mới, đổi tên cột, thay đổi thứ tự (`position`) và thiết lập `wip_limit` riêng cho từng cột (`NULL` = không giới hạn).

* **UC08 – Tạo & Cập nhật Thẻ công việc kèm Trường động (`TENANT_ADMIN` / `MEMBER`)**
  * Giao diện tự động sinh các ô nhập liệu bổ sung theo `settings.customFields`.
  * **Kiểm định máy chủ (`<<include>>`):** Backend đọc lược đồ `customFields` từ cấu hình Tenant để kiểm tra kiểu dữ liệu (`TEXT`/`NUMBER`) và trường bắt buộc (`required`). Nếu sai định dạng hoặc thiếu trường bắt buộc → trả về **HTTP 400 Bad Request**.

* **UC09 – Kéo – Thả Thẻ chuyển Cột dưới kiểm soát Luật WIP (`TENANT_ADMIN` / `MEMBER`)**
  * Thực thi trong 1 giao dịch CSDL đã tiêm `SET LOCAL app.current_tenant_id`:
    1. Thực hiện khóa bi quan dòng cột đích: `SELECT * FROM board_columns WHERE id = :targetColumnId FOR UPDATE` để chống Race Condition.
    2. Kiểm tra khóa lạc quan (`cards.version == expectedVersion`); nếu lệch trả về **HTTP 409 Conflict**.
    3. Nếu cột đích có `wip_limit != NULL`, đếm số thẻ hiện tại trong cột đích:
       * Nếu `count >= wip_limit` và `wipMode == "STRICT"`: Rollback giao dịch và trả về **HTTP 422 Unprocessable Entity** (Frontend hoàn trả thẻ về cột cũ, hiện thông báo lỗi đỏ).
       * Nếu `count >= wip_limit` và `wipMode == "WARN"`: Lưu vị trí mới, tăng `version`, trả về **HTTP 200 OK** kèm cờ `wipWarning: true` (Frontend bật cảnh báo vàng trên cột).
    4. Xóa khóa đệm bảng `tenant:{tenant_id}:board:{board_id}` trên Redis L2.

* **UC10 – Tìm kiếm & Lọc Thẻ công việc (`TENANT_ADMIN` / `MEMBER`)**
  * Tìm kiếm theo từ khóa tiêu đề, lọc theo cột, người thực hiện (`assignee_id`) và cặp khóa – giá trị bên trong cột `cards.custom_fields` (tận dụng chỉ mục GIN).

---

## 5. Thiết kế Cơ sở Dữ liệu (5 Bảng & FORCE RLS)

### 5.1. Tài khoản CSDL (Phân tách Quyền)
* `kanban_migrator`: Dùng riêng cho Flyway chạy script di trú lược đồ (`O(1)`).
* `kanban_app_user`: Tài khoản chạy ứng dụng Spring Boot, **bắt buộc** khai báo `NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`.

### 5.2. Lược đồ 5 Bảng & Chỉ mục
1. **Mặt phẳng Điều khiển** (Không bật FORCE RLS mù để hỗ trợ tra cứu trước khi chọn Tenant):
   * `tenants (id UUID PK, slug VARCHAR(64) UNIQUE NOT NULL, name VARCHAR(120) NOT NULL, tier VARCHAR(20) NOT NULL, status VARCHAR(20) NOT NULL, settings JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ)`
   * `tenant_users (id UUID PK, tenant_id UUID FK -> tenants, email VARCHAR(180) NOT NULL, password_hash VARCHAR(255) NOT NULL, full_name VARCHAR(120) NOT NULL, role VARCHAR(24) NOT NULL, UNIQUE(tenant_id, email))`

2. **Mặt phẳng Dữ liệu** (Phi chuẩn hóa `tenant_id UUID NOT NULL` trên cả 3 bảng):
   * `boards (id UUID PK, tenant_id UUID NOT NULL FK -> tenants, name VARCHAR(150) NOT NULL, created_at TIMESTAMPTZ)`
     * Index: `idx_boards_tenant_created ON boards (tenant_id, created_at DESC)`
   * `board_columns (id UUID PK, tenant_id UUID NOT NULL FK -> tenants, board_id UUID NOT NULL FK -> boards, name VARCHAR(80) NOT NULL, position INT NOT NULL, wip_limit INT NULL)`
     * Index: `idx_columns_tenant_board_pos ON board_columns (tenant_id, board_id, position)`
   * `cards (id UUID PK, tenant_id UUID NOT NULL FK -> tenants, column_id UUID NOT NULL FK -> board_columns, assignee_id UUID NULL FK -> tenant_users, title VARCHAR(200) NOT NULL, description TEXT, position INT NOT NULL DEFAULT 0, version INT NOT NULL DEFAULT 1, custom_fields JSONB NOT NULL DEFAULT '{}')`
     * Index: `idx_cards_tenant_col_pos ON cards (tenant_id, column_id, position)`
     * Index: `idx_cards_custom_fields_gin ON cards USING GIN (custom_fields jsonb_path_ops)`

### 5.3. Chính sách Bảo mật Cấp dòng (Fail-Closed FORCE RLS)
Áp dụng cho cả 3 bảng `boards`, `board_columns`, `cards` đối với role `kanban_app_user`:
```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <table> FORCE ROW LEVEL SECURITY;

CREATE POLICY p_<table>_isolation ON <table> FOR ALL TO kanban_app_user
    USING      (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
```

---

## 6. Hợp đồng API Trọng yếu

| Endpoint | Quyền truy cập | Request Payload / Params | Response & Hành vi |
| :--- | :--- | :--- | :--- |
| `POST /api/auth/login` | Public | `{email, password}` | `200 OK`: `{user, workspaces[]}` |
| `POST /api/auth/switch-workspace` | Authenticated | `{tenantSlug}` | `200 OK`: `{accessToken (JWT), tenant}` |
| `GET /api/admin/tenants` / `POST` | `System Admin` | `{slug, name, tier}` | Danh sách / Tạo mới Tenant + cấu hình mặc định |
| `PATCH /api/admin/tenants/{id}/status` | `System Admin` | `{status: "ACTIVE"\|"SUSPENDED"}` | Cập nhật trạng thái Tenant |
| `GET /api/tenant-settings/kanban` | `Member+` | — | `200 OK`: JSONB `settings` (ưu tiên L1 → L2 → DB) |
| `PUT /api/tenant-settings/kanban` | `TENANT_ADMIN` | JSONB `settings` (theme, wipMode, defaultColumns, customFields) | `200 OK`: Lưu DB, xóa L2, phát Pub/Sub xóa L1 |
| `GET/POST /api/boards` | `Member+` / `Admin` | `{name}` | Lấy danh sách / Tạo bảng + sinh cột mặc định |
| `GET /api/boards/{id}` | `Member+` | — | Chi tiết bảng + danh sách cột + danh sách thẻ |
| `POST /api/boards/{id}/columns` | `TENANT_ADMIN` | `{name, position, wipLimit}` | Tạo cột mới trong bảng |
| `POST /api/boards/{id}/tasks` | `Member+` | `{columnId, title, description, assigneeId, customFields}` | `201 Created` (Validate `customFields`, sai → `400`) |
| `PATCH /api/cards/{id}/move` | `Member+` | `{targetColumnId, targetPosition, expectedVersion}` | `200 OK` (kèm `wipWarning`), `422` (WIP STRICT), `409` (Version conflict) |

### Cấu trúc JSONB chuẩn của `tenants.settings`
```json
{
  "theme": { "primary": "#1D4ED8", "accent": "#0EA5E9" },
  "wipMode": "STRICT",
  "defaultWipLimit": 2,
  "cardDisplayMode": "FULL",
  "defaultColumns": ["Chờ xử lý", "Đang làm", "Rà soát", "Hoàn thành"],
  "customFields": [
    { "key": "story_points", "label": "Điểm nỗ lực", "type": "NUMBER", "required": true },
    { "key": "sprint", "label": "Đợt phát triển", "type": "TEXT", "required": false }
  ]
}
```

---

## 7. Yêu cầu Phi chức năng & Cơ chế Xuyên tầng (K1–K4)

1. **NFR-01 – Toàn vẹn Định danh & Ngữ cảnh Luồng (K1):**
   * `JwtTenantFilter` xác thực chữ ký HMAC-SHA256 (sai → `401`), trích xuất subdomain từ header `Host` đối soát với `JWT.slug` (lệch → `403`).
   * Gán đối tượng bất biến `TenantInfo` vào `ThreadLocal` (`TenantContext`), gắn `tenant_id` vào SLF4J `MDC` và header phản hồi `X-Tenant-ID`.
   * **Bắt buộc** gọi `TenantContext.clear()` và `MDC.remove("tenant_id")` trong khối `finally`.
2. **NFR-02 & NFR-03 – Cô lập Dữ liệu & Chi phí RLS (K2):**
   * `RlsConnectionInterceptor` (`@Before @Transactional`) chạy `SELECT set_config('app.current_tenant_id', ?, true)` (tương đương `SET LOCAL`).
   * Nếu thiếu `SET LOCAL` hoặc truy vấn quên `WHERE tenant_id`, PostgreSQL vẫn trả về 0 dòng rò rỉ (Fail-Closed). Phụ trội độ trễ RLS `< 5%` tổng thời gian API.
3. **NFR-04 – Kháng Hàng xóm Ồn ào (K3):**
   * `RateLimitFilter` thực thi Lua script Token Bucket trên Redis theo khóa `ratelimit:tenant:{tenant_id}`. Vượt hạn mức trả ngay **HTTP 429 Too Many Requests**.
   * Bộ đệm 2 tầng: L1 Caffeine (`maximumSize = 2000`, mặc định dùng W-TinyLFU, TTL 5 phút) + L2 Redis với khóa `tenant:{tenant_id}:config` và `tenant:{tenant_id}:board:{board_id}`.
   * Độ trễ p95 của thuê bao thường dưới tải 80 VUs duy trì `< 500 ms`.
4. **NFR-05 & NFR-06 – Tùy biến Động & Đồng bộ Tức thời (K4):**
   * Thay đổi cấu hình 3 lớp áp dụng ngay không cần khởi động lại server; độ trễ đồng bộ xóa đệm L1 qua Redis Pub/Sub `< 50 ms`.

---

## 8. Đóng gói Triển khai & Dữ liệu Hạt giống Demo

### 8.1. Cấu hình Docker Compose (5 Vùng chứa)
Triển khai trên mạng cầu nối nội bộ cô lập `nckh-ec2-net` với giới hạn cgroups:
* `caddy-proxy`: `caddy:2.8-alpine` (mở cổng 80/443 hoặc 8080 thử nghiệm; chặn cổng 5432, 6379 từ Internet).
* `kanban-web`: `0.25 vCPU`, `256 MB RAM`.
* `kanban-api`: `1.25 vCPU`, `2560 MB RAM`.
* `redis-cache`: `0.25 vCPU`, `512 MB RAM`.
* `postgres-db`: `0.50 vCPU`, `1536 MB RAM` (gắn volume `pgdata`).

### 8.2. Dữ liệu Hạt giống (Seed Data) bắt buộc cho Demo Hội đồng
Khởi tạo sẵn 2 tổ chức đối lập để mở song song 2 tab trình duyệt chứng minh **1 Codebase – Đa thuê bao – Tùy biến 3 lớp**:

| Tiêu chí đối chứng | Thuê bao 1: Acme Software (`t-acme`) | Thuê bao 2: Lotus Media (`t-lotus`) |
| :--- | :--- | :--- |
| **Tên miền phụ (Host)** | `t-acme.<domain>` | `t-lotus.<domain>` |
| **Gói dịch vụ (Tier)** | `ENTERPRISE` | `PRO` |
| **Cấu trúc Cột mặc định** | 4 cột: *Chờ xử lý*, *Đang làm* (WIP=2), *Rà soát* (WIP=2), *Hoàn thành* | 3 cột: *Ý tưởng*, *Sản xuất* (WIP=2), *Phát hành* |
| **Chế độ luật WIP** | `STRICT` (Kéo thẻ thứ 3 vào *Đang làm* → Chặn đỏ HTTP 422) | `WARN` (Kéo thẻ thứ 3 vào *Sản xuất* → Vẫn lưu, bật cảnh báo vàng `3/2`) |
| **Trường mở rộng (JSONB)** | `story_points` (NUMBER, bắt buộc), `sprint` (TEXT) | `channel` (TEXT), `budget_usd` (NUMBER) |