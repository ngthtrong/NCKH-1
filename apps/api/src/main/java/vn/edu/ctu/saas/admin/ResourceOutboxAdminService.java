package vn.edu.ctu.saas.admin;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.common.NotFoundException;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.storage.ResourceDeletionHandler;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;
import vn.edu.ctu.saas.tenant.TenantStatus;

@Service
public class ResourceOutboxAdminService {
    private final TenantRepository tenantRepository;
    private final TenantPlacementRepository placementRepository;
    private final TenantJdbcExecutor executor;

    public ResourceOutboxAdminService(
            TenantRepository tenantRepository,
            TenantPlacementRepository placementRepository,
            TenantJdbcExecutor executor) {
        this.tenantRepository = tenantRepository;
        this.placementRepository = placementRepository;
        this.executor = executor;
    }

    public DeadLetterPage deadLetters(UUID tenantId, UUID adminUserId, int page, int size) {
        TenantTarget target = target(tenantId);
        int safePage = Math.max(0, page);
        int safeSize = Math.min(100, Math.max(1, size));
        long offset = (long) safePage * safeSize;
        return withinTenant(target, adminUserId, () -> executor.read(jdbc -> {
            Long total = jdbc.queryForObject("""
                    SELECT count(*) FROM outbox_events
                    WHERE tenant_id=? AND event_type=? AND processed_at IS NULL
                      AND dead_lettered_at IS NOT NULL
                    """, Long.class, tenantId, ResourceDeletionHandler.EVENT_TYPE);
            List<ResourceDeadLetterView> items = jdbc.query("""
                    SELECT id,aggregate_id,attempts,last_error,dead_lettered_at,created_at,
                           requeue_count,last_requeued_at
                    FROM outbox_events
                    WHERE tenant_id=? AND event_type=? AND processed_at IS NULL
                      AND dead_lettered_at IS NOT NULL
                    ORDER BY dead_lettered_at DESC,id
                    LIMIT ? OFFSET ?
                    """, (rs, rowNum) -> new ResourceDeadLetterView(
                    rs.getObject("id", UUID.class),
                    tenantId,
                    rs.getObject("aggregate_id", UUID.class),
                    rs.getInt("attempts"),
                    rs.getString("last_error"),
                    rs.getTimestamp("dead_lettered_at").toInstant(),
                    rs.getTimestamp("created_at").toInstant(),
                    rs.getInt("requeue_count"),
                    rs.getTimestamp("last_requeued_at") == null
                            ? null
                            : rs.getTimestamp("last_requeued_at").toInstant()),
                    tenantId, ResourceDeletionHandler.EVENT_TYPE, safeSize, offset);
            long totalItems = total == null ? 0 : total;
            int totalPages = totalItems == 0 ? 0 : (int) ((totalItems + safeSize - 1) / safeSize);
            return new DeadLetterPage(items, safePage, safeSize, totalItems, totalPages);
        }));
    }

    public void requeue(UUID tenantId, UUID eventId, UUID adminUserId) {
        TenantTarget target = target(tenantId);
        withinTenant(target, adminUserId, () -> executor.write(jdbc -> {
            List<DeadLetterRecord> records = jdbc.query("""
                    SELECT aggregate_id,attempts,last_error,dead_lettered_at,requeue_count
                    FROM outbox_events
                    WHERE tenant_id=? AND id=? AND event_type=? AND processed_at IS NULL
                      AND dead_lettered_at IS NOT NULL
                    FOR UPDATE
                    """, (rs, rowNum) -> new DeadLetterRecord(
                    rs.getObject("aggregate_id", UUID.class),
                    rs.getInt("attempts"),
                    rs.getString("last_error"),
                    rs.getTimestamp("dead_lettered_at").toInstant(),
                    rs.getInt("requeue_count")),
                    tenantId, eventId, ResourceDeletionHandler.EVENT_TYPE);
            if (records.isEmpty()) {
                throw new NotFoundException("Resource cleanup dead letter not found");
            }
            DeadLetterRecord record = records.getFirst();
            jdbc.update("""
                    UPDATE outbox_events SET attempts=0,available_at=now(),last_error=NULL,
                        dead_lettered_at=NULL,requeue_count=requeue_count+1,last_requeued_at=now(),updated_at=now()
                    WHERE tenant_id=? AND id=? AND event_type=? AND processed_at IS NULL
                      AND dead_lettered_at IS NOT NULL
                    """, tenantId, eventId, ResourceDeletionHandler.EVENT_TYPE);
            TenantContext context = TenantContextHolder.getRequired();
            jdbc.update("""
                    INSERT INTO audit_events(
                        id,tenant_id,actor_user_id,event_type,aggregate_type,aggregate_id,
                        correlation_id,details_json)
                    VALUES (?,?,?,?,?,?,?,jsonb_build_object(
                        'outboxEventId',?,'previousAttempts',?,'previousLastError',?,
                        'previousDeadLetteredAt',?,'requeueCount',?))
                    """, UUID.randomUUID(), tenantId, adminUserId, "RESOURCE_DELETE_REQUEUED",
                    "RESOURCE", record.resourceId(), context.correlationId(), eventId,
                    record.attempts(), record.lastError(), record.deadLetteredAt().toString(),
                    record.requeueCount() + 1);
            return null;
        }));
    }

    private TenantTarget target(UUID tenantId) {
        TenantEntity tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NotFoundException("Tenant not found"));
        if (tenant.getStatus() != TenantStatus.ACTIVE) {
            throw new ConflictException("Tenant must be active to access resource cleanup dead letters");
        }
        TenantPlacementEntity placement = placementRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new NotFoundException("Tenant placement not found"));
        return new TenantTarget(tenant, placement);
    }

    private <T> T withinTenant(TenantTarget target, UUID adminUserId, Supplier<T> operation) {
        TenantContext previous = TenantContextHolder.getNullable();
        String requestId = MDC.get("request_id");
        if (requestId == null) requestId = "admin-resource-outbox-" + UUID.randomUUID();
        String correlationId = MDC.get("correlation_id");
        if (correlationId == null) correlationId = requestId;
        TenantEntity tenant = target.tenant();
        TenantContextHolder.set(new TenantContext(
                adminUserId, tenant.getId(), tenant.getSlug(), tenant.getTier(),
                target.placement().getPlacementType(), Set.of(), requestId, correlationId));
        try {
            return operation.get();
        } finally {
            if (previous == null) TenantContextHolder.clear();
            else TenantContextHolder.set(previous);
        }
    }

    private record TenantTarget(TenantEntity tenant, TenantPlacementEntity placement) {}

    private record DeadLetterRecord(
            UUID resourceId,
            int attempts,
            String lastError,
            Instant deadLetteredAt,
            int requeueCount) {}

    public record ResourceDeadLetterView(
            UUID id,
            UUID tenantId,
            UUID resourceId,
            int attempts,
            String lastError,
            Instant deadLetteredAt,
            Instant createdAt,
            int requeueCount,
            Instant lastRequeuedAt) {}

    public record DeadLetterPage(
            List<ResourceDeadLetterView> items,
            int page,
            int size,
            long totalItems,
            int totalPages) {}
}
