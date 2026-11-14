# Tổng quan kiến trúc SaaS Đa thuê bao Cấp độ 3 (Pool Model)

> **Căn cứ chuẩn hóa:** Tài liệu này được chuẩn hóa đồng bộ 100% với báo cáo khoa học **`Report_v2.docx`** (Chương 4: Thiết kế nguyên mẫu Cấp độ 3; Chương 5: Thiết lập và Kết quả kiểm định thực nghiệm).
> Hệ thống chốt nguyên mẫu mặc định hoạt động theo mô hình **SaaS Cấp độ 3 (Maturity Level 3 — Pool: Shared Database, Shared Schema)** với cơ chế bảo vệ ranh giới đa tầng bằng PostgreSQL Row-Level Security (RLS) và mở rộng siêu dữ liệu qua JSONB.

---

## 1. Mục tiêu kiến trúc và Tiêu chí chất lượng

Hệ thống được thiết kế để giải quyết trọn vẹn **Bảy Thách thức cốt lõi** và thỏa mãn **Sáu Yêu cầu Phi chức năng (NFR-01 đến NFR-06)** của nền tảng SaaS Kanban Cấp độ 3:

1. **Tuyệt đối không rò rỉ dữ liệu chéo thuê bao (Cross-Tenant Data Leakage = 0):** Ranh giới thuê bao được bảo vệ kép ở cả tầng ứng dụng (Application Middleware) và tầng cơ sở dữ liệu (PostgreSQL FORCE RLS).
2. **Kháng hiện tượng láng giềng ồn ào (Anti-Noisy Neighbor):** Thuê bao phát sinh lưu lượng đột biến không được phép làm suy giảm chất lượng dịch vụ (SLA) hoặc làm cạn kiệt tài nguyên của các thuê bao lân cận.
3. **Bộ nhớ đệm nhận thức thuê bao (Tenant-Aware Two-Tier Caching):** Đảm bảo phân vùng khóa độc lập, ngăn chặn ô nhiễm khóa đệm và triệt tiêu nguy cơ đọc dữ liệu cũ (Stale Read).
4. **Khả năng tùy biến động lúc chạy (Dynamic Runtime Customization):** Hỗ trợ cấu hình 3 lớp độc lập cho từng tổ chức (Giao diện, Quy trình WIP, Trường động JSONB) mà không cần can thiệp mã nguồn hay khởi động lại dịch vụ.
5. **Vận hành trên ngân sách tài nguyên hữu hạn:** Hoạt động ổn định, có thể kiểm chứng và tái lập trên hạ tầng điện toán giới hạn cứng (tương đương cấu hình AWS EC2 `m7i-flex.large`: 2 vCPU, 8 GiB RAM).

---

## 2. Bối cảnh và Phân tách Hai Mặt phẳng Kiến trúc

Hệ thống được tổ chức phân tách rạch ròi thành **Hai Mặt phẳng Kiến trúc (Dual-Plane Architecture)** theo đúng Chương 4 của `Report_v2.docx`:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             INGRESS GATEWAY                                 │
│          Caddy 2 Reverse Proxy (Host header binding, SSL, Port 80/8080)     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌───────────────────────────────────────┐   ┌─────────────────────────────────┐
│     MẶT PHẲNG ĐIỀU KHIỂN             │   │       MẶT PHẲNG DỮ LIỆU         │
│         (CONTROL PLANE)               │   │          (DATA PLANE)           │
│                                       │   │                                 │
│  - Host: accounts.localhost           │   │  - Host: {tenant_slug}.localhost│
│  - Định danh người dùng (User Account)│   │  - Dự án & Phân quyền (Project) │
│  - Quản lý Workspace & Đăng ký gói    │   │  - Bảng Kanban & Cột (Board/Col)│
│  - Phân quyền Tenant (Owner/Admin)    │   │  - Thẻ công việc & Hạn (Task)   │
│  - Định tuyến Subdomain (Routes)      │   │  - Bình luận & Trao đổi         │
│  - Cấp mã Transfer Code chuyển vùng   │   │  - Tùy biến WIP & Trường JSONB  │
│  - Cơ sở dữ liệu: control_db          │   │  - Cơ sở dữ liệu: pool_db       │
└───────────────────────────────────────┘   └─────────────────────────────────┘
```

### 2.1. Mặt phẳng Điều khiển (Control Plane)
- **Tên miền phục vụ:** `accounts.localhost` (hoặc `accounts.{BASE_DOMAIN}`).
- **Trách nhiệm:** Quản lý vòng đời tài khoản toàn cục, tổ chức thuê bao, gói đăng ký (`STARTER`, `PROFESSIONAL`, `ENTERPRISE`), lời mời thành viên và bảng định tuyến tenant.
- **Cơ sở dữ liệu:** `control_db` (Flyway control migrations V1..V6).
- **Nguyên tắc an toàn:** Không chứa bất kỳ dữ liệu nghiệp vụ nào của các dự án Kanban.

### 2.2. Mặt phẳng Dữ liệu (Data Plane)
- **Tên miền phục vụ:** `{tenant_slug}.localhost` (ví dụ: `t-acme.localhost`, `t-lotus.localhost`).
- **Trách nhiệm:** Vận hành toàn bộ quy trình làm việc Kanban, quản lý dự án, bảng, cột, thẻ công việc, tệp đính kèm và thông báo.
- **Cơ sở dữ liệu:** `pool_db`, toàn bộ bảng nghiệp vụ đặt tại lược đồ dùng chung `public` (Flyway application migrations V1..V14).
- **Nguyên tắc an toàn:** Mọi bảng dữ liệu đều mang cột phân định `tenant_id` và chịu sự cưỡng chế của Row-Level Security.

---

## 3. Bốn Trụ cột Kỹ thuật Kiểm soát Cốt lõi (K1 – K4)

Kiến trúc hiện thực hóa đầy đủ 4 phân hệ kỹ thuật tương ứng với 4 khía cạnh K1–K4 trong Báo cáo V2:

```
                      YÊU CẦU HTTP TỪ CLIENT
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ [K1] ĐƯỜNG ỐNG ĐỊNH DANH & LAN TRUYỀN NGỮ CẢNH (IDENTITY PIPELINE)          │
│ - Xác thực Stateless JWT (chữ ký bí mật, hạn dùng)                         │
│ - Trích xuất claim: sub (userId), tid (tenantId), tenant_slug, tier         │
│ - Đối soát Host Subdomain khớp 100% với token claim tid                     │
│ - Thiết lập TenantContext & gắn nhãn MDC Logging                            │
│ - Khối try ... finally dọn sạch ThreadLocal ngay sau khi kết thúc request    │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ [K3] BẢO VỆ HIỆU NĂNG & ĐIỀU TIẾT LƯU LƯỢNG (PERFORMANCE ISOLATION)         │
│ - Rate Limiting theo Tenant: Token Bucket qua Redis Lua Script nguyên tử    │
│ - Cắt lưu lượng vượt ngưỡng bằng HTTP 429 Too Many Requests                │
│ - Bộ nhớ đệm 2 tầng: L1 Caffeine (W-TinyLFU) + L2 Redis                     │
│ - Khóa phân vùng: tenant:{tenant_id}:{resource}:{version}                   │
│ - Vô hiệu hóa tức thời qua Redis Pub/Sub + Trigger content_version          │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ [K4] ĐỘNG CƠ TÙY BIẾN 3 LỚP LÚC CHẠY (DYNAMIC RUNTIME CUSTOMIZATION)        │
│ - Lớp 1 (UI/Brand): Màu chủ đạo, Logo, Card Style (FULL / COMPACT)         │
│ - Lớp 2 (Workflow): Mẫu cột Kanban, Luật WIP STRICT (422) vs WARN (200)    │
│ - Lớp 3 (Data): Trường mở rộng bán cấu trúc tasks.custom_data (JSONB)       │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ [K2] CÔ LẬP DỮ LIỆU ĐA TẦNG & GIAO DỊCH AN TOÀN (DATA ISOLATION)           │
│ - Mở kết nối HikariCP từ pool_db (User: pool_app không có Superuser)       │
│ - Bắt đầu Transaction: SELECT set_config('app.tenant_id', ?, true)         │
│ - Nhân PostgreSQL thực thi FORCE ROW LEVEL SECURITY                        │
│ - Truy vấn thiếu WHERE hoặc lệch tenant_id tự động bị lọc 0 dòng (Fail-Closed)│
│ - Commit / Rollback tự động dọn sạch biến phiên connection                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.1. Phân hệ K1 — Định danh và Lan truyền Ngữ cảnh Thuê bao
- **Cơ chế xác thực:** Stateless JWT mang định danh người dùng (`sub`), định danh thuê bao (`tid`), slug (`tenant_slug`) và phân hạng gói (`tier`).
- **Phòng chống tấn công IDOR & Đánh tráo Subdomain:**
  `TenantHostResolver` phân giải subdomain từ tiêu đề `Host`. `TenantContextFilter` so khớp bắt buộc `Host.slug == JWT.tenant_slug`. Nếu không khớp, yêu cầu bị từ chối ngay lập tức với mã **HTTP 401 Unauthorized**.
- **Quản lý ngữ cảnh luồng an toàn (ThreadLocal Hygiene):**
  Ngữ cảnh `TenantContext` được lưu trong `ThreadLocal`. Để chống ô nhiễm ngữ cảnh khi Tomcat tái sử dụng luồng trong hồ luồng (Thread Pool), toàn bộ quy trình được bọc trong cấu trúc bắt buộc:
  ```java
  try {
      TenantContextHolder.set(context);
      MDC.put("tenant_id", context.tenantId().toString());
      filterChain.doFilter(request, response);
  } finally {
      TenantContextHolder.clear();
      MDC.remove("tenant_id");
  }
  ```

### 3.2. Phân hệ K2 — Cô lập Dữ liệu Bằng RLS và Giao dịch Nguyên tử SET LOCAL
- **Nguyên tắc Phòng thủ Chiều sâu (Defense-in-Depth):**
  Không tin tưởng duy nhất vào mệnh đề `WHERE tenant_id = ?` ở mã nguồn ứng dụng (vì có thể bị lập trình viên bỏ sót).
- **Rào chắn kép tại nhân PostgreSQL:**
  - Bật cưỡng chế: `ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;`
  - Bắt buộc với cả chủ sở hữu: `ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY;`
  - Chính sách cô lập:
    ```sql
    CREATE POLICY tenant_isolation ON {table_name}
        USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
        WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
    ```
- **Thiết lập biến phiên cục bộ (`SET LOCAL`):**
  Thông qua `TenantJdbcExecutor`, mỗi khi ứng dụng mượn kết nối từ HikariCP, lệnh `set_config('app.tenant_id', ?, true)` được thực thi với tham số thứ ba là `true` (chỉ có hiệu lực trong phạm vi Transaction hiện tại). Khi transaction commit hoặc rollback, biến `app.tenant_id` tự động bị hủy, ngăn chặn hoàn toàn việc rò rỉ biến phiên giữa các yêu cầu khác nhau trên connection pool.
- **Tài khoản ứng dụng quyền tối thiểu:** Vai trò `pool_app` không có quyền `SUPERUSER` hay `BYPASSRLS`. Nếu truy vấn thiếu biến phiên hoặc cố ý truy cập chéo UUID của tenant khác, hệ thống tự động trả về 0 bản ghi (Fail-Closed) hoặc trả về HTTP 403/404.

### 3.3. Phân hệ K3 — Cô lập Hiệu năng và Bộ nhớ Đệm Hai Tầng
- **Kiểm soát tốc độ (Per-Tenant Rate Limiting):**
  - Thực thi thuật toán **Token Bucket** nguyên tử qua Redis Lua script kết hợp lấy giờ máy chủ Redis (`TIME`) để tránh lệch xung đồng hồ.
  - Phân bổ hạn mức lưu lượng theo phân hạng gói (`Subscription Tier`), cho phép bùng nổ an toàn (Burst 10%).
  - Khi tenant vượt ngưỡng cho phép (như `t-aggressor` phát tải 168 RPS), bộ lọc cắt lưu lượng ngay tại tầng biên với mã **HTTP 429 Too Many Requests** kèm tiêu đề `Retry-After`, bảo toàn 100% tài nguyên CPU/DB cho các tenant thông thường.
- **Bộ nhớ đệm 2 tầng (Two-Tier Caching):**
  - **Tầng L1 (In-Memory JVM):** Thư viện Caffeine áp dụng thuật toán tối ưu **W-TinyLFU**, kích thước tối đa 2.000 phần tử, TTL 30 giây.
  - **Tầng L2 (Phân tán):** Redis 7, TTL 2 phút.
  - **Quy ước đặt khóa phân vùng:** `tenant:{tenant_id}:{resource}:{version}` đảm bảo tính cô lập tuyệt đối giữa các tenant trong cache.
- **Đồng bộ xóa đệm tức thời (Cache Invalidation):**
  - Khi cấu hình Kanban hoặc dữ liệu thẻ thay đổi, sự kiện được phát qua kênh Redis Pub/Sub `tenant:config:invalidate` để toàn bộ các instance API xóa đệm L1 ngay lập tức.
  - Tại tầng CSDL, trigger PostgreSQL tự động tăng `content_version` trên bảng `boards` khi có thao tác INSERT/UPDATE/DELETE trên thẻ hoặc bình luận, đảm bảo phía đọc luôn đối soát version trước khi dùng đệm, triệt tiêu hoàn toàn rủi ro Stale Read.

### 3.4. Phân hệ K4 — Động cơ Tùy biến Ba Lớp lúc Chạy
Hệ thống cho phép các tổ chức thuê bao tùy biến sâu sắc hành vi mà không cần tách nhánh mã nguồn:
1. **Lớp 1 — Nhận diện Thương hiệu & Giao diện:** Lưu trữ tại `tenant_branding`, cho phép tùy chỉnh màu chủ đạo (`#1D4ED8` xanh cho Acme, `#B45309` cam cho Lotus), logo và kiểu hiển thị thẻ (`FULL` chi tiết hoặc `COMPACT` thu gọn).
2. **Lớp 2 — Quy trình làm việc & Kiểm soát WIP:** Lưu trữ tại `tenant_kanban_settings.settings` (JSONB):
   - Tự động sinh các cột mặc định theo đặc thù ngành nghề khi tạo bảng mới.
   - Cơ chế giới hạn việc đang làm (`wip_limit`): Chế độ `STRICT` chặn đứng giao dịch kéo thẻ vượt hạn mức bằng **HTTP 422 Unprocessable Entity**; Chế độ `WARN` cho phép lưu thành công nhưng gắn cờ cảnh báo `wipWarning = true` lên giao diện.
3. **Lớp 3 — Trường Dữ liệu Mở rộng (Dynamic Fields via JSONB):**
   - Định nghĩa trường động dạng danh sách cấu trúc trong cấu hình tenant (hỗ trợ các kiểu `STRING`, `NUMBER`, `BOOLEAN` và cờ `required`).
   - Dữ liệu thực tế của thẻ được lưu trong cột `tasks.custom_data` dạng **JSONB**.
   - Server thực hiện xác thực tính hợp lệ của trường trước khi ghi: từ chối trường ngoài danh mục, sai kiểu dữ liệu hoặc thiếu trường bắt buộc bằng mã **HTTP 422**.

---

## 4. Quản lý Vòng đời Thuê bao và Ứng xử Hệ thống

Trạng thái của tổ chức thuê bao được quản lý tập trung tại `control_db`:

```text
               ┌───────────────────────┐
               │    PENDING_PAYMENT    │
               └──────────┬────────────┘
                          │ Xác nhận kích hoạt
                          ▼
               ┌───────────────────────┐
         ┌────►│        ACTIVE         │◄───┐
         │     └──────────┬────────────┘    │
Khôi phục│                │ Hết hạn/Khóa     │ Mở khóa
         │                ▼                 │
         │     ┌───────────────────────┐    │
         └─────│       SUSPENDED       │────┘
               └───────────────────────┘
```

| Trạng thái | Hành vi hệ thống đối với Mặt phẳng Dữ liệu |
| :--- | :--- |
| **ACTIVE** | Người dùng truy cập bình thường, thực thi đầy đủ các giao dịch Kanban theo phân quyền. |
| **SUSPENDED** | **Fail-Closed:** Mọi yêu cầu gửi tới `{tenant}.localhost` đều bị `TenantContextFilter` chặn với mã **HTTP 403 Forbidden** (hoặc chuyển hướng trang thông báo tạm ngưng). Các tiến trình nền (Worker, Deadline Reminders) lập tức bỏ qua tenant này. |
| **PENDING_PAYMENT** | Chưa thể truy cập Mặt phẳng Dữ liệu; chỉ cho phép người tạo hoàn tất các bước thanh toán/kích hoạt tại Control Plane. |

---

## 5. Ngân sách Kết nối và Tài nguyên Hệ thống (EC2 Profile)

Bản nguyên mẫu Cấp độ 3 được cấu hình tối ưu để vận hành hoàn hảo trên ngân sách tài nguyên cố định của AWS EC2 `m7i-flex.large` (2 vCPU, 8 GiB RAM):

| Thành phần Container | Hạn mức vCPU | Hạn mức RAM | Cấu hình tham số cốt lõi |
| :--- | :---: | :---: | :--- |
| **kanban-api** (Spring Boot 3 / Java 21) | 1.25 vCPU | 2560 MB | JVM `-Xms1024m -Xmx1792m`, Tomcat max threads = 60, HikariCP max pool = 25 |
| **postgres-db** (PostgreSQL 16) | 0.50 vCPU | 1536 MB | `shared_buffers=384MB`, `work_mem=16MB`, `max_connections=120` |
| **redis-cache** (Redis 7 Alpine) | 0.25 vCPU | 512 MB | `maxmemory 256mb`, chính sách `volatile-lru` |
| **caddy / web** (Reverse Proxy & UI) | 0.25 vCPU | 256 MB | Ingress HTTP/2, gzip/zstd, forward host header an toàn |
| **Hệ điều hành Host & Tải đo k6** | ~0.50 vCPU | ~3 GiB | Dành riêng cho OS Linux và tiến trình phát tải 80 VUs của k6 |

---

## 6. Phụ lục: Kiến trúc Mở rộng & Biến thể Đối chứng (Bridge Blueprint)

> [!NOTE]
> Trong cơ sở mã nguồn hiện tại, hệ thống vẫn lưu trữ một biến thể đối chứng mang tên **Bridge** (hỗ trợ tùy chọn 3 mô hình: Pool, Schema-per-tenant và Silo Database). Biến thể này được sử dụng phục vụ công tác đối sánh lý thuyết chuyên sâu tại **Chương 2 của Báo cáo khoa học**.
> 
> Tuy nhiên, đối với sản phẩm triển khai thực tế và toàn bộ dữ liệu thực nghiệm tại **Chương 4 và Chương 5**, hệ thống chốt mặc định chạy xuyên suốt trên **Mô hình Pool mức 3 (Shared Database, Shared Schema)**. Mọi yêu cầu tạo mới workspace đều mặc định cấp phát vào Pool.
