package vn.edu.ctu.saas.control;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProvisioningEventRepository extends JpaRepository<ProvisioningEventEntity, UUID> {
    List<ProvisioningEventEntity> findAllByProvisioningJobIdOrderByCreatedAt(UUID provisioningJobId);
}
