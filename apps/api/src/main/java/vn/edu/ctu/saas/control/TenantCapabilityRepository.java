package vn.edu.ctu.saas.control;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.ctu.saas.customization.TenantCapability;

public interface TenantCapabilityRepository extends JpaRepository<TenantCapabilityEntity, UUID> {
    List<TenantCapabilityEntity> findAllByTenantId(UUID tenantId);
    Optional<TenantCapabilityEntity> findByTenantIdAndCapability(UUID tenantId, TenantCapability capability);
}
