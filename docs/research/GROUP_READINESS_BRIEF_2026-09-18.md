# Báo cáo sẵn sàng trước nghiên cứu

**Ngày chuẩn bị:** 2026-09-18 (UTC+7)  
**Đối tượng:** Nhóm nghiên cứu  
**Nhánh hiện tại:** `main`  
**HEAD hiện tại:** `22a9ee4`  
**Trạng thái quyết định đề xuất:** **GO cho báo cáo nhóm và pilot; NO-GO cho thu dữ liệu chính thức cho đến khi khóa protocol và phiên bản.**

## 1. Kết luận điều hành

Ứng dụng đã đạt mức **nguyên mẫu nghiên cứu hoàn thiện**: ba placement Pool, Schema-per-tenant và Silo cùng chạy trên một ứng dụng; các luồng nghiệp vụ chính, phân quyền, provisioning, tùy biến hữu hạn và quan sát hệ thống đã hiện hữu. Bản hiện tại đủ để trình diễn với nhóm, rà soát thiết kế nghiên cứu và chạy pilot.

Chưa được dùng các kiểm tra local để tuyên bố placement nào tối ưu. Protocol 0.1 ban đầu đăng ký baseline Pool/Silo; vì vậy phép so sánh chính thức cả ba placement phải có phụ lục protocol được nhóm duyệt trước khi chạy.

## 2. Phạm vi app có thể trình bày

| Nhóm chức năng | Trạng thái | Nội dung có thể demo |
|---|---|---|
| Danh tính và phiên | Sẵn sàng local | Đăng ký, đăng nhập, refresh an toàn, chọn workspace và chuyển đúng tenant host |
| Onboarding | Sẵn sàng local | Tách bạch gói, placement và capability; payment mô phỏng; provisioning có trạng thái và retry |
| Ba placement | Sẵn sàng local | Pool, Schema-per-tenant và Silo; giao diện giải thích biên dữ liệu và đánh đổi vận hành |
| Nghiệp vụ | Sẵn sàng local | Project, nhiều board, Kanban, task, priority, subtask, comment, hạn công việc và thành viên |
| Phân quyền | Sẵn sàng local | Owner/Admin/Manager/Member/Viewer, invariant Manager, invitation và chuyển ownership |
| Tùy biến | Sẵn sàng local | Branding, custom data, approval nhiều bước và automation hữu hạn |
| Tài nguyên và thông báo | Sẵn sàng local | File/link, quota, liên kết task, in-app/email; Web Push thật phụ thuộc VAPID |
| Quản trị hệ thống | Sẵn sàng local | Lọc tenant, payment/provisioning history, retry có guard và cleanup dead letter |

## 3. Bằng chứng kỹ thuật mới nhất

- API và web ở trạng thái `healthy`; worker đang chạy.
- `http://accounts.localhost:8080/login` trả HTTP 200.
- Application schema V10 đã được worker nâng thành công cho các tenant đang hoạt động thuộc Pool, Schema-per-tenant và Silo.
- Frontend lint, kiểm tra OpenAPI contract và production build đều đạt.
- 22/22 frontend test đạt khi chạy tuần tự theo hai nhóm.
- Integration test `ProjectAuthorizationIntegrationTest` đạt trên PostgreSQL Testcontainers với Flyway V1–V10.
- Priority của task và các bộ đếm subtask/comment trên Kanban là dữ liệu backend thật, không còn là số minh họa phía trình duyệt.

Đây là bằng chứng sẵn sàng kỹ thuật local, không phải dữ liệu kết quả nghiên cứu.

## 4. Kịch bản trình bày nhóm (12–15 phút)

1. **Mục tiêu (1 phút):** giới thiệu Bridge dùng chung control plane và mã nghiệp vụ, nhưng hỗ trợ ba placement dữ liệu.
2. **Đăng nhập và workspace (2 phút):** mở trang đăng nhập, chọn tenant và giải thích tenant host.
3. **Onboarding (3 phút):** chỉ ra gói khác placement; mở “Tùy chọn nâng cao” và so sánh Pool, Schema-per-tenant, Silo. Nhấn mạnh Pool là mặc định demo, không phải kết luận tối ưu.
4. **Nghiệp vụ (4 phút):** mở project và Kanban; tạo task có priority, subtask và comment; chuyển subtask sang cột hoàn tất để bộ đếm cập nhật.
5. **Phân quyền và tùy biến (2 phút):** trình bày vai trò project/tenant, approval hoặc automation và cơ chế capability.
6. **Bằng chứng vận hành (2 phút):** trình bày health, migration V10, test/build và bộ công cụ k6/manifest.
7. **Xin quyết định (1 phút):** chốt câu hỏi, workload, môi trường, metric, số lần lặp, pilot và ngày khóa phiên bản.

Không dùng số đo development, ảnh dashboard hoặc thời gian quan sát thủ công để kết luận hiệu năng trong buổi trình bày.

## 5. Giới hạn phải nói rõ

- Payment hiện là provider mô phỏng; email local dùng Mailpit; Web Push thật chưa được coi là đã gửi nếu thiếu VAPID.
- Môi trường hiện tại là local Compose với domain `.localhost`, chưa chứng minh vận hành Internet/VPS, TLS, backup/restore thực địa hoặc SLO production.
- Chưa tích hợp công cụ bên thứ ba và đây không phải điều kiện bắt buộc của nguyên mẫu nghiên cứu hiện tại.
- Chưa có số liệu thực nghiệm chính thức, pilot người dùng, SUS hoặc kết luận placement tối ưu.
- Không thu mật khẩu, token, dữ liệu học tập thật hoặc dữ liệu định danh không cần thiết trong nghiên cứu người dùng.

## 6. Các quyết định nhóm cần chốt

- [ ] Giữ bốn RQ hiện tại hay sửa trước khi khóa nghiên cứu.
- [ ] So sánh chính thức cả ba placement: Pool, Schema-per-tenant và Silo.
- [ ] Phê duyệt phụ lục protocol cho ba placement; không sửa hồi tố protocol 0.1.
- [ ] Chọn môi trường đo chính: VPS mục tiêu hay local kiểm soát. Nếu RQ4 giữ phạm vi VPS thì số đo local chỉ là development/pilot.
- [ ] Khóa workload, seed, số tenant, VU/rate, duration, warm-up và thứ tự chạy xen kẽ.
- [ ] Khóa metric chính: median, p95, throughput, error rate, CPU, RAM và connection count.
- [ ] Khóa số lần lặp sau pilot; tối thiểu ban đầu là ba lần cho mỗi tổ hợp scenario–placement–variant.
- [ ] Chốt có đánh giá người dùng hay không; nếu có, duyệt tuyển mẫu, đồng thuận, ẩn danh, bộ tác vụ và SUS trước khi thu dữ liệu.
- [ ] Chỉ định người duyệt QA và người có quyền loại một run theo tiêu chí đã đăng ký.
- [ ] Chốt ngày freeze, commit/tag và mã protocol cho đợt đo chính thức.

## 7. Cổng chuyển sang nghiên cứu

| Cổng | Điều kiện | Trạng thái hiện tại |
|---|---|---|
| Báo cáo nhóm | App chạy, demo được, giới hạn được công bố | **Đạt** |
| Khóa thiết kế | RQ, phụ lục ba placement, workload, metric và đạo đức được duyệt | **Chờ nhóm** |
| Khóa phiên bản | Working tree sạch; commit/tag, image digest và cấu hình được ghi vào manifest | **Chưa đạt — working tree hiện còn thay đổi** |
| Pilot | Chạy bằng `RUN_CLASS=pilot`; kiểm tra protocol và độ biến thiên; không dùng vào kết luận cuối | **Sẵn sàng sau khi khóa thiết kế** |
| Experiment | Protocol ID hợp lệ, working tree sạch và manifest đủ; run được QA chấp nhận | **Chưa được phép chạy** |

## 8. Hành động ngay sau cuộc họp

1. Ghi quyết định của nhóm vào `docs/research/decision-log.md` và thay đổi phạm vi vào `research-log.md`.
2. Viết phụ lục protocol ba placement với mã phiên bản riêng.
3. Hoàn tất review mã, commit/tag bản nghiên cứu và dựng image cố định; không thay đổi logic giữa các run.
4. Chuẩn bị tenant/token thử nghiệm bằng dữ liệu giả, không ghi secret vào repo hay manifest.
5. Chạy smoke rồi pilot; kiểm tra `manifest.json`, raw metric, resource metric và QA report.
6. Chỉ sau khi nhóm duyệt pilot mới tạo run `experiment`.

## 9. Tài liệu đối chiếu

- Trạng thái triển khai: [`../PROJECT_STATUS.md`](../PROJECT_STATUS.md)
- Giao thức nghiên cứu: [`protocol.md`](protocol.md)
- Hướng dẫn thực nghiệm: [`../../experiments/README.md`](../../experiments/README.md)
- Hướng dẫn chạy app: [`../RUN_APPLICATION.md`](../RUN_APPLICATION.md)
- Báo cáo kiểm chứng mở rộng: [`../testing/extension-local-2026-09-08.md`](../testing/extension-local-2026-09-08.md)

