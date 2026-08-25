package vn.edu.ctu.saas.control;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantPlacementRepository extends JpaRepository<TenantPlacementEntity, UUID> {
    Optional<TenantPlacementEntity> findByTenantId(UUID tenantId);
}

