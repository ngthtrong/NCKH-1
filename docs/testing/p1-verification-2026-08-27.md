# Biên bản xác minh tiếp nối P1 — 2026-08-27

## Phạm vi

Biên bản này ghi kết quả kiểm tra kỹ thuật local cho phần P1 tiếp tục từ checkpoint `ee0d685`
(`checkpoint 2`). Phạm vi gồm:

- CRUD và sắp xếp board column ở API, OpenAPI và frontend;
- optimistic version, project-role authorization và tenant boundary cho column mutation;
- nâng application schema `V1→V2` cho placement Pool/Silo đang `ACTIVE`;
- fault injection provisioning sau external DDL và phân biệt rollback thất bại;
- fault injection MinIO deletion, outbox backoff và eventual cleanup.

Đây không phải dữ liệu thực nghiệm hiệu năng, không dùng để khóa SLO và không thay thế pilot trên VPS.
Không có số liệu nghiên cứu, DOI, SUS, access token hoặc secret nào được tạo hay lưu trong biên bản.

## Thay đổi được xác minh

### Column CRUD/reorder

- Application migration `V2__board_column_management.sql` thêm `boards.version`, index thứ tự column và
  unique name không phân biệt hoa/thường trong phạm vi một board.
- Manager có thể create, rename, reorder và delete column. Reorder phải chứa đúng mỗi column của board
  một lần; cột có task hoặc cột cuối cùng không được xóa.
- Mọi mutation tăng board version bằng conditional update. Request dùng version cũ nhận conflict và
  toàn bộ transaction bị rollback.
- Lookup board/column luôn kèm `tenant_id`; Project Manager được yêu cầu trước mutation. Viewer bị từ
  chối và ID column của tenant khác không bị thay đổi.
- OpenAPI và generated TypeScript cùng mô tả request/response mới. Kanban chỉ hiển thị action quản trị
  column cho Manager, disable thao tác trong mutation và reload board khi nhận `409`.

### Provisioning và schema upgrade

- Provisioner lấy version từ kết quả Flyway và fail closed nếu khác application schema mới nhất (`2`),
  thay cho gán cứng schema `1`.
- Worker profile định kỳ nâng placement `ACTIVE` có `schema_version` cũ; chỉ lưu version mới sau khi
  provisioning/migration thành công.
- Test PostgreSQL 18 inject lỗi ngay sau khi database và runtime role đã được tạo. Retry dùng lại cùng
  encrypted credential, chỉ còn đúng một database và một role, chạy đủ hai application migration rồi
  rollback xóa sạch cả hai tài nguyên.
- Control migration V4 thêm `ROLLBACK_FAILED`. Coordinator chỉ dùng `FAILED_ROLLED_BACK` khi rollback
  thực sự thành công; rollback lỗi lưu trạng thái riêng, error detail và có thể được admin retry.

### Resource cleanup

- Handler chỉ đổi lỗi parse payload thành lỗi payload; lỗi từ storage adapter được truyền nguyên nhân
  để outbox ghi đúng `last_error`.
- Integration test ghi object thật vào MinIO, inject lỗi delete ở lần poll đầu, kiểm tra `attempts=1`,
  `available_at` ở tương lai và error message. Lần poll kế tiếp xóa object thật và đặt `processed_at`.
- Câu SQL backoff ép kiểu timestamp tường minh để chạy đúng trên PostgreSQL 18.

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

Lệnh kết thúc với exit code `0`. Tổng hợp trực tiếp 17 file XML trong `target/surefire-reports`:

| Nhóm test | Số test | Kết quả |
| --- | ---: | --- |
| Project authorization/IDOR/column | 8 | Pass |
| Tenant membership authorization | 6 | Pass |
| Tenant context/filter/host | 10 | Pass |
| PostgreSQL RLS | 4 | Pass |
| Payment/provider/concurrency | 9 | Pass |
| Provisioning/credential/lease/state/failure injection | 14 | Pass |
| Resource deletion/outbox/MinIO failure injection | 5 | Pass |
| **Tổng** | **56** | **0 failure, 0 error, 0 skip** |

So với checkpoint 53 test, cả 53 test nền vẫn chạy và pass; ba test mới gồm rollback failure,
PostgreSQL provisioning failure injection và MinIO deletion failure injection. Các assertion column được
bổ sung vào suite authorization hiện hữu nên không làm tăng số test case riêng.

## Frontend và E2E

| Kiểm tra | Kết quả |
| --- | --- |
| OpenAPI generated check | Pass; không drift |
| TypeScript `tsc -b` | Pass |
| Vitest | 3 file, 5/5 test pass |
| Vite production build | Pass; 11.761 module |
| Playwright | 2/2 pass: Pool → Silo và Silo → Pool host/token mismatch |

Playwright 1.62.1 cần Chromium revision mới; browser được tải vào `/tmp/nckh-playwright-browsers`, không
ghi vào repo. Lượt chạy có thẩm quyền dùng Chromium thật trên stack Compose và kết thúc exit code `0`.
Hai test hiện hữu vẫn được giữ nguyên; chưa suy rộng chúng thành bằng chứng cho column UI matrix.

## Compose và Flyway trên volume hiện hữu

`scripts/validate-infra.sh` pass 3/3 Python test, JSON/Python static checks và Compose interpolation.
Lượt đầu rebuild đã phát hiện constructor production của provisioner không được Spring chọn sau khi thêm
test hook; constructor được đánh dấu tường minh rồi backend test và Compose được chạy lại từ đầu.

`scripts/dev-up.sh` cuối cùng kết thúc exit code `0`; API healthy và local readiness pass. Truy vấn chỉ
đọc trực tiếp cho kết quả:

| Database/control state | Kết quả |
| --- | --- |
| `control_db` Flyway | V1, V2, V3, V4 đều `success=true` |
| `pool_db` Flyway | Application V1, V2 đều `success=true` |
| Silo database Flyway | Application V1, V2 đều `success=true` |
| `pool-demo` | `ACTIVE`, `POOL`, `schema_version=2` |
| `silo-demo` | `ACTIVE`, `SILO_DATABASE`, `schema_version=2` |

Hai placement trước đó ghi schema `1`; worker đã nâng cùng volume/dữ liệu hiện hữu lên `2`. Không xóa
volume, không reset hoặc tạo dữ liệu nghiên cứu để đạt kết quả này.

## Vệ sinh repo

- `git diff --check` pass.
- `main` và `origin/main` cùng ở `ee0d685`; toàn bộ thay đổi trong biên bản đang ở working tree, chưa
  commit.
- `resource/important.md` và `resource/thuyet_minh_SaaS.md` vẫn vắng mặt; không khôi phục hai file này.
- `draft.md` vẫn không tồn tại và không bị tạo/ghi.
- Không tạo file trong `experiments/results` hoặc `experiments/derived`.

## Ranh giới kết luận và phần P1 còn lại

Các kiểm tra trên đóng phần ưu tiên column CRUD/reorder và có bằng chứng fault injection thật cho một
failure point provisioning cùng một lần MinIO delete lỗi tạm thời. P1 vẫn chưa hoàn tất toàn bộ:

- chưa có Playwright riêng cho column interaction, optimistic conflict và toàn bộ role/action matrix;
- chưa force-kill process thật giữa DDL, Flyway và control-plane finalize;
- chưa diễn tập migration hỏng hoặc rollback tiếp tục lỗi trên stack Compose;
- chưa có dead-letter/requeue cho outbox sau khi hết retry, và chưa diễn tập MinIO outage kéo dài;
- file-key/download/background-job tenant matrix, Web Push VAPID và adapter thanh toán thật vẫn còn.

Không có kết quả hiệu năng hoặc kết luận nghiên cứu nào được suy ra từ biên bản kỹ thuật này. Cổng B vẫn
chờ spike/đo/chấm ADR; Cổng E vẫn chờ pilot VPS, SLO khóa trước và dữ liệu thực nghiệm chính.

## Lệnh tái kiểm tra

```bash
cd apps/api
./mvnw -B -ntp clean test

cd ../web
npm run api:check
npm run lint
npm test
npm run build
E2E_ENV_FILE=../../infra/.env npm run test:e2e

cd ../..
scripts/validate-infra.sh
scripts/dev-up.sh
```

Playwright cần browser tương thích và stack có một tenant Pool cùng một tenant Silo `ACTIVE`; credential
phải đến từ environment hoặc file local bị Git ignore.
