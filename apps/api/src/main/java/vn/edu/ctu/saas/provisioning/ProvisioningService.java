package vn.edu.ctu.saas.provisioning;

import java.util.UUID;
import vn.edu.ctu.saas.control.ProvisioningJobEntity;

public interface ProvisioningService {
    ProvisioningJobEntity enqueue(UUID tenantId, String idempotencyKey);
}

