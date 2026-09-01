package vn.edu.ctu.saas.control;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

public interface TenantMembershipRepository extends JpaRepository<TenantMembershipEntity, UUID> {
    List<TenantMembershipEntity> findAllByUserIdAndActiveTrue(UUID userId);
    List<TenantMembershipEntity> findAllByTenantIdAndActiveTrue(UUID tenantId);
    Optional<TenantMembershipEntity> findByTenantIdAndUserId(UUID tenantId, UUID userId);
    long countByTenantIdAndActiveTrue(UUID tenantId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select membership from TenantMembershipEntity membership "
            + "where membership.tenantId = :tenantId and membership.active = true")
    List<TenantMembershipEntity> lockActiveByTenantId(@Param("tenantId") UUID tenantId);
}
