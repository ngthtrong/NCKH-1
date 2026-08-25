# Runbook môi trường local

## Điều kiện

- Docker Engine và Docker Compose v2.
- Ít nhất 8 GiB RAM trống để chạy toàn bộ stack.
- `curl` để script readiness kiểm tra API.
- Các cổng mặc định 8080, 5432, 8025, 9000, 9001, 9090 và 3000 chưa bị chiếm; có thể đổi trong `infra/.env`.

## Khởi động

```bash
scripts/dev-up.sh
```

Lần chạy đầu tạo `infra/.env` với quyền file hạn chế và các giá trị development-only. Không sao chép file này lên VPS. Khi cần đổi cấu hình, sửa `infra/.env`, sau đó chạy lại lệnh trên.

Kiểm tra trạng thái và log mà không in nội dung secret:

```bash
docker compose --env-file infra/.env -f infra/compose.yaml ps
docker compose --env-file infra/.env -f infra/compose.yaml logs --tail=200 api worker
curl -H 'Host: accounts.localhost' http://127.0.0.1:8080/actuator/health
```

Mặc định `DEMO_DATA_ENABLED=true` yêu cầu application seed do backend cung cấp. Tài khoản local nằm trong `infra/.env`; không dùng credential đó trong dữ liệu khảo sát hoặc môi trường công khai.

## Dừng và xử lý lỗi

```bash
scripts/dev-down.sh
```

Lệnh trên giữ nguyên volume. Nếu PostgreSQL init thất bại, kiểm tra `postgres` log và các biến bắt buộc trước; init script chỉ chạy trên volume hoàn toàn mới.

Xóa toàn bộ dữ liệu local là thao tác không thể hoàn tác. Chỉ sau khi đã xác nhận không cần backup, chạy thủ công:

```bash
docker compose --env-file infra/.env -f infra/compose.yaml down --volumes --remove-orphans
```

Không dùng thao tác xóa volume để xử lý migration lỗi trong môi trường có dữ liệu cần giữ.

## Xác minh cô lập tối thiểu

Sau khi backend seed một tenant Pool và một tenant Silo:

1. Đăng nhập ở `accounts.localhost`, lấy token riêng cho từng tenant.
2. Gửi token tenant A đến host tenant B và xác nhận bị từ chối trước service nghiệp vụ.
3. Dùng application database role kiểm tra `rolsuper=false`, `rolbypassrls=false`.
4. Kiểm tra bảng pooled có cả RLS và force-RLS bật trong `pg_class`.
5. Chạy test tự động backend; không xem thao tác thủ công là bằng chứng thay thế test.
