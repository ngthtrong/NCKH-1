# Ma trận truy vết nghiên cứu

Ma trận này là chỉ mục điều hành. Mã yêu cầu chi tiết nằm trong `srs.md`; mã kiểm thử sẽ được thay thế bằng liên kết tới test thật khi có. `PENDING_DATA` không phải thất bại: đó là rào chắn chống báo cáo kết quả chưa đo.

| RQ | Mệnh đề cần trả lời | Phương pháp | Dữ liệu/bằng chứng | Chỉ số/tiêu chí | Yêu cầu liên quan | Sản phẩm | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RQ1 | Nghiệp vụ Kanban tối thiểu cho nhóm đại học | Khảo sát tài liệu sản phẩm; phân tích use case; đánh giá người dùng | Ma trận MISA/Base/Jira; tác vụ; góp ý ẩn danh | Bao phủ tác vụ; tỷ lệ hoàn tất; SUS mô tả | FR-20..FR-63, UX-01..UX-04 | SRS, use case, UI, báo cáo người dùng | Thiết kế xong; dữ liệu người dùng `PENDING_DATA` |
| RQ1 | Mô hình tài khoản–tenant và quyền cần thiết | Khảo sát Base/KiotViet/Jira; threat modeling | Nguồn chính thức; ma trận quyền; test role | 100% hành động nhạy cảm có policy và test allow/deny | FR-01..FR-16, SEC-05 | Permission matrix, integration tests | Baseline tài liệu |
| RQ2 | Một mã nghiệp vụ chạy trên Pool và Silo | Thiết kế Bridge; contract test theo placement | ADR, code, test report Pool/Silo | Cùng endpoint/DTO/service; contract test đạt cả hai placement | ARC-01..ARC-07, DATA-01..DATA-05 | Kiến trúc, backend, OpenAPI | Kiến trúc baseline; code do pha D |
| RQ2 | Danh tính và tenant context thống nhất | Sequence review; test host–token–membership | JWT claims, request logs, test giả mạo | Mismatch bị chặn trước service; token cũ mất quyền sau revoke | SEC-01..SEC-09 | Auth middleware, test security | Thiết kế baseline |
| RQ2 | Onboarding/provisioning thống nhất | State-machine test; fault injection | ProvisioningJob, audit, retry trace | Không tài nguyên trùng; chỉ `ACTIVE` sau đủ bước | FR-70..FR-78, REL-01..REL-04 | Worker, migrations, runbook | Thiết kế baseline |
| RQ3 | Không truy cập chéo tenant | Ma trận adversarial test | JUnit/Testcontainers/Playwright report | 0 trường hợp đọc/ghi/xóa/tải/gửi chéo thành công | SEC-01..SEC-14 | Security test report | `PENDING_DATA` |
| RQ3 | Phân quyền đúng ở tenant và project | Test allow/deny theo ma trận | Test report theo role/action | 100% ô ma trận nhạy cảm có test | SEC-05, FR-10..16, FR-20..25 | Permission tests | `PENDING_DATA` |
| RQ3 | Hiệu năng, khả dụng và quan sát ở quy mô đã khóa | Pilot rồi load/stress lặp | k6 raw output, Prometheus export, log và manifest | p50/p95, throughput, error rate, CPU/RAM/connections; run truy vết được | PERF-01..PERF-05, REL-05, OBS-01..OBS-05 | Báo cáo thực nghiệm, dashboard | `PENDING_DATA`; SLO chưa khóa |
| RQ3 | Rate limit giảm noisy neighbor | Thí nghiệm paired trước/sau limiter | Dữ liệu tenant gây tải và tenant nạn nhân | Chênh p95/error của tenant nạn nhân | PERF-03..05 | Biểu đồ noisy-neighbor | `PENDING_DATA` |
| RQ4 | Cơ chế Pool phù hợp VPS | Spike ba ứng viên, bảng điểm có điều kiện loại | Latency/RAM/connections; test bypass | 0 leak bắt buộc; điểm trọng số còn lại | ARC-04, SEC-10..12 | ADR lựa chọn Pool | Protocol + guarded Project CRUD harness 3×2 đã có; guard-omission/số đo/quyết định `PENDING_DATA` |
| RQ4 | Storage phù hợp | Spike filesystem vs S3-compatible | Test namespace/quota/signed URL; footprint | 0 bypass; điểm bảo mật, vận hành, tài nguyên | FR-50..55, SEC-13 | ADR storage | Protocol/evidence gate đã đăng ký; kết quả `PENDING_DATA` |
| RQ4 | Payment sandbox phù hợp | Spike VNPay vs Stripe; adapter giả khi thiếu credential | Test chữ ký, callback trùng/sai thứ tự | Callback giả bị từ chối; idempotency đạt | FR-70..74, SEC-14 | ADR payment | Protocol đã đăng ký; credential/trọng số/kết quả `PENDING_DATA` |
| RQ4 | Connection budget phù hợp | Load/pilot với Hikari budget | Connection metric, timeout/error | Không vượt budget VPS đã khóa | PERF-04, REL-05 | Config + ADR/runbook | `PENDING_DATA` |
| RQ4 | Bộ triển khai có thể tái lập trên local/VPS | Clean-clone rehearsal; CI; backup/restore drill | CI logs, compose manifest, runbook và restore report | Một lệnh local; không secret thật; build/migration/restore đạt | OPS-01..OPS-05 | Compose, CI, runbook, handoff | Thiết kế baseline; bằng chứng chạy `PENDING_DATA` |

## Truy vết nguồn → yêu cầu

| Nguồn | Bằng chứng dùng được | Yêu cầu sinh ra |
| --- | --- | --- |
| AWS SaaS Lens | Tenant context là cấu trúc hạng nhất; cô lập mọi tầng; vận hành theo tenant; Bridge trộn Pool/Silo | ARC-01..07, SEC-01..04, OBS-01..05 |
| PostgreSQL Row Security | Owner, superuser và `BYPASSRLS` có đường bypass; `FORCE ROW LEVEL SECURITY` đưa owner vào chính sách | SEC-10..12, spike RLS |
| MISA AMIS Công Việc | Bảng Kanban, cột trạng thái, kéo thả, hạn việc và người thực hiện | FR-30..44 |
| Base Wework | Vai trò theo dự án khác vai trò quản trị ứng dụng | FR-20..25, SEC-05 |
| KiotViet | Một tài khoản có phạm vi ở nhiều chi nhánh, role theo phạm vi, revoke làm phiên quyền thay đổi | FR-10..16, SEC-08 |
| Jira Cloud | Role, permission scheme và notification scheme là các khái niệm tách biệt theo project/space | FR-20..25, FR-60..62 |
| Salesforce architecture | Shared schema cần định danh tenant/org trên từng bản ghi và enforcement tập trung | ARC-04, DATA-02, SEC-03 |
| VNPay Sandbox | Return URL khác IPN; callback có checksum và transaction reference | FR-70..74, SEC-14 |

## Quy tắc cập nhật

Một yêu cầu mới chỉ được đưa vào baseline khi có ít nhất một trong ba nguồn: (1) câu hỏi/phạm vi nghiên cứu; (2) bằng chứng khảo sát; (3) ADR giải quyết thuộc tính chất lượng. Khi mã yêu cầu đổi, cập nhật ma trận này và test mapping trong cùng thay đổi.
