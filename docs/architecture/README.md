# Đặc tả kiến trúc

| Tài liệu | Nội dung |
| --- | --- |
| [overview.md](overview.md) | Baseline kiến trúc, data flow, hợp đồng, failure handling |
| [c4.md](c4.md) | C4 Context, Container và Component bằng Mermaid |
| [erd.md](erd.md) | ERD control, pooled và silo database |
| [sequences.md](sequences.md) | Login/switch, payment/provisioning, routing, storage, notification |
| [threat-model.md](threat-model.md) | Trust boundaries, STRIDE, abuse cases và verification |
| [adrs/](adrs/) | Architecture Decision Records |

## Trạng thái baseline

- Đã chấp nhận modular monolith, hai process API/worker và Bridge placement.
- Chưa chấp nhận cơ chế isolation Pool, payment provider thật và storage backend; các mục này phải qua spike.
- Sơ đồ mô tả thiết kế cần hiện thực/kiểm chứng, không phải bằng chứng hệ thống đã chạy.

