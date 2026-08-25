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
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.control.UserAccountEntity;
import vn.edu.ctu.saas.control.UserAccountRepository;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;
import vn.edu.ctu.saas.tenant.TenantStatus;

@Component
@Profile("worker")
public class OutboxWorker {
    private static final Logger log = LoggerFactory.getLogger(OutboxWorker.class);
    private final TenantRepository tenantRepository;
    private final TenantPlacementRepository placementRepository;
    private final TenantMembershipRepository membershipRepository;
    private final UserAccountRepository userRepository;
    private final TenantJdbcExecutor executor;
    private final NotificationDispatcher dispatcher;

    public OutboxWorker(
            TenantRepository tenantRepository,
            TenantPlacementRepository placementRepository,
            TenantMembershipRepository membershipRepository,
            UserAccountRepository userRepository,
            TenantJdbcExecutor executor,
            NotificationDispatcher dispatcher) {
        this.tenantRepository = tenantRepository;
        this.placementRepository = placementRepository;
        this.membershipRepository = membershipRepository;
        this.userRepository = userRepository;
        this.executor = executor;
        this.dispatcher = dispatcher;
    }

    @Scheduled(fixedDelayString = "${OUTBOX_POLL_INTERVAL:PT3S}")
    public void poll() {
        tenantRepository.findAll().stream()
                .filter(tenant -> tenant.getStatus() == TenantStatus.ACTIVE)
                .forEach(this::processTenantSafely);
    }

    private void processTenantSafely(TenantEntity tenant) {
        List<TenantMembershipEntity> memberships =
                membershipRepository.findAllByTenantIdAndActiveTrue(tenant.getId());
        if (memberships.isEmpty()) return;
        TenantPlacementEntity placement = placementRepository.findByTenantId(tenant.getId()).orElse(null);
        if (placement == null) return;
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
                WHERE tenant_id=? AND processed_at IS NULL AND available_at<=now() AND attempts<5
                ORDER BY created_at LIMIT 25
                """, (rs, rowNum) -> new TenantEvent(
                rs.getObject("id", UUID.class), rs.getObject("tenant_id", UUID.class),
                rs.getObject("actor_user_id", UUID.class), rs.getString("event_type"),
                rs.getString("aggregate_type"), rs.getObject("aggregate_id", UUID.class),
                rs.getString("correlation_id"), rs.getString("payload_json"),
                rs.getTimestamp("created_at").toInstant()), context.tenantId()));
    }

    private void processEvent(TenantEvent event, List<TenantMembershipEntity> memberships) {
        try {
            for (TenantMembershipEntity membership : memberships) {
                if (membership.getUserId().equals(event.actorUserId())) continue;
                UserAccountEntity recipient = userRepository.findById(membership.getUserId()).orElse(null);
                if (recipient != null && recipient.isEnabled()) dispatcher.dispatch(event, recipient);
            }
            executor.writeWithoutResult(jdbc -> jdbc.update("""
                    UPDATE outbox_events SET processed_at=now(),updated_at=now(),last_error=NULL
                    WHERE tenant_id=? AND id=? AND processed_at IS NULL
                    """, event.tenantId(), event.id()));
        } catch (RuntimeException exception) {
            String message = exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage();
            if (message.length() > 480) message = message.substring(0, 480);
            String safeMessage = message;
            executor.writeWithoutResult(jdbc -> jdbc.update("""
                    UPDATE outbox_events SET attempts=attempts+1,
                        available_at=? + interval '1 second' * power(2,least(attempts,6)),
                        last_error=?,updated_at=now()
                    WHERE tenant_id=? AND id=? AND processed_at IS NULL
                    """, Timestamp.from(Instant.now().plus(1, ChronoUnit.SECONDS)), safeMessage,
                    event.tenantId(), event.id()));
            log.warn("Outbox event {} failed for tenant {}", event.id(), event.tenantId(), exception);
        }
    }
}
