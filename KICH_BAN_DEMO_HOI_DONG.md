# Kịch bản Demo Hội đồng — TenantFlow (Pool Level 3 Multi-Tenant Kanban)

Tài liệu đối chiếu: `Report_V4.docx` & `srs_ng_d_ng_kanban_a_thu_bao_tenantflow.md`  
Thời lượng trình bày gợi ý: **5–7 phút**

---

## 0. Chuẩn bị trước khi lên trình bày (1 phút)

Đảm bảo cả 5 container đang chạy:
```bash
docker compose --env-file infra/.env up -d
docker ps --filter "name=tenantflow"
```

Mở sẵn **3 tab trình duyệt** đặt cạnh nhau (mật khẩu chung: `Password123!`):

| Tab | URL | Tài khoản | Vai trò | Mục đích |
| :--- | :--- | :--- | :--- | :--- |
| **Tab 1** (`t-acme` – Team Dev) | `http://t-acme.localhost:18090` | `hung@acme.vn` | `TENANT_ADMIN` | Minh họa Tenant Kỹ thuật (xanh `#1D4ED8`, 4 cột, WIP `STRICT`) |
| **Tab 2** (`t-lotus` – Team Marketing) | `http://t-lotus.localhost:18090` | `lan@lotus.vn` | `TENANT_ADMIN` | Minh họa Tenant Truyền thông (hồng `#BE185D`, 3 cột, WIP `WARN`) |
| **Tab 3** (Control Plane) | `http://localhost:18090` | `admin@tenantflow.vn` | `System Admin` | Quản trị vòng đời Tenant & gói cước (UC01) |

> **Gợi ý chụp ảnh minh chứng cho Báo cáo (`Report_V4.docx` Chương 4):**
> - **Hình 4.5**: Chụp Tab 3 (Quản trị Hệ thống) + màn hình *Cài đặt Tổ chức* ở Tab 1.
> - **Hình 4.6**: Đặt **Tab 1 (`t-acme`)** và **Tab 2 (`t-lotus`)** cạnh nhau rồi chụp 1 ảnh toàn màn hình để đối chứng trực quan 2 Tenant trên cùng 1 mã nguồn.

---

## 1. Giới thiệu Kiến trúc 5 Container & Control Plane (1 phút)

1. Chiếu terminal `docker ps --filter "name=tenantflow"` để hội đồng thấy hệ thống chạy thật gồm **5 container** trên mạng nội bộ `nckh-ec2-net`:
   - `caddy-proxy` (Reverse Proxy định tuyến Wildcard Subdomain, chuyển tiếp `Host`)
   - `kanban-web` (React 18 + TypeScript + Vite)
   - `kanban-api` (Java 21 + Spring Boot 3.3, HikariCP max 25, Flyway, Caffeine)
   - `redis-cache` (Redis 7.2: Token Bucket Lua, Cache L2, Pub/Sub)
   - `postgres-db` (PostgreSQL 16: 1 DB `kanban_saas_db`, 5 bảng, `FORCE RLS`)
2. Chiếu **Tab 3 (`System Admin`)**:
   - Trình bày đây là **Mặt phẳng Điều khiển (Control Plane)**: quản lý vòng đời Tenant (`t-acme` gói `ENTERPRISE`, `t-lotus` gói `PRO`).
   - Có thể thao tác *Tạo Tenant* mới hoặc bấm *Tạm khóa* (`SUSPENDED`) để chứng minh UC01.

---

## 2. Chứng minh K1 – Định danh Subdomain & Chặn truy cập chéo (1.5 phút)

1. **Chặn đăng nhập nhầm tên miền trên giao diện**:
   - Mở 1 tab ẩn danh vào `http://t-acme.localhost:18090`.
   - Nhập tài khoản của Lotus (`lan@lotus.vn` / `Password123!`).
   - **Kết quả**: Hệ thống chặn ngay và báo lỗi đỏ: `Lỗi 403 — Tài khoản lan@lotus.vn không thuộc tổ chức "t-acme" (tổ chức hợp lệ: t-lotus).`
2. **Chặn lệch `Host` vs `JWT` ở tầng API (Kịch bản KB-1)**:
   - Giải thích: Nếu kẻ tấn công lấy JWT hợp lệ của `t-acme` đem gọi sang `Host: t-lotus.localhost:18090`, bộ lọc `JwtTenantFilter` đối soát `Host` với `JWT.slug`, trả ngay **HTTP 403** (`Subdomain mismatch`) và thu hồi `ThreadLocal` trong khối `finally`.
3. **Chuyển đổi đa Tenant (UC02)**:
   - Đăng nhập `hung@acme.vn` tại `http://localhost:18090` (tài khoản thuộc cả `t-acme` và `t-lotus`), chọn Tenant để cấp JWT mới và điều hướng sang đúng subdomain.

---

## 3. Chứng minh K4 – 1 Codebase, Tùy biến Động 3 Lớp cho từng Tenant (2 phút)

Đặt **Tab 1 (`t-acme`)** và **Tab 2 (`t-lotus`)** song song để đối chứng:

1. **Lớp 1 (Thương hiệu & Giao diện)**:
   - `t-acme`: màu chủ đạo xanh `#1D4ED8`, chế độ thẻ `FULL`.
   - `t-lotus`: màu chủ đạo hồng `#BE185D`, chế độ thẻ `COMPACT`.
2. **Lớp 2 (Quy trình Cột & Luật WIP)**:
   - Tại **Tab 1 (`t-acme`, chế độ `STRICT`)**: Kéo 1 thẻ từ cột *Chờ xử lý* sang cột *Đang làm* (đã có `2/2` thẻ) → API trả về **HTTP 422 Unprocessable Entity**, giao diện tự bật thẻ về cột cũ và hiện thông báo lỗi đỏ.
   - Tại **Tab 2 (`t-lotus`, chế độ `WARN`)**: Kéo 1 thẻ từ cột *Ý tưởng* sang cột *Sản xuất* (đã có `2/2` thẻ) → API vẫn lưu (**HTTP 200 OK** kèm `wipWarning: true`) và cột bật **cảnh báo vàng `3/2`**.
3. **Lớp 3 (Trường dữ liệu mở rộng JSONB & Đồng bộ tức thời)**:
   - Vào mục *Cài đặt Tổ chức* ở **Tab 2 (`t-lotus`)**: đổi màu chủ đạo hoặc thêm 1 trường mở rộng mới (ví dụ `deadline_note`), bấm *Lưu cấu hình*.
   - Quay lại bảng Kanban Tab 2 → giao diện đổi màu & form tạo thẻ tự sinh thêm ô nhập mới ngay lập tức không cần restart server (backend ghi DB, xóa Redis L2 và phát Redis Pub/Sub xóa L1 Caffeine).
   - Qua **Tab 1 (`t-acme`)** nhấn F5 → **không hề bị ảnh hưởng**, vẫn giữ nguyên `Điểm nỗ lực` (`NUMBER`, bắt buộc) và `Đợt phát triển` (`TEXT`).

---

## 4. Chứng minh K2 & K3 – Phòng thủ chiều sâu & Cô lập hiệu năng (1 phút)

1. **K2 (`FORCE ROW LEVEL SECURITY` Fail-Closed)**:
   - Chạy trực tiếp trên PostgreSQL bằng tài khoản runtime `kanban_app_user` (`NOBYPASSRLS`) **không set `app.current_tenant_id`**:
     ```bash
     docker exec -it tenantflow-postgres psql -U kanban_app_user -d kanban_saas_db -c "SELECT id, title FROM cards;"
     ```
   - **Kết quả**: Trả về **`0 rows`** — chứng minh dù code ứng dụng quên `WHERE tenant_id`, tầng PostgreSQL vẫn cô lập tuyệt đối dữ liệu (Fail-Closed).
2. **K3 (Rate Limit Token Bucket & Cache 2 tầng)**:
   - Mở DevTools (F12) → tab **Network**, bấm vào bất kỳ request API nào để chỉ ra các Response Headers:
     - `X-Tenant-ID`: định danh thuê bao đang phục vụ
     - `X-RateLimit-Limit` & `X-RateLimit-Remaining`: hạn mức Token Bucket trên Redis theo gói (`ENTERPRISE` = 600/phút, `PRO` = 120/phút, `FREE` = 30/phút).

---

## 5. Câu chốt trả lời Hội đồng

> **Câu hỏi thường gặp:** *"Hệ thống này khác gì một app quản lý công việc bình thường có cột `team_id`?"*
>
> **Trả lời:** Nếu chỉ dùng `team_id` và lọc `WHERE` trong code thì mới dừng ở **Đa người dùng (Multi-User)**: lập trình viên quên `WHERE` là rò rỉ dữ liệu, mọi nhóm dùng chung hàng đợi/cache nên dễ bị hàng xóm ồn ào kéo chậm, và mọi nhóm bị ép chung một quy trình cứng. **TenantFlow** chứng minh kiến trúc **Đa thuê bao Pool Cấp độ 3** qua 4 rào chắn đồng bộ: **K1** khóa `Host`–`JWT` tại biên, **K2** ép `FORCE RLS` Fail-Closed tại đáy PostgreSQL, **K3** tách Token Bucket & Cache theo `tenant_id`, và **K4** cho phép mỗi Tenant tự cấu hình 3 lớp lúc chạy mà không sửa mã nguồn hay đổi lược đồ bảng.
