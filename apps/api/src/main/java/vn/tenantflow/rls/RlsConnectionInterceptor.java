package vn.tenantflow.rls;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import vn.tenantflow.security.TenantContext;
import vn.tenantflow.security.TenantInfo;

@Aspect
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class RlsConnectionInterceptor {

    @PersistenceContext
    private EntityManager entityManager;

    @Before("@annotation(org.springframework.transaction.annotation.Transactional) || @within(org.springframework.transaction.annotation.Transactional)")
    public void applyTenantRlsContext() {
        TenantInfo info = TenantContext.get();
        if (info != null && info.tenantId() != null) {
            entityManager.createNativeQuery("SELECT set_config('app.current_tenant_id', :tenantId, true)")
                    .setParameter("tenantId", info.tenantId().toString())
                    .getSingleResult();
        }
    }
}
