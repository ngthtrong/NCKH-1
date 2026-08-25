package vn.edu.ctu.saas.control;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "provisioning_events")
public class ProvisioningEventEntity extends ControlEntity {
    @Column(name = "provisioning_job_id", nullable = false)
    private UUID provisioningJobId;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 40)
    private ProvisioningStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 40)
    private ProvisioningStatus toStatus;

    @Column(nullable = false)
    private int attempt;

    @Column(name = "error_code", length = 80)
    private String errorCode;

    @Column(length = 500)
    private String message;

    public UUID getProvisioningJobId() { return provisioningJobId; }
    public void setProvisioningJobId(UUID provisioningJobId) { this.provisioningJobId = provisioningJobId; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public ProvisioningStatus getFromStatus() { return fromStatus; }
    public void setFromStatus(ProvisioningStatus fromStatus) { this.fromStatus = fromStatus; }
    public ProvisioningStatus getToStatus() { return toStatus; }
    public void setToStatus(ProvisioningStatus toStatus) { this.toStatus = toStatus; }
    public int getAttempt() { return attempt; }
    public void setAttempt(int attempt) { this.attempt = attempt; }
    public String getErrorCode() { return errorCode; }
    public void setErrorCode(String errorCode) { this.errorCode = errorCode; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
