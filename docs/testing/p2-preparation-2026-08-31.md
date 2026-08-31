# Biên bản chuẩn bị P2 — 2026-08-31

## Phạm vi

Biên bản này tiếp tục từ `p1-verification-2026-08-31-part-2.md`. Khi bắt đầu, `main` và
`origin/main` cùng ở commit `71b8092` (`complete P1 local hardening`) và working tree sạch. Không có
credential VNPay/Stripe/VAPID được cung cấp; local chỉ khai báo `PAYMENT_PROVIDER=fake`. Vì vậy lượt này
không tự tạo payment adapter thật, không diễn tập worker container khi recovery mức process/Testcontainer
đã đủ cho nhu cầu hiện tại, mà chuẩn bị fail-closed evidence gate cho P2.

Đây không phải spike đã chạy và không chứa số đo nghiên cứu. Không có raw result, DOI, SUS, dữ liệu khảo
sát hoặc kết quả giả nào được tạo. Cổng B và E vẫn chưa đạt.

## Protocol P2 đã đăng ký trước

Ba plan JSON tại `experiments/spikes/plans/` cố định trước các trường cần có:

- isolation: explicit predicate, Hibernate global tenant mechanism và PostgreSQL RLS + application
  guard; cùng chạy Pool/Silo, tối thiểu ba lượt, có native query, bulk update, background job,
  connection reuse và negative control đặc quyền;
- storage: filesystem và MinIO trên Pool/Silo, tối thiểu ba lượt, có namespace, traversal, signed URL,
  concurrent quota, delete retry và backup/restore;
- payment: VNPay Sandbox và Stripe Test Mode theo cùng contract. Credential gate và trọng số provider
  vẫn là `PENDING_DATA`, bắt buộc nhóm phê duyệt trước run đầu tiên.

Plan isolation/storage dùng đúng trọng số đã khóa trong ADR-0003/0005. Không có điểm ứng viên hoặc kết
quả thắng được điền trước.

## Evidence gate

`experiments/analysis/validate_spike_evidence.py` và `scripts/validate-p2-spikes.sh` kiểm tra:

- plan hợp lệ, ID/candidate/case/artifact không trùng, trọng số đầy đủ phải cộng đúng 100%;
- manifest quyết định chỉ nhận `data_kind=measured_spike`, trạng thái thành công, commit sạch và thông
  tin môi trường đầy đủ;
- mọi artifact phải tồn tại, không rỗng, nằm trong run directory và khớp SHA-256;
- mọi case bắt buộc phải là `PASS`; không thể dùng `NOT_APPLICABLE` để bỏ qua security contract;
- toàn bộ candidate/placement dùng cùng comparison group, workload fingerprint và environment
  fingerprint, có số thứ tự replicate và đủ số lượt đã đăng ký;
- payment evidence phải ghi `credential_backed=true`.

Chế độ `--require-complete` còn từ chối quyết định khi plan có blocker. Việc validator pass chỉ chứng
minh cấu trúc evidence đủ theo protocol; nhóm vẫn phải review raw artifact, tính score và chấp nhận ADR
thủ công. Không có lệnh nào tự đánh dấu Cổng B.

Hai JSON Schema mô tả protocol/evidence được thêm vào `experiments/schemas/`. Unit test chỉ tạo fixture
tổng hợp có nhãn `SYNTHETIC ... TEST ONLY` trong thư mục tạm của hệ điều hành, không ghi vào
`experiments/results/`.

## Kết quả xác minh cuối

| Kiểm tra | Kết quả |
| --- | --- |
| P2 protocol validator | 3/3 plan hợp lệ; payment báo đúng 6 blocker gồm 5 trọng số và credential sandbox |
| Python/infra validation | 6/6 test pass: giữ 3 analyzer test nền và thêm 3 evidence-gate test |
| Backend clean test | 17 suite, 58/58 pass, 0 failure, 0 error, 0 skip trên PostgreSQL 18.6 thật; giữ đủ 56 test checkpoint trước và 53 test nền |
| OpenAPI generated check | Pass, không drift |
| Frontend lint/TypeScript | Pass |
| Frontend unit | 3 file, 5/5 pass |
| Frontend production build | Pass với Vite 7.3.6, 11.761 module |
| Playwright discovery | Đúng 2 test trong 1 file: Pool và Silo |
| Playwright runtime | 2/2 pass bằng Chromium thật trên stack Compose local; Pool 18,0 giây, Silo 15,1 giây, tổng 34,0 giây |
| Repository hygiene | `git diff --check` pass; không tạo file trong results/derived |

Backend và Playwright ban đầu không thể dùng Docker/Chromium bên trong filesystem sandbox. Các lượt đó
không được dùng làm bằng chứng; lượt backend ngoài sandbox chạy đủ Testcontainers và lượt Playwright
ngoài sandbox dùng browser cache `/tmp` là kết quả trong bảng.

## Ranh giới kết luận và bước tiếp theo

- Đây mới là protocol/evidence gate, chưa phải mã harness cho ba isolation candidate và chưa có run đo.
- Viết cùng Project CRUD harness cho ba candidate, chạy security matrix trước; bất kỳ leak nào loại
  candidate trước khi chấm hiệu năng.
- Chỉ chạy footprint/latency/connections với cùng fingerprint, commit sạch và raw artifact thật. Không
  dùng thời gian test trong biên bản này làm số đo spike.
- Payment vẫn chờ credential sandbox và nhóm khóa trọng số; Web Push/SMTP ngoài local vẫn chờ cấu hình.
- ADR-0003..0005 tiếp tục `Proposed`; Cổng B/E tiếp tục chưa đạt.

Không khôi phục `resource/important.md` hoặc `resource/thuyet_minh_SaaS.md`; không tạo hoặc ghi
`draft.md`.
