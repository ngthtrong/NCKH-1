ALTER TABLE payment_transactions
    ADD COLUMN return_url varchar(2048);

CREATE TABLE payment_webhook_events (
    id uuid PRIMARY KEY,
    provider varchar(40) NOT NULL,
    provider_event_id varchar(160) NOT NULL,
    payment_id uuid NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
    payload_sha256 varchar(64) NOT NULL,
    successful boolean NOT NULL,
    outcome varchar(40) NOT NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    UNIQUE (provider, provider_event_id)
);

CREATE INDEX idx_payment_webhook_payment
    ON payment_webhook_events(payment_id, created_at);

CREATE TABLE provisioning_events (
    id uuid PRIMARY KEY,
    provisioning_job_id uuid NOT NULL REFERENCES provisioning_jobs(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    from_status varchar(40),
    to_status varchar(40) NOT NULL,
    attempt integer NOT NULL,
    error_code varchar(80),
    message varchar(500),
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    CHECK (from_status IS NULL OR from_status IN ('QUEUED','RUNNING','SUCCEEDED','RETRYABLE_FAILED','FAILED_ROLLED_BACK')),
    CHECK (to_status IN ('QUEUED','RUNNING','SUCCEEDED','RETRYABLE_FAILED','FAILED_ROLLED_BACK'))
);

CREATE INDEX idx_provisioning_events_job
    ON provisioning_events(provisioning_job_id, created_at);
