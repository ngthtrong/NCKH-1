# NCKH-1 — Multi-tenant SaaS Task Management

Monorepo phục vụ đề tài **Xây dựng ứng dụng quản lý công việc theo kiến trúc đa thuê bao**. Hệ thống hướng tới mô hình Bridge: tenant Pool dùng chung PostgreSQL database/schema, tenant Silo dùng database riêng; control plane, mã ứng dụng và quy trình vận hành được dùng chung.

> Điểm tiếp tục mới nhất nằm tại [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md). Đọc tài liệu này trước khi phát triển tiếp; các cổng thực nghiệm chưa được đánh dấu đạt nếu chưa có số đo thật.

## Cấu trúc

- `apps/api`: Spring Boot API và worker/provisioner.
- `apps/web`: React + TypeScript SPA.
- `infra`: Docker Compose, reverse proxy, quan sát và runbook.
- `experiments`: k6 và công cụ phân tích dữ liệu đo có thể tái lập.
- `docs`: giao thức nghiên cứu, SRS, OpenAPI, ADR và kiến trúc.
- `resource`: kế hoạch và thuyết minh gốc của đề tài.

## Chạy local

Yêu cầu Docker Engine/Desktop có Compose v2. Từ thư mục gốc:

```bash
scripts/dev-up.sh
```

Script sẽ tạo `infra/.env` từ mẫu chuẩn [infra/.env.example](infra/.env.example) nếu file chưa tồn tại, kiểm tra Compose, build và khởi động stack. Các giá trị `change-me` chỉ dùng trên máy local cô lập.

Sau khi health check thành công:

- Trang đăng nhập: `http://accounts.localhost:8080`
- Tenant Pool mẫu: `http://pool-demo.localhost:8080`
- Tenant Silo mẫu: `http://silo-demo.localhost:8080`
- Mailpit: `http://127.0.0.1:8025`
- MinIO console: `http://127.0.0.1:9001`
- Grafana: `http://127.0.0.1:3000`
- Prometheus: `http://127.0.0.1:9090`

Tài khoản seed local được cấu hình trong `infra/.env`. Không dùng credential mẫu trên môi trường Internet.

## Kiểm tra

Backend:

```bash
cd apps/api
./mvnw -B -ntp test
```

Frontend:

```bash
cd apps/web
npm ci
npm run api:check
npm run lint
npm test
npm run build
```

Hạ tầng và công cụ phân tích:

```bash
scripts/validate-infra.sh
scripts/run-experiment.sh smoke
```

`run-experiment.sh` cần cài k6 và chỉ lưu dữ liệu do một lần chạy thật tạo ra. Xem [experiments/README.md](experiments/README.md) trước khi đo.

Không commit secrets, token, dữ liệu định danh người tham gia hoặc dữ liệu thực nghiệm thô. Xem thêm [SECURITY.md](SECURITY.md) và [docs/research/protocol.md](docs/research/protocol.md).

## Trạng thái phạm vi

Repo đã có baseline cho control plane, tenant context, Pool/Silo resolver, RLS, provisioning state machine, Kanban API/UI, resource/notification adapters, container stack và test/experiment harness. Đây chưa phải bản nghiệm thu cuối. VPS, provider sandbox, thực nghiệm chính và đánh giá người dùng cần hạ tầng, credential, phê duyệt và dữ liệu thật từ nhóm nghiên cứu.
