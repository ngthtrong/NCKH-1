# Kịch bản thực nghiệm theo Report (1).docx

Bộ này bám Chương 4–5 của báo cáo Word, chạy trên **mức 3 / Pool**:
React 18, Spring Boot 3 / Java 21, PostgreSQL 16, Redis 7 và Caffeine.
`t-acme`, `t-lotus` và `pool-demo` dùng cùng API, database, schema và bảng.
Control database và worker phục vụ quản trị; không phải các instance ứng dụng riêng của tenant.

## Bộ đo đủ năm lượt

Bộ kiểm tra có kiểm soát, dữ liệu ba quy mô, snapshot trước mỗi nhánh, warmup,
5 cặp trước/sau, SQL/RLS, cache, trình duyệt và bảng/biểu đồ:

```bash
bash scripts/run-report-experiments.sh --fresh
```

Xem [hướng dẫn bộ đo](controlled/README.md). `--fresh` tái tạo **chỉ** volume
project nckh-experiment, giữ dữ liệu demo nckh-report và các file kết quả.

## Chạy nhanh kiểm tra phát triển

Từ gốc repo, dùng Node 22.12+ và Docker Compose hỗ trợ `!override`:

```bash
bash scripts/dev-up.sh
node experiments/report/functional.mjs
bash scripts/check-report-database.sh
NOISY_DURATION=10s node experiments/report/run-load.mjs after
```

Đăng nhập theo `PUBLIC_ACCOUNTS_URL` trong `infra/.env` (máy hiện tại là `http://accounts.localhost:18080`) bằng tài khoản demo trong `infra/.env`.
Chọn **Acme Software** hoặc **Lotus Media**. Owner quản lý cấu hình tại
**Tùy chỉnh workspace**. Acme mặc định STRICT, WIP 2, thẻ đầy đủ,
`story_points` (số) và `sprint` (chuỗi); Lotus WARN, WIP 2, thẻ thu gọn,
`channel` (chuỗi) và `budget_usd` (số). Tạo bảng mới để nhận bộ cột riêng.

`functional.mjs` chỉ tạo/xóa project fixture của chính lần chạy, phục hồi cấu hình
đã sửa và lưu lỗi cleanup nếu không hoàn tất. Không lưu JWT, mật khẩu hoặc nội dung
tài liệu Word trong kết quả. Raw HTTP durations là số đo local của lần chạy,
không được dùng để khẳng định latency/throughput của thực nghiệm chính thức.

## Ánh xạ KB-1 đến KB-4

| Kịch bản | Thao tác và đối chứng | Bằng chứng / tiêu chí chức năng |
|---|---|---|
| KB-1 / K1 | Thiếu JWT, JWT hết hạn, token Acme trên host Lotus; đọc đồng thời xen kẽ hai tenant | HTTP 401; không thấy project của tenant khác. Unit/integration test kiểm tra dọn ThreadLocal/MDC. |
| KB-2 / K2 | Đoán UUID board/task; metadata sai kiểu hoặc schema của tenant khác; SQL cố ý bỏ WHERE và thiếu context | API từ chối 403/404; metadata sai trả 422; role runtime không đọc được hàng nào khi thiếu context và không đọc hàng tenant khác khi có context. |
| KB-3 / K3 | Hai tenant nhỏ/lớn đọc board 1 lần/giây; mỗi tenant có một writer kéo thẻ mỗi 5 giây; tenant gây nhiễu tạo 30 request/giây mặc định | Lưu p50/p95/p99, RPS, tỷ lệ thành công, 429 và sample thô. Khi bật bảo vệ phải quan sát được 429 cho aggressor; đo riêng thành công/latency của victim. |
| KB-4 / K4 | Cùng API/bảng: Acme STRICT từ chối task thứ 3 ở cột đang làm; Lotus WARN vẫn lưu task thứ 3; mỗi tenant dùng trường riêng | Acme trả 422, Lotus trả 201 và UI cảnh báo; JSONB round trip; từ chối field sai tenant/kiểu. Cấu hình thay đổi phải có version mới, board cache phải cập nhật. |

`kb2-database.sql` đo EXPLAIN ANALYZE/BUFFERS trên dữ liệu đang có. Phần so sánh
RLS bật/tắt dùng **TEMP table riêng**, cùng role runtime và cùng SELECT; không
tắt RLS trên bảng nghiệp vụ. Hai plan này là microbenchmark, không thay thế
độ trễ API. Với dữ liệu nhỏ, Seq Scan có thể là lựa chọn đúng của planner;
không ép Index Scan rồi coi đó là bằng chứng hiệu năng.

## Giao thức KB-3 trước/sau

Một cặp đo phải giữ nguyên seed, số task, arrival rate, thời lượng, tài nguyên,
image và commit. `run-load.mjs` kiểm tra cờ cấu hình thực của server; không
chấp nhận gắn nhãn `before` cho server vẫn bật bảo vệ.
Việc xóa fixture qua API là soft delete, vì vậy các lần chạy local có thể để lại
chênh lệch kích thước vật lý CSDL. Để chạy chính phải khôi phục cùng một snapshot
**CSDL thực nghiệm riêng** trước từng nhánh, không xóa hoặc khôi phục đè dữ liệu người dùng.

```bash
# Cơ sở: tắt rate limiter và cả L1/L2 cache.
RATE_LIMIT_ENABLED=false CACHE_ENABLED=false bash scripts/dev-up.sh
NOISY_DURATION=2m node experiments/report/run-load.mjs before

# Đề xuất: bật lại cả hai.
RATE_LIMIT_ENABLED=true CACHE_ENABLED=true bash scripts/dev-up.sh
NOISY_DURATION=2m node experiments/report/run-load.mjs after
```

Cần đợi hết cửa sổ rate limit cũ trước mỗi lần đo. Script cleanup k6 tự chờ
thêm một cửa sổ nếu tenant aggressor đang bị 429. Không dùng `FLUSHDB`, không
xóa volume để "làm đẹp" kết quả. Resource limits được ghim trong
`infra/compose.report.yaml`; Prometheus nằm ngoài các container ứng dụng được đo.

Mặc định fixture nhỏ/lớn là 5/30 task để smoke nhanh. Dùng `SMALL_TASKS` và
`LARGE_TASKS` để thay quy mô; phải pilot và khóa quy mô trước khi chạy chính.
Seed qua API cũng chịu rate limit: quy mô vượt hạn mức phải có quy trình seed
riêng trước khi đo, không tăng hạn mức giữa chừng rồi gộp kết quả.

## Kết quả và mức độ bằng chứng

- `functional.mjs`: `experiments/results/development/report-*/evidence.json`.
- SQL: `experiments/results/development/report-database-*/rls-and-plans.txt`.
- k6: `manifest.json`, `summary.json`, `raw-metrics.json`, `resource-metrics.json`,
  `workload.json` dưới `experiments/results/<run_class>/kb3-*`.
- `data_kind=measured` chỉ mô tả nguồn số liệu. Run development/pilot không được
  đưa vào kết luận cuối. Lỗi threshold và lỗi thiếu tài nguyên phải giữ nguyên.
- Để chạy chính: khóa protocol ID, seed/quy mô, thời gian warmup, SLO và ít nhất
  5 cặp lặp trước/sau; đặt `RUN_CLASS=experiment` và `EXPERIMENT_PROTOCOL_ID`.
  Bộ capture manifest từ chối source còn thay đổi. Không tự commit hoặc giả
  phê duyệt protocol để vượt điều kiện này.
- Báo cáo trung vị và khoảng biến thiên giữa các lần chạy; percentile trong
  một run không phải confidence interval giữa nhiều lần lặp.
- `http_req_failed` tổng có thể tăng vì 429 được chủ động tạo ở aggressor.
  Không dùng nó thay cho `victim_success` hoặc tỷ lệ lỗi theo từng nhóm tenant.
- Writer được tách riêng để các read VU không cùng sửa một thẻ và tạo 409 giả
  cho mục tiêu đo khả dụng. Cần nghiên cứu xung đột phiên bản thì chạy một kịch
  bản khác và coi 409 là kết quả cần phân tích, không bỏ qua lỗi trong KB-3.
- Phải xem `dropped_iterations`: run không đạt arrival rate dự kiến không đủ
  để so sánh theo cùng offered load. Chế độ experiment buộc chỉ số này bằng 0.

Chưa được suy ra từ smoke: "0 rò rỉ trong mọi trường hợp", "100% thành công
dưới mọi tải", overhead RLS không đáng kể, khả năng mở rộng nhiều máy, hoặc
độ trễ lan truyền Pub/Sub giữa nhiều API instance. Các kết luận đó cần phép
đo riêng và đủ lần lặp; phiên bản mức 3 đang chạy một API.

## Giới hạn hiện thực cần giữ rõ trong báo cáo

Trường động hiện hỗ trợ schema hữu hạn STRING/NUMBER/BOOLEAN, cờ required và
loại field không được định nghĩa. Đây không phải bộ thực thi toàn bộ JSON Schema
Draft 2020-12. Cấu hình Pool được lưu trong `tenant_kanban_settings.settings`
và giá trị task trong `tasks.custom_data`, cùng kiểu JSONB; tên bảng khác
`tenants.settings`/`cards` trong bản mô tả. Không đổi tên bảng đang có dữ liệu
chỉ để khớp thuật ngữ. Cơ chế cache kiểm tra generation tại CSDL trước khi dùng
L1/L2, tránh trả dữ liệu cũ khi mất sự kiện Pub/Sub.

Tài nguyên file của bản report dùng adapter filesystem sẵn có, lưu volume riêng.
Bridge và MinIO vẫn là biến thể; ảnh MinIO cũ trên Quay đã không pull được trong
phiên kiểm tra này. Integration test MinIO dùng archive pin theo SHA-256,
có thể ghi đè bằng `MINIO_TEST_IMAGE`; không dùng tag `latest` làm bằng chứng.
