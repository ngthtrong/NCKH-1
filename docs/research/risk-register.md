# Danh mục rủi ro

Thang xác suất và tác động: 1 (thấp) đến 5 (rất cao). Mức `P×I` dùng ưu tiên, không phải xác suất định lượng.

| ID | Rủi ro | P | I | Mức | Dấu hiệu sớm | Giảm thiểu/phòng ngừa | Ứng phó | Chủ sở hữu | Trạng thái |
| --- | --- | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| R-01 | Rò rỉ dữ liệu chéo tenant do bỏ sót context/filter | 3 | 5 | 15 | Native query hoặc job không có tenant | Defense in depth; test IDOR/native/bulk/job; review query | Dừng release, cô lập môi trường, audit phạm vi, sửa và regression test | Security/backend | Open |
| R-02 | Role DB owner/`BYPASSRLS` vô hiệu RLS | 3 | 5 | 15 | Test chạy bằng owner; policy pass giả | App role không owner; `FORCE RLS`; test đặc quyền riêng | Thu hồi role, rotate credential, kiểm tra audit | DBA/security | Open |
| R-03 | Silo connection pools làm cạn connection VPS | 4 | 4 | 16 | Connection count tăng theo tenant; timeout | Budget control=5, pool=10, silo≤2; idle eviction; global cap=25 ban đầu | Từ chối/queue activation, đóng idle pool, hiệu chỉnh sau pilot | Backend/ops | Open |
| R-04 | Migration Silo lệch phiên bản | 3 | 4 | 12 | Health check cho schema version khác nhau | Migration registry; test upgrade nhiều phiên bản; tenant không Active khi fail | Retry/rollback, cô lập tenant lỗi, runbook restore | Backend/ops | Open |
| R-05 | Callback thanh toán giả/trùng kích hoạt provisioning | 3 | 5 | 15 | Hai job cùng transaction; mismatch signature | Verify server-side; unique provider event/ref; idempotency key | Suspend tenant/job, audit, reconcile provider | Payment/backend | Open |
| R-06 | Provisioning nửa chừng để lại database/role | 4 | 4 | 16 | Job timeout sau create DB | State machine checkpoint, compensating action, least privilege | Rollback có audit; đánh dấu manual intervention khi không an toàn | Worker/DBA | Open |
| R-07 | Object key/signed URL làm lộ tệp tenant khác | 3 | 5 | 15 | API nhận key trực tiếp hoặc prefix thiếu tenant | Namespace server-side; authorize metadata; TTL ngắn; test key tampering | Revoke URL/rotate key, audit downloads | Backend/security | Open |
| R-08 | Noisy neighbor làm sai đánh giá Pool/Silo | 4 | 4 | 16 | Workload không cân hoặc background task chen vào | Seed/workload cố định; paired runs; theo dõi victim và aggressor | Loại run nhiễu có lý do; chạy lại từ manifest | Research/performance | Open |
| R-09 | Kết quả không tái lập vì thiếu manifest/raw data | 3 | 4 | 12 | Chỉ có screenshot/summary | Run ID, version, seed, raw exports, checksum | Không dùng kết quả trong báo cáo cho đến khi chạy lại | Research | Open |
| R-10 | Dữ liệu người tham gia có thể tái định danh | 2 | 5 | 10 | Email/tên/nội dung thật trong export | Consent; pseudonym; data minimization; access control | Xóa khỏi repo/lịch sử theo quy trình; báo chủ nhiệm | Research lead | Open |
| R-11 | Thiếu 30–60 người tham gia | 4 | 3 | 12 | Tuyển chậm, bỏ dở cao | Tuyển theo nhóm học sẵn có; lịch dự phòng | Báo cỡ mẫu thật và giới hạn; không bù dữ liệu giả | Research lead | Open |
| R-12 | Credential sandbox/VPS/domain đến trễ | 4 | 3 | 12 | Chưa có trước integration gate | Fake adapters, local domains, Mailpit/MinIO | Hoàn tất contract tests; ghi rõ phần tích hợp chờ ngoại lực | Project lead | Open |
| R-13 | Scope creep sang microservices/realtime/mobile | 3 | 3 | 9 | Yêu cầu không truy về RQ/SRS | Change control; phạm vi khóa; modular monolith | Hoãn vào future work | Project lead | Open |
| R-14 | Nguồn học thuật metadata sai/yếu | 3 | 4 | 12 | DOI không resolve; trang/năm mâu thuẫn | DOI/publisher verification; register trạng thái | Loại/giảm trọng số; ghi correction log | Research | Open |
| R-15 | Secrets xuất hiện trong git/log/fixture | 3 | 5 | 15 | Scanner báo; log chứa token/hash secret | `.env.example`; secret scan; redaction; short-lived credentials | Revoke/rotate ngay; purge theo quy trình được duyệt | Tất cả | Open |

## Rà soát

Rà soát tại mỗi cổng nghiệm thu và trước mỗi thí nghiệm chính. Một rủi ro chỉ chuyển `Closed` khi có liên kết bằng chứng; “đã viết biện pháp” không đồng nghĩa đã giảm thiểu thành công.

