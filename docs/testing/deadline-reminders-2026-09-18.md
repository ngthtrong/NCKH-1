# Biên bản kiểm chứng nhắc deadline local

**Ngày:** 2026-09-19 (UTC+7)  
**Nhánh:** `an_upgrade_features`  
**Phạm vi:** scheduler due/overdue, outbox, tenant isolation và runtime Compose

## Kết quả

- Application migration V11 thêm sổ `task_deadline_reminders`, unique key chống gửi trùng, RLS và chỉ mục deadline.
- Application migration V12 thêm `action_url` và trạng thái retry/dead-letter cho delivery email.
- Worker quét mặc định mỗi phút, nhắc trước 24 giờ; chỉ chọn project active, board/task chưa xóa,
  cột chưa hoàn tất, assignee còn là project member.
- Outbox kiểm tra lại assignee, deadline và trạng thái ngay trước dispatch. Sự kiện stale được đánh dấu đã
  xử lý nhưng không tạo notification.
- Người nhận deadline là đúng assignee, không broadcast cho toàn bộ project.
- Sự kiện giao task cũng chỉ gửi đúng assignee hiện tại; notification mở thẳng board/task liên quan.
- Gửi email tách khỏi outbox nghiệp vụ, thử tối đa năm lần, có backoff/lease và tôn trọng opt-out mới nhất.
- In-app luôn được ghi idempotent; email đi qua SMTP/Mailpit theo preference; Web Push vẫn ghi
  `VAPID_NOT_CONFIGURED` khi chưa có provider/credential thật.

## Bằng chứng đã chạy

| Kiểm tra | Kết quả |
|---|---|
| `DeadlineReminderIntegrationTest` | 6/6 pass trên PostgreSQL 18.6, Flyway V1–V12 |
| Toàn bộ backend test | 106/106 pass, 0 failure, 0 error |
| Frontend contract/lint/unit/build | Pass; 22/22 test, production build 1.054 module |
| Playwright smoke | 3/3 pass trên Pool, Schema-per-tenant và Silo |
| Docker image API/worker | Build thành công |
| Runtime | API healthy, worker Up, trang login HTTP 200 |
| Migration runtime | 6/6 tenant active có `schema_version=12`, gồm Pool, Schema-per-tenant và Silo |

## Giới hạn còn lại

- SMTP Internet và Web Push VAPID thật chưa được cấu hình; Mailpit chỉ là bằng chứng local.
- Chưa dùng kết quả này làm số liệu nghiên cứu, SLO production hoặc kết luận placement tối ưu.
