# Sổ quyết định

## Quyết định kiến trúc

| ADR | Tóm tắt | Trạng thái | Bằng chứng cần bổ sung |
| --- | --- | --- | --- |
| [ADR-0001](../architecture/adrs/0001-modular-monolith-stack.md) | Modular monolith Spring/React, API và worker tách process | Accepted | Profiling VPS khi pilot |
| [ADR-0002](../architecture/adrs/0002-bridge-placement.md) | Control plane chung; application plane Pool hoặc database Silo | Accepted | Contract test cả hai placement |
| [ADR-0003](../architecture/adrs/0003-pool-isolation-selection.md) | Chọn cơ chế cô lập Pool bằng spike, chưa chốt RLS/ORM/predicate | Proposed | Mã spike và raw measurements |
| [ADR-0004](../architecture/adrs/0004-payment-provider.md) | Adapter payment; fake mặc định local; VNPay/Stripe chờ spike | Proposed | Credential sandbox và test signature |
| [ADR-0005](../architecture/adrs/0005-resource-storage.md) | Adapter storage; MinIO là mặc định có điều kiện | Proposed | Spike filesystem/MinIO |
| [ADR-0006](../architecture/adrs/0006-provisioning-and-outbox.md) | Saga/state machine + PostgreSQL outbox, không broker/distributed TX | Accepted | Fault-injection test |
| [ADR-0007](../architecture/adrs/0007-tenant-bound-session.md) | Host, token, tenant status và membership cùng tham gia authorization | Accepted | Security matrix test |

## Câu hỏi đang mở

| ID | Câu hỏi | Chủ sở hữu | Điều kiện đóng |
| --- | --- | --- | --- |
| DQ-01 | Cơ chế Pool nào thắng? | Nhóm backend/research | Ba ứng viên chạy cùng spike; không leak; bảng điểm và ADR Accepted |
| DQ-02 | VNPay hay Stripe cho demo sandbox? | Nhóm tích hợp | Có credential, callback xác minh server-side, duplicate/fake test, bảng điểm |
| DQ-03 | MinIO hay filesystem kiểm soát? | Nhóm backend/ops | Namespace, quota, URL thời hạn, backup và footprint được đo |
| DQ-04 | SLO p95/error/throughput là bao nhiêu? | Nhóm thực nghiệm | Pilot trên đúng VPS, workload và seed được khóa |
| DQ-05 | Ngày khóa systematic mapping? | Chủ nhiệm nghiên cứu | Nhóm xác nhận trước lượt tìm kiếm cuối |

## Quy tắc

- `Accepted` biểu thị quyết định triển khai, không biểu thị hiệu quả đã được chứng minh.
- Quyết định cần dữ liệu không được chuyển `Accepted` nếu thiếu raw data hoặc test report.
- Đổi quyết định Accepted bằng ADR mới, không sửa ngược lịch sử.

