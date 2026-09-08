package vn.edu.ctu.saas.control;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantConfigEventRepository extends JpaRepository<TenantConfigEventEntity, UUID> {}
