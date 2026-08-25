package vn.edu.ctu.saas.audit;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import vn.edu.ctu.saas.control.UserAccountRepository;
import vn.edu.ctu.saas.tenant.TenantAccessDeniedException;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;
import vn.edu.ctu.saas.tenant.TenantRole;

@Service
public class AuditService {
    private final TenantJdbcExecutor executor;
    private final UserAccountRepository userRepository;

    public AuditService(TenantJdbcExecutor executor, UserAccountRepository userRepository) {
        this.executor = executor;
        this.userRepository = userRepository;
    }

    public List<AuditView> recent(int requestedLimit) {
        TenantContext context = TenantContextHolder.getRequired();
        if (!context.hasAnyRole(TenantRole.OWNER, TenantRole.ADMIN)) {
            throw new TenantAccessDeniedException("Tenant administrator role is required to view audit events");
        }
        int limit = Math.min(200, Math.max(1, requestedLimit));
        List<RawAudit> rows = executor.read(jdbc -> jdbc.query("""
                SELECT id,actor_user_id,event_type,aggregate_type,aggregate_id,correlation_id,details_json::text,created_at
                FROM audit_events WHERE tenant_id=? ORDER BY created_at DESC LIMIT ?
                """, (rs, rowNum) -> new RawAudit(
                rs.getObject("id", UUID.class), rs.getObject("actor_user_id", UUID.class),
                rs.getString("event_type"), rs.getString("aggregate_type"),
                rs.getObject("aggregate_id", UUID.class), rs.getString("correlation_id"),
                rs.getString("details_json"), rs.getTimestamp("created_at").toInstant()),
                context.tenantId(), limit));
        return rows.stream().map(row -> new AuditView(
                row.id(), row.actorUserId(), actorName(row.actorUserId()), row.eventType(), row.aggregateType(),
                row.aggregateId(), row.correlationId(), row.detailsJson(), row.occurredAt())).toList();
    }

    private String actorName(UUID actorId) {
        if (actorId == null) return "System";
        return userRepository.findById(actorId).map(user -> user.getDisplayName()).orElse("Unknown user");
    }

    private record RawAudit(
            UUID id, UUID actorUserId, String eventType, String aggregateType, UUID aggregateId,
            String correlationId, String detailsJson, Instant occurredAt) {}

    public record AuditView(
            UUID id, UUID actorUserId, String actorName, String action, String aggregateType,
            UUID aggregateId, String correlationId, String detailsJson, Instant occurredAt) {}
}
