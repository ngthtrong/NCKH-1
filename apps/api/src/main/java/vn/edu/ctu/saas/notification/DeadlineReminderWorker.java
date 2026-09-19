package vn.edu.ctu.saas.notification;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.provisioning.TenantDatabaseProvisioner;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantStatus;

@Component
@Profile("worker")
public class DeadlineReminderWorker {
    private static final Logger log = LoggerFactory.getLogger(DeadlineReminderWorker.class);

    private final TenantRepository tenants;
    private final TenantPlacementRepository placements;
    private final TenantMembershipRepository memberships;
    private final DeadlineReminderService reminders;
    private final Duration leadTime;

    public DeadlineReminderWorker(
            TenantRepository tenants,
            TenantPlacementRepository placements,
            TenantMembershipRepository memberships,
            DeadlineReminderService reminders,
            @Value("${DEADLINE_REMINDER_LEAD:PT24H}") Duration leadTime) {
        this.tenants = tenants;
        this.placements = placements;
        this.memberships = memberships;
        this.reminders = reminders;
        if (leadTime.isNegative() || leadTime.isZero()) {
            throw new IllegalArgumentException("DEADLINE_REMINDER_LEAD must be positive");
        }
        this.leadTime = leadTime;
    }

    @Scheduled(
            initialDelayString = "${DEADLINE_REMINDER_INITIAL_DELAY:PT15S}",
            fixedDelayString = "${DEADLINE_REMINDER_POLL_INTERVAL:PT1M}")
    public void poll() {
        tenants.findAll().stream()
                .filter(tenant -> tenant.getStatus() == TenantStatus.ACTIVE)
                .forEach(this::processTenantSafely);
    }

    private void processTenantSafely(TenantEntity tenant) {
        TenantPlacementEntity placement = placements.findByTenantId(tenant.getId()).orElse(null);
        if (placement == null || !TenantDatabaseProvisioner.LATEST_APPLICATION_SCHEMA_VERSION.equals(
                placement.getSchemaVersion())) {
            return;
        }
        List<TenantMembershipEntity> activeMemberships = memberships
                .findAllByTenantIdAndActiveTrue(tenant.getId()).stream()
                .filter(TenantMembershipEntity::isActive)
                .filter(membership -> tenant.getId().equals(membership.getTenantId()))
                .filter(membership -> membership.getUserId() != null && membership.getRole() != null)
                .toList();
        if (activeMemberships.isEmpty()) return;

        TenantMembershipEntity workerMembership = activeMemberships.getFirst();
        String requestId = "deadline-" + UUID.randomUUID();
        TenantContext context = new TenantContext(
                workerMembership.getUserId(), tenant.getId(), tenant.getSlug(), tenant.getTier(),
                placement.getPlacementType(), Set.of(workerMembership.getRole()), requestId, requestId);
        TenantContextHolder.set(context);
        MDC.put("request_id", requestId);
        MDC.put("correlation_id", requestId);
        MDC.put("tenant_id", tenant.getId().toString());
        MDC.put("placement", placement.getPlacementType().name());
        try {
            int queued = reminders.enqueueDueReminders(Instant.now(), leadTime);
            if (queued > 0) log.info("Queued {} deadline reminder(s) for tenant {}", queued, tenant.getId());
        } catch (RuntimeException exception) {
            log.warn("Deadline reminder polling failed for tenant {}", tenant.getId(), exception);
        } finally {
            TenantContextHolder.clear();
            MDC.clear();
        }
    }
}
