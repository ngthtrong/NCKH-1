# ADR-0002: Bridge với control plane chung, Pool và database-per-tenant Silo

- **Trạng thái:** Accepted
- **Ngày:** 2026-08-25
- **RQ/yêu cầu:** RQ2, RQ3; ARC-02..05, DATA-02..03

## Bối cảnh

Khung nghiên cứu cần so sánh hai mức placement nhưng giữ trải nghiệm SaaS thống nhất. AWS SaaS Lens mô tả Bridge/targeted isolation và trường hợp compute chung nhưng storage/database riêng. Full-stack silo làm sai phạm vi và tăng chi phí.

## Quyết định

- Dùng một `control_db` chung cho identity, tenant, membership, tier, route, payment và provisioning.
- Tenant `POOL` dùng một `pooled_db`, shared schema và `tenant_id` trên mọi application row.
- Tenant `SILO_DATABASE` dùng database riêng nhưng chung API/worker/object storage/observability và **cùng application migrations/schema**, vẫn giữ `tenant_id`.
- `TenantDataSourceResolver` là đường duy nhất chọn datasource từ immutable `TenantContext` đã xác thực.
- Cùng endpoint, DTO, application service, domain rule và contract tests cho hai placement.
- Placement bất biến sau khi có application data; migration Pool↔Silo ngoài v1.
- Không foreign key/cross-database join giữa control và application plane.

## Hệ quả

Tích cực: so sánh placement trong cùng workload; Silo giảm biên dữ liệu nhưng không giả vờ tách toàn stack. Tiêu cực: quản lý nhiều pool/migration/backup phức tạp; không có atomic transaction giữa control và application DB.

## Xác minh

- Contract test suite chạy parameterized `POOL` và `SILO_DATABASE`.
- DB marker/Silo assertion phát hiện resolver/job sai tenant.
- Load test connection registry theo budget; restore test ít nhất một DB Silo.
- C4/report phải gọi đúng “database-only Silo”, không mô tả là không có noisy neighbor.

