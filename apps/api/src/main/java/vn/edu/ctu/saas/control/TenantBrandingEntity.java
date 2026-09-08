package vn.edu.ctu.saas.control;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "tenant_branding")
public class TenantBrandingEntity extends ControlEntity {
    @Column(name = "tenant_id", nullable = false, unique = true)
    private UUID tenantId;
    @Column(name = "primary_color", nullable = false, length = 7)
    private String primaryColor = "#4F46E5";
    @Column(name = "accent_color", nullable = false, length = 7)
    private String accentColor = "#0EA5E9";
    @Column(name = "logo_storage_key", length = 1000)
    private String logoStorageKey;
    @Column(name = "logo_content_type", length = 100)
    private String logoContentType;
    @Column(nullable = false)
    private long version;

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getPrimaryColor() { return primaryColor; }
    public void setPrimaryColor(String primaryColor) { this.primaryColor = primaryColor; }
    public String getAccentColor() { return accentColor; }
    public void setAccentColor(String accentColor) { this.accentColor = accentColor; }
    public String getLogoStorageKey() { return logoStorageKey; }
    public void setLogoStorageKey(String logoStorageKey) { this.logoStorageKey = logoStorageKey; }
    public String getLogoContentType() { return logoContentType; }
    public void setLogoContentType(String logoContentType) { this.logoContentType = logoContentType; }
    public long getVersion() { return version; }
    public void setVersion(long version) { this.version = version; }
}
