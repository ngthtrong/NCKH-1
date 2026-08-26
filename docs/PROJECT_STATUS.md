# Điểm khôi phục triển khai đề tài

**Cập nhật:** 2026-08-26 (UTC)
**Nhánh đang làm:** `main`
**Commit nền trước các sửa lỗi P0/P1:** `7007b9f` (`implement plan project status`)
**Trạng thái:** P0 hoàn tất local; phần hardening lõi P1 đã được xác minh, nhưng P1 và toàn bộ đề tài chưa nghiệm thu.

Tài liệu này là điểm bắt đầu cho phiên làm việc tiếp theo. Nó phân biệt rõ mã đã hiện thực, kiểm tra đã chạy, phần mới chỉ là khung và phần bắt buộc phải chờ dữ liệu/hạ tầng thật.

## 1. Nguồn sự thật và nguyên tắc bảo toàn

- Thuyết minh chính: [`resource/thuyetMinhSaasMultiTenancy.md`](../resource/thuyetMinhSaasMultiTenancy.md).
- Kế hoạch thực hiện: [`resource/plan.md`](../resource/plan.md).
- Không khôi phục hai file người dùng đang chủ động xóa: `resource/important.md` và `resource/thuyet_minh_SaaS.md`.
- `draft.md` không còn tồn tại tại checkpoint; nếu người dùng tạo lại file này thì không được ghi đè khi chưa kiểm tra nội dung.
- Tại thời điểm chốt, `main` và `origin/main` cùng trỏ tới `7007b9f`. Các sửa lỗi P0/P1, test, `.dockerignore` và tài liệu xác minh đang thay đổi/chưa commit. Phiên sau vẫn phải đọc `git status --short` vì trạng thái có thể đã thay đổi.
- Không tạo số đo, DOI, kết quả khảo sát, SUS hoặc kết quả thực nghiệm giả. Mục có nhãn `UNVERIFIED` phải tiếp tục giữ nhãn đến khi kiểm chứng nguồn thật.
- Không tuyên bố Cổng B/E đạt chỉ từ compile, unit test hoặc test dùng fixture.

## 2. Tiến độ theo giai đoạn

| Giai đoạn | Trạng thái tại checkpoint | Phần còn thiếu để qua cổng |
|---|---|---|
| A — Repo và giao thức nghiên cứu | **Đang thực hiện, khung chính đã có** | Kiểm chứng trực tuyến toàn bộ nguồn/DOI, hoàn tất sàng lọc và bảo đảm mọi yêu cầu đều truy vết được |
| B — Spike và ADR | **Một phần** | Chạy đủ ba phương án cô lập trên Pool/Silo bằng PostgreSQL thật; đo latency/RAM/connection; chạy spike storage/payment; chấm điểm và chốt ADR 0003–0005 |
| C — Kiến trúc và hợp đồng | **Khung chính đã có** | Review tính nhất quán sau khi ADR B được chốt; bổ sung chi tiết nếu spike làm thay đổi quyết định |
| D — Lát cắt dọc | **Baseline chức năng + hardening P1 một phần** | Hoàn thiện column management, Web Push thật, phần còn lại của role/IDOR/E2E, fault injection và các trạng thái UI còn thiếu |
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
- Provisioning state machine có idempotency, retry, rollback và bảng sự kiện audit. Control migration V3 bổ sung claim lease; worker dùng `SKIP LOCKED`, heartbeat và các transaction ngắn quanh claim/prepare/finalize thay vì giữ control transaction qua external DDL.
- Placement Silo được chuẩn bị với database/role/credential ổn định trước external DDL; retry dùng lại cùng metadata và credential đã mã hóa.
- Project, project role, board, task, subtask một cấp, comment, assignee, due date và optimistic locking.
- Resource namespace theo tenant, signed URL, quota, liên kết task và kiểm tra quyền project; upload có khóa theo tenant trong một API instance. Xóa metadata ghi audit và outbox trong cùng transaction, còn object storage được xóa idempotent bởi worker.
- In-app notification, SMTP/Mailpit adapter, lưu Web Push subscription; VAPID delivery thật chưa được hiện thực.
- Audit, admin APIs, rate limiting theo tenant/tier và nhãn quan sát `tenant_id`, `tenant_tier`, `tenant_placement`.
- Ba migration control (`V1`–`V3`) và một migration application dùng chung cho Pool/Silo.
- Integration test đã bổ sung cho project role/IDOR, membership revoke/version/tenant status, payment concurrency, resource deletion và provisioning claim/lease/state.

### 3.3 Frontend React

- React 19, TypeScript, Vite, React Router, TanStack Query, Material UI và dnd-kit.
- Có login, exchange, chọn tenant, dashboard, Kanban drag-and-drop, members, resources, notifications và admin.
- Access token giữ trong memory; API client có refresh flow và xử lý lỗi HTTP có cấu trúc.
- Kiểu DTO lõi được dẫn xuất từ OpenAPI; script `api:generate` và `api:check` ngăn contract bị lệch.
- Có trạng thái loading/empty/error ở các màn hình chính và kiểm tra conflict cho cập nhật task; vẫn cần audit UI theo toàn bộ ma trận vai trò.
- Playwright đã có hai luồng trình duyệt cho login/chọn tenant Pool/Silo và xác minh token mỗi tenant bị chặn `403` trên host tenant còn lại.

### 3.4 Hạ tầng, CI và thực nghiệm

- Compose gồm PostgreSQL 18, API, worker, web/Caddy, MinIO, Mailpit, Prometheus và Grafana.
- Compose đã được sửa theo layout volume PostgreSQL 18, root filesystem web read-only có tmpfs riêng và healthcheck IPv4 ổn định.
- Role API không nhận `CREATEDB`/`BYPASSRLS`; provisioner credential chỉ cấp cho worker.
- Có runbook local, deployment, backup/restore; secrets thật bị loại khỏi Git.
- GitHub Actions có backend/frontend test, lint/build, OpenAPI drift check, migration validation tĩnh, dependency review và container build.
- k6 có smoke, baseline, load, stress và noisy-neighbor; baseline/load/stress hỗ trợ cấu hình `TENANT_A` đến `TENANT_E` thành scenario riêng.
- Có manifest/schema, thu metric Prometheus, Python QA/analyzer, CSV/report/SVG tái tạo từ dữ liệu thật và unit test cho analyzer.
- `experiments/results` và `experiments/derived` bị ignore; analyzer dừng nếu không có run hợp lệ thay vì sinh dữ liệu mẫu.

## 4. Bằng chứng kiểm tra đã có

Biên bản chi tiết, môi trường và ranh giới kết luận nằm tại [P0 verification 2026-08-26](testing/p0-verification-2026-08-26.md) và [P1 verification 2026-08-26](testing/p1-verification-2026-08-26.md). Các kết quả dưới đây là kiểm tra kỹ thuật, không phải kết quả thực nghiệm nghiên cứu.

| Kiểm tra | Kết quả tại checkpoint |
|---|---|
| Backend clean test | 16 suite, 53/53 test pass; 0 failure, 0 error, 0 skip; exit code 0 |
| RLS Testcontainers | 4/4 pass trên PostgreSQL 18.6 thật |
| Security/IDOR | 8 project authorization, 6 tenant membership và 10 tenant context/host test pass |
| Payment concurrency | Hai create đồng thời tạo đúng 1 payment; hai webhook trùng enqueue đúng 1 provisioning |
| Provisioning durability | 10 test P1 cho claim/lease/retry/rollback/credential pass; 2 test baseline provisioning tiếp tục pass |
| Resource deletion | 4 test transaction outbox/tenant namespace pass; không gọi storage inline |
| Frontend TypeScript/OpenAPI | `lint` và `api:check` pass, không drift |
| Frontend unit test | 3 file, 5/5 test pass |
| Frontend production build | Pass với Vite 7.3.6 |
| Playwright E2E | 2/2 pass: Pool → Silo và Silo → Pool token/host mismatch đều trả `403` |
| npm install/audit | 263 package cài, audit 264 package, 0 vulnerability |
| k6 JavaScript syntax | Tất cả file `experiments/k6/*.js` và `lib/*.js` qua `node --check` |
| Infra/analyzer validation | Compose interpolation pass; 3 Python test và JSON/Python/static checks pass |
| Docker Compose runtime | `scripts/dev-up.sh` exit 0 và chạy lại idempotent; 10 service được tạo/chạy đúng trạng thái |
| Flyway/seed | Control V1–V3, Pool V1 và Silo V1 pass; hai tenant `ACTIVE`, cùng seed 1 project/3 task |
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

- Local Compose, Flyway và schema V1 của Pool/Silo đã xác minh; vẫn chưa có nhiều phiên bản application migration để kiểm thử đường nâng cấp Silo `V1→Vn`.
- Playwright và ma trận integration đã bao phủ lát cắt quan trọng, nhưng chưa đủ mọi ô role/action: column CRUD, optimistic conflict qua HTTP/UI, file-key tampering, resource download và background job sai tenant vẫn cần test bổ sung.
- Physical resource deletion đã chuyển sang outbox/retry; chưa fault-inject MinIO để kiểm chứng backoff và eventual cleanup end-to-end. Outbox hiện dừng sau 5 attempt nhưng chưa có dead-letter/requeue workflow quản trị.
- Provisioning đã tách claim → external work → finalize và có lease recovery; vẫn cần force-kill worker ở các điểm giữa DDL/migration/finalize, kiểm tra rollback lỗi thật và chứng minh retry không tạo tài nguyên trùng trên các failure point đó.
- Payment creation/webhook concurrency đã pass trên PostgreSQL thật; adapter VNPay/Stripe thật vẫn phải kiểm thử signature/callback bằng credential sandbox khi nhóm cung cấp.

### Chức năng còn thiếu hoặc mới là adapter

- Chưa có CRUD/sắp xếp column đầy đủ; board hiện chủ yếu hỗ trợ tạo/default và Kanban task movement. Đây là chức năng P1 ưu tiên tiếp theo.
- Web Push mới lưu subscription và trả trạng thái `VAPID_NOT_CONFIGURED`; chưa gửi thật.
- VNPay/Stripe adapter thật chưa có do chưa có credential; FakePaymentProvider là mặc định hợp lệ cho local/test.
- ADR isolation/payment/storage vẫn ở trạng thái Proposed vì spike và số đo chưa hoàn tất.
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

1. **Đã làm phần lõi:** integration test cho project role/IDOR, tenant membership, host-token, membership revoke/version và suspended tenant. **Còn:** các mutation chưa phủ đủ, file key/download, job sai tenant và HTTP/UI matrix.
2. **Đã làm phần lõi:** provisioning dùng atomic claim, `SKIP LOCKED`, lease/heartbeat, short transaction, metadata/credential ổn định và state transition test. **Còn:** force-kill/failure injection qua DDL, Flyway và rollback thật.
3. **Đã làm phần lõi:** physical resource deletion qua outbox, tenant-prefix guard và transaction test. **Còn:** MinIO failure/backoff/eventual cleanup và dead-letter/requeue.
4. **Đã làm một phần:** optimistic-lock UI baseline và 2 Playwright test Pool/Silo host binding. **Còn ưu tiên cao nhất:** column CRUD/reorder và Playwright cho Kanban/conflict/role states.
5. **Đã xác minh:** payment advisory lock và duplicate webhook concurrency trên PostgreSQL 18.6; mỗi race chỉ tạo/enqueue một lần.

### P2 — Hoàn tất spike và chốt Cổng B

1. Dựng cùng `Project CRUD` cho ba phương án isolation trên Pool và Silo.
2. Chạy security matrix; loại ngay phương án có truy cập chéo thành công.
3. Đo latency, RAM và connection bằng cùng seed/workload; lưu raw artifact + manifest.
4. Chạy storage và payment spike bằng credential thật nếu được cung cấp.
5. Chấm theo trọng số trong kế hoạch, cập nhật ADR 0003–0005 từ Proposed sang Accepted kèm bằng chứng.

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
```

Smoke thật sau khi stack hoạt động:

```bash
scripts/run-experiment.sh smoke
```

Các workload nghiệp vụ cần token tenant thật trong environment; xem `experiments/README.md`. Không ghi token vào file hoặc manifest.

## 8. Câu lệnh mở đầu cho phiên sau

Có thể dùng nguyên văn:

> Đọc `docs/PROJECT_STATUS.md`, hai biên bản `docs/testing/p0-verification-2026-08-26.md` và `docs/testing/p1-verification-2026-08-26.md`, rồi đọc `resource/plan.md` và `resource/thuyetMinhSaasMultiTenancy.md`; kiểm tra working tree và tiếp tục phần P1 còn lại. Không khôi phục hai file resource đang bị xóa, không ghi đè `draft.md`, không tạo dữ liệu nghiên cứu giả. Giữ 53 backend test, 5 frontend unit test, 2 Playwright E2E và Compose/Flyway xanh; ưu tiên column CRUD/reorder, sau đó failure injection provisioning/resource.

Sau mỗi mốc đáng kể, cập nhật ngày, bảng tiến độ, kết quả test và danh sách nợ kỹ thuật trong chính tài liệu này.
