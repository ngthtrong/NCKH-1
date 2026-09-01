# Biên bản kỹ thuật APP-03–APP-06 — workflow ứng dụng local

**Ngày:** 2026-09-01 (UTC)  
**Phạm vi:** project/board/task/comment, resource/notification, Owner/Admin UX, OpenAPI/web và Compose local  
**Kết luận:** APP-03 đến APP-06 hoàn tất trong phạm vi local đã khóa; provider/VPS/P2/kiểm thử
nghiệm thu diện rộng và thực nghiệm vẫn tạm dừng.

## Luồng đã đóng

- Project có lifecycle `ACTIVE/ARCHIVED/DELETED`, soft delete, read-only khi archive, quản trị
  ProjectMembership và invariant luôn còn ít nhất một Manager.
- Một project có nhiều board; Manager tạo/đổi tên/xóa board. Task có detail, assignee, due date,
  optimistic version, batch move; subtask chỉ một cấp. Comment cho phép author sửa/xóa và Manager
  moderation. Các mutation bị chặn khi project đã archive.
- Resource hỗ trợ file hoặc link HTTP(S), list quan hệ task, attach/detach nhiều task và soft delete;
  file tiếp tục cleanup vật lý qua outbox, link không tạo storage cleanup giả.
- Notification UI nối preference và danh sách/thêm/xóa push subscription. In-app bắt buộc không thể
  tắt; email/Web Push là opt-in. SMTP local dùng Mailpit; VAPID delivery thật vẫn chờ HTTPS/credential.
- Owner/Admin xem trạng thái onboarding của workspace đúng quyền. System Admin được nhận diện bằng
  role `SYSTEM_ADMIN`, có route control-plane riêng, lọc tenant theo status/placement, xem payment,
  provisioning và transition history, rồi retry chỉ các trạng thái hợp lệ.
- Application schema marker được nâng lên V7 để provisioning/upgrade và outbox không giữ kỳ vọng V3
  sau khi thêm migration lifecycle/resource/subscription.

## Kết quả kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Backend clean regression | 21 suite, 88/88 test pass; 0 failure, 0 error, 0 skip |
| Baseline backend | Giữ đủ 58 test gốc; tổng hiện tại tăng lên 88 |
| Flyway | Control V1–V5 và application V1–V7 áp dụng thành công trên PostgreSQL 18.6 Testcontainers |
| Project/application integration | 15 test authorization/lifecycle/board/task/comment/resource/notification pass |
| Admin unit | 3 test filter/payment mapping, detail/event history và retry guard pass |
| OpenAPI/generated TypeScript | `api:generate` và `api:check` pass; không drift |
| Frontend unit | 8 file, 11/11 test pass; giữ đủ 5 test baseline |
| Frontend lint/build | TypeScript lint và Vite production build pass |
| Compose local | `scripts/dev-up.sh` rebuild/restart exit 0; API và web healthy |
| APP-03–APP-06 smoke | `scripts/verify-p-app-workflow.mjs` pass trên tenant Pool local |
| Playwright baseline | Giữ đúng hai case hiện hữu; Pool và Silo đều pass, 2/2 |

Smoke kiểm tra System Admin filter/detail, project archive/restore/read-only, multi-board, task update và
batch move, subtask-depth guard, comment lifecycle, link resource attach/detach/delete, notification
preference invariant và push-subscription idempotency. Script khôi phục preference ban đầu, dọn
subscription/resource và soft-delete project kỹ thuật trong `finally`.

## Ranh giới kết luận

- Fixture có tên `P-App smoke-*` chỉ là dữ liệu kỹ thuật local và bị ẩn bằng soft delete theo lifecycle;
  không phải người tham gia, dữ liệu khảo sát, measurement hay artifact nghiên cứu.
- Chưa triển khai payment provider thật, VAPID delivery thật, VPS, DNS/TLS production hoặc SMTP ngoài
  local. Không dùng các kết quả trên để tuyên bố availability/performance production.
- Không chạy hoặc sửa P2 measurement, scorecard, elimination artifact hay ADR. Kết quả này không làm
  Cổng B/E đạt và không phải kiểm thử nghiệm thu diện rộng.
