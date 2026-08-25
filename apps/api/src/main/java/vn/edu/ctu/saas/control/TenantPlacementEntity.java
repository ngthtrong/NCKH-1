package vn.edu.ctu.saas.control;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;
import vn.edu.ctu.saas.tenant.TenantPlacement;

@Entity
@Table(name = "tenant_placements")
public class TenantPlacementEntity extends ControlEntity {
    @Column(name = "tenant_id", nullable = false, unique = true)
    private UUID tenantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "placement_type", nullable = false, length = 40)
    private TenantPlacement placementType;

    @Column(name = "database_host", length = 255)
    private String databaseHost;

    @Column(name = "database_port")
    private Integer databasePort;

    @Column(name = "database_name", length = 63)
    private String databaseName;

    @Column(name = "database_username", length = 63)
    private String databaseUsername;

    @Column(name = "encrypted_password", length = 1000)
    private String encryptedPassword;

    @Column(name = "schema_version", length = 50)
    private String schemaVersion;

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public TenantPlacement getPlacementType() { return placementType; }
    public void setPlacementType(TenantPlacement placementType) { this.placementType = placementType; }
    public String getDatabaseHost() { return databaseHost; }
    public void setDatabaseHost(String databaseHost) { this.databaseHost = databaseHost; }
    public Integer getDatabasePort() { return databasePort; }
    public void setDatabasePort(Integer databasePort) { this.databasePort = databasePort; }
    public String getDatabaseName() { return databaseName; }
    public void setDatabaseName(String databaseName) { this.databaseName = databaseName; }
    public String getDatabaseUsername() { return databaseUsername; }
    public void setDatabaseUsername(String databaseUsername) { this.databaseUsername = databaseUsername; }
    public String getEncryptedPassword() { return encryptedPassword; }
    public void setEncryptedPassword(String encryptedPassword) { this.encryptedPassword = encryptedPassword; }
    public String getSchemaVersion() { return schemaVersion; }
    public void setSchemaVersion(String schemaVersion) { this.schemaVersion = schemaVersion; }
}

