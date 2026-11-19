package vn.tenantflow.security;

import java.util.UUID;

public record TenantInfo(
        UUID tenantId,
        String slug,
        UUID userId,
        String email,
        String fullName,
        String role,
        String tier,
        boolean systemAdmin
) {
    public boolean isTenantAdmin() {
        return "TENANT_ADMIN".equals(role);
    }
}
