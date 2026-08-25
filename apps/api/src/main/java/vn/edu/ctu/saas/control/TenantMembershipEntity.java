package vn.edu.ctu.saas.control;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.util.UUID;
import vn.edu.ctu.saas.tenant.TenantRole;

@Entity
@Table(name = "tenant_memberships", uniqueConstraints = @UniqueConstraint(columnNames = {"tenant_id", "user_id"}))
public class TenantMembershipEntity extends ControlEntity {
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TenantRole role;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "security_version", nullable = false)
    private long securityVersion = 1;

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public TenantRole getRole() { return role; }
    public void setRole(TenantRole role) { this.role = role; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public long getSecurityVersion() { return securityVersion; }
    public void setSecurityVersion(long securityVersion) { this.securityVersion = securityVersion; }
}

