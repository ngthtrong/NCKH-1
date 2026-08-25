# Hạ tầng chạy local

Thư mục này chứa hạ tầng tái lập cho ứng dụng nghiên cứu. Một PostgreSQL instance chứa `control_db`, `pool_db` và các database Silo do worker cấp phát; API không nhận credential có quyền `CREATEDB`.

Khởi động từ thư mục gốc:

```bash
scripts/dev-up.sh
```

Lệnh tạo `infra/.env` từ mẫu nếu chưa có, build API/web và chạy PostgreSQL 18, API, worker, MinIO, Mailpit, Caddy, Prometheus và Grafana. Các giá trị `change-me` chỉ dành cho máy local cô lập; môi trường khác phải nạp secret từ secret manager.

Các điểm truy cập mặc định:

| Dịch vụ | Địa chỉ |
|---|---|
| Ứng dụng/accounts | `http://accounts.localhost:8080` |
| Tenant mẫu | `http://{tenant}.localhost:8080` |
| Mailpit | `http://127.0.0.1:8025` |
| MinIO console | `http://127.0.0.1:9001` |
| Prometheus | `http://127.0.0.1:9090` |
| Grafana | `http://127.0.0.1:3000` |

Xem [local-development.md](runbooks/local-development.md), [backup-restore.md](runbooks/backup-restore.md) và [deployment.md](runbooks/deployment.md) trước khi vận hành ngoài local.

## Ranh giới quyền

- `control_api`: DML trên control plane, không tạo database/role, không `BYPASSRLS`.
- `pool_api`: DML trên pooled application plane, không tạo database/role, không `BYPASSRLS`.
- `control_migrator`: DDL trong schema `public` của control database, không tạo database/role.
- `saas_provisioner`: chỉ có ở worker; được `CREATEDB`/`CREATEROLE` để cấp phát Silo và chạy migration.
- PostgreSQL superuser chỉ dùng khi khởi tạo/khôi phục và không được truyền vào API hoặc worker.

Thay đổi các role hoặc grant phải đi kèm kiểm thử chứng minh application role không phải superuser, không có `BYPASSRLS`, và RLS trên bảng pooled vẫn ở trạng thái `FORCE ROW LEVEL SECURITY`.
