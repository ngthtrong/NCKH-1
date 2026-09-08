package vn.edu.ctu.saas.customization;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.common.NotFoundException;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.tenant.ProjectRole;
import vn.edu.ctu.saas.tenant.TenantAccessDeniedException;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;

@Service
public class AutomationService {
    private final TenantJdbcExecutor executor;
    private final TenantCapabilityService capabilities;
    private final TenantMembershipRepository tenantMemberships;
    private final ObjectMapper objectMapper;

    public AutomationService(
            TenantJdbcExecutor executor,
            TenantCapabilityService capabilities,
            TenantMembershipRepository tenantMemberships,
            ObjectMapper objectMapper) {
        this.executor = executor;
        this.capabilities = capabilities;
        this.tenantMemberships = tenantMemberships;
        this.objectMapper = objectMapper;
    }

    public List<RuleView> rules(UUID projectId) {
        TenantContext context = contextForRead();
        return executor.read(jdbc -> {
            requireProjectRole(jdbc, context, projectId, ProjectRole.VIEWER);
            return jdbc.query("""
                    SELECT id,project_id,name,trigger_type,trigger_board_id,trigger_column_id,
                           action_type,action_user_ids,enabled,version,created_at
                    FROM automation_rules WHERE tenant_id=? AND project_id=? ORDER BY created_at DESC
                    """, (rs, rowNum) -> new RuleView(
                    rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                    rs.getString("name"), TriggerType.valueOf(rs.getString("trigger_type")),
                    rs.getObject("trigger_board_id", UUID.class), rs.getObject("trigger_column_id", UUID.class),
                    ActionType.valueOf(rs.getString("action_type")),
                    List.of((UUID[]) rs.getArray("action_user_ids").getArray()),
                    rs.getBoolean("enabled"), rs.getLong("version"),
                    rs.getTimestamp("created_at").toInstant()), context.tenantId(), projectId);
        });
    }

    public RuleView create(UUID projectId, CreateRule input) {
        TenantContext context = contextWithCapability();
        return executor.write(jdbc -> {
            requireProjectRole(jdbc, context, projectId, ProjectRole.MANAGER);
            validateTrigger(jdbc, context, projectId, input);
            Set<UUID> recipients = input.actionUserIds() == null ? Set.of() : new HashSet<>(input.actionUserIds());
            if (recipients.isEmpty()) throw new IllegalArgumentException("Automation action requires a recipient");
            if (input.actionType() == ActionType.ASSIGN_USER && recipients.size() != 1) {
                throw new IllegalArgumentException("Assign-user action requires exactly one user");
            }
            validateRecipients(jdbc, context, projectId, recipients);
            UUID id = UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO automation_rules(
                        id,tenant_id,project_id,name,trigger_type,trigger_board_id,trigger_column_id,
                        action_type,action_user_ids,enabled,version,created_by)
                    VALUES (?,?,?,?,?,?,?,?,?,true,0,?)
                    """, id, context.tenantId(), projectId, normalizedName(input.name()), input.triggerType().name(),
                    input.triggerType() == TriggerType.TASK_MOVED ? input.triggerBoardId() : null,
                    input.triggerType() == TriggerType.TASK_MOVED ? input.triggerColumnId() : null,
                    input.actionType().name(), recipients.toArray(UUID[]::new), context.userId());
            audit(jdbc, context, "AUTOMATION_RULE_CREATED", id, Map.of("projectId", projectId));
            return findRule(jdbc, context, id);
        });
    }

    public RuleView disable(UUID ruleId, long expectedVersion) {
        TenantContext context = contextWithCapability();
        return executor.write(jdbc -> {
            RuleView rule = findRule(jdbc, context, ruleId);
            requireProjectRole(jdbc, context, rule.projectId(), ProjectRole.MANAGER);
            int updated = jdbc.update("""
                    UPDATE automation_rules SET enabled=false,version=version+1,updated_at=now()
                    WHERE tenant_id=? AND id=? AND version=? AND enabled=true
                    """, context.tenantId(), ruleId, expectedVersion);
            if (updated == 0) throw new ConflictException("Automation rule version is stale or the rule is already disabled");
            audit(jdbc, context, "AUTOMATION_RULE_DISABLED", ruleId, Map.of("projectId", rule.projectId()));
            return findRule(jdbc, context, ruleId);
        });
    }

    public List<ExecutionView> executions(UUID projectId) {
        TenantContext context = contextForRead();
        return executor.read(jdbc -> {
            requireProjectRole(jdbc, context, projectId, ProjectRole.VIEWER);
            return jdbc.query("""
                    SELECT e.id,e.rule_id,e.source_event_id,e.rule_version,e.status,e.attempts,e.error_code,e.created_at,e.updated_at
                    FROM automation_executions e JOIN automation_rules r
                      ON r.tenant_id=e.tenant_id AND r.id=e.rule_id
                    WHERE e.tenant_id=? AND r.project_id=? ORDER BY e.created_at DESC LIMIT 200
                    """, (rs, rowNum) -> new ExecutionView(
                    rs.getObject("id", UUID.class), rs.getObject("rule_id", UUID.class),
                    rs.getObject("source_event_id", UUID.class), rs.getLong("rule_version"),
                    rs.getString("status"), rs.getInt("attempts"), rs.getString("error_code"),
                    rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant()),
                    context.tenantId(), projectId);
        });
    }

    private void validateTrigger(JdbcTemplate jdbc, TenantContext context, UUID projectId, CreateRule input) {
        if (input.triggerType() != TriggerType.TASK_MOVED
                && (input.triggerBoardId() != null || input.triggerColumnId() != null)) {
            throw new IllegalArgumentException("Board and column filters are only valid for task-moved triggers");
        }
        if (input.triggerColumnId() != null && input.triggerBoardId() == null) {
            throw new IllegalArgumentException("A column filter requires a board filter");
        }
        if (input.triggerBoardId() != null && count(jdbc, """
                SELECT count(*) FROM boards WHERE tenant_id=? AND project_id=? AND id=? AND deleted_at IS NULL
                """, context.tenantId(), projectId, input.triggerBoardId()) == 0) {
            throw new NotFoundException("Automation trigger board not found in this project");
        }
        if (input.triggerColumnId() != null && count(jdbc, """
                SELECT count(*) FROM board_columns WHERE tenant_id=? AND board_id=? AND id=?
                """, context.tenantId(), input.triggerBoardId(), input.triggerColumnId()) == 0) {
            throw new NotFoundException("Automation trigger column not found in this board");
        }
    }

    private void validateRecipients(
            JdbcTemplate jdbc, TenantContext context, UUID projectId, Set<UUID> recipients) {
        Set<UUID> active = tenantMemberships.findAllByTenantIdAndActiveTrue(context.tenantId()).stream()
                .filter(member -> member.isActive() && context.tenantId().equals(member.getTenantId()))
                .map(member -> member.getUserId()).collect(java.util.stream.Collectors.toSet());
        for (UUID userId : recipients) {
            if (!active.contains(userId) || count(jdbc, """
                    SELECT count(*) FROM project_memberships
                    WHERE tenant_id=? AND project_id=? AND user_id=?
                    """, context.tenantId(), projectId, userId) == 0) {
                throw new ConflictException("Automation recipients must be active project members");
            }
        }
    }

    private RuleView findRule(JdbcTemplate jdbc, TenantContext context, UUID ruleId) {
        List<RuleView> rows = jdbc.query("""
                SELECT id,project_id,name,trigger_type,trigger_board_id,trigger_column_id,
                       action_type,action_user_ids,enabled,version,created_at
                FROM automation_rules WHERE tenant_id=? AND id=?
                """, (rs, rowNum) -> new RuleView(
                rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                rs.getString("name"), TriggerType.valueOf(rs.getString("trigger_type")),
                rs.getObject("trigger_board_id", UUID.class), rs.getObject("trigger_column_id", UUID.class),
                ActionType.valueOf(rs.getString("action_type")),
                List.of((UUID[]) rs.getArray("action_user_ids").getArray()),
                rs.getBoolean("enabled"), rs.getLong("version"), rs.getTimestamp("created_at").toInstant()),
                context.tenantId(), ruleId);
        if (rows.isEmpty()) throw new NotFoundException("Automation rule not found");
        return rows.getFirst();
    }

    private void requireProjectRole(
            JdbcTemplate jdbc, TenantContext context, UUID projectId, ProjectRole minimum) {
        List<String> roles = jdbc.query("""
                SELECT pm.role FROM project_memberships pm
                JOIN projects p ON p.tenant_id=pm.tenant_id AND p.id=pm.project_id
                WHERE pm.tenant_id=? AND pm.project_id=? AND pm.user_id=? AND p.status<>'DELETED'
                """, (rs, rowNum) -> rs.getString(1), context.tenantId(), projectId, context.userId());
        if (roles.isEmpty() || rank(ProjectRole.valueOf(roles.getFirst())) < rank(minimum)) {
            throw new TenantAccessDeniedException("Insufficient project role");
        }
    }

    private int rank(ProjectRole role) {
        return switch (role) { case VIEWER -> 1; case MEMBER -> 2; case MANAGER -> 3; };
    }

    private long count(JdbcTemplate jdbc, String sql, Object... args) {
        Long value = jdbc.queryForObject(sql, Long.class, args);
        return value == null ? 0 : value;
    }

    private String normalizedName(String value) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.length() < 2 || normalized.length() > 120) {
            throw new IllegalArgumentException("Automation rule name must contain 2 to 120 characters");
        }
        return normalized;
    }

    private void audit(
            JdbcTemplate jdbc, TenantContext context, String eventType, UUID aggregateId, Map<String, ?> details) {
        jdbc.update("""
                INSERT INTO audit_events(
                    id,tenant_id,actor_user_id,event_type,aggregate_type,aggregate_id,correlation_id,details_json)
                VALUES (?,?,?,?,?,?,?,CAST(? AS jsonb))
                """, UUID.randomUUID(), context.tenantId(), context.userId(), eventType, "AutomationRule",
                aggregateId, context.correlationId(), objectMapper.writeValueAsString(details));
    }

    private TenantContext contextWithCapability() {
        TenantContext context = TenantContextHolder.getRequired();
        capabilities.require(context.tenantId(), TenantCapability.AUTOMATION);
        return context;
    }

    private TenantContext contextForRead() {
        TenantContext context = TenantContextHolder.getRequired();
        if (!TenantCapabilityService.supported(context.placement(), TenantCapability.AUTOMATION)) {
            throw new TenantAccessDeniedException("Automation is outside the selected tenant placement");
        }
        return context;
    }

    public enum TriggerType { TASK_CREATED, TASK_MOVED, APPROVAL_APPROVED, APPROVAL_REJECTED }
    public enum ActionType { ASSIGN_USER, NOTIFY_USERS }
    public record CreateRule(
            String name, TriggerType triggerType, UUID triggerBoardId, UUID triggerColumnId,
            ActionType actionType, List<UUID> actionUserIds) {}
    public record RuleView(
            UUID id, UUID projectId, String name, TriggerType triggerType, UUID triggerBoardId,
            UUID triggerColumnId, ActionType actionType, List<UUID> actionUserIds,
            boolean enabled, long version, Instant createdAt) {}
    public record ExecutionView(
            UUID id, UUID ruleId, UUID sourceEventId, long ruleVersion, String status,
            int attempts, String errorCode, Instant createdAt, Instant updatedAt) {}
}
