package vn.edu.ctu.saas.control;

import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface TenantSessionGrantRepository extends JpaRepository<TenantSessionGrantEntity, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<TenantSessionGrantEntity> findByCodeHash(String codeHash);
}
