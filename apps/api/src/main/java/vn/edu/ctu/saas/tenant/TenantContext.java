package vn.edu.ctu.saas.tenant;

import java.util.Set;
import java.util.UUID;

public record TenantContext(
        UUID userId,
        UUID tenantId,
        String tenantSlug,
        String tier,
        TenantPlacement placement,
        Set<TenantRole> tenantRoles,
        String requestId,
        String correlationId) {

    public boolean hasAnyRole(TenantRole... roles) {
        for (TenantRole role : roles) {
            if (tenantRoles.contains(role)) {
                return true;
            }
        }
        return false;
    }
}

