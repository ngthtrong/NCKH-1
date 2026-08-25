
# Kế hoạch triển khai toàn bộ đề tài SaaS đa thuê bao

## 1. Mục tiêu và phạm vi hỗ trợ

Triển khai toàn bộ nội dung trong [plan.md](/home/ngthtrong/NCKH-1/resource/plan.md) dựa trên [thuyetMinhSaasMultiTenancy.md](/home/ngthtrong/NCKH-1/resource/thuyetMinhSaasMultiTenancy.md), theo các cổng nghiệm thu thay vì hạn ngày cố định.

Có thể thực hiện trực tiếp trong repo:

- Nghiên cứu tài liệu, kiểm chứng nguồn, khảo sát sản phẩm và viết báo cáo tổng quan.
- Xây SRS, use case, ma trận quyền, ADR, C4, ERD, sequence diagram và threat model.
- Làm spike lựa chọn cơ chế cô lập, thanh toán và lưu trữ.
- Viết backend, frontend, migration, provisioning, kiểm thử và cấu hình container.
- Xây kịch bản tải, notebook phân tích, biểu đồ, báo cáo thực nghiệm và tài liệu tái lập.
- Chuẩn bị báo cáo khoa học, bản tin, báo cáo tóm tắt, kịch bản demo và video.

Nhóm nghiên cứu chịu trách nhiệm cho các phần cần con người hoặc quyền truy cập bên ngoài: phê duyệt học thuật, tuyển người dùng, đồng thuận tham gia, VPS/domain, tài khoản email và thông tin sandbox thanh toán. Không tạo dữ liệu hoặc kết quả thực nghiệm giả.

## 2. Nền tảng kỹ thuật và kiến trúc

- Dùng monorepo gồm backend Spring, frontend React, hạ tầng, tài liệu nghiên cứu và script thực nghiệm.
- Backend: Java 21, Maven Wrapper, Spring Boot 4.1.x, Spring Security, Spring Data JPA/Hibernate, Flyway và Testcontainers. Spring Boot 4.1.1 hiện là bản ổn định và hỗ trợ Java 21; Hibernate cung cấp `@TenantId`, `MultiTenantConnectionProvider` và `CurrentTenantIdentifierResolver` cho các mô hình phân vùng và nhiều nguồn dữ liệu. [Spring Boot requirements](https://docs.spring.io/spring-boot/system-requirements.html), [Hibernate multi-tenancy](https://docs.hibernate.org/orm/current/userguide/html_single/#multitenacy)
- Frontend: React 19.2, TypeScript, Vite, React Router, TanStack Query, Material UI và dnd-kit. Dùng Node.js 22; Vite hiện yêu cầu Node 20.19+ hoặc 22.12+. [React versions](https://react.dev/versions), [Vite guide](https://vite.dev/guide/)
- Dữ liệu: PostgreSQL 18; một control database, một pooled database và một database riêng cho mỗi tenant Silo.
- Kiến trúc ứng dụng là modular monolith với hai tiến trình dùng chung mã:
  - API process không giữ quyền tạo database.
  - Worker/provisioner process xử lý outbox, thông báo và cấp phát bằng tài khoản đặc quyền riêng.
- Không đưa RabbitMQ, Kafka, Kubernetes hoặc Redis vào v1. Outbox được polling từ PostgreSQL; rate limiting dùng Bucket4j trong bộ nhớ vì chỉ có một API instance.
- Local dùng Docker Compose, `accounts.localhost` và `{tenant}.localhost`. Khi có hạ tầng, triển khai Caddy/reverse proxy, wildcard DNS và TLS bằng DNS-01.
- Quan sát hệ thống bằng Spring Actuator, Micrometer, Prometheus, Grafana và JSON log có `tenant_id`, placement, tier, request ID và correlation ID.

## 3. Các giai đoạn triển khai

### Giai đoạn A — Chuẩn hóa repo và giao thức nghiên cứu

- Xem bản `thuyetMinhSaasMultiTenancy.md` là nguồn chính; không khôi phục hai tệp cũ đang bị xóa và không ghi đè thay đổi hiện có của người dùng.
- Sửa các liên kết cũ trong kế hoạch và tài liệu thuật ngữ; bổ sung README, quy tắc secrets, nhật ký nghiên cứu, risk register, decision log và mẫu ADR.
- Tạo bảng truy vết: câu hỏi nghiên cứu → phương pháp → dữ liệu → chỉ số → sản phẩm → trạng thái.
- Thực hiện tổng quan có cấu trúc từ năm 2015 đến ngày khóa tìm kiếm; lưu search string, cơ sở dữ liệu tìm kiếm, tiêu chí chọn/loại, lý do loại, DOI đã xác minh và BibTeX theo chuẩn IEEE.
- Khảo sát MISA, Base, KiotViet, Jira và Salesforce chỉ bằng tài liệu chính thức.
- Hoàn thiện SRS, use case, ma trận quyền và tiêu chí nghiệm thu trước khi phát triển nghiệp vụ.

**Cổng A:** mọi yêu cầu ứng dụng và tiêu chí đánh giá đều truy được về câu hỏi nghiên cứu hoặc nguồn khảo sát.

### Giai đoạn B — Spike và quyết định kiến trúc

Dựng cùng một lát cắt `Project CRUD` trên Spring/PostgreSQL để so sánh:

1. Điều kiện `tenant_id` tường minh trong repository.
2. Cơ chế tenant toàn cục của Hibernate.
3. PostgreSQL Row-Level Security kết hợp tenant context trong transaction.

Mỗi phương án phải chạy trên Pool và database-per-tenant, migration bằng Flyway, kiểm thử IDOR/truy cập chéo, native query, bulk update, background job và đo latency, RAM, số connection. Loại ngay phương án có bất kỳ truy cập chéo thành công; chấm phần còn lại theo trọng số trong kế hoạch. Nếu đồng điểm, chọn RLS kết hợp application guard.

Khi thử RLS, ứng dụng phải dùng role không phải owner, không có `BYPASSRLS`, bật `FORCE ROW LEVEL SECURITY` và kiểm thử riêng owner/superuser/native query. PostgreSQL xác nhận owner và role `BYPASSRLS` có thể vượt chính sách nếu cấu hình không đúng. [PostgreSQL Row Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

Các spike khác:

- So sánh MinIO/S3-compatible với filesystem có kiểm soát; loại phương án không hỗ trợ namespace tenant, quota và URL có thời hạn an toàn. Nếu ngang điểm, chọn MinIO.
- So sánh VNPay Sandbox và Stripe Test Mode; kiểm chứng credential, chữ ký, webhook trùng và callback giả. Nếu chưa có credential, dùng `FakePaymentProvider` cho kiểm thử và giữ adapter thật ở trạng thái chờ; nếu ngang điểm, ưu tiên VNPay.
- Đo giới hạn Hikari ban đầu: control 5, pool 10, mỗi Silo tối đa 2 connection, đóng pool Silo nhàn rỗi và giới hạn tổng 25 connection.

**Cổng B:** có mã spike, dữ liệu đo, bảng điểm và ADR xác định cơ chế cô lập, payment provider và resource storage.

### Giai đoạn C — Đặc tả kiến trúc và hợp đồng

- Hoàn thiện C4 Context/Container/Component, ba ERD, sequence diagram và threat model.
- Control database chứa `User`, `Tenant`, `TenantMembership`, tier, placement, route, payment và provisioning.
- Pool/Silo dùng chung application schema gồm project, membership, board, column, task, comment, resource, notification, audit và outbox. Mọi bảng nghiệp vụ vẫn có `tenant_id`; không có foreign key xuyên database.
- Dùng UUID, timestamp UTC và `Task.version` cho optimistic locking.
- Luồng đăng nhập:
  - Đăng nhập tại host trung tâm.
  - Chọn tenant và tạo mã chuyển tiếp một lần, hết hạn ngắn.
  - Tenant subdomain đổi mã lấy access JWT theo tenant.
  - Middleware đối chiếu host, `tid` trong token, trạng thái tenant và membership hiện tại trước khi vào service.
- Access token ngắn hạn được giữ trong bộ nhớ frontend; refresh token là cookie `HttpOnly`, `Secure`, host-only. Endpoint refresh có CSRF protection.
- Provisioning là state machine có idempotency key, retry giới hạn, timeout, rollback và audit; tenant chỉ `ACTIVE` sau khi database, role, migration và route đều thành công.
- Không dùng distributed transaction; payment và provisioning dùng saga/state machine, còn thay đổi nghiệp vụ và outbox nằm trong cùng local transaction.

### Giai đoạn D — Phát triển theo lát cắt dọc

Mỗi lát cắt chỉ hoàn tất khi chạy tương đương trên Pool và Silo:

1. Xác thực, tenant, membership, chọn tenant và host–token validation.
2. Payment giả lập, tier, placement và provisioning tự động.
3. Project, vai trò dự án, board, column và Kanban drag-and-drop.
4. Task, một cấp subtask, comment, assignee, due date và optimistic locking.
5. Resource upload/download, liên kết nhiều task, quota và signed URL.
6. In-app notification, email qua Mailpit/SMTP adapter và Web Push bằng VAPID.
7. Audit trail, rate limiting và màn hình quản trị tenant/payment/provisioning.
8. Responsive UI cho Owner/Admin/Member/Manager/Viewer, có trạng thái loading, empty, error, conflict và retry.

API REST đặt dưới `/api/v1`; xuất OpenAPI và sinh TypeScript types cho frontend. API nghiệp vụ tuyệt đối không nhận `tenant_id` làm nguồn phân quyền.

Các hợp đồng lõi phải được hiện thực:

- `TenantContext`, `TenantPlacement`, `TenantDataSourceResolver`.
- `PaymentProvider`, `ProvisioningService`, `ResourceStorage`.
- `NotificationDispatcher`, `TenantEvent`.
- Trạng thái tenant: `PENDING_PAYMENT → PROVISIONING → ACTIVE`, với nhánh `FAILED` hoặc `SUSPENDED`.
- Trạng thái provisioning: `QUEUED → RUNNING → SUCCEEDED`, với `RETRYABLE_FAILED` hoặc `FAILED_ROLLED_BACK`.

### Giai đoạn E — Triển khai, kiểm thử và thực nghiệm

- Docker Compose cung cấp PostgreSQL, API, worker, web/reverse proxy, MinIO, Mailpit, Prometheus và Grafana; secrets thật không được commit.
- GitHub Actions chạy backend test, frontend test, lint, build, migration validation, dependency scan và container build.
- Kiểm thử:
  - JUnit/Spring Boot Test/Testcontainers cho unit, integration và provisioning.
  - Vitest/Testing Library cho frontend; Playwright cho luồng end-to-end.
  - Ma trận role tenant/project, sửa host/token/payload, IDOR, file key, token cũ sau thu hồi membership, webhook giả/trùng, job sai tenant và RLS bypass.
  - Kiểm thử migration cho control, pool và nhiều phiên bản Silo.
- Dùng k6 cho smoke, baseline, load, stress và noisy-neighbor; cấu hình nhiều scenario và threshold theo tenant. [k6 performance testing](https://grafana.com/docs/k6/latest/examples/get-started-with-k6/test-for-performance/)
- Pilot trên đúng cấu hình VPS để khóa SLO; không đặt số p95 giả trước khi có pilot.
- Thực nghiệm chính dùng 3–5 tenant, 10–20 virtual users/tenant, cùng seed và workload cho Pool/Silo; mỗi kịch bản lặp nhiều lần và lưu median, p95, throughput, error rate, connection, CPU và RAM.
- Dữ liệu thô ghi CSV/JSON kèm manifest về commit, image digest, VPS, phiên bản phần mềm, seed và tham số tải. Notebook Python tái tạo toàn bộ bảng/biểu đồ; bước QA kiểm tra thiếu dữ liệu, timestamp, ngoại lệ, cỡ mẫu và tính so sánh.
- Thử noisy neighbor trước/sau rate limiting và báo cáo ảnh hưởng lên tenant nạn nhân, không chỉ tenant gây tải.
- Đánh giá người dùng dùng bộ tác vụ chuẩn, SUS và câu hỏi mở; chỉ lưu dữ liệu đã ẩn danh. Nhóm trực tiếp tuyển người, lấy đồng thuận và nhập dữ liệu thu được.

**Cổng E:** không có truy cập chéo tenant thành công; provisioning retry không tạo tài nguyên trùng; môi trường dựng lại được từ hướng dẫn; kết quả thực nghiệm sinh lại được từ dữ liệu thô.

### Giai đoạn F — Tổng hợp và bàn giao

- Trả lời riêng từng câu hỏi nghiên cứu bằng bảng truy vết và bằng chứng tương ứng.
- Phân biệt kết quả đo, suy luận, giới hạn và nội dung chưa kiểm chứng.
- Bàn giao mã nguồn, migrations, compose, cấu hình mẫu, seed, test, k6, notebook, dashboard và runbook backup/restore.
- Hoàn thiện báo cáo tổng quan, SRS, ADR, đặc tả kiến trúc, báo cáo kiểm thử, báo cáo khoa học, báo cáo tóm tắt, bản tin và kịch bản video hai phút.
- Demo cuối gồm một tenant Pool, một tenant Silo, cùng nghiệp vụ Kanban, một tấn công chéo bị từ chối, provisioning idempotent và dashboard tenant-aware.

## 4. Tiêu chí chấp nhận

- Cùng endpoint, DTO, service và quy tắc nghiệp vụ hoạt động trên cả Pool và Silo.
- Không đọc, ghi, xóa, tải tệp hoặc gửi thông báo chéo tenant trong bất kỳ kiểm thử tự động nào.
- Token tenant A trên subdomain B bị chặn trước tầng nghiệp vụ.
- Membership bị thu hồi làm token cũ mất quyền truy cập.
- Callback thanh toán giả bị từ chối; callback trùng không tạo provisioning trùng.
- Migration thất bại không để tenant ở trạng thái `ACTIVE`; retry hoặc rollback có audit đầy đủ.
- Kịch bản optimistic locking trả conflict rõ ràng và không ghi đè im lặng.
- Rate limiter phân biệt tenant/tier và giảm tác động noisy neighbor theo SLO đã khóa sau pilot.
- Một thành viên khác có thể clone repo, chạy một lệnh khởi động local, seed tenant Pool/Silo và chạy toàn bộ test mà không cần secret thật.

## 5. Giả định và mặc định đã khóa

- Tài liệu và báo cáo viết bằng tiếng Việt; mã, tên API và commit dùng tiếng Anh; tài liệu tham khảo theo IEEE.
- Không có hạn cứng nên ưu tiên bằng chứng tái lập và hoàn thành theo cổng nghiệm thu.
- Phát triển local-first; VPS, domain, TLS và provider sandbox được tích hợp khi nhóm cung cấp.
- Không chuyển tenant giữa Pool và Silo sau khi đã có dữ liệu.
- Không triển khai mobile, microservice, Kubernetes, autoscaling, cộng tác thời gian thực hoặc full-stack silo.
- Dữ liệu người tham gia và secrets không được commit; repo chỉ chứa dữ liệu đã ẩn danh hoặc tổng hợp.
- Các phiên bản phụ thuộc được khóa bằng Maven/npm lockfile và cập nhật chỉ qua ADR hoặc pull request riêng.
