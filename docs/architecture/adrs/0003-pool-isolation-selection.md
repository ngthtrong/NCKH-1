# ADR-0003: Chọn cơ chế cô lập Pool bằng spike, chưa chốt giải pháp thắng

- **Trạng thái:** Proposed
- **Ngày:** 2026-08-25
- **RQ/yêu cầu:** RQ3, RQ4; ARC-04, SEC-10..12

## Bối cảnh

Ba ứng viên có failure mode khác nhau: predicate tường minh dễ hiểu nhưng dễ bỏ sót; Hibernate tenant mechanism giảm lặp nhưng có escape hatches/native query; PostgreSQL RLS đưa policy xuống DB nhưng role/owner/session context cấu hình sai có thể bypass. Tài liệu PostgreSQL xác nhận superuser và `BYPASSRLS` luôn bypass, owner thường bypass nếu không `FORCE ROW LEVEL SECURITY`.

## Ứng viên và spike

Triển khai cùng `Project CRUD` với:

1. explicit tenant predicate trong repository;
2. Hibernate global tenant mechanism;
3. PostgreSQL RLS + application guard.

Mỗi ứng viên chạy Pool và Silo, Flyway, IDOR/list/search, native query, bulk update, background job, concurrent connection reuse và đo latency/RAM/connections. Với RLS, migration owner tách app role; app role non-owner/no BYPASSRLS; ENABLE+FORCE RLS; test owner/superuser làm negative control.

## Quy tắc quyết định

- Loại ngay ứng viên có bất kỳ cross-tenant read/write/delete thành công hoặc không thể test một escape hatch quan trọng.
- Chấm ứng viên còn lại theo trọng số đã khóa: chống bỏ sót/isolation 30%, testability 20%, performance/resource 20%, migration/ops 15%, complexity/maintainability 15%.
- Lưu raw data và rubric từng điểm. Nếu đồng điểm, chọn RLS + application guard theo kế hoạch.
- Trước khi spike hoàn tất, production code không được tuyên bố RLS/Hibernate/predicate là lựa chọn cuối.

## Hệ quả hiện tại

Schema và test được thiết kế tenant-aware để không khóa vào một ứng viên. Mọi business repository vẫn nhận tenant context qua infrastructure boundary; native/bulk escape hatch phải được đăng ký/review. ADR này chuyển `Accepted` hoặc được supersede chỉ khi có liên kết code spike, test report, raw measurement và scorecard.

