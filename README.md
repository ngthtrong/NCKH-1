# NCKH-1 — Multi-tenant SaaS Task Management

Monorepo phục vụ đề tài **Xây dựng ứng dụng quản lý công việc theo kiến trúc đa thuê bao**.
Bản demo mặc định bám `Report (1).docx`: **mức 3, Pool**, cùng một API,
database/schema/bảng cho các tenant; tùy biến theo cấu hình JSONB. Stack dùng
React 18, Spring Boot 3 / Java 21, PostgreSQL 16, Redis 7 và Caffeine.
Mã Bridge ba placement cũ được giữ như biến thể đối chứng, không phải bản demo mặc định.

**Chạy và kiểm tra theo báo cáo:** [hướng dẫn và KB-1–KB-4](experiments/report/README.md).
`scripts/dev-up.sh` tạo stack riêng `nckh-report`, giữ dữ liệu Bridge cũ trong volume riêng.
Nếu stack cũ đang chiếm cổng, dừng bằng `APP_VARIANT=bridge bash scripts/dev-down.sh` trước.

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
bash scripts/dev-up.sh
```

Script tạo `infra/.env` từ mẫu nếu chưa tồn tại, kiểm tra Compose, build và khởi động
stack Pool có dữ liệu Acme–Lotus. Giá trị `change-me` chỉ dùng local. File tài nguyên
dùng adapter filesystem và volume chung API/worker; không phụ thuộc image MinIO để chạy demo.

Hướng dẫn từng bước, tài khoản demo, luồng kiểm thử và xử lý lỗi nằm tại
[docs/RUN_APPLICATION.md](docs/RUN_APPLICATION.md).

Sau khi health check thành công:

- Trang đăng nhập: `http://accounts.localhost:8080`
- Tenant Pool mẫu: `http://pool-demo.localhost:8080`
- Acme (STRICT): `http://t-acme.localhost:8080`
- Lotus (WARN): `http://t-lotus.localhost:8080`
- Mailpit: `http://127.0.0.1:8025`
- Prometheus: `http://127.0.0.1:9090`

MinIO/Grafana và hai tenant Schema/Silo thuộc stack Bridge tùy chọn:
`APP_VARIANT=bridge bash scripts/dev-up.sh`. Hướng dẫn cũ bên dưới và trong
`docs/RUN_APPLICATION.md` cần được đọc theo đúng biến thể, không trộn kết quả.

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

Repo đã có baseline cho control plane, tenant context, resolver ba placement, RLS/quyền schema, provisioning state machine, Kanban API/UI, capability và các module tùy biến, resource/notification adapters, container stack và test/experiment harness. Đây chưa phải bản nghiệm thu cuối. VPS, provider sandbox, thực nghiệm chính và đánh giá người dùng cần hạ tầng, credential, phê duyệt và dữ liệu thật từ nhóm nghiên cứu.
