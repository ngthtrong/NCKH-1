package vn.edu.ctu.saas.control;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import vn.edu.ctu.saas.tenant.TenantStatus;

@Entity
@Table(name = "tenants")
public class TenantEntity extends ControlEntity {
    @Column(nullable = false, unique = true, length = 63)
    private String slug;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, length = 40)
    private String tier;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TenantStatus status;

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getTier() { return tier; }
    public void setTier(String tier) { this.tier = tier; }
    public TenantStatus getStatus() { return status; }
    public void setStatus(TenantStatus status) { this.status = status; }
}

