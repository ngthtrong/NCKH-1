# Checklist P-App đã khóa

**Khóa phạm vi:** 2026-09-01 (UTC)  
**Nguồn:** SRS v0.1, OpenAPI 0.1.0, `resource/plan.md` và `docs/PROJECT_STATUS.md`  
**Mục tiêu:** hoàn thiện ứng dụng local theo lát cắt dọc trước khi quay lại P2, provider thật,
VPS, kiểm thử nghiệm thu diện rộng và thực nghiệm.

## 1. Nguyên tắc khóa phạm vi

- Mỗi lát cắt chỉ được xem là hoàn tất khi có backend, OpenAPI, generated TypeScript, frontend và
  test hồi quy tương xứng; authorization vẫn được enforce tại backend.
- Luồng nghiệp vụ application plane phải dùng cùng contract cho Pool và Silo. Không thêm chuyển đổi
  placement sau onboarding, mobile, realtime phức tạp, Kubernetes, autoscaling hoặc full-stack Silo.
- Payment local dùng adapter `fake`, không giao dịch tiền thật. VNPay/Stripe, SMTP ngoài local và VAPID
  delivery thật tiếp tục chờ đến giai đoạn có credential/HTTPS.
- Không chạy hoặc sửa P2 measurement để tạo kết quả chính thức; không tạo raw measurement, SUS, khảo
  sát, DOI hay kết quả thực nghiệm giả.
- Baseline tối thiểu phải còn đầy đủ: 58 backend test, 5 frontend unit test và đúng 2 Playwright E2E
  Pool/Silo hiện hữu. Test mới được cộng thêm, không thay thế hoặc hạ baseline.
- Không khôi phục `resource/important.md` và `resource/thuyet_minh_SaaS.md`.

## 2. Thứ tự lát cắt đã khóa

| ID | Lát cắt | Phạm vi cốt lõi | Để sau | Trạng thái |
| --- | --- | --- | --- | --- |
| APP-01 | Tài khoản và onboarding | Đăng ký, đăng nhập, tạo tenant, fake payment, provisioning status, `ACTIVE`, transfer vào subdomain | Provider payment thật, VPS/DNS/TLS | **Hoàn tất local 2026-09-01** |
| APP-02 | Invitation và tenant membership | Invitation token/TTL/status, accept/reject idempotent, role/revoke, ownership invariant | Email delivery thật | **Hoàn tất local 2026-09-01** |
| APP-03 | Project và project membership | Metadata/lifecycle project, member/role UI, luôn còn Manager | Báo cáo nâng cao | **Hoàn tất local 2026-09-01** |
| APP-04 | Board/task/subtask/comment | Multi-board lifecycle, task detail/assignee/due date/conflict, một cấp subtask, comment lifecycle | Realtime/collaborative editing | **Hoàn tất local 2026-09-01** |
| APP-05 | Resource và notification | Link resource, attach/detach nhiều task, preference/subscription UI, event cốt lõi | Storage/provider và Web Push delivery thật | **Hoàn tất local 2026-09-01** |
| APP-06 | Owner/Admin UX | Payment/provisioning status và recovery đúng quyền; System Admin filter/detail/retry | Dashboard production/VPS operations | **Hoàn tất local 2026-09-01** |

## 3. Tiêu chí APP-01

- [x] User mới đăng ký tại host trung tâm, email được chuẩn hóa, password được hash và access token chỉ
  nằm trong memory của tab.
- [x] User đã xác thực tạo workspace với slug DNS duy nhất, tier và placement `POOL` hoặc
  `SILO_DATABASE`; tenant ở `PENDING_PAYMENT` và user là Owner.
- [x] Owner tạo payment session idempotent và hoàn tất thanh toán qua adapter `fake` local; endpoint
  xác nhận local không hoạt động khi provider không phải `fake`.
- [x] Callback được đưa qua cùng đường verify/idempotency hiện hữu, đối chiếu amount/currency, thanh toán
  thành công chỉ enqueue một provisioning job và tenant chuyển `PROVISIONING`.
- [x] Owner đọc được trạng thái payment/provisioning của đúng tenant; user tenant khác không thể dò ID.
- [x] Web polling trạng thái có loading/error/retry; khi worker đặt tenant `ACTIVE`, nút mở workspace tạo
  transfer code và vào đúng subdomain.
- [x] OpenAPI và generated TypeScript không drift; backend/frontend unit test, lint và build pass.
- [x] Hai Playwright E2E Pool/Silo hiện hữu vẫn pass; một lượt runtime onboarding local được ghi là kiểm
  tra kỹ thuật, không phải kết quả nghiên cứu.

Biên bản xác minh APP-01: [`../testing/p-app-onboarding-2026-09-01.md`](../testing/p-app-onboarding-2026-09-01.md).

## 4. Tiêu chí APP-02

- [x] Owner/Admin tạo invitation tenant-scoped cho email chưa đăng ký hoặc đã đăng ký; token ngẫu nhiên
  chỉ lưu SHA-256, có TTL bảy ngày, trạng thái và unique pending invitation theo tenant/email.
- [x] Link local chỉ hiển thị token một lần cho người mời; danh sách quản trị không trả lại token và cho
  thu hồi invitation đang chờ.
- [x] Preview dùng opaque capability token; accept/reject yêu cầu global account có đúng email và xử lý
  lặp lại idempotent. Accept tạo hoặc kích hoạt lại membership đúng role.
- [x] Owner/Admin đổi role/revoke theo tenant boundary; security version làm token cũ mất quyền ở request
  kế tiếp và không ai có thể demote/revoke Owner qua endpoint thường.
- [x] Chỉ Owner chuyển ownership cho active member. Hai membership được khóa/cập nhật trong một
  transaction, Owner cũ thành Admin, Owner mới là Owner duy nhất và cả hai security version tăng.
- [x] Web có tab invitation, link copy một lần, trạng thái/thu hồi; người nhận có trang preview,
  đăng nhập/đăng ký, accept/reject và trở lại danh sách workspace.
- [x] Migration V5, OpenAPI/generated TypeScript, backend/frontend unit test, lint/build và hai E2E
  Pool/Silo baseline đều pass; runtime invitation/ownership smoke được ghi là kiểm tra kỹ thuật.

Biên bản xác minh APP-02: [`../testing/p-app-invitation-2026-09-01.md`](../testing/p-app-invitation-2026-09-01.md).

## 5. Tiêu chí APP-03

- [x] Project có metadata và lifecycle `ACTIVE/ARCHIVED/DELETED`; archive chuyển sang read-only, restore
  mở lại mutation và delete là soft delete có audit/outbox.
- [x] Project chỉ hiện với user có ProjectMembership; tenant Owner/Admin không mặc nhiên đọc project.
- [x] Manager quản trị member/role tại trang Projects; backend chặn xóa/hạ cấp Manager cuối cùng.
- [x] Dashboard chỉ tính project/task active; board/task/resource mutation cùng chặn archived project.
- [x] Migration application V4, OpenAPI/generated TypeScript và test project lifecycle pass.

## 6. Tiêu chí APP-04

- [x] Manager tạo, đổi tên và soft-delete nhiều board; user chọn project/board trực tiếp trong Kanban.
- [x] Task detail sửa title/description/due date/assignee; delete theo quyền và batch move dùng optimistic
  version, trả `currentVersion` có cấu trúc khi conflict.
- [x] Subtask chỉ được tạo một cấp; backend từ chối tạo con của subtask.
- [x] Comment có create/list/update/soft-delete; author tự quản lý comment, Manager được moderation.
- [x] Project archive cho phép đọc nhưng chặn toàn bộ mutation board/task/comment.
- [x] Migration application V5, OpenAPI/generated TypeScript, backend integration và frontend unit pass.

## 7. Tiêu chí APP-05

- [x] Resource library hỗ trợ file và link HTTP(S) đã validate; link không giả lập object storage.
- [x] User thấy quan hệ task và gắn/gỡ một resource với nhiều task có project authorization.
- [x] Resource soft delete bỏ liên kết trong transaction; file tạo cleanup outbox, link không tạo cleanup
  storage; quota chỉ tính resource còn active.
- [x] Notification UI đọc/cập nhật preference; backend không cho tắt in-app bắt buộc.
- [x] User list/thêm/cập nhật idempotent/xóa push subscription trong tenant. VAPID delivery thật được ghi
  rõ là đang hoãn, không báo giả là đã gửi.
- [x] Migration application V6–V7, OpenAPI/generated TypeScript, integration test và runtime smoke pass.

## 8. Tiêu chí APP-06

- [x] Owner/Admin vào được trạng thái onboarding của đúng workspace để xem payment/provisioning và tiếp
  tục local fake flow; backend vẫn áp quyền và tenant boundary.
- [x] `UserView`/JWT/frontend dùng thống nhất platform role `SYSTEM_ADMIN`; `/admin` là control-plane route,
  không bị bọc bởi tenant shell.
- [x] System Admin lọc tenant theo search/status/placement, thấy payment/provider và provisioning status.
- [x] Dialog chi tiết hiển thị payment, provisioning failure metadata và transition history; retry chỉ mở
  cho trạng thái retryable và backend vẫn là nơi enforce state machine.
- [x] Admin unit/frontend unit, OpenAPI/generated TypeScript và runtime smoke filter/detail pass.

Biên bản xác minh APP-03–APP-06:
[`../testing/p-app-core-workflow-2026-09-01.md`](../testing/p-app-core-workflow-2026-09-01.md).

## 9. Điều kiện mở lại các giai đoạn đang hoãn

APP-01 đến APP-06 và full regression local đã hoàn tất. Đây chỉ là điều kiện kỹ thuật cần, không phải
quyết định tự động mở lại provider thật, VPS, P2 measurement, nghiệm thu diện rộng hay thực nghiệm.
Các hạng mục đó vẫn tạm dừng theo quyết định 2026-09-01 cho đến khi nhóm chủ động phê duyệt bước tiếp
theo. Việc đạt mốc P-App không làm Cổng B hoặc Cổng E đạt.
