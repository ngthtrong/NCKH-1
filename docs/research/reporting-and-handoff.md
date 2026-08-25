# Khung tổng hợp và bàn giao (Giai đoạn F)

Tài liệu này là checklist và khuôn báo cáo. Chưa có kết quả pilot, thí nghiệm tải, security test hoặc khảo sát người dùng; các ô tương ứng giữ `PENDING_DATA`.

## 1. Quy tắc tuyên bố

Mỗi kết luận trong báo cáo cuối gắn một nhãn:

- `MEASURED`: số liệu sinh từ run/test/survey có raw data và manifest.
- `INFERRED`: diễn giải hợp lý từ nhiều bằng chứng, ghi rõ suy luận và điều kiện.
- `LIMITATION`: giới hạn thiết kế, mẫu, công cụ hoặc khả năng khái quát.
- `PENDING_DATA`: chưa được phép kết luận.

Mẫu bảng trả lời RQ:

| RQ | Câu trả lời ngắn | Nhãn | Evidence IDs/run IDs | Độ chắc chắn | Giới hạn |
| --- | --- | --- | --- | --- | --- |
| RQ1 | `PENDING_DATA` | PENDING_DATA | SRS + product sources; chờ user study | Chưa đánh giá |  |
| RQ2 | `PENDING_DATA` | PENDING_DATA | ADR/code/test sau pha D | Chưa đánh giá |  |
| RQ3 | `PENDING_DATA` | PENDING_DATA | Security/load/provision reports | Chưa đánh giá |  |
| RQ4 | `PENDING_DATA` | PENDING_DATA | Spike scorecards + VPS pilot | Chưa đánh giá |  |

## 2. Cấu trúc báo cáo khoa học

1. Tóm tắt: vấn đề, phương pháp, kết quả đo chính, đóng góp và giới hạn; viết sau cùng.
2. Giới thiệu: bối cảnh, RQ, phạm vi và đóng góp.
3. Tổng quan: protocol, flow tìm kiếm, synthesis và research gap có mức độ.
4. Yêu cầu và threat model: traceability, role, attack surface.
5. Khung kiến trúc: C4, Bridge placement, tenant context, state machines và ADR.
6. Hiện thực: stack, migration, auth, provisioning, storage, notification, observability.
7. Thiết kế thực nghiệm: VPS, seed/workload, repetitions, metric, pilot và QA.
8. Kết quả: isolation/provisioning/function trước; performance/noisy-neighbor sau; user study tách riêng.
9. Thảo luận: trả lời từng RQ, trade-off, external validity, threats to validity.
10. Kết luận và hướng phát triển; không mở rộng hơn bằng chứng.

## 3. Báo cáo tóm tắt, bản tin và video

### Báo cáo tóm tắt

Tối đa nội dung theo biểu mẫu Đại học Cần Thơ: vấn đề → mục tiêu → phương pháp → kiến trúc → kết quả **đã đo** → sản phẩm → giới hạn. Không lấy cấu hình mục tiêu làm “kết quả”.

### Bản tin

- Tiêu đề dễ hiểu, không dùng “tuyệt đối an toàn” hoặc “hiệu năng cao” nếu thiếu benchmark.
- Một hình kiến trúc Bridge; một hình kết quả có trục/đơn vị/run ID.
- Nêu rõ đây là prototype nghiên cứu trong môi trường đại học, không phải SaaS thương mại đã chứng nhận.

### Kịch bản video tối đa hai phút

| Thời lượng | Nội dung | Minh chứng bắt buộc |
| --- | --- | --- |
| 0–20s | Vấn đề và RQ | Không cần số liệu |
| 20–45s | Bridge: control chung, Pool và Silo | C4/animation đúng kiến trúc |
| 45–90s | Demo cùng Kanban trên một Pool tenant và một Silo tenant | URL/tenant badge rõ, không lộ secret |
| 90–110s | Tấn công chéo bị từ chối; provisioning retry/idempotent; dashboard | Test/demo thật, không dựng response giả |
| 110–120s | Kết quả chính và giới hạn | Chỉ số lấy từ run đã duyệt |

## 4. Gói bàn giao

- Mã API/worker/web, lockfiles và OpenAPI.
- Control/pool/silo migrations; seed Pool/Silo; contract/security tests.
- Compose và `.env.example`; không có secret thật.
- k6 scenarios, raw results được chọn, manifest/checksum và notebook tái tạo hình.
- Protocol, search/screening register, source/BibTeX, SRS, ADR, C4/ERD/sequence/threat model.
- Runbook setup, backup/restore, migration Silo lỗi, incident cross-tenant và credential rotation.
- Dữ liệu user study chỉ ở dạng đã được phê duyệt/ẩn danh; consent không commit nếu chứa định danh.
- Báo cáo khoa học, tóm tắt, bản tin và video cuối.

## 5. Demo acceptance

1. Khởi động từ clone sạch bằng hướng dẫn, không secret thật.
2. Seed một tenant Pool và một tenant Silo.
3. Thực hiện cùng Project/Board/Task API trên cả hai.
4. Token tenant A trên host B và ID task B từ A đều bị chặn trước side effect.
5. Gửi callback/payment/job trùng và chứng minh chỉ một provisioning result.
6. Hiển thị dashboard/log có tenant/tier/placement/correlation nhưng không có token/nội dung nhạy cảm.
7. Tái tạo ít nhất một bảng và biểu đồ từ raw result bằng lệnh được tài liệu hóa.

## 6. Những phần bắt buộc do nhóm thực hiện

- Phê duyệt học thuật/đạo đức và chữ ký nghiệm thu.
- Tuyển người, đồng thuận và dữ liệu user study thật.
- Cấp VPS/domain/wildcard TLS, SMTP thật và payment sandbox credentials.
- Chạy pilot/thí nghiệm chính trên hạ tầng đã khóa và duyệt exclusion của run lỗi.
- Xác nhận ngày khóa literature search và sàng lọc hai người.

