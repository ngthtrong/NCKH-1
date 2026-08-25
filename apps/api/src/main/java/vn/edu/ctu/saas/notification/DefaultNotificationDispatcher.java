package vn.edu.ctu.saas.notification;

import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import vn.edu.ctu.saas.control.UserAccountEntity;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;

@Component
public class DefaultNotificationDispatcher implements NotificationDispatcher {
    private static final Logger log = LoggerFactory.getLogger(DefaultNotificationDispatcher.class);
    private final TenantJdbcExecutor executor;
    private final JavaMailSender mailSender;

    public DefaultNotificationDispatcher(TenantJdbcExecutor executor, JavaMailSender mailSender) {
        this.executor = executor;
        this.mailSender = mailSender;
    }

    @Override
    public void dispatch(TenantEvent event, UserAccountEntity recipient) {
        TenantContext context = TenantContextHolder.getRequired();
        if (!context.tenantId().equals(event.tenantId())) {
            throw new IllegalArgumentException("Event tenant does not match worker tenant context");
        }
        executor.writeWithoutResult(jdbc -> {
            UUID notificationId = UUID.randomUUID();
            String title = title(event);
            String body = body(event);
            int inserted = jdbc.update("""
                    INSERT INTO notifications(
                        id,tenant_id,source_event_id,recipient_user_id,event_type,title,body)
                    VALUES (?,?,?,?,?,?,?)
                    ON CONFLICT (tenant_id,source_event_id,recipient_user_id) DO NOTHING
                    """, notificationId, event.tenantId(), event.id(), recipient.getId(),
                    event.eventType(), title, body);
            if (inserted == 0) return;

            recordAttempt(jdbc, event.tenantId(), notificationId, "IN_APP", "SENT", null);
            List<Preference> preferences = jdbc.query("""
                    SELECT email_enabled,web_push_enabled FROM notification_preferences
                    WHERE tenant_id=? AND user_id=?
                    """, (rs, rowNum) -> new Preference(rs.getBoolean(1), rs.getBoolean(2)),
                    event.tenantId(), recipient.getId());
            Preference preference = preferences.isEmpty() ? new Preference(true, false) : preferences.getFirst();

            if (preference.emailEnabled()) {
                try {
                    SimpleMailMessage message = new SimpleMailMessage();
                    message.setTo(recipient.getEmail());
                    message.setSubject("[NCKH SaaS] " + title);
                    message.setText(body + "\n\nCorrelation ID: " + event.correlationId());
                    mailSender.send(message);
                    recordAttempt(jdbc, event.tenantId(), notificationId, "EMAIL", "SENT", null);
                } catch (RuntimeException exception) {
                    log.warn("Email notification failed event={} recipient={}", event.id(), recipient.getId(), exception);
                    recordAttempt(jdbc, event.tenantId(), notificationId, "EMAIL", "FAILED", "SMTP_ERROR");
                }
            } else {
                recordAttempt(jdbc, event.tenantId(), notificationId, "EMAIL", "SKIPPED", "DISABLED_BY_USER");
            }

            if (preference.webPushEnabled()) {
                recordAttempt(jdbc, event.tenantId(), notificationId, "WEB_PUSH", "SKIPPED", "VAPID_NOT_CONFIGURED");
            }
        });
    }

    private void recordAttempt(
            org.springframework.jdbc.core.JdbcTemplate jdbc,
            UUID tenantId,
            UUID notificationId,
            String channel,
            String status,
            String errorCode) {
        jdbc.update("""
                INSERT INTO notification_delivery_attempts(
                    id,tenant_id,notification_id,channel,status,error_code)
                VALUES (?,?,?,?,?,?)
                """, UUID.randomUUID(), tenantId, notificationId, channel, status, errorCode);
    }

    private String title(TenantEvent event) {
        return switch (event.eventType()) {
            case "TASK_CREATED" -> "Công việc mới";
            case "TASK_UPDATED" -> "Công việc đã thay đổi";
            case "COMMENT_CREATED" -> "Bình luận mới";
            case "PROJECT_CREATED" -> "Dự án mới";
            default -> "Cập nhật " + event.aggregateType();
        };
    }

    private String body(TenantEvent event) {
        return "%s %s (%s)".formatted(event.eventType(), event.aggregateType(), event.aggregateId());
    }

    private record Preference(boolean emailEnabled, boolean webPushEnabled) {}
}
