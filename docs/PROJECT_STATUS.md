# Điểm khôi phục triển khai đề tài

**Cập nhật:** 2026-08-31 (UTC)
**Nhánh đang làm:** `main`
**Commit nền trước phần P2 hiện tại:** `2b430b7` (`p2`)
**Trạng thái:** P0 hoàn tất local; các ưu tiên P1 từ lượt 2 gồm startup-order V3/outbox, role matrix, file/download/background-job tenant matrix, MinIO outage kéo dài trong Compose và recovery sau rollback PostgreSQL thất bại lặp lại đã đóng bằng kiểm tra local. P1 tổng thể vẫn còn các adapter phụ thuộc credential/hạ tầng thật và diễn tập worker container tùy chọn. P2 đã có protocol/evidence gate, guarded Project CRUD 3 ứng viên × Pool/Silo và guard-omission matrix local. Matrix ghi 6 leak cho explicit/Hibernate trên Pool, RLS chặn 3/3 đường omission; vẫn chưa có hồ sơ loại checksum-backed, raw measurement, score hoặc ADR được chấp nhận.

Tài liệu này là điểm bắt đầu cho phiên làm việc tiếp theo. Nó phân biệt rõ mã đã hiện thực, kiểm tra đã chạy, phần mới chỉ là khung và phần bắt buộc phải chờ dữ liệu/hạ tầng thật.

## 1. Nguồn sự thật và nguyên tắc bảo toàn

- Thuyết minh chính: [`resource/thuyetMinhSaasMultiTenancy.md`](../resource/thuyetMinhSaasMultiTenancy.md).
- Kế hoạch thực hiện: [`resource/plan.md`](../resource/plan.md).
- Không khôi phục hai file người dùng đang chủ động xóa: `resource/important.md` và `resource/thuyet_minh_SaaS.md`.
- `draft.md` không còn tồn tại tại checkpoint; nếu người dùng tạo lại file này thì không được ghi đè khi chưa kiểm tra nội dung.
- Phần P1 local đã được commit tại `71b8092`; protocol/evidence gate, isolation harness và hai biên bản
  chuẩn bị P2 đầu đã được commit tại `2b430b7`. `main` và `origin/main` cùng trỏ tới `2b430b7` khi chạy
  guard-omission matrix cuối; schema hỗ trợ hồ sơ loại và biên bản lượt 3 đang ở working tree, chưa commit.
  Phiên sau vẫn phải đọc `git status --short` vì trạng thái có thể đã thay đổi.
- Không tạo số đo, DOI, kết quả khảo sát, SUS hoặc kết quả thực nghiệm giả. Mục có nhãn `UNVERIFIED` phải tiếp tục giữ nhãn đến khi kiểm chứng nguồn thật.
- Không tuyên bố Cổng B/E đạt chỉ từ compile, unit test hoặc test dùng fixture.

## 2. Tiến độ theo giai đoạn

| Giai đoạn | Trạng thái tại checkpoint | Phần còn thiếu để qua cổng |
|---|---|---|
| A — Repo và giao thức nghiên cứu | **Đang thực hiện, khung chính đã có** | Kiểm chứng trực tuyến toàn bộ nguồn/DOI, hoàn tất sàng lọc và bảo đảm mọi yêu cầu đều truy vết được |
| B — Spike và ADR | **Một phần** | Review/khóa hồ sơ loại hai ứng viên Pool đã leak local; đo ứng viên còn lại; chạy spike storage/payment; chấm điểm và chốt ADR 0003–0005 |
| C — Kiến trúc và hợp đồng | **Khung chính đã có** | Review tính nhất quán sau khi ADR B được chốt; bổ sung chi tiết nếu spike làm thay đổi quyết định |
| D — Lát cắt dọc | **Baseline chức năng + hardening P1 local** | Web Push thật, adapter payment sandbox và các trạng thái/phạm vi vận hành chưa có credential hoặc chưa được diễn tập |
| E — Triển khai và thực nghiệm | **Local Compose/Testcontainers/k6 smoke đã xác minh; chưa có số đo chính** | Pilot VPS, khóa SLO, chạy 3–5 tenant lặp lại, QA dữ liệu, noisy-neighbor và đánh giá người dùng |
| F — Tổng hợp | **Chưa thực hiện** | Chỉ bắt đầu sau khi có bằng chứng A–E; hoàn thiện báo cáo, bản tin, demo và video |

**Kết luận cổng:** chưa đánh dấu Cổng A, B hoặc E là đạt. P0 và các kiểm tra P1 là bằng chứng kỹ thuật local; Cổng E vẫn chưa đạt vì chưa có pilot trên VPS, SLO khóa trước và dữ liệu thực nghiệm chính.

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
- Provisioning state machine có idempotency, retry, rollback và bảng sự kiện audit. Control migration V3 bổ sung claim lease; worker dùng `SKIP LOCKED`, heartbeat và các transaction ngắn quanh claim/prepare/finalize thay vì giữ control transaction qua external DDL. Control V4 phân biệt rollback thành công (`FAILED_ROLLED_BACK`) với rollback lỗi (`ROLLBACK_FAILED`) và cho phép admin retry cả hai trạng thái. Lỗi rollback giữ thông điệp PostgreSQL cụ thể cho System Admin; manual retry từ `ROLLBACK_FAILED` đã được kiểm tra đến `SUCCEEDED`.
- Placement Silo được chuẩn bị với database/role/credential ổn định trước external DDL; retry dùng lại cùng metadata và credential đã mã hóa.
- Project, project role, board, task, subtask một cấp, comment, assignee, due date và optimistic locking. Manager có API/OpenAPI đầy đủ để tạo, đổi tên, sắp xếp và xóa column; board version ngăn lost update, reorder bắt buộc chứa đúng toàn bộ column, cột có task hoặc cột cuối không được xóa.
- Resource namespace theo tenant, signed URL, quota, liên kết task và kiểm tra quyền project; upload có khóa theo tenant trong một API instance. Storage key canonical gắn chính xác tenant/resource, filesystem path giữ trong tenant root và MinIO ký URL trực tiếp bằng public endpoint/region. Xóa metadata ghi audit và outbox trong cùng transaction, còn object storage được xóa idempotent bởi worker.
- In-app notification, SMTP/Mailpit adapter, lưu Web Push subscription; VAPID delivery thật chưa được hiện thực.
- Audit, admin APIs, rate limiting theo tenant/tier và nhãn quan sát `tenant_id`, `tenant_tier`, `tenant_placement`.
- Bốn migration control (`V1`–`V4`) và ba migration application (`V1`–`V3`) dùng chung cho Pool/Silo. Worker profile có job nâng application schema của placement `ACTIVE` còn cũ và cập nhật `schema_version` sau khi Flyway thành công.
- Integration test đã bổ sung cho project role/IDOR, column CRUD/reorder/conflict, membership revoke/version/tenant status, payment concurrency, exact tenant/resource key guard, MinIO deletion retry/dead-letter/requeue và provisioning claim/lease/force-kill recovery.

### 3.3 Frontend React

- React 19, TypeScript, Vite, React Router, TanStack Query, Material UI và dnd-kit.
- Có login, exchange, chọn tenant, dashboard, Kanban drag-and-drop, members, resources, notifications và admin.
- Access token giữ trong memory; API client có refresh flow và xử lý lỗi HTTP có cấu trúc.
- Kiểu DTO lõi được dẫn xuất từ OpenAPI; script `api:generate` và `api:check` ngăn contract bị lệch.
- Có trạng thái loading/empty/error ở các màn hình chính và kiểm tra conflict cho cập nhật task/column. Manager có UI thêm, đổi tên, chuyển trái/phải và xóa column; Member/Viewer không thấy action quản trị column. Admin có dialog tenant-scoped để xem và requeue resource cleanup dead letter.
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

Biên bản chi tiết, môi trường và ranh giới kết luận nằm tại [P0 verification 2026-08-26](testing/p0-verification-2026-08-26.md), [P1 verification 2026-08-26](testing/p1-verification-2026-08-26.md), [P1 continuation verification 2026-08-27](testing/p1-verification-2026-08-27.md), [P1 verification lượt 2](testing/p1-verification-2026-08-27-part-2.md), [P1 file/worker/MinIO verification 2026-08-31](testing/p1-verification-2026-08-31.md), [P1 rollback recovery verification 2026-08-31](testing/p1-verification-2026-08-31-part-2.md), [P2 preparation 2026-08-31](testing/p2-preparation-2026-08-31.md), [P2 isolation harness 2026-08-31](testing/p2-preparation-2026-08-31-part-2.md) và [P2 guard-omission/evidence gate 2026-08-31](testing/p2-preparation-2026-08-31-part-3.md). Các kết quả dưới đây là kiểm tra kỹ thuật, không phải kết quả thực nghiệm nghiên cứu.

| Kiểm tra | Kết quả xác minh |
|---|---|
| Backend clean test | 17 suite, 58/58 test pass; 0 failure, 0 error, 0 skip; giữ đủ 56 test checkpoint trước và 53 test nền. Đây là final rerun sau câu backfill SQL của V3 |
| RLS Testcontainers | 4/4 pass trên PostgreSQL 18.6 thật |
| Security/IDOR | 8 project authorization, 6 tenant membership và 10 tenant context/host test pass |
| Payment concurrency | Hai create đồng thời tạo đúng 1 payment; hai webhook trùng enqueue đúng 1 provisioning |
| Column management | API/OpenAPI/UI create/rename/reorder/delete pass integration; Manager-only, stale board version trả conflict, bảo vệ cột có task/cột cuối và tenant boundary |
| Provisioning durability | 14 test provisioning/credential/lease/state pass; JVM con bị force-kill ở ba ranh giới database-ready, application-migrated và ready-to-finalize, lease attempt 2 phục hồi không nhân đôi database/role; PostgreSQL rollback bị chặn hai lần liên tiếp rồi cleanup idempotent, manual retry từ `ROLLBACK_FAILED` đi đến `SUCCEEDED` |
| Resource/file tenant guard | Backend exact tenant/resource key, wrong aggregate, path traversal và foreign event guard pass; Playwright known foreign ID `404`, signed-key tamper `403`, notification/outbox isolation pass trên Pool/Silo |
| Resource deletion | 7 test pass; MinIO retry eventual cleanup, lần lỗi thứ năm chuyển dead-letter, system-admin requeue có audit và tenant boundary |
| Frontend TypeScript/OpenAPI | `lint` và `api:check` pass, không drift |
| Frontend unit test | 3 file, 5/5 test pass |
| Frontend production build | Pass với Vite 7.3.6 |
| Playwright E2E | Đúng 2/2 case Pool/Silo pass runtime bằng Chromium thật; host/role, stale-version `409`, file/download, notification và resource cleanup tenant matrix đều pass |
| npm install/audit | 263 package cài, audit 264 package, 0 vulnerability |
| k6 JavaScript syntax | Tất cả file `experiments/k6/*.js` và `lib/*.js` qua `node --check` |
| Infra/analyzer validation | Compose interpolation pass; 8/8 Python test (3 analyzer nền + 5 evidence gate) và JSON/Python/static checks pass |
| P2 protocol/evidence gate | 3 plan isolation/storage/payment hợp lệ; 8/8 Python test tổng cộng pass; payment giữ 5 trọng số và credential ở `PENDING_DATA`; chưa có measured result/elimination artifact |
| P2 Project CRUD isolation harness | Module độc lập 1 suite, 6/6 pass trên PostgreSQL 18.6; 18 guard-omission observation gồm 6 candidate leak explicit/Hibernate Pool, 3 RLS Pool protected và 9 Silo boundary protected; chưa có số đo |
| Docker Compose runtime | `scripts/dev-up.sh` rebuild/restart exit 0 trên volume hiện hữu; API healthy/readiness pass; worker log mới sạch WARN/ERROR qua nhiều vòng outbox poll |
| Compose MinIO outage | Pool và Silo cùng đạt resource cleanup dead letter ở `attempts=5`; requeue từng tenant dọn đúng object, không đổi dead letter/object tenant còn lại; audit có mặt và MinIO được khởi động lại |
| Flyway/upgrade | Truy vấn cuối xác nhận control V1–V4, Pool V1–V3 và Silo V1–V3 đều `success=true`; hai placement `ACTIVE`, `schema_version=3` |
| Role/RLS | 14/14 bảng Pool bật RLS + FORCE RLS; application roles không có `BYPASSRLS` |
| API smoke | Login/transfer/exchange/me/projects/refresh pass trên Pool và Silo; token sai host bị chặn 403 |
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

### Phần phụ thuộc nhóm nghiên cứu

- VPS/domain/wildcard DNS/TLS và cấu hình đúng với môi trường pilot.
- Credential VNPay Sandbox hoặc Stripe Test Mode nếu muốn spike adapter thật.
- SMTP ngoài local và khóa VAPID nếu nghiệm thu kênh gửi thật.
- Tuyển người tham gia, consent/phê duyệt, nhập dữ liệu SUS đã ẩn danh.
- Phê duyệt học thuật cho protocol, search cutoff, tiêu chí chọn/loại và báo cáo cuối.

## 6. Thứ tự tiếp tục được khuyến nghị

### P0 — Tạo baseline chạy được hoàn toàn

**Hoàn tất local ngày 2026-08-26.** Backend/frontend/static tests, Compose bootstrap, Flyway, seed Pool/Silo, role/RLS, API smoke và k6 smoke đều có bằng chứng trong biên bản P0. Stack được để ở trạng thái đang chạy tại cuối phiên; trạng thái này không được giả định còn nguyên ở phiên sau.

### P1 — Đóng các lỗ hổng nghiệm thu chức năng

**Đang thực hiện.** Bằng chứng chi tiết nằm trong biên bản P1; không suy rộng các test đã pass thành toàn bộ ma trận.

1. **Đã làm:** integration test cho project role/IDOR, tenant membership, host-token, membership revoke/version, suspended tenant và exact storage key; đúng hai Playwright case Manager/Member/Viewer cùng file/download/notification/background-job tenant matrix đã pass runtime.
2. **Đã làm thêm:** provisioning dùng atomic claim, `SKIP LOCKED`, lease/heartbeat, short transaction, metadata/credential ổn định; JVM con bị force-kill ở ba ranh giới và attempt 2 phục hồi idempotent; rollback PostgreSQL thất bại lặp lại cùng manual recovery từ `ROLLBACK_FAILED` đã pass. **Còn tùy chọn:** diễn tập worker container nếu nhóm cần bằng chứng vận hành sâu hơn.
3. **Đã làm:** physical resource deletion qua outbox, exact tenant/resource guard, MinIO retry, dead-letter lần thứ năm, system-admin requeue có audit, schema gate đóng startup-order V3/outbox và outage kéo dài trong Compose với requeue Pool/Silo độc lập.
4. **Đã làm:** column create/rename/reorder/delete ở API/OpenAPI/UI với Manager-only và board optimistic version; đúng 2 Playwright case pass runtime, cleanup để lại 0 artifact.
5. **Đã xác minh:** payment advisory lock và duplicate webhook concurrency trên PostgreSQL 18.6; mỗi race chỉ tạo/enqueue một lần.

### P2 — Hoàn tất spike và chốt Cổng B

1. **Đã chuẩn bị protocol/evidence gate:** khóa candidate, case, artifact, fingerprint, replicate và
   trọng số isolation/storage; payment giữ credential/trọng số là `PENDING_DATA`.
2. **Đã dựng guarded contract local:** cùng `Project CRUD` cho ba phương án isolation trên Pool và Silo,
   pass 6/6 trong module độc lập.
3. **Đã chạy guard omission local:** native/bulk/background ghi 6 leak cho explicit/Hibernate Pool và
   RLS chặn 3/3; tiếp theo review rồi khóa hồ sơ loại checksum-backed, không đổi leak thành `PASS`.
4. Đo latency, RAM và connection cho ứng viên còn lại bằng cùng seed/workload; lưu raw artifact + manifest.
5. Chạy storage và payment spike bằng credential thật nếu được cung cấp.
6. Chấm theo trọng số trong kế hoạch, cập nhật ADR 0003–0005 từ Proposed sang Accepted kèm bằng chứng.

### P3 — Pilot, thực nghiệm và tổng hợp

1. Pilot trên đúng VPS để khóa SLO; không đặt p95 mục tiêu hồi tố.
2. Chạy 3–5 tenant, 10–20 VU/tenant, lặp ít nhất ba lần, cùng seed/workload cho Pool và Silo.
3. Chạy noisy-neighbor trước/sau rate limit và báo cáo cả tenant nạn nhân.
4. QA dữ liệu, sinh lại bảng/biểu đồ, rồi mới viết kết luận cho từng câu hỏi nghiên cứu.
5. Nhóm nghiên cứu thực hiện user study/SUS; repo chỉ nhận dữ liệu đã ẩn danh hoặc tổng hợp.

## 7. Lệnh phục hồi và kiểm tra

Kiểm tra trạng thái trước khi làm:

```bash
git status --short
git diff --stat
```

Backend (Docker phải hoạt động để test RLS không bị skip):

```bash
cd apps/api
./mvnw -B -ntp clean test
```

Frontend:

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

Hạ tầng:

```bash
scripts/validate-infra.sh
scripts/dev-up.sh
node scripts/verify-minio-outage.mjs
scripts/validate-p2-spikes.sh
scripts/run-p2-isolation-security.sh
```

Smoke thật sau khi stack hoạt động:

```bash
scripts/run-experiment.sh smoke
```

Các workload nghiệp vụ cần token tenant thật trong environment; xem `experiments/README.md`. Không ghi token vào file hoặc manifest.

## 8. Câu lệnh mở đầu cho phiên sau

Có thể dùng nguyên văn:

> Đọc `docs/PROJECT_STATUS.md`, các biên bản trong `docs/testing/` đến `p1-verification-2026-08-31-part-2.md`, rồi đọc `resource/plan.md` và `resource/thuyetMinhSaasMultiTenancy.md`; kiểm tra working tree và tiếp tục sau khi file/download/background-job tenant matrix, MinIO fault injection Compose và provisioning rollback recovery đã pass local. Không khôi phục hai file resource đang bị xóa, không tạo dữ liệu nghiên cứu giả. Giữ 58 backend test (bao gồm đủ 56 test checkpoint trước và 53 test nền), 5 frontend unit test và đúng 2 Playwright E2E. Không suy rộng test local thành Cổng B hoặc E; ưu tiên P1 phụ thuộc credential khi credential được cung cấp, diễn tập worker container nếu thật sự cần, hoặc chuẩn bị P2 mà không tạo số đo giả.

Sau mỗi mốc đáng kể, cập nhật ngày, bảng tiến độ, kết quả test và danh sách nợ kỹ thuật trong chính tài liệu này.
