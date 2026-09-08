# Runbook triển khai single-node trên VPS hoặc máy tự host

Compose trong repo là baseline local/single-node, không phải cấu hình production đã được chứng nhận.

Máy laptop/cá nhân của nhóm có thể dùng làm host thử nghiệm nếu chạy Linux hoặc máy ảo Linux ổn định và đáp ứng cùng contract triển khai như VPS. Trước pilot phải ghi rõ CPU/RAM/ổ đĩa, hệ điều hành, đường truyền, public IP hoặc cơ chế tunnel/port-forward, domain/wildcard DNS, TLS, thời gian máy hoạt động, nguồn điện, backup ngoài máy và người chịu trách nhiệm vận hành. Nếu mạng dùng CGNAT, IP thay đổi, nhà mạng chặn cổng hoặc máy không thể hoạt động liên tục thì không được coi là môi trường Internet ổn định cho pilot/ nghiệm thu cho đến khi có giải pháp được kiểm chứng. Lựa chọn VPS thuê hay máy tự host phải được khóa trong manifest trước khi thu số đo.

## Chuẩn bị

- Khóa image bằng digest thay vì tag trôi; lưu commit và migration version trong release manifest.
- Tạo DNS cho accounts host và wildcard tenant host. TLS wildcard dùng DNS-01; image Caddy mặc định không chứa DNS provider module nên phải build image riêng đúng provider hoặc terminate TLS ở reverse proxy được quản lý.
- Nạp password database, JWT, placement encryption, payment webhook, resource signing, MinIO và Grafana từ secret manager/file chỉ đọc. Không dùng `infra/.env.example`.
- Tách network database/object storage khỏi cổng công khai; chỉ reverse proxy được mở 80/443. Cổng quản trị phải qua VPN/SSH tunnel.
- Cấp role theo [infra/README.md](../README.md); API không nhận `PROVISIONER_DB_*` hay PostgreSQL superuser.

## Thứ tự phát hành

1. Chụp backup và kiểm tra restore point.
2. Pull image theo digest và ghi release manifest.
3. Chạy control migration bằng role migration riêng; chạy application-plane migration bằng provisioner trên Pool, từng schema tenant và từng database Silo. Dừng nếu bất kỳ schema/database nào không validate.
4. Khởi động worker, xác minh outbox/provisioning backlog không tăng bất thường.
5. Khởi động API và web, sau đó chuyển reverse proxy khi readiness đạt.
6. Chạy smoke, host–token mismatch, RLS role check và một callback thanh toán trùng trong sandbox/fake provider.
7. Theo dõi error ratio, p95 quan sát, connection pool, CPU và RAM. Không áp SLO p95 cho đến khi pilot trên đúng cấu hình host đã khóa hoàn tất.

## Rollback

- Rollback application bằng image digest trước đó chỉ khi schema vẫn tương thích ngược.
- Không tự động down-migrate database. Nếu migration phá vỡ tương thích, giữ traffic ở maintenance và restore theo runbook backup/restore.
- Provisioning job đang chạy phải về trạng thái retryable/rolled-back có audit trước khi chạy lại.

## Bảo mật vận hành

- Rotate ngay credential bị đưa vào log/ticket/chat; xóa log không thay thế rotation.
- Giới hạn retention log và không ghi JWT, refresh token, password, webhook signature hay signed object URL.
- Cấu hình backup off-host, cảnh báo dung lượng, cập nhật base image có kiểm soát và quét dependency/container trong CI.
