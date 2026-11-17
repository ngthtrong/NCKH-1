
# TÀI LIỆU 01: PHÂN TÍCH NGHIỆP VỤ, ĐỐI TƯỢNG SỬ DỤNG VÀ QUY HOẠCH DỊCH VỤ SAAS KANBAN (CẤP ĐỘ 3)

> **Căn cứ thiết kế:** Chương 4 (Mục 4.1, 4.2.1, 4.2.2) — Báo cáo tổng kết đề tài NCKH Sinh viên `THS2026-67`.
> **Phương pháp luận chủ đạo:** Tiếp cận Ngoài–Vào định hướng thị trường (*Market-Driven Outside-In*) kết hợp suy dẫn ngược vào kiến trúc **Pool Cấp độ 3** (*Chong & Carraro, 2006*).

---

## 1. Mục đích Hệ thống và Triết lý Thiết kế

### 1.1. Mục đích cốt lõi của ứng dụng

Xây dựng nền tảng quản lý công việc trực quan theo phương pháp **Kanban** dưới dạng dịch vụ đám mây (**SaaS**) phục vụ đồng thời nhiều tổ chức thuê bao độc lập (các doanh nghiệp vừa và nhỏ, phòng ban chuyên môn, nhóm nghiên cứu hoặc nhóm đồ án trong môi trường đại học) trên **một bộ mã nguồn duy nhất (*Single Codebase*)** và **một thể hiện hệ thống dùng chung toàn phần (*Full-Stack Pool*)**.

### 1.2. Quy trình thiết kế 4 bước theo phương pháp Ngoài–Vào (Outside-In)

1. **Bước 1 — Khảo sát nhu cầu thị trường:** Phân tích sự khác biệt về văn hóa quản trị, quy trình luân chuyển công việc và cấu trúc thông tin của các nhóm tổ chức đối lập.
2. **Bước 2 — Quy nạp thành Mô hình Dịch vụ Tùy biến 3 Lớp:** Chuẩn hóa mọi nhu cầu biến thiên thành siêu dữ liệu cấu hình (*Metadata*) ở 3 lớp: Giao diện nhận diện (Lớp 1), Quy trình & Luật WIP (Lớp 2), và Trường dữ liệu mở rộng (Lớp 3).
3. **Bước 3 — Phân rã chức năng trên Hai Mặt phẳng Kiến trúc:** Tách biệt nhóm chức năng quản trị vòng đời/cấu hình thuê bao (**Mặt phẳng Điều khiển — Control Plane**) khỏi nhóm chức năng thực thi nghiệp vụ Kanban tần suất cao (**Mặt phẳng Dữ liệu — Data Plane**).
4. **Bước 4 — Ánh xạ vào cơ chế kiểm soát đa thuê bao (`K1`–`K4`):** Thiết lập 6 chỉ tiêu phi chức năng (`NFR-01` đến `NFR-06`) để bảo đảm cô lập dữ liệu, chống hàng xóm ồn ào và đồng bộ cấu hình tức thời.

---

## 2. Phân tích Đối tượng Sử dụng và Chân dung Thuê bao Điển hình (Customer Personas)

### 2.1. Hai chân dung tổ chức thuê bao đối lập (Dùng làm chuẩn thiết kế & đối chứng)

| Tiêu chí phân tích                         | Chân dung 1: **Acme Software (`t-acme`)**                                                                                                                                                                                                   | Chân dung 2: **Lotus Media (`t-lotus`)**                                                                                                                                                                                                  |
| :--------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Đặc trưng ngành nghề**            | Doanh nghiệp phát triển phần mềm vận hành theo quy trình Agile/Scrum kết hợp Kanban kỷ luật cao.                                                                                                                                         | Đơn vị sản xuất nội dung truyền thông và tiếp thị kỹ thuật số với nhịp độ biến động nhanh theo sự kiện.                                                                                                                     |
| **Lớp 1: Giao diện & Nhận diện**     | Màu chủ đạo **Xanh dương kỹ thuật (`#1D4ED8`)**; chế độ hiển thị thẻ **Đầy đủ (`FULL`)**.                                                                                                                          | Màu chủ đạo **Cam / Hổ phách (`#B45309`)**; chế độ hiển thị thẻ **Thu gọn (`COMPACT`)**.                                                                                                                              |
| **Lớp 2: Cấu trúc cột mặc định**  | 4 giai đoạn: `Backlog` -> `In-Development` -> `Code Review` -> `Done`.                                                                                                                                                                     | 3 giai đoạn: `Ideas` -> `Producing` -> `Published`.                                                                                                                                                                                        |
| **Lớp 2: Chính sách giới hạn WIP**  | **Chế độ Chặn cứng (`STRICT`):** Khi cột đích chạm trần `wip_limit` (VD: `2/2` hoặc `3/3` thẻ), từ chối thao tác kéo thẻ mới vào cột với mã **HTTP 422**, hoàn trả thẻ về cột cũ và báo lỗi đỏ. | **Chế độ Cảnh báo mềm (`WARN`):** Khi cột đích vượt `wip_limit` (VD: `3/2` thẻ), vẫn chấp nhận lưu vị trí mới (**HTTP 200** kèm `wipWarning = true`) và bật cảnh báo màu vàng trên tiêu đề cột. |
| **Lớp 3: Trường dữ liệu mở rộng** | • `story_points` (Số nguyên — bắt buộc: điểm nỗ lực).• `sprint` (Chuỗi / Lựa chọn: chu kỳ phát triển).                                                                                                                          | • `channel` (Lựa chọn: `TikTok`, `Facebook`, `YouTube`, `Báo chí`, `Web`).• `budget_usd` (Số thực: ngân sách dự kiến).                                                                                                   |

### 2.2. Phân rã Tác nhân và Mô hình Phân quyền Hai tầng (RBAC)

Hệ thống thiết lập cơ chế kiểm soát truy cập dựa trên vai trò (**RBAC**) ở hai cấp độ: **Cấp độ Nền tảng** và **Cấp độ Không gian làm việc của Thuê bao (`tenant_id`)**:

1. **Quản trị viên Hệ thống (`System Administrator` — Tác nhân Mặt phẳng Điều khiển):**
   - Nhân sự vận hành của nhà cung cấp dịch vụ SaaS.
   - Quyền hạn: Khởi tạo hoặc phê duyệt thuê bao mới; cấp phát định danh (`UUID`, `slug`); thiết lập gói dịch vụ (`Tier`: `Free`, `Pro`, `Enterprise`) gắn với hạn mức lưu lượng `Rate Limit`; giám sát chỉ số tiêu thụ tài nguyên theo từng thuê bao; tạm khóa (`SUSPENDED`) hoặc kích hoạt lại (`ACTIVE`) tổ chức thuê bao.
2. **Quản trị viên Không gian làm việc Thuê bao (`Tenant Administrator / Workspace Owner`):**
   - Đại diện quản lý của từng tổ chức khách hàng (VD: Giám đốc dự án tại `Acme Software` hoặc Trưởng phòng truyền thông tại `Lotus Media`).
   - Quyền hạn chỉ có hiệu lực bên trong ranh giới `tenant_id` của tổ chức mình:
     - Cấu hình Lớp 1 (màu sắc chủ đạo `theme_color`, biểu trưng, chế độ hiển thị thẻ).
     - Cấu hình Lớp 2 (tạo bảng Kanban, thiết lập cột trạng thái, đặt ngưỡng `wip_limit` và chọn chế độ `STRICT` hoặc `WARN`).
     - Cấu hình Lớp 3 (định nghĩa danh mục trường dữ liệu tùy biến mở rộng trong `tenants.settings`).
     - Quản lý thành viên: Mời thành viên mới qua email vào không gian làm việc và gán vai trò (`ADMIN` hoặc `MEMBER`).
     - Kế thừa toàn bộ quyền thao tác công việc trên bảng Kanban của `Project Member`.
3. **Thành viên Dự án (`Project Member`):**
   - Kỹ sư, nhân viên nội dung, giảng viên hoặc sinh viên làm việc hàng ngày trên bảng Kanban.
   - Hỗ trợ **Đa không gian làm việc (*Multi-Workspace Membership*)**: Một người dùng (định danh qua email) có thể đồng thời là thành viên của nhiều tổ chức thuê bao khác nhau với vai trò độc lập.
   - Quyền hạn trong phạm vi `tenant_id` đang chọn: Xem bảng Kanban, tạo/cập nhật thẻ công việc, nhập giá trị trường chuẩn và trường mở rộng, kéo–thả thẻ giữa các cột trạng thái (tuân thủ luật WIP của tổ chức), bình luận, đính kèm tài nguyên và tìm kiếm/lọc thẻ.

---

## 3. Quy hoạch Chức năng trên Hai Mặt phẳng và Đặc tả 10 Ca Sử dụng (Use Cases)

### 3.1. Cụm Ca sử dụng Mặt phẳng Điều khiển (Control Plane — `UC01` đến `UC05`)

* **`UC01` — Khởi tạo và Quản trị Vòng đời Thuê bao (*Tenant Onboarding & Lifecycle Management*):**
  - *Tác nhân:* `System Admin`.
  - *Luồng xử lý:* Đăng ký tổ chức mới -> Sinh mã `UUID` và đường dẫn định danh `slug` duy nhất -> Khởi tạo bản ghi trong bảng `tenants` kèm bộ cấu hình mặc định 3 lớp trong cột `settings` (`JSONB`) -> Gán gói dịch vụ (`Tier`) và trạng thái hoạt động (`ACTIVE`) trong một giao dịch nguyên tử.
* **`UC02` — Đăng nhập và Chuyển đổi Không gian Làm việc (*Workspace Switching & Context-Aware Token Issuance*):**
  - *Tác nhân:* `Tenant Admin`, `Project Member`.
  - *Luồng xử lý:* Người dùng xác thực tài khoản và chọn tổ chức làm việc mong muốn trên màn hình `Workspace Selector` -> Máy chủ kiểm chứng tư cách thành viên trong bảng `tenant_users` -> Ký và cấp thẻ bài `JWT` (`HMAC-SHA256`) đóng gói cứng `sub` (`user_id`), `tenant_id` và `role`.
* **`UC03` — Cấu hình Nhận diện Thương hiệu và Chính sách Vận hành WIP (*Branding & WIP Policy Configuration*):**
  - *Tác nhân:* `Tenant Admin`.
  - *Luồng xử lý:* Cập nhật bảng màu `theme_color`, mật độ thẻ (`FULL`/`COMPACT`), mẫu cột mặc định và chế độ kiểm soát WIP (`STRICT`/`WARN`) vào cột `tenants.settings` -> Xóa khóa đệm `tenant:{tenant_id}:config` trên `Redis L2` -> Phát sự kiện qua kênh `Redis Pub/Sub` để thu hồi đệm `Caffeine L1` trên toàn cụm ứng dụng.
* **`UC04` — Khai báo và Quản lý Trường Dữ liệu Mở rộng (*Custom Fields Definition*):**
  - *Tác nhân:* `Tenant Admin`.
  - *Luồng xử lý:* Thêm/sửa định nghĩa các thuộc tính động (như `story_points`, `sprint`, `channel`, `budget_usd` gồm kiểu dữ liệu, cờ bắt buộc và miền giá trị) vào siêu dữ liệu `tenants.settings` mà không can thiệp cấu trúc bảng vật lý.
* **`UC05` — Quản lý và Phân quyền Thành viên Tổ chức (*Tenant Membership & RBAC Management*):**
  - *Tác nhân:* `Tenant Admin`.
  - *Luồng xử lý:* Mời thành viên theo email vào không gian làm việc của thuê bao, gán vai trò `ADMIN` hoặc `MEMBER` trong bảng `tenant_users` (đảm bảo ràng buộc duy nhất `UNIQUE(tenant_id, email)`).

### 3.2. Cụm Ca sử dụng Mặt phẳng Dữ liệu (Data Plane — `UC06` đến `UC10`)

* **`UC06` — Quản trị Dự án và Bảng Công việc (*Project & Kanban Board Management*):**
  - *Tác nhân:* `Tenant Admin`, `Project Member`.
  - *Luồng xử lý:* Tạo bảng Kanban mới (nếu không truyền danh sách cột thủ công, hệ thống tự động đọc mẫu cột mặc định Lớp 2 của thuê bao để sinh các cột tương ứng trong `board_columns`), đổi tên bảng, truy xuất chi tiết bảng qua khóa đệm `tenant:{tenant_id}:board:{board_id}`.
* **`UC07` — Cấu hình Cột Trạng thái và Hạn mức WIP Cột (*Column & WIP Limit Configuration*):**
  - *Tác nhân:* `Tenant Admin`.
  - *Luồng xử lý:* Thêm cột mới, đổi tiêu đề cột (`title`), sắp xếp thứ tự hiển thị (`position`) và thiết lập chỉ số giới hạn số thẻ tối đa (`wip_limit`) cho từng cột trên bảng Kanban.
* **`UC08` — Khởi tạo và Cập nhật Thẻ Công việc kèm Trường Mở rộng (*Card Management with Custom Fields*):**
  - *Tác nhân:* `Project Member`, `Tenant Admin`.
  - *Quan hệ bắt buộc:* `<<include>>` **Kiểm định trường động theo lược đồ JSONB Lớp 3**.
  - *Luồng xử lý:* Người dùng nhập thông tin thẻ chuẩn (`title`, `priority`, `due_date`) và các trường mở rộng (`custom_fields`) -> Động cơ siêu dữ liệu nạp lược đồ Lớp 3 của `tenant_id` hiện hành để kiểm tra kiểu dữ liệu và cờ bắt buộc (từ chối với **HTTP 422** nếu thiếu trường bắt buộc hoặc sai kiểu) -> Lưu bản ghi vào bảng `cards` dưới sự giám sát của `FORCE RLS`.
* **`UC09` — Kéo–Thả Thẻ Chuyển Cột dưới Sự Kiểm soát của Luật WIP (*Drag-and-Drop Card Movement with WIP Enforcement*):**
  - *Tác nhân:* `Project Member`, `Tenant Admin`.
  - *Quan hệ bắt buộc:* `<<include>>` **Động cơ đánh giá quy tắc WIP động**.
  - *Luồng xử lý:* Khi kéo thẻ sang cột đích, `KanbanService` đọc `wip_mode` của thuê bao và đếm số thẻ hiện có tại cột đích so với `wip_limit`:
    - Nếu số thẻ sau khi chuyển vượt `wip_limit` và `wip_mode == STRICT`: Chặn cứng giao dịch, trả về mã lỗi **HTTP 422 (Unprocessable Entity)**, giữ nguyên vị trí thẻ cũ.
    - Nếu số thẻ vượt `wip_limit` và `wip_mode == WARN`: Cho phép cập nhật `column_id` và `position` mới vào CSDL, trả về **HTTP 200 OK** kèm cờ `wipWarning = true`.
* **`UC10` — Bình luận, Đính kèm Tài nguyên và Truy vấn Lọc Thẻ (*Card Collaboration & Query Filtering*):**
  - *Tác nhân:* `Project Member`, `Tenant Admin`.
  - *Luồng xử lý:* Tìm kiếm và lọc thẻ công việc theo nhiều tiêu chí kết hợp (`column_id`, `priority`, `due_date`, và cặp khóa–giá trị bên trong cột `custom_fields` thông qua chỉ mục `GIN`) trong phạm vi dữ liệu cô lập của thuê bao.

---

## 4. Đặc tả Sáu Yêu cầu Phi chức năng (Non-Functional Requirements)

| Mã NFR              |         Khía cạnh ánh xạ         | Nội dung yêu cầu và Ngưỡng nghiệm thu định lượng                                                                                                                                                                                                                                                                                                                          |
| :------------------- | :----------------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`NFR-01`** |  `K1` (Định danh & Ngữ cảnh)  | **Toàn vẹn định danh và ngữ cảnh luồng:** Chặn `100%` yêu cầu thiếu/sai chữ ký JWT (`HTTP 401`) hoặc lệch tiêu đề `Host` (`HTTP 403`); `0%` rò rỉ hoặc lẫn lộn ngữ cảnh `ThreadLocal` khi tái sử dụng luồng trong `Thread Pool`.                                                                                                   |
| **`NFR-02`** |     `K2` (Cô lập dữ liệu)     | **Cô lập dữ liệu cấp dòng theo nguyên tắc Đóng an toàn (*Fail-Closed*):** Bảo đảm `0` bản ghi rò rỉ chéo giữa các thuê bao trên bảng dùng chung ngay cả khi câu truy vấn tầng ứng dụng bỏ sót mệnh đề `WHERE`, bị tấn công đoán `UUID` (`IDOR`), hoặc thiếu biến phiên `SET LOCAL` (mặc định trả về `0` dòng). |
| **`NFR-03`** | `K2` & `K3` (Chi phí bảo mật) | **Chi phí hiệu năng của rào chắn bảo mật thấp:** Độ trễ gia tăng do cơ chế `FORCE RLS` và thiết lập biến phiên `SET LOCAL` duy trì dưới **`5%`** trong tổng thời gian xử lý yêu cầu nhờ hệ thống chỉ mục tổ hợp dẫn đầu bởi `tenant_id`.                                                                                 |
| **`NFR-04`** |    `K3` (Cô lập hiệu năng)    | **Kháng hiện tượng hàng xóm ồn ào (*Noisy Neighbor*):** Khi một thuê bao phát sinh lưu lượng đột biến vượt định mức, bộ lọc biên cắt tải dư thừa bằng mã `HTTP 429`; các thuê bao bình thường vẫn duy trì độ trễ ổn định và tỷ lệ trúng bộ đệm cao.                                                                     |
| **`NFR-05`** |      `K4` (Tùy biến động)      | **Thực thi tùy biến động ba lớp không cần khởi động lại:** Áp dụng tức thời sự khác biệt về giao diện (Lớp 1), chính sách WIP `STRICT`/`WARN` (Lớp 2) và trường mở rộng `JSONB` (Lớp 3) giữa các thuê bao trên cùng một bộ mã nguồn.                                                                                             |
| **`NFR-06`** |    `K4` (Đồng bộ cấu hình)    | **Đồng bộ cấu hình phân tán tức thời:** Độ trễ từ lúc quản trị viên thuê bao lưu cấu hình mới đến khi các tiến trình ứng dụng thu hồi bản sao cũ trên bộ đệm `L1 Caffeine` qua kênh `Redis Pub/Sub` duy trì ở mức vài chục mili-giây (`< 50 ms`).                                                                             |
