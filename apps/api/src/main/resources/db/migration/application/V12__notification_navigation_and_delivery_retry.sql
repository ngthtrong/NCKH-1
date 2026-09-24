ALTER TABLE notifications
    ADD COLUMN action_url varchar(500);

ALTER TABLE notification_delivery_attempts
    ADD COLUMN attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    ADD COLUMN available_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN last_error varchar(500),
    ADD COLUMN delivered_at timestamptz,
    ADD COLUMN dead_lettered_at timestamptz;

CREATE INDEX idx_notification_delivery_ready
    ON notification_delivery_attempts(tenant_id, available_at, attempted_at)
    WHERE channel = 'EMAIL' AND status = 'PENDING' AND dead_lettered_at IS NULL;
