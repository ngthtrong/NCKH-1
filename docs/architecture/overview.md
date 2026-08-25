# Tổng quan kiến trúc Bridge

## 1. Mục tiêu chất lượng

Thứ tự ưu tiên:

1. Không truy cập chéo tenant ở API, database, storage, notification hoặc job nền.
2. Một contract nghiệp vụ chạy giống nhau trên Pool và database-per-tenant Silo.
3. Provisioning có thể retry/rollback và không tạo tài nguyên trùng.
4. Hệ thống quan sát được theo tenant trên một VPS có connection/resource budget hữu hạn.
5. Mã có thể sửa đổi và môi trường/thí nghiệm có thể tái lập.

## 2. Bối cảnh và ranh giới

Hệ thống là modular monolith triển khai thành hai process dùng chung modules:

- **API process:** phục vụ REST/UI, xác thực, authorization và business transaction. Credential không có quyền tạo/drop database/role.
- **Worker process:** poll outbox/job, gửi notification và thực hiện provisioning bằng credential đặc quyền riêng; quyền được tách theo adapter/job.

Control plane dùng `control_db`; application plane dùng `pooled_db` cho tenant `POOL` hoặc `tenant_<opaque-id>` cho tenant `SILO_DATABASE`. Compute, identity, object storage, reverse proxy và observability vẫn dùng chung; do đó Silo trong đề tài là database-only, không phải full-stack isolation.

## 3. Module và dependency rule

| Module | Trách nhiệm | Được phụ thuộc |
| --- | --- | --- |
| `identity` | Account login, password/session/token family, transfer code | control persistence, security primitives |
| `tenancy` | Tenant, membership, tier, route, context resolution | identity contracts, control persistence |
| `billing` | Payment transaction và `PaymentProvider` | tenancy contracts, outbox |
| `provisioning` | State machine, placement executor, migration, rollback | tenancy, datasource registry, audit |
| `work` | Project/board/column/task/comment | tenant application persistence, events |
| `resource` | Metadata, quota, task link, `ResourceStorage` | work authorization, tenant context |
| `notification` | Preference, in-app/email/Web Push dispatch | outbox, provider adapters |
| `audit` | Append-only security/business audit | tenant context; không gọi ngược business module |
| `observability` | MDC/log/metrics/tracing helpers | tenant context đã sanitize |

Controller chỉ gọi application service. Business module phụ thuộc interface (`TenantDataSourceResolver`, `PaymentProvider`, `ResourceStorage`, `NotificationDispatcher`), không phụ thuộc implementation infrastructure trực tiếp. Không module nào đọc tenant ID từ DTO để chọn datasource.

## 4. Hợp đồng lõi

```text
TenantContext {
  userId: UUID
  tenantId: UUID
  tier: String
  placement: POOL | SILO_DATABASE
  tenantRole: OWNER | ADMIN | MEMBER
  subdomain: String
  membershipVersion: long
  requestId: String
  correlationId: String
}

TenantDataSourceResolver.resolve(TenantContext) -> TenantDataAccess
PaymentProvider.createSession(...), verifyCallback(rawRequest), queryStatus(...)
ProvisioningService.enqueue(idempotencyKey, tenantId), retry(jobId)
ResourceStorage.put(namespace, ...), getSignedUrl(namespace, key, ttl), delete(...)
NotificationDispatcher.dispatch(TenantEvent)
TenantEvent { eventId, tenantId, actorId, type, version, occurredAt, correlationId, payloadRef }
```

`TenantContext` là immutable trong request/job. Project role nhạy cảm được lấy từ application database sau khi datasource tenant đã được chọn; token chỉ có thể chứa hint, không thay thế kiểm tra membership/policy.

## 5. Request resolution và authorization

Thứ tự bắt buộc trước business service:

1. Reverse proxy giữ `Host`, đặt request ID đáng tin cậy và không cho client ghi đè trusted forwarding headers.
2. `TenantRouteResolver` chuẩn hóa subdomain và tìm tenant route ở control DB/cache có invalidation.
3. Token verifier xác minh issuer, audience, signature, expiry và token family/session state.
4. So khớp route tenant với claim `tid`; kiểm tenant `ACTIVE`.
5. Đọc membership hiện tại và membership version; tạo `TenantContext`.
6. Rate limit theo tenant+tier, sau đó controller chuyển command vào application service.
7. `TenantDataSourceResolver` chọn Pool/Silo; transaction manager đặt database tenant context nếu cơ chế Pool cần. Trong transaction đó, authorization policy đọc `ProjectMembership` hiện tại trước mutation/query nội dung.
8. `finally` luôn xóa thread/MDC/database session context trước khi connection/thread được tái sử dụng.

Lookup auth/control dùng control datasource; business query dùng application datasource. Không mở một transaction bao trùm hai database.

## 6. Dữ liệu và transaction

- Control plane chứa user, tenant, membership, tier, route, payment và provisioning.
- Pool/Silo có cùng Flyway application migrations và cùng schema version policy.
- Mọi application table có `tenant_id`; Silo giữ discriminator để cùng entity/query/test và defense-in-depth.
- Business aggregate mutation + `outbox_event` nằm trong cùng local transaction.
- Control jobs được poll từ `control_db`. Application outbox poller lấy danh sách active placement từ control plane, quét `pooled_db` một lần và các Silo theo round-robin có bounded concurrency; không giữ pool mở cho mọi Silo chỉ để poll. Event được claim bằng lease/locking cục bộ trong database chứa event.
- Worker ghi attempt/delivery idempotently. Delivery bên ngoài là at-least-once; consumer/provider operation cần dedupe key.
- Không dùng foreign key xuyên database. ID control-plane được kiểm trước khi ghi application DB; audit/correlation nối hai phía.
- Optimistic locking trên task bằng `version`; stale update trả 409.

## 7. Datasource và connection budget

Khởi tạo ban đầu, chưa phải kết quả tối ưu:

| Pool | Max connections |
| --- | ---: |
| Control API/worker tổng cấu hình baseline | 5 |
| Pooled application DB | 10 |
| Mỗi active Silo pool | 2 |
| Global cap mục tiêu ban đầu | 25 |

Silo pools được tạo lazy, registry keyed bằng opaque tenant ID, health/schema version được kiểm khi mở và đóng sau idle timeout. Resolver không nhận JDBC URL từ request. Connection credential/reference được lấy từ control-plane secret configuration; không ghi plaintext trong log/audit. Khi cap đạt, resolver fail nhanh/có queue policy thay vì tạo vô hạn.

## 8. Auth/session

- Account login chỉ tại host trung tâm.
- Transfer code random, hash-at-rest, TTL ngắn, single-use, gắn user/tenant/target host và PKCE-like nonce nếu frontend flow cần.
- Access JWT ngắn hạn chỉ ở memory; refresh token opaque/rotating ở cookie `HttpOnly`, `Secure`, `SameSite` phù hợp, host-only.
- Cookie-auth refresh/logout có CSRF token/origin validation.
- Membership version/session family cho phép role change/revoke có hiệu lực ở request kế tiếp.
- Không chia sẻ refresh cookie wildcard giữa các tenant subdomain.

## 9. Payment và provisioning

Payment callback được adapter canonicalize/verify trước khi trả `VerifiedPaymentEvent`. Domain service đối chiếu provider ref, local transaction, amount/currency và legal transition; unique constraint chống duplicate. Browser Return URL chỉ query local status.

Provisioning checkpoints:

```text
VALIDATE -> RESERVE_ROUTE -> CREATE_PLACEMENT -> APPLY_MIGRATIONS
         -> SEED_TENANT -> HEALTH_CHECK -> ACTIVATE_ROUTE -> SUCCEEDED
```

Pool `CREATE_PLACEMENT` đăng ký logical placement; Silo tạo database/role. Step lưu attempt và external resource ID. Compensating rollback chỉ xóa resource được job tạo, chưa chứa user data và ownership marker khớp. Nếu không chứng minh an toàn, job dừng để manual intervention, không “dọn” mù.

Tenant transition:

```text
PENDING_PAYMENT -> PROVISIONING -> ACTIVE
        |                |
        v                v
      FAILED    RETRYABLE_FAILED / FAILED_ROLLED_BACK

ACTIVE <-> SUSPENDED
```

## 10. Storage và notification

Storage key: `<tenant-uuid>/<resource-uuid>/<server-generated-name>`. Client không chọn prefix/key cuối. Metadata authorization diễn ra trước signed URL; TTL là config bảo mật ngắn. Quota reservation và finalize tránh race upload đồng thời. Backend thật được chọn qua spike; MinIO là mặc định có điều kiện, filesystem adapter chỉ local/test nếu thua tiêu chí.

Notification event không chứa dữ liệu quá mức; worker resolve recipient trong tenant hiện tại, kiểm preference và membership trước gửi. In-app record ở application DB; email qua SMTP/Mailpit adapter; Web Push qua VAPID adapter. Invalid subscription bị vô hiệu hóa, provider retry có giới hạn và dedupe.

## 11. Observability và deployment

- JSON log: service/process, level, request/correlation ID, tenant ID, tier, placement, route/job/event ID; redact token, secret, signed URL và nội dung nhạy cảm.
- Metric: request latency/count/error; DB pool active/pending; provisioning duration/state; outbox lag; delivery status; rate-limit decisions. Tenant label chỉ dùng khi cardinality và quyền dashboard được kiểm soát.
- Actuator liveness không gọi dependency; readiness phản ánh control/application dependency cần thiết.
- Local: Compose, Caddy/reverse proxy, `accounts.localhost`, `{tenant}.localhost`, PostgreSQL, MinIO, Mailpit, Prometheus/Grafana.
- VPS: wildcard DNS/TLS DNS-01 khi nhóm cung cấp domain/credential; secrets ngoài image/repo.

## 12. Failure behavior

| Sự cố | Hành vi an toàn |
| --- | --- |
| Control DB unavailable | Không resolve tenant/session mới; fail closed, readiness false |
| Silo DB unavailable | Chỉ tenant đó lỗi; pool/tenant khác tiếp tục nếu resource budget cho phép |
| Pool DB unavailable | Tenant Pool lỗi; Silo có thể tiếp tục qua shared API nếu thread/connection không cạn |
| Worker crash | Job/outbox lease hết hạn và retry idempotent |
| Provider timeout | Giữ pending/retry; không tự coi payment/delivery thành công |
| Migration fail | Tenant không Active; record diagnostic đã redact |
| Context mismatch/missing | 401/403/404 theo policy, không business query/side effect |
| Rate limit exceeded | 429 tenant-scoped; không tiêu quota tenant khác |
