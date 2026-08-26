package vn.edu.ctu.saas.provisioning;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.ctu.saas.config.AppProperties;
import vn.edu.ctu.saas.control.ProvisioningJobEntity;
import vn.edu.ctu.saas.control.ProvisioningJobRepository;
import vn.edu.ctu.saas.control.ProvisioningStatus;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.tenant.TenantStatus;

/**
 * Owns the short control-plane transactions around provisioning. No method in
 * this class performs database creation, Flyway migration or rollback against
 * a tenant database.
 */
@Service
public class ProvisioningJobCoordinator {
    private final ProvisioningJobClaimer claimer;
    private final ProvisioningJobRepository jobRepository;
    private final TenantRepository tenantRepository;
    private final TenantPlacementRepository placementRepository;
    private final ProvisioningEventRecorder eventRecorder;
    private final AppProperties properties;

    public ProvisioningJobCoordinator(
            ProvisioningJobClaimer claimer,
            ProvisioningJobRepository jobRepository,
            TenantRepository tenantRepository,
            TenantPlacementRepository placementRepository,
            ProvisioningEventRecorder eventRecorder,
            AppProperties properties) {
        this.claimer = claimer;
        this.jobRepository = jobRepository;
        this.tenantRepository = tenantRepository;
        this.placementRepository = placementRepository;
        this.eventRecorder = eventRecorder;
        this.properties = properties;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<ProvisioningClaim> claimNext(String workerId, Instant now) {
        Duration leaseDuration = leaseDuration();
        UUID leaseToken = UUID.randomUUID();
        Optional<ProvisioningJobClaimer.ClaimedJob> claimed = claimer.claimNext(
                workerId,
                leaseToken,
                now,
                now.plus(leaseDuration),
                maxAttempts());
        if (claimed.isEmpty()) return Optional.empty();

        ProvisioningJobClaimer.ClaimedJob row = claimed.orElseThrow();
        ProvisioningJobEntity job = jobRepository.findByIdForUpdate(row.jobId()).orElseThrow();
        String errorCode = row.previousStatus() == ProvisioningStatus.RUNNING ? "LEASE_EXPIRED" : null;
        String message = row.previousStatus() == ProvisioningStatus.RUNNING
                ? "Expired provisioning lease recovered by " + workerId
                : "Provisioning attempt claimed by " + workerId;
        eventRecorder.record(job, row.previousStatus(), ProvisioningStatus.RUNNING, errorCode, message);
        return Optional.of(new ProvisioningClaim(
                row.jobId(), row.tenantId(), leaseToken, row.attempt(), row.rollbackOnly(), row.leaseExpiresAt()));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean renewLease(ProvisioningClaim claim, Instant now) {
        return claimer.renew(
                claim.jobId(), claim.leaseToken(), now, now.plus(leaseDuration()));
    }

    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public ProvisioningWorkItem loadWork(ProvisioningClaim claim, Instant now) {
        ProvisioningJobEntity job = jobRepository.findById(claim.jobId()).orElseThrow();
        requireOwnership(job, claim, now);
        TenantEntity tenant = tenantRepository.findById(job.getTenantId()).orElseThrow();
        TenantPlacementEntity placement = placementRepository.findByTenantId(tenant.getId()).orElseThrow();
        return new ProvisioningWorkItem(tenant, placement, job.getLastErrorCode(), job.getLastErrorMessage());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean persistPreparedPlacement(
            ProvisioningClaim claim,
            TenantPlacementEntity prepared,
            Instant now) {
        ProvisioningJobEntity job = jobRepository.findByIdForUpdate(claim.jobId()).orElseThrow();
        if (!owns(job, claim, now)) return false;
        TenantPlacementEntity placement = placementRepository.findByTenantId(claim.tenantId()).orElseThrow();
        copyPlacement(prepared, placement);
        placementRepository.save(placement);
        return true;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean completeSuccessfully(
            ProvisioningClaim claim,
            TenantPlacementEntity provisioned,
            Instant now) {
        ProvisioningJobEntity job = jobRepository.findByIdForUpdate(claim.jobId()).orElseThrow();
        if (!owns(job, claim, now)) return false;

        TenantEntity tenant = tenantRepository.findById(claim.tenantId()).orElseThrow();
        TenantPlacementEntity placement = placementRepository.findByTenantId(claim.tenantId()).orElseThrow();
        copyPlacement(provisioned, placement);
        placementRepository.save(placement);
        tenant.setStatus(TenantStatus.ACTIVE);
        tenantRepository.save(tenant);

        job.setStatus(ProvisioningStatus.SUCCEEDED);
        job.setNextAttemptAt(null);
        job.setLastErrorCode(null);
        job.setLastErrorMessage(null);
        clearLease(job);
        jobRepository.save(job);
        eventRecorder.record(
                job, ProvisioningStatus.RUNNING, ProvisioningStatus.SUCCEEDED, null, "Provisioning completed");
        return true;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public FailureOutcome recordFailure(
            ProvisioningClaim claim,
            Throwable failure,
            Instant now) {
        ProvisioningJobEntity job = jobRepository.findByIdForUpdate(claim.jobId()).orElseThrow();
        if (!owns(job, claim, now)) return FailureOutcome.OWNERSHIP_LOST;

        job.setLastErrorCode(failure.getClass().getSimpleName());
        job.setLastErrorMessage(safeMessage(failure));
        if (job.getAttempts() >= maxAttempts()) {
            jobRepository.save(job);
            return FailureOutcome.ROLLBACK_REQUIRED;
        }

        job.setStatus(ProvisioningStatus.RETRYABLE_FAILED);
        job.setNextAttemptAt(now.plus(job.getAttempts() * 15L, ChronoUnit.SECONDS));
        clearLease(job);
        jobRepository.save(job);
        eventRecorder.record(
                job,
                ProvisioningStatus.RUNNING,
                ProvisioningStatus.RETRYABLE_FAILED,
                job.getLastErrorCode(),
                job.getLastErrorMessage());
        return FailureOutcome.RETRY_SCHEDULED;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean completeRollback(
            ProvisioningClaim claim,
            String errorCode,
            String errorMessage,
            Throwable rollbackFailure,
            Instant now) {
        ProvisioningJobEntity job = jobRepository.findByIdForUpdate(claim.jobId()).orElseThrow();
        if (!owns(job, claim, now)) return false;

        String finalMessage = errorMessage == null ? "Provisioning failed" : errorMessage;
        if (rollbackFailure != null) {
            finalMessage = finalMessage + "; rollback: " + safeMessage(rollbackFailure);
        }
        job.setLastErrorCode(errorCode == null ? "PROVISIONING_FAILED" : errorCode);
        job.setLastErrorMessage(truncate(finalMessage));
        job.setStatus(ProvisioningStatus.FAILED_ROLLED_BACK);
        job.setNextAttemptAt(null);
        clearLease(job);
        tenantRepository.findById(claim.tenantId()).ifPresent(tenant -> {
            tenant.setStatus(TenantStatus.FAILED);
            tenantRepository.save(tenant);
        });
        jobRepository.save(job);
        eventRecorder.record(
                job,
                ProvisioningStatus.RUNNING,
                ProvisioningStatus.FAILED_ROLLED_BACK,
                job.getLastErrorCode(),
                job.getLastErrorMessage());
        return true;
    }

    private int maxAttempts() {
        if (properties.provisioning().maxAttempts() < 1) {
            throw new IllegalStateException("Provisioning max attempts must be positive");
        }
        return properties.provisioning().maxAttempts();
    }

    private Duration leaseDuration() {
        Duration duration = properties.provisioning().leaseDuration();
        if (duration == null || duration.isNegative() || duration.isZero()) {
            throw new IllegalStateException("Provisioning lease duration must be positive");
        }
        return duration;
    }

    private void requireOwnership(
            ProvisioningJobEntity job,
            ProvisioningClaim claim,
            Instant now) {
        if (!owns(job, claim, now)) {
            throw new LeaseOwnershipLostException("Provisioning lease is no longer owned by this worker");
        }
    }

    private boolean owns(ProvisioningJobEntity job, ProvisioningClaim claim, Instant now) {
        return job.getStatus() == ProvisioningStatus.RUNNING
                && claim.leaseToken().equals(job.getLeaseToken())
                && job.getLeaseExpiresAt() != null
                && job.getLeaseExpiresAt().isAfter(now);
    }

    private void clearLease(ProvisioningJobEntity job) {
        job.setLeaseOwner(null);
        job.setLeaseToken(null);
        job.setLeaseExpiresAt(null);
    }

    private void copyPlacement(TenantPlacementEntity source, TenantPlacementEntity target) {
        target.setDatabaseHost(source.getDatabaseHost());
        target.setDatabasePort(source.getDatabasePort());
        target.setDatabaseName(source.getDatabaseName());
        target.setDatabaseUsername(source.getDatabaseUsername());
        target.setEncryptedPassword(source.getEncryptedPassword());
        target.setSchemaVersion(source.getSchemaVersion());
    }

    private String safeMessage(Throwable throwable) {
        String message = throwable.getMessage();
        return truncate(message == null ? "No error message" : message);
    }

    private String truncate(String value) {
        return value.length() <= 500 ? value : value.substring(0, 500);
    }

    public record ProvisioningClaim(
            UUID jobId,
            UUID tenantId,
            UUID leaseToken,
            int attempt,
            boolean rollbackOnly,
            Instant leaseExpiresAt) {}

    public record ProvisioningWorkItem(
            TenantEntity tenant,
            TenantPlacementEntity placement,
            String lastErrorCode,
            String lastErrorMessage) {}

    public enum FailureOutcome {
        RETRY_SCHEDULED,
        ROLLBACK_REQUIRED,
        OWNERSHIP_LOST
    }

    public static final class LeaseOwnershipLostException extends IllegalStateException {
        public LeaseOwnershipLostException(String message) {
            super(message);
        }
    }
}
