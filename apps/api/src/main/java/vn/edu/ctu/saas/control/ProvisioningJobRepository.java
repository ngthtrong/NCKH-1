package vn.edu.ctu.saas.control;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProvisioningJobRepository extends JpaRepository<ProvisioningJobEntity, UUID> {
    Optional<ProvisioningJobEntity> findByIdempotencyKey(String idempotencyKey);
    Optional<ProvisioningJobEntity> findTopByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    List<ProvisioningJobEntity> findTop10ByStatusInAndNextAttemptAtBeforeOrderByCreatedAt(
            Collection<ProvisioningStatus> statuses, Instant now);
}
