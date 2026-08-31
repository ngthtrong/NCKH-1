# Biên bản chuẩn bị P2 — 2026-08-31, lượt 2

## Phạm vi

Biên bản này tiếp tục từ `p2-preparation-2026-08-31.md` và dựng lát cắt mã đầu tiên cho P2 không cần
credential ngoài: cùng một Project CRUD security contract cho ba ứng viên isolation trên Pool và
database-only Silo.

Đây vẫn là kiểm tra chức năng/security local, không phải lượt đo. Không có latency, RAM, connection,
throughput, score, raw research result hoặc dữ liệu giả nào được tạo. ADR-0003 vẫn `Proposed`; Cổng B/E
chưa đạt.

## Harness đã dựng

`experiments/spikes/isolation-harness/` là Maven project độc lập, không tham gia `apps/api` và không làm
tăng tổng 58 backend test. Harness dùng PostgreSQL 18 Testcontainer và tạo topology riêng cho từng ứng
viên:

- một physical database Pool chứa đồng thời tenant A và tenant B;
- hai physical database Silo, mỗi database chứa đúng một tenant;
- runtime role riêng, không phải superuser và không có `BYPASSRLS`;
- table owner/migrator tách khỏi runtime role.

Ba implementation dùng cùng interface Project CRUD:

1. explicit tenant predicate trên mọi lookup/mutation;
2. Hibernate `@Filter`, cộng predicate tường minh cho native query và bulk mutation là escape hatch;
3. PostgreSQL RLS `ENABLE` + `FORCE` cùng application predicate; native count không có predicate để xác
   nhận runtime RLS thực sự giới hạn theo transaction-local tenant context.

Matrix kiểm tra create/list/read/update/delete, known foreign ID, native count, bulk mutation,
background-job mutation, chuyển tenant/context, role đặc quyền và đường CRUD hợp lệ. RLS còn có hai
negative control: table owner của bảng không `FORCE RLS` thấy cả hai tenant như PostgreSQL mô tả, còn
superuser bypass được bảng có `FORCE RLS`; đồng thời table owner không phải superuser bị `FORCE RLS`
giới hạn khi thiếu tenant context.

## Kết quả cuối

| Kiểm tra | Kết quả |
| --- | --- |
| Isolation harness compile | Pass trên Java target 21 |
| Security matrix | 1 suite, 6/6 pass, 0 failure, 0 error, 0 skip |
| Candidate/placement | explicit, Hibernate filter, RLS × Pool, Silo database |
| PostgreSQL | Testcontainer PostgreSQL 18.6 thật |
| Backend baseline | Report hiện hữu vẫn đúng 17 suite, 58/58, 0 failure/error/skip; harness nằm ngoài module backend |
| Infra/Python | 6/6 test pass; 3 protocol P2 hợp lệ và payment tiếp tục báo blocker |
| Frontend unit | 3 file, đúng 5/5 pass |
| Playwright | Discovery đúng 2 case; runtime 2/2 pass bằng Chromium thật trên stack local |
| Repository hygiene | Build output nằm trong `experiments/spikes/isolation-harness/target/` bị ignore |

Lượt đầu có 2 lỗi ở hai row Hibernate vì harness yêu cầu Hibernate dựng `java.lang.Number` từ scalar
`count(*)`. Native query được sửa để đọc scalar không typed rồi ép `Number`; lượt chạy sạch sau sửa đạt
6/6. Đây là lỗi của mã harness, không phải kết quả loại Hibernate.

Lệnh chạy:

```bash
scripts/run-p2-isolation-security.sh
```

## Ranh giới kết luận và bước tiếp theo

- Kết quả 6/6 chỉ chứng minh ba implementation **khi các guard đã được áp dụng đúng** chạy cùng contract
  trên topology local. Nó chưa chứng minh mức chống bỏ sót guard của explicit predicate/Hibernate.
- Trước khi chấm isolation, cần bổ sung adversarial mutation cố ý bỏ predicate/filter ở native, bulk và
  background path; report phải phân biệt negative-control leak kỳ vọng với cross-tenant leak của candidate.
- Chưa có case-level evidence manifest/checksum từ commit sạch, chưa đủ ba replicate và chưa đo
  latency/RAM/connection. Không đưa thời gian Maven/Testcontainer vào dữ liệu nghiên cứu.
- Storage harness/payment sandbox vẫn còn; payment tiếp tục chờ credential và trọng số được nhóm duyệt.
- Không khôi phục hai file resource bị xóa, không tạo `draft.md`, không ghi file kết quả vào
  `experiments/results` hoặc `experiments/derived`.
