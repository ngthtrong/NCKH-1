# Đặc tả Use Case — SaaS Kanban Đa thuê bao Cấp độ 3 (Pool Model)

> **Căn cứ chuẩn hóa:** Đặc tả này được đồng bộ 100% với báo cáo khoa học **`Report_v2.docx`** (Chương 4: Đặc tả yêu cầu chức năng theo Hai Mặt phẳng Kiến trúc; Chương 5: Bốn nhóm kịch bản kiểm định thực nghiệm KB-1 đến KB-4).
> Toàn bộ các Use Case nghiệp vụ hoạt động trên nền tảng **SaaS Cấp độ 3 (Pool: Shared Database, Shared Schema)** với cơ chế bảo vệ ranh giới dữ liệu tự động bằng **PostgreSQL Row-Level Security (RLS)** và tham số phiên giao dịch **`SET LOCAL app.tenant_id`**.

---

## PHẦN 1. CÁC USE CASE NGHIỆP VỤ CỐT LÕI (MỨC 3 / POOL)

### UC-01 — Đăng ký và Khởi tạo Không gian làm việc (Tenant Onboarding)
- **Tác nhân:** Người dùng mới (Khách hàng tổ chức).
- **Mặt phẳng:** Mặt phẳng Điều khiển (`accounts.localhost`).
- **Tiền điều kiện:** Email chưa đăng ký tài khoản; slug dự kiến chưa bị trùng.
- **Luồng chính:**
  1. Người dùng nhập thông tin tài khoản (email, mật khẩu) và thông tin tổ chức (tên workspace, slug subdomain mong muốn).
  2. Người dùng chọn phân hạng gói dịch vụ (`STARTER`, `PROFESSIONAL` hoặc `ENTERPRISE`).
  3. Hệ thống kiểm tra hợp lệ DNS slug, tạo bản ghi `user_accounts` và `tenants` (mặc định kiến trúc `POOL`).
  4. Hệ thống cấp phát vai trò `OWNER` cho người tạo, tạo bảng định tuyến `tenant_routes` và kích hoạt trạng thái `ACTIVE`.
  5. Hệ thống khởi tạo bộ cấu hình Kanban mặc định (`tenant_kanban_settings`) và bảng dự án mẫu đầu tiên.
  6. Người dùng được cấp phiên làm việc và chuyển hướng sang subdomain của tổ chức `{tenant_slug}.localhost`.
- **Ngoại lệ:** Slug trùng hoặc sai định dạng DNS; hệ thống từ chối và yêu cầu chọn slug khác.
- **Truy vết:** FR-01, FR-02, K1, NFR-01.

---

### UC-02 — Đăng nhập Trung tâm và Chuyển vùng Thuê bao (SSO & Transfer Code)
- **Tác nhân:** Người dùng đã có tài khoản.
- **Mặt phẳng:** Mặt phẳng Điều khiển $\rightarrow$ Mặt phẳng Dữ liệu.
- **Tiền điều kiện:** Người dùng có ít nhất một tư cách thành viên (`TENANT_MEMBERSHIP`) đang hoạt động ở tenant `ACTIVE`.
- **Luồng chính:**
  1. Người dùng truy cập `http://accounts.localhost:8080/login` và nhập email/mật khẩu.
  2. Hệ thống xác thực thông tin, cấp Access JWT toàn cục và hiển thị danh sách các Workspace mà người dùng tham gia.
  3. Người dùng chọn Workspace muốn làm việc.
  4. Hệ thống sinh một mã **Transfer Code** ngẫu nhiên, bảo mật cao (single-use, TTL 60 giây, lưu hash tại CSDL, gắn chặt với `user_id` và `target_host`).
  5. Trình duyệt được chuyển hướng sang `http://{tenant_slug}.localhost:8080/exchange?code=...`.
  6. Subdomain gửi request POST trao đổi code lấy **Tenant-bound Session** (chứa JWT có claim `tid`, `tenant_slug`, `tier`).
  7. Client lưu token vào bộ nhớ và bắt đầu phiên làm việc trong Mặt phẳng Dữ liệu.
- **Ngoại lệ:** Code hết hạn, bị replay (dùng lại lần 2), hoặc bị sửa đổi `target_host`; hệ thống lập tức từ chối và hủy phiên.
- **Truy vết:** FR-03, FR-04, SEC-01..04, K1, NFR-01.

---

### UC-03 — Chuyển đổi qua lại giữa các Không gian làm việc (Tenant Switching)
- **Tác nhân:** Người dùng thuộc nhiều tổ chức thuê bao khác nhau.
- **Luồng chính:**
  1. Từ thanh điều hướng, người dùng nhấn vào nút chuyển Workspace (Tenant Switcher).
  2. Hệ thống chuyển hướng người dùng về trang chọn Workspace tại `accounts.localhost`.
  3. Người dùng chọn Workspace đích mới.
  4. Hệ thống thực hiện quy trình cấp mã Transfer Code như UC-02 sang host mới.
  5. Trình duyệt tại host mới khởi tạo phiên làm việc mới, đồng thời bộ nhớ đệm (TanStack React Query Cache) phía client được xóa sạch theo ranh giới tenant, không để sót dữ liệu của tenant cũ.
- **Truy vết:** FR-05, SEC-02, K1.

---

### UC-04 — Mời và Quản lý Thành viên Thuê bao
- **Tác nhân:** Quản trị viên thuê bao (`OWNER` hoặc `ADMIN`); Người được mời.
- **Luồng chính:**
  1. Quản trị viên nhập email của đồng nghiệp và chọn vai trò cấp tenant (`ADMIN` hoặc `MEMBER`).
  2. Hệ thống tạo bản ghi lời mời kèm mã token xác thực an toàn có hạn sử dụng (TTL 7 ngày) và gửi thông báo/email.
  3. Người được mời nhận link, đăng nhập hoặc tạo tài khoản, sau đó chấp nhận lời mời.
  4. Hệ thống tạo liên kết `tenant_memberships` chính thức.
  5. Quản trị viên có thể thay đổi vai trò hoặc thu hồi (revoke) quyền của thành viên bất cứ lúc nào.
- **Ngoại lệ:** Lời mời hết hạn; email không khớp; cố tình xóa hoặc hạ quyền của `OWNER` duy nhất còn lại.
- **Hậu điều kiện:** Thành viên bị thu hồi quyền sẽ bị hệ thống từ chối ngay ở yêu cầu kế tiếp do `membershipVersion` được kiểm tra.
- **Truy vết:** FR-10..15, SEC-08.

---

### UC-05 — Quản lý Dự án và Phân quyền Dự án
- **Tác nhân:** Thành viên tổ chức (`TenantMember`); Quản lý dự án (`ProjectManager`).
- **Luồng chính:**
  1. Thành viên tổ chức tạo mới Dự án (Project) trong workspace, người tạo tự động trở thành `MANAGER` của dự án đó.
  2. `MANAGER` có quyền chỉnh sửa tên, mô tả, lưu trữ (archive) hoặc xóa mềm (soft delete) dự án.
  3. `MANAGER` phân quyền các thành viên khác trong workspace vào dự án với các vai trò:
     - `MANAGER`: Toàn quyền quản trị bảng, cột và phân quyền.
     - `MEMBER`: Được quyền tạo, sửa, kéo thả thẻ công việc và bình luận.
     - `VIEWER`: Chỉ được xem nội dung bảng và thẻ, không có quyền chỉnh sửa.
- **Ngoại lệ:** Thêm thành viên không thuộc workspace; thao tác sửa đổi trên dự án đã bị lưu trữ (archived).
- **Truy vết:** FR-20..25, SEC-10.

---

### UC-06 — Xây dựng và Quản trị Bảng Kanban
- **Tác nhân:** `ProjectManager`.
- **Luồng chính:**
  1. Quản lý tạo mới Bảng Kanban (Board) trong dự án.
  2. Khi tạo bảng, hệ thống tự động sinh các cột mặc định dựa trên cấu hình quy trình làm việc của tenant (ví dụ: Acme có 4 cột, Lotus có 3 cột).
  3. Quản lý có thể thêm cột mới, đổi tên, đổi màu sắc và kéo thả sắp xếp lại thứ tự các cột.
  4. Quản lý cấu hình cờ **Semantic Completion** trên cột (đánh dấu cột đó là cột hoàn thành công việc, thay vì hardcode theo tên chữ "Done").
- **Ngoại lệ:** Xóa cột khi đang còn chứa thẻ công việc; hệ thống yêu cầu chuyển thẻ sang cột khác trước khi xóa.
- **Truy vết:** FR-30..35, K4.

---

### UC-07 — Tạo, Giao việc và Di chuyển Thẻ công việc (Kanban Task Lifecycle)
- **Tác nhân:** `ProjectManager`, `ProjectMember`.
- **Luồng chính:**
  1. Người dùng tạo thẻ công việc (Task) trong một cột, nhập tiêu đề, mô tả, hạn hoàn thành (`due_at`), mức độ ưu tiên (`priority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT`) và gán người chịu trách nhiệm (`assignee`).
  2. Người dùng có thể tạo các công việc phụ một cấp (Subtasks).
  3. Người dùng kéo thả thẻ để thay đổi thứ tự trong cột hoặc di chuyển giữa các cột khác nhau.
  4. Hệ thống kiểm tra phiên bản đồng thời (**Optimistic Locking** qua thuộc tính `version`): nếu thẻ đã bị sửa đổi bởi người khác, trả về mã **HTTP 409 Conflict**.
  5. CSDL tự động kích hoạt Trigger tăng `content_version` trên bảng `boards`, làm mới bộ đệm dữ liệu.
- **Ngoại lệ:** Di chuyển thẻ vi phạm luật WIP (xem UC-09); gửi sai mã định danh cột hoặc task của tenant khác (bị RLS chặn ngay tại tầng dữ liệu).
- **Truy vết:** FR-40..46, K2, NFR-02.

---

### UC-08 — Thảo luận và Bình luận trên Thẻ
- **Tác nhân:** `ProjectManager`, `ProjectMember`; `ProjectViewer` (chỉ đọc).
- **Luồng chính:**
  1. Người dùng mở chi tiết thẻ và gửi nội dung bình luận (Comment).
  2. Hệ thống lưu bình luận vào CSDL, tự động gắn `tenant_id` của phiên hiện tại.
  3. Hệ thống phát sự kiện thông báo in-app tới người được gán việc (Assignee) và những người tham gia trao đổi.
  4. Tác giả có quyền chỉnh sửa hoặc xóa bình luận của mình; Quản lý dự án có quyền kiểm duyệt/xóa.
- **Truy vết:** FR-47, FR-60, K2.

---

### UC-09 — Tùy biến Quy trình làm việc và Thực thi Giới hạn WIP (K4 - Lớp 2)
- **Tác nhân:** Quản trị viên thuê bao (`TenantOwner` / `TenantAdmin`); Thành viên thao tác thẻ.
- **Luồng chính:**
  1. Quản trị viên truy cập mục **Cài đặt Workspace** và cấu hình chính sách WIP cho các cột đang xử lý:
     - Giá trị hạn mức (`wip_limit`, ví dụ: 2 thẻ).
     - Chế độ kiểm soát: `STRICT` (Nghiêm ngặt) hoặc `WARN` (Cảnh báo).
  2. Khi người dùng tạo hoặc kéo thả thẻ vào một cột đang xử lý:
     - **Nếu ở chế độ `STRICT`:** Nếu số lượng thẻ hiện tại đã đạt `wip_limit`, hệ thống khóa giao dịch (`SELECT ... FOR UPDATE`), chặn đứng thao tác và trả về mã **HTTP 422 Unprocessable Entity** kèm thông báo lỗi.
     - **Nếu ở chế độ `WARN`:** Hệ thống cho phép lưu thẻ thành công (HTTP 200/201), nhưng trả về cờ `wipWarning = true` để giao diện hiển thị cảnh báo trực quan cho người dùng.
- **Ngoại lệ:** Cột đầu tiên (Backlog) và cột hoàn tất (Completion Column) không bị áp dụng giới hạn WIP.
- **Truy vết:** FR-82, K4, NFR-05.

---

### UC-10 — Tùy biến Trường Dữ liệu Mở rộng dạng JSONB (K4 - Lớp 3)
- **Tác nhân:** `TenantOwner`, `TenantAdmin`, `ProjectMember`.
- **Luồng chính:**
  1. Quản trị viên định nghĩa danh mục các trường tùy chỉnh cho tổ chức của mình (ví dụ: Acme định nghĩa `story_points` kiểu NUMBER và `sprint` kiểu STRING; Lotus định nghĩa `channel` kiểu STRING và `budget_usd` kiểu NUMBER).
  2. Khi tạo hoặc chỉnh sửa thẻ, giao diện tự động kết xuất form nhập liệu động tương ứng.
  3. Người dùng nhập giá trị cho các trường tùy biến.
  4. Backend nhận dữ liệu, kiểm tra tính hợp lệ (kiểu dữ liệu, các trường bắt buộc `required`), sau đó đóng gói và lưu trực tiếp vào cột **`tasks.custom_data` (kiểu JSONB)**.
- **Ngoại lệ:** Nhập sai kiểu dữ liệu (ví dụ: nhập chữ vào trường NUMBER) hoặc gửi trường không có trong danh mục định nghĩa; server từ chối với mã **HTTP 422**.
- **Truy vết:** FR-85, K4, NFR-05.

---

### UC-11 — Quản lý Thương hiệu và Giao diện Thuê bao (K4 - Lớp 1)
- **Tác nhân:** `TenantOwner`, `TenantAdmin`.
- **Luồng chính:**
  1. Quản trị viên cập nhật màu sắc chủ đạo (`primary_color`), màu phụ trợ (`accent_color`) và tải lên logo của tổ chức.
  2. Quản trị viên lựa chọn mật độ hiển thị thẻ trên bảng Kanban:
     - `FULL`: Hiển thị đầy đủ nhãn, người phụ trách, hạn chót, tiến độ subtask và trường tùy biến.
     - `COMPACT`: Thu gọn tối đa thông tin thẻ để nhìn được bao quát nhiều công việc cùng lúc.
  3. Thay đổi được lưu vào CSDL và phát sự kiện qua Redis Pub/Sub; toàn bộ thành viên trong workspace ngay lập tức nhìn thấy giao diện mới sau khi tải lại.
- **Truy vết:** FR-80, K4, NFR-05.

---

### UC-12 — Nhắc hạn Công việc và Thông báo Đa kênh
- **Tác nhân:** Hệ thống (Tiến trình nền `DeadlineReminderWorker`); Người dùng.
- **Luồng chính:**
  1. Tiến trình nền định kỳ quét các thẻ công việc có hạn hoàn thành (`due_at`) trong vòng 24 giờ tới hoặc đã quá hạn mà chưa ở cột hoàn tất.
  2. Hệ thống kiểm tra sổ chống gửi trùng lặp (`task_deadline_reminders`), xác nhận người phụ trách và trạng thái kích hoạt của tenant.
  3. Hệ thống tạo thông báo In-App và đưa sự kiện vào hàng đợi gửi email thông báo (qua Mailpit/SMTP).
  4. Người dùng nhận thông báo trên thanh chuông giao diện hoặc qua hòm thư điện tử.
- **Truy vết:** FR-60..63.

---

### UC-13 — Quản trị Hệ thống và Vòng đời Thuê bao (ACTIVE / SUSPENDED)
- **Tác nhân:** Quản trị viên toàn cục (`SystemAdmin`).
- **Luồng chính:**
  1. Quản trị viên toàn cục đăng nhập trang quản trị trung tâm (`AdminPage`).
  2. Xem danh sách toàn bộ các tổ chức thuê bao, phân hạng gói, tình trạng hoạt động và tài khoản chủ sở hữu.
  3. Khi một tổ chức vi phạm chính sách hoặc hết hạn sử dụng, Quản trị viên chuyển trạng thái tổ chức sang `SUSPENDED`.
  4. **Ứng xử Fail-Closed:** Ngay lập tức, `TenantContextFilter` chặn toàn bộ mọi yêu cầu API gửi tới subdomain của tổ chức đó với mã **HTTP 403 Forbidden**. Các tiến trình nền tự động bỏ qua tenant này.
  5. Khi tổ chức được mở khóa lại (`ACTIVE`), quyền truy cập được phục hồi bình thường.
- **Truy vết:** FR-75, SEC-09, NFR-06.

---

### UC-14 — Đính kèm và Quản lý Tài nguyên Tệp (Resource Storage)
- **Tác nhân:** `ProjectManager`, `ProjectMember`.
- **Luồng chính:**
  1. Người dùng chọn tệp cần đính kèm vào thẻ công việc.
  2. Hệ thống kiểm tra dung lượng tệp và hạn mức lưu trữ còn lại của tổ chức (**Storage Quota**).
  3. Tệp được lưu trữ an toàn vào volume lưu trữ với định danh phân vùng dạng:
     `{tenant_id}/{resource_id}/{safe_file_name}`.
  4. Tạo bản ghi liên kết giữa tệp và thẻ công việc (`task_resources`).
  5. Khi tải tệp, hệ thống kiểm tra quyền truy cập dự án của người dùng và cấp đường dẫn tải an toàn (Signed URL).
- **Ngoại lệ:** Tệp vượt quá hạn mức dung lượng hoặc sai loại định dạng cho phép; hệ thống từ chối tải lên.
- **Truy vết:** FR-50..55, SEC-13.

---

## PHẦN 2. PHỤ LỤC: ĐẶC TẢ KỊCH BẢN ĐO KIỂM THỰC NGHIỆM (KB-1 ĐẾN KB-4)

> [!NOTE]
> Mục này tách biệt các kịch bản kiểm định phi chức năng (trước đây là UC-18) ra khỏi nhóm Use Case nghiệp vụ người dùng, tương ứng chính xác với **Chương 5 của Báo cáo khoa học `Report_v2.docx`**.

* **Kịch bản KB-1 (Định danh & Ngữ cảnh Luồng dưới Tải cao):**
  - Gửi yêu cầu thiếu JWT hoặc chữ ký không hợp lệ $\rightarrow$ Phải bị chặn 100% bằng HTTP 401.
  - Chạy tải đồng thời 80 tài khoản người dùng xen kẽ giữa các tenant $\rightarrow$ Đối soát `X-Tenant-ID` và nhãn nhật ký MDC phải khớp 100%, 0% bị rò rỉ ngữ cảnh ThreadLocal.
* **Kịch bản KB-2 (Cô lập Dữ liệu & Phòng thủ RLS Hai lớp):**
  - Tiêm lỗi câu lệnh SELECT bỏ sót hoàn toàn mệnh đề WHERE $\rightarrow$ RLS nhân PostgreSQL phải tự động chặn chéo, trả về 0 bản ghi ngoại lai.
  - Gửi yêu cầu đọc/sửa thẻ bằng UUID của tenant khác $\rightarrow$ Trả về HTTP 403 hoặc 404.
  - Mở giao dịch cố tình bỏ qua `SET LOCAL` $\rightarrow$ Trả về 0 dòng an toàn.
  - Đo chi phí độ trễ (overhead) của rào chắn RLS $\rightarrow$ Phải dưới 5% so với truy vấn thường.
* **Kịch bản KB-3 (Khống chế Láng giềng Ồn ào & Bộ nhớ Đệm Hai tầng):**
  - Tenant gây nhiễu (`t-aggressor`) bắn tải đột biến 168 RPS.
  - Bộ lọc Rate Limiting tại biên phải cắt cơn bão lưu lượng bằng **HTTP 429 Too Many Requests**.
  - Các tenant bình thường duy trì tỷ lệ thành công 100%, độ trễ trung vị p50 giảm từ 58ms xuống còn 4–15ms, tỷ lệ trúng đệm L1/L2 đạt mức cao.
* **Kịch bản KB-4 (Tùy biến Động Ba lớp & Đồng bộ Pub/Sub):**
  - Kiểm tra thực thi đúng luật WIP: Acme trả về 422 khi kéo thẻ thứ 3; Lotus cho phép lưu kèm cảnh báo UI.
  - Xác thực đúng trường JSONB và từ chối trường sai luật.
  - Đổi cấu hình ở Control Plane $\rightarrow$ Phát sự kiện xóa đệm L1 qua Redis Pub/Sub tức thời trong ~2.45 ms.
