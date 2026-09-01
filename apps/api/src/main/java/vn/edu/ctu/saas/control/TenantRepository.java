package vn.edu.ctu.saas.control;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.ctu.saas.tenant.TenantPlacement;
import vn.edu.ctu.saas.tenant.TenantStatus;

public interface TenantRepository extends JpaRepository<TenantEntity, UUID> {
    Optional<TenantEntity> findBySlug(String slug);
    boolean existsBySlug(String slug);
    long countByStatus(TenantStatus status);
    Page<TenantEntity> findByNameContainingIgnoreCaseOrSlugContainingIgnoreCase(
            String name, String slug, Pageable pageable);

    @Query("""
            SELECT t FROM TenantEntity t
            WHERE (:search = '' OR lower(t.name) LIKE lower(concat('%',:search,'%'))
                   OR lower(t.slug) LIKE lower(concat('%',:search,'%')))
              AND (:status IS NULL OR t.status=:status)
              AND (:placement IS NULL OR EXISTS (
                    SELECT p.id FROM TenantPlacementEntity p
                    WHERE p.tenantId=t.id AND p.placementType=:placement))
            """)
    Page<TenantEntity> searchForAdmin(
            @Param("search") String search,
            @Param("status") TenantStatus status,
            @Param("placement") TenantPlacement placement,
            Pageable pageable);
}
