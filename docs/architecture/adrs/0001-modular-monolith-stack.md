# ADR-0001: Modular monolith Spring/React với API và worker tách process

- **Trạng thái:** Accepted
- **Ngày:** 2026-08-25
- **RQ/yêu cầu:** RQ2, RQ4; ARC-01, ARC-05..07

## Bối cảnh

Đề tài cần đủ module để kiểm chứng identity, placement, provisioning, Kanban, storage, notification và observability nhưng chỉ triển khai trên một VPS giới hạn. Microservices/broker/Kubernetes làm tăng biến nhiễu vận hành và không phục vụ trực tiếp RQ.

## Lựa chọn

| Lựa chọn | Lợi ích | Chi phí/rủi ro |
| --- | --- | --- |
| Modular monolith, hai process chung code | Một contract/domain model; transaction cục bộ; nhẹ; API/privileged worker vẫn tách quyền | Cần giữ module boundary; scale theo component hạn chế |
| Microservices | Tách deploy/scale | Network/distributed consistency/ops vượt phạm vi VPS |
| Một process duy nhất | Đơn giản nhất | API phải giữ quyền provisioning; failure/background isolation kém |

## Quyết định

Dùng Java 21, Spring Boot 4.1.x, Maven Wrapper, Spring Security, JPA/Hibernate, Flyway và Testcontainers. Frontend dùng React 19.2, TypeScript, Vite, React Router, TanStack Query, Material UI và dnd-kit trên Node 22. Dependency version được khóa trong build/lockfile.

Build sinh hai runtime profile/entrypoint từ cùng backend code: `api` và `worker`. Chúng dùng database principals và readiness riêng. Module chỉ giao tiếp qua interface/domain event nội bộ; không thêm broker, Redis hoặc Kubernetes trong v1.

## Hệ quả và xác minh

- API không có CREATE/DROP DATABASE/ROLE.
- Worker provisioning credential không được dùng bởi notification/business handler ngoài adapter.
- Architecture/module tests chặn dependency ngược; container smoke test chạy riêng API/worker.
- Nếu profiling VPS cho thấy footprint không đạt, tối ưu dependency/pool trước; đổi kiến trúc cần ADR mới.

