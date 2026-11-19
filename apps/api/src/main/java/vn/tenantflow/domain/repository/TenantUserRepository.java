package vn.tenantflow.domain.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.tenantflow.domain.entity.TenantUser;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TenantUserRepository extends JpaRepository<TenantUser, UUID> {
    List<TenantUser> findByEmailIgnoreCase(String email);
    Optional<TenantUser> findByTenantIdAndEmailIgnoreCase(UUID tenantId, String email);
    List<TenantUser> findByTenantIdOrderByCreatedAtAsc(UUID tenantId);
    boolean existsByTenantIdAndEmailIgnoreCase(UUID tenantId, String email);
}
