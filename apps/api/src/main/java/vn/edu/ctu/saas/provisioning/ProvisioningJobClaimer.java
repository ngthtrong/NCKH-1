package vn.edu.ctu.saas.provisioning;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;
import vn.edu.ctu.saas.control.ProvisioningStatus;

/**
 * PostgreSQL-specific atomic job claiming. The row lock only lives for the
 * short control-plane transaction which records the lease; provisioning is
 * deliberately performed after that transaction commits.
 */
@Component
public class ProvisioningJobClaimer {
    static final String CLAIM_SQL = """
            WITH candidate AS MATERIALIZED (
                SELECT id, status AS previous_status, attempts AS previous_attempts
                FROM provisioning_jobs
                WHERE (
                    (
                        status IN ('QUEUED', 'RETRYABLE_FAILED')
                        AND attempts < :maxAttempts
                        AND (next_attempt_at IS NULL OR next_attempt_at <= :now)
                    )
                    OR (
                        status = 'RUNNING'
                        AND (lease_expires_at IS NULL OR lease_expires_at <= :now)
                    )
                )
                ORDER BY
                    CASE WHEN status = 'RUNNING' THEN 0 ELSE 1 END,
                    created_at,
                    id
                FOR UPDATE SKIP LOCKED
                LIMIT 1
            )
            UPDATE provisioning_jobs AS job
            SET status = 'RUNNING',
                attempts = CASE
                    WHEN candidate.previous_status = 'RUNNING'
                         AND candidate.previous_attempts >= :maxAttempts
                        THEN candidate.previous_attempts
                    ELSE candidate.previous_attempts + 1
                END,
                next_attempt_at = NULL,
                lease_owner = :leaseOwner,
                lease_token = :leaseToken,
                lease_expires_at = :leaseExpiresAt,
                updated_at = :now
            FROM candidate
            WHERE job.id = candidate.id
            RETURNING
                job.id,
                job.tenant_id,
                candidate.previous_status,
                candidate.previous_attempts,
                job.attempts,
                job.lease_expires_at
            """;

    private static final String RENEW_SQL = """
            UPDATE provisioning_jobs
            SET lease_expires_at = :leaseExpiresAt,
                updated_at = :now
            WHERE id = :jobId
              AND status = 'RUNNING'
              AND lease_token = :leaseToken
              AND lease_expires_at > :now
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public ProvisioningJobClaimer(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<ClaimedJob> claimNext(
            String leaseOwner,
            UUID leaseToken,
            Instant now,
            Instant leaseExpiresAt,
            int maxAttempts) {
        Map<String, Object> parameters = Map.of(
                "leaseOwner", leaseOwner,
                "leaseToken", leaseToken,
                "now", Timestamp.from(now),
                "leaseExpiresAt", Timestamp.from(leaseExpiresAt),
                "maxAttempts", maxAttempts);
        return jdbc.query(CLAIM_SQL, parameters, rows -> {
            if (!rows.next()) return Optional.empty();
            ProvisioningStatus previousStatus = ProvisioningStatus.valueOf(rows.getString("previous_status"));
            int previousAttempts = rows.getInt("previous_attempts");
            return Optional.of(new ClaimedJob(
                    rows.getObject("id", UUID.class),
                    rows.getObject("tenant_id", UUID.class),
                    previousStatus,
                    rows.getInt("attempts"),
                    previousStatus == ProvisioningStatus.RUNNING && previousAttempts >= maxAttempts,
                    rows.getTimestamp("lease_expires_at").toInstant()));
        });
    }

    public boolean renew(UUID jobId, UUID leaseToken, Instant now, Instant leaseExpiresAt) {
        return jdbc.update(RENEW_SQL, Map.of(
                "jobId", jobId,
                "leaseToken", leaseToken,
                "now", Timestamp.from(now),
                "leaseExpiresAt", Timestamp.from(leaseExpiresAt))) == 1;
    }

    public record ClaimedJob(
            UUID jobId,
            UUID tenantId,
            ProvisioningStatus previousStatus,
            int attempt,
            boolean rollbackOnly,
            Instant leaseExpiresAt) {}
}
