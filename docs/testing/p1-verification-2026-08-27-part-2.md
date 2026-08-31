# Biên bản xác minh P1 — 2026-08-27, lượt 2

## Phạm vi

Biên bản này được bắt đầu tại checkpoint tạm dừng giữa lượt làm việc và được hoàn tất sau khi tiếp tục
xác minh. Nó ghi trạng thái cuối của ba ưu tiên:

- Playwright/HTTP role matrix cho Manager, Member và Viewer;
- force-kill provisioning tại các ranh giới DDL, Flyway và control-plane finalize;
- dead-letter/requeue cho resource cleanup.

Đây chỉ là bằng chứng kỹ thuật local. Không có số liệu hiệu năng, DOI, SUS, dữ liệu khảo sát hoặc kết
quả nghiên cứu nào được tạo trong lượt này.

## Phần mã đã hoàn thành

### Role matrix

- File Playwright hiện vẫn chỉ khai báo hai case được sinh từ cùng một matrix: một tenant Pool và một
  tenant Silo.
- Mỗi case kiểm tra host-token mismatch, quyền đọc và mutation column của Manager/Member/Viewer,
  Member được tạo task, Viewer bị chặn task mutation, UI ẩn/disable action theo role và conflict `409`
  khi Manager dùng board version cũ.
- Test có cleanup column/task và khôi phục seeded member về role `MEMBER` trong `finally`.

### Force-kill provisioning

- Provisioner có ba checkpoint nội bộ sau khi database/role sẵn sàng, sau Flyway và ngay trước khi
  control-plane finalize.
- Integration test khởi chạy một JVM con chạy production provisioner, chờ marker của từng checkpoint
  rồi dùng `destroyForcibly()` để giết process thật.
- Sau lease hết hạn, worker thứ hai claim attempt 2, dùng lại encrypted credential đã persist, hoàn tất
  idempotent và xác nhận chỉ có một database, một role cùng chuỗi sự kiện lease-expiry chính xác.
- Retry trên database đã migrate làm lộ lỗi Flyway trả `targetSchemaVersion=null` khi không còn migration
  mới. Provisioner đã được sửa để đọc version hiện tại từ `flyway.info()` sau `migrate()`.

### Resource dead-letter/requeue

- Application migration V3 thêm `dead_lettered_at`, `requeue_count`, `last_requeued_at`, partial index và
  backfill các event cũ đã có `attempts >= 5` nhưng chưa `processed_at`.
- Outbox dừng auto-delivery sau lần thất bại thứ năm, lưu lỗi cuối và ghi audit
  `RESOURCE_DELETE_DEAD_LETTERED`.
- System Admin có API tenant-scoped để liệt kê và requeue resource cleanup dead letter. Requeue dùng
  `FOR UPDATE`, reset trạng thái delivery, tăng bộ đếm và ghi audit `RESOURCE_DELETE_REQUEUED`; event ID
  thuộc tenant khác trả not-found.
- OpenAPI, generated TypeScript và trang Admin đã có list/requeue tương ứng.

### Startup order application V3/outbox

- Outbox kiểm tra `tenant_placements.schema_version` trước khi tạo tenant context hoặc truy vấn
  `outbox_events`; placement chưa đạt application schema mới nhất bị bỏ qua fail-closed.
- Test MinIO retry hiện hữu đặt placement ở schema `2`, gọi poll và xác nhận event chưa bị đọc/delivery;
  sau khi placement chuyển sang schema mới nhất thì cùng worker mới bắt đầu xử lý. Assertion này không
  tạo test case mới nên tổng backend vẫn là 58.
- Cơ chế không phụ thuộc thứ tự đăng ký hai `@Scheduled`: migration worker có thể chạy trước hoặc sau
  poll đầu, nhưng outbox không dùng hợp đồng schema V3 khi control plane còn ghi version cũ.

## Kết quả kiểm tra đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| Focused provisioning + resource integration | Pass sau khi sửa cách đọc Flyway current version |
| Backend `clean test` | 17 suite, 58/58 pass, 0 failure, 0 error, 0 skip; giữ đủ 56 test checkpoint trước và toàn bộ 53 test nền |
| OpenAPI generated check | Pass, không drift |
| Frontend unit | 3 file, 5/5 pass |
| Frontend production build | Pass; TypeScript compile và Vite build thành công |
| Playwright discovery | Đúng 2 test trong 1 file: Pool và Silo |
| Playwright runtime cho matrix mới | 2/2 pass bằng Chromium thật: Pool 17,7 giây, Silo 7,4 giây; tổng 26,6 giây |
| E2E cleanup | Truy vấn sau test cho 0 column và 0 task có prefix test ở cả Pool và Silo; cleanup khôi phục project role không phát lỗi |
| `git diff --check` | Pass trên final working tree |

Backend `clean test` trong bảng là lượt chạy lại sau câu `UPDATE` backfill cuối của V3. Tổng hợp trực
tiếp 17 XML report cho đúng 58 test, `errors=0`, `failures=0`, `skipped=0`.

## Compose/Flyway cuối

`scripts/validate-infra.sh` pass Compose interpolation, JSON/Python checks và 3/3 analyzer test.
`scripts/dev-up.sh` rebuild/restart trên volume hiện hữu và kết thúc exit code `0`; API healthy và
readiness endpoint pass. Không reset volume.

Log worker xác nhận:

- control plane đã ở Flyway V4 và validate đủ bốn migration;
- `pool_db` được nâng từ application V2 lên V3;
- database Silo hiện hữu được nâng từ application V2 lên V3;
- cả hai placement `ACTIVE` được worker ghi `schema_version=3` sau migration thành công.

Image trước bản chốt từng ghi một warning `dead_lettered_at does not exist` cho mỗi placement vì outbox
poll trước migration. Sau khi thêm schema gate, full test và rebuild, log của worker mới chỉ có INFO qua
nhiều vòng poll, không có WARN/ERROR hay lỗi schema.

Truy vấn chỉ đọc cuối xác nhận:

| Database/control state | Kết quả |
| --- | --- |
| `control_db` Flyway | V1, V2, V3, V4 đều `success=true` |
| `pool_db` Flyway | Application V1, V2, V3 đều `success=true` |
| Silo database Flyway | Application V1, V2, V3 đều `success=true` |
| Placement | `pool-demo` và `silo-demo` đều `ACTIVE`, `schema_version=3` |
| Pool RLS | 14 bảng application bật đồng thời RLS và FORCE RLS |
| Artifact E2E | 0 test column, 0 test task trong cả Pool và Silo |

## Trạng thái repository và điều cấm

- `main`/`origin/main` vẫn dùng commit nền `ee0d685`; toàn bộ phần P1 hiện tại còn ở working tree, chưa
  commit.
- Không khôi phục `resource/important.md` hoặc `resource/thuyet_minh_SaaS.md`.
- Không tạo hay ghi đè `draft.md`.
- Không tạo dữ liệu trong `experiments/results` hoặc `experiments/derived` và không tạo dữ liệu nghiên
  cứu giả.

## Phần P1 còn lại

Ba ưu tiên của lượt này đã được đóng bằng test và kiểm tra runtime local. P1 tổng thể vẫn còn các phạm
vi chưa được phép suy rộng từ kết quả trên:

1. file-key tampering/resource download và background job/notification sai tenant;
2. MinIO outage kéo dài ở mức Compose và, nếu cần bằng chứng vận hành sâu hơn, force-kill worker container;
3. Web Push VAPID cùng adapter payment sandbox thật khi nhóm cung cấp credential;
4. pilot VPS, SLO khóa trước và dữ liệu thực nghiệm chính vẫn thuộc giai đoạn sau, không phải kết quả của
   biên bản kỹ thuật này.

## Câu lệnh mở đầu đề xuất

> Đọc `docs/PROJECT_STATUS.md`, các biên bản trong `docs/testing/` đến
> `p1-verification-2026-08-27-part-2.md`, rồi đọc `resource/plan.md` và
> `resource/thuyetMinhSaasMultiTenancy.md`; kiểm tra working tree và tiếp tục P1 từ biên bản lượt 2.
> Không khôi phục hai file resource đang bị xóa, không ghi đè `draft.md`, không tạo dữ liệu nghiên cứu
> giả. Giữ 58 backend test (bao gồm đủ 56 test checkpoint trước và 53 test nền), 5 frontend unit test và
> đúng 2 Playwright E2E; ưu tiên file/download/background-job tenant matrix, rồi fault injection Compose
> còn lại. Không suy rộng test local thành Cổng B hoặc E.
