# Hướng dẫn khởi chạy và kiểm thử ứng dụng local

Hướng dẫn này dùng cho môi trường phát triển hoặc kiểm thử thủ công trên một máy. Cách chạy được hỗ
trợ chính thức là Docker Compose; không cần cài PostgreSQL, MinIO, Java hay Node trực tiếp trên máy.

## 1. Thành phần được khởi chạy

Lệnh khởi động sẽ build và chạy:

- React web và Caddy reverse proxy;
- Spring Boot API và worker/provisioner;
- PostgreSQL 18 với `control_db`, `pool_db`, `schema_db` và database của tenant Silo;
- MinIO, Mailpit, Prometheus và Grafana.

Ba tenant mẫu minh họa ba placement:

| Tenant | Placement | Cách bố trí dữ liệu |
|---|---|---|
| `pool-demo` | `POOL` | Shared Database, Shared Schema |
| `schema-demo` | `SCHEMA_PER_TENANT` | Shared Database, Separate Schema |
| `silo-demo` | `SILO_DATABASE` | Separate Database |

## 2. Yêu cầu máy

- Git và `curl`.
- Docker Engine hoặc Docker Desktop có Docker Compose v2.
- Khuyến nghị còn trống ít nhất 8 GiB RAM và 15 GiB ổ đĩa.
- Các cổng mặc định chưa bị ứng dụng khác chiếm: `8080`, `5432`, `8025`, `9000`, `9001`, `9090`,
  `3000`.

Nếu dùng Windows + WSL2, mở Docker Desktop, bật **Settings → Resources → WSL Integration** cho distro
đang chứa repository, sau đó kiểm tra trong terminal WSL:

```bash
docker version
docker compose version
```

Cả hai lệnh phải hiển thị thông tin Docker server. Nếu chỉ có client hoặc báo không tìm thấy
`/var/run/docker.sock`, Docker Desktop chưa chạy hoặc WSL Integration chưa được bật.

## 3. Chuẩn bị cấu hình local

Từ terminal, vào thư mục gốc repository:

```bash
cd /home/ngthtrong/NCKH-1
git status --short
```

Script khởi động sẽ tự tạo `infra/.env` từ `infra/.env.example` nếu file chưa có. Có thể chủ động tạo
trước để xem và sửa các cổng hoặc tài khoản demo:

```bash
cp infra/.env.example infra/.env
chmod 600 infra/.env
```

`infra/.env` bị Git bỏ qua và chứa secret local. Không commit, gửi file này cho người khác hoặc dùng
các giá trị `change-me` khi đưa ứng dụng lên Internet. Nếu PostgreSQL volume đã có dữ liệu, không tự ý
đổi các mật khẩu database trong `.env`; container cũ vẫn giữ mật khẩu được tạo ở lần init đầu.

## 4. Khởi động ứng dụng

Chạy tại thư mục gốc:

```bash
scripts/dev-up.sh
```

Script thực hiện kiểm tra Compose, build image, khởi động container và đợi API readiness. Lần đầu cần
tải image và dependency nên có thể mất vài phút. Kết quả thành công kết thúc bằng thông báo tương tự:

```text
Local stack is ready: http://accounts.localhost:8080
Mailpit: http://127.0.0.1:8025
Grafana: http://127.0.0.1:3000
```

API sẵn sàng không có nghĩa tenant mẫu đã provision xong ngay lập tức. Worker có thể cần thêm khoảng
vài chục giây để đưa đủ ba tenant đến `ACTIVE`. Có thể chạy lại `scripts/dev-up.sh`; thao tác này giữ
volume và dữ liệu hiện hữu.

## 5. Địa chỉ truy cập

| Chức năng | Địa chỉ mặc định |
|---|---|
| Đăng nhập và chọn tenant | `http://accounts.localhost:8080` |
| Tenant Pool | `http://pool-demo.localhost:8080` |
| Tenant Schema-per-tenant | `http://schema-demo.localhost:8080` |
| Tenant Silo | `http://silo-demo.localhost:8080` |
| Email local Mailpit | `http://127.0.0.1:8025` |
| MinIO console | `http://127.0.0.1:9001` |
| Prometheus | `http://127.0.0.1:9090` |
| Grafana | `http://127.0.0.1:3000` |

Nếu đã đổi `HTTP_PORT` trong `infra/.env`, thay `8080` trong các URL bằng cổng mới. Ứng dụng xác định
tenant bằng hostname, vì vậy không thay các URL tenant bằng `127.0.0.1` khi kiểm thử đăng nhập/nghiệp vụ.

## 6. Tài khoản demo

System Admin/Owner được lấy từ hai biến sau trong `infra/.env`:

```bash
sed -n '/^DEMO_OWNER_EMAIL=/p;/^DEMO_OWNER_PASSWORD=/p' infra/.env
```

Tài khoản thành viên mẫu:

- Email: `member@example.test`
- Mật khẩu: cùng giá trị `DEMO_OWNER_PASSWORD` trong môi trường local.

Đăng nhập ở `accounts.localhost`, chọn một tenant rồi để hệ thống chuyển sang đúng subdomain. Tài khoản
Owner có quyền System Admin để xem placement/capability; quyền thao tác nội dung project vẫn được kiểm
tra theo vai trò trong từng project.

## 7. Luồng kiểm thử thủ công gợi ý

1. Vào lần lượt ba tenant và tạo project, board, cột, task để xác nhận nghiệp vụ lõi giống nhau.
2. Ở Pool, kiểm tra branding và xác nhận Custom Data/Approval/Automation không thể được cấp vượt giới
   hạn placement.
3. Ở Schema-per-tenant, bật Custom Data, tạo bảng nghiệp vụ hoặc field Task và nhập dữ liệu.
4. Ở Silo, bật Approval/Automation, cấu hình workflow, gửi Task để duyệt và xem lịch sử execution.
5. Đăng nhập tài khoản member để kiểm tra vai trò project, notification và các thao tác bị giới hạn.
6. Mở Mailpit để xem email local; email này không được gửi ra Internet.

## 8. Kiểm tra health và log

Xem trạng thái container:

```bash
docker compose --env-file infra/.env -f infra/compose.yaml ps
```

API, web và PostgreSQL phải ở trạng thái `healthy`; worker phải ở trạng thái `Up`. Kiểm tra API qua
đúng host trung tâm:

```bash
curl --fail --show-error -H 'Host: accounts.localhost' \
  http://127.0.0.1:8080/actuator/health
```

Xem log API và worker:

```bash
docker compose --env-file infra/.env -f infra/compose.yaml logs --tail=200 api worker
```

Theo dõi log trong lúc thao tác:

```bash
docker compose --env-file infra/.env -f infra/compose.yaml logs --follow api worker
```

Nhấn `Ctrl+C` chỉ dừng theo dõi log, không dừng container.

## 9. Chạy smoke tự động

Các script cần Node.js 22 trở lên và phải chạy từ thư mục gốc:

```bash
node scripts/verify-extension-workflow.mjs
node scripts/verify-p-app-workflow.mjs
```

Smoke EXT kiểm tra ba placement, capability, branding, Custom Data, Approval và Automation. Smoke P-App
kiểm tra hồi quy các luồng ứng dụng cũ. Fixture do script tạo sẽ được cleanup theo cơ chế của ứng dụng.

## 10. Dừng và chạy lại

Dừng toàn bộ stack nhưng giữ database/object/file trong volume:

```bash
scripts/dev-down.sh
```

Khởi động lại:

```bash
scripts/dev-up.sh
```

Không dùng `down --volumes` để sửa lỗi khởi động hoặc migration. Lệnh đó xóa toàn bộ dữ liệu local và
chỉ được dùng khi chắc chắn môi trường là disposable và không cần backup.

## 11. Xử lý lỗi thường gặp

### Docker không khả dụng trong WSL

Khởi động Docker Desktop, bật WSL Integration rồi chạy lại `docker version`. Không cài thêm một Docker
daemon độc lập trong cùng distro nếu nhóm đang dùng Docker Desktop.

### Cổng đã bị chiếm

Kiểm tra container hoặc ứng dụng đang dùng cổng, hoặc đổi các biến `HTTP_PORT`, `POSTGRES_PORT`,
`MAILPIT_UI_PORT`, `MINIO_PORT`, `MINIO_CONSOLE_PORT`, `PROMETHEUS_PORT`, `GRAFANA_PORT` trong
`infra/.env`, rồi chạy lại `scripts/dev-up.sh`.

### Trình duyệt không mở được `*.localhost`

Thử lại bằng đúng URL có `http://` và cổng. Nếu môi trường không tự phân giải subdomain `.localhost`,
thêm tạm `accounts.localhost`, `pool-demo.localhost`, `schema-demo.localhost`, `silo-demo.localhost`
trỏ về `127.0.0.1` trong file hosts của hệ điều hành dùng để mở trình duyệt.

### API không healthy

Chạy `docker compose ... ps` và xem log `api`, `worker`, `postgres`. Không xóa volume. Các lỗi thường
gặp là Docker thiếu RAM, `.env` bị đổi so với volume cũ, PostgreSQL chưa healthy hoặc migration lỗi.

### Tenant còn `PROVISIONING`

Đợi worker polling rồi tải lại trang. Xem log worker và trang System Admin để lấy trạng thái/job cụ thể.
Không sửa trực tiếp metadata placement trong database.

## 12. Tài liệu liên quan

- [Runbook local](../infra/runbooks/local-development.md)
- [Hạ tầng Compose](../infra/README.md)
- [Backup và restore](../infra/runbooks/backup-restore.md)
- [Triển khai Internet/VPS](../infra/runbooks/deployment.md)
- [Checkpoint hiện tại](PROJECT_STATUS.md)

