# Biên bản kỹ thuật EXT-01–EXT-06 — Bridge ba placement và tùy biến tenant

**Ngày xác minh:** 2026-09-08 (UTC)  
**Phạm vi:** backend, OpenAPI, frontend và stack Compose local trên working tree sau checkpoint P-App `c226676`  
**Kết luận:** EXT-01 đến EXT-06 hoàn tất trong phạm vi local đã khóa.

Biên bản này chỉ ghi bằng chứng kỹ thuật local. Nó không phải dữ liệu thực nghiệm, không khóa SLO,
không chứng minh khả năng vận hành Internet và không thay thế hồ sơ nghiệm thu học thuật.

## 1. Phạm vi đã đóng

- Bridge dùng chung ứng dụng với ba placement: `POOL`, `SCHEMA_PER_TENANT`, `SILO_DATABASE`.
- Schema-per-tenant dùng database `schema_db`, schema và runtime role riêng; runtime role chỉ có DML.
- Capability được tách khỏi tier: `BRANDING`, `CUSTOM_DATA`, `APPROVALS`, `AUTOMATION`, với giới hạn
  phía server theo placement.
- Branding theo tenant; Custom Data tạo bảng/cột SQL hữu hạn; Approval hỗ trợ nhiều bước `ANY`/`ALL`;
  Automation dùng một trigger và một action trong tập hữu hạn.
- API/OpenAPI/generated TypeScript và các màn System Admin, Tenant Settings, Customization, Kanban được
  cập nhật cùng lát cắt.
- Control schema ở V6; application schema ở V8 cho Pool, từng schema và từng database Silo.

## 2. Bằng chứng kiểm tra cuối

| Kiểm tra | Kết quả |
|---|---|
| Backend Maven + Testcontainers | 96/96 pass, 0 failure, 0 error, 0 skip; PostgreSQL 18.6 và MinIO thật trong container |
| Schema isolation integration | Hai tenant dùng cùng `schema_shared`, schema/role khác nhau; truy vấn ghi rõ schema tenant kia bị từ chối; rollback transaction không rò context; dọn tenant A giữ tenant B |
| Capability/customization integration | Placement matrix pass; entity dùng cột vật lý, vẫn đọc được sau thu hồi capability; approval nhiều bước ANY rồi ALL; automation idempotent theo event/rule |
| Frontend contract và unit | `api:check`, TypeScript lint, 9 file/16 test và production build đều pass |
| Playwright | 3/3 pass bằng Chromium: Pool, Schema-per-tenant và Silo; host/token, role/IDOR, resource và background tenant matrix |
| Smoke mở rộng | `verify-extension-workflow.mjs` pass qua reverse proxy: ba placement, capability gate, branding, Custom Data, Approval và Automation |
| Hồi quy P-App | `verify-p-app-workflow.mjs` pass APP-03–APP-06 và System Admin detail/filter |
| Infra tĩnh | `scripts/validate-infra.sh` pass; 8/8 Python test và kiểm tra protocol/Compose pass |
| Compose nâng cấp | `scripts/dev-up.sh` build/restart pass trên volume PostgreSQL hiện hữu; API/Web/PostgreSQL healthy; Pool/Silo cũ và schema tenant cùng ở application V8 |
| Git hygiene | `git diff --check` pass; hai file Word chưa được Git theo dõi không bị sửa |

Các lệnh chính:

```bash
cd apps/api
MAVEN_USER_HOME=/tmp/nckh-maven-home ./mvnw -B -ntp -Dmaven.repo.local=/tmp/nckh-m2 test

cd ../web
npm run api:check
npm run lint
npm test
npm run build
E2E_ENV_FILE=../../infra/.env npm run test:e2e

cd ../..
scripts/validate-infra.sh
scripts/dev-up.sh
node scripts/verify-extension-workflow.mjs
node scripts/verify-p-app-workflow.mjs
```

## 3. Lỗi phát hiện trong xác minh và cách sửa

1. Record cấu hình `Datasource` có constructor phụ khiến Spring Boot bind `app.datasource` thành
   `null` khi chạy container. Đã giữ một canonical constructor duy nhất và cập nhật fixture.
2. Transaction coordinator provisioning chưa sao chép `schema_name`, nên tenant Schema có thể bị đánh
   dấu `ACTIVE` nhưng resolver từ chối nghiệp vụ. Đã sao chép trường này trong cả prepare/finalize,
   thêm regression assertion và cho demo seed tự phục hồi metadata lỗi bằng idempotency key mới.
3. Smoke automation gửi board filter cho trigger `TASK_CREATED`, trái contract hữu hạn. Đã sửa payload
   smoke để board/column filter chỉ dùng với trigger đổi cột.

Sau các sửa trên, backend full test, Compose, smoke và Playwright đều chạy lại thành công.

## 4. Trạng thái runtime khi chốt

- `pool-demo`: `POOL`, `ACTIVE`, database `pool_db`, schema `public`, application V8.
- `schema-demo`: `SCHEMA_PER_TENANT`, `ACTIVE`, database `schema_db`, schema vật lý do server sinh,
  application V8.
- `silo-demo`: `SILO_DATABASE`, `ACTIVE`, database riêng, schema `public`, application V8.
- Stack local còn chạy tại thời điểm ghi biên bản; phiên sau phải kiểm tra lại thay vì giả định trạng thái
  runtime còn nguyên.

## 5. Ranh giới còn lại để nghiệm thu đề tài

- Scheduler nhắc hạn, email/Web Push thật và payment sandbox chưa được đóng bằng provider thật.
- Chưa chốt VPS thuê hay laptop/VM tự host, domain, wildcard DNS và TLS cho pilot. Laptop có thể dùng
  nếu bảo đảm public reachability hoặc tunnel, uptime/nguồn điện, backup, bảo mật và ghi cấu hình tái lập.
- P2 measurement, protocol bổ sung cho ba placement, pilot, SLO, load/noisy-neighbor, user study/SUS và
  bộ số liệu nghiên cứu vẫn chưa thực hiện.
- Phụ lục mở rộng trong thuyết minh vẫn là đề xuất chờ phê duyệt học thuật; checkpoint local này không
  tự biến phạm vi mới thành phạm vi đã được duyệt.

