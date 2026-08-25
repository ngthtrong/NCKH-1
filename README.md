# NCKH-1 — Multi-tenant SaaS Task Management

Monorepo phục vụ đề tài **Xây dựng ứng dụng quản lý công việc theo kiến trúc đa thuê bao**. Hệ thống hiện thực mô hình Bridge: tenant Pool dùng chung PostgreSQL database/schema, tenant Silo dùng database riêng, còn danh tính, onboarding, ứng dụng và vận hành được dùng chung.

## Cấu trúc

- `apps/api`: Spring Boot API và worker/provisioner.
- `apps/web`: React + TypeScript SPA.
- `infra`: Docker Compose, reverse proxy, quan sát và runbook.
- `experiments`: k6, dữ liệu đo và notebook phân tích tái lập.
- `docs`: giao thức nghiên cứu, SRS, ADR và kiến trúc.
- `resource`: kế hoạch và thuyết minh gốc của đề tài.

## Chạy local

Yêu cầu Docker Desktop/Engine và Docker Compose.

```bash
cp .env.example .env
docker compose -f infra/compose/docker-compose.yml --env-file .env up --build
```

Sau khi các health check thành công:

- Trang đăng nhập: `http://accounts.localhost`
- Tenant Pool mẫu: `http://pool-demo.localhost`
- Tenant Silo mẫu: `http://silo-demo.localhost`
- Mailpit: `http://localhost:8025`
- Grafana: `http://localhost:3001`
- Prometheus: `http://localhost:9090`

Tài khoản seed chỉ dành cho local được mô tả trong `.env.example`. Không dùng credential đó trên môi trường Internet.

## Kiểm tra

```bash
./scripts/test-all.sh
./scripts/run-experiment.sh smoke
```

Không commit secrets, token, dữ liệu định danh người tham gia hoặc dữ liệu thực nghiệm thô. Xem thêm `SECURITY.md` và `docs/research/research-protocol.md`.

## Trạng thái phạm vi

Baseline trong repo cung cấp control plane, tenant context, Pool/Silo resolver, migration RLS, provisioning state machine, Kanban API/UI, resource/notification adapters, container stack và test/experiment harness. Việc triển khai VPS, tích hợp sandbox thật và thu thập dữ liệu người dùng chỉ được thực hiện khi nhóm cung cấp hạ tầng, credential và phê duyệt cần thiết.

