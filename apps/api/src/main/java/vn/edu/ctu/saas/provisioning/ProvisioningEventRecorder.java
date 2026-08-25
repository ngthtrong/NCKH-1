package vn.edu.ctu.saas.provisioning;

import org.springframework.stereotype.Component;
import vn.edu.ctu.saas.control.ProvisioningEventEntity;
import vn.edu.ctu.saas.control.ProvisioningEventRepository;
import vn.edu.ctu.saas.control.ProvisioningJobEntity;
import vn.edu.ctu.saas.control.ProvisioningStatus;

@Component
public class ProvisioningEventRecorder {
    private final ProvisioningEventRepository repository;

    public ProvisioningEventRecorder(ProvisioningEventRepository repository) {
        this.repository = repository;
    }

    public void record(
            ProvisioningJobEntity job,
            ProvisioningStatus from,
            ProvisioningStatus to,
            String errorCode,
            String message) {
        ProvisioningEventEntity event = new ProvisioningEventEntity();
        event.setProvisioningJobId(job.getId());
        event.setTenantId(job.getTenantId());
        event.setFromStatus(from);
        event.setToStatus(to);
        event.setAttempt(job.getAttempts());
        event.setErrorCode(errorCode);
        event.setMessage(truncate(message));
        repository.save(event);
    }

    private String truncate(String value) {
        if (value == null || value.length() <= 500) return value;
        return value.substring(0, 500);
    }
}
