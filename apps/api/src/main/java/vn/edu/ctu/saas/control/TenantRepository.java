package vn.edu.ctu.saas.control;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.ctu.saas.tenant.TenantStatus;

public interface TenantRepository extends JpaRepository<TenantEntity, UUID> {
    Optional<TenantEntity> findBySlug(String slug);
    boolean existsBySlug(String slug);
    long countByStatus(TenantStatus status);
    Page<TenantEntity> findByNameContainingIgnoreCaseOrSlugContainingIgnoreCase(
            String name, String slug, Pageable pageable);
}
