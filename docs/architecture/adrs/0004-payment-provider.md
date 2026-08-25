# ADR-0004: Payment adapter với Fake mặc định; VNPay/Stripe chờ spike

- **Trạng thái:** Proposed
- **Ngày:** 2026-08-25
- **RQ/yêu cầu:** RQ2, RQ4; FR-70..74, SEC-14

## Bối cảnh

Đề tài cần chứng minh lifecycle payment→provisioning nhưng không giao dịch tiền thật. Credential sandbox phụ thuộc nhóm. VNPay công khai luồng Return URL, IPN và secret/checksum; Stripe có test mode và signed webhook. Chọn provider khi chưa có credential/test sẽ biến giả định thành kết quả.

## Quyết định tạm thời

Định nghĩa `PaymentProvider` trả kiểu canonical, không để domain phụ thuộc field provider:

```text
createSession(localPayment, returnUrl) -> PaymentSession
verifyCallback(rawHeaders, rawBody, receivedAt) -> VerifiedPaymentEvent | VerificationFailure
queryStatus(providerReference) -> ProviderPaymentStatus
```

- `FakePaymentProvider` là mặc định local/test, có fixture signed success/failure/duplicate/out-of-order; không bật ngoài profile explicit.
- Adapter VNPay và Stripe được đánh giá bằng cùng contract tests.
- Return URL chỉ hiển thị local status; chỉ callback/webhook verified hoặc server-side status reconciliation đổi payment state.
- Raw signature verification xảy ra trước parse/mutation theo yêu cầu provider. Domain đối chiếu ref, amount, currency và legal state; unique provider event/ref đảm bảo idempotency.

## Quy tắc chọn

Điều kiện bắt buộc: credential sandbox dùng được; tài liệu chính thức; chữ ký/checksum test được; fake/duplicate/out-of-order bị xử lý đúng; Java integration có thể duy trì. Chấm access/fit Việt Nam, security clarity, test tooling, docs và footprint. Nếu ngang điểm, ưu tiên VNPay theo kế hoạch.

## Xác minh và điều kiện Accepted

- Contract tests cho success/failure/cancel/expire, signature sai, amount/ref mismatch, duplicate, reorder và provider timeout.
- Chứng minh callback trùng chỉ tạo một provisioning job.
- Secret không xuất hiện trong code/log/fixture.
- ADR chỉ Accepted sau scorecard có credential thực; nếu chưa có, bàn giao Fake + adapter skeleton và ghi giới hạn.

