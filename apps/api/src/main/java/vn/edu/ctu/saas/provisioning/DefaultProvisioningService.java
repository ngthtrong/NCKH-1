package vn.edu.ctu.saas.provisioning;

import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.control.ProvisioningJobEntity;
import vn.edu.ctu.saas.control.ProvisioningJobRepository;
import vn.edu.ctu.saas.control.ProvisioningStatus;

@Service
public class DefaultProvisioningService implements ProvisioningService {
    private final ProvisioningJobRepository repository;
    private final ProvisioningEventRecorder eventRecorder;

    public DefaultProvisioningService(
            ProvisioningJobRepository repository,
            ProvisioningEventRecorder eventRecorder) {
        this.repository = repository;
        this.eventRecorder = eventRecorder;
    }

    @Override
    @Transactional
    public ProvisioningJobEntity enqueue(UUID tenantId, String idempotencyKey) {
        String normalizedKey = idempotencyKey == null ? "" : idempotencyKey.trim();
        if (normalizedKey.isBlank() || normalizedKey.length() > 120) {
            throw new IllegalArgumentException("Provisioning idempotency key is invalid");
        }
        ProvisioningJobEntity existing = repository.findByIdempotencyKey(normalizedKey).orElse(null);
        if (existing != null) {
            if (!existing.getTenantId().equals(tenantId)) {
                throw new ConflictException("Provisioning idempotency key belongs to another tenant");
            }
            return existing;
        }
        return createJob(tenantId, normalizedKey);
    }

    private ProvisioningJobEntity createJob(UUID tenantId, String idempotencyKey) {
            ProvisioningJobEntity job = new ProvisioningJobEntity();
            job.setTenantId(tenantId);
            job.setIdempotencyKey(idempotencyKey);
            job.setStatus(ProvisioningStatus.QUEUED);
            job.setNextAttemptAt(Instant.now());
            ProvisioningJobEntity saved = repository.save(job);
            eventRecorder.record(saved, null, ProvisioningStatus.QUEUED, null, "Provisioning queued");
            return saved;
    }
}
