package vn.edu.ctu.saas.notification;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.control.UserAccountEntity;
import vn.edu.ctu.saas.control.UserAccountRepository;
import vn.edu.ctu.saas.provisioning.TenantDatabaseProvisioner;
import vn.edu.ctu.saas.storage.ResourceDeletionHandler;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;
import vn.edu.ctu.saas.tenant.TenantStatus;

@Component
@Profile("worker")
public class OutboxWorker {
    private static final Logger log = LoggerFactory.getLogger(OutboxWorker.class);
    private static final int MAX_ATTEMPTS = 5;
    private final TenantRepository tenantRepository;
    private final TenantPlacementRepository placementRepository;
    private final TenantMembershipRepository membershipRepository;
    private final UserAccountRepository userRepository;
    private final TenantJdbcExecutor executor;
    private final NotificationDispatcher dispatcher;
    private final ResourceDeletionHandler resourceDeletionHandler;
    private final ObjectMapper objectMapper;

    public OutboxWorker(
            TenantRepository tenantRepository,
            TenantPlacementRepository placementRepository,
            TenantMembershipRepository membershipRepository,
            UserAccountRepository userRepository,
            TenantJdbcExecutor executor,
            NotificationDispatcher dispatcher,
            ResourceDeletionHandler resourceDeletionHandler,
            ObjectMapper objectMapper) {
        this.tenantRepository = tenantRepository;
        this.placementRepository = placementRepository;
        this.membershipRepository = membershipRepository;
        this.userRepository = userRepository;
        this.executor = executor;
        this.dispatcher = dispatcher;
        this.resourceDeletionHandler = resourceDeletionHandler;
        this.objectMapper = objectMapper;
    }

    @Scheduled(fixedDelayString = "${OUTBOX_POLL_INTERVAL:PT3S}")
    public void poll() {
        tenantRepository.findAll().stream()
                .filter(tenant -> tenant.getStatus() == TenantStatus.ACTIVE)
                .forEach(this::processTenantSafely);
    }

    private void processTenantSafely(TenantEntity tenant) {
        TenantPlacementEntity placement = placementRepository.findByTenantId(tenant.getId()).orElse(null);
        if (placement == null) return;
        if (!TenantDatabaseProvisioner.LATEST_APPLICATION_SCHEMA_VERSION.equals(
                placement.getSchemaVersion())) {
            log.debug(
                    "Skipping outbox polling for tenant {} until application schema reaches version {}",
                    tenant.getId(), TenantDatabaseProvisioner.LATEST_APPLICATION_SCHEMA_VERSION);
            return;
        }
        List<TenantMembershipEntity> loadedMemberships =
                membershipRepository.findAllByTenantIdAndActiveTrue(tenant.getId());
        List<TenantMembershipEntity> memberships = loadedMemberships.stream()
                .filter(TenantMembershipEntity::isActive)
                .filter(membership -> tenant.getId().equals(membership.getTenantId()))
                .filter(membership -> membership.getUserId() != null && membership.getRole() != null)
                .toList();
        if (memberships.size() != loadedMemberships.size()) {
            log.warn("Ignored invalid membership rows while polling tenant {}", tenant.getId());
        }
        if (memberships.isEmpty()) return;
        TenantMembershipEntity workerMembership = memberships.getFirst();
        String requestId = "outbox-" + UUID.randomUUID();
        TenantContext context = new TenantContext(
                workerMembership.getUserId(), tenant.getId(), tenant.getSlug(), tenant.getTier(),
                placement.getPlacementType(), Set.of(workerMembership.getRole()), requestId, requestId);
        TenantContextHolder.set(context);
        MDC.put("request_id", requestId);
        MDC.put("correlation_id", requestId);
        MDC.put("tenant_id", tenant.getId().toString());
        MDC.put("placement", placement.getPlacementType().name());
        try {
            for (TenantEvent event : pendingEvents()) {
                processEvent(event, memberships);
            }
        } catch (RuntimeException exception) {
            log.warn("Outbox polling failed for tenant {}", tenant.getId(), exception);
        } finally {
            TenantContextHolder.clear();
            MDC.clear();
        }
    }

    private List<TenantEvent> pendingEvents() {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.read(jdbc -> jdbc.query("""
                SELECT id,tenant_id,actor_user_id,event_type,aggregate_type,aggregate_id,
                       correlation_id,payload_json::text,created_at
                FROM outbox_events
                WHERE tenant_id=? AND processed_at IS NULL AND dead_lettered_at IS NULL
                  AND available_at<=now() AND attempts<?
                ORDER BY created_at LIMIT 25
                """, (rs, rowNum) -> new TenantEvent(
                rs.getObject("id", UUID.class), rs.getObject("tenant_id", UUID.class),
                rs.getObject("actor_user_id", UUID.class), rs.getString("event_type"),
                rs.getString("aggregate_type"), rs.getObject("aggregate_id", UUID.class),
                rs.getString("correlation_id"), rs.getString("payload_json"),
                rs.getTimestamp("created_at").toInstant()), context.tenantId(), MAX_ATTEMPTS));
    }

    private void processEvent(TenantEvent event, List<TenantMembershipEntity> memberships) {
        try {
            TenantContext context = TenantContextHolder.getRequired();
            if (!context.tenantId().equals(event.tenantId())) {
                throw new IllegalArgumentException("Event tenant does not match worker tenant context");
            }
            if (resourceDeletionHandler.supports(event)) {
                resourceDeletionHandler.handle(event);
            } else {
                Set<UUID> recipientUserIds = projectRecipientUserIds(event);
                for (TenantMembershipEntity membership : memberships) {
                    if (membership.getUserId().equals(event.actorUserId())) continue;
                    if (!recipientUserIds.contains(membership.getUserId())) continue;
                    UserAccountEntity recipient = userRepository.findById(membership.getUserId()).orElse(null);
                    if (recipient != null && recipient.isEnabled()) dispatcher.dispatch(event, recipient);
                }
            }
            executor.writeWithoutResult(jdbc -> jdbc.update("""
                    UPDATE outbox_events SET processed_at=now(),updated_at=now(),last_error=NULL
                    WHERE tenant_id=? AND id=? AND processed_at IS NULL
                    """, event.tenantId(), event.id()));
        } catch (RuntimeException exception) {
            String message = exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage();
            if (message.length() > 480) message = message.substring(0, 480);
            String safeMessage = message;
            executor.writeWithoutResult(jdbc -> {
                List<FailureResult> failures = jdbc.query("""
                        UPDATE outbox_events SET attempts=attempts+1,
                            available_at=CAST(? AS timestamptz)
                                + interval '1 second' * power(2,least(attempts,6)),
                            last_error=?,
                            dead_lettered_at=CASE WHEN attempts+1>=? THEN now() ELSE NULL END,
                            updated_at=now()
                        WHERE tenant_id=? AND id=? AND processed_at IS NULL AND dead_lettered_at IS NULL
                        RETURNING aggregate_id,attempts,last_error,dead_lettered_at
                        """, (rs, rowNum) -> new FailureResult(
                        rs.getObject("aggregate_id", UUID.class),
                        rs.getInt("attempts"),
                        rs.getString("last_error"),
                        rs.getTimestamp("dead_lettered_at") == null
                                ? null
                                : rs.getTimestamp("dead_lettered_at").toInstant()),
                        Timestamp.from(Instant.now().plus(1, ChronoUnit.SECONDS)), safeMessage, MAX_ATTEMPTS,
                        event.tenantId(), event.id());
                if (!failures.isEmpty() && failures.getFirst().deadLetteredAt() != null) {
                    FailureResult failure = failures.getFirst();
                    String auditType = resourceDeletionHandler.supports(event)
                            ? "RESOURCE_DELETE_DEAD_LETTERED"
                            : "OUTBOX_EVENT_DEAD_LETTERED";
                    jdbc.update("""
                            INSERT INTO audit_events(
                                id,tenant_id,actor_user_id,event_type,aggregate_type,aggregate_id,
                                correlation_id,details_json)
                            VALUES (?,?,NULL,?,?,?,?,jsonb_build_object(
                                'outboxEventId',?,'attempts',?,'lastError',?))
                            """, UUID.randomUUID(), event.tenantId(), auditType, event.aggregateType(),
                            failure.aggregateId(), event.correlationId(), event.id(),
                            failure.attempts(), failure.lastError());
                }
            });
            log.warn("Outbox event {} failed for tenant {}", event.id(), event.tenantId(), exception);
        }
    }

    private Set<UUID> projectRecipientUserIds(TenantEvent event) {
        UUID projectId = resolveProjectId(event);
        if (projectId == null) return Set.of();
        TenantContext context = TenantContextHolder.getRequired();
        return Set.copyOf(executor.read(jdbc -> jdbc.query(
                "SELECT user_id FROM project_memberships WHERE tenant_id=? AND project_id=?",
                (rs, rowNum) -> rs.getObject(1, UUID.class), context.tenantId(), projectId)));
    }

    private UUID resolveProjectId(TenantEvent event) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.read(jdbc -> switch (event.aggregateType()) {
            case "Project" -> event.aggregateId();
            case "Board" -> jdbc.query(
                    "SELECT project_id FROM boards WHERE tenant_id=? AND id=?",
                    rs -> rs.next() ? rs.getObject(1, UUID.class) : payloadUuid(event, "projectId"),
                    context.tenantId(), event.aggregateId());
            case "BoardColumn" -> jdbc.query("""
                    SELECT b.project_id FROM board_columns c
                    JOIN boards b ON b.tenant_id=c.tenant_id AND b.id=c.board_id
                    WHERE c.tenant_id=? AND c.id=?
                    """, rs -> rs.next()
                    ? rs.getObject(1, UUID.class)
                    : projectIdForBoard(jdbc, context, payloadUuid(event, "boardId")),
                    context.tenantId(), event.aggregateId());
            case "Task" -> jdbc.query(
                    "SELECT project_id FROM tasks WHERE tenant_id=? AND id=?",
                    rs -> rs.next() ? rs.getObject(1, UUID.class) : payloadUuid(event, "projectId"),
                    context.tenantId(), event.aggregateId());
            default -> null;
        });
    }

    private UUID projectIdForBoard(
            org.springframework.jdbc.core.JdbcTemplate jdbc,
            TenantContext context,
            UUID boardId) {
        if (boardId == null) return null;
        return jdbc.query(
                "SELECT project_id FROM boards WHERE tenant_id=? AND id=?",
                rs -> rs.next() ? rs.getObject(1, UUID.class) : null,
                context.tenantId(), boardId);
    }

    private UUID payloadUuid(TenantEvent event, String field) {
        try {
            JsonNode value = objectMapper.readTree(event.payloadJson()).path(field);
            return value.isMissingNode() || value.isNull() || value.asText().isBlank()
                    ? null
                    : UUID.fromString(value.asText());
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException("Invalid tenant event payload", exception);
        }
    }

    private record FailureResult(UUID aggregateId, int attempts, String lastError, Instant deadLetteredAt) {}
}
