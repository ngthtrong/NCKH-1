# Ma trận truy vết sáu bước — báo cáo sơ bộ

N1–N5 tổ chức lập luận, giữ RQ của protocol 0.1. Cài đặt hiện hữu được đối chiếu; không thay API, migration, ADR Accepted hoặc protocol. Lựa chọn triển khai được phân biệt với kết luận công nghệ thắng.

| Nhóm/RQ | Xác định bài toán | Phương án | Tiêu chí | Hiện thực | Bằng chứng/giới hạn | Mục báo cáo |
|---|---|---|---|---|---|---|
| N1 / RQ2/3/4 | Token A tại host B; context còn sau exception/job | Subdomain+token; path/header+token; tenant claim. Truyền tham số/request scope/ThreadLocal. | Mismatch trước SQL; ACTIVE + membership/version; cleanup sau success/error; worker context riêng. | TenantContextFilter, TenantHostResolver, TenantContextHolder, TenantJdbcExecutor, OutboxWorker. | E10 source; E04 test unit mới; E05 E2E lịch sử. Internet proxy/DNS/TLS chưa đóng. | Ch.3.2; Ch.4.2; Phụ lục A |
| N2 / RQ2/3/4 | IDOR; native/bulk/background bỏ guard; connection reuse; explicit schema khác | Pool/schema/database-per-tenant; trong Pool: predicate/ORM/RLS+guard. | Read/write/delete chéo bị chặn; dữ liệu B nguyên; role không bypass; context transaction-local. | DefaultTenantDataSourceResolver, TenantDatabaseProvisioner, TenantJdbcExecutor, migrations/runtime roles. | E11 source/test design; E09 6 leak/3 RLS/9 Silo observations; E05 historical schema case. Docker hiện skip; scorecard chưa có. | Ch.3.3; Ch.4.2–4.3; Phụ lục A |
| N3 / RQ1/2/3 | Owner không có project role; Member gọi API admin; token sau revoke | Role JWT; membership server; ABAC/ReBAC. Account ứng dụng so với IdP/OIDC ở mức kiến trúc. | Action allow/deny; active tenant/project membership; revoke/version; deny không side effect. | AuthService, TenantContextFilter, ProjectApplicationService, ResourceService và policy. | E12 source; E04 management/security unit; ProjectAuthorization 17 skip; E05 role E2E lịch sử. | Ch.3.4; Ch.4.2; Phụ lục B quyền |
| N4 / RQ2/3 | Cập nhật version cũ; batch một item stale; event duplicate; assignee/deadline đổi | Last-write-wins/version/pessimistic lock; direct send/outbox/broker. | Conflict không overwrite; batch/event rollback; dedupe; stale/exact recipient; queue khác SMTP sent. | ProjectApplicationService, OutboxWorker, DeadlineReminderService, NotificationDeliveryWorker; V11/V12. | E13 source; E06 history 6 deadline case; E04 deadline 6 skip. Multi-outbox-worker/exactly-once SMTP chưa có. | Ch.3.5; Ch.4.2–4.3; Phụ lục A |
| N5 / RQ2/3/4 | Duplicate callback; crash sau DDL/Flyway; lease mất; rollback lỗi; tài nguyên bị tranh chấp | Manual/request sync/worker state machine; storage SPI; pool/quota/limiter. | Idempotent resource refs; valid lease finalize; ACTIVE đủ bước; rollback ownership; metric victim/budget. | ProvisioningJobClaimer/Coordinator, DefaultProvisioningService, provisioner, resolver, ResourceService, TenantRateLimitFilter. | E14 source; E08 crash/storage history; E04 integration skip. Pool/limiter efficacy và provider thật PENDING_DATA. | Ch.3.6; Ch.4.2–4.3; Phụ lục A/B |

## Quy tắc sử dụng

- Mỗi khẳng định về hành vi cần nguồn chạy/test tương ứng; source inspection không thay runtime.
- Không coi test harness pass là ứng viên có leak đạt bảo mật.
- Chương 3 có bảng phương án, lý do chọn và hiện thực; Chương 4 có câu trả lời RQ, skip và phần pending.
- RQ1 có yêu cầu từ hồ sơ; RQ2 có kiến trúc hiện thực; RQ3 chỉ có tính đúng đắn local theo phạm vi; RQ4 chưa có phương án tối ưu đo được.
- Sổ evidence: [preliminary-report-evidence.md](preliminary-report-evidence.md).
- Biên bản mới: [preliminary-report-2026-10-09.md](../testing/preliminary-report-2026-10-09.md).
