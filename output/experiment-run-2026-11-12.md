# Kết quả chạy thực nghiệm phát triển ngày 12/11/2026

Đây là dữ liệu thực đo local, run_class=development, không đủ điều kiện đưa vào kết luận thực nghiệm chính thức. Server sau chạy: http://accounts.localhost:18080, Pool mức 3, cache và rate limiter bật, readiness UP.

## Chức năng và dữ liệu

- KB-1 PASS: token thiếu/hết hạn/sai host và 24 lượt đọc đồng thời không trả project của tenant khác.
- KB-2 PASS: truy cập chéo board/task bị từ chối; metadata sai bị từ chối. SQL xác nhận thiếu context đọc 0 dòng và truy vấn không WHERE thấy 0 dòng của tenant khác.
- KB-4 PASS: STRICT từ chối vượt WIP bằng HTTP 422; WARN vẫn cho lưu; JSONB tách theo tenant.
- KB-3 smoke PASS: tenant gây nhiễu bị 429, hai tenant còn lại đọc thành công.

Bằng chứng: `experiments/results/development/report-2026-11-12T14-30-14.016Z/evidence.json` và `experiments/results/development/report-database-20261112T142955Z/rls-and-plans.txt`.

Lượt chức năng đầu `report-2026-11-12T14-29-54.529Z` có KB-3-smoke FAIL vì không quan sát thấy 429. Bài chạy sát mốc chuyển phút của fixed-window limiter; giới hạn 192 request có thể phân bổ qua hai cửa sổ. Đã tăng giới hạn thử lên 384 request, không đổi hạn mức server; chạy lại PASS. Giữ nguyên bằng chứng lượt lỗi.

## KB-3: hai lượt tải 2 phút

Cùng workload: hai victim đọc board 1 request/giây mỗi tenant; một writer/tenant kéo thẻ mỗi 5 giây; aggressor 30 request/giây; quy mô fixture 5/30 task.

| Chỉ số | Trước: cache/rate limit tắt | Sau: cache/rate limit bật |
|---|---:|---:|
| Thao tác victim thành công | 290/290 | 289/289 |
| Victim p50 (ms) | 9,88 | 12,66 |
| Victim p95 (ms) | 33,48 | 108,04 |
| Victim p99 (ms) | 246,16 | 259,26 |
| Aggressor HTTP 429 | 0 | 3249 |
| Dropped iterations | 2 | 0 (metric không xuất hiện) |

Hai tiến trình k6 thoát 0, đạt các ngưỡng chức năng đã cấu hình. Không khóa SLO latency nên trạng thái đạt không khẳng định hiệu năng đạt yêu cầu báo cáo. p95 lượt sau cao hơn lượt trước; không có bằng chứng cải thiện latency trong hai lượt này. Việc chặn tải và duy trì thành công của victim đã quan sát được.

Kết quả trước: `experiments/results/development/kb3-before-2026-11-12T14-31-16.305Z/`.
Kết quả sau: `experiments/results/development/kb3-after-2026-11-12T14-34-01.042Z/`.
Mỗi thư mục có manifest, raw metrics, summary, workload, environment và resource metrics Prometheus.

## Giới hạn

Chỉ một cặp đo, source chưa khóa, chưa phục hồi cùng snapshot CSDL trước mỗi nhánh; dữ liệu soft-delete tích lũy. Lượt trước có 2 dropped iterations. Cache/rate limiter thay đổi đồng thời nên không tách được tác động riêng. Không được suy ra cải thiện hiệu năng hay kết luận thống kê. Để đo chính cần protocol/SLO cố định, cùng snapshot thực nghiệm, warmup và ít nhất 5 cặp đo.
