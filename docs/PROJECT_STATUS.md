# Điểm khôi phục triển khai đề tài

**Cập nhật:** 2026-08-25 (UTC)  
**Nhánh đang làm:** `main`  
**Commit nền trước checkpoint này:** `bdb92ed` (`implement plan phase 1`)  
**Trạng thái:** baseline ứng dụng và tài liệu đã được dựng; chưa nghiệm thu toàn bộ đề tài.

Tài liệu này là điểm bắt đầu cho phiên làm việc tiếp theo. Nó phân biệt rõ mã đã hiện thực, kiểm tra đã chạy, phần mới chỉ là khung và phần bắt buộc phải chờ dữ liệu/hạ tầng thật.

## 1. Nguồn sự thật và nguyên tắc bảo toàn

- Thuyết minh chính: [`resource/thuyetMinhSaasMultiTenancy.md`](../resource/thuyetMinhSaasMultiTenancy.md).
- Kế hoạch thực hiện: [`resource/plan.md`](../resource/plan.md).
- Không khôi phục hai file người dùng đang chủ động xóa: `resource/important.md` và `resource/thuyet_minh_SaaS.md`.
- `draft.md` không còn tồn tại tại checkpoint; nếu người dùng tạo lại file này thì không được ghi đè khi chưa kiểm tra nội dung.
- Tại thời điểm chốt, `main` và `origin/main` cùng trỏ tới `bdb92ed`; chỉ README và tài liệu checkpoint này đang thay đổi/chưa commit. Phiên sau vẫn phải đọc `git status --short` vì trạng thái có thể đã thay đổi.
- Không tạo số đo, DOI, kết quả khảo sát, SUS hoặc kết quả thực nghiệm giả. Mục có nhãn `UNVERIFIED` phải tiếp tục giữ nhãn đến khi kiểm chứng nguồn thật.
- Không tuyên bố Cổng B/E đạt chỉ từ compile, unit test hoặc test dùng fixture.

## 2. Tiến độ theo giai đoạn

| Giai đoạn | Trạng thái tại checkpoint | Phần còn thiếu để qua cổng |
|---|---|---|
| A — Repo và giao thức nghiên cứu | **Đang thực hiện, khung chính đã có** | Kiểm chứng trực tuyến toàn bộ nguồn/DOI, hoàn tất sàng lọc và bảo đảm mọi yêu cầu đều truy vết được |
| B — Spike và ADR | **Một phần** | Chạy đủ ba phương án cô lập trên Pool/Silo bằng PostgreSQL thật; đo latency/RAM/connection; chạy spike storage/payment; chấm điểm và chốt ADR 0003–0005 |
| C — Kiến trúc và hợp đồng | **Khung chính đã có** | Review tính nhất quán sau khi ADR B được chốt; bổ sung chi tiết nếu spike làm thay đổi quyết định |
| D — Lát cắt dọc | **Baseline chức năng, chưa đủ ma trận nghiệm thu** | Hoàn thiện column management, Web Push thật, test role/IDOR/E2E, xử lý crash/retry và các trạng thái UI còn thiếu |
| E — Triển khai và thực nghiệm | **Có Compose/test/k6 harness; chưa có số đo chính** | Chạy Docker/PostgreSQL thật, pilot VPS, khóa SLO, chạy 3–5 tenant lặp lại, QA dữ liệu, noisy-neighbor và đánh giá người dùng |
| F — Tổng hợp | **Chưa thực hiện** | Chỉ bắt đầu sau khi có bằng chứng A–E; hoàn thiện báo cáo, bản tin, demo và video |

**Kết luận cổng:** chưa đánh dấu Cổng A, B hoặc E là đạt. Cổng E đặc biệt chưa đạt vì chưa có lần chạy Docker/VPS và dữ liệu đo thật tại checkpoint này.

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
- Fake payment provider, kiểm tra amount/currency/return URL, idempotency và webhook signature/replay/payload hash.
- Provisioning state machine có idempotency, retry, rollback và bảng sự kiện audit. Retry Silo cập nhật lại mật khẩu role để secret lưu trong control plane luôn khớp PostgreSQL.
- Project, project role, board, task, subtask một cấp, comment, assignee, due date và optimistic locking.
- Resource namespace theo tenant, signed URL, quota, liên kết task và kiểm tra quyền project; upload có khóa theo tenant trong một API instance.
- In-app notification, SMTP/Mailpit adapter, lưu Web Push subscription; VAPID delivery thật chưa được hiện thực.
- Audit, admin APIs, rate limiting theo tenant/tier và nhãn quan sát `tenant_id`, `tenant_tier`, `tenant_placement`.
- Hai migration control (`V1`, `V2`) và một migration application dùng chung cho Pool/Silo.

### 3.3 Frontend React

- React 19, TypeScript, Vite, React Router, TanStack Query, Material UI và dnd-kit.
- Có login, exchange, chọn tenant, dashboard, Kanban drag-and-drop, members, resources, notifications và admin.
- Access token giữ trong memory; API client có refresh flow và xử lý lỗi HTTP có cấu trúc.
- Kiểu DTO lõi được dẫn xuất từ OpenAPI; script `api:generate` và `api:check` ngăn contract bị lệch.
- Có trạng thái loading/empty/error ở các màn hình chính và kiểm tra conflict cho cập nhật task; vẫn cần audit UI theo toàn bộ ma trận vai trò.

### 3.4 Hạ tầng, CI và thực nghiệm

- Compose gồm PostgreSQL 18, API, worker, web/Caddy, MinIO, Mailpit, Prometheus và Grafana.
- Role API không nhận `CREATEDB`/`BYPASSRLS`; provisioner credential chỉ cấp cho worker.
- Có runbook local, deployment, backup/restore; secrets thật bị loại khỏi Git.
- GitHub Actions có backend/frontend test, lint/build, OpenAPI drift check, migration validation tĩnh, dependency review và container build.
- k6 có smoke, baseline, load, stress và noisy-neighbor; baseline/load/stress hỗ trợ cấu hình `TENANT_A` đến `TENANT_E` thành scenario riêng.
- Có manifest/schema, thu metric Prometheus, Python QA/analyzer, CSV/report/SVG tái tạo từ dữ liệu thật và unit test cho analyzer.
- `experiments/results` và `experiments/derived` bị ignore; analyzer dừng nếu không có run hợp lệ thay vì sinh dữ liệu mẫu.

## 4. Bằng chứng kiểm tra đã có

Các kết quả dưới đây là kiểm tra kỹ thuật, không phải kết quả thực nghiệm nghiên cứu.

| Kiểm tra | Kết quả tại checkpoint |
|---|---|
| Backend compile offline | Thành công; biên dịch 82 file Java |
| Backend test | 20 test: 16 pass, 4 test RLS skip do không kết nối được Docker daemon |
| Frontend TypeScript | `tsc -b --pretty false` thành công sau thay đổi gần nhất |
| Frontend unit test | 3 file, 5 test pass ở lần chạy gần nhất |
| Frontend production build | Đã pass trước thay đổi contract gần nhất; cần chạy lại toàn bộ ở phiên sau |
| OpenAPI generated-type drift | `npm run api:check` đã pass ở lần chạy gần nhất |
| k6 JavaScript syntax | Tất cả file `experiments/k6/*.js` và `lib/*.js` qua `node --check` |
| Infra/analyzer validation | 3 Python test pass; JSON/Python/static checks pass |
| Docker Compose runtime | Chưa chạy; Docker WSL integration/daemon không khả dụng |

Lệnh kiểm tra compile cuối cùng đã dùng cache Maven cục bộ:

```bash
/tmp/apache-maven-3.9.11/bin/mvn -o \
  -Dmaven.repo.local=/tmp/nckh-m2 \
  -DskipTests compile
```

Lệnh TypeScript cuối cùng:

```bash
cd apps/web
/tmp/node-v22.12.0-linux-x64/bin/node node_modules/typescript/bin/tsc -b --pretty false
```

## 5. Giới hạn và nợ kỹ thuật đã biết

### Bắt buộc trước khi nghiệm thu an toàn

- Docker daemon chưa khả dụng, nên bốn test PostgreSQL RLS (native select, bulk update, cross-tenant insert, owner/superuser behavior) đang bị skip.
- Chưa xác nhận Compose startup, Flyway `control V1→V2`, Pool migration và nhiều phiên bản Silo trên PostgreSQL 18 thật.
- Chưa có Playwright E2E hoặc ma trận tích hợp đầy đủ cho role tenant/project, host/token/payload tampering, file key, membership revoked, webhook giả/trùng và job sai tenant.
- `ResourceService.delete` xóa hàng DB trước khi xóa object storage; lỗi storage có thể để object mồ côi. Nên chuyển physical deletion sang outbox/retry.
- Worker đang giữ transaction control plane trong lúc provisioning/migration bên ngoài; nên tách claim → process → finalize, thêm lock/`SKIP LOCKED`, lease/timeout và test crash recovery.
- Tạo payment session đồng thời với cùng idempotency key có thể đụng unique constraint trước khi đọc lại; cần khóa/advisory lock hoặc bắt `DataIntegrityViolationException` rồi trả bản ghi thắng.

### Chức năng còn thiếu hoặc mới là adapter

- Chưa có CRUD/sắp xếp column đầy đủ; board hiện chủ yếu hỗ trợ tạo/default và Kanban task movement.
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

1. Đọc tài liệu này, `git status --short`, thuyết minh và kế hoạch; bảo toàn các file người dùng nêu ở mục 1.
2. Bật Docker Desktop WSL integration hoặc Docker Engine tương đương.
3. Chạy toàn bộ backend/frontend/static tests theo mục 7; sửa mọi lỗi trước khi thêm chức năng.
4. Chạy `scripts/dev-up.sh`, kiểm tra health, seed cả `pool-demo` và `silo-demo`, sau đó kiểm tra migration/role/RLS bằng database thật.
5. Chạy lại bốn RLS Testcontainers test và lưu log kiểm tra, nhưng không coi đó là dữ liệu hiệu năng.

### P1 — Đóng các lỗ hổng nghiệm thu chức năng

1. Thêm integration test cho toàn bộ permission/IDOR/host-token/membership-revocation matrix.
2. Tách transaction provisioning, thêm claim locking/lease/crash recovery và test retry không tạo tài nguyên trùng.
3. Đưa physical resource deletion vào outbox/retry và test failure path.
4. Hoàn thiện column management, optimistic-lock UI và Playwright cho hai tenant Pool/Silo.
5. Cứng hóa payment idempotency khi hai request đồng thời.

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
./mvnw -B -ntp test
```

Frontend:

```bash
cd apps/web
npm ci
npm run api:check
npm run lint
npm test
npm run build
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

> Đọc `docs/PROJECT_STATUS.md`, `resource/plan.md` và `resource/thuyetMinhSaasMultiTenancy.md`; kiểm tra working tree và tiếp tục từ P0. Không khôi phục hai file resource đang bị xóa, không ghi đè `draft.md`, không tạo dữ liệu nghiên cứu giả. Trước tiên hãy chạy full verification khi Docker khả dụng, rồi cập nhật lại checkpoint bằng bằng chứng thực tế.

Sau mỗi mốc đáng kể, cập nhật ngày, bảng tiến độ, kết quả test và danh sách nợ kỹ thuật trong chính tài liệu này.
