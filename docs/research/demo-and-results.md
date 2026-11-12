# Chạy demo và xem bằng chứng báo cáo

Từ thư mục `/mnt/d/NCKH` trong WSL, bật Docker Desktop rồi chạy:

```bash
bash scripts/dev-up.sh
```

Đợi thông báo `Report demo ready`, mở **http://accounts.localhost:18080**.
Cổng thực tế lấy từ `HTTP_PORT` trong `infra/.env`; bản local hiện dùng 18080 vì 8080 đã có dịch vụ khác.
Tài khoản demo: `owner@example.test`; mật khẩu lấy `DEMO_OWNER_PASSWORD` trong `infra/.env`.
Nếu trang cũ còn trong cache, nhấn Ctrl+Shift+R. Lệnh khởi động có thể mất khoảng một phút.

## Kịch bản trình diễn

1. Đăng nhập và mở **Acme Software**. Vào Dự án → **Acme — Quy trình phát triển** → Mở Kanban.
2. Mở một công việc: xem Story points và Sprint. Hai công việc đang ở cột phát triển; thử kéo thêm một thẻ vào cột này. STRICT, WIP=2 phải từ chối thẻ thứ ba.
3. Vào Cài đặt workspace → Quy trình làm việc: kiểm tra cột mặc định, trường tùy biến, FULL/STRICT/2. Các thay đổi cấu hình được lưu bằng API, không sửa code riêng cho tenant.
4. Đổi tổ chức sang **Lotus Media**. Mở dự án **Lotus — Chiến dịch truyền thông**: giao diện COMPACT, màu cam, các trường Kênh/Ngân sách; WARN/2 cho phép vượt WIP nhưng hiện cảnh báo.
5. UUID của dự án/thẻ thuộc tổ chức kia không cấp quyền truy cập. Bằng chứng tự động nằm trong các bài HTTP/MDC và SQL bên dưới; việc có ba tổ chức trong giao diện không tự chứng minh cô lập.

Hai dự án trên là dữ liệu minh họa thêm qua API, giữ nguyên các dự án cũ. Đây không phải bộ dữ liệu đo tải.

## Kết quả thực nghiệm cuối

Thư mục: `experiments/results/controlled/20261112T155317Z/`.

- `RESULTS.md` và `analysis.json`: đủ 5 lượt chức năng, 5 cặp RLS, 5 cặp tải; có toàn bộ lượt không đạt.
- `IMPLEMENTATION-REVISION.md`: phân biệt bộ đo trước/sau sửa limiter và bảng ngưỡng từng cặp.
- `functional-*/evidence.json`, `audit-check.json`: định danh JWT/host, tenant context, truy cập chéo, metadata, STRICT/WARN.
- `database-isolation-repeated.json`: SQL thiếu WHERE/context, ghi dữ liệu ngoại tenant, xóa context sau rollback.
- `cache-probe.json`, `application-query-plans.json`, `resource-analysis.json`: cache, truy vấn và CPU/RAM thực đo.
- `browser/`: 5 lượt trình duyệt mỗi tenant và ảnh desktop/mobile.
- `manifest.json`, `source.tar.gz`, `artifact-sha256.json`: phiên bản, image digest và dấu kiểm tra artifact. Dump chứa dữ liệu riêng nằm trong `.data/experiment-snapshots`, không đưa vào phụ lục công khai.

Bản Word kết quả riêng: `output/Ket_qua_thuc_nghiem_Pool3.docx`; không sửa `Report (1).docx` gốc.

Hai victim thành công 100% qua năm lượt sau; **4/5 cặp đạt đầy đủ ngưỡng**. Cặp 3, tenant lớn p95=570.51ms, vượt ngưỡng 500ms đã chọn trong protocol. Không kết luận đạt SLO ổn định cả năm lần. Baseline timeout 10s là deadline client, không phải thời gian server hoàn thành.

## Chạy lại bộ đo

```bash
bash scripts/run-report-experiments.sh --fresh
```

Lệnh này tái tạo **chỉ** cụm thực nghiệm `nckh-experiment` trên cổng 18081, giữ nguyên demo `nckh-report` trên 18080. Mỗi nhánh khôi phục cùng snapshot, warmup 30 giây, đo 60 giây, thứ tự AB/BA xen kẽ. Toàn bộ có thể mất hơn 30 phút. Chi tiết: `experiments/report/controlled/README.md`.
