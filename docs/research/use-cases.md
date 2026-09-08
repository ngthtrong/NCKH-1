# Đặc tả use case

Các use case dùng mã ổn định để liên kết test. “Hệ thống” luôn suy tenant từ host/session đã xác thực; mọi bước ghi application data chạy trên datasource do resolver chọn.

## UC-01 — Đăng ký và yêu cầu tạo tenant

- **Tác nhân:** người dùng, PaymentProvider, ProvisioningWorker.
- **Tiền điều kiện:** email chưa bị chặn; slug chưa dùng.
- **Luồng chính:** user đăng ký/xác thực → nhập tên/slug và chọn tier/placement → hệ thống tạo tenant `PENDING_PAYMENT` và payment transaction → provider xác nhận server-side → hệ thống ghi outbox/job duy nhất → worker provision → tenant `ACTIVE`; người tạo thành Owner.
- **Ngoại lệ:** slug trùng; payment cancel/expire/fail; callback sai chữ ký/amount/ref; callback trùng; migration lỗi; route lỗi. Tenant không Active; job retry/rollback có audit.
- **Hậu điều kiện:** hoặc tenant Active đầy đủ, hoặc trạng thái lỗi có thể chẩn đoán; không tồn tại hai tenant/job cho cùng idempotency key.
- **Truy vết:** FR-10..11, FR-70..78, SEC-14, REL-01..03.

## UC-02 — Đăng nhập trung tâm và chọn tenant

- **Tác nhân:** user.
- **Tiền điều kiện:** user có active membership ở tenant Active.
- **Luồng chính:** đăng nhập tại `accounts` → liệt kê membership → chọn tenant → server phát transfer code single-use gắn target host → browser chuyển tenant subdomain → subdomain đổi code lấy session tenant → middleware xác minh host=`tid` route, status và membership → mở ứng dụng.
- **Ngoại lệ:** code hết hạn/replay; host bị sửa; membership vừa revoke; tenant suspended. Hệ thống fail closed trước business service và xóa/không cấp phiên.
- **Truy vết:** FR-01..06, SEC-01..08.

## UC-03 — Chuyển đổi tenant

- **Tác nhân:** user tham gia nhiều tenant.
- **Luồng chính:** user quay lại tenant switcher → chọn membership khác → nhận code/session mới tại host đích; cache/query state của frontend được xóa theo tenant boundary.
- **Ngoại lệ:** tenant đích inactive hoặc membership revoke; không tái sử dụng token/cached data tenant nguồn.
- **Truy vết:** FR-02..06, SEC-01..04.

## UC-04 — Mời và quản lý tenant member

- **Tác nhân:** TenantOwner/TenantAdmin; người được mời.
- **Luồng chính:** Owner/Admin tạo invitation email+role → outbox gửi notification → người nhận đăng nhập và accept → tạo membership idempotent → người quản trị có thể đổi role/revoke sau đó.
- **Ngoại lệ:** invitation hết hạn/đã dùng; email khác; duplicate accept; cố demote/revoke owner cuối; invite user đang active.
- **Hậu điều kiện:** một active membership tối đa cho user+tenant; role change/revoke có audit và token cũ mất quyền ở request kế tiếp.
- **Truy vết:** FR-12..16, FR-60, SEC-08.

## UC-05 — Tạo và quản lý project

- **Tác nhân:** active TenantMember; ProjectManager.
- **Luồng chính:** tenant member tạo project → tự thành Manager → Manager cập nhật metadata → thêm active tenant members với role Manager/Member/Viewer → archive/restore hoặc xóa mềm.
- **Ngoại lệ:** thêm user ngoài tenant; xóa Manager cuối; tenant/project ID chéo; archived project bị mutate.
- **Truy vết:** FR-20..25.

## UC-06 — Xây board Kanban

- **Tác nhân:** ProjectManager.
- **Luồng chính:** tạo board → tạo các column → đổi tên/màu tối thiểu → reorder column → archive/delete board.
- **Ngoại lệ:** xóa column còn task mà không chọn column đích; reorder chứa ID khác board/tenant; concurrent reorder conflict.
- **Truy vết:** FR-30..32, FR-45.

## UC-07 — Tạo, giao và di chuyển task

- **Tác nhân:** ProjectManager/ProjectMember; ProjectViewer chỉ đọc.
- **Luồng chính:** tạo task ở column → đặt description/due date/assignee → tạo subtask tối đa một cấp → kéo thả/reorder → server kiểm version và lưu transaction → ghi audit/outbox khi cần.
- **Ngoại lệ:** assignee không thuộc project; parent khác project; tạo subtask cấp hai; stale version trả 409; client gửi column/task tenant khác bị 404/403 theo policy không tiết lộ.
- **Truy vết:** FR-40..45, DATA-04, SEC-12.

## UC-08 — Bình luận task

- **Tác nhân:** Manager/Member; Viewer đọc.
- **Luồng chính:** thêm comment → tạo event notification cho người liên quan → tác giả sửa/xóa comment của mình; Manager moderation có audit.
- **Ngoại lệ:** comment task không thuộc project user; recipient đã revoke; duplicate event. Không gửi chéo tenant.
- **Truy vết:** FR-44, FR-60..63.

## UC-09 — Upload và tái sử dụng resource

- **Tác nhân:** Manager/Member; Viewer tải khi được quyền đọc task/project.
- **Luồng chính:** client xin upload → server kiểm quota/type/size và sinh tenant object key → hoàn tất metadata → link resource với một hoặc nhiều task cùng tenant → khi tải, server authorize và cấp signed URL TTL ngắn.
- **Ngoại lệ:** quota vượt; MIME/size không hợp lệ; key/resource/task chéo tenant; upload dang dở; resource đã xóa. Không cấp URL khi authorization thất bại.
- **Truy vết:** FR-50..55, SEC-13.

## UC-10 — Phát notification đa kênh

- **Tác nhân:** business service, ProvisioningWorker, provider email/Web Push.
- **Luồng chính:** thay đổi aggregate+outbox cùng transaction → worker claim event → resolve active recipient và preference trong tenant → tạo in-app → gửi email/push → lưu delivery result.
- **Ngoại lệ:** provider timeout; subscription invalid; recipient revoke; event duplicate; worker crash sau send. Retry có idempotency/dedupe; không đổi tenant context.
- **Truy vết:** FR-60..63, DATA-05, SEC-03.

## UC-11 — Xử lý callback thanh toán

- **Tác nhân:** PaymentProvider.
- **Luồng chính:** nhận raw callback → xác minh signature/checksum trước mutation → đối chiếu transaction/ref/amount/currency/state → insert provider event unique → cập nhật payment → queue đúng một provisioning job → trả response provider.
- **Ngoại lệ:** signature sai; ref không tồn tại; amount mismatch; event trùng; success sau terminal invalid state; callback đến trước Return URL. Return URL chỉ hiển thị trạng thái truy vấn từ server.
- **Truy vết:** FR-70..74, SEC-14.

## UC-12 — Provision tenant theo ba placement

- **Tác nhân:** ProvisioningWorker.
- **Luồng Pool:** claim job → tạo logical tenant/application seed bằng app migration hiện hành → kiểm health/schema → tạo route → commit `SUCCEEDED` → control plane chuyển Active.
- **Luồng Schema-per-tenant:** claim → cấp schema + runtime role quyền tối thiểu trong shared schema database → chạy migration có history riêng → grant DML → health check → Active.
- **Luồng Silo:** claim → cấp database+least-privilege role → chạy shared application migrations → seed tenant → register encrypted connection route → health check → Active.
- **Ngoại lệ:** crash ở bất kỳ checkpoint; migration fail; connection fail; route conflict. Retry nhận ra tài nguyên đã tồn tại; rollback chỉ xóa tài nguyên chắc chắn thuộc job và chưa chứa dữ liệu user; mọi bước audit.
- **Truy vết:** FR-75..78, REL-01..03.

## UC-13 — Quản trị và xử lý sự cố

- **Tác nhân:** SystemAdmin.
- **Luồng chính:** lọc tenant/payment/job → xem metadata/diagnostic đã redact → retry job hợp lệ hoặc suspend tenant → theo dõi audit và health.
- **Giới hạn:** SystemAdmin không có “impersonate” hoặc tự động đọc project/task/resource trong v1; không force Active khi thiếu step.
- **Truy vết:** FR-74, FR-78, SEC-09, OBS-01..04.

## UC-14 — Quản lý capability và Branding

- **Tác nhân:** SystemAdmin; TenantOwner/TenantAdmin.
- **Luồng chính:** SystemAdmin cấp capability trong giới hạn placement → Owner/Admin bật module → cập nhật màu/logo hợp lệ → giao diện tenant áp dụng cấu hình; mọi thay đổi có version và audit.
- **Ngoại lệ:** capability vượt placement; stale version; role không đủ; logo sai MIME/quá lớn; tắt Approvals khi còn run pending hoặc workflow bật. Server từ chối trước mutation.
- **Truy vết:** FR-80..89, SEC-17, UX-05.

## UC-15 — Tùy biến dữ liệu project

- **Tác nhân:** ProjectManager; ProjectMember; ProjectViewer; CustomizationWorker.
- **Luồng chính:** Manager tạo định nghĩa/field → worker áp dụng DDL bằng tên vật lý do server sinh → Manager/Member CRUD dữ liệu hoặc giá trị Task → Viewer đọc → xóa mềm/khôi phục giữ dữ liệu.
- **Ngoại lệ:** Pool hoặc capability chưa bật; type/option/required sai; stale version; DDL lỗi/retry; role project không đủ; identifier do client chèn. Runtime role không có DDL.
- **Truy vết:** FR-90..99, SEC-18..19, REL-06.

## UC-16 — Phê duyệt Task nhiều bước

- **Tác nhân:** ProjectManager; ProjectMember trong nhóm duyệt.
- **Luồng chính:** Manager cấu hình workflow → user gửi Task → hệ thống chụp snapshot → xử lý tuần tự `ANY`/`ALL` → khi toàn bộ bước đạt, hệ thống đưa Task vào cột hoàn thành và phát event.
- **Ngoại lệ:** tự duyệt; Viewer/người mất quyền; bước rỗng; quyết định đồng thời đến muộn; Task thay đổi; direct/batch move vào cột hoàn thành; reject/withdraw. Backend chặn hoặc invalidates run theo contract.
- **Truy vết:** FR-100..109, SEC-20, REL-07.

## UC-17 — Tự động hóa hữu hạn

- **Tác nhân:** ProjectManager; AutomationWorker.
- **Luồng chính:** Manager tạo rule một trigger–một action → outbox event khớp rule → worker chống trùng, kiểm lại quyền/capability → assign active member hoặc tạo in-app notification → lưu execution.
- **Ngoại lệ:** rule/capability/project bị tắt; recipient mất quyền; retry/trùng event; action vi phạm phê duyệt. Không thực thi code/SQL, tự move Task hoặc phát sinh chuỗi rule.
- **Truy vết:** FR-110..116, SEC-21, REL-08.

## UC-18 — Thí nghiệm cô lập và noisy neighbor

- **Tác nhân:** nhà nghiên cứu/k6.
- **Luồng chính:** seed 3–5 tenant thuộc ba placement → chạy smoke/baseline/load với manifest → chạy adversarial isolation tests → chạy aggressor/victim trước/sau rate limit → lưu raw data/checksum → notebook sinh bảng/biểu đồ. Lượt đo chi phí module/tùy biến được tách riêng.
- **Ngoại lệ:** version/config khác, thiếu metric, run gián đoạn hoặc seed sai. Đánh dấu run invalid có lý do; không trộn vào phân tích.
- **Truy vết:** RQ3, RQ4, PERF-01..05, OBS-05.
