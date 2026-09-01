package vn.edu.ctu.saas.control;

import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransactionEntity, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PaymentTransactionEntity> findByProviderReference(String reference);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PaymentTransactionEntity> findByIdempotencyKey(String idempotencyKey);
    Optional<PaymentTransactionEntity> findTopByTenantIdOrderByCreatedAtDesc(UUID tenantId);
}
