# ADR-0009: Capability tách khỏi placement và giới hạn tùy biến

- **Trạng thái:** Accepted cho triển khai local; phạm vi nghiên cứu bổ sung còn chờ xác nhận học thuật
- **Ngày:** 2026-09-07
- **RQ/yêu cầu:** RQ1, RQ2, RQ3; FR-80..FR-116, SEC-15..21

## Bối cảnh

Placement mô tả cách bố trí dữ liệu. Nó không nên đồng thời là gói giá hoặc một danh sách module được bật cứng. Hệ thống cần cho System Admin cấp quyền theo tenant, trong khi Tenant Owner/Admin quyết định bật module đã được cấp.

## Quyết định

- Capability gồm `BRANDING`, `CUSTOM_DATA`, `APPROVALS`, `AUTOMATION` và được lưu ở control plane theo `tenant_id`, có version và audit.
- Placement chỉ đặt trần: Pool có Branding; Schema có Branding và Custom Data; Silo có đủ bốn capability.
- Gói giá không quyết định capability trong phiên bản đầu.
- System Admin cấp/thu hồi. Owner/Admin bật/tắt trong phần đã được cấp. Backend kiểm lại capability cho mọi request và job; frontend chỉ phản ánh trạng thái.
- Thu hồi Custom Data chặn mọi mutation nhưng dữ liệu cũ tiếp tục đọc theo project role. Thu hồi Automation chặn execution mới và giữ history. Approvals chỉ tắt/thu hồi khi không còn run chờ và workflow bắt buộc đã tắt.
- Branding chỉ nhận mã màu và logo PNG/JPEG/WebP tối đa 2 MiB; không nhận HTML, CSS hoặc JavaScript.
- Custom Data dùng bảng/cột SQL do server sinh, không sửa bảng lõi, không nhận SQL hay biểu thức thực thi. Định nghĩa và field xóa mềm; DDL do worker chạy theo job/version.
- Approvals là snapshot nhiều bước tuần tự với ANY/ALL, optimistic version và server guard trên mọi đường move task.
- Automation chỉ có một trigger và một action từ danh sách hữu hạn; dùng outbox và khóa `(event, rule)` để chống trùng, không phát sinh chuỗi automation.

## Hệ quả

Capability có thể thay đổi mà không đổi placement hoặc datasource. Việc kiểm quyền phải xuất hiện ở cả request và worker. Các bảng/field động tồn tại ngoài Flyway core nhưng metadata/job vẫn nằm trong migration lõi và upgrade ứng dụng không được xóa dữ liệu tenant.

## Xác minh

- Ma trận placement/capability có unit test.
- Direct API bị từ chối khi capability tắt hoặc không được placement hỗ trợ.
- CRUD tùy chỉnh, approval concurrency và automation dedupe có integration test.
- OpenAPI và generated TypeScript được đồng bộ trong từng lát cắt.
