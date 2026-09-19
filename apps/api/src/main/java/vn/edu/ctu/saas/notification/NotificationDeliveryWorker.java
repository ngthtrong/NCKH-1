package vn.edu.ctu.saas.notification;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
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
import vn.edu.ctu.saas.provisioning.TenantDatabaseProvisioner;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;
import vn.edu.ctu.saas.tenant.TenantStatus;

@Component
@Profile("worker")
public class NotificationDeliveryWorker {
    private static final Logger log = LoggerFactory.getLogger(NotificationDeliveryWorker.class);
    private static final int MAX_ATTEMPTS = 5;
    private static final int MAX_DELIVERIES_PER_POLL = 25;

    private final TenantRepository tenants;
    private final TenantPlacementRepository placements;
    private final TenantMembershipRepository memberships;
    private final UserAccountRepository users;
    private final TenantJdbcExecutor executor;
    private final JavaMailSender mailSender;
    private final String tenantUrlTemplate;

    public NotificationDeliveryWorker(
            TenantRepository tenants,
            TenantPlacementRepository placements,
            TenantMembershipRepository memberships,
            UserAccountRepository users,
            TenantJdbcExecutor executor,
            JavaMailSender mailSender,
            @Value("${PUBLIC_TENANT_URL_TEMPLATE:http://%s.localhost:8080}") String tenantUrlTemplate) {
        this.tenants = tenants;
        this.placements = placements;
        this.memberships = memberships;
        this.users = users;
        this.executor = executor;
        this.mailSender = mailSender;
        this.tenantUrlTemplate = tenantUrlTemplate;
    }

    @Scheduled(
            initialDelayString = "${NOTIFICATION_DELIVERY_INITIAL_DELAY:PT20S}",
            fixedDelayString = "${NOTIFICATION_DELIVERY_POLL_INTERVAL:PT10S}")
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
        Set<UUID> activeUserIds = activeMemberships.stream()
                .map(TenantMembershipEntity::getUserId)
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
        String requestId = "delivery-" + UUID.randomUUID();
        TenantContext context = new TenantContext(
                workerMembership.getUserId(), tenant.getId(), tenant.getSlug(), tenant.getTier(),
                placement.getPlacementType(), Set.of(workerMembership.getRole()), requestId, requestId);
        TenantContextHolder.set(context);
        MDC.put("request_id", requestId);
        MDC.put("correlation_id", requestId);
        MDC.put("tenant_id", tenant.getId().toString());
        MDC.put("placement", placement.getPlacementType().name());
        try {
            for (int index = 0; index < MAX_DELIVERIES_PER_POLL; index++) {
                Delivery delivery = claimPending();
                if (delivery == null) break;
                deliver(tenant, delivery, activeUserIds);
            }
        } catch (RuntimeException exception) {
            log.warn("Notification delivery polling failed for tenant {}", tenant.getId(), exception);
        } finally {
            TenantContextHolder.clear();
            MDC.clear();
        }
    }

    private Delivery claimPending() {
        TenantContext context = TenantContextHolder.getRequired();
        Timestamp leaseUntil = Timestamp.from(Instant.now().plusSeconds(60));
        return executor.write(jdbc -> {
            List<Delivery> claimed = jdbc.query("""
                WITH candidate AS (
                    SELECT id
                    FROM notification_delivery_attempts
                    WHERE tenant_id=? AND channel='EMAIL' AND status='PENDING'
                      AND dead_lettered_at IS NULL AND available_at<=now() AND attempt_count<?
                    ORDER BY available_at,attempted_at,id
                    FOR UPDATE SKIP LOCKED
                    LIMIT 1
                )
                UPDATE notification_delivery_attempts delivery
                SET attempt_count=delivery.attempt_count+1,
                    attempted_at=now(),available_at=?,updated_at=now()
                FROM candidate
                WHERE delivery.tenant_id=? AND delivery.id=candidate.id
                RETURNING delivery.id,delivery.notification_id,delivery.attempt_count
                """, (rs, rowNum) -> new Delivery(
                rs.getObject("id", UUID.class),
                rs.getObject("notification_id", UUID.class),
                rs.getInt("attempt_count")),
                context.tenantId(), MAX_ATTEMPTS, leaseUntil, context.tenantId());
            return claimed.isEmpty() ? null : claimed.getFirst();
        });
    }

    private void deliver(TenantEntity tenant, Delivery delivery, Set<UUID> activeUserIds) {
        NotificationMail mail = loadMail(delivery.notificationId());
        if (mail == null || !activeUserIds.contains(mail.recipientUserId())) {
            skipDelivery(delivery.id(), "RECIPIENT_INACTIVE", "Recipient is no longer an active tenant member");
            return;
        }
        if (!mail.emailEnabled()) {
            skipDelivery(delivery.id(), "DISABLED_BY_USER", "Email notifications are disabled");
            return;
        }
        UserAccountEntity recipient = users.findById(mail.recipientUserId()).orElse(null);
        if (recipient == null || !recipient.isEnabled()) {
            skipDelivery(delivery.id(), "RECIPIENT_INACTIVE", "Recipient account is unavailable");
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(recipient.getEmail());
            message.setSubject("[NCKH SaaS] " + mail.title());
            message.setText(emailBody(tenant, mail));
            mailSender.send(message);
            executor.writeWithoutResult(jdbc -> jdbc.update("""
                    UPDATE notification_delivery_attempts
                    SET status='SENT',delivered_at=now(),error_code=NULL,last_error=NULL,updated_at=now()
                    WHERE tenant_id=? AND id=? AND status='PENDING'
                    """, TenantContextHolder.getRequired().tenantId(), delivery.id()));
        } catch (RuntimeException exception) {
            failTransiently(delivery, exception);
        }
    }

    private NotificationMail loadMail(UUID notificationId) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.read(jdbc -> jdbc.query("""
                SELECT n.recipient_user_id,n.title,n.body,n.action_url,
                       coalesce(p.email_enabled,true) AS email_enabled
                FROM notifications n
                LEFT JOIN notification_preferences p
                  ON p.tenant_id=n.tenant_id AND p.user_id=n.recipient_user_id
                WHERE n.tenant_id=? AND n.id=?
                """, rs -> rs.next()
                ? new NotificationMail(
                        rs.getObject("recipient_user_id", UUID.class),
                        rs.getString("title"), rs.getString("body"), rs.getString("action_url"),
                        rs.getBoolean("email_enabled"))
                : null, context.tenantId(), notificationId));
    }

    private String emailBody(TenantEntity tenant, NotificationMail mail) {
        if (mail.actionUrl() == null) return mail.body();
        String base = tenantUrlTemplate.formatted(tenant.getSlug()).replaceAll("/+$", "");
        return mail.body() + "\n\nMở trong ứng dụng: " + base + mail.actionUrl();
    }

    private void failTransiently(Delivery delivery, RuntimeException exception) {
        TenantContext context = TenantContextHolder.getRequired();
        String message = safeError(exception);
        if (delivery.attemptCount() >= MAX_ATTEMPTS) {
            executor.writeWithoutResult(jdbc -> jdbc.update("""
                    UPDATE notification_delivery_attempts
                    SET status='FAILED',error_code='SMTP_ERROR',last_error=?,
                        dead_lettered_at=now(),updated_at=now()
                    WHERE tenant_id=? AND id=? AND status='PENDING'
                    """, message, context.tenantId(), delivery.id()));
            log.warn("Email notification {} exhausted {} attempts", delivery.notificationId(), MAX_ATTEMPTS);
            return;
        }
        long delaySeconds = 1L << Math.min(delivery.attemptCount(), 6);
        executor.writeWithoutResult(jdbc -> jdbc.update("""
                UPDATE notification_delivery_attempts
                SET error_code='SMTP_ERROR',last_error=?,available_at=?,updated_at=now()
                WHERE tenant_id=? AND id=? AND status='PENDING'
                """, message, Timestamp.from(Instant.now().plusSeconds(delaySeconds)),
                context.tenantId(), delivery.id()));
        log.warn("Email notification {} failed on attempt {}; retry scheduled",
                delivery.notificationId(), delivery.attemptCount());
    }

    private void skipDelivery(UUID deliveryId, String errorCode, String reason) {
        TenantContext context = TenantContextHolder.getRequired();
        executor.writeWithoutResult(jdbc -> jdbc.update("""
                UPDATE notification_delivery_attempts
                SET status='SKIPPED',error_code=?,last_error=?,updated_at=now()
                WHERE tenant_id=? AND id=? AND status='PENDING'
                """, errorCode, reason, context.tenantId(), deliveryId));
    }

    private String safeError(RuntimeException exception) {
        String message = exception.getMessage();
        String value = exception.getClass().getSimpleName()
                + (message == null || message.isBlank() ? "" : ": " + message);
        return value.length() <= 480 ? value : value.substring(0, 480);
    }

    private record Delivery(UUID id, UUID notificationId, int attemptCount) {}
    private record NotificationMail(
            UUID recipientUserId, String title, String body, String actionUrl, boolean emailEnabled) {}
}
