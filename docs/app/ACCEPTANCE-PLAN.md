# Kế hoạch hoàn thiện sản phẩm 2–4 phục vụ nghiệm thu

**Lập:** 2026-09-24 (UTC+7)
**Nền:** `main` @ `76859aa`
**Phạm vi:** ba sản phẩm theo mục 15.2 của thuyết minh: (2) Tài liệu đề xuất giải pháp kỹ thuật,
(3) Tài liệu đặc tả kiến trúc, (4) Ứng dụng web quản lý công việc đa thuê bao. Sản phẩm 1, 5, 6 và
nhóm sản phẩm mục IV (bản tin, báo cáo tóm tắt, video) chỉ được nhắc tới khi phụ thuộc vào ba sản phẩm này.

Tài liệu này là kế hoạch và checklist. Không mục nào được dùng làm bằng chứng nghiệm thu hay kết quả
nghiên cứu. Các việc thuộc diện đang tạm dừng (VPS/Internet, provider thật, đo đạc) chỉ bắt đầu sau khi
nhóm ra quyết định ở mục 2.

## 1. Kết quả rà soát ngày 2026-09-24

### 1.1 Kiểm tra chạy lại trên máy phát triển

| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Frontend `lint` (tsc) | Đạt | — |
| Frontend `api:check` | Đạt | Không drift OpenAPI |
| Frontend unit test | Đạt 22/22 | 9 file |
| Frontend production build | Đạt | Vite 7.3.6 |
| Backend `./mvnw test` | 106 test: 59 đạt, **47 bị bỏ qua**, 0 lỗi | Máy không có Docker trong WSL nên toàn bộ test Testcontainers bị skip: RLS, Schema-per-tenant, ProjectAuthorization, PaymentConcurrency, Provisioning, DeadlineReminder, Customization, ResourceDeletionOutbox. Các test cô lập **chưa được xác minh lại** trong lần rà soát này |
| Playwright E2E, smoke, Compose | Không chạy | Cần stack Docker |

### 1.2 Sản phẩm 2 — Tài liệu đề xuất giải pháp kỹ thuật

Hiện có: SRS v0.2 (2026-09-07), use case UC-01..UC-18, permission matrix, traceability matrix,
ADR-0001..0009, decision log, risk register.

| # | Phát hiện | Mức |
|---|---|---|
| G2-1 | SRS chưa phản ánh application migration V9–V12: priority của task, cột hoàn thành theo thuộc tính, nhắc hạn sắp đến/quá hạn có kiểm tra lại trước khi gửi, hàng đợi retry email, đích điều hướng notification, chặn xóa board còn task. Mục 7 thiếu trạng thái `ROLLBACK_FAILED` | Cao |
| G2-2 | Một số yêu cầu trong SRS chưa được hiện thực nhưng không ghi trạng thái: FR-15 (Owner suspend/delete tenant), dòng "Suspend/unsuspend tenant" của SystemAdmin trong permission matrix (enum `SUSPENDED` có nhưng không API nào đặt), FR-62 Web Push (dispatcher ghi `VAPID_NOT_CONFIGURED`), SEC-07 rate limit đăng nhập (`TenantRateLimitFilter` chỉ chạy khi có tenant context), OPS-02 secret scan trong CI, REL-04 diễn tập backup/restore, OBS-02 metric của worker, OPS-05 triển khai production | Cao |
| G2-3 | Không có bảng đối chiếu thuyết minh (mục 13.1, 13.2, 14.2) → yêu cầu SRS → hiện thực → minh chứng. Hội đồng chấm theo thuyết minh, trong khi SRS viết theo RQ và phạm vi mở rộng | Cao |
| G2-4 | Traceability matrix chưa có liên kết FR/SEC → test thật ("sẽ được thay thế… khi có"). Cột trạng thái lỗi thời, nhiều dòng vẫn ghi "Thiết kế baseline" dù đã có test local | Trung bình |
| G2-5 | Thuyết minh yêu cầu "nghiên cứu cơ chế định tuyến dựa trên Subdomain hoặc Header" nhưng chưa có ADR so sánh subdomain, header và path, dù hệ thống đã chọn subdomain | Trung bình |
| G2-6 | ADR-0003 (cơ chế cô lập Pool), ADR-0004 (payment) và ADR-0005 (storage) vẫn `Proposed`. ADR-0004 đã có điều khoản dự phòng "bàn giao Fake + adapter skeleton và ghi giới hạn" | Cần quyết định nhóm |
| G2-7 | Protocol RQ2 vẫn ghi "Bridge kết hợp Pool và Silo"; phụ lục ba placement chưa được duyệt | Cần quyết định nhóm |
| G2-8 | Quy tắc thuyết minh "thuê bao có thể xóa board nhưng người dùng không thể" được hiện thực bằng project role Manager; Owner của tenant không mặc nhiên có quyền trong project. Cách ánh xạ này chưa được giải thích trong tài liệu | Thấp |

### 1.3 Sản phẩm 3 — Tài liệu đặc tả kiến trúc

Hiện có: `overview`, `c4`, `erd` (5 sơ đồ), `sequences` (10 luồng), `threat-model`, README. Tất cả
được cập nhật lần cuối ở commit `34a5463` ngày 2026-09-08, trước V9–V12.

| # | Phát hiện | Mức |
|---|---|---|
| G3-1 | ERD là mô hình logic và lệch với schema vật lý. ERD có `SUBSCRIPTION_TIER`, `TENANT_ROUTE`, `PROVISIONING_STEP`, `TENANT_TRANSFER_CODE`, `CONTROL_AUDIT_EVENT`, `CONTROL_OUTBOX_EVENT`, `PAYMENT_EVENT`. Thực tế tier là cột của `tenants`, route là slug, còn lại tương ứng `provisioning_events`, `tenant_session_grants`, `payment_webhook_events`; `audit_events`/`outbox_events` nằm ở application plane. ERD thiếu `task_deadline_reminders`, `tasks.priority`, cờ hoàn thành của `board_columns` và các cột retry của `notification_delivery_attempts` | Cao |
| G3-2 | `overview.md` §3 dùng tên module `identity/tenancy/billing/work/resource/observability`, trong khi package thật là `auth/tenant/payment/application/storage/security/customization/admin/...` | Trung bình |
| G3-3 | `overview.md` §7 ghi global cap Schema 20 và Silo 25; cấu hình thực tế là 10/10 (`application.yml`, `.env.example` không ghi đè) | Trung bình |
| G3-4 | `overview.md` §9 mô tả checkpoint `VALIDATE → RESERVE_ROUTE → … → ACTIVATE_ROUTE`; mã dùng `DATABASE_READY`, `APPLICATION_MIGRATED`, `READY_TO_FINALIZE` và có thêm trạng thái `ROLLBACK_FAILED`. Sơ đồ có `ACTIVE <-> SUSPENDED` nhưng chưa có đường chuyển trạng thái nào | Trung bình |
| G3-5 | `sequences.md` chưa có luồng nhắc hạn (scheduler → sổ chống trùng → kiểm tra lại → in-app/email) và hàng đợi retry email | Trung bình |
| G3-6 | Chưa có sơ đồ triển khai Internet: DNS wildcard, TLS, cổng mở, endpoint công khai của MinIO cho signed URL, secret, backup | Cao, phụ thuộc NT-4.1 |
| G3-7 | Threat model chưa có các mối đe dọa khi mở ra Internet (TLS, MinIO public, cổng quản trị, SMTP) và luồng nhắc hạn | Trung bình |
| G3-8 | Sơ đồ đang ở dạng Mermaid, không nhúng trực tiếp được vào báo cáo Word; chưa có bản PNG/SVG đánh số hình | Trung bình |

### 1.4 Sản phẩm 4 — Ứng dụng web

Các nghiệp vụ cốt lõi của thuyết minh đã hiện thực ở mức local; chi tiết ở `docs/PROJECT_STATUS.md`.
Khoảng trống còn lại:

| # | Phát hiện | Mức |
|---|---|---|
| G4-1 | Chưa triển khai "dịch vụ phần mềm trên Internet". `infra/caddy/Caddyfile` chỉ phục vụ `*.localhost` với `auto_https off`; Compose chỉ mở `HTTP_PORT`; chưa có cấu hình production, TLS wildcard (DNS-01 cần image Caddy có module DNS provider), endpoint MinIO công khai hay SMTP thật | Cao, cần quyết định D-2 |
| G4-2 | Frontend viết cứng `.localhost` ở 4 chỗ hiển thị: `OnboardingPage.tsx` (2), `TenantSelectionPage.tsx`, `InvitationPage.tsx`. Backend đã cấu hình được qua `BASE_DOMAIN` và `PUBLIC_TENANT_URL_TEMPLATE` | Cao, nhỏ |
| G4-3 | Module Quản trị hệ thống chưa khởi tạo, tạm ngưng hay mở lại thuê bao. Admin hiện chỉ xem, lọc, retry provisioning và cấp capability; tenant được tạo qua onboarding tự phục vụ | Cao |
| G4-4 | Bằng chứng cô lập phụ thuộc Docker: 47 test tích hợp bị bỏ qua trên máy không có Docker | Cao |
| G4-5 | Không có rate limit cho đăng nhập/đăng ký (SEC-07) | Trung bình |
| G4-6 | CI không có secret scan (OPS-02) | Trung bình |
| G4-7 | Chưa có biên bản diễn tập backup/restore cho control, Pool, Schema và Silo (REL-04) | Trung bình |
| G4-8 | Chưa có công cụ seed cho thực nghiệm 3–5 tenant × 10–20 user và cấp token cho k6; manifest chưa có trường placement; runtime chỉ có 1 tenant Schema | Cao cho sản phẩm 5 |
| G4-9 | Web Push chưa gửi thật; worker không có endpoint metric | Thấp |
| G4-10 | Chưa có bộ minh chứng (ảnh màn hình theo module, URL công khai, tài khoản demo cho hội đồng) và chưa có hướng dẫn sử dụng cho người dùng cuối | Cao |

## 2. Quyết định nhóm cần chốt trước (tuần 0)

| ID | Câu hỏi | Khuyến nghị |
|---|---|---|
| D-1 | Hạn kết thúc chính thức: mục 5 ghi 5–10/2026, mục 13.2/15.2 ghi 3–8/2026. Phiếu chấm cho 0 điểm tiến độ nếu nghiệm thu trễ hạn | Xác nhận với GVHD và Phòng KH-CN-ĐMST ngay; lịch ở mục 4 giả định hạn 31/10/2026 |
| D-2 | Mở lại triển khai Internet: VPS thuê hay máy tự host, domain, DNS provider hỗ trợ DNS-01, SMTP | Bắt buộc vì thuyết minh ghi "triển khai… trên Internet"; nên thuê VPS nhỏ để tránh CGNAT/IP động |
| D-3 | Xử lý ADR-0003..0005 | Hoặc chạy spike (tốn thời gian), hoặc ghi quyết định theo điều khoản dự phòng/tiêu chí loại đã đăng ký, kèm giới hạn. Chỉ nhóm được đổi trạng thái ADR |
| D-4 | Phạm vi module Quản trị hệ thống | Tối thiểu: suspend/unsuspend. Tùy chọn: SystemAdmin khởi tạo tenant hộ cho email Owner |
| D-5 | Web Push | Không bắt buộc; in-app + email đã là "đa kênh". Nếu bỏ thì ghi là giới hạn |
| D-6 | Phụ lục mở rộng (Silo + tùy biến) | Trình bày là phần mở rộng, không thay thế tiêu chí nghiệm thu gốc; hỏi ý kiến GVHD |
| D-7 | Thanh toán | Giữ Fake theo điều khoản dự phòng của ADR-0004, trừ khi D-2 xong sớm và có credential VNPay sandbox |

## 3. Checklist hoàn thiện

Mức ưu tiên: **P0** bắt buộc cho nghiệm thu; **P1** nên có; **P2** làm nếu còn thời gian.

### 3.1 Sản phẩm 2 — Đề xuất giải pháp kỹ thuật

- [ ] **NT-2.1 (P0)** SRS v0.3: bổ sung yêu cầu V9–V12 (G2-1); sửa mục 7; thêm cột trạng thái
      (`Đã hiện thực` / `Một phần` / `Ngoài phạm vi v1`) cho các yêu cầu ở G2-2.
- [ ] **NT-2.2 (P0)** Bảng đối chiếu thuyết minh → SRS → hiện thực → minh chứng cho từng mục 13.1,
      13.2 và 14.2; tách riêng phần mở rộng.
- [ ] **NT-2.3 (P1)** Cập nhật traceability matrix: thêm cột test (tên class/case) cho FR/SEC; cập nhật
      trạng thái implementation. Các dòng RQ cần số đo vẫn giữ `PENDING_DATA`.
- [ ] **NT-2.4 (P0)** ADR-0010 "Định tuyến tenant": so sánh subdomain, header và path theo bảo mật
      cookie host-only, ràng buộc host–token, DNS/TLS; ghi lý do chọn subdomain.
- [ ] **NT-2.5 (P0, sau D-3)** Cập nhật ADR-0003..0005 và `decision-log.md` theo quyết định nhóm.
- [ ] **NT-2.6 (P1, sau D-6)** Phụ lục protocol ba placement; sửa cách diễn đạt RQ2.
- [ ] **NT-2.7 (P1)** Giải thích ánh xạ quy tắc xóa board sang project role (G2-8) trong
      permission matrix.
- [ ] **NT-2.8 (P0)** Biên soạn sản phẩm 2 thành chương báo cáo (Word) từ các tài liệu trên.

**Hoàn tất khi:** mọi yêu cầu của thuyết minh có dòng đối chiếu; không còn yêu cầu SRS nào thiếu
trạng thái; ADR không còn mục chờ mà không ghi lý do.

### 3.2 Sản phẩm 3 — Đặc tả kiến trúc

- [ ] **NT-3.1 (P0)** ERD vật lý sinh từ control V6 + application V12, gồm cả hai plane và cách bố trí
      Schema/Silo; giữ ERD logic làm sơ đồ khái niệm và ghi rõ ánh xạ (G3-1).
- [ ] **NT-3.2 (P0)** Sửa `overview.md`: bảng ánh xạ module ↔ package (G3-2), connection budget khớp
      cấu hình (G3-3), checkpoint/trạng thái provisioning và tenant khớp mã (G3-4).
- [ ] **NT-3.3 (P1)** Thêm sequence #11 cho nhắc hạn và retry email (G3-5).
- [ ] **NT-3.4 (P0, sau NT-4.1)** Sơ đồ triển khai Internet (G3-6).
- [ ] **NT-3.5 (P1)** Bổ sung threat model cho môi trường Internet và luồng nhắc hạn (G3-7).
- [ ] **NT-3.6 (P0)** Xuất toàn bộ sơ đồ ra PNG/SVG, đánh số hình cho báo cáo (G3-8).
- [ ] **NT-3.7 (P1)** Cập nhật `docs/architecture/README.md` §"Trạng thái baseline".

**Hoàn tất khi:** mọi bảng/entity/trạng thái trong tài liệu khớp migration và enum hiện hành; có sơ đồ
triển khai của môi trường thật; mọi hình dùng được trong Word.

### 3.3 Sản phẩm 4 — Ứng dụng web

- [ ] **NT-4.1 (P0, sau D-2)** Triển khai Internet:
  - Caddyfile production (HTTPS, domain thật, wildcard TLS DNS-01);
  - Compose override production chỉ mở 80/443; DB, MinIO console, Grafana, Prometheus chỉ qua SSH tunnel;
  - endpoint công khai cho signed URL của MinIO;
  - `BASE_DOMAIN`/`PUBLIC_*`, SMTP thật, secret ngoài repo;
  - chạy smoke + Playwright trên URL công khai.
- [ ] **NT-4.2 (P0)** Bỏ `.localhost` viết cứng ở frontend (G4-2); lấy host từ backend hoặc biến
      môi trường build.
- [ ] **NT-4.3 (P0, sau D-4)** SystemAdmin suspend/unsuspend tenant: API, OpenAPI, UI, audit, test
      allow/deny. `TenantContextFilter` đã chặn tenant không `ACTIVE`. Tùy chọn: khởi tạo tenant hộ.
- [ ] **NT-4.4 (P0)** Chạy đủ regression trên máy có Docker (Docker Desktop + WSL integration hoặc CI):
      backend 106 test không skip, frontend, Playwright, hai smoke; lưu kết quả vào `docs/testing/`.
- [ ] **NT-4.5 (P1)** Rate limit đăng nhập/đăng ký theo IP + email (G4-5).
- [ ] **NT-4.6 (P1)** Thêm secret scan vào CI (G4-6).
- [ ] **NT-4.7 (P1)** Diễn tập backup/restore trên VPS cho control, Pool, Schema và Silo; ghi biên bản (G4-7).
- [ ] **NT-4.8 (P0 cho sản phẩm 5)** Công cụ thực nghiệm (G4-8):
  - seed 3–5 tenant với 10–20 user/tenant, dữ liệu tương đương;
  - cấp token cho k6 mà không ghi secret ra file;
  - thêm trường placement vào manifest;
  - tạo đủ tenant cho mỗi placement cần đo.
- [ ] **NT-4.9 (P0)** Đóng băng phiên bản: tag, image digest, release manifest; rehearsal từ clone sạch (OPS-01).
- [ ] **NT-4.10 (P0)** Minh chứng và bàn giao:
  - bộ ảnh màn hình theo 3 module (Quản trị hệ thống, Quản trị tenant, Thành viên) và 3 placement;
  - demo truy cập chéo bị từ chối;
  - URL công khai và tài khoản demo cho hội đồng;
  - hướng dẫn sử dụng, hướng dẫn quản trị và cài đặt.
- [ ] **NT-4.11 (P2)** Web Push VAPID (theo D-5), endpoint metric cho worker.

**Hoàn tất khi:** ứng dụng truy cập được qua HTTPS trên domain thật; regression đầy đủ không có test bị
skip; phiên bản đã đóng băng; có bộ minh chứng đính kèm được vào cuối quyển báo cáo.

## 4. Lịch đề xuất

Giả định hạn 31/10/2026 (D-1). Phân công gợi ý theo mục 15.2 của thuyết minh.

| Tuần | Thời gian | Sản phẩm 2 | Sản phẩm 3 | Sản phẩm 4 |
|---|---|---|---|---|
| 0 | 24–27/09 | Chốt D-1..D-7 | — | Thuê VPS/domain nếu D-2 = có; bật Docker cho WSL |
| 1 | 28/09–04/10 | NT-2.1, NT-2.2, NT-2.4 | NT-3.1, NT-3.2 | NT-4.2, NT-4.3, NT-4.5, NT-4.6; chuẩn bị cấu hình production |
| 2 | 05–11/10 | NT-2.3, NT-2.5, NT-2.7 | NT-3.3, NT-3.5 | NT-4.1, NT-4.7, NT-4.8 |
| 3 | 12–18/10 | NT-2.6, NT-2.8 | NT-3.4, NT-3.6, NT-3.7 | NT-4.4, NT-4.9, NT-4.10. Đây là cửa sổ đo của sản phẩm 5 |
| 4 | 19–25/10 | Sửa theo góp ý GVHD | Sửa theo góp ý | Sửa lỗi; NT-4.11 nếu còn thời gian |

Sau tuần 3 không thay đổi logic ứng dụng nếu thực nghiệm đang chạy trên phiên bản đã đóng băng.

## 5. Phụ thuộc với các sản phẩm khác

- Sản phẩm 5 (báo cáo kiểm thử) cần NT-4.1, NT-4.8 và NT-4.9 trước khi chạy pilot/experiment.
- Báo cáo tổng kết, bản tin, báo cáo tóm tắt và video dùng NT-2.8, NT-3.6 và NT-4.10. Video phải quay
  trên bản đã triển khai (NT-4.1).
- Sau mỗi mốc, cập nhật `docs/PROJECT_STATUS.md` và đánh dấu checklist này.
