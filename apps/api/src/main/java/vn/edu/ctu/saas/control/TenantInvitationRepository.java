package vn.edu.ctu.saas.control;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import vn.edu.ctu.saas.tenant.TenantInvitationStatus;

public interface TenantInvitationRepository extends JpaRepository<TenantInvitationEntity, UUID> {
    Optional<TenantInvitationEntity> findByTokenHash(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select invitation from TenantInvitationEntity invitation where invitation.tokenHash = :tokenHash")
    Optional<TenantInvitationEntity> lockByTokenHash(@Param("tokenHash") String tokenHash);
    List<TenantInvitationEntity> findAllByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    Optional<TenantInvitationEntity> findTopByTenantIdAndEmailAndStatusOrderByCreatedAtDesc(
            UUID tenantId, String email, TenantInvitationStatus status);
}
