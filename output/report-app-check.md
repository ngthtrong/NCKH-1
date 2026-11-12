# Đối chiếu ứng dụng với Report (1).docx — 12/11/2026

Ứng dụng đang chạy tại http://accounts.localhost:8080. `scripts/dev-up.sh` mặc định
dựng bản Pool mức 3 trong project Docker Compose `nckh-report`; bản Bridge cũ được
giữ riêng. Không sửa file Word, không điền số đo vào các ô còn trống của báo cáo.

## Những phần đã sửa theo báo cáo

| Nội dung | Hiện thực và kiểm tra |
|---|---|
| Mức 3 / Pool | Một API phục vụ `pool-demo`, `t-acme`, `t-lotus`; cả ba ACTIVE, cùng `pool_db.public`, migration 14. Server từ chối tạo placement Schema/Silo trong bản report. |
| Stack | React 18.3.1, Spring Boot 3.5.16 / Java 21, PostgreSQL 16, Redis 7; giao diện build bằng Node 22 trong Docker. |
| K1 — ngữ cảnh | Host–JWT binding, JWT hết hạn/thiếu token trả 401 trong bản report; kiểm tra đọc xen kẽ hai tenant và dọn ThreadLocal/MDC. |
| K2 — dữ liệu | `SET LOCAL` tương đương qua `set_config(..., true)` trong transaction; FORCE RLS, role không superuser/BYPASSRLS; truy vấn thiếu WHERE không đọc hàng tenant khác, thiếu context trả 0 hàng. |
| K3 — bảo vệ | Redis INCR + EXPIRE nguyên tử theo tenant; Caffeine L1 / Redis L2 với khóa có tenant ID và version/generation. Board cache được làm mới khi task/comment hoặc cấu hình đổi. Có Pub/Sub cho thu hồi cấu hình. |
| K4 — tùy biến | Branding; cột mặc định, FULL/COMPACT, STRICT/WARN/OFF; field động STRING/NUMBER/BOOLEAN, required, giá trị JSONB trên bảng dùng chung. Kiểm tra kiểu/field phía server. |
| Acme / Lotus | Acme: STRICT, WIP 2, Story points/Sprint, màu xanh. Lotus: WARN, WIP 2, Channel/Budget, màu cam. Task thứ 3 ở cột đang làm: Acme 422; Lotus vẫn lưu và UI cảnh báo. |
| Giao diện | Sửa khoảng đệm, cấu hình quy trình/field, form nhập task, thẻ thu gọn, cảnh báo WIP; desktop và mobile không tràn ngang trong kiểm tra trình duyệt. |

Ảnh và snapshot runtime:

- [Acme desktop](report-ui/acme-settings-desktop.png), [Acme mobile](report-ui/acme-settings-mobile.png).
- [Lotus desktop](report-ui/lotus-settings-desktop.png), [đăng nhập](report-ui/login-desktop.png).
- [Metadata runtime không chứa credential](report-runtime.json).

## Kiểm tra đã hoàn tất

| Kiểm tra | Kết quả |
|---|---|
| Backend Maven/Testcontainers | 110 pass, 0 lỗi, 0 skip; gồm migration, isolation, authorization, concurrency và MinIO archive integration. |
| Frontend unit | 22 pass / 9 file. Do I/O chậm trên `/mnt/d`, chạy bản sao nguồn trên filesystem Linux tại `/tmp/nckh-web-verification`, cùng lockfile và Node 22. |
| Build web + OpenAPI | Docker build TypeScript/Vite thành công; generated API khớp OpenAPI. |
| Hạ tầng/công cụ | 12 unit test pass, Compose interpolation và shell syntax pass. Các cổng nghiên cứu P2 chưa được coi là đạt. |
| Playwright | 1 luồng thực qua đăng nhập, chuyển sang Acme/Lotus, cấu hình khác nhau và layout mobile pass. |
| KB-1–KB-4 functional | Cả 4 nhóm pass; cleanup đã hoàn tất. |
| SQL | Role ứng dụng: 0 hàng khi thiếu context, 0 hàng tenant khác; lưu EXPLAIN ANALYZE/BUFFERS và microbenchmark RLS trên TEMP table riêng. |
| KB-3 smoke cuối | 10 giây, 327 vòng k6 hoàn tất, victim 26/26 thao tác thành công, có 429 của aggressor; lưu p50/p95/p99 và Prometheus. Đây là run development, không phải kết luận hiệu năng chính thức. |

Artifact lần chạy:

- Functional: `experiments/results/development/report-2026-11-12T12-59-44.958Z/evidence.json`.
- SQL: `experiments/results/development/report-database-20261112T130330Z/rls-and-plans.txt`.
- Load cuối: `experiments/results/development/kb3-after-2026-11-12T13-11-46.266Z/`.
- Giữ nguyên run bị lỗi `kb3-after-2026-11-12T13-08-25.050Z`: harness cũ để
  nhiều VU cùng ghi một thẻ nên có 2 HTTP 409. Harness hiện tại tách một writer
  cho mỗi tenant, không bỏ qua 409. Run before cũ thuộc phiên bản harness cũ;
  không ghép thành cặp so sánh thống kê với run after cuối.

## Chạy lại

```bash
cd /mnt/d/NCKH
bash scripts/dev-up.sh
```

Mở http://accounts.localhost:8080. Tài khoản mẫu mặc định:
`owner@example.test` / `ChangeMe123!` (giá trị thực lấy từ `infra/.env`).
Chọn Acme hoặc Lotus; vào **Cài đặt workspace** để xem quy trình và field.
Tạo project/board mới để nhận bộ cột mặc định riêng của tổ chức.

[Giao thức, lệnh chạy và ánh xạ KB-1–KB-4](../experiments/report/README.md).

## Giới hạn đối chiếu

- Chưa có thực nghiệm chính thức, SLO đã khóa hoặc 5 cặp lặp cùng phiên bản
  harness. Tất cả số đo ở đây có `eligible_for_final_analysis=false`.
- Không thay tên bảng vật lý có sẵn: cấu hình JSONB ở
  `tenant_kanban_settings.settings`, giá trị ở `tasks.custom_data`, thay vì tên
  `tenants.settings`/`cards` trong phần mô tả. Chức năng chia sẻ và cô lập vẫn
  được kiểm tra trên bảng dùng chung.
- Field schema hiện hữu hạn ở ba kiểu và required, không nhận mọi cấu trúc
  JSON Schema Draft 2020-12 tùy ý. Không tuyên bố đã kiểm toàn bộ tiêu chuẩn đó.
- Cache kiểm tra generation tại CSDL trước khi trả L1/L2; chưa đo Pub/Sub giữa
  nhiều API instance. Bản mức 3 này đang chạy một API, không minh họa mức 4.
- File của bản report dùng filesystem volume; Bridge/MinIO không nằm trong
  đường khởi động mặc định. Dữ liệu/volume Bridge cũ được giữ nguyên.

Không có cơ sở biến các kết quả smoke thành các khẳng định tuyệt đối như
"100% thành công ở mọi tải" hoặc "overhead RLS không đáng kể" trong báo cáo.
