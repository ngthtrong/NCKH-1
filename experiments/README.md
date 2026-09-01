# Thực nghiệm hiệu năng và noisy-neighbor

Thư mục này chứa giao thức chạy và công cụ tái lập, không chứa kết quả nghiên cứu giả. `experiments/results/` và `experiments/derived/` bị Git bỏ qua; chỉ dữ liệu đo thật đã được nhóm kiểm tra và chủ động duyệt mới được công bố như artifact riêng.

## Chuẩn bị dữ liệu truy cập

Smoke test không cần token. Các workload nghiệp vụ cần token thật của ít nhất hai tenant và không ghi chúng vào file trong repo:

```bash
export BASE_URL=http://127.0.0.1:8080
export TENANT_A_SLUG=pool-demo
export TENANT_A_TOKEN='...'
export TENANT_B_SLUG=silo-demo
export TENANT_B_TOKEN='...'
```

`BASE_URL` trỏ tới reverse proxy; k6 gửi header `Host` theo tenant. Trên VPS, đặt `TENANT_DOMAIN` hoặc `TENANT_A_HOST`/`TENANT_B_HOST`. Access token chỉ tồn tại trong environment của tiến trình và không được ghi vào manifest.

## Chạy

```bash
scripts/run-experiment.sh smoke
scripts/run-experiment.sh baseline
scripts/run-experiment.sh load
scripts/run-experiment.sh stress
scripts/run-experiment.sh noisy-neighbor before
scripts/run-experiment.sh noisy-neighbor after
```

Các giá trị mặc định là cấu hình khởi đầu, không phải SLO hay kết quả. Có thể đặt `BASELINE_VUS`, `LOAD_RATE`, `AGGRESSOR_RATE`, `VICTIM_RATE`, duration tương ứng và `SEED`. Chỉ đặt `SLO_P95_MS` sau khi pilot trên đúng VPS khóa ngưỡng; nếu chưa đặt, k6 chỉ kiểm tra tính đúng/status và vẫn ghi p95 quan sát.

`before` và `after` là nhãn của hai deployment/configuration riêng. Không đổi rate limit giữa chừng trong cùng run. Mỗi tổ hợp kịch bản–placement–biến thể phải lặp ít nhất ba lần với cùng commit, image digest, target và workload; nên chạy xen kẽ thứ tự để giảm bias do thời gian.

Mỗi run tạo:

- `manifest.json`: commit, môi trường, phần cứng, version tool/image, workload và artifact paths; không chứa secret.
- `summary.json`: summary do k6 sinh.
- `raw-metrics.json`: từng sample do k6 sinh.
- `resource-metrics.json`: CPU, RAM và Hikari connection được truy vấn từ Prometheus đúng khoảng thời gian run. Nếu Prometheus không khả dụng, run vẫn giữ lại nhưng QA đánh dấu thiếu bằng chứng tài nguyên.

Schema nằm trong `experiments/schemas/`. `data_kind=measured` chỉ được tạo khi script thực sự gọi k6.

## Phân tích tái lập

```bash
scripts/analyze-experiments.sh
```

Công cụ dùng Python standard library, chuẩn hóa toàn bộ metric vào `observations.csv`, tạo `comparison.csv`, `qa.json`, `report.md` và biểu đồ SVG từ số đo thật. QA kiểm tra run thiếu, timestamp, trùng ID, số lần lặp, target/workload không đồng nhất và gắn cờ ngoại lệ bằng Tukey IQR; ngoại lệ không bị tự động xóa.

Nếu không có run hợp lệ, lệnh dừng thay vì sinh bảng/biểu đồ trống hoặc dữ liệu mẫu. Unit test tạo fixture tổng hợp trong thư mục tạm, gắn nhãn rõ ràng và không lưu như kết quả nghiên cứu.

## Chuẩn bị spike P2

Các giao thức so sánh isolation, storage và payment được đăng ký trước tại `experiments/spikes/`.
`scripts/validate-p2-spikes.sh` kiểm tra protocol mà không tạo kết quả; chế độ `--require-complete` chỉ
pass khi có đủ measured artifact được khóa checksum cho ứng viên còn lại hoặc hồ sơ loại ứng viên
fail-closed theo đúng điều kiện và case kích hoạt đã đăng ký trước. Payment tiếp tục bị chặn ở credential và trọng số chưa
được nhóm phê duyệt. Xem `experiments/spikes/README.md`; không dùng validator này để tự động tuyên bố
Cổng B đạt.

Guarded Project CRUD security harness cho ba isolation candidate × Pool/Silo chạy riêng bằng
`scripts/run-p2-isolation-security.sh`. Surefire output của harness là kiểm tra kỹ thuật local, không phải
latency/resource measurement và không làm thay đổi tổng test của `apps/api`.
