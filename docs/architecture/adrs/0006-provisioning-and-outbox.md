# ADR-0006: Provisioning saga/state machine và PostgreSQL outbox

- **Trạng thái:** Accepted
- **Ngày:** 2026-08-25
- **RQ/yêu cầu:** RQ2, RQ3; FR-73..78, DATA-05, REL-01..03

## Bối cảnh

Payment, tạo database/role, migration, route và provider notification không thể nằm trong một ACID transaction. Broker/distributed transaction không phù hợp VPS và phạm vi. Crash có thể xảy ra trước/sau side effect nên “retry toàn hàm” không an toàn.

## Quyết định

- Payment state và `ProvisioningJob` được ghi trong một control DB transaction sau callback đã verify.
- Worker poll PostgreSQL với lease/locking, checkpoint từng step và idempotency key.
- State machine hợp lệ: `QUEUED → RUNNING → SUCCEEDED`, nhánh `RETRYABLE_FAILED` hoặc `FAILED_ROLLED_BACK`; tenant chỉ Active sau `SUCCEEDED`.
- Mỗi external resource có deterministic/recorded reference và ownership marker.
- Compensating rollback chỉ xóa tài nguyên do job tạo và chưa chứa user data; trường hợp không chắc chắn chuyển manual intervention, không cleanup mù.
- Business mutation và application `OUTBOX_EVENT` cùng local transaction. Delivery at-least-once; handlers/provider calls dedupe theo event/delivery key.
- Application outbox poller quét pooled DB và active Silo databases theo round-robin/bounded concurrency từ placement registry; không mở thường trực một connection pool cho mọi Silo.
- Không RabbitMQ/Kafka/distributed transaction trong v1.

## Hệ quả

Tích cực: phục hồi crash, audit và tái lập failure rõ. Tiêu cực: eventual consistency, state/retry code phức tạp, cần dọn event/job terminal theo retention.

## Xác minh

- Fault injection sau mỗi checkpoint, kể cả crash sau external success trước DB update.
- Concurrent duplicate callback/retry chỉ tạo một placement/route/job.
- Out-of-order/terminal events không quay ngược trạng thái.
- Migration fail không Active; rollback ownership adversarial test.
- Outbox lag/attempt/terminal failure có metric và runbook.
