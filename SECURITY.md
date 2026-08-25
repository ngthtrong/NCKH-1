# Security and research-data policy

## Báo lỗi

Không đưa lỗ hổng, token hoặc dữ liệu nhạy cảm vào issue công khai. Báo trực tiếp cho nhóm nghiên cứu và kèm cách tái hiện đã loại bỏ secrets.

## Secrets

- Chỉ commit `.env.example` với giá trị local không dùng ngoài máy phát triển.
- Mọi secret môi trường thật phải đi qua biến môi trường hoặc secret store của nền tảng triển khai.
- Không ghi access token, refresh token, mật khẩu, khóa VAPID, payment secret, nội dung tệp hoặc connection password vào log.
- Trước khi bàn giao phải chạy secret scan và thay toàn bộ credential từng dùng để thử nghiệm.

## Dữ liệu nghiên cứu

- Không commit email, họ tên, IP hoặc phản hồi mở có thể nhận diện người tham gia.
- `experiments/results/raw` chỉ chứa `.gitkeep`; dữ liệu thật được lưu tại vùng kiểm soát truy cập của nhóm.
- Chỉ bản đã ẩn danh/tổng hợp và được kiểm tra mới được đưa vào repo.

## Invariants đa thuê bao

- Tenant không được lấy từ payload nghiệp vụ.
- Host, JWT `tid`, trạng thái tenant và membership phải khớp trước service.
- Mọi truy vấn application plane phải chạy với `TenantContext` và điều kiện tenant; Pool còn được PostgreSQL RLS bảo vệ.
- Role runtime không được là table owner, superuser hoặc có `BYPASSRLS`.

