package vn.edu.ctu.saas.provisioning;

import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import vn.edu.ctu.saas.config.AppProperties;
import vn.edu.ctu.saas.provisioning.ProvisioningJobCoordinator.FailureOutcome;
import vn.edu.ctu.saas.provisioning.ProvisioningJobCoordinator.LeaseOwnershipLostException;
import vn.edu.ctu.saas.provisioning.ProvisioningJobCoordinator.ProvisioningClaim;
import vn.edu.ctu.saas.provisioning.ProvisioningJobCoordinator.ProvisioningWorkItem;
import vn.edu.ctu.saas.tenant.TenantDataSourceResolver;

@Component
@Profile("worker")
public class ProvisioningWorker {
    private static final Logger log = LoggerFactory.getLogger(ProvisioningWorker.class);
    private static final int MAX_JOBS_PER_POLL = 10;

    private final ProvisioningJobCoordinator coordinator;
    private final TenantDatabaseProvisioner databaseProvisioner;
    private final TenantDataSourceResolver dataSourceResolver;
    private final AppProperties properties;
    private final String workerId = "worker-" + UUID.randomUUID();
    private final ScheduledExecutorService heartbeatExecutor = Executors.newSingleThreadScheduledExecutor(runnable -> {
        Thread thread = new Thread(runnable, "provisioning-lease-heartbeat");
        thread.setDaemon(true);
        return thread;
    });

    public ProvisioningWorker(
            ProvisioningJobCoordinator coordinator,
            TenantDatabaseProvisioner databaseProvisioner,
            TenantDataSourceResolver dataSourceResolver,
            AppProperties properties) {
        this.coordinator = coordinator;
        this.databaseProvisioner = databaseProvisioner;
        this.dataSourceResolver = dataSourceResolver;
        this.properties = properties;
    }

    @Scheduled(fixedDelayString = "${PROVISIONING_POLL_INTERVAL:PT5S}")
    public void poll() {
        for (int processed = 0; processed < MAX_JOBS_PER_POLL; processed++) {
            Optional<ProvisioningClaim> claim = coordinator.claimNext(workerId, Instant.now());
            if (claim.isEmpty()) return;
            process(claim.orElseThrow());
        }
    }

    private void process(ProvisioningClaim claim) {
        AtomicBoolean leaseLost = new AtomicBoolean(false);
        ScheduledFuture<?> heartbeat = startHeartbeat(claim, leaseLost);
        ProvisioningWorkItem work = null;
        try {
            work = coordinator.loadWork(claim, Instant.now());
            if (claim.rollbackOnly()) {
                String errorCode = work.lastErrorCode() == null ? "LEASE_EXPIRED" : work.lastErrorCode();
                String errorMessage = work.lastErrorMessage() == null
                        ? "Provisioning lease expired after the maximum number of attempts"
                        : work.lastErrorMessage();
                rollbackAndFinalize(claim, work, errorCode, errorMessage, null);
                return;
            }

            databaseProvisioner.prepare(work.tenant(), work.placement());
            if (!coordinator.persistPreparedPlacement(claim, work.placement(), Instant.now())) {
                leaseLost.set(true);
                log.warn("Provisioning lease lost before external work for job {}", claim.jobId());
                return;
            }

            databaseProvisioner.provision(work.tenant(), work.placement());
            if (leaseLost.get()) {
                log.warn("Ignoring provisioning result after lease loss for job {}", claim.jobId());
                return;
            }
            if (!coordinator.completeSuccessfully(claim, work.placement(), Instant.now())) {
                leaseLost.set(true);
                log.warn("Ignoring provisioning result because claim {} is no longer current", claim.jobId());
                return;
            }
            try {
                dataSourceResolver.evict(claim.tenantId());
            } catch (RuntimeException evictionFailure) {
                log.warn("Tenant data source eviction failed after provisioning job {} completed", claim.jobId(), evictionFailure);
            }
            log.info("Tenant provisioning succeeded for tenant {} on attempt {}", claim.tenantId(), claim.attempt());
        } catch (LeaseOwnershipLostException ownershipLost) {
            leaseLost.set(true);
            log.warn("Provisioning claim {} was superseded: {}", claim.jobId(), ownershipLost.getMessage());
        } catch (RuntimeException failure) {
            if (leaseLost.get()) {
                log.warn("Provisioning failed after lease loss for job {}; another worker will recover it", claim.jobId(), failure);
                return;
            }
            handleFailure(claim, work, failure);
        } finally {
            heartbeat.cancel(false);
        }
    }

    private void handleFailure(ProvisioningClaim claim, ProvisioningWorkItem work, RuntimeException failure) {
        FailureOutcome outcome = coordinator.recordFailure(claim, failure, Instant.now());
        if (outcome == FailureOutcome.OWNERSHIP_LOST) {
            log.warn("Provisioning failure ignored because claim {} is no longer current", claim.jobId());
            return;
        }
        if (outcome == FailureOutcome.RETRY_SCHEDULED) {
            log.warn("Provisioning attempt {} failed for tenant {}; retry scheduled", claim.attempt(), claim.tenantId());
            return;
        }
        rollbackAndFinalize(
                claim,
                work,
                failure.getClass().getSimpleName(),
                safeMessage(failure),
                failure);
    }

    private void rollbackAndFinalize(
            ProvisioningClaim claim,
            ProvisioningWorkItem work,
            String errorCode,
            String errorMessage,
            Throwable originalFailure) {
        Throwable rollbackFailure = null;
        if (work == null) {
            rollbackFailure = new IllegalStateException("Rollback skipped because tenant placement metadata is unavailable");
        } else {
            try {
                databaseProvisioner.rollback(work.tenant(), work.placement());
            } catch (RuntimeException failure) {
                rollbackFailure = failure;
            }
        }
        boolean completed = coordinator.completeRollback(
                claim, errorCode, errorMessage, rollbackFailure, Instant.now());
        if (!completed) {
            log.warn("Rollback result ignored because claim {} is no longer current", claim.jobId());
            return;
        }
        if (rollbackFailure == null) {
            log.warn("Tenant provisioning reached its retry limit and was rolled back for tenant {}", claim.tenantId());
        } else {
            log.error("Tenant provisioning failed and rollback was incomplete for tenant {}", claim.tenantId(), rollbackFailure);
        }
        if (originalFailure != null) {
            log.debug("Original provisioning failure for job {}", claim.jobId(), originalFailure);
        }
    }

    private ScheduledFuture<?> startHeartbeat(ProvisioningClaim claim, AtomicBoolean leaseLost) {
        long intervalMillis = heartbeatInterval(properties.provisioning().leaseDuration());
        return heartbeatExecutor.scheduleAtFixedRate(() -> {
            if (leaseLost.get()) return;
            try {
                if (!coordinator.renewLease(claim, Instant.now())) {
                    leaseLost.set(true);
                    log.warn("Provisioning lease heartbeat rejected for job {}", claim.jobId());
                }
            } catch (RuntimeException heartbeatFailure) {
                log.warn("Provisioning lease heartbeat failed for job {}", claim.jobId(), heartbeatFailure);
            }
        }, intervalMillis, intervalMillis, TimeUnit.MILLISECONDS);
    }

    private long heartbeatInterval(Duration leaseDuration) {
        if (leaseDuration == null || leaseDuration.isNegative() || leaseDuration.isZero()) {
            throw new IllegalStateException("Provisioning lease duration must be positive");
        }
        return Math.max(100L, leaseDuration.toMillis() / 3L);
    }

    private String safeMessage(Throwable throwable) {
        String message = throwable.getMessage();
        if (message == null) return "No error message";
        return message.length() <= 500 ? message : message.substring(0, 500);
    }

    @PreDestroy
    void stopHeartbeatExecutor() {
        heartbeatExecutor.shutdownNow();
    }
}
