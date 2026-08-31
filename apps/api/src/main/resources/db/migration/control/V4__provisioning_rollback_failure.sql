ALTER TABLE provisioning_jobs
    DROP CONSTRAINT provisioning_jobs_status_check;

ALTER TABLE provisioning_jobs
    ADD CONSTRAINT provisioning_jobs_status_check
    CHECK (status IN (
        'QUEUED','RUNNING','SUCCEEDED','RETRYABLE_FAILED','FAILED_ROLLED_BACK','ROLLBACK_FAILED'
    ));

ALTER TABLE provisioning_events
    DROP CONSTRAINT provisioning_events_from_status_check;

ALTER TABLE provisioning_events
    ADD CONSTRAINT provisioning_events_from_status_check
    CHECK (from_status IS NULL OR from_status IN (
        'QUEUED','RUNNING','SUCCEEDED','RETRYABLE_FAILED','FAILED_ROLLED_BACK','ROLLBACK_FAILED'
    ));

ALTER TABLE provisioning_events
    DROP CONSTRAINT provisioning_events_to_status_check;

ALTER TABLE provisioning_events
    ADD CONSTRAINT provisioning_events_to_status_check
    CHECK (to_status IN (
        'QUEUED','RUNNING','SUCCEEDED','RETRYABLE_FAILED','FAILED_ROLLED_BACK','ROLLBACK_FAILED'
    ));
