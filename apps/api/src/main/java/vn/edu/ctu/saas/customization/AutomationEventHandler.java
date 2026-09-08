package vn.edu.ctu.saas.customization;

import java.sql.Array;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.notification.TenantEvent;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;

@Component
public class AutomationEventHandler {
    private static final Set<String> SUPPORTED_EVENTS = Set.of(
            "TASK_CREATED", "TASK_MOVED", "APPROVAL_APPROVED", "APPROVAL_REJECTED");
    private final TenantJdbcExecutor executor;
    private final TenantCapabilityService capabilities;
    private final TenantMembershipRepository memberships;
    private final ObjectMapper objectMapper;

    public AutomationEventHandler(
            TenantJdbcExecutor executor,
            TenantCapabilityService capabilities,
            TenantMembershipRepository memberships,
            ObjectMapper objectMapper) {
        this.executor = executor;
        this.capabilities = capabilities;
        this.memberships = memberships;
        this.objectMapper = objectMapper;
    }

    public void handle(TenantEvent event) {
        TenantContext context = TenantContextHolder.getRequired();
        if (!context.tenantId().equals(event.tenantId()) || !SUPPORTED_EVENTS.contains(event.eventType())) return;
        if (!capabilities.effective(context.tenantId(), TenantCapability.AUTOMATION)) return;
        EventContext eventContext = resolve(event);
        if (eventContext == null) return;
        List<Rule> rules = executor.read(jdbc -> jdbc.query("""
                SELECT id,project_id,trigger_type,trigger_board_id,trigger_column_id,
                       action_type,action_user_ids,version
                FROM automation_rules
                WHERE tenant_id=? AND project_id=? AND trigger_type=? AND enabled=true
                  AND EXISTS (SELECT 1 FROM projects p
                              WHERE p.tenant_id=automation_rules.tenant_id
                                AND p.id=automation_rules.project_id AND p.status='ACTIVE')
                ORDER BY created_at
                """, (rs, rowNum) -> new Rule(
                rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                AutomationService.TriggerType.valueOf(rs.getString("trigger_type")),
                rs.getObject("trigger_board_id", UUID.class), rs.getObject("trigger_column_id", UUID.class),
                AutomationService.ActionType.valueOf(rs.getString("action_type")),
                uuidList(rs.getArray("action_user_ids")), rs.getLong("version")),
                context.tenantId(), eventContext.projectId(), event.eventType()));
        for (Rule rule : rules) {
            if (!matches(rule, eventContext)) continue;
            execute(event, eventContext, rule);
        }
    }

    private void execute(TenantEvent event, EventContext eventContext, Rule rule) {
        TenantContext context = TenantContextHolder.getRequired();
        UUID executionId = executor.write(jdbc -> {
            List<UUID> inserted = jdbc.query("""
                    INSERT INTO automation_executions(
                        id,tenant_id,rule_id,source_event_id,rule_version,status,attempts)
                    VALUES (?,?,?,?,?,'RUNNING',1)
                    ON CONFLICT (tenant_id,rule_id,source_event_id) DO NOTHING
                    RETURNING id
                    """, (rs, rowNum) -> rs.getObject(1, UUID.class), UUID.randomUUID(), context.tenantId(),
                    rule.id(), event.id(), rule.version());
            if (!inserted.isEmpty()) return inserted.getFirst();
            List<UUID> retried = jdbc.query("""
                    UPDATE automation_executions
                    SET status='RUNNING',attempts=attempts+1,error_code=NULL,updated_at=now()
                    WHERE tenant_id=? AND rule_id=? AND source_event_id=? AND attempts<5
                      AND (status='FAILED' OR (status='RUNNING' AND updated_at<now()-interval '5 minutes'))
                    RETURNING id
                    """, (rs, rowNum) -> rs.getObject(1, UUID.class),
                    context.tenantId(), rule.id(), event.id());
            return retried.isEmpty() ? null : retried.getFirst();
        });
        if (executionId == null) return;
        try {
            revalidateRule(context, rule);
            if (rule.actionType() == AutomationService.ActionType.ASSIGN_USER) {
                assign(eventContext, rule.actionUserIds().getFirst());
            } else {
                notifyUsers(executionId, event, rule);
            }
            executor.writeWithoutResult(jdbc -> jdbc.update("""
                    UPDATE automation_executions SET status='SUCCEEDED',error_code=NULL,updated_at=now()
                    WHERE tenant_id=? AND id=? AND status='RUNNING'
                    """, context.tenantId(), executionId));
        } catch (RuntimeException exception) {
            String code = exception.getClass().getSimpleName();
            if (code.length() > 80) code = code.substring(0, 80);
            String errorCode = code;
            executor.writeWithoutResult(jdbc -> jdbc.update("""
                    UPDATE automation_executions SET status='FAILED',error_code=?,updated_at=now()
                    WHERE tenant_id=? AND id=?
                    """, errorCode, context.tenantId(), executionId));
            throw exception;
        }
    }

    private void revalidateRule(TenantContext context, Rule rule) {
        if (!capabilities.effective(context.tenantId(), TenantCapability.AUTOMATION)) {
            throw new IllegalStateException("AUTOMATION_CAPABILITY_DISABLED");
        }
        Set<UUID> activeUsers = memberships.findAllByTenantIdAndActiveTrue(context.tenantId()).stream()
                .filter(member -> member.isActive() && context.tenantId().equals(member.getTenantId()))
                .map(member -> member.getUserId()).collect(java.util.stream.Collectors.toSet());
        executor.read(jdbc -> {
            Long ruleReady = jdbc.queryForObject("""
                    SELECT count(*) FROM automation_rules r JOIN projects p
                      ON p.tenant_id=r.tenant_id AND p.id=r.project_id
                    WHERE r.tenant_id=? AND r.id=? AND r.version=? AND r.enabled=true AND p.status='ACTIVE'
                    """, Long.class, context.tenantId(), rule.id(), rule.version());
            if (ruleReady == null || ruleReady == 0) throw new IllegalStateException("AUTOMATION_RULE_DISABLED");
            for (UUID userId : rule.actionUserIds()) {
                Long member = jdbc.queryForObject("""
                        SELECT count(*) FROM project_memberships
                        WHERE tenant_id=? AND project_id=? AND user_id=?
                        """, Long.class, context.tenantId(), rule.projectId(), userId);
                if (!activeUsers.contains(userId) || member == null || member == 0) {
                    throw new IllegalStateException("AUTOMATION_RECIPIENT_INACTIVE");
                }
            }
            return null;
        });
    }

    private void assign(EventContext eventContext, UUID assigneeId) {
        TenantContext context = TenantContextHolder.getRequired();
        executor.writeWithoutResult(jdbc -> {
            TaskState task = jdbc.query("""
                    SELECT board_column_id,assignee_user_id FROM tasks
                    WHERE tenant_id=? AND id=? AND project_id=? AND deleted_at IS NULL
                    """, rs -> rs.next() ? new TaskState(
                    rs.getObject(1, UUID.class), rs.getObject(2, UUID.class)) : null,
                    context.tenantId(), eventContext.taskId(), eventContext.projectId());
            if (task == null) throw new IllegalStateException("AUTOMATION_TASK_UNAVAILABLE");
            if (assigneeId.equals(task.assigneeId())) return;
            ApprovalService.assertEditableOutsideCompletion(
                    jdbc, context, eventContext.taskId(), task.columnId());
            ApprovalService.invalidatePending(
                    jdbc, context, eventContext.taskId(), "AUTOMATION_ASSIGNEE_CHANGED", objectMapper);
            int updated = jdbc.update("""
                    UPDATE tasks SET assignee_user_id=?,version=version+1,updated_at=now()
                    WHERE tenant_id=? AND id=? AND deleted_at IS NULL
                    """, assigneeId, context.tenantId(), eventContext.taskId());
            if (updated == 0) throw new IllegalStateException("AUTOMATION_TASK_UNAVAILABLE");
        });
    }

    private void notifyUsers(UUID executionId, TenantEvent event, Rule rule) {
        TenantContext context = TenantContextHolder.getRequired();
        executor.writeWithoutResult(jdbc -> {
            for (UUID userId : rule.actionUserIds()) {
                UUID notificationId = UUID.randomUUID();
                int inserted = jdbc.update("""
                        INSERT INTO notifications(
                            id,tenant_id,source_event_id,recipient_user_id,event_type,title,body)
                        VALUES (?,?,?,?,?,?,?)
                        ON CONFLICT (tenant_id,source_event_id,recipient_user_id) DO NOTHING
                        """, notificationId, context.tenantId(), executionId, userId,
                        "AUTOMATION_NOTIFICATION", "Tự động hóa: " + event.eventType(),
                        "Quy tắc tự động hóa đã xử lý công việc " + event.aggregateId());
                if (inserted > 0) jdbc.update("""
                        INSERT INTO notification_delivery_attempts(
                            id,tenant_id,notification_id,channel,status)
                        VALUES (?,?,?,'IN_APP','SENT')
                        """, UUID.randomUUID(), context.tenantId(), notificationId);
            }
        });
    }

    private EventContext resolve(TenantEvent event) {
        TenantContext context = TenantContextHolder.getRequired();
        if (!"Task".equals(event.aggregateType())) return null;
        return executor.read(jdbc -> jdbc.query("""
                SELECT project_id,board_id,board_column_id FROM tasks
                WHERE tenant_id=? AND id=? AND deleted_at IS NULL
                """, rs -> rs.next() ? new EventContext(
                event.aggregateId(), rs.getObject("project_id", UUID.class),
                rs.getObject("board_id", UUID.class), destinationColumn(event, rs.getObject("board_column_id", UUID.class)))
                : null, context.tenantId(), event.aggregateId()));
    }

    private UUID destinationColumn(TenantEvent event, UUID currentColumn) {
        if (!"TASK_MOVED".equals(event.eventType())) return currentColumn;
        try {
            JsonNode value = objectMapper.readTree(event.payloadJson()).path("columnId");
            return value.isMissingNode() || value.isNull() ? currentColumn : UUID.fromString(value.asText());
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException("Invalid task-moved event payload", exception);
        }
    }

    private boolean matches(Rule rule, EventContext event) {
        return (rule.triggerBoardId() == null || rule.triggerBoardId().equals(event.boardId()))
                && (rule.triggerColumnId() == null || rule.triggerColumnId().equals(event.columnId()));
    }

    private static List<UUID> uuidList(Array array) throws java.sql.SQLException {
        return List.of((UUID[]) array.getArray());
    }

    private record Rule(
            UUID id, UUID projectId, AutomationService.TriggerType triggerType,
            UUID triggerBoardId, UUID triggerColumnId, AutomationService.ActionType actionType,
            List<UUID> actionUserIds, long version) {}
    private record EventContext(UUID taskId, UUID projectId, UUID boardId, UUID columnId) {}
    private record TaskState(UUID columnId, UUID assigneeId) {}
}
