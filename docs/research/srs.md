# Đặc tả yêu cầu phần mềm (SRS)

**Baseline:** v0.1 — 2026-08-25  
**Nguồn phạm vi:** bản thuyết minh và kế hoạch thực hiện  
**Ngôn ngữ giao diện/tài liệu:** tiếng Việt; API, code và identifier: tiếng Anh

## 1. Mục đích, phạm vi và tác nhân

Hệ thống là ứng dụng web quản lý công việc Kanban đa thuê bao cho nhóm đại học. Một tài khoản có thể tham gia nhiều tenant. Control plane dùng chung quản lý danh tính, tenant, tier, payment và provisioning; application plane dùng cùng nghiệp vụ trên shared-schema Pool hoặc database-per-tenant Silo.

Tác nhân:

- `SystemAdmin`: vận hành control plane, không mặc nhiên đọc dữ liệu nghiệp vụ tenant.
- `TenantOwner`, `TenantAdmin`, `TenantMember`: vai trò tại workspace.
- `ProjectManager`, `ProjectMember`, `ProjectViewer`: vai trò tại project, độc lập với role tenant.
- `PaymentProvider`, `EmailProvider`, `WebPushService`, `ProvisioningWorker`.

## 2. Yêu cầu chức năng

### 2.1 Danh tính và phiên theo tenant

| ID | Yêu cầu | Tiêu chí chấp nhận chính |
| --- | --- | --- |
| FR-01 | User đăng ký/đăng nhập tại host trung tâm | Credentials không đi qua tenant host; lỗi không làm lộ tài khoản tồn tại ngoài policy đã chọn |
| FR-02 | User xem danh sách active membership của chính mình | Không trả tenant đã revoke/suspended trừ trạng thái cần hiển thị rõ |
| FR-03 | User chọn tenant và nhận transfer code một lần | Code có TTL ngắn, single-use, gắn user+tenant+target host |
| FR-04 | Tenant host đổi transfer code lấy access/refresh session | Host phải khớp tenant route; code replay bị từ chối |
| FR-05 | User chuyển tenant mà không dùng lại token tenant cũ | Access token mới có `tid`, tier, placement/role claims tối thiểu; server vẫn kiểm membership hiện tại |
| FR-06 | User refresh/logout phiên tenant | Refresh cookie host-only, HttpOnly, Secure ở HTTPS; refresh có CSRF protection; logout thu hồi token family |

### 2.2 Tenant và membership

| ID | Yêu cầu | Tiêu chí chấp nhận chính |
| --- | --- | --- |
| FR-10 | Mọi user đã xác thực có thể yêu cầu tạo tenant và chọn tier/placement được cung cấp | Slug/subdomain chuẩn hóa, duy nhất, không dùng từ cấm |
| FR-11 | Người tạo tenant trở thành `TenantOwner` sau khi tenant Active | Không có tenant active mà thiếu owner |
| FR-12 | Owner/Admin mời user bằng email và role tenant | Invitation có TTL, trạng thái, tenant scope và token không đoán được |
| FR-13 | Người được mời chấp nhận/từ chối lời mời | Chỉ đúng người/token; xử lý idempotent |
| FR-14 | Owner/Admin đổi role hoặc revoke membership | Không thể revoke/demote owner cuối; token cũ mất quyền ở request kế tiếp |
| FR-15 | Owner quản lý tier/billing metadata và suspend/delete tenant theo policy | Thao tác nguy hiểm có confirm, audit; delete vật lý ngoài v1, dùng lifecycle state |
| FR-16 | Owner có thể chuyển ownership cho active member | Transaction nguyên tử; luôn đúng một owner baseline |

### 2.3 Project và project membership

| ID | Yêu cầu | Tiêu chí chấp nhận chính |
| --- | --- | --- |
| FR-20 | Active tenant member tạo project và trở thành `ProjectManager` | Project lấy tenant từ context, không từ payload |
| FR-21 | Manager sửa metadata, archive/restore project | Archive chặn mutation nội dung, vẫn cho đọc theo policy |
| FR-22 | Manager thêm/xóa active tenant member khỏi project và gán role | Không thể thêm user ngoài tenant; project luôn còn ít nhất một Manager |
| FR-23 | User chỉ liệt kê/xem project mà mình có ProjectMembership | Tenant Owner/Admin không tự có quyền đọc nội dung project |
| FR-24 | Manager xóa mềm project | Có audit; không xóa vật lý trong request |
| FR-25 | Quyền project được áp dụng server-side theo ma trận | Mọi endpoint project có allow/deny tests |

### 2.4 Board, column và task

| ID | Yêu cầu | Tiêu chí chấp nhận chính |
| --- | --- | --- |
| FR-30 | Manager tạo/sửa/xóa mềm board; project có thể có nhiều board | Không xóa board ngoài tenant/project context |
| FR-31 | Manager tạo/sửa/reorder/xóa column | Position ổn định; không xóa column còn task nếu chưa chọn đích chuyển |
| FR-32 | Project member xem board theo role | Viewer chỉ đọc; response không chứa tenant khác |
| FR-40 | Manager/Member tạo task trong board/column | Title bắt buộc; tenant/project/board/column kiểm tra cùng aggregate |
| FR-41 | Manager/Member sửa title, description, due date, assignee và di chuyển task | Assignee là active project member; dùng `version` optimistic locking |
| FR-42 | Chỉ Manager xóa mềm task; Member được hoàn tất/di chuyển task | Conflict trả HTTP 409 với version hiện tại tối thiểu |
| FR-43 | Task có tối đa một cấp subtask | Parent và child cùng project; child không có child |
| FR-44 | Manager/Member bình luận; tác giả sửa/xóa comment mình, Manager moderation | Audit moderation; Viewer chỉ đọc |
| FR-45 | Reorder/move task bằng API batch có version | Không chấp nhận column/project ID chéo tenant; transaction nguyên tử trong một board |

### 2.5 Resource

| ID | Yêu cầu | Tiêu chí chấp nhận chính |
| --- | --- | --- |
| FR-50 | Manager/Member upload file hoặc tạo link resource trong tenant namespace | Validate size/type/name; object key sinh server-side, không tin key client |
| FR-51 | Một resource có thể liên kết nhiều task cùng tenant | Không link chéo tenant; project access được kiểm tra |
| FR-52 | Authorized project member tải resource qua URL thời hạn ngắn | API authorize metadata trước khi cấp URL; không công khai bucket/object key thô |
| FR-53 | Uploader hoặc Manager xóa mềm resource/link theo policy | Tệp chỉ xóa vật lý khi không còn link và retention cho phép |
| FR-54 | Quota được áp dụng theo tenant/tier | Concurrent upload không vượt quota do race |
| FR-55 | Owner/Admin xem metadata mức dùng storage, không mặc nhiên xem nội dung project | Chỉ số không làm lộ tên/nội dung file nếu không có project role |

### 2.6 Notification và audit

| ID | Yêu cầu | Tiêu chí chấp nhận chính |
| --- | --- | --- |
| FR-60 | Sự kiện invite, assignment, comment, status, due/overdue tạo in-app notification | Recipient phải là active member trong đúng tenant |
| FR-61 | User chọn preference cho in-app/email/Web Push | In-app cho event bắt buộc theo policy; email/push opt-in/out được tôn trọng |
| FR-62 | Worker gửi email qua SMTP adapter và push qua VAPID adapter | Retry có giới hạn; delivery result lưu; payload tối thiểu, không chéo tenant |
| FR-63 | Thay đổi auth, role, payment, provisioning và nghiệp vụ quan trọng tạo audit event | Append-only ở API; có tenant, actor, action, target, timestamp, correlation ID |

### 2.7 Payment, provisioning và quản trị

| ID | Yêu cầu | Tiêu chí chấp nhận chính |
| --- | --- | --- |
| FR-70 | Hệ thống tạo payment session qua `PaymentProvider` | Local/test dùng fake; không giao dịch tiền thật |
| FR-71 | Callback/webhook được xác minh server-side | Chữ ký/checksum, amount/currency/ref/status được đối chiếu; Return URL không kích hoạt provisioning |
| FR-72 | Callback hợp lệ được xử lý idempotent | Provider event/ref unique; duplicate không tạo transaction/job mới |
| FR-73 | Payment thành công queue một provisioning job | Local transaction ghi state+outbox/job; retry không nhân bản |
| FR-74 | Admin/Owner xem payment/provisioning status phù hợp quyền | Không lộ secret/raw sensitive payload |
| FR-75 | Worker cấp Pool logic hoặc Silo database/role/schema/migration/route | API process không có quyền create DB; worker dùng credential đặc quyền riêng |
| FR-76 | Provisioning checkpoint, timeout, retry và compensating rollback | Mỗi step idempotent; lỗi migration không cho tenant Active |
| FR-77 | Tenant chỉ Active sau khi placement, schema/migration và route đều sẵn sàng | State transition được kiểm tra, audit và chống out-of-order |
| FR-78 | SystemAdmin xem/lọc tenant, payment và provisioning, retry job hợp lệ | Không có nút bỏ qua xác minh payment hoặc force Active thiếu điều kiện |

## 3. Yêu cầu dữ liệu và kiến trúc

| ID | Yêu cầu |
| --- | --- |
| DATA-01 | ID là UUID; thời gian lưu UTC; API dùng ISO-8601; money dùng minor unit integer + currency. |
| DATA-02 | Mọi bảng application plane có `tenant_id`, kể cả Silo; unique/index nghiệp vụ bắt đầu bằng hoặc chứa `tenant_id` khi cần scope tenant. |
| DATA-03 | Không có foreign key xuyên control/application database hoặc giữa các database Silo. Cross-plane ID được kiểm tra ở service và audit. |
| DATA-04 | `Task.version` dùng optimistic locking; soft-delete records có `deleted_at`/actor khi áp dụng. |
| DATA-05 | Outbox event và thay đổi aggregate cùng local transaction; event có tenant, actor, type, version, correlation ID. |
| ARC-01 | Modular monolith có hai process dùng chung code: API và worker/provisioner. |
| ARC-02 | Control database tách application data; một pooled DB; một DB cho mỗi tenant Silo. |
| ARC-03 | `TenantDataSourceResolver` là đường duy nhất chọn Pool/Silo; business service không tự chọn connection. |
| ARC-04 | Cơ chế isolation Pool do spike chọn; bất kể lựa chọn vẫn cần application guard và negative tests. |
| ARC-05 | Cùng REST endpoint/DTO/service/business rules chạy cho Pool và Silo. |
| ARC-06 | Không dùng distributed transaction, broker, Redis hay Kubernetes trong v1. |
| ARC-07 | API dưới `/api/v1`; OpenAPI là contract; TypeScript types được sinh từ contract. |

## 4. Yêu cầu bảo mật

| ID | Yêu cầu/acceptance |
| --- | --- |
| SEC-01 | Host/subdomain, token `tid`, route và resolved tenant phải khớp trước controller/service nghiệp vụ. |
| SEC-02 | Không dùng `tenant_id` từ body/query/header tự do làm nguồn authorization. |
| SEC-03 | Tenant context bắt buộc trong request và background job; thiếu/sai context fail closed. |
| SEC-04 | Tenant phải Active và membership hiện tại active ở mỗi request nghiệp vụ. |
| SEC-05 | Authorization là giao của tenant membership, project membership và action policy; UI không phải enforcement point. |
| SEC-06 | Access token ngắn hạn ở memory; refresh token host-only HttpOnly Secure cookie; CSRF protection cho cookie-auth endpoints. |
| SEC-07 | Password hash bằng thuật toán framework khuyến nghị; rate limit login và endpoint tốn tài nguyên; lỗi không lộ secret. |
| SEC-08 | Revoke/role change làm phiên cũ mất quyền ở request kế tiếp qua membership/version check hoặc session revocation. |
| SEC-09 | Log không chứa password, access/refresh/transfer token, payment secret, signed URL đầy đủ hoặc sensitive payload. |
| SEC-10 | Nếu dùng RLS: app role không owner, không superuser, không `BYPASSRLS`; bảng bật `ENABLE` và `FORCE ROW LEVEL SECURITY`. |
| SEC-11 | Test riêng owner/superuser/native query/bulk update/background job và transaction context; connection trả pool phải xóa tenant setting. |
| SEC-12 | Tất cả IDOR list/get/update/delete và search/export phải có negative cross-tenant tests. |
| SEC-13 | Storage namespace/quota/download authorize theo tenant; object key do server sinh; signed URL TTL ngắn. |
| SEC-14 | Payment callback verify signature/checksum, replay/duplicate, ref, amount, currency và state transition server-side. |

## 5. Yêu cầu hiệu năng, tin cậy và quan sát

| ID | Yêu cầu/acceptance |
| --- | --- |
| PERF-01 | Hỗ trợ workload thí nghiệm 3–5 tenant, 10–20 VU/tenant; đây là cấu hình test, không phải tuyên bố capacity. |
| PERF-02 | SLO p95/error/throughput được ghi bằng ADR/config sau pilot đúng VPS; trước pilot là `PENDING_DATA`. |
| PERF-03 | Rate limiter theo tenant+tier; một tenant không tiêu quota tenant khác; trả 429 và retry hint phù hợp. |
| PERF-04 | Budget Hikari khởi đầu: control 5, pooled 10, mỗi Silo tối đa 2, tổng tối đa 25; hiệu chỉnh chỉ từ pilot. |
| PERF-05 | Noisy-neighbor test đo victim và aggressor trước/sau limiter với cùng seed/workload. |
| REL-01 | Provisioning idempotent theo key; retry không tạo DB/role/route/job trùng. |
| REL-02 | State transition tenant/provisioning được kiểm tra; event sai thứ tự không quay ngược trạng thái thành công. |
| REL-03 | Migration failure giữ tenant ngoài Active và tạo audit/diagnostic không chứa secret. |
| REL-04 | Backup/restore được thử cho control, pool và ít nhất một Silo trước bàn giao. |
| REL-05 | Idle Silo pools được đóng; exhaustion/timeout fail có kiểm soát và metric. |
| OBS-01 | JSON log có timestamp, level, service/process, request ID, correlation ID, tenant ID, tier, placement; field nhạy cảm bị redact. |
| OBS-02 | HTTP latency/count/error và job metrics có chiều tenant/tier/placement trong phạm vi cardinality đã duyệt. |
| OBS-03 | Health check phân biệt liveness/readiness; dependency lỗi không được báo ready giả. |
| OBS-04 | Dashboard có tổng quan và drill-down tenant-aware; quyền xem metric được giới hạn. |
| OBS-05 | Mỗi experimental run lưu raw output và manifest đủ tái lập. |

## 6. Yêu cầu trải nghiệm và vận hành

| ID | Yêu cầu/acceptance |
| --- | --- |
| UX-01 | SPA tiếng Việt responsive trên desktop/tablet/mobile browser; không xây native mobile. |
| UX-02 | Mọi màn danh sách/chi tiết/form có trạng thái loading, empty, validation, forbidden, error và retry phù hợp; không hiển thị dữ liệu tenant trước trong lúc switch. |
| UX-03 | Optimistic-lock conflict hiển thị lựa chọn tải bản mới/thử lại và giữ nội dung người dùng có thể sao chép; không overwrite im lặng. |
| UX-04 | Nghiệp vụ/UI cốt lõi giống nhau trên Pool/Silo; placement chỉ hiển thị ở ngữ cảnh quản trị/giải thích phù hợp. |
| OPS-01 | Clone sạch khởi động local, migration và seed tenant Pool/Silo bằng một lệnh được tài liệu hóa, không cần provider secret thật. |
| OPS-02 | Repo chỉ có `.env.example`/secret reference; CI secret scan chặn credential/token/key. |
| OPS-03 | CI chạy backend/frontend unit+integration, lint/build, migration validation, dependency scan và container build. |
| OPS-04 | API/worker/web cùng release compatibility; migration có quy trình upgrade/rollback/restore được thử. |
| OPS-05 | Production-like deployment hỗ trợ reverse proxy, wildcard DNS và TLS DNS-01 khi nhóm cung cấp domain/credential. |

## 7. Trạng thái và bất biến

Tenant state: `PENDING_PAYMENT → PROVISIONING → ACTIVE`; nhánh `FAILED`, `SUSPENDED`. Không có transition trực tiếp `PENDING_PAYMENT → ACTIVE`.

Provisioning state: `QUEUED → RUNNING → SUCCEEDED`; lỗi có `RETRYABLE_FAILED` hoặc `FAILED_ROLLED_BACK`. Chỉ `SUCCEEDED` mới cho phép tenant Active.

Bất biến:

1. Một tenant có đúng một placement cố định sau khi có application data.
2. Một tenant luôn có đúng một owner baseline; owner cuối không thể bị xóa/demote.
3. Project luôn thuộc một tenant và có ít nhất một Manager khi active.
4. Mọi quan hệ Board/Column/Task/Comment/Resource được kiểm tra cùng tenant và project.
5. SystemAdmin không mặc nhiên có quyền đọc application data.

## 8. Điều kiện hoàn tất

- Toàn bộ ô nhạy cảm trong permission matrix có allow và deny tests.
- Cùng contract test đạt trên Pool và Silo.
- Không test cross-tenant nào đọc/ghi/xóa/tải/gửi thành công.
- Duplicate callback/job không tạo provisioning/resource trùng.
- Optimistic conflict trả 409, không lost update.
- Clone sạch có thể chạy local/seed/test không cần secret thật.
- Kết quả hiệu năng và người dùng chỉ được báo khi có raw data, manifest và giới hạn rõ.
