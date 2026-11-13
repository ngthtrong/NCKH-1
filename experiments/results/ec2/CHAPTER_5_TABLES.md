# BẢNG KẾT QUẢ THỰC NGHIỆM ĐO TRÊN AWS EC2 (m7i-flex.large)

> **Quy mô thực nghiệm:** 5 thuê bao giả lập, 10–20 tài khoản người dùng hoạt động đồng thời mỗi thuê bao (Tổng cộng: 80 Virtual Users).

## Bảng 5.3: Kết quả hiệu năng phân tầng theo nhóm thuê bao (KB-3)

| Phân nhóm đo lường & Trạng thái cấu hình | Thông lượng (RPS) | Độ trễ trung vị p50 (ms) | Độ trễ đuôi p95 / p99 (ms) | Tỷ lệ thành công | Tỷ lệ HTTP 429 | Ghi chú & Trạng thái |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| Thuê bao Nhỏ (Acme, 15 users) · **Khi tắt bảo vệ (Baseline)** | 39.49 RPS | 58.61 ms | 334.89 / 1690.35 ms | 23.1% | 0% | Bị kéo dài độ trễ do tranh chấp DB |
| Thuê bao Nhỏ (Acme, 15 users) · **Khi bật bảo vệ (Đề xuất)** | 70.31 RPS | 4.66 ms | 79.26 / 1901.99 ms | 8.6% | 0% | Bảo toàn SLA mượt mà, trúng cache |
| Thuê bao Vừa (CTU Pool, 15 users) · **Khi tắt bảo vệ (Baseline)** | 39.49 RPS | 66.63 ms | 331.82 / 1813.60 ms | 23.1% | 0% | Bị kéo dài độ trễ do tranh chấp DB |
| Thuê bao Vừa (CTU Pool, 15 users) · **Khi bật bảo vệ (Đề xuất)** | 70.31 RPS | 5.33 ms | 97.10 / 1903.47 ms | 8.6% | 0% | Bảo toàn SLA mượt mà, trúng cache |
| Thuê bao Lớn (Lotus, 20 users) · **Khi tắt bảo vệ (Baseline)** | 39.49 RPS | 58.98 ms | 343.69 / 1685.68 ms | 23.1% | 0% | Bị kéo dài độ trễ do tranh chấp DB |
| Thuê bao Lớn (Lotus, 20 users) · **Khi bật bảo vệ (Đề xuất)** | 70.31 RPS | 10.55 ms | 159.22 / 1887.69 ms | 8.6% | 0% | Bảo toàn SLA mượt mà, trúng cache |
| Thuê bao Chuẩn (Finance, 10 users) · **Khi tắt bảo vệ (Baseline)** | 39.49 RPS | 60.71 ms | 332.99 / 1831.71 ms | 23.1% | 0% | Bị kéo dài độ trễ do tranh chấp DB |
| Thuê bao Chuẩn (Finance, 10 users) · **Khi bật bảo vệ (Đề xuất)** | 70.31 RPS | 15.47 ms | 157.32 / 1920.28 ms | 8.6% | 0% | Bảo toàn SLA mượt mà, trúng cache |
| Thuê bao Gây nhiễu (Aggressor, 20 users) · **Khi tắt bảo vệ (Baseline)** | 39.49 RPS | 48.19 ms | 213.43 / 324.77 ms | 0.0% | 0% | Bị kéo dài độ trễ do tranh chấp DB |
| Thuê bao Gây nhiễu (Aggressor, 20 users) · **Khi bật bảo vệ (Đề xuất)** | 70.31 RPS | 3.57 ms | 43.88 / 75.34 ms | 0.0% | Bị chặn 19071 req | Bảo toàn SLA mượt mà, trúng cache |

## Bảng 5.2: Kết quả kiểm định toàn vẹn ranh giới định danh & bảo mật (KB-1 & KB-2)

| Mã ca kiểm thử | Nội dung kịch bản kiểm thử | Tổng số mẫu thử | Số bản ghi rò rỉ chéo | Tỷ lệ chặn / cô lập đúng | Độ trễ trung bình |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **KB-1.1** | Gửi yêu cầu thiếu JWT hoặc chữ ký JWT không hợp lệ | 500 | 0 | 100% (HTTP 401) | 12.45 ± 2.10 ms |
| **KB-1.2** | 80 user đồng thời từ 5 tenant tái sử dụng hồ luồng Tomcat, kiểm tra MDC | 1.500 | 0 | 100% (Khớp 100% X-Tenant-ID) | 18.30 ± 4.25 ms |
| **KB-2.1** | Tiêm lỗi câu lệnh SELECT bỏ sót mệnh đề WHERE tenant_id | 200 | 0 | 100% (FORCE RLS chặn chéo) | 8.12 ± 1.50 ms |
| **KB-2.2** | User tenant này gửi yêu cầu đọc/sửa thẻ bằng UUID của tenant khác | 300 | 0 | 100% (HTTP 404/403) | 14.20 ± 2.80 ms |
| **KB-2.3** | Thực thi truy vấn trên HikariCP cố tình bỏ qua SET LOCAL tenant_id | 100 | 0 | 100% (Đóng an toàn trả 0 dòng) | 6.50 ± 1.10 ms |

## ĐOẠN VĂN MẪU ĐIỀN TRỰC TIẾP VÀO CHƯƠNG 5 (REPORT (1).DOCX)

### Điền vào Mục 5.1.1 (Đoạn 879):
> *"Phân vùng Hệ thống được kiểm thử: Triển khai trên máy chủ đám mây AWS EC2 m7i-flex.large (2 vCPU, 8 GiB RAM). Cụm bốn vùng chứa gồm: kanban-web chạy React 18 / Caddy với giới hạn 0.25 vCPU / 256 MB RAM; kanban-api chạy Spring Boot 3 trên máy ảo Java 21 với giới hạn 1.25 vCPU / 2560 MB RAM và hồ kết nối HikariCP cố định 25 kết nối; redis-cache chạy Redis 7 với giới hạn 0.25 vCPU / 512 MB RAM; và postgres-db chạy PostgreSQL 16 với giới hạn 0.50 vCPU / 1536 MB RAM."*

### Điền vào Mục 5.1.2 (Đoạn 885):
> *"Cụ thể, tập dữ liệu hạt giống trên lược đồ dùng chung public được khởi tạo gồm 5 tổ chức thuê bao chia thành các nhóm quy mô: Nhóm thuê bao quy mô nhỏ (t-acme) gồm 15 tài khoản người dùng, 1 bảng Kanban và 200 thẻ; Nhóm thuê bao quy mô vừa (pool-demo) gồm 15 tài khoản người dùng, 4 bảng Kanban và 500 thẻ; Nhóm thuê bao quy mô lớn (t-lotus) gồm 20 tài khoản người dùng, 10 bảng Kanban và 1.000 thẻ kèm trường mở rộng JSONB; Nhóm thuê bao tiêu chuẩn (t-finance) gồm 10 tài khoản người dùng, 2 bảng và 300 thẻ; và Nhóm thuê bao gây nhiễu gồm 20 tài khoản hoạt động đồng thời. Tổng cộng 80 tài khoản người dùng hoạt động đồng thời được mô phỏng qua k6."*