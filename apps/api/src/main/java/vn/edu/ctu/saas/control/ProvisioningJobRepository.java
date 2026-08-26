package vn.edu.ctu.saas.control;

import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface ProvisioningJobRepository extends JpaRepository<ProvisioningJobEntity, UUID> {
    Optional<ProvisioningJobEntity> findByIdempotencyKey(String idempotencyKey);
    Optional<ProvisioningJobEntity> findTopByTenantIdOrderByCreatedAtDesc(UUID tenantId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select job from ProvisioningJobEntity job where job.id = :id")
    Optional<ProvisioningJobEntity> findByIdForUpdate(UUID id);
}
