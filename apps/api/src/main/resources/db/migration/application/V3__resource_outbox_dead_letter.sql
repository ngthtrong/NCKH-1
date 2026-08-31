ALTER TABLE outbox_events
    ADD COLUMN dead_lettered_at timestamptz,
    ADD COLUMN requeue_count integer NOT NULL DEFAULT 0 CHECK (requeue_count >= 0),
    ADD COLUMN last_requeued_at timestamptz;

UPDATE outbox_events
SET dead_lettered_at = updated_at
WHERE processed_at IS NULL
  AND attempts >= 5
  AND dead_lettered_at IS NULL;

CREATE INDEX idx_outbox_dead_letter
    ON outbox_events(tenant_id, dead_lettered_at DESC)
    WHERE dead_lettered_at IS NOT NULL AND processed_at IS NULL;
