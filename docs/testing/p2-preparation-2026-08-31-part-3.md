# Biên bản chuẩn bị P2 — 2026-08-31, lượt 3

## Phạm vi

Biên bản này tiếp tục từ `p2-preparation-2026-08-31-part-2.md`, bổ sung adversarial guard-omission
matrix cho Project CRUD isolation harness và sửa evidence gate để biểu diễn ứng viên bị loại mà không
biến security failure thành `PASS`.

Không có latency, RAM, connection, throughput, score hoặc raw research result nào được tạo. Không có
credential VNPay/Stripe/VAPID được cung cấp. ADR-0003 vẫn `Proposed`; Cổng B và E chưa đạt.

## Guard-omission matrix

Sau guarded contract, harness cố ý bỏ application predicate/filter ở ba đường:

- native query đọc count;
- bulk update;
- background-job mutation.

Mỗi đường chạy cho explicit predicate, Hibernate filter và PostgreSQL RLS trên Pool và database-only
Silo. Surefire vẫn có 6 dynamic test theo candidate/placement, nhưng chứa đúng 18 dòng
`GUARD_OMISSION` có outcome riêng. Test pass xác nhận harness quan sát và phân loại đúng hành vi; outcome
`CANDIDATE_CROSS_TENANT_LEAK` vẫn là security failure của candidate.

| Candidate/placement | Native | Bulk | Background | Kết luận local |
| --- | --- | --- | --- | --- |
| Explicit predicate / Pool | Leak | Leak | Leak | Vi phạm điều kiện bắt buộc khi guard bị bỏ sót |
| Hibernate filter / Pool | Leak | Leak | Leak | Vi phạm điều kiện bắt buộc khi filter/escape-hatch guard bị bỏ sót |
| PostgreSQL RLS / Pool | Protected | Protected | Protected | Database policy chặn ba application-guard omission |
| Ba candidate / Silo | Protected | Protected | Protected | 9/9 được physical database boundary bảo vệ; không chứng minh cơ chế Pool |

Lượt có thẩm quyền chạy `scripts/run-p2-isolation-security.sh` trên commit sạch `2b430b7`, PostgreSQL
18.6 thật: 1 suite, 6/6 pass, 0 failure/error/skip; 18 observation gồm 6 candidate leak, 3 Pool database
guard protected và 9 Silo database boundary protected.

Theo `eliminate_if=any-cross-tenant-read-write-delete-succeeds` đã đăng ký trước, explicit predicate và
Hibernate có hành vi loại ở Pool trong technical screening này. Chưa tạo hồ sơ loại chính thức vì chưa
có `elimination.json` cùng artifact checksum được review. Không dùng thời gian Maven/Testcontainers làm
số đo và chưa tuyên bố RLS là quyết định Accepted.

## Sửa evidence gate

Validator cũ chỉ nhận measured manifest có mọi mandatory case `PASS` và đòi replicate cho mọi candidate.
Do đó một candidate bị loại đúng protocol lại làm `--require-complete` bất khả thi. Gate nay có schema
`spike-elimination.schema.json` và quy tắc riêng:

- `status=eliminated`, candidate/placement và reason phải thuộc plan;
- mỗi reason phải được plan ánh xạ trước tới các mandatory case có thể kích hoạt reason đó; một `FAIL`
  không liên quan không thể hợp thức hóa lý do loại;
- nguồn phải là commit sạch, môi trường phải đầy đủ;
- mọi mandatory case phải có mặt, chỉ nhận `PASS`/`FAIL` và bắt buộc ít nhất một mandatory `FAIL`;
- security/contract report cùng environment manifest phải tồn tại, không rỗng và khớp SHA-256;
- Git commit phải là object ID đầy đủ; artifact kind/path không được trùng hoặc nằm ngoài plan;
- mỗi candidate chỉ có tối đa một hồ sơ loại hợp lệ;
- `--require-complete` chỉ bỏ yêu cầu measurement/replicate cho candidate có hồ sơ loại hợp lệ; các
  candidate còn lại vẫn phải đủ Pool/Silo và số replicate đăng ký; nếu tất cả candidate bị loại thì
  gate fail vì không còn quyết định khả thi.

Ba plan ghi rõ `elimination_artifact_kinds`. Không có elimination/evidence fixture nào được ghi vào
`experiments/results`; unit test chỉ dùng dữ liệu `SYNTHETIC ... TEST ONLY` trong thư mục tạm.

## Kết quả xác minh cuối

| Kiểm tra | Kết quả |
| --- | --- |
| Isolation harness trên commit sạch | 1 suite, 6/6 pass; đúng 18 guard-omission observation trên PostgreSQL 18.6 |
| Guard-omission outcome | 6 candidate leak, 3 Pool RLS protected, 9 Silo physical-boundary protected |
| Backend clean baseline | 17 suite, 58/58 pass, 0 failure/error/skip; giữ đủ 56 checkpoint và 53 nền |
| Evidence/analyzer unit | 8/8 pass: 3 analyzer nền + 5 evidence gate |
| P2 plan validation | 3/3 plan hợp lệ; payment vẫn báo 5 blocker trọng số và 1 blocker credential |
| Frontend API/lint/unit/build | Pass; đúng 3 file và 5/5 unit; Vite 7.3.6 build 11.761 module |
| Playwright discovery/runtime | Đúng 2 case trong 1 file; Chromium thật pass 2/2, Pool 17,0 giây, Silo 15,5 giây, tổng 33,7 giây |
| Repository hygiene trước cập nhật biên bản | Commit `2b430b7` sạch; `git diff --check` pass; không tạo measured result |

Backend, isolation harness và Playwright cần Docker/Chromium ngoài filesystem sandbox. Lượt isolation
đầu trong sandbox không thấy Docker và lượt Playwright đầu tìm sai browser cache; cả hai lỗi xảy ra trước
test logic và không được dùng làm bằng chứng. Các lượt cuối dùng Docker thật và cache Chromium `/tmp`.

Lượt tiếp tục cùng ngày chạy lại isolation harness ngoài sandbox và vẫn đạt 6/6 với đúng 18 observation.
Evidence gate được siết thêm mapping `elimination_triggers`; 8/8 Python test vẫn pass. Không tạo hồ sơ
loại chính thức trong working tree bẩn và không tạo số đo từ lần chạy kỹ thuật này.

## Ranh giới và bước tiếp theo

- Review technical screening rồi tạo hồ sơ loại checksum-backed từ một commit sạch; không điền case
  `PASS` cho đường đã leak.
- Chỉ đo candidate còn lại khi workload/environment fingerprint được khóa; lưu raw metrics thật và đủ
  ba replicate theo protocol đã duyệt.
- Storage spike vẫn chưa chạy. Payment vẫn chờ credential sandbox và phê duyệt trọng số.
- Không khôi phục `resource/important.md` hoặc `resource/thuyet_minh_SaaS.md`; không tạo `draft.md`.
