package vn.edu.ctu.saas.provisioning;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.ctu.saas.config.AppProperties;
import vn.edu.ctu.saas.control.ProvisioningJobEntity;
import vn.edu.ctu.saas.control.ProvisioningJobRepository;
import vn.edu.ctu.saas.control.ProvisioningStatus;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.tenant.TenantDataSourceResolver;
import vn.edu.ctu.saas.tenant.TenantStatus;

@Component
@Profile("worker")
public class ProvisioningWorker {
    private static final Logger log = LoggerFactory.getLogger(ProvisioningWorker.class);
    private final ProvisioningJobRepository jobRepository;
    private final TenantRepository tenantRepository;
    private final TenantPlacementRepository placementRepository;
    private final TenantDatabaseProvisioner databaseProvisioner;
    private final TenantDataSourceResolver dataSourceResolver;
    private final AppProperties properties;
    private final ProvisioningEventRecorder eventRecorder;

    public ProvisioningWorker(
            ProvisioningJobRepository jobRepository,
            TenantRepository tenantRepository,
            TenantPlacementRepository placementRepository,
            TenantDatabaseProvisioner databaseProvisioner,
            TenantDataSourceResolver dataSourceResolver,
            AppProperties properties,
            ProvisioningEventRecorder eventRecorder) {
        this.jobRepository = jobRepository;
        this.tenantRepository = tenantRepository;
        this.placementRepository = placementRepository;
        this.databaseProvisioner = databaseProvisioner;
        this.dataSourceResolver = dataSourceResolver;
        this.properties = properties;
        this.eventRecorder = eventRecorder;
    }

    @Scheduled(fixedDelayString = "${PROVISIONING_POLL_INTERVAL:PT5S}")
    @Transactional
    public void poll() {
        List<ProvisioningJobEntity> jobs = jobRepository.findTop10ByStatusInAndNextAttemptAtBeforeOrderByCreatedAt(
                List.of(ProvisioningStatus.QUEUED, ProvisioningStatus.RETRYABLE_FAILED), Instant.now().plusMillis(1));
        jobs.forEach(this::process);
    }

    private void process(ProvisioningJobEntity job) {
        TenantEntity tenant = tenantRepository.findById(job.getTenantId()).orElseThrow();
        TenantPlacementEntity placement = placementRepository.findByTenantId(tenant.getId()).orElseThrow();
        ProvisioningStatus previousStatus = job.getStatus();
        job.setStatus(ProvisioningStatus.RUNNING);
        job.setAttempts(job.getAttempts() + 1);
        jobRepository.saveAndFlush(job);
        eventRecorder.record(job, previousStatus, ProvisioningStatus.RUNNING, null, "Provisioning attempt started");
        try {
            databaseProvisioner.provision(tenant, placement);
            placementRepository.save(placement);
            tenant.setStatus(TenantStatus.ACTIVE);
            tenantRepository.save(tenant);
            job.setStatus(ProvisioningStatus.SUCCEEDED);
            job.setNextAttemptAt(null);
            job.setLastErrorCode(null);
            job.setLastErrorMessage(null);
            eventRecorder.record(job, ProvisioningStatus.RUNNING, ProvisioningStatus.SUCCEEDED, null, "Provisioning completed");
            dataSourceResolver.evict(tenant.getId());
            log.info("Tenant provisioning succeeded for tenant {}", tenant.getId());
        } catch (RuntimeException exception) {
            job.setLastErrorCode(exception.getClass().getSimpleName());
            job.setLastErrorMessage(safeMessage(exception));
            if (job.getAttempts() < properties.provisioning().maxAttempts()) {
                job.setStatus(ProvisioningStatus.RETRYABLE_FAILED);
                job.setNextAttemptAt(Instant.now().plus(job.getAttempts() * 15L, ChronoUnit.SECONDS));
                eventRecorder.record(
                        job, ProvisioningStatus.RUNNING, ProvisioningStatus.RETRYABLE_FAILED,
                        job.getLastErrorCode(), job.getLastErrorMessage());
            } else {
                try {
                    databaseProvisioner.rollback(tenant, placement);
                    job.setStatus(ProvisioningStatus.FAILED_ROLLED_BACK);
                } catch (RuntimeException rollbackFailure) {
                    job.setStatus(ProvisioningStatus.FAILED_ROLLED_BACK);
                    job.setLastErrorMessage(safeMessage(exception) + "; rollback: " + safeMessage(rollbackFailure));
                }
                tenant.setStatus(TenantStatus.FAILED);
                tenantRepository.save(tenant);
                eventRecorder.record(
                        job, ProvisioningStatus.RUNNING, ProvisioningStatus.FAILED_ROLLED_BACK,
                        job.getLastErrorCode(), job.getLastErrorMessage());
            }
            log.warn("Tenant provisioning failed for tenant {} with code {}", tenant.getId(), job.getLastErrorCode());
        }
        jobRepository.save(job);
    }

    private String safeMessage(Throwable throwable) {
        String message = throwable.getMessage();
        if (message == null) return "No error message";
        return message.length() > 480 ? message.substring(0, 480) : message;
    }
}
