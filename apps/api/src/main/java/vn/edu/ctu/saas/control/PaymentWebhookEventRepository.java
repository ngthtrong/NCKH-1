package vn.edu.ctu.saas.control;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentWebhookEventRepository extends JpaRepository<PaymentWebhookEventEntity, UUID> {
    Optional<PaymentWebhookEventEntity> findByProviderAndProviderEventId(String provider, String providerEventId);
}
