# Biên bản xác minh P1 — 2026-08-31, lượt 2

## Phạm vi

Biên bản này tiếp tục trực tiếp từ `p1-verification-2026-08-31.md` và đóng đường recovery local còn lại
không cần credential ngoài:

- fault injection PostgreSQL thật khi rollback Silo xóa database được nhưng không thể xóa runtime role;
- lỗi rollback lặp lại và cleanup idempotent sau khi nguyên nhân vận hành được gỡ;
- manual retry từ `ROLLBACK_FAILED` qua đầy đủ audit transition đến `SUCCEEDED`;
- loại race đọc marker trong crash-process harness mà full clean test phát hiện.

Đây chỉ là bằng chứng kỹ thuật local. Không có số đo hiệu năng, workload result, DOI, SUS, dữ liệu khảo
sát hoặc dữ liệu nghiên cứu nào được tạo; kết quả không được dùng để đánh dấu Cổng B hoặc E.

## Thay đổi được xác minh

### Rollback PostgreSQL thất bại lặp lại

- Test failure-injection hiện hữu tạo một Silo database/runtime role thật trên PostgreSQL 18.6, sau đó
  tạo dependency ở control database do runtime role sở hữu.
- Lần rollback đầu xóa được tenant database nhưng `DROP ROLE` thất bại. Lần rollback thứ hai tiếp tục
  thất bại vì cùng dependency; cả hai lần đều giữ đúng một role và không tái tạo database.
- Sau khi dependency được bỏ, cùng thao tác rollback dọn role còn lại. Cleanup cuối gọi rollback thêm
  một lần để xác nhận đường dọn là idempotent và không để lại database/role test.
- Lỗi `TenantDatabaseProvisioner.rollback` giữ thông điệp PostgreSQL cụ thể trong exception ngoài, giúp
  `ROLLBACK_FAILED.last_error_message` hữu ích hơn cho System Admin; chuỗi vẫn bị giới hạn bởi coordinator.

### Manual recovery và audit

- Test coordinator hiện hữu đưa job đến `ROLLBACK_FAILED`, gọi đúng `AdminService.retryProvisioning`,
  xác nhận attempts/lease/error được reset và tenant trở lại `PROVISIONING`.
- Claim recovery bắt đầu lại ở attempt 1, không đi nhánh rollback-only, rồi hoàn tất `SUCCEEDED` và đưa
  tenant về `ACTIVE`.
- Chuỗi audit được kiểm tra đúng thứ tự:
  `RETRYABLE_FAILED → RUNNING → ROLLBACK_FAILED → QUEUED → RUNNING → SUCCEEDED`.
- Các assertion mới nằm trong hai test case hiện hữu, vì vậy tổng backend vẫn là 58.

### Ổn định crash harness

Full clean run đầu tiên làm lộ race: JVM cha chỉ chờ marker file tồn tại, trong khi JVM con có thể vừa
tạo file nhưng chưa ghi xong nội dung. Điều kiện chờ nay yêu cầu nội dung marker khớp checkpoint trước
khi force-kill. Test focused và full clean sau sửa đều pass.

## Kết quả kiểm tra cuối

| Kiểm tra | Kết quả |
| --- | --- |
| Focused provisioning/coordinator | 5/5 pass trên Docker/Testcontainers thật |
| Backend `clean test` | 17 suite, 58/58 pass, 0 failure, 0 error, 0 skip; giữ đủ 56 test checkpoint trước và toàn bộ 53 test nền |
| PostgreSQL rollback injection | Hai lần lỗi liên tiếp giữ database ở 0 và role ở 1; sau khi bỏ dependency, rollback dọn role về 0 |
| OpenAPI generated check | Pass, không drift |
| Frontend lint/TypeScript | Pass |
| Frontend unit | 3 file, 5/5 pass |
| Frontend production build | Pass với Vite 7.3.6, 11.761 module |
| Playwright discovery | Đúng 2 test trong 1 file: Pool và Silo |
| Playwright runtime | 2/2 pass bằng Chromium thật trên stack Compose local; Pool 17,8 giây, Silo 17,8 giây, tổng 37,0 giây |
| Infra/analyzer validation | Compose interpolation và static checks pass; 3/3 Python analyzer test pass |
| `git diff --check` | Pass |

Frontend được chạy bằng Node Linux 24.20.0 có sẵn trong `/tmp` vì `npm` mặc định của phiên trỏ sang
Windows CMD và không nhận UNC working directory WSL. Đây là chi tiết môi trường xác minh, không phải thay
đổi dependency hoặc yêu cầu runtime của dự án.

## Trạng thái repository và điều cấm

- Commit nền trước phần P1 vẫn là `ee0d685`; toàn bộ phần P1 hiện tại còn ở working tree, chưa commit.
- Không khôi phục `resource/important.md` hoặc `resource/thuyet_minh_SaaS.md`; cả hai vẫn vắng mặt.
- Không tạo hay ghi đè `draft.md`.
- Không tạo dữ liệu trong `experiments/results` hoặc `experiments/derived`, không tạo số đo hoặc dữ liệu
  nghiên cứu giả.

## Ranh giới kết luận và phần còn lại

- Fault injection mới chứng minh recovery trên một PostgreSQL Testcontainer local, không phải bằng
  chứng availability, durability hoặc quy trình vận hành production.
- Web Push VAPID, payment sandbox thật, SMTP ngoài local và pilot VPS vẫn chờ credential/hạ tầng tương
  ứng. Force-kill worker container chỉ nên làm thêm nếu nhóm cần bằng chứng vận hành sâu hơn.
- Cổng B vẫn cần ba isolation spike, security matrix và số đo có raw artifact/manifest thật. Cổng E vẫn
  cần pilot VPS, SLO khóa trước và dữ liệu thực nghiệm chính.
