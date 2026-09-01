# Điểm khôi phục triển khai đề tài

**Cập nhật:** 2026-09-01 (UTC)
**Nhánh đang làm:** `main`
**Commit nền trước giai đoạn P-App hiện tại:** `8309f03` (`p2 2`)
**Trạng thái:** P0 và các ưu tiên hardening P1 đã hoàn tất local trong phạm vi biên bản. P2 đã có
protocol/evidence gate, guarded Project CRUD 3 ứng viên × Pool/Silo và guard-omission matrix local;
matrix ghi 6 leak cho explicit/Hibernate trên Pool, RLS chặn 3/3 đường omission, nhưng chưa có hồ sơ
loại checksum-backed, raw measurement, score hoặc ADR được chấp nhận. Theo quyết định của nhóm ngày
2026-09-01, ưu tiên chuyển sang hoàn thiện `apps/api` và `apps/web` với đầy đủ tính năng chính cùng các
luồng nghiệp vụ cơ bản. Checklist P-App đã khóa; APP-01 đến APP-06 đã hoàn tất trên stack local và full
regression giữ nguyên các baseline tối thiểu. Triển khai VPS, tích hợp provider thật, spike/đo chính
thức, kiểm thử nghiệm thu diện rộng, thực nghiệm và đánh giá người dùng vẫn tạm dừng cho đến quyết định
tiếp theo của nhóm.

Tài liệu này là điểm bắt đầu cho phiên làm việc tiếp theo. Nó phân biệt rõ mã đã hiện thực, kiểm tra đã chạy, phần mới chỉ là khung và phần bắt buộc phải chờ dữ liệu/hạ tầng thật.

## 1. Nguồn sự thật và nguyên tắc bảo toàn

- Thuyết minh chính: [`resource/thuyetMinhSaasMultiTenancy.md`](../resource/thuyetMinhSaasMultiTenancy.md).
- Kế hoạch thực hiện: [`resource/plan.md`](../resource/plan.md).
- Không khôi phục hai file người dùng đang chủ động xóa: `resource/important.md` và `resource/thuyet_minh_SaaS.md`.
- `draft.md` không còn tồn tại tại checkpoint; nếu người dùng tạo lại file này thì không được ghi đè khi chưa kiểm tra nội dung.
- Phần P1 local đã được commit tại `71b8092`; protocol/evidence gate, isolation harness và hai biên bản
  chuẩn bị P2 đầu đã được commit tại `2b430b7`. Guard-omission matrix, evidence elimination gate và biên
  bản P2 lượt 3 đã được commit tại `8309f03`. `main` và `origin/main` cùng trỏ tới `8309f03` tại thời
  điểm bắt đầu P-App; phiên sau vẫn phải đọc `git status --short` vì trạng thái có thể đã thay đổi.
- Không tạo số đo, DOI, kết quả khảo sát, SUS hoặc kết quả thực nghiệm giả. Mục có nhãn `UNVERIFIED` phải tiếp tục giữ nhãn đến khi kiểm chứng nguồn thật.
- Không tuyên bố Cổng B/E đạt chỉ từ compile, unit test hoặc test dùng fixture.
- **Quyết định thứ tự ngày 2026-09-01:** tạm dừng mở rộng P2 và chưa triển khai pilot/thực nghiệm chính;
  ưu tiên đóng các khoảng trống chức năng trong `apps/`. Những artifact P2 đã có phải được giữ nguyên,
  không hợp thức hóa thành kết quả đo hay ADR `Accepted` trong thời gian tạm dừng.
- “Kiểm thử thực hiện sau” được hiểu là hoãn kiểm thử nghiệm thu diện rộng, provider/VPS E2E, load,
  noisy-neighbor và thực nghiệm chính. Khi phát triển app vẫn phải giữ các test nền hiện có và chạy
  kiểm tra hồi quy tối thiểu tương xứng với thay đổi; không tích lũy thay đổi chưa build hoặc cố ý làm
  hỏng baseline.

## 2. Tiến độ theo giai đoạn

| Giai đoạn | Trạng thái tại checkpoint | Phần còn thiếu để qua cổng |
|---|---|---|
| A — Repo và giao thức nghiên cứu | **Khung chính đã có; chưa phải ưu tiên hiện tại** | Kiểm chứng trực tuyến toàn bộ nguồn/DOI, hoàn tất sàng lọc và bảo đảm mọi yêu cầu đều truy vết được |
| B — Spike và ADR | **Một phần; tạm dừng sau phần chuẩn bị local** | Sau mốc app: review/khóa hồ sơ loại hai ứng viên Pool đã leak local; đo ứng viên còn lại; chạy spike storage/payment; chấm điểm và chốt ADR 0003–0005 |
| C — Kiến trúc và hợp đồng | **Khung chính đã có** | Review tính nhất quán sau khi ADR B được chốt; bổ sung chi tiết nếu spike làm thay đổi quyết định |
| D — Lát cắt dọc | **APP-01 đến APP-06 hoàn tất local** | Review working tree và biên bản P-App; chỉ bổ sung lỗi/hardening phát hiện trong review, không mở rộng sang provider/VPS/P2 khi chưa có quyết định mới |
| E — Triển khai và thực nghiệm | **Tạm hoãn; local Compose/Testcontainers/k6 smoke đã xác minh, chưa có số đo chính** | Sau mốc app: VPS/domain/TLS, provider thật, pilot, khóa SLO, chạy 3–5 tenant lặp lại, QA dữ liệu, noisy-neighbor và đánh giá người dùng |
| F — Tổng hợp | **Chưa thực hiện** | Chỉ bắt đầu sau khi có bằng chứng A–E; hoàn thiện báo cáo, bản tin, demo và video |

**Kết luận cổng:** chưa đánh dấu Cổng A, B hoặc E là đạt. **Mốc hoàn thiện ứng dụng local đã đạt** theo
checklist P-App và regression kỹ thuật; mốc này không tự động cho phép hoặc thay thế provider thật,
triển khai, kiểm thử nghiệm thu diện rộng, P2 measurement hay thực nghiệm.

## 3. Phần đã hiện thực

### 3.1 Chuẩn hóa repo và tài liệu

- Monorepo gồm `apps/api`, `apps/web`, `infra`, `experiments`, `docs` và `scripts`.
- Có README, quy tắc secrets, protocol, research log, risk register, decision log, ADR template, traceability matrix, SRS, use case và permission matrix.
- Có literature review, search log, source register, product survey và BibTeX. Các nguồn chưa xác minh vẫn được ghi rõ, không được xem là bằng chứng cuối.
- Có C4, ba ERD, sequence diagram, threat model, kiến trúc tổng quan và bảy ADR.
- Có OpenAPI 3.1 tại `docs/api/openapi.yaml`; frontend sinh kiểu TypeScript vào `apps/web/src/api/generated.ts`.

### 3.2 Backend Spring Boot

- Java 21, Spring Boot 4.1.1, Maven Wrapper, Flyway, JPA/JDBC, Security, Actuator/Micrometer và Testcontainers.
- Hai profile dùng chung mã: API không có quyền tạo database; worker/provisioner nhận credential đặc quyền riêng.
- Control plane cho user, tenant, membership, tier, placement, route, payment, provisioning và refresh/session state.
- Application plane dùng chung schema cho Pool và Silo; mọi bảng nghiệp vụ có `tenant_id` và Pool bật `FORCE ROW LEVEL SECURITY`.
- Có `TenantContext`, host–token validation, membership-version invalidation, tenant-bound JWT/refresh flow và đối chiếu trạng thái tenant.
- Có resolver Pool/Silo, Hikari pool cho Silo, giới hạn connection ban đầu và mã hóa placement secret.
- Fake payment provider, kiểm tra amount/currency/return URL, webhook signature/replay/payload hash và khóa advisory theo transaction để idempotency vẫn đúng khi tạo payment đồng thời.
- Có đăng ký tài khoản trên host trung tâm và onboarding API theo quyền Owner/Admin. Fake checkout local
  tạo callback đã ký đi qua đúng webhook path, đối chiếu amount/currency và không hoạt động với adapter
  provider thật.
- Invitation tenant-scoped có token hash/TTL/status, accept/reject idempotent theo đúng email, list/revoke
  cho Owner/Admin và migration control V5. Ownership transfer khóa active membership, luôn chuyển từ một
  Owner sang một active member và tăng security version của cả hai.
- Provisioning state machine có idempotency, retry, rollback và bảng sự kiện audit. Control migration V3 bổ sung claim lease; worker dùng `SKIP LOCKED`, heartbeat và các transaction ngắn quanh claim/prepare/finalize thay vì giữ control transaction qua external DDL. Control V4 phân biệt rollback thành công (`FAILED_ROLLED_BACK`) với rollback lỗi (`ROLLBACK_FAILED`) và cho phép admin retry cả hai trạng thái. Lỗi rollback giữ thông điệp PostgreSQL cụ thể cho System Admin; manual retry từ `ROLLBACK_FAILED` đã được kiểm tra đến `SUCCEEDED`.
- Placement Silo được chuẩn bị với database/role/credential ổn định trước external DDL; retry dùng lại cùng metadata và credential đã mã hóa.
- Project có lifecycle active/archive/soft-delete, project membership và invariant Manager. Multi-board,
  task detail/assignee/due date/batch move, subtask một cấp, comment lifecycle và optimistic conflict đều
  có API/OpenAPI; archived project đọc được nhưng mọi mutation bị chặn.
- Resource namespace theo tenant hỗ trợ file và link HTTP(S), quota, liên kết nhiều task và kiểm tra quyền
  project. File dùng signed URL và outbox cleanup idempotent; link không tạo object/cleanup giả; metadata
  được soft-delete và quota chỉ tính resource active.
- In-app notification, SMTP/Mailpit adapter, preference và push-subscription lifecycle/idempotency đã nối
  UI. Worker dispatch các event nghiệp vụ project/task/comment đến active project member; Web Push thật
  vẫn ghi `VAPID_NOT_CONFIGURED`, không báo giả là đã gửi.
- Audit, admin APIs, rate limiting theo tenant/tier và nhãn quan sát `tenant_id`, `tenant_tier`,
  `tenant_placement`. System Admin có filter tenant và detail payment/provisioning transition history;
  retry vẫn bị state machine backend giới hạn.
- Năm migration control (`V1`–`V5`) và bảy migration application (`V1`–`V7`) dùng chung cho Pool/Silo.
  Worker profile nâng application schema của placement `ACTIVE` còn cũ và cập nhật `schema_version` sau
  khi Flyway thành công; marker schema mới nhất là V7.
- Integration/unit test đã bổ sung cho project lifecycle/role/IDOR, board/task/comment, notification,
  resource link/soft-delete, membership, payment concurrency, admin detail/filter/retry guard, MinIO
  deletion và provisioning claim/lease/force-kill recovery.

### 3.3 Frontend React

- React 19, TypeScript, Vite, React Router, TanStack Query, Material UI và dnd-kit.
- Có login/register, exchange, chọn/onboard tenant, dashboard, Projects, Kanban multi-board, members,
  resources, notifications và control-plane admin.
- Có trang đăng ký và onboarding workspace: chọn tier/placement, tạo payment mô phỏng, xác nhận fake,
  polling provisioning đến `ACTIVE`, rồi chuyển bằng transfer code vào đúng subdomain.
- Members UI có quản trị invitation/link local một lần, trạng thái/thu hồi và chuyển ownership; người
  nhận có trang preview, đăng nhập/đăng ký và accept/reject đúng tài khoản.
- Access token giữ trong memory; API client có refresh flow và xử lý lỗi HTTP có cấu trúc.
- Kiểu DTO lõi được dẫn xuất từ OpenAPI; script `api:generate` và `api:check` ngăn contract bị lệch.
- Có trạng thái loading/empty/error ở các màn hình chính. Projects quản trị lifecycle/member/role; Kanban
  quản lý board, task detail/subtask/comment và giữ nội dung user khi conflict. Resources tạo file/link và
  gắn/gỡ task; Notifications quản lý preference/subscription. Admin có filter, payment/provisioning detail,
  transition history, retry và dialog resource cleanup dead letter.
- Playwright vẫn có đúng hai case Pool/Silo, chứa host binding, Manager/Member/Viewer HTTP/UI, file/download và notification/background-job tenant matrix. Cả hai case đã pass runtime bằng Chromium thật; cleanup xóa column/task/resource artifact do test tạo.

### 3.4 Hạ tầng, CI và thực nghiệm

- Compose gồm PostgreSQL 18, API, worker, web/Caddy, MinIO, Mailpit, Prometheus và Grafana.
- Compose đã được sửa theo layout volume PostgreSQL 18, root filesystem web read-only có tmpfs riêng và healthcheck IPv4 ổn định.
- Có harness fault injection local dừng riêng MinIO đủ lâu để cleanup Pool/Silo cùng đạt dead letter lần thứ năm, sau đó khởi động lại và requeue từng tenant độc lập.
- Role API không nhận `CREATEDB`/`BYPASSRLS`; provisioner credential chỉ cấp cho worker.
- Có runbook local, deployment, backup/restore; secrets thật bị loại khỏi Git.
- GitHub Actions có backend/frontend test, lint/build, OpenAPI drift check, migration validation tĩnh, dependency review và container build.
- k6 có smoke, baseline, load, stress và noisy-neighbor; baseline/load/stress hỗ trợ cấu hình `TENANT_A` đến `TENANT_E` thành scenario riêng.
- Có manifest/schema, thu metric Prometheus, Python QA/analyzer, CSV/report/SVG tái tạo từ dữ liệu thật và unit test cho analyzer.
- Có ba protocol P2 đăng ký trước cho isolation/storage/payment cùng schema và validator evidence
  fail-closed: checksum artifact, commit sạch, mandatory security case, workload/environment fingerprint,
  coverage candidate/placement và replicate. Payment vẫn bị chặn bởi credential/trọng số chưa phê duyệt.
- Có Maven isolation harness độc lập cho explicit predicate, Hibernate filter và PostgreSQL RLS trên một
  Pool database cùng hai Silo database vật lý; matrix Project CRUD có guard pass 6/6 trên PostgreSQL
  18.6. Guard omission ở native/bulk/background ghi 6 leak cho explicit/Hibernate Pool, RLS chặn 3/3 và
  Silo physical boundary chặn 9/9.
- Evidence gate có hồ sơ `elimination.json` fail-closed riêng: reason phải đăng ký trước, mandatory case
  có ít nhất một `FAIL` đúng mapping trigger của reason, commit sạch và artifact checksum. Candidate bị loại hợp lệ mới được miễn measured
  replicate; không thể đổi security failure thành `PASS` để làm gate hoàn tất.
- `experiments/results` và `experiments/derived` bị ignore; analyzer dừng nếu không có run hợp lệ thay vì sinh dữ liệu mẫu.

## 4. Bằng chứng kiểm tra đã có

Biên bản chi tiết, môi trường và ranh giới kết luận nằm tại [P0 verification 2026-08-26](testing/p0-verification-2026-08-26.md), [P1 verification 2026-08-26](testing/p1-verification-2026-08-26.md), [P1 continuation verification 2026-08-27](testing/p1-verification-2026-08-27.md), [P1 verification lượt 2](testing/p1-verification-2026-08-27-part-2.md), [P1 file/worker/MinIO verification 2026-08-31](testing/p1-verification-2026-08-31.md), [P1 rollback recovery verification 2026-08-31](testing/p1-verification-2026-08-31-part-2.md), [P2 preparation 2026-08-31](testing/p2-preparation-2026-08-31.md), [P2 isolation harness 2026-08-31](testing/p2-preparation-2026-08-31-part-2.md), [P2 guard-omission/evidence gate 2026-08-31](testing/p2-preparation-2026-08-31-part-3.md), [APP-01 onboarding 2026-09-01](testing/p-app-onboarding-2026-09-01.md), [APP-02 invitation 2026-09-01](testing/p-app-invitation-2026-09-01.md) và [APP-03–APP-06 core workflow 2026-09-01](testing/p-app-core-workflow-2026-09-01.md). Các kết quả dưới đây là kiểm tra kỹ thuật, không phải kết quả thực nghiệm nghiên cứu.

| Kiểm tra | Kết quả xác minh |
|---|---|
| Backend clean test | 21 suite, 88/88 test pass; 0 failure, 0 error, 0 skip; giữ đủ 58 test baseline, tổng hiện tại tăng lên 88 |
| RLS Testcontainers | 4/4 pass trên PostgreSQL 18.6 thật |
| Security/IDOR và application lifecycle | 15 project/application integration, 9 tenant membership và 10 tenant context/host test pass |
| Payment concurrency | Hai create đồng thời tạo đúng 1 payment; hai webhook trùng enqueue đúng 1 provisioning |
| Column management | API/OpenAPI/UI create/rename/reorder/delete pass integration; Manager-only, stale board version trả conflict, bảo vệ cột có task/cột cuối và tenant boundary |
| Provisioning durability | 14 test provisioning/credential/lease/state pass; JVM con bị force-kill ở ba ranh giới database-ready, application-migrated và ready-to-finalize, lease attempt 2 phục hồi không nhân đôi database/role; PostgreSQL rollback bị chặn hai lần liên tiếp rồi cleanup idempotent, manual retry từ `ROLLBACK_FAILED` đi đến `SUCCEEDED` |
| Resource/file tenant guard | Backend exact tenant/resource key, wrong aggregate, path traversal và foreign event guard pass; Playwright known foreign ID `404`, signed-key tamper `403`, notification/outbox isolation pass trên Pool/Silo |
| Resource deletion | 7 test pass; MinIO retry eventual cleanup, lần lỗi thứ năm chuyển dead-letter, system-admin requeue có audit và tenant boundary |
| Frontend TypeScript/OpenAPI | `lint` và `api:check` pass, không drift |
| Frontend unit test | 8 file, 11/11 test pass; giữ đủ 5 test baseline, tổng hiện tại tăng lên 11 |
| Frontend production build | Pass với Vite 7.3.6 |
| Playwright E2E | Đúng 2/2 case Pool/Silo pass runtime bằng Chromium thật; host/role, stale-version `409`, file/download, notification và resource cleanup tenant matrix đều pass |
| npm install/audit | 263 package cài, audit 264 package, 0 vulnerability |
| k6 JavaScript syntax | Tất cả file `experiments/k6/*.js` và `lib/*.js` qua `node --check` |
| Infra/analyzer validation | Compose interpolation pass; 8/8 Python test (3 analyzer nền + 5 evidence gate) và JSON/Python/static checks pass |
| P2 protocol/evidence gate | 3 plan isolation/storage/payment hợp lệ; 8/8 Python test tổng cộng pass; payment giữ 5 trọng số và credential ở `PENDING_DATA`; chưa có measured result/elimination artifact |
| P2 Project CRUD isolation harness | Module độc lập 1 suite, 6/6 pass trên PostgreSQL 18.6; 18 guard-omission observation gồm 6 candidate leak explicit/Hibernate Pool, 3 RLS Pool protected và 9 Silo boundary protected; chưa có số đo |
| Docker Compose runtime | `scripts/dev-up.sh` rebuild/restart exit 0 trên volume hiện hữu; API healthy/readiness pass; worker log mới sạch WARN/ERROR qua nhiều vòng outbox poll |
| Compose MinIO outage | Pool và Silo cùng đạt resource cleanup dead letter ở `attempts=5`; requeue từng tenant dọn đúng object, không đổi dead letter/object tenant còn lại; audit có mặt và MinIO được khởi động lại |
| Flyway/upgrade | Clean test và Compose xác nhận control V1–V5, application V1–V7; Pool/Silo placement active được worker đưa đến `schema_version=7` |
| Role/RLS | 14/14 bảng Pool bật RLS + FORCE RLS; application roles không có `BYPASSRLS` |
| API smoke | Login/transfer/exchange/me/projects/refresh pass trên Pool và Silo; token sai host bị chặn 403 |
| APP-01 onboarding smoke | Register/create tenant/fake payment/provisioning `ACTIVE`/tenant exchange pass trên Pool local; fixture kỹ thuật, không phải dữ liệu nghiên cứu |
| APP-02 invitation smoke | Invite/preview/accept idempotent/membership/ownership transfer pass local; token Owner cũ bị `403`; fixture kỹ thuật, không phải dữ liệu nghiên cứu |
| APP-03–APP-06 workflow smoke | System Admin filter/detail, project lifecycle/read-only, multi-board, task/subtask/comment, link resource và notification preference/subscription pass local; fixture được cleanup, không phải dữ liệu nghiên cứu |
| k6 smoke | 1 iteration, 2/2 check pass, không có request lỗi; không dùng timing này làm số liệu hiệu năng |

Lệnh backend cuối cùng (host kiểm tra dùng cache Maven tạm vì home read-only):

```bash
cd apps/api
MAVEN_USER_HOME=/tmp/nckh-maven-home ./mvnw -q \
  -Dmaven.repo.local=/tmp/nckh-m2 clean test
```

Chuỗi frontend cuối cùng:

```bash
cd apps/web
npm ci
npm run api:check
npm run lint
npm test
npm run build
E2E_ENV_FILE=../../infra/.env npm run test:e2e
```

## 5. Giới hạn và nợ kỹ thuật đã biết

### Bắt buộc trước khi nghiệm thu an toàn

- Startup-order V3/outbox đã được đóng fail-closed: outbox bỏ qua placement chưa đạt application schema mới nhất; assertion nằm trong test hiện hữu nên không tăng tổng test. Rebuild/log muộn và truy vấn Flyway cuối đã sạch.
- Playwright role/action, optimistic conflict, file/download và notification/background-job tenant matrix đã pass runtime trong đúng hai case Pool/Silo. Backend exact key guard còn phủ sai tenant, sai aggregate/resource và path traversal mà không tăng tổng test.
- MinIO fault injection đã chứng minh trên Compose local: outage kéo dài cho cả Pool/Silo đến dead letter lần thứ năm, rồi requeue độc lập dọn đúng object và giữ tenant còn lại nguyên vẹn. Kết quả này không đại diện cho availability/durability production.
- Provisioning đã force-kill JVM con thật sau DDL, sau Flyway và trước finalize; lease recovery dùng lại credential và không nhân đôi database/role. Fault injection PostgreSQL thật đã làm `DROP ROLE` thất bại hai lần liên tiếp do dependency, xác nhận database đã dọn nhưng role còn nguyên, rồi bỏ dependency và rollback lại dọn sạch idempotent. Manual retry từ trạng thái `ROLLBACK_FAILED` cũng đã đi qua audit transition đến `SUCCEEDED`. Diễn tập ở mức worker container vẫn là bằng chứng vận hành tùy chọn.
- Payment creation/webhook concurrency đã pass trên PostgreSQL thật; adapter VNPay/Stripe thật vẫn phải kiểm thử signature/callback bằng credential sandbox khi nhóm cung cấp.

### Chức năng còn thiếu hoặc mới là adapter

- Column CRUD/sắp xếp đã có API/OpenAPI/UI cho Manager và Playwright matrix đã pass trên stack local mới.
- Web Push mới lưu subscription và trả trạng thái `VAPID_NOT_CONFIGURED`; chưa gửi thật.
- VNPay/Stripe adapter thật chưa có do chưa có credential; FakePaymentProvider là mặc định hợp lệ cho local/test.
- ADR isolation/payment/storage vẫn ở trạng thái Proposed vì spike và số đo chưa hoàn tất.
- Protocol/evidence gate, guarded Project CRUD và adversarial guard-omission matrix P2 đã có. Hai
  application-only candidate có hành vi loại local nhưng chưa có hồ sơ loại checksum-backed được review;
  measured artifact và scorecard chưa có. Validator không thay thế review raw data hoặc quyết định ADR.
- Chưa có notebook `.ipynb`; hiện có Python pipeline tái lập. Có thể thêm notebook mỏng gọi cùng analyzer sau khi schema dữ liệu ổn định.
- Prometheus hiện scrape API; worker không chạy web server nên chưa có endpoint metric riêng.
- Rate limiter v1 là in-memory, phù hợp một API instance nhưng chưa có eviction dài hạn.

### Trạng thái khoảng trống ứng dụng sau P-App

Danh sách được đối chiếu ngày 2026-09-01 từ SRS, controller/OpenAPI và các route/màn hình. APP-01 đến
APP-06 đã đóng trong phạm vi local của checklist; các mục “để sau” vẫn là giới hạn rõ ràng, không được
suy luận là đã nghiệm thu production.

1. **Tài khoản và onboarding — APP-01 hoàn tất local:** đã có đăng ký, tạo workspace, chọn tier/placement,
   payment local/fake, polling provisioning và transfer vào subdomain sau `ACTIVE` ở API/OpenAPI/web.
   Provider thật, VPS/DNS/TLS vẫn chủ động để sau; kết quả local không phải P2 hay nghiệm thu production.
2. **Invitation và vòng đời tenant — APP-02 hoàn tất local:** đã có invitation token/TTL/status,
   accept/reject idempotent đúng email, đăng ký từ link, list/revoke, role/revoke membership và ownership
   transfer nguyên tử. Email delivery thật và tenant suspend/delete lifecycle không nằm trong checklist
   local đã khóa.
3. **Project và project membership — APP-03 hoàn tất local:** UI/API có sửa, archive/restore/soft-delete,
   quản lý member/role và backend bảo vệ Manager cuối cùng; report nâng cao để sau.
4. **Board, task, subtask và comment — APP-04 hoàn tất local:** multi-board lifecycle, task detail,
   assignee/due date, batch move/conflict, subtask một cấp và comment lifecycle đã nối API/OpenAPI/UI.
   Realtime/collaborative editing không nằm trong v1 local.
5. **Resource — APP-05 hoàn tất local:** file/link, quan hệ nhiều task, attach/detach, quota và soft-delete
   đã nối UI/API. Provider storage khác và kiểm chứng production vẫn để sau.
6. **Notification — APP-05 hoàn tất local:** list/read, preference và subscription lifecycle đã nối UI;
   in-app bắt buộc và worker xử lý event project/task/comment theo project membership. VAPID delivery thật,
   push trình duyệt tự động, notification due/overdue theo scheduler production và email invitation thật
   chưa nằm trong lát cắt local này.
7. **Payment, provisioning và admin UX — APP-06 hoàn tất local:** Owner/Admin xem onboarding đúng quyền;
   System Admin filter/detail payment/provisioning/transition và retry hợp lệ. Billing dashboard production,
   suspend/delete tenant và VPS operations để sau.
8. **Hoàn thiện xuyên suốt — hoàn tất local:** OpenAPI/generated type không drift, màn chính có trạng thái
   bất đồng bộ/lỗi, quyền enforce tại backend, full regression và đúng hai Pool/Silo E2E baseline pass.

### Phần phụ thuộc nhóm nghiên cứu

- VPS/domain/wildcard DNS/TLS và cấu hình đúng với môi trường pilot.
- Với VNPay Sandbox, nhóm phải có trước domain/URL website công khai và endpoint HTTPS ổn định cho
  Return URL/IPN; sau đó đăng ký merchant sandbox để nhận `vnp_TmnCode` và `vnp_HashSecret`. Return URL
  chỉ hiển thị kết quả; chỉ callback/IPN đã xác minh server-side mới được cập nhật payment và kích hoạt
  provisioning. Chuỗi phụ thuộc này thuộc giai đoạn sau mốc hoàn thiện app local.
- Credential VNPay Sandbox hoặc Stripe Test Mode nếu chạy spike/adapter thật; không dùng credential
  production và không giao dịch tiền thật.
- SMTP ngoài local và khóa VAPID nếu nghiệm thu kênh gửi thật.
- Tuyển người tham gia, consent/phê duyệt, nhập dữ liệu SUS đã ẩn danh.
- Phê duyệt học thuật cho protocol, search cutoff, tiêu chí chọn/loại và báo cáo cuối.

## 6. Thứ tự tiếp tục được khuyến nghị

### P0 — Tạo baseline chạy được hoàn toàn

**Hoàn tất local ngày 2026-08-26.** Backend/frontend/static tests, Compose bootstrap, Flyway, seed Pool/Silo, role/RLS, API smoke và k6 smoke đều có bằng chứng trong biên bản P0. Stack được để ở trạng thái đang chạy tại cuối phiên; trạng thái này không được giả định còn nguyên ở phiên sau.

### P1 — Hardening baseline kỹ thuật local

**Hoàn tất trong phạm vi các biên bản P1.** Không suy rộng các test đã pass thành toàn bộ ứng dụng hoặc
ma trận nghiệm thu cuối.

1. **Đã làm:** integration test cho project role/IDOR, tenant membership, host-token, membership revoke/version, suspended tenant và exact storage key; đúng hai Playwright case Manager/Member/Viewer cùng file/download/notification/background-job tenant matrix đã pass runtime.
2. **Đã làm thêm:** provisioning dùng atomic claim, `SKIP LOCKED`, lease/heartbeat, short transaction, metadata/credential ổn định; JVM con bị force-kill ở ba ranh giới và attempt 2 phục hồi idempotent; rollback PostgreSQL thất bại lặp lại cùng manual recovery từ `ROLLBACK_FAILED` đã pass. **Còn tùy chọn:** diễn tập worker container nếu nhóm cần bằng chứng vận hành sâu hơn.
3. **Đã làm:** physical resource deletion qua outbox, exact tenant/resource guard, MinIO retry, dead-letter lần thứ năm, system-admin requeue có audit, schema gate đóng startup-order V3/outbox và outage kéo dài trong Compose với requeue Pool/Silo độc lập.
4. **Đã làm:** column create/rename/reorder/delete ở API/OpenAPI/UI với Manager-only và board optimistic version; đúng 2 Playwright case pass runtime, cleanup để lại 0 artifact.
5. **Đã xác minh:** payment advisory lock và duplicate webhook concurrency trên PostgreSQL 18.6; mỗi race chỉ tạo/enqueue một lần.

### P-App — Hoàn thiện ứng dụng và luồng nghiệp vụ cơ bản — hoàn tất local

Thực hiện theo lát cắt dọc, hoàn tất cả API/OpenAPI/frontend và kiểm tra hồi quy tối thiểu cho từng luồng
trước khi chuyển sang luồng kế tiếp:

1. **Đã làm:** khóa [checklist P-App](app/P-APP-CHECKLIST.md) từ SRS và danh sách khoảng trống ở mục 5;
   phân biệt rõ tính năng cốt lõi, provider thật làm sau và hạng mục ngoài phạm vi.
2. **Đã làm APP-01 local:** hoàn thiện đăng ký/đăng nhập và onboarding bằng fake payment đến khi tenant
   được provision và người dùng vào đúng subdomain; regression Pool/Silo baseline vẫn pass.
3. **Đã làm APP-02 local:** invitation accept/reject, quản trị tenant membership và ownership transfer;
   email delivery thật cùng tier/suspend lifecycle để APP-06 hoặc giai đoạn có provider.
4. **Đã làm APP-03/APP-04 local:** project lifecycle/membership, multi-board, task detail/assignee/due
   date/conflict, subtask một cấp và comment lifecycle đã nối backend/OpenAPI/web.
5. **Đã làm APP-05 local:** file/link resource gắn nhiều task, soft-delete, notification preference và
   subscription lifecycle; delivery provider thật tiếp tục chờ HTTPS/credential.
6. **Đã làm APP-06 local:** Owner/Admin onboarding status; System Admin role/route, filter, payment/
   provisioning detail, transition history và retry đúng state.
7. **Đã xác minh:** contract generation, lint/build, 88 backend test, 11 frontend unit test, smoke
   APP-03–APP-06 và đúng hai E2E Pool/Silo pass. Đây là kiểm tra bảo vệ baseline phát triển, không phải
   pilot, số đo nghiên cứu hoặc Cổng E.
8. Mốc app local đã hoàn tất theo [checklist khóa](app/P-APP-CHECKLIST.md). Mọi quyết định mở lại P2,
   provider/VPS, nghiệm thu diện rộng hoặc thực nghiệm cần được nhóm đưa ra riêng.

### P2 — Hoàn tất spike và chốt Cổng B — tạm hoãn đến sau P-App

1. **Đã chuẩn bị protocol/evidence gate:** khóa candidate, case, artifact, fingerprint, replicate và
   trọng số isolation/storage; payment giữ credential/trọng số là `PENDING_DATA`.
2. **Đã dựng guarded contract local:** cùng `Project CRUD` cho ba phương án isolation trên Pool và Silo,
   pass 6/6 trong module độc lập.
3. **Đã chạy guard omission local:** native/bulk/background ghi 6 leak cho explicit/Hibernate Pool và
   RLS chặn 3/3; tiếp theo review rồi khóa hồ sơ loại checksum-backed, không đổi leak thành `PASS`.
4. **Chưa chạy trong giai đoạn ưu tiên app:** đo latency, RAM và connection cho ứng viên còn lại bằng
   cùng seed/workload; lưu raw artifact + manifest.
5. **Chưa chạy trong giai đoạn ưu tiên app:** storage và payment spike bằng credential thật.
6. Sau khi P-App hoàn tất, chấm theo trọng số trong kế hoạch, cập nhật ADR 0003–0005 từ Proposed sang
   Accepted kèm bằng chứng đã được nhóm review.

### P3 — Triển khai, pilot, kiểm thử nghiệm thu, thực nghiệm và tổng hợp — tạm hoãn

1. Chuẩn bị VPS, domain, wildcard DNS/TLS; với VNPay phải có URL website và Return URL/IPN HTTPS ổn định
   trước khi đăng ký sandbox và nhận credential.
2. Tích hợp/kiểm thử provider thật sau khi nhóm cung cấp credential qua secret environment ngoài Git.
3. Pilot trên đúng VPS để khóa SLO; không đặt p95 mục tiêu hồi tố.
4. Chạy 3–5 tenant, 10–20 VU/tenant, lặp ít nhất ba lần, cùng seed/workload cho Pool và Silo.
5. Chạy noisy-neighbor trước/sau rate limit và báo cáo cả tenant nạn nhân.
6. QA dữ liệu, sinh lại bảng/biểu đồ, rồi mới viết kết luận cho từng câu hỏi nghiên cứu.
7. Nhóm nghiên cứu thực hiện user study/SUS; repo chỉ nhận dữ liệu đã ẩn danh hoặc tổng hợp.

## 7. Lệnh phục hồi và kiểm tra trong giai đoạn P-App

Kiểm tra trạng thái trước khi làm:

```bash
git status --short
git diff --stat
```

Các lệnh dưới đây bảo vệ baseline trong lúc phát triển app; chúng không phải lượt kiểm thử nghiệm thu
hay thực nghiệm chính. Backend cần Docker hoạt động để test RLS không bị skip:

```bash
cd apps/api
./mvnw -B -ntp clean test
```

Frontend; có thể chạy tập con liên quan sau mỗi lát cắt và chạy đủ chuỗi khi chốt mốc:

```bash
cd apps/web
npm ci
npm run api:check
npm run lint
npm test
npm run build
npm run test:e2e:install
E2E_ENV_FILE=../../infra/.env npm run test:e2e
```

Local stack chỉ khởi động khi cần phát triển/kiểm tra luồng Pool/Silo:

```bash
scripts/validate-infra.sh
scripts/dev-up.sh
```

Smoke P-App local có fixture kỹ thuật tự cleanup:

```bash
node scripts/verify-p-app-workflow.mjs
```

Các lệnh fault injection, P2 và workload dưới đây **vẫn tạm dừng**; chỉ chạy lại khi nhóm có quyết định
mới hoặc một thay đổi app trực tiếp đòi hỏi kiểm tra hồi quy tương ứng:

```bash
node scripts/verify-minio-outage.mjs
scripts/validate-p2-spikes.sh
scripts/run-p2-isolation-security.sh
scripts/run-experiment.sh smoke
```

Các workload nghiệp vụ cần token tenant thật trong environment; xem `experiments/README.md`. Không ghi token vào file hoặc manifest.

## 8. Câu lệnh mở đầu cho phiên sau

Có thể dùng nguyên văn:

> Đọc `docs/PROJECT_STATUS.md`, `resource/plan.md`, `resource/thuyetMinhSaasMultiTenancy.md`, SRS và
> OpenAPI; kiểm tra working tree trước khi sửa. Theo quyết định ngày 2026-09-01, tạm dừng triển khai VPS,
> provider thật, P2 measurement, kiểm thử nghiệm thu diện rộng và thực nghiệm. Ưu tiên P-App: khóa
> checklist rồi hoàn thiện `apps/api` + `apps/web` theo lát cắt dọc, bắt đầu từ đăng ký và onboarding
> local `tạo tenant → fake payment → provisioning → ACTIVE → vào subdomain`, sau đó invitation,
> project/board/task/subtask/comment, resource/notification và admin UX. Không khôi phục hai file
> resource đang bị xóa, không tạo dữ liệu nghiên cứu giả và không làm thay đổi artifact P2 thành kết quả
> chính thức. Giữ toàn bộ 58 backend test, 5 frontend unit test và 2 Playwright E2E hiện hữu làm baseline
> tối thiểu; được bổ sung test mới khi thêm chức năng, không cố định tổng test ở các con số cũ.

Sau mỗi mốc đáng kể, cập nhật ngày, bảng tiến độ, kết quả test và danh sách nợ kỹ thuật trong chính tài liệu này.
