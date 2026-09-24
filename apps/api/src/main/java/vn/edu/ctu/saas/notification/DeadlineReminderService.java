package vn.edu.ctu.saas.notification;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;

@Component
public class DeadlineReminderService {
    private static final int MAX_REMINDERS_PER_POLL = 100;

    private final TenantJdbcExecutor executor;
    private final ObjectMapper objectMapper;

    public DeadlineReminderService(TenantJdbcExecutor executor, ObjectMapper objectMapper) {
        this.executor = executor;
        this.objectMapper = objectMapper;
    }

    public int enqueueDueReminders(Instant now, Duration leadTime) {
        if (leadTime.isNegative() || leadTime.isZero()) {
            throw new IllegalArgumentException("Deadline reminder lead time must be positive");
        }
        TenantContext context = TenantContextHolder.getRequired();
        Instant horizon = now.plus(leadTime);
        return executor.write(jdbc -> {
            List<Candidate> candidates = candidates(jdbc, context, now, horizon);
            int queued = 0;
            for (Candidate candidate : candidates) {
                ReminderType reminderType = candidate.dueAt().isAfter(now)
                        ? ReminderType.DUE_SOON
                        : ReminderType.OVERDUE;
                UUID reminderId = UUID.randomUUID();
                UUID eventId = UUID.randomUUID();
                int inserted = jdbc.update("""
                        INSERT INTO task_deadline_reminders(
                            id,tenant_id,task_id,reminder_type,due_at,recipient_user_id,outbox_event_id)
                        VALUES (?,?,?,?,?,?,?)
                        ON CONFLICT (tenant_id,task_id,reminder_type,due_at,recipient_user_id) DO NOTHING
                        """, reminderId, context.tenantId(), candidate.taskId(), reminderType.name(),
                        Timestamp.from(candidate.dueAt()), candidate.recipientUserId(), eventId);
                if (inserted == 0) continue;

                String eventType = reminderType == ReminderType.DUE_SOON
                        ? "TASK_DUE_SOON"
                        : "TASK_OVERDUE";
                String correlationId = "deadline-" + eventId;
                String payload = serialize(Map.of(
                        "projectId", candidate.projectId(),
                        "boardId", candidate.boardId(),
                        "recipientUserId", candidate.recipientUserId(),
                        "title", candidate.title(),
                        "dueAt", candidate.dueAt().toString()));
                jdbc.update("""
                        INSERT INTO outbox_events(
                            id,tenant_id,actor_user_id,event_type,aggregate_type,aggregate_id,
                            correlation_id,payload_json)
                        VALUES (?,?,NULL,?,'Task',?,?,CAST(? AS jsonb))
                        """, eventId, context.tenantId(), eventType, candidate.taskId(), correlationId, payload);
                queued++;
            }
            return queued;
        });
    }

    private List<Candidate> candidates(
            JdbcTemplate jdbc, TenantContext context, Instant now, Instant horizon) {
        return jdbc.query("""
                SELECT t.id,t.project_id,t.board_id,t.assignee_user_id,t.title,t.due_at
                FROM tasks t
                JOIN projects p ON p.tenant_id=t.tenant_id AND p.id=t.project_id
                JOIN boards b ON b.tenant_id=t.tenant_id AND b.id=t.board_id
                JOIN board_columns c ON c.tenant_id=t.tenant_id AND c.id=t.board_column_id
                JOIN project_memberships pm
                  ON pm.tenant_id=t.tenant_id AND pm.project_id=t.project_id
                 AND pm.user_id=t.assignee_user_id
                WHERE t.tenant_id=? AND t.deleted_at IS NULL AND b.deleted_at IS NULL
                  AND p.status='ACTIVE' AND c.completed=false
                  AND t.assignee_user_id IS NOT NULL AND t.due_at IS NOT NULL
                  AND t.due_at<=?
                  AND (
                    (t.due_at<=? AND NOT EXISTS (
                      SELECT 1 FROM task_deadline_reminders r
                      WHERE r.tenant_id=t.tenant_id AND r.task_id=t.id
                        AND r.reminder_type='OVERDUE' AND r.due_at=t.due_at
                        AND r.recipient_user_id=t.assignee_user_id
                    ))
                    OR
                    (t.due_at>? AND NOT EXISTS (
                      SELECT 1 FROM task_deadline_reminders r
                      WHERE r.tenant_id=t.tenant_id AND r.task_id=t.id
                        AND r.reminder_type='DUE_SOON' AND r.due_at=t.due_at
                        AND r.recipient_user_id=t.assignee_user_id
                    ))
                  )
                ORDER BY t.due_at,t.id
                LIMIT ?
                """, (rs, rowNum) -> new Candidate(
                rs.getObject("id", UUID.class),
                rs.getObject("project_id", UUID.class),
                rs.getObject("board_id", UUID.class),
                rs.getObject("assignee_user_id", UUID.class),
                rs.getString("title"),
                rs.getTimestamp("due_at").toInstant()),
                context.tenantId(), Timestamp.from(horizon), Timestamp.from(now), Timestamp.from(now),
                MAX_REMINDERS_PER_POLL);
    }

    private String serialize(Map<String, ?> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot serialize deadline reminder event", exception);
        }
    }

    private enum ReminderType { DUE_SOON, OVERDUE }

    private record Candidate(
            UUID taskId,
            UUID projectId,
            UUID boardId,
            UUID recipientUserId,
            String title,
            Instant dueAt) {}
}
