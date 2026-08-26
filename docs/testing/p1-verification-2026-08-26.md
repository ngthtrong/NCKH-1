# Biên bản xác minh P1 — 2026-08-26

## Phạm vi

Biên bản này ghi kết quả kiểm tra kỹ thuật local cho phần hardening P1 được phát triển trên commit nền
`7007b9f`, cùng các sửa lỗi P0 và P1 đang ở working tree, chưa commit. Phạm vi P1 của lần kiểm tra gồm:

- authorization tenant/project, IDOR và host–token–membership guard;
- payment idempotency dưới truy cập đồng thời;
- provisioning claim/lease, transaction boundary, retry và rollback state;
- resource metadata deletion cùng audit/outbox và handler xóa object theo tenant namespace;
- Playwright cho luồng đăng nhập/chọn tenant Pool và Silo, kể cả dùng token sai host.

Đây không phải dữ liệu thực nghiệm hiệu năng, không dùng để khóa SLO và không thay thế pilot trên VPS.
Không có số liệu nghiên cứu, DOI, SUS, access token hay secret nào được tạo hoặc lưu vào biên bản.

## Môi trường quan sát

| Thành phần | Phiên bản/giá trị |
| --- | --- |
| Docker Desktop / Engine | 4.88.0 / 29.7.2, Linux/amd64 |
| PostgreSQL Compose/Testcontainers | 18.6 |
| Java target và image API/worker | Java 21; image runtime Eclipse Temurin 21 |
| JVM host chạy Maven test | OpenJDK 25.0.4; Maven compiler vẫn target Java 21 |
| Maven Wrapper | 3.9.11 |
| Node / npm | 22.12.0 / 10.9.0 |
| Frontend | React 19.2.0, Vite 7.3.6, Vitest 4.1.11 |
| E2E | Playwright 1.62.1, Chrome for Testing 151.0.7922.34 |

Host chỉ có JDK 25 tại thời điểm xác minh. Compatibility Java 21 được giữ bằng `java.version=21` và
Dockerfile build/runtime Java 21; CI vẫn phải tiếp tục chạy trên Java 21 như cấu hình dự án.

## Backend clean test

Lệnh xác minh cuối:

```bash
cd apps/api
MAVEN_USER_HOME=/tmp/nckh-maven-home ./mvnw -q \
  -Dmaven.repo.local=/tmp/nckh-m2 \
  -Dspring.jpa.show-sql=false \
  -Dlogging.level.org.hibernate.SQL=OFF \
  clean test
```

Lệnh kết thúc với exit code `0`. Tổng hợp trực tiếp 16 file XML trong `target/surefire-reports`:

| Nhóm test | Số test | Kết quả |
| --- | ---: | --- |
| Project authorization/IDOR | 8 | Pass |
| Tenant membership authorization | 6 | Pass |
| Tenant context/filter/host | 10 | Pass |
| PostgreSQL RLS | 4 | Pass |
| Payment/provider/concurrency | 9 | Pass |
| Provisioning/credential/lease/state | 12 | Pass |
| Resource deletion/outbox | 4 | Pass |
| **Tổng** | **53** | **0 failure, 0 error, 0 skip** |

`skipped=0` cùng log Testcontainers xác nhận các integration test đã dùng PostgreSQL 18.6 thật, không
bị bỏ qua vì thiếu Docker.

### Bằng chứng authorization và cô lập

- Viewer đọc được project nhưng không tạo task/comment; Member tạo task/comment nhưng không quản trị
  project; Manager quản trị project/task.
- Tenant Owner/Admin không tự có quyền đọc project nếu thiếu `ProjectMembership`.
- Thu hồi `ProjectMembership` làm quyền project mất ngay; truy cập ID của tenant khác không tạo audit,
  outbox hoặc thay đổi hàng dữ liệu bên ngoài tenant hiện tại.
- Authorization project chạy trước lookup membership đích, tránh dùng API quản lý project để dò user.
- Member tenant không thể gọi revoke; Admin không tạo Owner hoặc revoke peer Admin; ID membership tenant
  khác trả not-found và không mutate.
- Middleware từ chối host/token mismatch, token có membership version cũ, membership đã revoke, tenant
  suspended và slug claim bị sửa; context hợp lệ luôn được xóa khỏi thread sau request.
- Bốn test RLS tiếp tục pass cho native query, bulk update, cross-tenant insert, `FORCE ROW LEVEL SECURITY`
  và kiểm tra runtime role không có `BYPASSRLS`.

### Bằng chứng payment concurrency

- Hai transaction đồng thời dùng cùng `Idempotency-Key` nhận cùng payment ID/reference và control
  database chỉ có một `payment_transactions` row.
- Hai webhook đồng thời có cùng event ID chỉ ghi một event, payment đạt `SUCCEEDED` và enqueue
  provisioning đúng một lần.
- Webhook giả, replay event ID với payload khác, return URL ngoài domain và dùng lại idempotency key cho
  tenant khác tiếp tục bị từ chối trong các test hiện có.

Cơ chế tạo session dùng PostgreSQL transaction advisory lock; unique constraint vẫn là invariant cuối.

### Bằng chứng provisioning durability

Mười test P1 mới kiểm tra riêng phần hardening:

- hai worker chỉ claim một queued job đúng một lần bằng `FOR UPDATE SKIP LOCKED`;
- lease `RUNNING` hết hạn được thu hồi cho attempt kế tiếp; lease còn hạn không bị cướp và chỉ token sở
  hữu mới renew được;
- hết retry limit chuyển sang nhánh rollback mà không tăng attempt giả;
- retry giải phóng lease và đặt thời điểm chạy lại; success kích hoạt tenant và xóa lease trong cùng
  control transaction; final failure chỉ kết thúc sau bước rollback;
- metadata Silo và runtime credential được chuẩn bị ổn định trước external DDL, retry dùng lại cùng
  database/role/credential; metadata placement sai bị fail closed.

Migration control `V3__provisioning_job_leases.sql` thêm owner/token/expiry và index lease hết hạn. Worker
không còn giữ transaction control plane trong lúc tạo database, chạy Flyway hoặc rollback bên ngoài.

### Bằng chứng resource deletion

- Xóa metadata, ghi audit và tạo `RESOURCE_DELETE_REQUESTED` nằm trong cùng transaction application DB;
  storage adapter không bị gọi inline.
- ID resource của tenant khác không bị xóa và không tạo cleanup event.
- Handler chỉ chấp nhận storage key có prefix UUID của tenant trong event; key tenant khác bị từ chối.
- Object delete có thể được retry qua outbox; đánh dấu processed chỉ diễn ra sau khi handler thành công.

## Frontend và E2E

Các lệnh sau đều kết thúc với exit code `0` trên working tree hiện tại:

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run api:check` | Pass; `openapi-typescript` 7.13.0, không drift |
| `npm run lint` | TypeScript project build pass |
| `npm test` | 3 file, 5/5 test pass |
| `npm run build` | Pass; Vite 7.3.6, 11.761 module |
| `npm run test:e2e` | 2/2 Playwright test pass trong 5,4 giây |

Hai E2E test thực hiện bằng trình duyệt:

1. đăng nhập tại `accounts.localhost`;
2. chọn và exchange session cho tenant Pool hoặc Silo;
3. xác nhận dashboard hiển thị đúng placement;
4. gửi access token vừa nhận sang host tenant còn lại qua gateway;
5. xác nhận backend trả `403` cho cả chiều Pool → Silo và Silo → Pool.

Chromium không thể tạo process trong filesystem sandbox (`Operation not permitted`), nên kết quả có thẩm
quyền ở trên là lượt chạy lại ngoài sandbox với cùng mã và cấu hình, exit code `0`. Credential E2E được
đọc từ `infra/.env` đang bị Git ignore; test/report không ghi password hoặc token.

## Runtime Compose và migration

`docker compose ... ps --all` cho thấy 10 service đúng trạng thái thiết kế:

- API, PostgreSQL, web và Mailpit ở trạng thái healthy;
- worker, Caddy, MinIO, Prometheus và Grafana đang running;
- `minio-init` kết thúc `Exited (0)` như kỳ vọng của one-shot initializer.

Truy vấn chỉ đọc trực tiếp cho kết quả:

| Database/control state | Kết quả |
| --- | --- |
| `control_db` Flyway | V1, V2, V3 đều `success=true` |
| `pool_db` Flyway | Application V1, `success=true` |
| Silo database Flyway | Application V1, `success=true` |
| `pool-demo` | `ACTIVE`, `POOL`, schema `1`, job `SUCCEEDED`, attempt `1`, 3 event, lease đã xóa |
| `silo-demo` | `ACTIVE`, `SILO_DATABASE`, schema `1`, job `SUCCEEDED`, attempt `1`, 3 event, lease đã xóa |
| Tổng provisioning | 2 job, 2 idempotency key khác nhau, 0 job có lease, cả 2 `SUCCEEDED` |

`scripts/validate-infra.sh` cũng pass: Compose interpolation/static checks và 3/3 analyzer test đạt.
Stack được để đang chạy tại cuối lần xác minh này, nhưng phiên sau phải kiểm tra lại thay vì giả định trạng
thái còn nguyên.

## Kiểm tra vệ sinh repo

- Không tìm thấy private-key marker, AWS access key, Stripe live/test key hoặc bearer JWT trong các file
  nguồn/tài liệu thuộc phạm vi Git; example secret tiếp tục chỉ là chuỗi `change-me`.
- `infra/.env`, Playwright trace/video/screenshot và report đều bị Git ignore.
- Không khôi phục `resource/important.md`, `resource/thuyet_minh_SaaS.md`; không tạo hoặc ghi `draft.md`.
- Không tạo file kết quả trong `experiments/results` hoặc `experiments/derived`.

## Ranh giới kết luận và phần còn thiếu

P1 đã đóng được các race/gap lõi về payment creation, membership revoke, resource cleanup và
provisioning transaction/lease; đồng thời có E2E Pool/Silo đầu tiên. Tuy nhiên **P1 chưa hoàn tất toàn bộ**:

- chưa có CRUD/reorder column đầy đủ ở API/OpenAPI/frontend;
- Playwright mới bao phủ auth/select/host binding, chưa bao phủ toàn bộ role/action matrix, optimistic
  conflict, resource file-key tampering và các trạng thái UI;
- chưa force-kill worker giữa external DDL và finalize, chưa fault-inject migration/rollback thật;
- chưa fault-inject MinIO để quan sát outbox backoff đến khi object được xóa;
- Web Push VAPID và adapter thanh toán thật vẫn chờ cấu hình/credential ngoài repo.

Các test hiện tại không có ca truy cập chéo thành công, nhưng điều đó chỉ áp dụng cho phạm vi đã tự động
hóa; chưa đủ để tuyên bố toàn bộ ma trận nghiệm thu hoàn tất. Cổng B vẫn chờ ba isolation spike, đo và
chấm điểm/ADR. Cổng E vẫn chờ pilot VPS, SLO khóa trước và thực nghiệm chính. Không có kết quả hiệu năng
hay nghiên cứu nào được suy ra từ lần xác minh kỹ thuật này.

## Lệnh tái kiểm tra

```bash
cd apps/api
./mvnw -B -ntp clean test

cd ../web
npm ci
npm run api:check
npm run lint
npm test
npm run build
npm run test:e2e:install
E2E_ENV_FILE=../../infra/.env npm run test:e2e

cd ../..
scripts/validate-infra.sh
scripts/dev-up.sh
```

Playwright cần stack đã seed một tenant Pool và một tenant Silo ở trạng thái `ACTIVE`; credential phải đến
từ environment hoặc file local bị ignore.
