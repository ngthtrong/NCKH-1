# Checklist mở rộng Bridge và tùy biến tenant

**Khởi tạo:** 2026-09-07; **đóng local:** 2026-09-08  
**Phạm vi:** local, sau checkpoint P-App `c226676`  
**Trạng thái tổng:** hoàn tất local; bằng chứng tổng hợp tại
[`extension-local-2026-09-08.md`](../testing/extension-local-2026-09-08.md)

## 1. Ranh giới checkpoint

- APP-01–APP-06 tiếp tục là lịch sử hoàn tất local của phiên bản `POOL` + `SILO_DATABASE`; không sửa trạng thái hoặc biên bản cũ bằng kết quả phần mở rộng.
- Phần mở rộng dùng ba placement `POOL`, `SCHEMA_PER_TENANT`, `SILO_DATABASE` và bốn capability `BRANDING`, `CUSTOM_DATA`, `APPROVALS`, `AUTOMATION`.
- Mỗi lát cắt phải có backend, OpenAPI, frontend và kiểm tra tương ứng trước khi đánh dấu hoàn tất local.
- Provider thật, VPS/Internet, P2 measurement, pilot, SLO, thực nghiệm và khảo sát người dùng không nằm trong checkpoint này.
- Test và fixture local không phải dữ liệu nghiên cứu hay bằng chứng nghiệm thu production.

## 2. Trạng thái mốc

| Mốc | Nội dung | Trạng thái | Bằng chứng đóng mốc |
|---|---|---|---|
| EXT-01 | Placement Schema-per-tenant | **Hoàn tất local** | Provisioning/migration/isolation integration, runtime Compose và nghiệp vụ lõi ba placement |
| EXT-02 | Capability và Branding | **Hoàn tất local** | Placement matrix, quyền System Admin/Owner/Admin, server guard, UI và tenant logo/color isolation |
| EXT-03 | Bảng/field mở rộng | **Hoàn tất local** | Job DDL, CRUD/validation/soft-delete, Schema/Silo và frontend metadata form |
| EXT-04 | Phê duyệt nhiều bước | **Hoàn tất local** | ANY/ALL, snapshot, concurrency, completion guard, invalidation và workflow disable |
| EXT-05 | Tự động hóa hữu hạn | **Hoàn tất local** | Trigger/action, idempotency/retry, capability recheck, no-chain và approval interaction |
| EXT-06 | Tích hợp và đóng checkpoint | **Hoàn tất local** | Full backend/frontend/E2E, OpenAPI drift, upgrade, tài liệu và biên bản local |

## 3. EXT-01 — Placement Schema-per-tenant

- [x] `SCHEMA_PER_TENANT` có trong contract, onboarding, session/admin view, metric và cấu hình local.
- [x] Một shared schema database chứa ít nhất hai tenant có schema và runtime role riêng do server sinh.
- [x] Provisioning đi đến `ACTIVE`; Flyway history/schema version độc lập và runtime role không có DDL.
- [x] Resolver/executor chọn đúng database/schema/credential, đặt context theo transaction và không rò context khi tái sử dụng connection sau commit/rollback.
- [x] Cả truy vấn thông thường và truy vấn ghi rõ schema tenant khác đều bị từ chối.
- [x] Retry/rollback chỉ dọn schema và role của tenant lỗi; tenant khác vẫn hoạt động.
- [x] Nghiệp vụ lõi, host/token, IDOR, file, notification và background job chạy đúng trên ba placement.

## 4. EXT-02 — Capability và Branding

- [x] Giới hạn placement được enforce phía server: Pool chỉ Branding; Schema có Branding/Custom data; Silo có cả bốn capability.
- [x] System Admin cấp/thu hồi từng capability có version và audit; giá/tier không tự thay grant.
- [x] Owner/Admin bật/tắt module đã được cấp; vai trò tenant không vượt quyền nội dung project.
- [x] API và worker kiểm capability hiện hành; gọi API trực tiếp không vượt được UI gate.
- [x] Tenant mới có Branding mặc định; tenant cũ nhận giao diện mặc định và module mới không tự bật.
- [x] Màu hợp lệ và logo PNG/JPEG/WebP tối đa theo contract được lưu trong namespace tenant; HTML/CSS/JavaScript bị loại khỏi đầu vào.
- [x] Branding tenant không lẫn nhau; host tài khoản trung tâm giữ giao diện chung.
- [x] Thu hồi/tắt capability giữ dữ liệu/lịch sử theo chính sách; Approvals không thể tắt khi còn pending hoặc workflow đang bật.

## 5. EXT-03 — Bảng/field mở rộng

- [x] Manager tạo định nghĩa Task/entity và field text/number/boolean/date/single-select theo project.
- [x] Worker tạo bảng/cột SQL thật bằng tên vật lý từ ID; runtime role chỉ có DML và không thay đổi `tasks` lõi.
- [x] API chỉ dùng definition/field `ACTIVE`; job `QUEUED/RUNNING/SUCCEEDED/FAILED`, retry và lỗi DDL phản ánh đúng trạng thái.
- [x] Manager/Member/Viewer và Owner/Admin tuân thủ ma trận quyền project cho cấu trúc, CRUD và xóa.
- [x] Validation kiểu, option, required, immutable type và optimistic version chạy phía server.
- [x] Xóa/khôi phục definition/field/record là mềm; dữ liệu vật lý được giữ.
- [x] Thu hồi Custom data chặn ghi/thay đổi cấu trúc nhưng dữ liệu hiện hữu vẫn đọc được theo quyền project.
- [x] Frontend dựng form từ metadata cho bảng mới và field Task; OpenAPI/TypeScript đồng bộ.
- [x] Migration lõi/nâng cấp tenant không ghi đè dữ liệu tùy biến.

## 6. EXT-04 — Phê duyệt nhiều bước

- [x] Manager cấu hình workflow theo board/cột hoàn thành, bước tuần tự và nhóm `ANY`/`ALL`.
- [x] Submit lưu snapshot Task/workflow/approver, loại người gửi; bước rỗng bị từ chối.
- [x] Chỉ người đang active, thuộc Manager/Member và thuộc bước hiện hành được quyết định; Viewer/người gửi/người mất quyền bị chặn.
- [x] `ANY`, `ALL`, reject, withdraw và resubmit từ bước đầu cho kết quả đúng.
- [x] Version/lock chặn quyết định đồng thời đến muộn; lịch sử quyết định không bị viết lại.
- [x] Backend chặn create/update/direct move/batch move vào cột hoàn thành khi chưa duyệt.
- [x] Thay đổi nội dung Task hoặc custom value làm run hiện hành `PENDING`/`APPROVED` mất hiệu lực; Task trong cột hoàn thành phải chuyển ra trước khi sửa.
- [x] Manager thay approver ở bước chưa hoàn tất có audit; quyết định cũ được giữ và người thay cần quyết định riêng.
- [x] Sửa workflow chỉ áp dụng lần submit sau; disable capability tuân thủ điều kiện an toàn.
- [x] UI hỗ trợ cấu hình, submit/withdraw/approve/reject và xem lịch sử.

## 7. EXT-05 — Tự động hóa hữu hạn

- [x] Rule thuộc project có đúng một trigger và một action trong tập hữu hạn.
- [x] Trigger Task created/moved và Approval approved/rejected lọc đúng board/cột.
- [x] Action chỉ assign active member hoặc tạo in-app notification cho người nhận hợp lệ.
- [x] Không di chuyển Task, thực thi code/SQL hoặc tạo chuỗi trigger từ action automation.
- [x] Outbox event + rule là khóa chống trùng; execution lưu rule version, attempts, kết quả và lỗi.
- [x] Worker kiểm lại capability, module, project, rule và người nhận khi chạy; thu hồi capability ngăn lượt mới.
- [x] Assign cùng người là no-op; assign khác người tuân thủ approval invalidation.
- [x] Rule không sửa tại chỗ; disable giữ execution history; UI cho tạo/tắt/xem lịch sử.

## 8. EXT-06 — Tích hợp và đóng checkpoint

- [x] Nâng cấp volume/tenant Pool và Silo hiện hữu lên migration mới không tái tạo database hoặc mất dữ liệu.
- [x] Lỗi một schema/migration không làm sai version/trạng thái tenant khác.
- [x] Backend full test, frontend API drift/lint/unit/build và Playwright E2E đều đạt.
- [x] Runtime Compose có ba placement `ACTIVE`, health sạch và smoke extension qua reverse proxy đạt.
- [x] SRS, quyền, truy vết, ERD, sequence, ADR, OpenAPI, plan và project status thống nhất.
- [x] Biên bản [`../testing/extension-local-2026-09-08.md`](../testing/extension-local-2026-09-08.md) ghi lệnh, kết quả thật, giới hạn và tồn đọng.
- [x] `git diff --check` sạch; hai tài liệu Word chưa theo dõi và các diff có trước được bảo toàn.

## 9. Công việc sau checkpoint local

1. Hoàn thiện scheduler nhắc hạn, email/Web Push thật, payment sandbox và môi trường Internet.
2. Chốt VPS thuê hoặc máy cá nhân tự host bằng cấu hình và điều kiện vận hành cụ thể trước pilot.
3. Đăng ký protocol bổ sung rồi mới đo ba placement; tách lượt đo chi phí module/tùy biến.
4. Chạy pilot, khóa SLO, thực nghiệm/noisy-neighbor, đánh giá người dùng và hoàn thiện hồ sơ nghiệm thu.
