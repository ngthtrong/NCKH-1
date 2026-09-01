package vn.edu.ctu.saas.application;

import static vn.edu.ctu.saas.application.ApplicationDtos.*;

import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.common.NotFoundException;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.tenant.ProjectRole;
import vn.edu.ctu.saas.tenant.ProjectStatus;
import vn.edu.ctu.saas.tenant.TenantAccessDeniedException;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;

@Service
public class ProjectApplicationService {
    private final TenantJdbcExecutor executor;
    private final ObjectMapper objectMapper;
    private final TenantMembershipRepository tenantMembershipRepository;

    public ProjectApplicationService(
            TenantJdbcExecutor executor,
            ObjectMapper objectMapper,
            TenantMembershipRepository tenantMembershipRepository) {
        this.executor = executor;
        this.objectMapper = objectMapper;
        this.tenantMembershipRepository = tenantMembershipRepository;
    }

    public DashboardView dashboard() {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.read(jdbc -> new DashboardView(
                count(jdbc, """
                        SELECT count(*) FROM projects p JOIN project_memberships pm
                          ON pm.tenant_id=p.tenant_id AND pm.project_id=p.id
                        WHERE p.tenant_id=? AND pm.user_id=? AND p.status='ACTIVE'
                        """, context.tenantId(), context.userId()),
                count(jdbc, """
                        SELECT count(*) FROM boards b JOIN project_memberships pm
                          ON pm.tenant_id=b.tenant_id AND pm.project_id=b.project_id
                        JOIN projects p ON p.tenant_id=b.tenant_id AND p.id=b.project_id
                        WHERE b.tenant_id=? AND pm.user_id=? AND p.status='ACTIVE' AND b.deleted_at IS NULL
                        """, context.tenantId(), context.userId()),
                count(jdbc, """
                        SELECT count(*) FROM tasks t
                        JOIN project_memberships pm ON pm.tenant_id=t.tenant_id AND pm.project_id=t.project_id
                        JOIN board_columns c ON c.tenant_id=t.tenant_id AND c.id=t.board_column_id
                        JOIN projects p ON p.tenant_id=t.tenant_id AND p.id=t.project_id
                        WHERE t.tenant_id=? AND pm.user_id=? AND p.status='ACTIVE' AND t.deleted_at IS NULL
                          AND lower(c.name) NOT IN ('done','hoàn tất')
                        """, context.tenantId(), context.userId()),
                count(jdbc, """
                        SELECT count(*) FROM tasks t
                        JOIN project_memberships pm ON pm.tenant_id=t.tenant_id AND pm.project_id=t.project_id
                        JOIN board_columns c ON c.tenant_id=t.tenant_id AND c.id=t.board_column_id
                        JOIN projects p ON p.tenant_id=t.tenant_id AND p.id=t.project_id
                        WHERE t.tenant_id=? AND pm.user_id=? AND t.due_at < now() AND t.deleted_at IS NULL
                          AND p.status='ACTIVE'
                          AND lower(c.name) NOT IN ('done','hoàn tất')
                        """, context.tenantId(), context.userId()),
                count(jdbc, "SELECT count(*) FROM notifications WHERE tenant_id = ? AND recipient_user_id = ? AND read_at IS NULL",
                        context.tenantId(), context.userId())));
    }

    public List<ProjectView> listProjects() {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.read(jdbc -> {
            String metrics = """
                    ,(SELECT b.id FROM boards b WHERE b.tenant_id=p.tenant_id AND b.project_id=p.id AND b.deleted_at IS NULL ORDER BY b.created_at LIMIT 1) board_id
                    ,(SELECT count(*) FROM project_memberships pmc WHERE pmc.tenant_id=p.tenant_id AND pmc.project_id=p.id) member_count
                    ,(SELECT count(*) FROM tasks tc WHERE tc.tenant_id=p.tenant_id AND tc.project_id=p.id AND tc.deleted_at IS NULL) task_count
                    ,(SELECT count(*) FROM tasks td JOIN board_columns dc ON dc.tenant_id=td.tenant_id AND dc.id=td.board_column_id
                       WHERE td.tenant_id=p.tenant_id AND td.project_id=p.id AND td.deleted_at IS NULL
                         AND lower(dc.name) IN ('done','hoàn tất')) completed_task_count
                    """;
            return jdbc.query("SELECT p.id,p.name,p.description,p.status,p.created_by,p.created_at,p.updated_at,pm.role project_role"
                            + metrics + " FROM projects p JOIN project_memberships pm ON pm.tenant_id=p.tenant_id AND pm.project_id=p.id "
                            + "WHERE p.tenant_id=? AND pm.user_id=? AND p.status<>'DELETED' ORDER BY p.updated_at DESC",
                    this::projectRow, context.tenantId(), context.userId());
        });
    }

    public ProjectView createProject(CreateProjectRequest request) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.write(jdbc -> {
            UUID projectId = UUID.randomUUID();
            try {
                jdbc.update("INSERT INTO projects(id,tenant_id,name,description,created_by) VALUES (?,?,?,?,?)",
                        projectId, context.tenantId(), request.name().trim(), request.description(), context.userId());
                jdbc.update("INSERT INTO project_memberships(id,tenant_id,project_id,user_id,role) VALUES (?,?,?,?,?)",
                        UUID.randomUUID(), context.tenantId(), projectId, context.userId(), ProjectRole.MANAGER.name());
                UUID boardId = UUID.randomUUID();
                jdbc.update("INSERT INTO boards(id,tenant_id,project_id,name) VALUES (?,?,?,?)",
                        boardId, context.tenantId(), projectId, "Kanban");
                String[] columnNames = {"To do", "In progress", "Done"};
                for (int index = 0; index < columnNames.length; index++) {
                    jdbc.update("INSERT INTO board_columns(id,tenant_id,board_id,name,position) VALUES (?,?,?,?,?)",
                            UUID.randomUUID(), context.tenantId(), boardId, columnNames[index],
                            BigDecimal.valueOf((index + 1) * 1000L));
                }
                auditAndOutbox(jdbc, context, "PROJECT_CREATED", "Project", projectId, Map.of("name", request.name().trim()));
            } catch (DataIntegrityViolationException exception) {
                throw new ConflictException("Project name already exists in this tenant");
            }
            return findProject(jdbc, context, projectId);
        });
    }

    public ProjectView updateProject(UUID projectId, UpdateProjectRequest request) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.write(jdbc -> {
            requireProjectRole(jdbc, context, projectId, ProjectRole.MANAGER);
            requireActiveProject(jdbc, context, projectId);
            int updated = jdbc.update(
                    "UPDATE projects SET name=?,description=?,updated_at=now() WHERE tenant_id=? AND id=?",
                    request.name().trim(), request.description(), context.tenantId(), projectId);
            if (updated == 0) throw new NotFoundException("Project not found");
            auditAndOutbox(jdbc, context, "PROJECT_UPDATED", "Project", projectId, Map.of("name", request.name().trim()));
            return findProject(jdbc, context, projectId);
        });
    }

    public ProjectView changeProjectStatus(UUID projectId, ChangeProjectStatusRequest request) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.write(jdbc -> {
            requireProjectRole(jdbc, context, projectId, ProjectRole.MANAGER);
            if (request.status() == ProjectStatus.DELETED) {
                throw new ConflictException("Use project deletion to soft-delete a project");
            }
            ProjectStatus current = lockProjectStatus(jdbc, context, projectId);
            if (current == request.status()) return findProject(jdbc, context, projectId);
            jdbc.update("""
                    UPDATE projects
                    SET status=?, archived_at=?, updated_at=now()
                    WHERE tenant_id=? AND id=? AND status<>'DELETED'
                    """, request.status().name(),
                    request.status() == ProjectStatus.ARCHIVED ? Timestamp.from(Instant.now()) : null,
                    context.tenantId(), projectId);
            String eventType = request.status() == ProjectStatus.ARCHIVED
                    ? "PROJECT_ARCHIVED" : "PROJECT_RESTORED";
            auditAndOutbox(jdbc, context, eventType, "Project", projectId,
                    Map.of("status", request.status().name()));
            return findProject(jdbc, context, projectId);
        });
    }

    public void deleteProject(UUID projectId) {
        TenantContext context = TenantContextHolder.getRequired();
        executor.writeWithoutResult(jdbc -> {
            requireProjectRole(jdbc, context, projectId, ProjectRole.MANAGER);
            int deleted = jdbc.update("""
                    UPDATE projects SET status='DELETED',deleted_at=now(),updated_at=now()
                    WHERE tenant_id=? AND id=? AND status<>'DELETED'
                    """, context.tenantId(), projectId);
            if (deleted == 0) throw new NotFoundException("Project not found");
            auditAndOutbox(jdbc, context, "PROJECT_DELETED", "Project", projectId, Map.of());
        });
    }

    public List<ProjectMemberView> projectMembers(UUID projectId) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.read(jdbc -> {
            requireProjectRole(jdbc, context, projectId, ProjectRole.VIEWER);
            return jdbc.query("""
                    SELECT project_id,user_id,role FROM project_memberships
                    WHERE tenant_id=? AND project_id=? ORDER BY created_at,user_id
                    """, (rs, rowNum) -> new ProjectMemberView(
                    rs.getObject("project_id", UUID.class), rs.getObject("user_id", UUID.class),
                    ProjectRole.valueOf(rs.getString("role"))), context.tenantId(), projectId);
        });
    }

    public ProjectMemberView setProjectMember(UUID projectId, UUID userId, SetProjectMemberRequest request) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.write(jdbc -> {
            requireProjectRole(jdbc, context, projectId, ProjectRole.MANAGER);
            requireActiveProject(jdbc, context, projectId);
            requireActiveTenantMember(context.tenantId(), userId);
            ProjectRole existingRole = projectRole(jdbc, context, projectId, userId);
            if (existingRole == ProjectRole.MANAGER && request.role() != ProjectRole.MANAGER) {
                requireAnotherManager(jdbc, context, projectId, userId);
            }
            jdbc.update("""
                    INSERT INTO project_memberships(id,tenant_id,project_id,user_id,role)
                    VALUES (?,?,?,?,?)
                    ON CONFLICT (tenant_id,project_id,user_id) DO UPDATE
                    SET role=excluded.role,updated_at=now()
                    """, UUID.randomUUID(), context.tenantId(), projectId, userId, request.role().name());
            auditAndOutbox(jdbc, context, "PROJECT_MEMBERSHIP_SET", "Project", projectId,
                    Map.of("userId", userId, "role", request.role().name()));
            return new ProjectMemberView(projectId, userId, request.role());
        });
    }

    public void removeProjectMember(UUID projectId, UUID userId) {
        TenantContext context = TenantContextHolder.getRequired();
        executor.writeWithoutResult(jdbc -> {
            requireProjectRole(jdbc, context, projectId, ProjectRole.MANAGER);
            requireActiveProject(jdbc, context, projectId);
            ProjectRole existingRole = projectRole(jdbc, context, projectId, userId);
            if (existingRole == null) throw new NotFoundException("Project membership not found");
            if (existingRole == ProjectRole.MANAGER) requireAnotherManager(jdbc, context, projectId, userId);
            int deleted = jdbc.update(
                    "DELETE FROM project_memberships WHERE tenant_id=? AND project_id=? AND user_id=?",
                    context.tenantId(), projectId, userId);
            if (deleted == 0) throw new NotFoundException("Project membership not found");
            auditAndOutbox(jdbc, context, "PROJECT_MEMBERSHIP_REMOVED", "Project", projectId,
                    Map.of("userId", userId));
        });
    }

    public BoardView createBoard(UUID projectId, CreateBoardRequest request) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.write(jdbc -> {
            requireProjectRole(jdbc, context, projectId, ProjectRole.MANAGER);
            requireActiveProject(jdbc, context, projectId);
            UUID boardId = UUID.randomUUID();
            jdbc.update("INSERT INTO boards(id,tenant_id,project_id,name) VALUES (?,?,?,?)",
                    boardId, context.tenantId(), projectId, request.name().trim());
            String[] names = {"To do", "In progress", "Done"};
            for (int i = 0; i < names.length; i++) {
                jdbc.update("INSERT INTO board_columns(id,tenant_id,board_id,name,position) VALUES (?,?,?,?,?)",
                        UUID.randomUUID(), context.tenantId(), boardId, names[i], BigDecimal.valueOf((i + 1) * 1000L));
            }
            auditAndOutbox(jdbc, context, "BOARD_CREATED", "Board", boardId, Map.of("projectId", projectId));
            return findBoard(jdbc, context, boardId);
        });
    }

    public List<BoardSummaryView> projectBoards(UUID projectId) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.read(jdbc -> {
            requireProjectRole(jdbc, context, projectId, ProjectRole.VIEWER);
            return jdbc.query("""
                    SELECT id,project_id,name,version,created_at FROM boards
                    WHERE tenant_id=? AND project_id=? AND deleted_at IS NULL
                    ORDER BY created_at,id
                    """, (rs, rowNum) -> new BoardSummaryView(
                    rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                    rs.getString("name"), rs.getLong("version"), rs.getTimestamp("created_at").toInstant()),
                    context.tenantId(), projectId);
        });
    }

    public BoardView updateBoard(UUID boardId, UpdateBoardRequest request) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.write(jdbc -> {
            UUID projectId = boardProject(jdbc, context, boardId);
            requireProjectRole(jdbc, context, projectId, ProjectRole.MANAGER);
            requireActiveProject(jdbc, context, projectId);
            int updated = jdbc.update("""
                    UPDATE boards SET name=?,version=version+1,updated_at=now()
                    WHERE tenant_id=? AND id=? AND deleted_at IS NULL AND version=?
                    """, request.name().trim(), context.tenantId(), boardId, request.version());
            if (updated == 0) throw new ConflictException("Board was updated by another user");
            auditAndOutbox(jdbc, context, "BOARD_UPDATED", "Board", boardId,
                    Map.of("name", request.name().trim(), "version", request.version() + 1));
            return findBoard(jdbc, context, boardId);
        });
    }

    public void deleteBoard(UUID boardId) {
        TenantContext context = TenantContextHolder.getRequired();
        executor.writeWithoutResult(jdbc -> {
            UUID projectId = boardProject(jdbc, context, boardId);
            requireProjectRole(jdbc, context, projectId, ProjectRole.MANAGER);
            requireActiveProject(jdbc, context, projectId);
            int deleted = jdbc.update("""
                    UPDATE boards SET deleted_at=now(),updated_at=now()
                    WHERE tenant_id=? AND id=? AND deleted_at IS NULL
                    """, context.tenantId(), boardId);
            if (deleted == 0) throw new NotFoundException("Board not found");
            auditAndOutbox(jdbc, context, "BOARD_DELETED", "Board", boardId,
                    Map.of("projectId", projectId));
        });
    }

    public BoardView getBoard(UUID boardId) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.read(jdbc -> {
            UUID projectId = jdbc.query(
                    "SELECT project_id FROM boards WHERE tenant_id=? AND id=? AND deleted_at IS NULL",
                    rs -> rs.next() ? rs.getObject(1, UUID.class) : null,
                    context.tenantId(), boardId);
            if (projectId == null) throw new NotFoundException("Board not found");
            requireProjectRole(jdbc, context, projectId, ProjectRole.VIEWER);
            return findBoard(jdbc, context, boardId);
        });
    }

    public BoardView createColumn(UUID boardId, CreateColumnRequest request) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.write(jdbc -> {
            UUID projectId = boardProject(jdbc, context, boardId);
            requireProjectRole(jdbc, context, projectId, ProjectRole.MANAGER);
            requireActiveProject(jdbc, context, projectId);
            advanceBoardVersion(jdbc, context, boardId, request.version());
            UUID columnId = UUID.randomUUID();
            try {
                jdbc.update("INSERT INTO board_columns(id,tenant_id,board_id,name,position) VALUES (?,?,?,?,?)",
                        columnId, context.tenantId(), boardId, request.name().trim(),
                        nextColumnPosition(jdbc, context, boardId));
            } catch (DataIntegrityViolationException exception) {
                throw new ConflictException("Board column name already exists");
            }
            auditAndOutbox(jdbc, context, "BOARD_COLUMN_CREATED", "BoardColumn", columnId,
                    Map.of("boardId", boardId, "name", request.name().trim()));
            return findBoard(jdbc, context, boardId);
        });
    }

    public BoardView updateColumn(UUID boardId, UUID columnId, UpdateColumnRequest request) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.write(jdbc -> {
            UUID projectId = boardProject(jdbc, context, boardId);
            requireProjectRole(jdbc, context, projectId, ProjectRole.MANAGER);
            requireActiveProject(jdbc, context, projectId);
            requireColumn(jdbc, context, boardId, columnId);
            advanceBoardVersion(jdbc, context, boardId, request.version());
            try {
                jdbc.update("""
                        UPDATE board_columns SET name=?,updated_at=now()
                        WHERE tenant_id=? AND board_id=? AND id=?
                        """, request.name().trim(), context.tenantId(), boardId, columnId);
            } catch (DataIntegrityViolationException exception) {
                throw new ConflictException("Board column name already exists");
            }
            auditAndOutbox(jdbc, context, "BOARD_COLUMN_UPDATED", "BoardColumn", columnId,
                    Map.of("boardId", boardId, "name", request.name().trim()));
            return findBoard(jdbc, context, boardId);
        });
    }

    public BoardView reorderColumns(UUID boardId, ReorderColumnsRequest request) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.write(jdbc -> {
            UUID projectId = boardProject(jdbc, context, boardId);
            requireProjectRole(jdbc, context, projectId, ProjectRole.MANAGER);
            requireActiveProject(jdbc, context, projectId);
            advanceBoardVersion(jdbc, context, boardId, request.version());
            List<UUID> existingIds = jdbc.query(
                    "SELECT id FROM board_columns WHERE tenant_id=? AND board_id=? ORDER BY position,id",
                    (rs, rowNum) -> rs.getObject(1, UUID.class), context.tenantId(), boardId);
            if (request.columnIds().size() != existingIds.size()
                    || new HashSet<>(request.columnIds()).size() != request.columnIds().size()
                    || !new HashSet<>(request.columnIds()).equals(new HashSet<>(existingIds))) {
                throw new ConflictException("Column order must contain every board column exactly once");
            }
            for (int index = 0; index < request.columnIds().size(); index++) {
                jdbc.update("""
                        UPDATE board_columns SET position=?,updated_at=now()
                        WHERE tenant_id=? AND board_id=? AND id=?
                        """, BigDecimal.valueOf((index + 1) * 1000L), context.tenantId(), boardId,
                        request.columnIds().get(index));
            }
            auditAndOutbox(jdbc, context, "BOARD_COLUMNS_REORDERED", "Board", boardId,
                    Map.of("columnIds", request.columnIds()));
            return findBoard(jdbc, context, boardId);
        });
    }

    public BoardView deleteColumn(UUID boardId, UUID columnId, long version) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.write(jdbc -> {
            UUID projectId = boardProject(jdbc, context, boardId);
            requireProjectRole(jdbc, context, projectId, ProjectRole.MANAGER);
            requireActiveProject(jdbc, context, projectId);
            requireColumn(jdbc, context, boardId, columnId);
            if (count(jdbc, "SELECT count(*) FROM board_columns WHERE tenant_id=? AND board_id=?",
                    context.tenantId(), boardId) <= 1) {
                throw new ConflictException("A board must retain at least one column");
            }
            if (count(jdbc, "SELECT count(*) FROM tasks WHERE tenant_id=? AND board_id=? AND board_column_id=? AND deleted_at IS NULL",
                    context.tenantId(), boardId, columnId) > 0) {
                throw new ConflictException("Move or delete tasks before deleting this column");
            }
            advanceBoardVersion(jdbc, context, boardId, version);
            try {
                int deleted = jdbc.update(
                        "DELETE FROM board_columns WHERE tenant_id=? AND board_id=? AND id=?",
                        context.tenantId(), boardId, columnId);
                if (deleted == 0) throw new NotFoundException("Board column not found");
            } catch (DataIntegrityViolationException exception) {
                throw new ConflictException("Move or delete tasks before deleting this column");
            }
            auditAndOutbox(jdbc, context, "BOARD_COLUMN_DELETED", "BoardColumn", columnId,
                    Map.of("boardId", boardId));
            return findBoard(jdbc, context, boardId);
        });
    }

    public TaskView createTask(UUID boardId, CreateTaskRequest request) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.write(jdbc -> {
            UUID projectId = boardProject(jdbc, context, boardId);
            requireProjectRole(jdbc, context, projectId, ProjectRole.MEMBER);
            requireActiveProject(jdbc, context, projectId);
            requireColumn(jdbc, context, boardId, request.columnId());
            if (request.parentTaskId() != null) requireTopLevelParent(jdbc, context, boardId, request.parentTaskId());
            requireAssignableUser(jdbc, context, projectId, request.assigneeUserId());
            UUID taskId = UUID.randomUUID();
            BigDecimal position = request.position() == null ? nextTaskPosition(jdbc, context, request.columnId()) : request.position();
            jdbc.update("""
                    INSERT INTO tasks(id,tenant_id,project_id,board_id,board_column_id,parent_task_id,title,description,
                                      assignee_user_id,due_at,position,created_by)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
                    """, taskId, context.tenantId(), projectId, boardId, request.columnId(), request.parentTaskId(),
                    request.title().trim(), request.description(), request.assigneeUserId(), timestamp(request.dueAt()),
                    position, context.userId());
            auditAndOutbox(jdbc, context, "TASK_CREATED", "Task", taskId,
                    Map.of("boardId", boardId, "title", request.title().trim()));
            return findTask(jdbc, context, taskId);
        });
    }

    public TaskView getTask(UUID taskId) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.read(jdbc -> {
            TaskView task = findTask(jdbc, context, taskId);
            requireProjectRole(jdbc, context, task.projectId(), ProjectRole.VIEWER);
            return task;
        });
    }

    public TaskView updateTask(UUID taskId, UpdateTaskRequest request) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.write(jdbc -> {
            TaskView existing = findTask(jdbc, context, taskId);
            requireProjectRole(jdbc, context, existing.projectId(), ProjectRole.MEMBER);
            requireActiveProject(jdbc, context, existing.projectId());
            requireColumn(jdbc, context, existing.boardId(), request.columnId());
            requireAssignableUser(jdbc, context, existing.projectId(), request.assigneeUserId());
            BigDecimal position = request.position() == null ? existing.position() : request.position();
            int updated = jdbc.update("""
                    UPDATE tasks SET board_column_id=?,title=?,description=?,assignee_user_id=?,due_at=?,position=?,
                                     version=version+1,updated_at=now()
                    WHERE tenant_id=? AND id=? AND version=?
                    """, request.columnId(), request.title().trim(), request.description(), request.assigneeUserId(),
                    timestamp(request.dueAt()), position, context.tenantId(), taskId, request.version());
            if (updated == 0) throw staleTaskConflict(jdbc, context, taskId);
            auditAndOutbox(jdbc, context, "TASK_UPDATED", "Task", taskId,
                    Map.of("columnId", request.columnId(), "version", request.version() + 1));
            return findTask(jdbc, context, taskId);
        });
    }

    public TaskView moveTask(UUID boardId, UUID taskId, MoveTaskRequest request) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.write(jdbc -> {
            TaskView existing = findTask(jdbc, context, taskId);
            if (!existing.boardId().equals(boardId)) throw new NotFoundException("Task not found in board");
            requireProjectRole(jdbc, context, existing.projectId(), ProjectRole.MEMBER);
            requireActiveProject(jdbc, context, existing.projectId());
            requireColumn(jdbc, context, boardId, request.targetColumnId());
            int updated = jdbc.update("""
                    UPDATE tasks SET board_column_id=?,position=?,version=version+1,updated_at=now()
                    WHERE tenant_id=? AND board_id=? AND id=? AND version=?
                    """, request.targetColumnId(), request.targetPosition(), context.tenantId(), boardId, taskId, request.version());
            if (updated == 0) throw staleTaskConflict(jdbc, context, taskId);
            auditAndOutbox(jdbc, context, "TASK_MOVED", "Task", taskId,
                    Map.of("columnId", request.targetColumnId(), "position", request.targetPosition(),
                            "version", request.version() + 1));
            return findTask(jdbc, context, taskId);
        });
    }

    public BoardView reorderTasks(UUID boardId, ReorderTasksRequest request) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.write(jdbc -> {
            UUID projectId = boardProject(jdbc, context, boardId);
            requireProjectRole(jdbc, context, projectId, ProjectRole.MEMBER);
            requireActiveProject(jdbc, context, projectId);
            if (new HashSet<>(request.items().stream().map(ReorderTaskItem::taskId).toList()).size()
                    != request.items().size()) {
                throw new ConflictException("Task order cannot contain duplicate tasks");
            }
            for (ReorderTaskItem item : request.items()) {
                TaskView existing = findTask(jdbc, context, item.taskId());
                if (!existing.boardId().equals(boardId)) throw new NotFoundException("Task not found in board");
                requireColumn(jdbc, context, boardId, item.targetColumnId());
                int updated = jdbc.update("""
                        UPDATE tasks SET board_column_id=?,position=?,version=version+1,updated_at=now()
                        WHERE tenant_id=? AND board_id=? AND id=? AND deleted_at IS NULL AND version=?
                        """, item.targetColumnId(), item.targetPosition(), context.tenantId(), boardId,
                        item.taskId(), item.version());
                if (updated == 0) throw staleTaskConflict(jdbc, context, item.taskId());
            }
            auditAndOutbox(jdbc, context, "TASKS_REORDERED", "Board", boardId,
                    Map.of("taskIds", request.items().stream().map(ReorderTaskItem::taskId).toList()));
            return findBoard(jdbc, context, boardId);
        });
    }

    public void deleteTask(UUID taskId) {
        TenantContext context = TenantContextHolder.getRequired();
        executor.writeWithoutResult(jdbc -> {
            TaskView existing = findTask(jdbc, context, taskId);
            requireProjectRole(jdbc, context, existing.projectId(), ProjectRole.MANAGER);
            requireActiveProject(jdbc, context, existing.projectId());
            int deleted = jdbc.update("""
                    UPDATE tasks SET deleted_at=now(),updated_at=now()
                    WHERE tenant_id=? AND deleted_at IS NULL AND (id=? OR parent_task_id=?)
                    """, context.tenantId(), taskId, taskId);
            if (deleted == 0) throw new NotFoundException("Task not found");
            auditAndOutbox(jdbc, context, "TASK_DELETED", "Task", taskId,
                    Map.of("projectId", existing.projectId()));
        });
    }

    public List<CommentView> comments(UUID taskId) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.read(jdbc -> {
            TaskView task = findTask(jdbc, context, taskId);
            requireProjectRole(jdbc, context, task.projectId(), ProjectRole.VIEWER);
            return jdbc.query("""
                    SELECT id,task_id,author_user_id,body,created_at FROM comments
                    WHERE tenant_id=? AND task_id=? AND deleted_at IS NULL ORDER BY created_at
                    """, (rs, rowNum) -> new CommentView(
                    rs.getObject("id", UUID.class), rs.getObject("task_id", UUID.class),
                    rs.getObject("author_user_id", UUID.class), rs.getString("body"),
                    rs.getTimestamp("created_at").toInstant()), context.tenantId(), taskId);
        });
    }

    public CommentView addComment(UUID taskId, CreateCommentRequest request) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.write(jdbc -> {
            TaskView task = findTask(jdbc, context, taskId);
            requireProjectRole(jdbc, context, task.projectId(), ProjectRole.MEMBER);
            requireActiveProject(jdbc, context, task.projectId());
            UUID id = UUID.randomUUID();
            jdbc.update("INSERT INTO comments(id,tenant_id,task_id,author_user_id,body) VALUES (?,?,?,?,?)",
                    id, context.tenantId(), taskId, context.userId(), request.body().trim());
            auditAndOutbox(jdbc, context, "COMMENT_CREATED", "Task", taskId, Map.of("commentId", id));
            return jdbc.queryForObject(
                    "SELECT id,task_id,author_user_id,body,created_at FROM comments WHERE tenant_id=? AND id=?",
                    (rs, rowNum) -> new CommentView(
                            rs.getObject("id", UUID.class), rs.getObject("task_id", UUID.class),
                            rs.getObject("author_user_id", UUID.class), rs.getString("body"),
                            rs.getTimestamp("created_at").toInstant()), context.tenantId(), id);
        });
    }

    public CommentView updateComment(UUID commentId, UpdateCommentRequest request) {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.write(jdbc -> {
            CommentHeader comment = requireCommentMutation(jdbc, context, commentId);
            jdbc.update("""
                    UPDATE comments SET body=?,updated_at=now()
                    WHERE tenant_id=? AND id=? AND deleted_at IS NULL
                    """, request.body().trim(), context.tenantId(), commentId);
            auditAndOutbox(jdbc, context, "COMMENT_UPDATED", "Comment", commentId,
                    Map.of("taskId", comment.taskId(), "moderated", !comment.authorUserId().equals(context.userId())));
            return findComment(jdbc, context, commentId);
        });
    }

    public void deleteComment(UUID commentId) {
        TenantContext context = TenantContextHolder.getRequired();
        executor.writeWithoutResult(jdbc -> {
            CommentHeader comment = requireCommentMutation(jdbc, context, commentId);
            int deleted = jdbc.update("""
                    UPDATE comments SET deleted_at=now(),updated_at=now()
                    WHERE tenant_id=? AND id=? AND deleted_at IS NULL
                    """, context.tenantId(), commentId);
            if (deleted == 0) throw new NotFoundException("Comment not found");
            auditAndOutbox(jdbc, context, "COMMENT_DELETED", "Comment", commentId,
                    Map.of("taskId", comment.taskId(), "moderated", !comment.authorUserId().equals(context.userId())));
        });
    }

    private BoardView findBoard(JdbcTemplate jdbc, TenantContext context, UUID boardId) {
        BoardHeader header = jdbc.query(
                "SELECT id,project_id,name,version FROM boards WHERE tenant_id=? AND id=? AND deleted_at IS NULL",
                rs -> rs.next() ? new BoardHeader(
                        rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                        rs.getString("name"), rs.getLong("version")) : null,
                context.tenantId(), boardId);
        if (header == null) throw new NotFoundException("Board not found");
        List<ColumnView> columns = jdbc.query(
                "SELECT id,name,position FROM board_columns WHERE tenant_id=? AND board_id=? ORDER BY position",
                (rs, rowNum) -> new ColumnView(rs.getObject("id", UUID.class), rs.getString("name"), rs.getBigDecimal("position")),
                context.tenantId(), boardId);
        List<TaskView> tasks = jdbc.query(
                "SELECT * FROM tasks WHERE tenant_id=? AND board_id=? AND deleted_at IS NULL ORDER BY board_column_id,position",
                this::taskRow, context.tenantId(), boardId);
        return new BoardView(header.id(), header.projectId(), header.name(), header.version(), columns, tasks);
    }

    private ProjectView findProject(JdbcTemplate jdbc, TenantContext context, UUID projectId) {
        List<ProjectView> projects = jdbc.query(
                """
                SELECT p.id,p.name,p.description,p.status,p.created_by,p.created_at,p.updated_at,
                       pm.role project_role,
                       (SELECT b.id FROM boards b WHERE b.tenant_id=p.tenant_id AND b.project_id=p.id AND b.deleted_at IS NULL ORDER BY b.created_at LIMIT 1) board_id,
                       (SELECT count(*) FROM project_memberships pmc WHERE pmc.tenant_id=p.tenant_id AND pmc.project_id=p.id) member_count,
                       (SELECT count(*) FROM tasks tc WHERE tc.tenant_id=p.tenant_id AND tc.project_id=p.id AND tc.deleted_at IS NULL) task_count,
                       (SELECT count(*) FROM tasks td JOIN board_columns dc ON dc.tenant_id=td.tenant_id AND dc.id=td.board_column_id
                        WHERE td.tenant_id=p.tenant_id AND td.project_id=p.id AND td.deleted_at IS NULL
                          AND lower(dc.name) IN ('done','hoàn tất')) completed_task_count
                FROM projects p JOIN project_memberships pm
                  ON pm.tenant_id=p.tenant_id AND pm.project_id=p.id AND pm.user_id=?
                WHERE p.tenant_id=? AND p.id=? AND p.status<>'DELETED'
                """,
                this::projectRow, context.userId(), context.tenantId(), projectId);
        if (projects.isEmpty()) throw new NotFoundException("Project not found");
        return projects.getFirst();
    }

    private TaskView findTask(JdbcTemplate jdbc, TenantContext context, UUID taskId) {
        List<TaskView> tasks = jdbc.query(
                "SELECT * FROM tasks WHERE tenant_id=? AND id=? AND deleted_at IS NULL",
                this::taskRow, context.tenantId(), taskId);
        if (tasks.isEmpty()) throw new NotFoundException("Task not found");
        return tasks.getFirst();
    }

    private CommentView findComment(JdbcTemplate jdbc, TenantContext context, UUID commentId) {
        List<CommentView> comments = jdbc.query("""
                SELECT id,task_id,author_user_id,body,created_at FROM comments
                WHERE tenant_id=? AND id=? AND deleted_at IS NULL
                """, (rs, rowNum) -> new CommentView(
                rs.getObject("id", UUID.class), rs.getObject("task_id", UUID.class),
                rs.getObject("author_user_id", UUID.class), rs.getString("body"),
                rs.getTimestamp("created_at").toInstant()), context.tenantId(), commentId);
        if (comments.isEmpty()) throw new NotFoundException("Comment not found");
        return comments.getFirst();
    }

    private CommentHeader requireCommentMutation(
            JdbcTemplate jdbc, TenantContext context, UUID commentId) {
        List<CommentHeader> comments = jdbc.query("""
                SELECT c.id,c.task_id,c.author_user_id,t.project_id
                FROM comments c
                JOIN tasks t ON t.tenant_id=c.tenant_id AND t.id=c.task_id
                WHERE c.tenant_id=? AND c.id=? AND c.deleted_at IS NULL AND t.deleted_at IS NULL
                """, (rs, rowNum) -> new CommentHeader(
                rs.getObject("id", UUID.class), rs.getObject("task_id", UUID.class),
                rs.getObject("author_user_id", UUID.class), rs.getObject("project_id", UUID.class)),
                context.tenantId(), commentId);
        if (comments.isEmpty()) throw new NotFoundException("Comment not found");
        CommentHeader comment = comments.getFirst();
        ProjectRole role = projectRole(jdbc, context, comment.projectId(), context.userId());
        if (role == null || role == ProjectRole.VIEWER
                || (!comment.authorUserId().equals(context.userId()) && role != ProjectRole.MANAGER)) {
            throw new TenantAccessDeniedException("Comment author or project manager role is required");
        }
        requireActiveProject(jdbc, context, comment.projectId());
        return comment;
    }

    private ProjectView projectRow(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new ProjectView(
                rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("description"),
                ProjectStatus.valueOf(rs.getString("status")),
                rs.getObject("created_by", UUID.class), rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant(), ProjectRole.valueOf(rs.getString("project_role")),
                rs.getObject("board_id", UUID.class), rs.getLong("member_count"),
                rs.getLong("task_count"), rs.getLong("completed_task_count"));
    }

    private TaskView taskRow(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        Timestamp dueAt = rs.getTimestamp("due_at");
        return new TaskView(
                rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                rs.getObject("board_id", UUID.class), rs.getObject("board_column_id", UUID.class),
                rs.getObject("parent_task_id", UUID.class), rs.getString("title"), rs.getString("description"),
                rs.getObject("assignee_user_id", UUID.class), dueAt == null ? null : dueAt.toInstant(),
                rs.getBigDecimal("position"), rs.getLong("version"),
                rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant());
    }

    private UUID boardProject(JdbcTemplate jdbc, TenantContext context, UUID boardId) {
        UUID projectId = jdbc.query(
                "SELECT project_id FROM boards WHERE tenant_id=? AND id=? AND deleted_at IS NULL",
                rs -> rs.next() ? rs.getObject(1, UUID.class) : null,
                context.tenantId(), boardId);
        if (projectId == null) throw new NotFoundException("Board not found");
        return projectId;
    }

    private void requireColumn(JdbcTemplate jdbc, TenantContext context, UUID boardId, UUID columnId) {
        long count = count(jdbc, """
                SELECT count(*) FROM board_columns c
                JOIN boards b ON b.tenant_id=c.tenant_id AND b.id=c.board_id
                WHERE c.tenant_id=? AND c.board_id=? AND c.id=? AND b.deleted_at IS NULL
                """,
                context.tenantId(), boardId, columnId);
        if (count == 0) throw new NotFoundException("Board column not found");
    }

    private void requireTopLevelParent(JdbcTemplate jdbc, TenantContext context, UUID boardId, UUID parentId) {
        long count = count(jdbc,
                "SELECT count(*) FROM tasks WHERE tenant_id=? AND board_id=? AND id=? AND parent_task_id IS NULL AND deleted_at IS NULL",
                context.tenantId(), boardId, parentId);
        if (count == 0) throw new ConflictException("Subtasks can only have a top-level parent in the same board");
    }

    private BigDecimal nextTaskPosition(JdbcTemplate jdbc, TenantContext context, UUID columnId) {
        BigDecimal max = jdbc.queryForObject(
                "SELECT coalesce(max(position),0) FROM tasks WHERE tenant_id=? AND board_column_id=? AND deleted_at IS NULL",
                BigDecimal.class, context.tenantId(), columnId);
        return (max == null ? BigDecimal.ZERO : max).add(BigDecimal.valueOf(1000));
    }

    private BigDecimal nextColumnPosition(JdbcTemplate jdbc, TenantContext context, UUID boardId) {
        BigDecimal max = jdbc.queryForObject(
                "SELECT coalesce(max(position),0) FROM board_columns WHERE tenant_id=? AND board_id=?",
                BigDecimal.class, context.tenantId(), boardId);
        return (max == null ? BigDecimal.ZERO : max).add(BigDecimal.valueOf(1000));
    }

    private void advanceBoardVersion(
            JdbcTemplate jdbc, TenantContext context, UUID boardId, long expectedVersion) {
        int updated = jdbc.update("""
                UPDATE boards SET version=version+1,updated_at=now()
                WHERE tenant_id=? AND id=? AND version=?
                """, context.tenantId(), boardId, expectedVersion);
        if (updated == 0) throw new ConflictException("Board columns were updated by another user");
    }

    private void requireProjectRole(JdbcTemplate jdbc, TenantContext context, UUID projectId, ProjectRole minimum) {
        List<String> roles = jdbc.query(
                """
                SELECT pm.role FROM project_memberships pm
                JOIN projects p ON p.tenant_id=pm.tenant_id AND p.id=pm.project_id
                WHERE pm.tenant_id=? AND pm.project_id=? AND pm.user_id=? AND p.status<>'DELETED'
                """,
                (rs, rowNum) -> rs.getString(1), context.tenantId(), projectId, context.userId());
        if (roles.isEmpty() || rank(ProjectRole.valueOf(roles.getFirst())) < rank(minimum)) {
            throw new TenantAccessDeniedException("Insufficient project role");
        }
    }

    private void requireActiveProject(JdbcTemplate jdbc, TenantContext context, UUID projectId) {
        ProjectStatus status = lockProjectStatus(jdbc, context, projectId);
        if (status != ProjectStatus.ACTIVE) {
            throw new ConflictException("Archived projects are read-only");
        }
    }

    private ConflictException staleTaskConflict(
            JdbcTemplate jdbc, TenantContext context, UUID taskId) {
        Long currentVersion = jdbc.query(
                "SELECT version FROM tasks WHERE tenant_id=? AND id=? AND deleted_at IS NULL",
                rs -> rs.next() ? rs.getLong(1) : null, context.tenantId(), taskId);
        return new ConflictException(
                "Task was updated by another user",
                currentVersion == null ? Map.of() : Map.of("currentVersion", currentVersion.toString()));
    }

    private ProjectStatus lockProjectStatus(JdbcTemplate jdbc, TenantContext context, UUID projectId) {
        List<String> statuses = jdbc.query(
                "SELECT status FROM projects WHERE tenant_id=? AND id=? AND status<>'DELETED' FOR UPDATE",
                (rs, rowNum) -> rs.getString(1), context.tenantId(), projectId);
        if (statuses.isEmpty()) throw new NotFoundException("Project not found");
        return ProjectStatus.valueOf(statuses.getFirst());
    }

    private ProjectRole projectRole(JdbcTemplate jdbc, TenantContext context, UUID projectId, UUID userId) {
        List<String> roles = jdbc.query(
                "SELECT role FROM project_memberships WHERE tenant_id=? AND project_id=? AND user_id=?",
                (rs, rowNum) -> rs.getString(1), context.tenantId(), projectId, userId);
        return roles.isEmpty() ? null : ProjectRole.valueOf(roles.getFirst());
    }

    private void requireAnotherManager(JdbcTemplate jdbc, TenantContext context, UUID projectId, UUID excludedUserId) {
        long count = count(jdbc, """
                SELECT count(*) FROM project_memberships
                WHERE tenant_id=? AND project_id=? AND role='MANAGER' AND user_id<>?
                """, context.tenantId(), projectId, excludedUserId);
        if (count == 0) throw new ConflictException("A project must retain at least one manager");
    }

    private void requireAssignableUser(
            JdbcTemplate jdbc, TenantContext context, UUID projectId, UUID assigneeUserId) {
        if (assigneeUserId == null) return;
        if (projectRole(jdbc, context, projectId, assigneeUserId) == null) {
            throw new ConflictException("Assignee must be a project member");
        }
        requireActiveTenantMember(context.tenantId(), assigneeUserId);
    }

    private void requireActiveTenantMember(UUID tenantId, UUID userId) {
        tenantMembershipRepository.findByTenantIdAndUserId(tenantId, userId)
                .filter(TenantMembershipEntity::isActive)
                .orElseThrow(() -> new ConflictException("User must be an active tenant member"));
    }

    private int rank(ProjectRole role) {
        return switch (role) {
            case VIEWER -> 1;
            case MEMBER -> 2;
            case MANAGER -> 3;
        };
    }

    private long count(JdbcTemplate jdbc, String sql, Object... args) {
        Long value = jdbc.queryForObject(sql, Long.class, args);
        return value == null ? 0 : value;
    }

    private Timestamp timestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    private void auditAndOutbox(
            JdbcTemplate jdbc,
            TenantContext context,
            String eventType,
            String aggregateType,
            UUID aggregateId,
            Map<String, ?> payload) {
        String json;
        try {
            json = objectMapper.writeValueAsString(payload);
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot serialize tenant event", exception);
        }
        jdbc.update("""
                INSERT INTO audit_events(id,tenant_id,actor_user_id,event_type,aggregate_type,aggregate_id,correlation_id,details_json)
                VALUES (?,?,?,?,?,?,?,CAST(? AS jsonb))
                """, UUID.randomUUID(), context.tenantId(), context.userId(), eventType, aggregateType,
                aggregateId, context.correlationId(), json);
        jdbc.update("""
                INSERT INTO outbox_events(id,tenant_id,actor_user_id,event_type,aggregate_type,aggregate_id,correlation_id,payload_json)
                VALUES (?,?,?,?,?,?,?,CAST(? AS jsonb))
                """, UUID.randomUUID(), context.tenantId(), context.userId(), eventType, aggregateType,
                aggregateId, context.correlationId(), json);
    }

    private record BoardHeader(UUID id, UUID projectId, String name, long version) {}
    private record CommentHeader(UUID id, UUID taskId, UUID authorUserId, UUID projectId) {}
}
