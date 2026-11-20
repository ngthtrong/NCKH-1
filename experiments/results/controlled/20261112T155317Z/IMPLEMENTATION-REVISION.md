# Ghi nhận phiên bản triển khai và kết luận

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
