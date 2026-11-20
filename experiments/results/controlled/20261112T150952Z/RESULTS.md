# Kết quả thực nghiệm Pool mức 3

Protocol `NCKH-POOL3-20261112-v3`; dữ liệu thực đo trên WSL, năm cặp đối chứng; warmup 30 giây và đo chính 60 giây mỗi lượt. Snapshot CSDL giống nhau trước mỗi nhánh; thứ tự AB/BA xen kẽ. Các giá trị protocol do kỹ sư chọn trước bộ đo vì báo cáo còn để trống, không phải thông số được báo cáo xác lập sẵn.

## Bảng 5.2 — Định danh và cô lập dữ liệu

| Bài | Lượt đạt / tổng | Yêu cầu HTTP | Trung bình độ trễ mỗi lượt (ms), mean ± SD |
|---|---:|---:|---:|
| KB-1.1 | 5/5 | 400 | 18.96 ± 4.90 |
| KB-1.2 | 5/5 | 1200 | 300.08 ± 53.83 |
| KB-2.2 | 5/5 | 155 | 106.58 ± 20.29 |
| KB-4 | 5/5 | 170 | 81.20 ± 17.07 |

Đối chiếu MDC và X-Tenant-ID xem `functional-*/audit-check.json`. SQL thiếu context, truy vấn thiếu WHERE và tái sử dụng kết nối xem `database-isolation.json`. `rls-overhead.json` chứa 5 cặp, mỗi nhánh 20 warmup + 50 mẫu trên bảng tasks thực nghiệm với role runtime. Không vô hiệu hóa RLS trên CSDL demo.

## Bảng 5.3 — Kết quả theo nhóm tenant

| Nhóm | Cấu hình | RPS mean ± SD | Thành công trung bình | p50 trung vị (ms) | p95 mean ± SD (ms) | p99 mean ± SD (ms) | Tổng 429 |
|---|---|---:|---:|---:|---:|---:|---:|
| small | before | 1.11 ± 0.01 | 0.00% | 10000.47 | 10007.83 ± 3.92 | 10010.28 ± 4.41 | 0 |
| small | after | 1.32 ± 0.09 | 94.57% | 478.95 | 6909.81 ± 2607.06 | 7417.57 ± 2422.07 | 0 |
| large | before | 1.11 ± 0.01 | 0.00% | 10000.80 | 10008.22 ± 3.33 | 10014.12 ± 6.86 | 0 |
| large | after | 1.32 ± 0.10 | 93.91% | 900.12 | 7140.23 ± 2566.58 | 7791.33 ± 2237.78 | 0 |
| aggressor | before | 30.00 ± 0.01 | 0.00% | 10000.62 | 10007.44 ± 3.46 | 10021.20 ± 14.22 | 0 |
| aggressor | after | 30.01 ± 0.01 | 6.67% | 966.67 | 6839.65 ± 2663.54 | 7341.61 ± 2399.89 | 7891 |

RPS và phân vị bảng trên tính từ toàn bộ HTTP request có nhãn measure theo role, gồm đọc bảng, đọc trước kéo và kéo thẻ. Phân vị là mean/SD giữa năm phân vị từng lượt; không trộn thành khoảng tin cậy. HTTP 429 của aggressor là kết quả chủ đích, không gộp thành lỗi victim. Mọi lượt threshold lỗi vẫn có trong bảng và raw; xem exit_code trong CSV/diagnostics.

Timeout client là 10 giây. Phân vị chứa request timeout là số đo bị cắt ở deadline, không phải thời gian server hoàn thành. Status 0 và tỷ lệ thành công phải đọc cùng latency. Writer là một VU/tenant theo vòng kín: khi request chậm hơn 5 giây, số thao tác kéo thực hiện được giảm; đọc và aggressor dùng arrival rate cố định.

## Cache, kế hoạch truy vấn và tài nguyên

Cache counters trong `analysis.json` lấy hiệu giữa trước/sau toàn lượt (gồm warmup), tách tenant, resource, L1/L2 hit/miss. L2 hit rate là hit/(hit+miss) có điều kiện sau L1 miss; không cộng hai tỷ lệ. Cấu hình before tắt cache nên không truy cập cache (N/A, không suy diễn tỷ lệ hit 0 từ 0/0). Kế hoạch PostgreSQL thực tế nằm trong `query-plans.json`, không ép planner dùng index. CPU/RAM của API/PostgreSQL/Redis được lấy mỗi khoảng 5 giây trong docker-stats.jsonl; JVM CPU/heap và pool/cache metrics có trong hai tệp .prom.

## Bảng 5.4 — Tùy biến và đồng bộ

Năm lượt KB-4 kiểm tra bộ cột tạo mới, JSONB hợp lệ, thiếu trường story_points bắt buộc, sai kiểu, trường ngoại tenant, kéo thẻ STRICT trả 422, WARN trả 200 và wipWarning=true, đổi STRICT→WARN rồi yêu cầu kế tiếp áp dụng. Thời gian từng HTTP request và đổi cấu hình có trong functional-*/evidence.json. Đây là độ trễ quan sát ở client, không phải độ trễ nội tại Pub/Sub. Một API đang chạy: chưa suy ra độ trễ lan truyền giữa nhiều API.

## Giới hạn và kết luận được phép

Bộ đo này là thực nghiệm local có kiểm soát, source archive và image digest được ghi trong manifest. Không có phê duyệt bên ngoài được ngầm giả định; file Word gốc không sửa. N=5 cho mô tả mean/SD/range, không khẳng định ý nghĩa thống kê hay khả năng tổng quát. Generator và demo dùng chung máy WSL nên còn nhiễu hệ điều hành. Cơ sở và đề xuất thay đồng thời cache/limiter nên chưa tách được tác động từng cơ chế. SLO p95<500ms là lựa chọn protocol, không được gọi là ngưỡng đã quy định trong báo cáo. Cần đọc các lượt lỗi/dropped iterations trước khi kết luận. Mọi nhận định latency tốt hơn phải dựa theo số đo từng nhóm, kể cả khi baseline tốt hơn.

Các giá trị mean, SD, median, min/max và chênh lệch sau-trước đều có trong analysis.json; các biểu đồ PDF/PNG đặt cạnh báo cáo này.

## Trạng thái mọi lượt tải

| Lượt | Exit code k6 | Dropped iterations |
|---|---:|---:|
| pair-1-before | 99 | 0 |
| pair-1-after | 99 | 0 |
| pair-2-after | 99 | 0 |
| pair-2-before | 99 | 0 |
| pair-3-before | 99 | 0 |
| pair-3-after | 99 | 0 |
| pair-4-after | 99 | 0 |
| pair-4-before | 99 | 0 |
| pair-5-before | 99 | 0 |
| pair-5-after | 99 | 0 |

## Tỷ lệ trúng cache toàn lượt (gồm warmup)

| Nhánh | Tenant | L1 hit / lookup | L2 hit / lookup sau L1 miss |
|---|---|---:|---:|
| before | small | N/A (0 lookups) | N/A (0 lookups) |
| before | medium | N/A (0 lookups) | N/A (0 lookups) |
| before | large | N/A (0 lookups) | N/A (0 lookups) |
| after | small | 394/455 (86.59%) | 2/61 (3.28%) |
| after | medium | 1328/1352 (98.22%) | 9/24 (37.50%) |
| after | large | 387/453 (85.43%) | 4/66 (6.06%) |

## Đối chiếu khách quan với nhận định trong Word

- small: mean p95 trước 10007.83 ms, sau 6909.81 ms; sau-trước -3098.02 ms. Đây là mô tả năm lượt, chưa là kết luận significance.
- large: mean p95 trước 10008.22 ms, sau 7140.23 ms; sau-trước -2867.99 ms. Đây là mô tả năm lượt, chưa là kết luận significance.
