package vn.edu.ctu.saas.customization;

import java.sql.Timestamp;
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
public class ApprovalService {
    private final TenantJdbcExecutor executor;
    private final TenantCapabilityService capabilities;
    private final TenantMembershipRepository tenantMemberships;
    private final ObjectMapper objectMapper;

    public ApprovalService(
            TenantJdbcExecutor executor,
            TenantCapabilityService capabilities,
            TenantMembershipRepository tenantMemberships,
            ObjectMapper objectMapper) {
        this.executor = executor;
        this.capabilities = capabilities;
        this.tenantMemberships = tenantMemberships;
        this.objectMapper = objectMapper;
    }

    public WorkflowView workflow(UUID boardId) {
        TenantContext context = contextForRead();
        return executor.read(jdbc -> {
            UUID projectId = requireBoardProject(jdbc, context, boardId, ProjectRole.VIEWER);
            List<WorkflowBase> rows = jdbc.query("""
                    SELECT id,project_id,board_id,completion_column_id,name,enabled,version
                    FROM approval_workflows WHERE tenant_id=? AND board_id=?
                    """, (rs, rowNum) -> new WorkflowBase(
                    rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                    rs.getObject("board_id", UUID.class), rs.getObject("completion_column_id", UUID.class),
                    rs.getString("name"), rs.getBoolean("enabled"), rs.getLong("version")),
                    context.tenantId(), boardId);
            return rows.isEmpty() ? null : workflowWithSteps(jdbc, context, rows.getFirst());
        });
    }

    public WorkflowView saveWorkflow(
            UUID boardId, UUID completionColumnId, String name, boolean enabled,
            List<StepInput> steps, long expectedVersion) {
        TenantContext context = contextWithCapability();
        if (steps == null || steps.isEmpty()) throw new IllegalArgumentException("Approval workflow requires at least one step");
        if (steps.size() > 20) throw new IllegalArgumentException("Approval workflow supports up to 20 steps");
        return executor.write(jdbc -> {
            UUID projectId = requireBoardProject(jdbc, context, boardId, ProjectRole.MANAGER);
            requireCompletionColumn(jdbc, context, boardId, completionColumnId);
            List<WorkflowBase> existing = workflowBases(jdbc, context, boardId);
            UUID workflowId;
            long newVersion;
            if (existing.isEmpty()) {
                if (expectedVersion != 0) throw new ConflictException("Approval workflow version is stale");
                workflowId = UUID.randomUUID();
                newVersion = 0;
                jdbc.update("""
                        INSERT INTO approval_workflows(
                            id,tenant_id,project_id,board_id,completion_column_id,name,enabled,version,created_by)
                        VALUES (?,?,?,?,?,?,?,?,?)
                        """, workflowId, context.tenantId(), projectId, boardId, completionColumnId,
                        normalizedName(name), enabled, newVersion, context.userId());
            } else {
                WorkflowBase row = existing.getFirst();
                if (row.version() != expectedVersion) throw new ConflictException("Approval workflow version is stale");
                if (!enabled && pendingRunCount(jdbc, context, row.id()) > 0) {
                    throw new ConflictException("Resolve or withdraw pending approval runs before disabling the workflow");
                }
                workflowId = row.id();
                newVersion = expectedVersion + 1;
                int updated = jdbc.update("""
                        UPDATE approval_workflows SET completion_column_id=?,name=?,enabled=?,version=version+1,updated_at=now()
                        WHERE tenant_id=? AND id=? AND version=?
                        """, completionColumnId, normalizedName(name), enabled,
                        context.tenantId(), workflowId, expectedVersion);
                if (updated == 0) throw new ConflictException("Approval workflow version is stale");
                jdbc.update("DELETE FROM approval_workflow_steps WHERE tenant_id=? AND workflow_id=?",
                        context.tenantId(), workflowId);
            }
            int position = 1;
            for (StepInput input : steps) {
                Set<UUID> approvers = input.approverIds() == null ? Set.of() : new HashSet<>(input.approverIds());
                if (approvers.isEmpty()) throw new IllegalArgumentException("Every approval step requires an approver");
                validateApprovers(jdbc, context, projectId, approvers);
                UUID stepId = UUID.randomUUID();
                jdbc.update("""
                        INSERT INTO approval_workflow_steps(id,tenant_id,workflow_id,name,position,approval_mode)
                        VALUES (?,?,?,?,?,?)
                        """, stepId, context.tenantId(), workflowId, normalizedName(input.name()), position++,
                        input.mode().name());
                for (UUID approver : approvers) {
                    jdbc.update("INSERT INTO approval_step_approvers(id,tenant_id,step_id,user_id) VALUES (?,?,?,?)",
                            UUID.randomUUID(), context.tenantId(), stepId, approver);
                }
            }
            auditAndOutbox(jdbc, context, "APPROVAL_WORKFLOW_SAVED", "ApprovalWorkflow", workflowId,
                    Map.of("boardId", boardId, "version", newVersion));
            return workflowWithSteps(jdbc, context, workflowBases(jdbc, context, boardId).getFirst());
        });
    }

    public RunView submit(UUID taskId) {
        TenantContext context = contextWithCapability();
        Set<UUID> activeTenantUsers = activeTenantUsers(context.tenantId());
        return executor.write(jdbc -> {
            TaskBase task = requireTask(jdbc, context, taskId, ProjectRole.MEMBER);
            List<WorkflowBase> workflows = workflowBases(jdbc, context, task.boardId());
            if (workflows.isEmpty() || !workflows.getFirst().enabled()) {
                throw new ConflictException("An enabled approval workflow is required for this board");
            }
            WorkflowView workflow = workflowWithSteps(jdbc, context, workflows.getFirst());
            if (workflow.steps().isEmpty()) throw new ConflictException("Approval workflow has no steps");
            if (pendingRunCountForTask(jdbc, context, taskId) > 0) {
                throw new ConflictException("This task already has a pending approval run");
            }
            List<StepView> effectiveSteps = workflow.steps().stream().map(step -> new StepView(
                    step.id(), step.name(), step.position(), step.mode(), step.approverIds().stream()
                    .filter(activeTenantUsers::contains)
                    .filter(userId -> eligibleApprover(jdbc, context, workflow.projectId(), userId))
                    .filter(userId -> !userId.equals(context.userId())).toList())).toList();
            if (effectiveSteps.stream().anyMatch(step -> step.approverIds().isEmpty())) {
                throw new ConflictException("Every step must retain an eligible approver after excluding the submitter");
            }
            UUID runId = UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO approval_runs(
                        id,tenant_id,workflow_id,workflow_version,project_id,completion_column_id,
                        task_id,submitted_by,status,current_step,task_snapshot_json)
                    VALUES (?,?,?,?,?,?,?,?,'PENDING',1,CAST(? AS jsonb))
                    """, runId, context.tenantId(), workflow.id(), workflow.version(), workflow.projectId(),
                    workflow.completionColumnId(), taskId, context.userId(),
                    objectMapper.writeValueAsString(task.snapshot()));
            for (StepView step : effectiveSteps) {
                UUID runStepId = UUID.randomUUID();
                jdbc.update("""
                        INSERT INTO approval_run_steps(id,tenant_id,run_id,position,name,approval_mode,status)
                        VALUES (?,?,?,?,?,?,?)
                        """, runStepId, context.tenantId(), runId, step.position(), step.name(), step.mode().name(),
                        step.position() == 1 ? "PENDING" : "WAITING");
                for (UUID approverId : step.approverIds()) {
                    jdbc.update("""
                            INSERT INTO approval_run_approvers(id,tenant_id,run_step_id,user_id)
                            VALUES (?,?,?,?)
                            """, UUID.randomUUID(), context.tenantId(), runStepId, approverId);
                }
            }
            auditAndOutbox(jdbc, context, "APPROVAL_SUBMITTED", "ApprovalRun", runId,
                    Map.of("taskId", taskId, "projectId", task.projectId()));
            return findRun(jdbc, context, runId);
        });
    }

    public RunView decide(UUID runId, Decision decision, long expectedVersion) {
        TenantContext context = contextWithCapability();
        if (!activeTenantUsers(context.tenantId()).contains(context.userId())) {
            throw new TenantAccessDeniedException("Only an active tenant member can approve");
        }
        return executor.write(jdbc -> {
            RunBase run = lockRun(jdbc, context, runId);
            if (!"PENDING".equals(run.status())) throw new ConflictException("Approval run is no longer pending");
            if (run.version() != expectedVersion) throw new ConflictException("Approval run version is stale");
            StepRuntime step = currentStep(jdbc, context, runId, run.currentStep());
            if (!eligibleApprover(jdbc, context, run.projectId(), context.userId())) {
                throw new TenantAccessDeniedException("The approver no longer has an eligible project role");
            }
            int updatedApprover = jdbc.update("""
                    UPDATE approval_run_approvers SET decision=?,decided_at=now()
                    WHERE tenant_id=? AND run_step_id=? AND user_id=? AND decision IS NULL
                    """, decision.name(), context.tenantId(), step.id(), context.userId());
            if (updatedApprover == 0) throw new ConflictException("This approver cannot decide the current step again");
            if (decision == Decision.REJECTED) {
                jdbc.update("UPDATE approval_run_steps SET status='REJECTED' WHERE tenant_id=? AND id=? AND status='PENDING'",
                        context.tenantId(), step.id());
                finishRun(jdbc, context, run, "REJECTED", expectedVersion);
                auditAndOutbox(jdbc, context, "APPROVAL_REJECTED", "Task", run.taskId(),
                        Map.of("runId", runId, "projectId", run.projectId()));
                return findRun(jdbc, context, runId);
            }
            long approved = count(jdbc, """
                    SELECT count(*) FROM approval_run_approvers
                    WHERE tenant_id=? AND run_step_id=? AND active=true AND decision='APPROVED'
                    """, context.tenantId(), step.id());
            long total = count(jdbc,
                    "SELECT count(*) FROM approval_run_approvers WHERE tenant_id=? AND run_step_id=? AND active=true",
                    context.tenantId(), step.id());
            boolean stepDone = step.mode() == ApprovalMode.ANY ? approved >= 1 : approved == total;
            if (stepDone) {
                jdbc.update("UPDATE approval_run_steps SET status='APPROVED' WHERE tenant_id=? AND id=? AND status='PENDING'",
                        context.tenantId(), step.id());
                long steps = count(jdbc,
                        "SELECT count(*) FROM approval_run_steps WHERE tenant_id=? AND run_id=?",
                        context.tenantId(), runId);
                if (run.currentStep() == steps) {
                    finishRun(jdbc, context, run, "APPROVED", expectedVersion);
                    jdbc.update("""
                            UPDATE tasks SET board_column_id=?,version=version+1,updated_at=now()
                            WHERE tenant_id=? AND id=? AND deleted_at IS NULL
                            """, run.completionColumnId(), context.tenantId(), run.taskId());
                    auditAndOutbox(jdbc, context, "APPROVAL_APPROVED", "Task", run.taskId(),
                            Map.of("runId", runId, "projectId", run.projectId(),
                                    "columnId", run.completionColumnId()));
                } else {
                    jdbc.update("UPDATE approval_run_steps SET status='PENDING' WHERE tenant_id=? AND run_id=? AND position=?",
                            context.tenantId(), runId, run.currentStep() + 1);
                    int advanced = jdbc.update("""
                            UPDATE approval_runs SET current_step=current_step+1,version=version+1,updated_at=now()
                            WHERE tenant_id=? AND id=? AND version=? AND status='PENDING'
                            """, context.tenantId(), runId, expectedVersion);
                    if (advanced == 0) throw new ConflictException("Approval run version is stale");
                }
            } else {
                int advanced = jdbc.update("""
                        UPDATE approval_runs SET version=version+1,updated_at=now()
                        WHERE tenant_id=? AND id=? AND version=? AND status='PENDING'
                        """, context.tenantId(), runId, expectedVersion);
                if (advanced == 0) throw new ConflictException("Approval run version is stale");
            }
            return findRun(jdbc, context, runId);
        });
    }

    public RunView withdraw(UUID runId, long expectedVersion) {
        TenantContext context = contextWithCapability();
        return executor.write(jdbc -> {
            RunBase run = lockRun(jdbc, context, runId);
            if (!run.submittedBy().equals(context.userId())) {
                requireProjectRole(jdbc, context, run.projectId(), ProjectRole.MANAGER);
            }
            finishRun(jdbc, context, run, "WITHDRAWN", expectedVersion);
            auditAndOutbox(jdbc, context, "APPROVAL_WITHDRAWN", "ApprovalRun", runId,
                    Map.of("taskId", run.taskId(), "projectId", run.projectId()));
            return findRun(jdbc, context, runId);
        });
    }

    public RunView replaceApprover(UUID runId, int stepPosition, UUID oldUserId, UUID newUserId, long expectedVersion) {
        TenantContext context = contextWithCapability();
        if (!activeTenantUsers(context.tenantId()).contains(newUserId)) {
            throw new ConflictException("Replacement approver is not an active tenant member");
        }
        return executor.write(jdbc -> {
            RunBase run = lockRun(jdbc, context, runId);
            requireProjectRole(jdbc, context, run.projectId(), ProjectRole.MANAGER);
            if (!"PENDING".equals(run.status()) || stepPosition < run.currentStep()) {
                throw new ConflictException("Only an unfinished approval step can be changed");
            }
            if (!eligibleApprover(jdbc, context, run.projectId(), newUserId)
                    || newUserId.equals(run.submittedBy())) {
                throw new ConflictException("Replacement approver is not eligible");
            }
            StepRuntime step = step(jdbc, context, runId, stepPosition);
            if (oldUserId.equals(newUserId)) throw new ConflictException("Select another replacement approver");
            if (count(jdbc, """
                    SELECT count(*) FROM approval_run_approvers
                    WHERE tenant_id=? AND run_step_id=? AND user_id=?
                    """, context.tenantId(), step.id(), newUserId) > 0) {
                throw new ConflictException("Replacement approver is already part of this step snapshot");
            }
            int updated = jdbc.update("""
                    UPDATE approval_run_approvers
                    SET active=false,replaced_by_user_id=?,replaced_at=now()
                    WHERE tenant_id=? AND run_step_id=? AND user_id=? AND active=true
                    """, newUserId, context.tenantId(), step.id(), oldUserId);
            if (updated == 0) throw new NotFoundException("Approver was not found in the selected step");
            jdbc.update("""
                    INSERT INTO approval_run_approvers(id,tenant_id,run_step_id,user_id)
                    VALUES (?,?,?,?)
                    """, UUID.randomUUID(), context.tenantId(), step.id(), newUserId);
            int advanced = jdbc.update("""
                    UPDATE approval_runs SET version=version+1,updated_at=now()
                    WHERE tenant_id=? AND id=? AND version=? AND status='PENDING'
                    """, context.tenantId(), runId, expectedVersion);
            if (advanced == 0) throw new ConflictException("Approval run version is stale");
            auditAndOutbox(jdbc, context, "APPROVAL_APPROVER_REPLACED", "ApprovalRun", runId,
                    Map.of("projectId", run.projectId(), "step", stepPosition,
                            "oldUserId", oldUserId, "newUserId", newUserId));
            return findRun(jdbc, context, runId);
        });
    }

    public List<RunView> taskRuns(UUID taskId) {
        TenantContext context = contextForRead();
        return executor.read(jdbc -> {
            requireTask(jdbc, context, taskId, ProjectRole.VIEWER);
            List<UUID> ids = jdbc.query("""
                    SELECT id FROM approval_runs WHERE tenant_id=? AND task_id=? ORDER BY created_at DESC
                    """, (rs, rowNum) -> rs.getObject(1, UUID.class), context.tenantId(), taskId);
            return ids.stream().map(id -> findRun(jdbc, context, id)).toList();
        });
    }

    public static void assertCompletionMoveAllowed(
            JdbcTemplate jdbc, TenantContext context, UUID taskId, UUID targetColumnId) {
        Long protectedColumn = jdbc.query("""
                SELECT count(*) FROM approval_workflows w
                JOIN tasks t ON t.tenant_id=w.tenant_id AND t.board_id=w.board_id
                WHERE w.tenant_id=? AND t.id=? AND w.enabled=true AND w.completion_column_id=?
                """, rs -> rs.next() ? rs.getLong(1) : 0L,
                context.tenantId(), taskId, targetColumnId);
        if (protectedColumn == null || protectedColumn == 0) return;
        Long approved = jdbc.query("""
                SELECT count(*) FROM approval_runs
                WHERE tenant_id=? AND task_id=? AND status='APPROVED' AND completion_column_id=?
                """, rs -> rs.next() ? rs.getLong(1) : 0L,
                context.tenantId(), taskId, targetColumnId);
        if (approved == null || approved == 0) {
            throw new ConflictException("This task must complete its approval workflow before entering the completion column");
        }
    }

    public static void assertCreateColumnAllowed(
            JdbcTemplate jdbc, TenantContext context, UUID boardId, UUID targetColumnId) {
        Long protectedColumn = jdbc.query("""
                SELECT count(*) FROM approval_workflows
                WHERE tenant_id=? AND board_id=? AND enabled=true AND completion_column_id=?
                """, rs -> rs.next() ? rs.getLong(1) : 0L,
                context.tenantId(), boardId, targetColumnId);
        if (protectedColumn != null && protectedColumn > 0) {
            throw new ConflictException("A new task cannot be created directly in an approval completion column");
        }
    }

    public static void assertEditableOutsideCompletion(
            JdbcTemplate jdbc, TenantContext context, UUID taskId, UUID currentColumnId) {
        Long protectedColumn = jdbc.query("""
                SELECT count(*) FROM approval_workflows w
                JOIN tasks t ON t.tenant_id=w.tenant_id AND t.board_id=w.board_id
                WHERE w.tenant_id=? AND t.id=? AND w.enabled=true AND w.completion_column_id=?
                """, rs -> rs.next() ? rs.getLong(1) : 0L,
                context.tenantId(), taskId, currentColumnId);
        if (protectedColumn != null && protectedColumn > 0) {
            throw new ConflictException("Move the task out of the approval completion column before editing protected content");
        }
    }

    public static void invalidatePending(
            JdbcTemplate jdbc, TenantContext context, UUID taskId, String reason, ObjectMapper objectMapper) {
        int updated = jdbc.update("""
                UPDATE approval_runs
                SET status='INVALIDATED',
                    completed_at=CASE WHEN status='PENDING' THEN now() ELSE completed_at END,
                    invalidated_at=now(),invalidation_reason=?,version=version+1,updated_at=now()
                WHERE tenant_id=? AND task_id=? AND status IN ('PENDING','APPROVED')
                """, reason, context.tenantId(), taskId);
        if (updated > 0) jdbc.update("""
                INSERT INTO audit_events(
                    id,tenant_id,actor_user_id,event_type,aggregate_type,aggregate_id,correlation_id,details_json)
                VALUES (?,?,?,?,?,?,?,CAST(? AS jsonb))
                """, UUID.randomUUID(), context.tenantId(), context.userId(), "TASK_APPROVAL_INVALIDATED",
                "Task", taskId, context.correlationId(), objectMapper.writeValueAsString(Map.of("reason", reason)));
    }

    private void finishRun(JdbcTemplate jdbc, TenantContext context, RunBase run, String status, long expectedVersion) {
        int updated = jdbc.update("""
                UPDATE approval_runs SET status=?,completed_at=now(),version=version+1,updated_at=now()
                WHERE tenant_id=? AND id=? AND version=? AND status='PENDING'
                """, status, context.tenantId(), run.id(), expectedVersion);
        if (updated == 0) throw new ConflictException("Approval run version is stale");
    }

    private WorkflowView workflowWithSteps(JdbcTemplate jdbc, TenantContext context, WorkflowBase row) {
        List<StepBase> stepRows = jdbc.query("""
                SELECT id,name,position,approval_mode FROM approval_workflow_steps
                WHERE tenant_id=? AND workflow_id=? ORDER BY position
                """, (rs, rowNum) -> new StepBase(
                rs.getObject("id", UUID.class), rs.getString("name"), rs.getInt("position"),
                ApprovalMode.valueOf(rs.getString("approval_mode"))), context.tenantId(), row.id());
        List<StepView> steps = stepRows.stream().map(step -> new StepView(
                step.id(), step.name(), step.position(), step.mode(), jdbc.query("""
                        SELECT user_id FROM approval_step_approvers
                        WHERE tenant_id=? AND step_id=? ORDER BY user_id
                        """, (rs, rowNum) -> rs.getObject(1, UUID.class), context.tenantId(), step.id()))).toList();
        return new WorkflowView(row.id(), row.projectId(), row.boardId(), row.completionColumnId(),
                row.name(), row.enabled(), row.version(), steps);
    }

    private RunView findRun(JdbcTemplate jdbc, TenantContext context, UUID runId) {
        RunBase run = run(jdbc, context, runId, false);
        requireProjectRole(jdbc, context, run.projectId(), ProjectRole.VIEWER);
        List<RunStepView> steps = jdbc.query("""
                SELECT id,position,name,approval_mode,status FROM approval_run_steps
                WHERE tenant_id=? AND run_id=? ORDER BY position
                """, (rs, rowNum) -> {
            UUID stepId = rs.getObject("id", UUID.class);
            List<ApproverView> approvers = jdbc.query("""
                    SELECT user_id,decision,decided_at FROM approval_run_approvers
                    WHERE tenant_id=? AND run_step_id=? ORDER BY user_id
                    """, (approverRs, approverRow) -> new ApproverView(
                    approverRs.getObject("user_id", UUID.class), approverRs.getString("decision"),
                    timestamp(approverRs.getTimestamp("decided_at"))), context.tenantId(), stepId);
            return new RunStepView(stepId, rs.getInt("position"), rs.getString("name"),
                    ApprovalMode.valueOf(rs.getString("approval_mode")), rs.getString("status"), approvers);
        }, context.tenantId(), runId);
        return new RunView(run.id(), run.workflowId(), run.taskId(), run.submittedBy(), run.status(),
                run.currentStep(), run.version(), run.createdAt(), run.completedAt(), steps);
    }

    private RunBase lockRun(JdbcTemplate jdbc, TenantContext context, UUID runId) {
        return run(jdbc, context, runId, true);
    }

    private RunBase run(JdbcTemplate jdbc, TenantContext context, UUID runId, boolean lock) {
        String sql = """
                SELECT r.id,r.workflow_id,r.task_id,r.submitted_by,r.status,r.current_step,r.version,
                       r.created_at,r.completed_at,r.project_id,r.completion_column_id
                FROM approval_runs r
                WHERE r.tenant_id=? AND r.id=?
                """ + (lock ? " FOR UPDATE" : "");
        List<RunBase> rows = jdbc.query(sql, (rs, rowNum) -> new RunBase(
                rs.getObject("id", UUID.class), rs.getObject("workflow_id", UUID.class),
                rs.getObject("task_id", UUID.class), rs.getObject("submitted_by", UUID.class),
                rs.getString("status"), rs.getInt("current_step"), rs.getLong("version"),
                rs.getTimestamp("created_at").toInstant(), timestamp(rs.getTimestamp("completed_at")),
                rs.getObject("project_id", UUID.class), rs.getObject("completion_column_id", UUID.class)),
                context.tenantId(), runId);
        if (rows.isEmpty()) throw new NotFoundException("Approval run not found");
        return rows.getFirst();
    }

    private StepRuntime currentStep(JdbcTemplate jdbc, TenantContext context, UUID runId, int position) {
        StepRuntime step = step(jdbc, context, runId, position);
        if (!"PENDING".equals(step.status())) throw new ConflictException("Approval step is no longer current");
        Long assigned = jdbc.query("""
                SELECT count(*) FROM approval_run_approvers
                WHERE tenant_id=? AND run_step_id=? AND user_id=? AND active=true AND decision IS NULL
                """, rs -> rs.next() ? rs.getLong(1) : 0L, context.tenantId(), step.id(), context.userId());
        if (assigned == null || assigned == 0) throw new TenantAccessDeniedException("User is not an approver for the current step");
        return step;
    }

    private StepRuntime step(JdbcTemplate jdbc, TenantContext context, UUID runId, int position) {
        List<StepRuntime> rows = jdbc.query("""
                SELECT id,approval_mode,status FROM approval_run_steps
                WHERE tenant_id=? AND run_id=? AND position=?
                """, (rs, rowNum) -> new StepRuntime(
                rs.getObject("id", UUID.class), ApprovalMode.valueOf(rs.getString("approval_mode")),
                rs.getString("status")), context.tenantId(), runId, position);
        if (rows.isEmpty()) throw new NotFoundException("Approval step not found");
        return rows.getFirst();
    }

    private List<WorkflowBase> workflowBases(JdbcTemplate jdbc, TenantContext context, UUID boardId) {
        return jdbc.query("""
                SELECT id,project_id,board_id,completion_column_id,name,enabled,version
                FROM approval_workflows WHERE tenant_id=? AND board_id=?
                """, (rs, rowNum) -> new WorkflowBase(
                rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                rs.getObject("board_id", UUID.class), rs.getObject("completion_column_id", UUID.class),
                rs.getString("name"), rs.getBoolean("enabled"), rs.getLong("version")),
                context.tenantId(), boardId);
    }

    private TaskBase requireTask(JdbcTemplate jdbc, TenantContext context, UUID taskId, ProjectRole role) {
        List<TaskBase> rows = jdbc.query("""
                SELECT id,project_id,board_id,board_column_id,title,description,assignee_user_id,due_at,version
                FROM tasks WHERE tenant_id=? AND id=? AND deleted_at IS NULL
                """, (rs, rowNum) -> new TaskBase(
                rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                rs.getObject("board_id", UUID.class), Map.of(
                        "id", rs.getObject("id", UUID.class),
                        "columnId", rs.getObject("board_column_id", UUID.class),
                        "title", rs.getString("title"),
                        "description", rs.getString("description") == null ? "" : rs.getString("description"),
                        "assigneeUserId", rs.getObject("assignee_user_id", UUID.class) == null
                                ? "" : rs.getObject("assignee_user_id", UUID.class),
                        "dueAt", rs.getTimestamp("due_at") == null ? "" : rs.getTimestamp("due_at").toInstant(),
                        "version", rs.getLong("version"))), context.tenantId(), taskId);
        if (rows.isEmpty()) throw new NotFoundException("Task not found");
        requireProjectRole(jdbc, context, rows.getFirst().projectId(), role);
        return rows.getFirst();
    }

    private UUID requireBoardProject(
            JdbcTemplate jdbc, TenantContext context, UUID boardId, ProjectRole role) {
        UUID projectId = jdbc.query("""
                SELECT project_id FROM boards WHERE tenant_id=? AND id=? AND deleted_at IS NULL
                """, rs -> rs.next() ? rs.getObject(1, UUID.class) : null, context.tenantId(), boardId);
        if (projectId == null) throw new NotFoundException("Board not found");
        requireProjectRole(jdbc, context, projectId, role);
        return projectId;
    }

    private void requireCompletionColumn(
            JdbcTemplate jdbc, TenantContext context, UUID boardId, UUID completionColumnId) {
        if (count(jdbc, """
                SELECT count(*) FROM board_columns WHERE tenant_id=? AND board_id=? AND id=?
                """, context.tenantId(), boardId, completionColumnId) == 0) {
            throw new NotFoundException("Completion column not found in this board");
        }
    }

    private void validateApprovers(
            JdbcTemplate jdbc, TenantContext context, UUID projectId, Set<UUID> approverIds) {
        Set<UUID> active = activeTenantUsers(context.tenantId());
        for (UUID approverId : approverIds) {
            if (!active.contains(approverId) || !eligibleApprover(jdbc, context, projectId, approverId)) {
                throw new ConflictException("Approvers must be active project Managers or Members");
            }
        }
    }

    private boolean eligibleApprover(JdbcTemplate jdbc, TenantContext context, UUID projectId, UUID userId) {
        List<String> roles = jdbc.query("""
                SELECT role FROM project_memberships WHERE tenant_id=? AND project_id=? AND user_id=?
                """, (rs, rowNum) -> rs.getString(1), context.tenantId(), projectId, userId);
        return !roles.isEmpty() && ("MANAGER".equals(roles.getFirst()) || "MEMBER".equals(roles.getFirst()));
    }

    private Set<UUID> activeTenantUsers(UUID tenantId) {
        return tenantMemberships.findAllByTenantIdAndActiveTrue(tenantId).stream()
                .filter(member -> member.isActive() && tenantId.equals(member.getTenantId()))
                .map(member -> member.getUserId()).collect(java.util.stream.Collectors.toUnmodifiableSet());
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

    private long pendingRunCount(JdbcTemplate jdbc, TenantContext context, UUID workflowId) {
        return count(jdbc, "SELECT count(*) FROM approval_runs WHERE tenant_id=? AND workflow_id=? AND status='PENDING'",
                context.tenantId(), workflowId);
    }

    private long pendingRunCountForTask(JdbcTemplate jdbc, TenantContext context, UUID taskId) {
        return count(jdbc, "SELECT count(*) FROM approval_runs WHERE tenant_id=? AND task_id=? AND status='PENDING'",
                context.tenantId(), taskId);
    }

    private long count(JdbcTemplate jdbc, String sql, Object... args) {
        Long value = jdbc.queryForObject(sql, Long.class, args);
        return value == null ? 0 : value;
    }

    private String normalizedName(String value) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.length() < 2 || normalized.length() > 120) {
            throw new IllegalArgumentException("Name must contain 2 to 120 characters");
        }
        return normalized;
    }

    private void auditAndOutbox(
            JdbcTemplate jdbc, TenantContext context, String eventType, String aggregateType,
            UUID aggregateId, Map<String, ?> details) {
        String json = objectMapper.writeValueAsString(details);
        jdbc.update("""
                INSERT INTO audit_events(
                    id,tenant_id,actor_user_id,event_type,aggregate_type,aggregate_id,correlation_id,details_json)
                VALUES (?,?,?,?,?,?,?,CAST(? AS jsonb))
                """, UUID.randomUUID(), context.tenantId(), context.userId(), eventType, aggregateType,
                aggregateId, context.correlationId(), json);
        jdbc.update("""
                INSERT INTO outbox_events(
                    id,tenant_id,actor_user_id,event_type,aggregate_type,aggregate_id,correlation_id,payload_json)
                VALUES (?,?,?,?,?,?,?,CAST(? AS jsonb))
                """, UUID.randomUUID(), context.tenantId(), context.userId(), eventType, aggregateType,
                aggregateId, context.correlationId(), json);
    }

    private TenantContext contextWithCapability() {
        TenantContext context = TenantContextHolder.getRequired();
        capabilities.require(context.tenantId(), TenantCapability.APPROVALS);
        return context;
    }

    private TenantContext contextForRead() {
        TenantContext context = TenantContextHolder.getRequired();
        if (!TenantCapabilityService.supported(context.placement(), TenantCapability.APPROVALS)) {
            throw new TenantAccessDeniedException("Approvals are outside the selected tenant placement");
        }
        return context;
    }

    private Instant timestamp(Timestamp value) { return value == null ? null : value.toInstant(); }

    public enum ApprovalMode { ANY, ALL }
    public enum Decision { APPROVED, REJECTED }
    public record StepInput(String name, ApprovalMode mode, List<UUID> approverIds) {}
    public record WorkflowView(
            UUID id, UUID projectId, UUID boardId, UUID completionColumnId, String name,
            boolean enabled, long version, List<StepView> steps) {}
    public record StepView(UUID id, String name, int position, ApprovalMode mode, List<UUID> approverIds) {}
    public record ApproverView(UUID userId, String decision, Instant decidedAt) {}
    public record RunStepView(
            UUID id, int position, String name, ApprovalMode mode, String status, List<ApproverView> approvers) {}
    public record RunView(
            UUID id, UUID workflowId, UUID taskId, UUID submittedBy, String status,
            int currentStep, long version, Instant createdAt, Instant completedAt, List<RunStepView> steps) {}

    private record WorkflowBase(
            UUID id, UUID projectId, UUID boardId, UUID completionColumnId,
            String name, boolean enabled, long version) {}
    private record StepBase(UUID id, String name, int position, ApprovalMode mode) {}
    private record StepRuntime(UUID id, ApprovalMode mode, String status) {}
    private record TaskBase(UUID id, UUID projectId, UUID boardId, Map<String, Object> snapshot) {}
    private record RunBase(
            UUID id, UUID workflowId, UUID taskId, UUID submittedBy, String status,
            int currentStep, long version, Instant createdAt, Instant completedAt,
            UUID projectId, UUID completionColumnId) {}
}
