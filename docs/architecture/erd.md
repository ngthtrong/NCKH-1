# Mô hình dữ liệu

Các kiểu dưới đây là logical types. Migration là nguồn chân lý vật lý khi implementation bắt đầu. UUID và timestamp UTC áp dụng toàn hệ thống; money dùng `amount_minor BIGINT` + `currency CHAR(3)`.

## 1. Control database ERD

```mermaid
erDiagram
    USER_ACCOUNT ||--o{ TENANT_MEMBERSHIP : participates
    SUBSCRIPTION_TIER ||--o{ TENANT : classifies
    TENANT ||--o{ TENANT_MEMBERSHIP : has
    TENANT ||--o{ TENANT_INVITATION : invites
    TENANT ||--|| TENANT_DATA_PLACEMENT : places
    TENANT ||--|| TENANT_ROUTE : routes
    TENANT ||--o{ PAYMENT_TRANSACTION : pays
    PAYMENT_TRANSACTION ||--o{ PAYMENT_EVENT : receives
    TENANT ||--o{ PROVISIONING_JOB : provisions
    PROVISIONING_JOB ||--o{ PROVISIONING_STEP : checkpoints
    USER_ACCOUNT ||--o{ REFRESH_SESSION : owns
    USER_ACCOUNT ||--o{ TENANT_TRANSFER_CODE : requests
    TENANT ||--o{ TENANT_TRANSFER_CODE : targets
    TENANT ||--o{ CONTROL_AUDIT_EVENT : scopes
    TENANT ||--o{ CONTROL_OUTBOX_EVENT : emits

    USER_ACCOUNT {
      uuid id PK
      citext email UK
      string password_hash
      string status
      bigint authz_version
      timestamptz created_at
      timestamptz updated_at
    }
    SUBSCRIPTION_TIER {
      uuid id PK
      string code UK
      string name
      bigint storage_quota_bytes
      int requests_per_minute
      boolean active
    }
    TENANT {
      uuid id PK
      string slug UK
      string name
      uuid tier_id FK
      string placement
      string status
      bigint authz_version
      timestamptz created_at
      timestamptz activated_at
    }
    TENANT_MEMBERSHIP {
      uuid id PK
      uuid tenant_id FK
      uuid user_id FK
      string role
      string status
      bigint authz_version
      uuid invited_by
      timestamptz created_at
      timestamptz revoked_at
    }
    TENANT_INVITATION {
      uuid id PK
      uuid tenant_id FK
      citext invited_email
      string role
      string token_hash UK
      string status
      uuid invited_by
      uuid accepted_by
      timestamptz expires_at
      timestamptz consumed_at
    }
    TENANT_DATA_PLACEMENT {
      uuid id PK
      uuid tenant_id FK, UK
      string placement_type
      string database_ref
      string credential_secret_ref
      string schema_version
      string status
      timestamptz last_health_at
    }
    TENANT_ROUTE {
      uuid id PK
      uuid tenant_id FK, UK
      string hostname UK
      string status
      timestamptz activated_at
    }
    PAYMENT_TRANSACTION {
      uuid id PK
      uuid tenant_id FK
      string provider
      string provider_ref UK
      string idempotency_key UK
      bigint amount_minor
      string currency
      string status
      timestamptz created_at
      timestamptz verified_at
    }
    PAYMENT_EVENT {
      uuid id PK
      uuid payment_id FK
      string provider_event_id UK
      string payload_hash
      boolean signature_valid
      string status
      timestamptz received_at
    }
    PROVISIONING_JOB {
      uuid id PK
      uuid tenant_id FK
      string idempotency_key UK
      string placement
      string status
      string current_step
      int attempt_count
      timestamptz next_attempt_at
      timestamptz lease_until
      string last_error_code
    }
    PROVISIONING_STEP {
      uuid id PK
      uuid job_id FK
      string step_name
      string status
      string external_resource_ref
      int attempt
      timestamptz started_at
      timestamptz finished_at
    }
    REFRESH_SESSION {
      uuid id PK
      uuid user_id FK
      uuid tenant_id
      string token_hash UK
      uuid family_id
      timestamptz expires_at
      timestamptz revoked_at
    }
    TENANT_TRANSFER_CODE {
      uuid id PK
      uuid user_id FK
      uuid tenant_id FK
      string code_hash UK
      string target_host
      timestamptz expires_at
      timestamptz consumed_at
    }
    CONTROL_AUDIT_EVENT {
      uuid id PK
      uuid tenant_id
      uuid actor_id
      string action
      string target_type
      uuid target_id
      string correlation_id
      jsonb metadata_redacted
      timestamptz occurred_at
    }
    CONTROL_OUTBOX_EVENT {
      uuid id PK
      uuid tenant_id
      string event_type
      int event_version
      string correlation_id
      jsonb payload
      timestamptz available_at
      timestamptz processed_at
    }
```

Ràng buộc bổ sung:

- Unique `(tenant_id, user_id)` cho `TENANT_MEMBERSHIP`; partial/logic constraint bảo đảm đúng một active Owner.
- `placement ∈ {POOL, SILO_DATABASE}` và bất biến sau khi có application data.
- `PAYMENT_EVENT(provider_event_id)` và `PROVISIONING_JOB(idempotency_key)` chống duplicate.
- Raw callback nhạy cảm không lưu mặc định; chỉ lưu hash và metadata đã redact cần cho audit.

## 2. Pooled application database ERD

```mermaid
erDiagram
    PROJECT ||--o{ PROJECT_MEMBERSHIP : has
    PROJECT ||--o{ BOARD : contains
    BOARD ||--o{ BOARD_COLUMN : contains
    BOARD_COLUMN ||--o{ TASK : holds
    TASK ||--o{ TASK : parent_of
    TASK ||--o{ COMMENT : discussed_by
    TASK ||--o{ TASK_RESOURCE : links
    RESOURCE ||--o{ TASK_RESOURCE : reused_by
    PROJECT ||--o{ RESOURCE : scopes
    PROJECT ||--o{ NOTIFICATION : produces

    PROJECT {
      uuid id PK
      uuid tenant_id
      string name
      string description
      string status
      uuid created_by
      timestamptz created_at
      timestamptz deleted_at
    }
    PROJECT_MEMBERSHIP {
      uuid id PK
      uuid tenant_id
      uuid project_id FK
      uuid user_id
      string role
      string status
      bigint authz_version
      timestamptz created_at
    }
    BOARD {
      uuid id PK
      uuid tenant_id
      uuid project_id FK
      string name
      int position
      timestamptz deleted_at
    }
    BOARD_COLUMN {
      uuid id PK
      uuid tenant_id
      uuid board_id FK
      string name
      string color
      numeric position
      timestamptz deleted_at
    }
    TASK {
      uuid id PK
      uuid tenant_id
      uuid project_id FK
      uuid board_id FK
      uuid column_id FK
      uuid parent_task_id FK
      uuid assignee_id
      string title
      string description
      timestamptz due_at
      numeric position
      bigint version
      timestamptz deleted_at
    }
    COMMENT {
      uuid id PK
      uuid tenant_id
      uuid task_id FK
      uuid author_id
      string body
      bigint version
      timestamptz created_at
      timestamptz deleted_at
    }
    RESOURCE {
      uuid id PK
      uuid tenant_id
      uuid project_id FK
      uuid uploaded_by
      string kind
      string storage_key
      string display_name
      string media_type
      bigint size_bytes
      string status
      timestamptz created_at
      timestamptz deleted_at
    }
    TASK_RESOURCE {
      uuid id PK
      uuid tenant_id
      uuid task_id FK
      uuid resource_id FK
      uuid linked_by
      timestamptz created_at
    }
    NOTIFICATION {
      uuid id PK
      uuid tenant_id
      uuid project_id
      uuid recipient_id
      string event_type
      string title
      jsonb safe_payload
      timestamptz read_at
      timestamptz created_at
    }
```

Các bảng hỗ trợ cũng thuộc cùng schema:

```mermaid
erDiagram
    NOTIFICATION_PREFERENCE ||--o{ PUSH_SUBSCRIPTION : configures

    NOTIFICATION_PREFERENCE {
      uuid id PK
      uuid tenant_id
      uuid user_id
      string event_type
      boolean in_app
      boolean email
      boolean web_push
      timestamptz updated_at
    }
    PUSH_SUBSCRIPTION {
      uuid id PK
      uuid tenant_id
      uuid user_id
      string endpoint_hash UK
      string encrypted_subscription
      string status
      timestamptz expires_at
    }
    AUDIT_EVENT {
      uuid id PK
      uuid tenant_id
      uuid actor_id
      string action
      string target_type
      uuid target_id
      string correlation_id
      jsonb metadata_redacted
      timestamptz occurred_at
    }
    OUTBOX_EVENT {
      uuid id PK
      uuid tenant_id
      uuid actor_id
      string aggregate_type
      uuid aggregate_id
      string event_type
      int event_version
      string correlation_id
      jsonb payload
      int attempt_count
      timestamptz available_at
      timestamptz processed_at
    }
```

Pool constraints:

- Mọi unique/FK logic có tenant scope. Ưu tiên composite unique `(tenant_id, id)` và composite FK để DB từ chối liên kết cross-tenant, ngoài application checks.
- Index đọc chính bắt đầu bằng `tenant_id`, ví dụ `(tenant_id, project_id, status)` và `(tenant_id, board_id, column_id, position)`; index cuối cùng được xác nhận bằng query plan/spike.
- Nếu RLS thắng spike, policy áp dụng cho tất cả bảng tenant-scoped, kể cả join/outbox/audit/notification; app role không owner/BYPASSRLS và bật FORCE RLS.

## 3. Silo application database ERD

Mỗi Silo database dùng **chính xác cùng application migrations và logical schema** như Pool. Không tạo schema/entity riêng cho Silo; khác biệt chỉ ở datasource route và resource boundary.

```mermaid
erDiagram
    SILO_TENANT ||--o{ PROJECT : owns
    PROJECT ||--o{ PROJECT_MEMBERSHIP : has
    PROJECT ||--o{ BOARD : contains
    BOARD ||--o{ BOARD_COLUMN : contains
    BOARD_COLUMN ||--o{ TASK : holds
    TASK ||--o{ COMMENT : discussed_by
    TASK ||--o{ TASK_RESOURCE : links
    RESOURCE ||--o{ TASK_RESOURCE : reused_by
    SILO_TENANT ||--o{ NOTIFICATION : receives
    SILO_TENANT ||--o{ AUDIT_EVENT : audits
    SILO_TENANT ||--o{ OUTBOX_EVENT : emits

    SILO_TENANT {
      uuid tenant_id "logical marker, one allowed value"
      string schema_version
    }
    PROJECT {
      uuid id PK
      uuid tenant_id
      string name
      string status
    }
    PROJECT_MEMBERSHIP {
      uuid id PK
      uuid tenant_id
      uuid project_id FK
      uuid user_id
      string role
    }
    BOARD {
      uuid id PK
      uuid tenant_id
      uuid project_id FK
      string name
    }
    BOARD_COLUMN {
      uuid id PK
      uuid tenant_id
      uuid board_id FK
      string name
      numeric position
    }
    TASK {
      uuid id PK
      uuid tenant_id
      uuid project_id FK
      uuid board_id FK
      uuid column_id FK
      uuid parent_task_id
      string title
      bigint version
    }
    COMMENT {
      uuid id PK
      uuid tenant_id
      uuid task_id FK
      uuid author_id
    }
    RESOURCE {
      uuid id PK
      uuid tenant_id
      uuid project_id FK
      string storage_key
    }
    TASK_RESOURCE {
      uuid id PK
      uuid tenant_id
      uuid task_id FK
      uuid resource_id FK
    }
    NOTIFICATION {
      uuid id PK
      uuid tenant_id
      uuid recipient_id
    }
    AUDIT_EVENT {
      uuid id PK
      uuid tenant_id
      string action
    }
    OUTBOX_EVENT {
      uuid id PK
      uuid tenant_id
      string event_type
    }
```

Silo invariant: tất cả rows có `tenant_id` bằng tenant đã đăng ký cho database. Migration/seed tạo marker và constraint/trigger phù hợp nếu cơ chế được chọn. Điều này phát hiện route/job sai tenant thay vì dựa duy nhất vào “database riêng”.
