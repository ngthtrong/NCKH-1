package vn.edu.ctu.saas.control;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import vn.edu.ctu.saas.customization.TenantCapability;

@Entity
@Table(name = "tenant_capabilities")
public class TenantCapabilityEntity extends ControlEntity {
    @Column(name = "tenant_id", nullable = false)
    private java.util.UUID tenantId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TenantCapability capability;

    @Column(nullable = false)
    private boolean granted = true;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(nullable = false)
    private long version;

    public java.util.UUID getTenantId() { return tenantId; }
    public void setTenantId(java.util.UUID tenantId) { this.tenantId = tenantId; }
    public TenantCapability getCapability() { return capability; }
    public void setCapability(TenantCapability capability) { this.capability = capability; }
    public boolean isGranted() { return granted; }
    public void setGranted(boolean granted) { this.granted = granted; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public long getVersion() { return version; }
    public void setVersion(long version) { this.version = version; }
}
