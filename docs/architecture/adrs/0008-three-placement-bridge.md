# ADR-0008: Bridge ba placement cho application data

- **Trạng thái:** Accepted cho triển khai local; phạm vi nghiên cứu bổ sung còn chờ xác nhận học thuật
- **Ngày:** 2026-09-07
- **Thay thế:** ADR-0002
- **RQ/yêu cầu:** RQ2, RQ3; ARC-02..05, DATA-02..05

## Bối cảnh

Checkpoint P-App đã hiện thực hai placement: `POOL` và `SILO_DATABASE`. Nhóm quyết định mở rộng Bridge để bao phủ thêm mô hình Shared Database, Separate Schema, đồng thời vẫn dùng chung API, worker, frontend và nghiệp vụ. Nội dung này mở rộng phạm vi so với checkpoint P-App và không được trình bày như kết quả học thuật đã phê duyệt.

## Quyết định

- `POOL` là Shared Database, Shared Schema: tenant chung database, schema và bảng, dùng `tenant_id`, kiểm tra ứng dụng và `FORCE ROW LEVEL SECURITY`.
- `SCHEMA_PER_TENANT` là Shared Database, Separate Schema: mỗi tenant có schema và runtime role riêng trong một database dùng chung.
- `SILO_DATABASE` là Separate Database: mỗi tenant có database và runtime role riêng; vị trí máy chủ vật lý không làm thay đổi phân loại.
- Bridge là toàn hệ thống kết hợp ba placement, không phải tên khác của placement schema.
- Placement được chốt khi onboarding và bất biến khi tenant đã có dữ liệu. Chuyển dữ liệu giữa placement nằm ngoài phiên bản này.
- Resolver chỉ nhận `TenantContext` đã xác thực. Mọi transaction đặt `search_path` cục bộ rồi trả connection; `search_path` không phải hàng rào bảo mật.
- Runtime role của schema-per-tenant chỉ có `CONNECT`, `USAGE` và DML trên schema của tenant. Role không có DDL, `BYPASSRLS`, `CREATEDB` hoặc `CREATEROLE`; provisioner thực hiện schema/Flyway/DDL.
- Flyway có history riêng trong từng schema/database. Pool và Silo hiện hữu được nâng cấp tại chỗ bởi migration worker; không tạo lại dữ liệu.
- Rollback schema chỉ xóa schema/role do tenant đó sở hữu; lỗi tenant này không thay đổi tenant khác.

## Hệ quả

Ba placement có cùng hợp đồng và workload để so sánh nhưng chi phí connection, migration, backup và kiểm thử tăng. Schema-per-tenant cần cả quyền PostgreSQL và kiểm tra truy vấn ghi rõ schema; chỉ đổi `search_path` không đủ để chống truy cập chéo tenant.

## Xác minh

- Test provisioning hai tenant cùng database, hai schema/role khác nhau và Flyway history V8 độc lập.
- Runtime role tenant B bị từ chối khi truy vấn ghi rõ schema tenant A.
- Transaction sau commit/rollback vẫn lấy đúng schema.
- Rollback tenant A giữ nguyên schema và dữ liệu tenant B.
- Bộ regression application chạy trên migration chung; runtime E2E ba placement là điều kiện đóng EXT-06.
