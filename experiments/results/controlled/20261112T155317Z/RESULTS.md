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
| small | before | 1.11 ± 0.01 | 0.00% | 10000.64 | 10007.28 ± 2.24 | 10010.86 ± 6.04 | 0 |
| small | after | 1.41 ± 0.01 | 100.00% | 18.75 | 132.30 ± 143.89 | 373.34 ± 407.93 | 0 |
| large | before | 1.11 ± 0.01 | 0.00% | 10000.66 | 10007.24 ± 2.41 | 10011.10 ± 5.88 | 0 |
| large | after | 1.41 ± 0.01 | 100.00% | 32.61 | 211.98 ± 206.33 | 407.96 ± 465.62 | 0 |
| aggressor | before | 30.01 ± 0.01 | 0.00% | 10000.64 | 10007.08 ± 2.06 | 10010.95 ± 2.17 | 0 |
| aggressor | after | 30.01 ± 0.01 | 6.66% | 2.88 | 55.72 ± 65.34 | 208.60 ± 305.31 | 8404 |

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
| pair-1-after | 0 | 0 |
| pair-2-after | 0 | 0 |
| pair-2-before | 99 | 0 |
| pair-3-before | 99 | 0 |
| pair-3-after | 99 | 0 |
| pair-4-after | 0 | 0 |
| pair-4-before | 99 | 0 |
| pair-5-before | 99 | 0 |
| pair-5-after | 0 | 0 |

## Tỷ lệ trúng cache toàn lượt (gồm warmup)

| Nhánh | Tenant | L1 hit / lookup | L2 hit / lookup sau L1 miss |
|---|---|---:|---:|
| before | small | N/A (0 lookups) | N/A (0 lookups) |
| before | medium | N/A (0 lookups) | N/A (0 lookups) |
| before | large | N/A (0 lookups) | N/A (0 lookups) |
| after | small | 359/453 (79.25%) | 0/94 (0.00%) |
| after | medium | 925/951 (97.27%) | 10/26 (38.46%) |
| after | large | 345/453 (76.16%) | 1/108 (0.93%) |

## Đối chiếu khách quan với nhận định trong Word

- small: mean p95 trước 10007.28 ms, sau 132.30 ms; sau-trước -9874.99 ms. Đây là mô tả năm lượt, chưa là kết luận significance.
- large: mean p95 trước 10007.24 ms, sau 211.98 ms; sau-trước -9795.26 ms. Đây là mô tả năm lượt, chưa là kết luận significance.

## Phụ lục đo cache và trình duyệt

| Đường đọc cấu hình | Số mẫu | API round-trip mean ± SD (ms) |
|---|---:|---:|
| Cold: DB (L1/L2 miss) | 5 | 67.50 ± 86.54 |
| L1 hit | 50 | 42.14 ± 95.80 |
| L2 hit sau Pub/Sub xóa L1 | 5 | 27.04 ± 15.56 |

Các đường cache được xác nhận bằng hiệu counter hit/miss. Thời gian trên gồm xác thực, resolve tenant, đọc version từ DB và HTTP; không gọi đây là thời gian nội tại của Caffeine/Redis. Năm lần Pub/Sub được handler ứng dụng tiếp nhận; bound quan sát trong cache-probe.json gồm Docker CLI và polling, không phải độ trễ liên API.

| Trình duyệt fresh context | Lượt | Board-ready mean ± SD (ms) |
|---|---:|---:|
| small | 5 | 1459.40 ± 424.13 |
| large | 5 | 2873.20 ± 418.98 |

Board-ready đo từ điều hướng đến khi DOM có đủ 200/1.000 thẻ. LCP và long tasks là số đo phòng thí nghiệm trong browser-measurements.json; không xem là Web Vitals người dùng thực. Ảnh desktop/mobile và kiểm tra cấu hình, mật độ thẻ được lưu trong browser/.

## Kiểm tra dữ liệu bổ sung

Năm lượt SQL bổ sung kiểm tra SELECT không WHERE, thiếu context, UPDATE/DELETE ngoại tenant bằng 0 dòng, INSERT ngoại tenant bị PostgreSQL từ chối SQLSTATE 42501 và ngữ cảnh SET LOCAL được xóa sau rollback. Xem database-isolation-repeated.json. Redis keys được kiểm tra prefix tenant và payload board thuộc project của tenant đó.

## Đối chiếu mức độ hoàn tất với báo cáo

- Có đủ năm lượt chức năng, năm cặp RLS, năm cặp tải, năm probe cache và năm lượt trình duyệt mỗi tenant. Có mean/SD, p50/p95/p99, RPS, status, hit/miss, CPU/RAM, plans và artifact thô.
- Truy vấn nhóm nhỏ dùng Index Scan; nhóm vừa/lớn có thể dùng Bitmap Index Scan + Bitmap Heap Scan + Sort. Phải ghi đúng plan, không gọi tất cả là Index Scan thuần.
- Schema trường động hiện hỗ trợ STRING/NUMBER/BOOLEAN + required; không phải bộ validator đầy đủ JSON Schema Draft 2020-12 hoặc numeric min/max tùy ý.
- Một API không kiểm chứng lan truyền giữa nhiều instance. Pub/Sub handler và hành vi yêu cầu kế tiếp được kiểm tra trong phạm vi một API.
- Các thông số còn trống trong Word được protocol chọn trước bộ tải cuối, không giả là thông số Word đã quy định. Ngưỡng và mọi lượt lỗi đều giữ nguyên.
- Lượt pilot v1 và lỗi mount ban đầu giữ riêng, không trộn vào năm cặp cuối. V2 tăng năng lực generator để tránh thiếu luồng chờ; không thay ngân sách ứng dụng hay mức tải.
- Không sửa Word gốc. Những đoạn Word khẳng định sẵn cải thiện hiệu năng phải thay bằng kết luận theo bảng thực đo này.

## Tài nguyên trong cửa sổ đo chính

| Nhánh | Thành phần | CPU %, mean ± SD giữa các lượt | RAM MiB, mean ± SD giữa các lượt |
|---|---|---:|---:|
| before | api | 101.05 ± 1.47 | 423.45 ± 3.55 |
| before | postgres | 34.03 ± 2.43 | 102.77 ± 0.56 |
| before | redis | 1.98 ± 1.02 | 7.18 ± 0.22 |
| after | api | 39.39 ± 17.99 | 412.58 ± 13.39 |
| after | postgres | 3.71 ± 2.23 | 100.83 ± 3.56 |
| after | redis | 2.33 ± 0.16 | 15.88 ± 0.47 |

Docker CPU 100% tương ứng một lõi; giá trị lấy từ mẫu Docker stats trong cửa sổ đo. Giới hạn/số mẫu/min/max và cache theo khoảng lấy mẫu có trong resource-analysis.json. Scrape Prometheus có deadline: khi API cơ sở quá tải, mẫu có thể thiếu; không suy ra CPU/RAM từ mẫu thiếu đó.

## Kế hoạch truy vấn ứng dụng thực tế

| Nhóm | SQL executor mean ± SD (ms), 5 mẫu |
|---|---:|
| small | 2.183 ± 0.743 |
| medium | 5.460 ± 3.228 |
| large | 21.049 ± 10.629 |

SELECT ứng dụng gồm các truy vấn con đếm công việc con và bình luận; EXPLAIN trên DB ấm sau tải. Đây là executor time, không phải toàn bộ HTTP latency. Kế hoạch và buffers từng mẫu có trong application-query-plans.json.

## Ghi nhận phiên bản triển khai và kết luận

Bộ đo cuối: `20261112T155317Z`. Giữ nguyên protocol v3 về dữ liệu, tải, ngân sách và ngưỡng. Đây là lần đo lại đầy đủ sau khi sửa limiter; không đổi tên protocol hoặc ghi đè bộ đo trước.

Thay đổi: xác thực JWT trước, kiểm tra host/tid rồi giới hạn tải trước truy vấn tenant/membership; Redis token bucket nguyên tử, tốc độ STARTER 120/phút (burst 12), PROFESSIONAL 600/phút (burst 60). TenantContext và RLS vẫn bắt buộc trước truy cập dữ liệu.

Bộ đo cũ `20261112T150952Z` được giữ lại: limiter sau truy vấn tenant không bảo vệ được DB khi quá tải. Cả năm lượt sau đều không đạt SLO. Đây là căn cứ sửa thiết kế, không phải dữ liệu bị loại do kết quả xấu.

| Cặp cuối | Nhóm | Thành công | p95 (ms) | p95 < 500ms |
|---|---|---:|---:|---|
| 1 | small | 100% | 79.12 | Đạt |
| 1 | large | 100% | 105.53 | Đạt |
| 2 | small | 100% | 86.97 | Đạt |
| 2 | large | 100% | 198.48 | Đạt |
| 3 | small | 100% | 386.26 | Đạt |
| 3 | large | 100% | 570.51 | Chưa đạt |
| 4 | small | 100% | 28.56 | Đạt |
| 4 | large | 100% | 62.95 | Đạt |
| 5 | small | 100% | 80.58 | Đạt |
| 5 | large | 100% | 122.46 | Đạt |

Kết luận: cả hai victim hoàn thành 100% request trong năm lượt sau; 4/5 cặp đạt đầy đủ ngưỡng, cặp 3 còn vượt ngưỡng p95. Không tuyên bố đạt SLO ổn định qua cả năm lần. Baseline timeout 10s là dữ liệu bị cắt theo deadline client; không dùng nó để khẳng định thời gian xử lý nội tại của server.

Các kết luận cô lập tenant dựa trên kiểm tra JWT, HTTP, MDC và SQL; việc giao diện giống nhau hoặc có ba workspace không tự chứng minh kiến trúc mức 3. Một API dùng chung và bảng/CSDL dùng chung với tenant_id + FORCE RLS là bằng chứng triển khai chính.

Giao diện được cập nhật sau bộ đo tải, chỉ ảnh hưởng đo trình duyệt bổ sung. Digest web thực tế được ghi riêng trong browser-environment.txt.

