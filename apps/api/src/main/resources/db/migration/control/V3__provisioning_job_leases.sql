ALTER TABLE provisioning_jobs
    ADD COLUMN lease_owner varchar(120),
    ADD COLUMN lease_token uuid,
    ADD COLUMN lease_expires_at timestamptz;

CREATE INDEX idx_provisioning_jobs_expired_lease
    ON provisioning_jobs(lease_expires_at)
    WHERE status = 'RUNNING';
