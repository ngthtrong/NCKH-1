# TIÊU CHUẨN HÓA THUẬT NGỮ TIẾNG ANH - TIẾNG VIỆT
## Đề tài: Xây dựng ứng dụng quản lý công việc theo kiến trúc đa thuê bao (Multi-Tenant)

Tài liệu này chuẩn hóa việc dịch thuật và sử dụng các thuật ngữ chuyên ngành Anh - Việt trong hồ sơ thuyết minh đề tài nghiên cứu khoa học [thuyet_minh_SaaS.md](file:///home/ngthtrong/NCKH-1/thuyet_minh_SaaS.md) và các tài liệu kỹ thuật liên quan (báo cáo, đặc tả, slide, nhật ký thực nghiệm).

---

## 1. Nguyên Tắc Sử Dụng Thuật Ngữ Chung

> [!IMPORTANT]
> **Quy tắc nhất quán:**
> 1. **Ưu tiên tiếng Việt:** Luôn sử dụng thuật ngữ tiếng Việt đã được thống nhất bên dưới trong toàn bộ văn bản chính thức của thuyết minh đề tài.
> 2. **Chú thích từ gốc:** Đối với lần xuất hiện đầu tiên của thuật ngữ chuyên ngành sâu hoặc dễ gây hiểu nhầm, viết thuật ngữ tiếng Việt trước, theo sau là tiếng Anh trong dấu ngoặc đơn. 
>    *Ví dụ: *Kiến trúc đa thuê bao (Multi-tenancy)*, *Cô lập dữ liệu (Data Isolation)*.
> 3. **Giữ nguyên viết tắt chuẩn quốc tế:** Giữ nguyên các từ viết tắt công nghệ phổ biến như: *SaaS, CSDL, API, CRUD, IDOR, VPS, ERD, UX, Web, Cloud*.
> 4. **Tránh lạm dụng từ mượn tiếng Anh trực tiếp** trong câu văn hành chính trừ khi không có từ dịch nghĩa tương đương.

---

## 2. Bảng Chuẩn Hóa Thuật Ngữ Chi Tiết

### 2.1. Kiến Trúc Hệ Thống & Mô Hình SaaS

| Thuật ngữ Tiếng Anh | Thuật ngữ Tiếng Việt | Chú thích & Ngữ cảnh áp dụng |
| :--- | :--- | :--- |
| **Software as a Service (SaaS)** | Phần mềm dưới dạng dịch vụ | Mô hình phân phối phần mềm qua đám mây. |
| **Multi-tenancy / Multi-tenant** | Kiến trúc đa thuê bao / Đa thuê bao | Một bản cài đặt phục vụ nhiều khách hàng độc lập. |
| **Single-tenancy / Single-tenant** | Kiến trúc đơn thuê bao / Đơn thuê bao | Mỗi khách hàng sử dụng một bản cài đặt/hạ tầng riêng. |
| **Tenant** | Thuê bao | Đại diện cho một nhóm người dùng (tổ chức, lớp học) dùng chung tài nguyên được cô lập. Tránh dịch là "người thuê". |
| **Workspace** | Không gian làm việc | Giao diện/phân vùng làm việc thực tế của một Tenant ở tầng ứng dụng. |
| **Tenant Resolution** | Nhận diện thuê bao / Xác định thuê bao | Cơ chế nhận diện request thuộc về Tenant nào (qua subdomain, domain, headers...). |
| **Tenant Router / Routing** | Điều hướng thuê bao | Định tuyến yêu cầu truy cập đến đúng tài nguyên của Tenant. |
| **Single Instance** | Phiên bản đơn / Bản cài đặt duy nhất | Một tiến trình ứng dụng chạy duy nhất phục vụ toàn bộ hệ thống. |
| **Shared Resources** | Tài nguyên chia sẻ | Hạ tầng phần cứng, mạng, CPU, RAM dùng chung giữa các thuê bao. |
| **Cloud Computing** | Điện toán đám mây | Hạ tầng máy chủ ảo hóa cung cấp qua Internet. |

### 2.2. Chiến Lược Cơ Sở Dữ Liệu (Database Strategies)

| Thuật ngữ Tiếng Anh | Thuật ngữ Tiếng Việt | Chú thích & Ngữ cảnh áp dụng |
| :--- | :--- | :--- |
| **Data Isolation** | Cô lập dữ liệu / Cách ly dữ liệu | Đảm bảo Tenant này không đọc/ghi được dữ liệu Tenant khác. |
| **Shared Database, Shared Schema** | Dùng chung CSDL, dùng chung Lược đồ | Các Tenant lưu chung một CSDL và chung các bảng. |
| **Shared Database, Separate Schema** | Dùng chung CSDL, Lược đồ riêng | Các Tenant chung CSDL nhưng bảng/schema vật lý tách biệt. |
| **Separate Database** | Cơ sở dữ liệu riêng biệt | Mỗi Tenant sở hữu một database vật lý riêng. |
| **Discriminator Column** | Cột phân biệt / Cột định danh | Cột chứa ID định danh của Tenant (thường là `TenantID` hoặc `tenant_id`) trong bảng CSDL dùng chung. |
| **Global Query Filter** | Bộ lọc truy vấn toàn cục | Cơ chế tự động thêm điều kiện lọc theo `TenantID` vào mọi câu lệnh truy vấn dữ liệu từ Backend. |
| **Database Migration** | Di chuyển/Cập nhật lược đồ CSDL | Quá trình đồng bộ cấu trúc bảng khi có thay đổi mã nguồn. |

### 2.3. Nghiệp Vụ Quản Lý Công Việc & Kanban

| Thuật ngữ Tiếng Anh | Thuật ngữ Tiếng Việt | Chú thích & Ngữ cảnh áp dụng |
| :--- | :--- | :--- |
| **Task Management** | Quản lý công việc | Tên nghiệp vụ cốt lõi của đề tài. |
| **Workflow** | Quy trình công việc / Luồng công việc | Các bước xử lý công việc từ khi bắt đầu đến hoàn thành. |
| **Board** | Bảng công việc | Không gian quản lý dự án trực quan theo mô hình Kanban. |
| **List / Column** | Danh sách / Cột trạng thái | Các cột trên bảng đại diện cho các trạng thái công việc (Ví dụ: Cần làm, Đang làm, Hoàn thành). |
| **Task / Card** | Thẻ công việc / Công việc | Phần tử nhỏ nhất biểu diễn một đầu việc cụ thể cần thực hiện. |
| **Drag & Drop** | Kéo và thả / Kéo - thả | Thao tác tương tác dịch chuyển thẻ công việc giữa các cột. |
| **Due Date / Deadline** | Hạn hoàn thành / Thời hạn | Ngày giờ yêu cầu phải hoàn thành công việc. |
| **Progress Tracking** | Theo dõi tiến độ | Giám sát trạng thái hoàn thành công việc của cá nhân hoặc nhóm. |
| **State Consistency / Synchronization** | Nhất quán trạng thái / Đồng bộ trạng thái | Đảm bảo tính chính xác của dữ liệu trạng thái công việc giữa các bên sử dụng. |

### 2.4. Bảo Mật & Phân Quyền (Security & Access Control)

| Thuật ngữ Tiếng Anh | Thuật ngữ Tiếng Việt | Chú thích & Ngữ cảnh áp dụng |
| :--- | :--- | :--- |
| **Authentication (AuthN)** | Xác thực | Quá trình xác minh danh tính người dùng (đăng nhập). |
| **Authorization (AuthZ)** | Phân quyền | Quá trình kiểm tra quyền hạn thực hiện hành vi. |
| **Role-Based Access Control (RBAC)**| Kiểm soát truy cập dựa trên vai trò | Cơ chế phân quyền dựa vào chức danh/vai trò. |
| **Tenant Administrator (Admin)** | Quản trị viên thuê bao | Người sở hữu cao nhất của một Không gian làm việc/Tenant. |
| **Member** | Thành viên | Người tham gia vào Không gian làm việc do Admin mời. |
| **Insecure Direct Object References (IDOR)** | Lỗ hổng tham chiếu đối tượng gián tiếp | Lỗ hổng bảo mật cho phép truy cập chéo dữ liệu thông qua ID của đối tượng. |
| **Data Leakage** | Rò rỉ dữ liệu | Sự cố dữ liệu của Tenant này bị lộ sang Tenant khác. |

### 2.5. Kỹ Thuật Phần Mềm & Quy Trình Phát Triển

| Thuật ngữ Tiếng Anh | Thuật ngữ Tiếng Việt | Chú thích & Ngữ cảnh áp dụng |
| :--- | :--- | :--- |
| **Agile Software Development** | Phát triển phần mềm linh hoạt | Phương pháp phát triển lặp và cải tiến liên tục. |
| **Backend API** | Giao diện lập trình ứng dụng phía máy chủ | Đầu nối xử lý dữ liệu và logic nghiệp vụ. |
| **Frontend SPA (Single Page App)** | Ứng dụng trang đơn phía máy khách | Giao diện người dùng chạy hoàn toàn trên trình duyệt. |
| **Middleware** | Phần mềm trung gian | Các lớp xử lý chặn giữa luồng Request-Response (ví dụ để lọc Tenant). |
| **Base Repository** | Lớp mẫu lưu trữ cơ sở | Lớp trừu tượng hóa việc truy vấn cơ sở dữ liệu. |
| **CRUD (Create, Read, Update, Delete)** | Thêm, đọc, sửa, xóa | Các thao tác cơ bản đối với dữ liệu. |
| **Use Case** | Trường hợp sử dụng | Đặc tả hành vi tương tác giữa tác nhân và hệ thống. |
| **Entity Relationship Diagram (ERD)** | Sơ đồ quan hệ thực thể | Bản vẽ mô tả thiết kế cơ sở dữ liệu. |
| **System Performance** | Hiệu năng hệ thống | Tốc độ phản hồi, tải lượng của phần mềm. |
| **Quality of Service (QoS)** | Chất lượng dịch vụ | Chỉ số đánh giá mức độ ổn định và đáp ứng dịch vụ. |
| **Load Balancing** | Cân bằng tải | Cơ chế phân phối đều lưu lượng truy cập tới máy chủ. |
| **Resource Allocation / Provisioning** | Phân bổ tài nguyên / Cấp phát tài nguyên | Quá trình cấp phát CPU/RAM/ổ cứng cho Tenant. |

---

## 3. Bản Đồ Ánh Xạ Câu Thực Tế Trong Thuyết Minh

Để dễ dàng áp dụng, dưới đây là một số câu thực tế được chuẩn hóa cấu trúc:

*   **Chưa chuẩn hóa:** *Chúng ta dùng chiến lược Shared DB, Shared Schema để cách ly tenant bằng TenantID.*
*   **Đã chuẩn hóa:** *Đề tài áp dụng chiến lược dùng chung Cơ sở dữ liệu và dùng chung Lược đồ (Shared Database, Shared Schema) để cô lập dữ liệu giữa các thuê bao bằng cột định danh (`TenantID`).*
*   **Chưa chuẩn hóa:** *Hệ thống dùng middleware để resolve tenant qua subdomain.*
*   **Đã chuẩn hóa:** *Hệ thống tích hợp phần mềm trung gian (Middleware) để tự động nhận diện thuê bao (Tenant Resolution) thông qua tên miền con (Subdomain).*
*   **Chưa chuẩn hóa:** *User drag drop các task trên board để update status.*
*   **Đã chuẩn hóa:** *Thành viên thực hiện thao tác kéo và thả các thẻ công việc trên bảng Kanban để cập nhật trạng thái.*

---

> [!TIP]
> Hãy định kỳ cập nhật thêm các từ khóa mới phát sinh trong quá trình xây dựng dự án vào tài liệu này để toàn bộ 5 thành viên trong nhóm nghiên cứu luôn lập trình và viết báo cáo một cách đồng bộ nhất.
