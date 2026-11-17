
# TÀI LIỆU 03: THIẾT KẾ KIẾN TRÚC 9 TẦNG, CƠ SỞ DỮ LIỆU ĐA THUÊ BAO, LUỒNG XỬ LÝ K1–K4 VÀ ĐÓNG GÓI TRIỂN KHAI

> **Căn cứ thiết kế:** Chương 4 (Mục 4.2, 4.3, 4.4, Bảng 4.1, Hình 4.5, Hình 4.6) và Phụ lục A, B, C — Báo cáo tổng kết đề tài `THS2026-67`.

---

## 1. Tổng hợp Kiến trúc 9 Tầng của Nguyên mẫu SaaS Kanban Cấp độ 3

Toàn bộ 9 tầng thành phần của nguyên mẫu đều được tổ chức theo chiến lược **Pool (Dùng chung toàn phần)**:

| Tầng kiến trúc                         |   Mức độ chia sẻ   | Công nghệ lựa chọn                                                 | Trách nhiệm và Cơ chế kiểm soát đa thuê bao                                                                                                                                                                                 |
| :---------------------------------------- | :---------------------: | :--------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tầng 9 – Application Instance** | Dùng chung toàn phần | `React 18`, `TypeScript` (`Vite`) & REST API `Spring Boot 3.3` | Duy trì một bộ mã nguồn duy nhất; tùy biến giao diện (`CSS Variables`), quy trình (`WIP Strict/Warn`) và trường dữ liệu (`JSONB`) theo cấu hình thuê bao.                                                    |
| **Tầng 8 – Application Server**   | Dùng chung toàn phần | `Java 21 LTS`, `Spring Boot 3.3`, `Apache Tomcat` nhúng         | Xử lý yêu cầu đồng thời trên hồ luồng dùng chung; quản lý đối tượng bất biến `TenantContext` (`ThreadLocal`), gắn nhãn `SLF4J MDC` và thu hồi ngữ cảnh bằng `try ... finally`.                     |
| **Tầng 7 – Middleware**           | Dùng chung toàn phần | `Spring Security`, `Caffeine L1` (`W-TinyLFU`) & `Redis 7.2`   | Xác thực chữ ký JWT (`JwtTenantFilter`), giới hạn tốc độ theo thuê bao (`RateLimitFilter` + `Token Bucket`), phân vùng khóa đệm `tenant:{id}:*` và đồng bộ xóa đệm qua `Pub/Sub`.                    |
| **Tầng 6 – Database Schema**      | Dùng chung toàn phần | Lược đồ `public` quản lý bằng `Flyway`                      | Dùng chung 5 bảng cốt lõi; phi chuẩn hóa cột `tenant_id`, thiết lập chỉ mục tổ hợp dẫn đầu bởi `tenant_id` và cột bán cấu trúc `JSONB` kèm chỉ mục `GIN`.                                           |
| **Tầng 5 – Database**             | Dùng chung toàn phần | Cơ sở dữ liệu `kanban_saas_db`                                   | Lưu trữ hợp nhất dữ liệu của mọi thuê bao; cưỡng chế chính sách bảo mật cấp dòng `FORCE ROW LEVEL SECURITY` (`USING` & `WITH CHECK`).                                                                        |
| **Tầng 4 – Database Server**      | Dùng chung toàn phần | `PostgreSQL 16` & bể kết nối `HikariCP` (`max = 25`)          | Tái sử dụng kết nối vật lý qua biến phiên giao dịch nguyên tử `SET LOCAL app.current_tenant_id`; tách biệt tài khoản di trú `kanban_migrator` và tài khoản ứng dụng `kanban_app_user` (`NOBYPASSRLS`). |
| **Tầng 3 – Operating System**     | Dùng chung toàn phần | Nhân `Linux` & `Docker Compose` (`cgroups`)                     | Chia sẻ nhân hệ điều hành; đóng gói 4 vùng chứa dịch vụ độc lập (`kanban-web`, `kanban-api`, `redis-cache`, `postgres-db`) có ghim cứng hạn mức CPU/RAM.                                                 |
| **Tầng 2 – Virtual Machine**      | Dùng chung toàn phần | `WSL2` (Phát triển) / `AWS EC2` (Thực nghiệm)                  | Cung cấp máy ảo đám mây và mạng cầu nối nội bộ cô lập (`Bridge Network`).                                                                                                                                            |
| **Tầng 1 – Hardware**             | Dùng chung toàn phần | Máy chủ vật lý chuẩn                                              | Chia sẻ năng lực tính toán vi xử lý, bộ nhớ RAM và lưu trữ đĩa.                                                                                                                                                        |

---

## 2. Thiết kế Cơ sở Dữ liệu Đa thuê bao 5 Bảng và Chính sách RLS (Mục 4.3.1 & Hình 4.5)

### 2.1. Hai quyết định thiết kế CSDL trọng tâm

1. **Phi chuẩn hóa có chủ đích cột `tenant_id` xuống toàn bộ các bảng thực thể con (`boards`, `board_columns`, `cards`):** Giúp bộ thực thi chính sách RLS của PostgreSQL kiểm tra trực tiếp điều kiện `tenant_id = current_setting(...)` ngay trên từng bảng với độ phức tạp hằng số $O(1)$ thông qua chỉ mục `B-Tree` cục bộ, loại bỏ hoàn toàn các phép nối bảng (`JOIN`) hoặc truy vấn con đắt đỏ trong chính sách RLS.
2. **Sử dụng kiểu dữ liệu bán cấu trúc `JSONB` tại hai vị trí chiến lược (`tenants.settings` và `cards.custom_fields`):** Cho phép lưu trữ cấu hình 3 lớp và mở rộng thuộc tính động cho từng thuê bao ngay trong thời gian chạy mà không cần chạy lệnh `ALTER TABLE` gây khóa bảng vật lý (*Table Lock*) hay tạo các cột thưa (*Sparse Columns*).

### 2.2. Kịch bản DDL Khởi tạo Vai trò, 5 Bảng Cốt lõi, Chỉ mục và Chính sách `FORCE RLS`

```sql
-- =====================================================================
-- 1. TÁCH BIỆT VAI TRÒ QUẢN TRỊ LƯỢC ĐỒ VÀ VAI TRÒ THỰC THI ỨNG DỤNG
-- =====================================================================
CREATE ROLE kanban_migrator WITH LOGIN PASSWORD 'migrator_secret';
CREATE ROLE kanban_app_user WITH LOGIN PASSWORD 'app_secret' NOBYPASSRLS;

-- =====================================================================
-- 2. MẶT PHẲNG ĐIỀU KHIỂN (CONTROL PLANE): BẢNG TENANTS & TENANT_USERS
-- =====================================================================
CREATE TABLE tenants (
    id          UUID PRIMARY KEY,
    slug        VARCHAR(64) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    status      VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    settings    JSONB NOT NULL DEFAULT '{}'::jsonb, -- Cấu hình tùy biến 3 lớp
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tenant_users (
    id            UUID PRIMARY KEY,
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(32) NOT NULL CHECK (role IN ('ADMIN', 'MEMBER')),
    CONSTRAINT uq_tenant_users_email UNIQUE (tenant_id, email)
);

-- =====================================================================
-- 3. MẶT PHẲNG DỮ LIỆU (DATA PLANE): BOARDS, BOARD_COLUMNS, CARDS
-- =====================================================================
CREATE TABLE boards (
    id          UUID PRIMARY KEY,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    created_by  UUID REFERENCES tenant_users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE board_columns (
    id          UUID PRIMARY KEY,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    board_id    UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title       VARCHAR(128) NOT NULL,
    position    INT NOT NULL,
    wip_limit   INT NOT NULL DEFAULT 0
);

CREATE TABLE cards (
    id            UUID PRIMARY KEY,
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    board_id      UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    column_id     UUID NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    priority      VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
    due_date      DATE,
    position      INT NOT NULL,
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- =====================================================================
-- 4. HỆ THỐNG CHỈ MỤC TỔ HỢP DẪN ĐẦU BỞI TENANT_ID & CHỈ MỤC ĐẢO NGƯỢC GIN
-- =====================================================================
CREATE INDEX idx_boards_tenant_created    ON boards (tenant_id, created_at DESC);
CREATE INDEX idx_columns_tenant_board_pos ON board_columns (tenant_id, board_id, position ASC);
CREATE INDEX idx_cards_tenant_col_pos     ON cards (tenant_id, column_id, position ASC);
CREATE INDEX idx_cards_custom_fields_gin  ON cards USING GIN (custom_fields);

-- Cấp quyền DML cho tài khoản ứng dụng
GRANT SELECT, INSERT, UPDATE, DELETE ON tenants, tenant_users, boards, board_columns, cards TO kanban_app_user;

-- =====================================================================
-- 5. KÍCH HOẠT VÀ CƯỠNG CHẾ ROW-LEVEL SECURITY THEO NGUYÊN TẮC FAIL-CLOSED
-- =====================================================================
ALTER TABLE tenant_users  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users  FORCE ROW LEVEL SECURITY;

ALTER TABLE boards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards        FORCE ROW LEVEL SECURITY;

ALTER TABLE board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_columns FORCE ROW LEVEL SECURITY;

ALTER TABLE cards         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards         FORCE ROW LEVEL SECURITY;

-- Chính sách kiểm soát đối xứng cả chiều Đọc (USING) và chiều Ghi (WITH CHECK)
CREATE POLICY tenant_isolation_policy ON tenant_users
    FOR ALL TO kanban_app_user
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_policy ON boards
    FOR ALL TO kanban_app_user
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_policy ON board_columns
    FOR ALL TO kanban_app_user
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_policy ON cards
    FOR ALL TO kanban_app_user
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
```

### 2.3. Cấu trúc JSONB Chuẩn lưu trong `tenants.settings` và `cards.custom_fields`

* **Mẫu `tenants.settings` của `Acme Software (t-acme)`:**

```json
{
  "layer1_branding": {
    "themeColor": "#1D4ED8",
    "cardDensity": "FULL"
  },
  "layer2_workflow": {
    "wipMode": "STRICT",
    "defaultColumns": [
      { "title": "Chờ xử lý", "position": 1, "wipLimit": 5 },
      { "title": "Đang làm", "position": 2, "wipLimit": 2 },
      { "title": "Rà soát", "position": 3, "wipLimit": 3 },
      { "title": "Hoàn thành", "position": 4, "wipLimit": 0 }
    ]
  },
  "layer3_customFieldsSchema": [
    { "key": "story_points", "label": "Điểm nỗ lực", "type": "NUMBER", "required": true, "min": 1, "max": 21 },
    { "key": "sprint", "label": "Đợt phát triển", "type": "SELECT", "required": true, "options": ["Đợt 1", "Đợt 2", "Sprint Load"] }
  ]
}
```

* **Mẫu `tenants.settings` của `Lotus Media (t-lotus)`:**

```json
{
  "layer1_branding": {
    "themeColor": "#B45309",
    "cardDensity": "COMPACT"
  },
  "layer2_workflow": {
    "wipMode": "WARN",
    "defaultColumns": [
      { "title": "Ý tưởng", "position": 1, "wipLimit": 10 },
      { "title": "Sản xuất", "position": 2, "wipLimit": 2 },
      { "title": "Phát hành", "position": 3, "wipLimit": 5 }
    ]
  },
  "layer3_customFieldsSchema": [
    { "key": "channel", "label": "Kênh phát hành", "type": "SELECT", "required": true, "options": ["TikTok", "Facebook", "YouTube", "Web"] },
    { "key": "budget_usd", "label": "Ngân sách (USD)", "type": "NUMBER", "required": false, "min": 0 }
  ]
}
```

---

## 3. Chu trình Xử lý Yêu cầu 9 Bước Xuyên tầng và Ánh xạ `K1`–`K4` (Mục 4.3.2 & Hình 4.6)

Mọi yêu cầu nghiệp vụ đi vào dịch vụ `kanban-api` đều được bảo vệ qua 4 chặng gồm 9 bước tuần tự:

1. **Bước 1 (Gửi yêu cầu kèm Bearer JWT):** Trình duyệt `React 18` gửi yêu cầu HTTP đính kèm thẻ bài `JWT` trong tiêu đề `Authorization`.
2. **Bước 2 (`JwtTenantFilter` — Chặng 1 / Khía cạnh `K1`):** Xác minh chữ ký số `HMAC-SHA256`, thời hạn token và đối chiếu tiêu đề `Host`. Trích xuất `tenant_id`, `user_id`, `role` đã xác thực để khởi tạo đối tượng bất biến `TenantContext` gắn vào `ThreadLocal`, đồng thời đặt `MDC.put("tenant_id", tenantId)` bên trong khối bảo vệ `try ... finally`.
3. **Bước 3 (`RateLimitFilter` — Chặng 2 / Khía cạnh `K3`):** Đọc `tenant_id` từ `TenantContext` và thực thi kịch bản Lua `Token Bucket` nguyên tử trên `Redis 7.2` tại khóa `ratelimit:tenant:{tenant_id}` (hạn mức chuẩn `1.200 req/phút`, tốc độ nạp `20 token/giây`, dung lượng bùng phát `120 token`). Nếu vượt ngưỡng -> trả về ngay **HTTP 429 Too Many Requests**.
4. **Bước 4 (`KanbanService` đọc cấu hình 2 tầng — Chặng 3 / Khía cạnh `K3` & `K4`):** Truy xuất siêu dữ liệu 3 lớp qua khóa phân vùng `tenant:{tenant_id}:config` (ưu tiên đọc từ bộ đệm cục bộ **`Caffeine L1`** dùng thuật toán **`W-TinyLFU`**; nếu trượt mới đọc **`Redis L2`** hoặc bảng `tenants`).
5. **Bước 5 (Kiểm định luật nghiệp vụ & Tiêm biến phiên `RlsConnectionInterceptor` — Chặng 3 & 4 / Khía cạnh `K4` & `K2`):**
   - Động cơ tùy biến kiểm tra chế độ `wipMode` (`STRICT` chặn với **HTTP 422** nếu cột đích đã đầy; `WARN` gắn cờ cảnh báo) và xác thực kiểu dữ liệu của `custom_fields`.
   - Khi mở giao dịch CSDL trên kết nối mượn từ bể `HikariCP`, `RlsConnectionInterceptor` tự động thực thi lệnh nguyên tử:
     ```sql
     SET LOCAL app.current_tenant_id = '<tenant_uuid>';
     ```
6. **Bước 6 (Thực thi SQL):** Thực hiện câu lệnh `SELECT / INSERT / UPDATE` trên các bảng `boards`, `board_columns`, `cards`.
7. **Bước 7 (`PostgreSQL 16 FORCE RLS` — Chặng 4 / Khía cạnh `K2`):** Nhân PostgreSQL tự động áp dụng biểu thức `USING` và `WITH CHECK` theo `app.current_tenant_id` kết hợp quét phạm vi hẹp trên chỉ mục tổ hợp `B-Tree` dẫn đầu bởi `tenant_id`.
8. **Bước 8 (Cam kết giao dịch & Đồng bộ đệm):** Khi `COMMIT` (hoặc `ROLLBACK`), PostgreSQL tự động hủy biến phiên `SET LOCAL` trước khi trả kết nối sạch về bể `HikariCP`; dịch vụ cập nhật/xóa khóa đệm `tenant:{tenant_id}:board:{board_id}`.
9. **Bước 9 (Phản hồi & Dọn sạch ngữ cảnh luồng — Chặng 4 / Khía cạnh `K1`):** Đính kèm tiêu đề `X-Tenant-ID` vào phản hồi HTTP; khối `finally` tự động kích hoạt `TenantContext.clear()` và `MDC.remove("tenant_id")` trước khi hoàn trả luồng về `Tomcat Thread Pool`.

---

## 4. Danh mục Điểm cuối REST API Cốt lõi của Nguyên mẫu

| Mặt phẳng             | Phương thức & Đường dẫn API                         |    Ca sử dụng    | Mô tả đầu vào / đầu ra & Mã trạng thái HTTP                                                                                                                    |
| :---------------------- | :--------------------------------------------------------- | :----------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Control Plane** | `POST /api/v1/admin/tenants`                             |      `UC01`      | Khởi tạo thuê bao mới kèm cấu hình 3 lớp mặc định (`201 Created`).                                                                                          |
| **Control Plane** | `POST /api/v1/auth/switch-workspace`                     |      `UC02`      | Chọn không gian làm việc, kiểm tra thành viên và cấp thẻ bài `JWT` chứa `tenant_id` (`200 OK` / `403 Forbidden`).                                    |
| **Control Plane** | `GET /api/v1/tenant-settings/kanban`                     | `UC03`, `UC04` | Đọc siêu dữ liệu tùy biến 3 lớp từ đệm `L1/L2` hoặc `tenants.settings` (`200 OK`).                                                                     |
| **Control Plane** | `PUT /api/v1/tenant-settings/kanban`                     | `UC03`, `UC04` | Cập nhật cấu hình 3 lớp (`themeColor`, `wipMode`, `customFieldsSchema`), xóa đệm L2 và phát `Redis Pub/Sub` (`200 OK`).                              |
| **Data Plane**    | `POST /api/v1/boards`                                    |      `UC06`      | Tạo bảng Kanban mới, tự động sinh các cột theo `defaultColumns` của thuê bao (`201 Created`).                                                              |
| **Data Plane**    | `GET /api/v1/boards/{boardId}`                           | `UC06`, `UC10` | Lấy chi tiết bảng, danh sách cột và thẻ công việc trong phạm vi `tenant_id` (`200 OK` / `404 Not Found`).                                                |
| **Data Plane**    | `POST /api/v1/boards/{boardId}/tasks`                    |      `UC08`      | Tạo thẻ công việc mới kèm `customData` (lưu vào `cards.custom_fields`); trả `201 Created` hoặc `422 Unprocessable Entity` nếu sai lược đồ Lớp 3. |
| **Data Plane**    | `PATCH /api/v1/boards/{boardId}/tasks/{cardId}/position` |      `UC09`      | Kéo–thả thẻ sang cột đích; trả `200 OK` (kèm `wipWarning` nếu `WARN`) hoặc chặn với `422 Unprocessable Entity` nếu vi phạm `WIP STRICT`.        |

---

## 5. Kiến trúc Đóng gói 4 Vùng chứa (`docker-compose.yml` — Mục 4.4.1 & Phụ lục C)

```yaml
version: "3.9"

services:
  kanban-web:
    build: ./frontend
    container_name: nckh-ec2-web-1
    ports:
      - "80:80"
    depends_on:
      - kanban-api
    networks:
      - nckh-ec2-net
    deploy:
      resources:
        limits:
          cpus: "0.25"
          memory: 256M

  kanban-api:
    build: ./backend
    container_name: nckh-ec2-api-1
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres-db:5432/kanban_saas_db
      SPRING_DATASOURCE_USERNAME: kanban_app_user
      SPRING_DATASOURCE_PASSWORD: app_secret
      SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE: 25
      SPRING_DATA_REDIS_HOST: redis-cache
      SPRING_DATA_REDIS_PORT: 6379
    depends_on:
      - postgres-db
      - redis-cache
    networks:
      - nckh-ec2-net
    deploy:
      resources:
        limits:
          cpus: "1.25"
          memory: 2560M

  redis-cache:
    image: redis:7.2-alpine
    container_name: nckh-ec2-redis-1
    networks:
      - nckh-ec2-net
    deploy:
      resources:
        limits:
          cpus: "0.25"
          memory: 512M

  postgres-db:
    image: postgres:16-alpine
    container_name: nckh-ec2-postgres-1
    environment:
      POSTGRES_DB: kanban_saas_db
      POSTGRES_USER: kanban_migrator
      POSTGRES_PASSWORD: migrator_secret
    networks:
      - nckh-ec2-net
    deploy:
      resources:
        limits:
          cpus: "0.50"
          memory: 1536M

networks:
  nckh-ec2-net:
    driver: bridge
```
