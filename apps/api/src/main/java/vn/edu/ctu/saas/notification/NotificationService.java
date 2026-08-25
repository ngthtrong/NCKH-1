package vn.edu.ctu.saas.notification;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import vn.edu.ctu.saas.common.NotFoundException;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;

@Service
public class NotificationService {
    private final TenantJdbcExecutor executor;

    public NotificationService(TenantJdbcExecutor executor) {
        this.executor = executor;
    }

    public List<NotificationView> list() {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.read(jdbc -> jdbc.query("""
                SELECT id,event_type,title,body,read_at,created_at
                FROM notifications
                WHERE tenant_id=? AND recipient_user_id=?
                ORDER BY created_at DESC LIMIT 100
                """, (rs, rowNum) -> {
                    Timestamp readAt = rs.getTimestamp("read_at");
                    return new NotificationView(
                            rs.getObject("id", UUID.class), rs.getString("event_type"),
                            rs.getString("title"), rs.getString("body"),
                            readAt == null ? null : readAt.toInstant(),
                            rs.getTimestamp("created_at").toInstant());
                }, context.tenantId(), context.userId()));
    }

    public NotificationView markRead(UUID notificationId) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.write(jdbc -> {
            int updated = jdbc.update("""
                    UPDATE notifications SET read_at=coalesce(read_at,now()),updated_at=now()
                    WHERE tenant_id=? AND id=? AND recipient_user_id=?
                    """, context.tenantId(), notificationId, context.userId());
            if (updated == 0) throw new NotFoundException("Notification not found");
            return jdbc.queryForObject("""
                    SELECT id,event_type,title,body,read_at,created_at FROM notifications
                    WHERE tenant_id=? AND id=? AND recipient_user_id=?
                    """, (rs, rowNum) -> new NotificationView(
                    rs.getObject("id", UUID.class), rs.getString("event_type"),
                    rs.getString("title"), rs.getString("body"),
                    rs.getTimestamp("read_at").toInstant(), rs.getTimestamp("created_at").toInstant()),
                    context.tenantId(), notificationId, context.userId());
        });
    }

    public void markAllRead() {
        TenantContext context = TenantContextHolder.getRequired();
        executor.writeWithoutResult(jdbc -> jdbc.update("""
                UPDATE notifications SET read_at=coalesce(read_at,now()),updated_at=now()
                WHERE tenant_id=? AND recipient_user_id=? AND read_at IS NULL
                """, context.tenantId(), context.userId()));
    }

    public NotificationPreferences preferences() {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.read(jdbc -> jdbc.query("""
                SELECT in_app_enabled,email_enabled,web_push_enabled FROM notification_preferences
                WHERE tenant_id=? AND user_id=?
                """, rs -> rs.next()
                ? new NotificationPreferences(rs.getBoolean(1), rs.getBoolean(2), rs.getBoolean(3))
                : new NotificationPreferences(true, true, false), context.tenantId(), context.userId()));
    }

    public NotificationPreferences updatePreferences(NotificationPreferences request) {
        TenantContext context = TenantContextHolder.getRequired();
        executor.writeWithoutResult(jdbc -> jdbc.update("""
                INSERT INTO notification_preferences(
                    id,tenant_id,user_id,in_app_enabled,email_enabled,web_push_enabled)
                VALUES (?,?,?,?,?,?)
                ON CONFLICT (tenant_id,user_id) DO UPDATE SET
                    in_app_enabled=excluded.in_app_enabled,
                    email_enabled=excluded.email_enabled,
                    web_push_enabled=excluded.web_push_enabled,
                    updated_at=now()
                """, UUID.randomUUID(), context.tenantId(), context.userId(),
                request.inAppEnabled(), request.emailEnabled(), request.webPushEnabled()));
        return request;
    }

    public PushSubscriptionView addPushSubscription(PushSubscriptionRequest request) {
        TenantContext context = TenantContextHolder.getRequired();
        UUID id = UUID.randomUUID();
        executor.writeWithoutResult(jdbc -> jdbc.update("""
                INSERT INTO push_subscriptions(id,tenant_id,user_id,endpoint,p256dh,auth_secret)
                VALUES (?,?,?,?,?,?)
                """, id, context.tenantId(), context.userId(), request.endpoint(), request.p256dh(), request.auth()));
        return new PushSubscriptionView(id, request.endpoint(), Instant.now());
    }

    public void removePushSubscription(UUID id) {
        TenantContext context = TenantContextHolder.getRequired();
        executor.writeWithoutResult(jdbc -> {
            int deleted = jdbc.update(
                    "DELETE FROM push_subscriptions WHERE tenant_id=? AND id=? AND user_id=?",
                    context.tenantId(), id, context.userId());
            if (deleted == 0) throw new NotFoundException("Push subscription not found");
        });
    }

    public record NotificationView(
            UUID id, String eventType, String title, String body, Instant readAt, Instant createdAt) {}
    public record NotificationPreferences(boolean inAppEnabled, boolean emailEnabled, boolean webPushEnabled) {}
    public record PushSubscriptionRequest(String endpoint, String p256dh, String auth) {}
    public record PushSubscriptionView(UUID id, String endpoint, Instant createdAt) {}
}
