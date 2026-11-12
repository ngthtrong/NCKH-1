# Bộ thực nghiệm có kiểm soát cho Chương 5

## Chạy toàn bộ

```bash
cd /mnt/d/NCKH
bash scripts/run-report-experiments.sh --fresh
```

Docker, Python 3 có matplotlib và Node 22 cần sẵn có. Script dùng thông tin local
trong `infra/.env`, không in mật khẩu/JWT. Project Docker **nckh-experiment** có
volume, Redis, PostgreSQL, mạng và cổng riêng (18081/19091); không restore hay xóa
volume của **nckh-report**. Worker chỉ phục vụ provisioning ban đầu rồi dừng để
không làm biến đổi snapshot giữa các lượt đo. API luôn là một instance mức 3.

`--fresh` chỉ tái tạo volume của cụm thực nghiệm riêng; kết quả thô trong repo và
CSDL demo nckh-report được giữ nguyên. Bỏ cờ này nếu chưa có cụm thực nghiệm.

Bộ đo ghim protocol `NCKH-POOL3-20261112-v3` trong `protocol.json` trước khi chạy:
5 lượt chức năng độc lập; 5 cặp tải AB/BA; mỗi nhánh khôi phục cùng snapshot,
khởi động lại API để xóa L1 và trạng thái JVM, làm nóng 30 giây rồi đo 60 giây.
Khoảng nghỉ sau restore 10 giây. Không gộp lượt development cũ vào bộ này.

Dữ liệu fixture có ba quy mô: Acme 1 bảng × 200 thẻ, Pool Demo 4 × 500, Lotus
20 × 1.000. Dữ liệu demo khởi tạo sẵn trong cụm riêng được giữ lại và số lượng
thực tế toàn tenant ghi trong `dataset-counts.txt`; bảng sinh tải sử dụng fixture
định danh cố định. JSONB Acme/Lotus có giá trị hợp lệ theo schema từng tổ chức.

Hai victim đọc 1 RPS mỗi tenant, một writer/tenant mỗi 5 giây; aggressor đọc bảng
500 thẻ 30 RPS (15 lần định mức STARTER 120/phút). Victim dùng PROFESSIONAL
600/phút. Ngưỡng p95<500ms do protocol này chọn trước lượt đo, không phải một
con số có sẵn trong Word (Word còn để trống). Không đổi ngưỡng để làm kết quả đạt.

## Bằng chứng theo bài

| Báo cáo | Hiện thực / artifact |
|---|---|
| KB-1.1 | 80 JWT thiếu/sai chữ ký/hết hạn/thiếu tid mỗi lượt; evidence.json |
| KB-1.2 | 240 yêu cầu, 8 workers; đối chiếu JWT/host, dữ liệu project, X-Tenant-ID và MDC qua request ID; api.jsonl và audit-check.json |
| KB-2.1/2.3 | Truy vấn không WHERE, thiếu context, dùng lại cùng kết nối sau rollback; database-isolation.json |
| KB-2.2 | 10 vòng đọc/kéo/xóa UUID thật của tenant khác; evidence.json |
| KB-2.4/2.5 | 5 cặp RLS off/on trên tasks thật trong **CSDL riêng**, role pool_api, 20 warmup+50 mẫu/nhánh; rls-overhead.json |
| KB-2.6 | Prefix Redis, quyền sở hữu payload board, xóa L1 theo tenant; cache-probe.json bổ sung |
| KB-3 | 10 lượt tải, raw metrics có phase/role/operation/status; metrics Prometheus, Docker stats, query-plans.json |
| KB-4 | Cột mặc định, JSONB, required/sai kiểu/trường ngoại tenant, kéo STRICT422/WARN200+wipWarning, đổi cấu hình rồi thao tác kế tiếp; evidence.json |
| Trình duyệt | 5 lượt/tenant với fresh context; board-ready, LCP/long tasks, ảnh desktop/mobile; browser/ bổ sung |

`source.tar.gz` cùng SHA-256 và image digest ghi đúng mã đang đo; source gốc có
thay đổi chưa commit được khai báo thẳng, không gắn nhãn clean Git. Đây là bộ
**controlled** có snapshot mã và dữ liệu, tách riêng hệ thống manifest cũ vốn
chỉ chấp nhận clean Git cho `RUN_CLASS=experiment`. Không giả phê duyệt protocol
hoặc dùng dữ liệu development để qua cổng đó. Các file bổ sung sau archive có
hash riêng trong manifest bổ sung.

Mọi lượt lỗi/threshold/dropped iteration đều được lưu; không tự thử lại cho đến
khi đạt rồi giấu lượt lỗi. Ngưỡng API đạt không thay cho kết luận hiệu năng. Cache
và limiter thay đồng thời nên chỉ so sánh hai cấu hình kết hợp, không quy nguyên
nhân cho riêng cache hoặc limiter. N=5 dùng mean, sample SD, median, range và
chênh lệch theo cặp, không tuyên bố significance hay tổng quát sang production.

## Artifact và đọc kết quả

`experiments/results/controlled/<UTC timestamp>/` chứa:

- protocol, manifest, source archive và checksum snapshot CSDL (dump chứa password
  hash được giữ **riêng** dưới `/tmp/nckh-controlled-*`, không copy vào báo cáo).
- Năm thư mục functional và mười thư mục pair: raw, summary, log, metrics.
- `load-results.csv`, `analysis.json`, `RESULTS.md` và biểu đồ PDF/PNG.
- SQL không ép Index Scan; ghi đúng kế hoạch PostgreSQL đã chọn.

`RESULTS.md` là bản kết quả review được, không sửa đè Word. Phải sửa/giảm mức các
kết luận sẵn có trong Word nếu số đo không hỗ trợ, ví dụ p95 sau bật cao hơn cơ sở.
Một API không đủ để đo lan truyền Pub/Sub giữa nhiều API; cache probe chỉ ghi
việc handler xóa L1 nhận sự kiện và bound quan sát ở client, không gọi đó là độ
trễ nội tại Redis hoặc chứng minh mức 4.

## Dừng cụm thực nghiệm

```bash
docker compose -p nckh-experiment --env-file infra/.env \
  -f infra/compose.yaml -f infra/compose.report.yaml \
  -f experiments/report/controlled/compose.yaml down
```

Không thêm `-v` nếu còn cần giữ dữ liệu thực nghiệm để kiểm tra lại.
