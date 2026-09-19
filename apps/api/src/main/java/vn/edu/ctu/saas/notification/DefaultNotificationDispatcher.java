package vn.edu.ctu.saas.notification;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import vn.edu.ctu.saas.control.UserAccountEntity;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;

@Component
public class DefaultNotificationDispatcher implements NotificationDispatcher {
    private final TenantJdbcExecutor executor;
    private final ObjectMapper objectMapper;

    public DefaultNotificationDispatcher(TenantJdbcExecutor executor, ObjectMapper objectMapper) {
        this.executor = executor;
        this.objectMapper = objectMapper;
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
                        id,tenant_id,source_event_id,recipient_user_id,event_type,title,body,action_url)
                    VALUES (?,?,?,?,?,?,?,?)
                    ON CONFLICT (tenant_id,source_event_id,recipient_user_id) DO NOTHING
                    """, notificationId, event.tenantId(), event.id(), recipient.getId(),
                    event.eventType(), title, body, actionUrl(event));
            if (inserted == 0) return;

            recordAttempt(jdbc, event.tenantId(), notificationId, "IN_APP", "SENT", null);
            List<Preference> preferences = jdbc.query("""
                    SELECT email_enabled,web_push_enabled FROM notification_preferences
                    WHERE tenant_id=? AND user_id=?
                    """, (rs, rowNum) -> new Preference(rs.getBoolean(1), rs.getBoolean(2)),
                    event.tenantId(), recipient.getId());
            Preference preference = preferences.isEmpty() ? new Preference(true, false) : preferences.getFirst();

            if (preference.emailEnabled()) {
                recordAttempt(jdbc, event.tenantId(), notificationId, "EMAIL", "PENDING", null);
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
            case "TASK_CREATED" -> payloadUuid(event, "recipientUserId") == null
                    ? "Công việc mới"
                    : "Bạn được giao công việc mới";
            case "TASK_ASSIGNED" -> "Bạn được giao công việc";
            case "TASK_UPDATED" -> "Công việc đã thay đổi";
            case "TASK_MOVED" -> "Trạng thái công việc đã thay đổi";
            case "TASK_DELETED" -> "Công việc đã bị xóa";
            case "TASK_DUE_SOON" -> "Công việc sắp đến hạn";
            case "TASK_OVERDUE" -> "Công việc đã quá hạn";
            case "COMMENT_CREATED" -> "Bình luận mới";
            case "COMMENT_UPDATED" -> "Bình luận đã thay đổi";
            case "COMMENT_DELETED" -> "Bình luận đã bị xóa";
            case "PROJECT_CREATED" -> "Dự án mới";
            case "PROJECT_UPDATED" -> "Dự án đã thay đổi";
            case "PROJECT_ARCHIVED" -> "Dự án đã lưu trữ";
            case "PROJECT_RESTORED" -> "Dự án đã khôi phục";
            case "PROJECT_DELETED" -> "Dự án đã bị xóa";
            case "PROJECT_MEMBERSHIP_SET" -> "Thành viên dự án đã thay đổi";
            case "PROJECT_MEMBERSHIP_REMOVED" -> "Thành viên đã được gỡ khỏi dự án";
            case "BOARD_CREATED" -> "Bảng công việc mới";
            case "BOARD_UPDATED" -> "Bảng công việc đã thay đổi";
            case "BOARD_DELETED" -> "Bảng công việc đã bị xóa";
            case "BOARD_COLUMN_CREATED" -> "Cột công việc mới";
            case "BOARD_COLUMN_UPDATED" -> "Cột công việc đã thay đổi";
            case "BOARD_COLUMN_REORDERED" -> "Thứ tự cột đã thay đổi";
            case "BOARD_COLUMN_DELETED" -> "Cột công việc đã bị xóa";
            default -> "Cập nhật " + event.aggregateType();
        };
    }

    private String body(TenantEvent event) {
        return switch (event.eventType()) {
            case "TASK_CREATED" -> payloadUuid(event, "recipientUserId") == null
                    ? "Công việc “%s” vừa được tạo.".formatted(taskTitle(event))
                    : "Bạn vừa được giao công việc “%s”.".formatted(taskTitle(event));
            case "TASK_ASSIGNED" -> "Bạn vừa được giao công việc “%s”.".formatted(taskTitle(event));
            case "TASK_UPDATED" -> "Công việc “%s” vừa được cập nhật.".formatted(taskTitle(event));
            case "TASK_MOVED" -> "Công việc “%s” vừa được chuyển trạng thái.".formatted(taskTitle(event));
            case "TASK_DELETED" -> "Công việc “%s” vừa bị xóa.".formatted(taskTitle(event));
            case "TASK_DUE_SOON" -> "Công việc “%s” sẽ đến hạn lúc %s."
                    .formatted(taskTitle(event), payloadText(event, "dueAt", "không xác định"));
            case "TASK_OVERDUE" -> "Công việc “%s” đã quá hạn từ %s."
                    .formatted(taskTitle(event), payloadText(event, "dueAt", "không xác định"));
            case "COMMENT_CREATED" -> "Có bình luận mới trong công việc “%s”.".formatted(taskTitle(event));
            case "COMMENT_UPDATED" -> "Một bình luận trong công việc vừa được cập nhật.";
            case "COMMENT_DELETED" -> "Một bình luận trong công việc vừa bị xóa.";
            case "PROJECT_CREATED" -> "Dự án “%s” vừa được tạo.".formatted(subjectName(event));
            case "PROJECT_UPDATED" -> "Dự án “%s” vừa được cập nhật.".formatted(subjectName(event));
            case "PROJECT_ARCHIVED" -> "Một dự án bạn tham gia vừa được lưu trữ.";
            case "PROJECT_RESTORED" -> "Một dự án bạn tham gia vừa được khôi phục.";
            case "PROJECT_DELETED" -> "Một dự án bạn tham gia vừa bị xóa.";
            case "PROJECT_MEMBERSHIP_SET" -> "Danh sách thành viên hoặc vai trò trong dự án vừa được cập nhật.";
            case "PROJECT_MEMBERSHIP_REMOVED" -> "Danh sách thành viên dự án vừa được cập nhật.";
            case "BOARD_CREATED" -> "Một bảng công việc mới vừa được tạo trong dự án.";
            case "BOARD_UPDATED" -> "Bảng công việc “%s” vừa được cập nhật.".formatted(subjectName(event));
            case "BOARD_DELETED" -> "Một bảng công việc vừa bị xóa khỏi dự án.";
            case "BOARD_COLUMN_CREATED", "BOARD_COLUMN_UPDATED", "BOARD_COLUMN_REORDERED", "BOARD_COLUMN_DELETED" ->
                    "Cấu trúc cột của bảng công việc vừa thay đổi.";
            default -> "%s vừa được cập nhật.".formatted(event.aggregateType());
        };
    }

    private String actionUrl(TenantEvent event) {
        UUID projectId = payloadUuid(event, "projectId");
        UUID boardId = payloadUuid(event, "boardId");
        UUID taskId = payloadUuid(event, "taskId");
        if ("Task".equals(event.aggregateType()) && boardId != null
                && !"TASK_DELETED".equals(event.eventType())) {
            return "/kanban/%s?task=%s".formatted(boardId, event.aggregateId());
        }
        if ("Comment".equals(event.aggregateType()) && boardId != null && taskId != null) {
            return "/kanban/%s?task=%s".formatted(boardId, taskId);
        }
        if ("Board".equals(event.aggregateType()) && !"BOARD_DELETED".equals(event.eventType())) {
            return "/kanban/" + event.aggregateId();
        }
        if ("Project".equals(event.aggregateType())) {
            return "/projects/" + event.aggregateId();
        }
        if (boardId != null) {
            return "/kanban/" + boardId;
        }
        return projectId == null ? null : "/projects/" + projectId;
    }

    private String taskTitle(TenantEvent event) {
        String title = payloadText(event, "taskTitle", null);
        return title == null ? payloadText(event, "title", "không xác định") : title;
    }

    private String subjectName(TenantEvent event) {
        return payloadText(event, "name", "không xác định");
    }

    private String payloadText(TenantEvent event, String field, String fallback) {
        try {
            JsonNode value = objectMapper.readTree(event.payloadJson()).path(field);
            return value.isMissingNode() || value.isNull() || value.asText().isBlank()
                    ? fallback
                    : value.asText();
        } catch (RuntimeException exception) {
            return fallback;
        }
    }

    private UUID payloadUuid(TenantEvent event, String field) {
        String value = payloadText(event, field, null);
        if (value == null) return null;
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private record Preference(boolean emailEnabled, boolean webPushEnabled) {}
}
