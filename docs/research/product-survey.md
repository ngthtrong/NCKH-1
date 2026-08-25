# Khảo sát hệ thống SaaS thực tế

**Ngày truy cập nguồn:** 2026-08-25  
**Nguyên tắc:** chỉ ghi điều được tài liệu chính thức công bố. Ô “Không công bố” không có nghĩa sản phẩm không hỗ trợ; chỉ có nghĩa nguồn khảo sát không đủ để kết luận.

## 1. Nguồn khảo sát

- [MISA AMIS Công Việc — Bảng Kanban](https://helpamis.misa.vn/amis-cong-viec/kb/quan-ly-cong-viec-dang-bang/)
- [Base Wework — Phân quyền thao tác](https://help.base.vn/support/solutions/articles/63000273353-base-wework-ph%C3%A2n-quy%E1%BB%81n-thao-t%C3%A1c-trong-wework)
- [KiotViet — Quản lý người dùng](https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-thiet-lap/quan-ly-nguoi-dung/)
- [Atlassian Jira Cloud — Configure a space/project](https://support.atlassian.com/jira-cloud-administration/docs/configure-a-project/)
- [Salesforce — Platform Multitenant Architecture](https://architect.salesforce.com/docs/architect/fundamentals/guide/platform-multitenant-architecture.html)

## 2. Ma trận đối sánh

| Chiều | MISA AMIS | Base Wework | KiotViet | Jira Cloud | Salesforce |
| --- | --- | --- | --- | --- | --- |
| Phạm vi tổ chức | Dự án/nhóm được nhắc trong hướng dẫn | Dự án/phòng ban | Gian hàng/chi nhánh | Space/project | Org là tenant |
| Quan hệ user–scope | Danh sách người được giao việc trong dự án/nhóm | User có vai trò theo từng dự án | Một user có quyền ở nhiều chi nhánh; một role/chi nhánh | Cùng user có thể giữ role khác ở space khác | Nguồn kiến trúc tập trung OrgID, không mô tả workflow membership |
| Vai trò | Hướng dẫn yêu cầu “toàn quyền” cho cấu hình hiển thị | Project manager, member, follower, guest; App Admin không tự có quyền setup project | Role có sẵn/tùy chỉnh theo chi nhánh | Space roles tham gia permission/notification/security schemes | Không khảo sát từ nguồn này |
| Kanban | Có cột trạng thái, thẻ, kéo thả, thu gọn, màu và automation | Không dùng nguồn này để kết luận | Ngoài miền công việc | Jira quản lý work items/project; nguồn trang cấu hình không đủ mô tả board | Ngoài miền Kanban |
| Hạn/người thực hiện | Hiển thị hạn, quá hạn, tiến độ và người thực hiện | Không đủ trong nguồn đã chọn | Ngoài miền | Default assignee, versions/release date; source có notification event | Ngoài miền |
| Phân quyền chi tiết | Một số chức năng cần vai trò toàn quyền | Quyền theo vị trí trong project; App Admin khác project role | Role có tập quyền tùy chỉnh; thay quyền khiến user đăng xuất | Permission scheme xác định ai xem/thay đổi work item; item security điều khiển visibility | Kernel dùng OrgID để giữ riêng hoạt động org |
| Thông báo | Không đủ từ nguồn Kanban đã chọn | Không đủ từ nguồn quyền đã chọn | Có mục cài đặt notification nhưng chưa trích bằng chứng chi tiết | Notification scheme chọn user/group/role nhận email theo event | Không khảo sát từ nguồn này |
| Audit/history | Không đủ để kết luận | Không đủ để kết luận | Tài liệu nói theo dõi lịch sử thao tác và giữ giao dịch lịch sử khi xóa user | Không đủ từ trang đã chọn | Không đủ từ nguồn kiến trúc đã chọn |
| Onboarding/tier/payment | Không công bố trong nguồn đã chọn | Không công bố | Không công bố | Không công bố | Không công bố trong nguồn đã chọn |
| Kiến trúc isolation | Không công bố | Không công bố | Không công bố | Không công bố | Shared multitenant DB/schema; bản ghi org-specific có OrgID; kernel dùng OrgID khi truy cập |

## 3. Bằng chứng và yêu cầu rút ra

### MISA AMIS Công Việc

Tài liệu mô tả thêm công việc/cột, di chuyển thẻ giữa cột để đổi trạng thái, hiển thị hạn bằng màu và lọc theo người thực hiện. Điều này hỗ trợ baseline `Board → Column → Task`, reorder/drag-drop, due date và assignee (`FR-30..FR-44`). Automation theo cột có tồn tại ở MISA nhưng bị loại khỏi v1 vì không phục vụ trực tiếp câu hỏi kiến trúc.

### Base Wework

Base công bố các vai trò trong từng dự án và ghi App Admin không tự có quyền chỉnh sửa/setup project; khi App Admin là thành viên project thì quyền phụ thuộc cấu hình project. Bài học áp dụng là tách role tenant khỏi `ProjectMembership`, không cho `TenantAdmin` mặc nhiên đọc nội dung mọi project (`FR-20..FR-25`, `SEC-05`).

### KiotViet

Tài liệu ghi một user có thể được phân quyền trên nhiều chi nhánh, nhưng tại một chi nhánh chỉ giữ một role; role có thể tùy chỉnh và việc đổi quyền làm user đăng xuất để áp dụng. Bài học áp dụng là membership có scope rõ, một role tenant tại một thời điểm, và thu hồi/đổi membership phải làm token cũ mất hiệu lực (`FR-10..FR-16`, `SEC-08`). Không ánh xạ “chi nhánh” thành tenant như một khẳng định về kiến trúc KiotViet.

### Jira Cloud

Jira phân biệt space roles, permission scheme, work-item security scheme và notification scheme. Bài học áp dụng là quyền project và người nhận notification phải được mô hình hóa/kiểm thử riêng; role chỉ là đầu vào policy chứ không phải kiểm tra UI (`FR-20..FR-25`, `FR-60..FR-62`). Các cơ chế workflow/version/component nâng cao bị loại khỏi v1.

### Salesforce

Salesforce công khai shared database/schema và `OrgID` trên bản ghi tenant-specific. Đây là đối chứng cho shared-schema Pool có tenant discriminator bắt buộc và enforcement tập trung (`DATA-02`, `ARC-04`). Không suy ra code, RLS hay topology hạ tầng riêng của Salesforce ngoài nội dung được công bố.

## 4. Quyết định phạm vi sản phẩm

### Học hỏi và đưa vào v1

- Board Kanban có cột, sắp xếp, kéo thả task.
- Task có assignee, due date, trạng thái/column, subtask một cấp và comment.
- User tham gia nhiều tenant; role tenant và project tách nhau.
- Permission được kiểm tra server-side; thay đổi membership làm quyền cũ mất hiệu lực.
- Notification theo event với preference; audit cho thay đổi quan trọng.

### Chủ động loại khỏi v1

- Automation/workflow engine theo cột, custom fields, reporting nâng cao.
- Permission scheme tùy biến bởi khách hàng và item-level security phức tạp.
- Metadata-driven platform kiểu Salesforce.
- Gantt, calendar planning nâng cao, nhiều cấp subtask và realtime collaboration.
- Suy đoán pricing, topology, isolation hoặc SLA của năm sản phẩm khi không có nguồn công khai.

