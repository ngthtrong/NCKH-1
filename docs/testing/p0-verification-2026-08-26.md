# Biên bản xác minh P0 — 2026-08-26

## Phạm vi

Biên bản này ghi kết quả kiểm tra kỹ thuật local của baseline tại commit nền `7007b9f` cùng các sửa lỗi P0 chưa commit. Đây **không phải** dữ liệu thực nghiệm chính, không dùng để khóa SLO và không thay thế pilot trên VPS.

Không có secret, access token hay nội dung định danh người tham gia được lưu trong biên bản. Token của smoke API chỉ tồn tại trong biến tiến trình và file tạm đã được xóa khi lệnh kết thúc.

## Môi trường quan sát

| Thành phần | Phiên bản/giá trị |
|---|---|
| Docker Desktop | 4.88.0 (237115) |
| Docker Engine | 29.7.2, Linux/amd64 |
| PostgreSQL runtime/Testcontainers | 18.6 |
| Java trong image API/worker | Eclipse Temurin 21.0.12 |
| Node dùng xác minh frontend | 22.12.0 |
| npm | 10.9.0 |
| k6 smoke image | `grafana/k6:2.2.0`, digest `sha256:9bd01d6941fca969cb61bb57d2da5ee9b385fe2aa8881df3798c196564d6ace6` |

## Kết quả kiểm tra

| Nhóm | Kết quả quan sát |
|---|---|
| Backend Maven | 20/20 pass; 0 failure, 0 error, 0 skip |
| RLS Testcontainers | 4/4 pass trên PostgreSQL 18.6 |
| Frontend install | 260 package được cài, audit 261 package, 0 vulnerability |
| OpenAPI drift | Pass với `openapi-typescript` 7.13.0 |
| TypeScript | Pass |
| Frontend unit test | 3 file, 5/5 test pass |
| Frontend production build | Pass với Vite 7.3.6; 11.761 module |
| Infra/analyzer | Compose config pass; 4 JSON parse pass; 3 Python module compile pass; 3/3 analyzer test pass |
| k6 JavaScript syntax | Tất cả scenario và thư viện dùng chung qua `node --check` |
| Bootstrap | `scripts/dev-up.sh` hoàn tất với exit code 0 và chạy lại idempotent |
| Container | API, worker, web, PostgreSQL và Caddy đều running, restart count 0; API/PostgreSQL/web healthy |
| Dịch vụ phụ trợ | Mailpit, MinIO, Prometheus và Grafana trả health/readiness thành công; Prometheus target API ở trạng thái up |
| k6 smoke | 1 iteration, 2/2 check pass, `http_req_failed=0`; timing của một request không phải số liệu hiệu năng |

Cảnh báo frontend duy nhất là dependency gián tiếp `whatwg-encoding@3.1.1` đã deprecated; không có lỗi build hoặc vulnerability do npm audit báo cáo.

## Bằng chứng migration, placement và dữ liệu seed

- Control database có Flyway `V1__control_plane` và `V2__payment_and_provisioning_evidence`, cả hai `success=true`.
- `pool_db` có Flyway `V1__application_plane`, `success=true`.
- Database Silo được worker tạo tự động và có cùng Flyway application V1, `success=true`.
- `pool-demo` ở `ACTIVE`, tier `STARTER`, placement `POOL`, schema version `1`.
- `silo-demo` ở `ACTIVE`, tier `ENTERPRISE`, placement `SILO_DATABASE`, schema version `1`.
- Mỗi placement có cùng seed: 1 project và 3 task.
- Sau nhiều lần restart worker vẫn chỉ có 2 tenant, 2 provisioning job và 6 event. Mỗi job có đúng 1 attempt và chuỗi ba event `QUEUED → RUNNING → SUCCEEDED`; không tạo tenant/database/job trùng.

## Bằng chứng cô lập và đặc quyền

- Cả 14 bảng application trong Pool đều có `relrowsecurity=true` và `relforcerowsecurity=true`.
- Cả 14 bảng có policy `tenant_isolation` áp dụng `ALL`.
- `control_api`, `pool_api` và role runtime của Silo đều không phải superuser, không có `BYPASSRLS`, `CREATEDB` hoặc `CREATEROLE`.
- `control_migrator` không phải superuser và không có `BYPASSRLS`, `CREATEDB` hoặc `CREATEROLE`.
- `saas_provisioner` có `CREATEDB`/`CREATEROLE` theo thiết kế worker, nhưng không phải superuser và không có `BYPASSRLS`.
- Testcontainers xác minh native SELECT, bulk UPDATE, cross-tenant INSERT, owner với `FORCE RLS` và superuser bypass kỳ vọng.

## Smoke API qua reverse proxy

Luồng sau đã pass riêng cho `pool-demo` và `silo-demo`:

1. Login tại `accounts.localhost` trả đúng hai tenant.
2. Tạo mã chuyển tiếp một lần.
3. Exchange tại đúng tenant subdomain.
4. `/auth/me` trả đúng tenant đang hoạt động.
5. `/projects` đọc được project seed trên cả Pool và Silo.
6. Dùng token tenant trên subdomain còn lại bị chặn `403`.
7. Refresh token với cookie host-only và CSRF header hợp lệ thành công.

Kiểm tra này chứng minh đường đi local hoạt động và host–token guard được thực thi. Nó chưa thay thế toàn bộ ma trận IDOR, role, membership revocation hoặc E2E trình duyệt ở P1.

## Lỗi runtime tìm thấy và đã sửa

| Lỗi quan sát | Nguyên nhân | Sửa đổi |
|---|---|---|
| RLS fixture lỗi khi insert `timestamptz` | pgjdbc không suy luận `Instant` cho fixture này | Dùng `OffsetDateTime` UTC trong `RowLevelSecurityTest` |
| PostgreSQL 18 restart/unhealthy | Volume còn mount theo layout cũ `/var/lib/postgresql/data` | Mount parent `/var/lib/postgresql` |
| Hibernate validate báo thiếu bảng control | Spring Boot 4 cần starter để tự động chạy migration; PostgreSQL vẫn cần module database riêng theo [tài liệu Spring Boot](https://docs.spring.io/spring-boot/how-to/data-initialization.html#howto.data-initialization.migration-tool.flyway) | Dùng `spring-boot-starter-flyway` và giữ module PostgreSQL |
| nginx không tạo được `client_temp` | Root filesystem read-only, cache path không ghi được | Gắn tmpfs cho `/var/cache/nginx` |
| Web healthcheck connection refused | BusyBox phân giải `localhost` sang `::1`, nginx chỉ listen IPv4 | Probe `127.0.0.1:8080/healthz` |
| Docker build context tăng lên 166 MB sau `npm ci` | Chưa có `.dockerignore` ở context gốc | Loại `node_modules`, `dist`, `target`, secrets và artifact khỏi context |

## Lệnh tái kiểm tra chính

```bash
cd apps/api
./mvnw -B -ntp test

cd ../web
npm ci
npm run api:check
npm run lint
npm test
npm run build

cd ../..
scripts/validate-infra.sh
scripts/dev-up.sh
```

k6 smoke được chạy trong official container gắn vào Compose network để không yêu cầu cài k6 trên host:

```bash
docker run --rm \
  --network saas-research_saas \
  --env BASE_URL=http://caddy \
  --env ACCOUNTS_HOST=accounts.localhost \
  --volume "$PWD/experiments:/work:ro" \
  grafana/k6:2.2.0 run /work/k6/smoke.js
```

## Ranh giới kết luận

- P0 local baseline được xem là hoàn tất tại lần kiểm tra này.
- Chưa kiểm thử upgrade qua nhiều phiên bản application migration cho Silo vì mới có V1.
- Chưa chạy ma trận role/IDOR đầy đủ, Playwright, failure injection provisioning hoặc resource deletion failure path.
- Chưa có pilot VPS, SLO khóa trước, workload 3–5 tenant lặp lại hoặc dữ liệu người dùng.
- Vì vậy Cổng B và Cổng E vẫn chưa đạt.
