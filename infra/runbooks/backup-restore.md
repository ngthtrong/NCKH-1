# Runbook backup và restore

Runbook này mô tả quy trình logic, phù hợp môi trường nghiên cứu nhỏ. Trước production cần khóa RPO/RTO, lưu bản sao ngoài máy chủ và diễn tập restore định kỳ.

## Phạm vi phải sao lưu

- PostgreSQL: `control_db`, `pool_db` và mọi database Silo được control plane tham chiếu.
- MinIO: toàn bộ bucket tài nguyên và metadata phiên bản nếu bật versioning.
- Cấu hình triển khai: image digest, migration version và tên secret; không đưa giá trị secret vào backup manifest.
- Manifest backup: thời gian UTC, commit, danh sách database/bucket, checksum và trạng thái ứng dụng.

## Backup nhất quán

1. Chuyển hệ thống sang maintenance/read-only và đợi transaction đang chạy kết thúc.
2. Lấy danh sách Silo từ control plane. Không suy ra chỉ từ prefix database vì route trong control plane là nguồn sự thật.
3. Tạo custom-format dump cho từng database bằng PostgreSQL version bằng hoặc mới hơn server:

   ```bash
   docker compose --env-file infra/.env -f infra/compose.yaml exec -T postgres \
     pg_dump --username "$POSTGRES_ADMIN_USER" --format=custom --no-owner --dbname control_db > control_db.dump
   ```

   Lặp lại cho `pool_db` và từng Silo đã xác minh. File dump phải nằm trong thư mục backup riêng, không nằm trong Git.

4. Dùng MinIO Client với credential backup chỉ đọc để mirror bucket sang kho backup đã mã hóa. Không dùng application access key cho backup production.
5. Tạo SHA-256 checksum, ghi version PostgreSQL/MinIO, image digest và thời điểm bắt đầu/kết thúc.
6. Chỉ thoát maintenance sau khi dump, object mirror và checksum đều thành công.

## Restore vào môi trường sạch

1. Cô lập target, tạo database/role bằng credential quản trị; không restore đè lên môi trường đang phục vụ.
2. Restore control plane trước, rồi pooled database, sau đó từng Silo:

   ```bash
   docker compose --env-file infra/.env -f infra/compose.yaml exec -T postgres \
     pg_restore --username "$POSTGRES_ADMIN_USER" --clean --if-exists --no-owner --dbname control_db < control_db.dump
   ```

3. Khôi phục object vào bucket mới và đối chiếu checksum/count trước khi đổi route.
4. Chạy Flyway `validate`; chỉ migrate tiến khi phiên bản ứng dụng đích yêu cầu và đã có backup bất biến.
5. Áp lại grant theo role, rồi xác minh API role không là owner/superuser, không `BYPASSRLS`; xác minh `FORCE ROW LEVEL SECURITY`.
6. Chạy smoke test, kiểm thử token A/host B, tải file đúng/sai tenant và một vòng provisioning idempotency.
7. So sánh số tenant, membership, project, task, resource metadata và object count với manifest backup.
8. Chỉ chuyển traffic sau khi tất cả kiểm tra đạt; giữ nguồn cũ cho đến khi hết cửa sổ rollback.

## Diễn tập

Ít nhất trước mỗi đợt thực nghiệm chính, restore một bản backup vào target tạm, ghi thời gian thực tế, lỗi và checksum. Backup chưa từng restore thử không được xem là bằng chứng khôi phục thành công.
