package vn.edu.ctu.saas.control;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantMembershipRepository extends JpaRepository<TenantMembershipEntity, UUID> {
    List<TenantMembershipEntity> findAllByUserIdAndActiveTrue(UUID userId);
    List<TenantMembershipEntity> findAllByTenantIdAndActiveTrue(UUID tenantId);
    Optional<TenantMembershipEntity> findByTenantIdAndUserId(UUID tenantId, UUID userId);
    long countByTenantIdAndActiveTrue(UUID tenantId);
}
