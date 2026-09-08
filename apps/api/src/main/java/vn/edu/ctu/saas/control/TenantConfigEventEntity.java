package vn.edu.ctu.saas.control;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "tenant_config_events")
public class TenantConfigEventEntity extends ControlEntity {
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;
    @Column(name = "actor_user_id")
    private UUID actorUserId;
    @Column(name = "event_type", nullable = false, length = 80)
    private String eventType;
    @Column(name = "details_json", nullable = false)
    private String detailsJson = "{}";

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getActorUserId() { return actorUserId; }
    public void setActorUserId(UUID actorUserId) { this.actorUserId = actorUserId; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public String getDetailsJson() { return detailsJson; }
    public void setDetailsJson(String detailsJson) { this.detailsJson = detailsJson; }
}
