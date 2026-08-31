# Biên bản xác minh P1 — 2026-08-31

## Phạm vi

Biên bản này tiếp tục trực tiếp từ `p1-verification-2026-08-27-part-2.md` và chốt hai ưu tiên local
còn lại của lượt đó:

- file key/resource download/background-job tenant matrix trên đúng hai tenant seed Pool/Silo;
- fault injection khi MinIO mất kết nối đủ lâu để resource cleanup đi vào dead letter, sau đó requeue
  từng tenant độc lập.

Đây chỉ là bằng chứng kỹ thuật trên stack Compose local. Thời gian chạy test không phải số đo hiệu
năng nghiên cứu; biên bản này không tạo DOI, dữ liệu khảo sát, SUS, workload result hoặc dữ liệu nghiên
cứu giả, và không dùng kết quả local để đánh dấu Cổng B hoặc E.

## Phần mã đã hoàn thành

### File key và resource download

- Storage key được tạo và phân tích theo đúng ba segment
  `<tenant UUID>/<resource UUID>/<safe filename>`. UUID phải ở dạng canonical và filename không nhận
  separator, `.` hoặc `..`.
- Upload, tạo download URL và xóa metadata đều kiểm tra key gắn đồng thời với tenant hiện hành và đúng
  resource ID; kiểm tra endpoint content còn đối chiếu cả resource ID lấy từ key với hàng dữ liệu.
- Resource deletion handler gắn key với cả `event.tenantId` và `event.aggregateId`, vì vậy key cùng
  tenant nhưng trỏ sang resource khác cũng bị từ chối trước khi gọi storage.
- Filesystem adapter resolve lại từ các segment đã parse và giữ path trong tenant root. MinIO adapter
  cũng từ chối key không canonical.
- MinIO presign bằng client dùng public endpoint và region thật thay vì ký internal host rồi thay chuỗi
  hostname. Việc này sửa lỗi SigV4 `SignatureDoesNotMatch` được Playwright phát hiện khi tải file từ
  `localhost:9000`.

### Tenant matrix trong đúng hai Playwright case

Mỗi row Pool/Silo của matrix hiện kiểm tra thêm:

- mỗi tenant upload file riêng, list chỉ thấy resource của mình và known foreign resource ID trả `404`
  theo cả hai chiều;
- signed URL của mỗi tenant tải đúng nội dung; thay object path/key nhưng giữ signature cũ trả `403`;
- resource của tenant nguồn được attach vào task, notification nền xuất hiện ở tenant nguồn nhưng không
  lọt vào list tenant còn lại;
- token tenant khác không thể đánh dấu đã đọc một known notification ID (`404`) và trạng thái notification
  nguồn vẫn chưa đọc;
- xóa resource tenant nguồn làm object nguồn thành `404` nhưng object tenant còn lại vẫn tải đúng nội
  dung, sau đó tenant còn lại được cleanup độc lập.

File E2E vẫn chỉ có một khai báo `test(...)` bên trong matrix hai row, nên Playwright discovery vẫn đúng
hai test: Pool và Silo.

### Resource cleanup worker và Compose fault injection

- Unit/integration assertion hiện hữu phủ key sai tenant, key cùng tenant nhưng sai aggregate/resource,
  path traversal và trường hợp event ngoại lai không được xử lý hoặc lookup user/audit dưới tenant sai.
  Không thêm backend test case mới.
- `scripts/verify-minio-outage.mjs` là harness local có cleanup/finally: đăng nhập System Admin, tạo
  session Pool/Silo, upload và tải đúng nội dung, dừng riêng service MinIO, xóa hai metadata row, rồi chờ
  cả hai cleanup event đạt `attempts=5` và có `deadLetteredAt`.
- Sau khi khởi động lại MinIO, harness requeue Pool trước và xác nhận object Pool bị dọn trong khi dead
  letter cùng object Silo không thay đổi; sau đó requeue Silo, xác nhận object Silo bị dọn. Cả hai event
  rời danh sách dead letter và mỗi tenant có audit `RESOURCE_DELETE_REQUEUED` đúng resource.
- Lỗi đầu tiên của harness là Node `fetch` không chuyển tiếp header `Host` thủ công, khiến Caddy vào
  route NOP. Harness được sửa để request trực tiếp qua hostname `accounts.localhost`,
  `pool-demo.localhost` và `silo-demo.localhost`; lần chạy cuối pass. MinIO được khởi động lại ở cuối.

## Kết quả kiểm tra đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| Backend `clean test` | 17 suite, 58/58 pass, 0 failure, 0 error, 0 skip; giữ đủ 56 test checkpoint trước và toàn bộ 53 test nền |
| OpenAPI generated check | Pass, không drift |
| Frontend lint/TypeScript | Pass |
| Frontend unit | 3 file, 5/5 pass |
| Frontend production build | Pass với Vite |
| Playwright discovery | Đúng 2 test trong 1 file: Pool và Silo |
| Playwright runtime cuối | 2/2 pass bằng Chromium thật: Pool 21,3 giây, Silo 17,3 giây; tổng 39,9 giây |
| File/download matrix | Hai signed URL tải đúng body; known foreign ID `404`; tampered signed key/path `403`; xóa tenant này không xóa object tenant kia |
| Background-job matrix | Notification chỉ xuất hiện tenant nguồn; foreign known notification ID `404` và không đổi `readAt`; resource outbox exact tenant/resource guard pass |
| Compose MinIO outage | Pass: Pool và Silo cùng đạt dead letter ở attempt 5; requeue từng tenant dọn đúng object, không đổi dead letter/object tenant còn lại; audit có mặt |
| Infra/analyzer validation cuối | Compose interpolation pass; 3/3 Python analyzer test pass; API healthy, worker và MinIO đều running sau fault injection |
| `git diff --check` | Pass trên working tree sau thay đổi mã |

Backend report được tổng hợp trực tiếp từ 17 XML trong `target/surefire-reports`. Playwright runtime dùng
stack Compose được rebuild với public MinIO endpoint; lần chạy thất bại do signature trước bản sửa không
được tính là kết quả cuối.

Các lệnh xác minh chính:

```bash
cd apps/api
MAVEN_USER_HOME=/tmp/nckh-maven-home ./mvnw -q \
  -Dmaven.repo.local=/tmp/nckh-m2 \
  -Dspring.jpa.show-sql=false \
  -Dlogging.level.org.hibernate.SQL=OFF clean test

cd ../web
npm run api:check
npm run lint
npm test
npm run build
E2E_ENV_FILE=../../infra/.env npm run test:e2e

cd ../..
node scripts/verify-minio-outage.mjs
```

## Trạng thái repository và điều cấm

- Commit nền trước phần P1 vẫn là `ee0d685`; phần P1 hiện tại còn ở working tree, chưa commit.
- Không khôi phục `resource/important.md` hoặc `resource/thuyet_minh_SaaS.md`; cả hai vẫn vắng mặt.
- Không tạo hay ghi đè `draft.md`.
- Không tạo dữ liệu trong `experiments/results` hoặc `experiments/derived` và không tạo dữ liệu nghiên
  cứu giả.

## Ranh giới kết luận và phần còn lại

- Matrix vừa đóng là matrix kỹ thuật của các đường file/download, notification và resource-deletion
  background job đã hiện thực; không đại diện cho mọi loại background job hoặc mọi topology production.
- Compose fault injection chứng minh retry/dead-letter/requeue trên một stack local, không phải bằng
  chứng availability, durability hay hiệu năng production.
- Cổng B vẫn cần spike ba phương án, security matrix và số đo có manifest/raw artifact thật. Cổng E vẫn
  cần pilot VPS, SLO khóa trước và dữ liệu thực nghiệm chính.
- Phần P1/phụ thuộc ngoài còn lại gồm Web Push VAPID, payment sandbox thật, rollback tiếp tục lỗi và,
  nếu nhóm cần bằng chứng vận hành sâu hơn, force-kill worker container.
