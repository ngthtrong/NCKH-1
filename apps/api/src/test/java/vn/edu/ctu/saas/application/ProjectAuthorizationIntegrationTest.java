package vn.edu.ctu.saas.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static vn.edu.ctu.saas.application.ApplicationDtos.CreateCommentRequest;
import static vn.edu.ctu.saas.application.ApplicationDtos.CreateColumnRequest;
import static vn.edu.ctu.saas.application.ApplicationDtos.CreateTaskRequest;
import static vn.edu.ctu.saas.application.ApplicationDtos.ReorderColumnsRequest;
import static vn.edu.ctu.saas.application.ApplicationDtos.SetProjectMemberRequest;
import static vn.edu.ctu.saas.application.ApplicationDtos.UpdateColumnRequest;
import static vn.edu.ctu.saas.application.ApplicationDtos.UpdateProjectRequest;
import static vn.edu.ctu.saas.application.ApplicationDtos.UpdateTaskRequest;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.json.JsonMapper;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.common.NotFoundException;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.storage.ResourceService;
import vn.edu.ctu.saas.storage.ResourceStorage;
import vn.edu.ctu.saas.tenant.ProjectRole;
import vn.edu.ctu.saas.tenant.TenantAccessDeniedException;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantDataSourceResolver;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;
import vn.edu.ctu.saas.tenant.TenantPlacement;
import vn.edu.ctu.saas.tenant.TenantRole;

@Testcontainers(disabledWithoutDocker = true)
class ProjectAuthorizationIntegrationTest {
    private static final String APP_ROLE = "project_authz_app";
    private static final String ROLE_PASSWORD = "project-authz-password";

    private static final UUID TENANT_A = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID TENANT_B = UUID.fromString("20000000-0000-0000-0000-000000000002");
    private static final UUID MANAGER = UUID.fromString("30000000-0000-0000-0000-000000000001");
    private static final UUID MEMBER = UUID.fromString("30000000-0000-0000-0000-000000000002");
    private static final UUID VIEWER = UUID.fromString("30000000-0000-0000-0000-000000000003");
    private static final UUID OUTSIDER = UUID.fromString("30000000-0000-0000-0000-000000000004");
    private static final UUID FOREIGN_MANAGER = UUID.fromString("30000000-0000-0000-0000-000000000005");

    private static final UUID PROJECT_A = UUID.fromString("40000000-0000-0000-0000-000000000001");
    private static final UUID PROJECT_B = UUID.fromString("40000000-0000-0000-0000-000000000002");
    private static final UUID BOARD_A = UUID.fromString("50000000-0000-0000-0000-000000000001");
    private static final UUID BOARD_B = UUID.fromString("50000000-0000-0000-0000-000000000002");
    private static final UUID COLUMN_A = UUID.fromString("60000000-0000-0000-0000-000000000001");
    private static final UUID COLUMN_B = UUID.fromString("60000000-0000-0000-0000-000000000002");
    private static final UUID TASK_A = UUID.fromString("70000000-0000-0000-0000-000000000001");
    private static final UUID TASK_B = UUID.fromString("70000000-0000-0000-0000-000000000002");
    private static final UUID COMMENT_A = UUID.fromString("80000000-0000-0000-0000-000000000001");
    private static final UUID RESOURCE_A = UUID.fromString("90000000-0000-0000-0000-000000000001");
    private static final UUID RESOURCE_B = UUID.fromString("90000000-0000-0000-0000-000000000002");

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine")
            .withDatabaseName("project_authorization")
            .withUsername("postgres")
            .withPassword("postgres");

    private static JdbcTemplate adminJdbc;
    private static DriverManagerDataSource applicationDataSource;

    private TenantMembershipRepository tenantMemberships;
    private ProjectApplicationService service;
    private ResourceStorage resourceStorage;
    private ResourceService resourceService;

    @BeforeAll
    static void migrateAndCreateRuntimeRole() throws SQLException {
        Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration/application")
                .load()
                .migrate();

        try (Connection connection = POSTGRES.createConnection(""); Statement statement = connection.createStatement()) {
            statement.execute("CREATE ROLE " + APP_ROLE + " LOGIN PASSWORD '" + ROLE_PASSWORD
                    + "' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS");
            statement.execute("GRANT CONNECT ON DATABASE project_authorization TO " + APP_ROLE);
            statement.execute("GRANT USAGE ON SCHEMA public TO " + APP_ROLE);
            statement.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO " + APP_ROLE);
        }

        adminJdbc = new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        applicationDataSource = new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), APP_ROLE, ROLE_PASSWORD);
    }

    @BeforeEach
    void setUp() {
        adminJdbc.execute("TRUNCATE TABLE projects, resources, audit_events, outbox_events CASCADE");
        seedProject(TENANT_A, PROJECT_A, BOARD_A, COLUMN_A, TASK_A, MANAGER, "Alpha project", "Alpha task");
        seedProject(TENANT_B, PROJECT_B, BOARD_B, COLUMN_B, TASK_B, FOREIGN_MANAGER, "Beta project", "Beta task");
        seedProjectMembership(TENANT_A, PROJECT_A, MEMBER, ProjectRole.MEMBER);
        seedProjectMembership(TENANT_A, PROJECT_A, VIEWER, ProjectRole.VIEWER);
        adminJdbc.update(
                "INSERT INTO comments(id,tenant_id,task_id,author_user_id,body) VALUES (?,?,?,?,?)",
                COMMENT_A, TENANT_A, TASK_A, MANAGER, "Seed comment");
        seedResource(TENANT_A, RESOURCE_A, TASK_A, MANAGER, "alpha-evidence.txt");
        seedResource(TENANT_B, RESOURCE_B, TASK_B, FOREIGN_MANAGER, "beta-secret.txt");

        tenantMemberships = mock(TenantMembershipRepository.class);
        TenantJdbcExecutor executor = new TenantJdbcExecutor(new TenantDataSourceResolver() {
            @Override
            public DataSource resolve(TenantContext ignored) {
                return applicationDataSource;
            }

            @Override
            public void evict(UUID ignored) {
                // The fixed Testcontainer data source has no per-tenant cache to evict.
            }
        });
        service = new ProjectApplicationService(executor, JsonMapper.builder().build(), tenantMemberships);
        resourceStorage = mock(ResourceStorage.class);
        when(resourceStorage.createDownloadUrl(anyString(), any())).thenAnswer(invocation ->
                "https://storage.example.test/" + invocation.getArgument(0, String.class));
        when(resourceStorage.store(
                eq(TENANT_A), any(UUID.class), anyString(), anyString(), anyLong(), any()))
                .thenAnswer(invocation -> new ResourceStorage.StoredObject(
                        TENANT_A + "/" + invocation.getArgument(1, UUID.class) + "/uploaded.txt",
                        invocation.getArgument(4, Long.class)));
        resourceService = new ResourceService(executor, resourceStorage);
    }

    @AfterEach
    void clearTenantContext() {
        TenantContextHolder.clear();
    }

    @Test
    void viewerCanReadButCannotCreateTaskOrCommentAndLeavesNoSideEffects() {
        useContext(VIEWER, TenantRole.MEMBER);

        assertThat(service.getBoard(BOARD_A).id()).isEqualTo(BOARD_A);
        assertThat(service.comments(TASK_A)).extracting(ApplicationDtos.CommentView::body)
                .containsExactly("Seed comment");
        assertThatThrownBy(() -> service.createTask(BOARD_A, createTask("Viewer task")))
                .isInstanceOf(TenantAccessDeniedException.class);
        assertThatThrownBy(() -> service.addComment(TASK_A, new CreateCommentRequest("Viewer comment")))
                .isInstanceOf(TenantAccessDeniedException.class);
        assertThatThrownBy(() -> service.createColumn(
                BOARD_A, new CreateColumnRequest("Viewer column", 0L)))
                .isInstanceOf(TenantAccessDeniedException.class);
        assertThat(resourceService.list()).extracting(ResourceService.ResourceView::id)
                .containsExactly(RESOURCE_A);
        assertThat(resourceService.downloadUrl(RESOURCE_A).url()).contains(RESOURCE_A.toString());
        assertThatThrownBy(() -> resourceService.downloadUrl(RESOURCE_B))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Resource not found");
        assertThatThrownBy(() -> resourceService.attach(RESOURCE_A, TASK_A))
                .isInstanceOf(TenantAccessDeniedException.class);
        assertThatThrownBy(() -> resourceService.delete(RESOURCE_A))
                .isInstanceOf(TenantAccessDeniedException.class);
        assertThatThrownBy(() -> resourceService.upload(
                "viewer.txt", "text/plain", 6, new ByteArrayInputStream("viewer".getBytes())))
                .isInstanceOf(TenantAccessDeniedException.class)
                .hasMessage("Project member role is required to upload resources");
        verify(resourceStorage, never()).store(any(), any(), anyString(), anyString(), anyLong(), any());

        assertThat(count("SELECT count(*) FROM tasks WHERE tenant_id=?", TENANT_A)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM board_columns WHERE tenant_id=?", TENANT_A)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM comments WHERE tenant_id=?", TENANT_A)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM audit_events WHERE tenant_id=?", TENANT_A)).isZero();
        assertThat(count("SELECT count(*) FROM outbox_events WHERE tenant_id=?", TENANT_A)).isZero();
    }

    @Test
    void memberCanCreateTaskAndCommentButCannotManageProject() {
        useContext(MEMBER, TenantRole.MEMBER);

        ApplicationDtos.TaskView createdTask = service.createTask(BOARD_A, createTask("Member task"));
        ApplicationDtos.CommentView createdComment = service.addComment(
                TASK_A, new CreateCommentRequest("Member comment"));
        ResourceService.ResourceView uploaded = resourceService.upload(
                "member.txt", "text/plain", 6, new ByteArrayInputStream("member".getBytes()));
        resourceService.attach(uploaded.id(), TASK_A);
        assertThat(createdTask.title()).isEqualTo("Member task");
        assertThat(createdComment.authorUserId()).isEqualTo(MEMBER);
        assertThat(resourceService.downloadUrl(uploaded.id()).url()).contains(uploaded.id().toString());
        assertThat(uploaded.storageKey()).startsWith(TENANT_A + "/");
        assertThatThrownBy(() -> resourceService.delete(uploaded.id()))
                .isInstanceOf(TenantAccessDeniedException.class)
                .hasMessage("Project manager role is required to delete this resource");

        assertThatThrownBy(() -> service.updateProject(
                PROJECT_A, new UpdateProjectRequest("Unauthorized rename", null)))
                .isInstanceOf(TenantAccessDeniedException.class);
        assertThat(projectName(PROJECT_A)).isEqualTo("Alpha project");
        assertThat(count("SELECT count(*) FROM audit_events WHERE tenant_id=?", TENANT_A)).isEqualTo(2);
        assertThat(count("SELECT count(*) FROM outbox_events WHERE tenant_id=?", TENANT_A)).isEqualTo(2);
    }

    @Test
    void managerCanManageProjectAndTask() {
        useContext(MANAGER, TenantRole.MEMBER);

        ApplicationDtos.ProjectView project = service.updateProject(
                PROJECT_A, new UpdateProjectRequest("Renamed by manager", "Updated"));
        ApplicationDtos.BoardView withColumn = service.createColumn(
                BOARD_A, new CreateColumnRequest("Review", 0L));
        UUID reviewColumnId = withColumn.columns().stream()
                .filter(column -> column.name().equals("Review"))
                .findFirst()
                .orElseThrow()
                .id();

        assertThat(withColumn.version()).isEqualTo(1);
        assertThatThrownBy(() -> service.createColumn(
                BOARD_A, new CreateColumnRequest("Stale", 0L)))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Board columns were updated by another user");

        ApplicationDtos.BoardView renamed = service.updateColumn(
                BOARD_A, reviewColumnId, new UpdateColumnRequest("Verification", 1L));
        ApplicationDtos.BoardView reordered = service.reorderColumns(
                BOARD_A, new ReorderColumnsRequest(java.util.List.of(reviewColumnId, COLUMN_A), renamed.version()));
        assertThat(reordered.columns()).extracting(ApplicationDtos.ColumnView::id)
                .containsExactly(reviewColumnId, COLUMN_A);
        assertThatThrownBy(() -> service.deleteColumn(BOARD_A, COLUMN_A, reordered.version()))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Move or delete tasks before deleting this column");

        service.deleteTask(TASK_A);
        ApplicationDtos.BoardView finalBoard = service.deleteColumn(
                BOARD_A, reviewColumnId, reordered.version());
        assertThat(finalBoard.version()).isEqualTo(4);
        assertThat(finalBoard.columns()).extracting(ApplicationDtos.ColumnView::id)
                .containsExactly(COLUMN_A);
        assertThatThrownBy(() -> service.deleteColumn(BOARD_A, COLUMN_A, finalBoard.version()))
                .isInstanceOf(ConflictException.class)
                .hasMessage("A board must retain at least one column");

        assertThat(project.name()).isEqualTo("Renamed by manager");
        assertThat(projectName(PROJECT_A)).isEqualTo("Renamed by manager");
        assertThat(count("SELECT count(*) FROM tasks WHERE tenant_id=? AND id=?", TENANT_A, TASK_A)).isZero();
        assertThat(count("SELECT count(*) FROM audit_events WHERE tenant_id=?", TENANT_A)).isEqualTo(6);
    }

    @Test
    void tenantOwnerWithoutProjectMembershipGetsNoImplicitProjectAccess() {
        useContext(OUTSIDER, TenantRole.OWNER);

        assertThat(service.listProjects()).isEmpty();
        assertThatThrownBy(() -> service.getBoard(BOARD_A))
                .isInstanceOf(TenantAccessDeniedException.class)
                .hasMessage("Insufficient project role");
        assertThatThrownBy(() -> service.updateProject(
                PROJECT_A, new UpdateProjectRequest("Owner bypass", null)))
                .isInstanceOf(TenantAccessDeniedException.class);

        assertThat(projectName(PROJECT_A)).isEqualTo("Alpha project");
        assertThat(count("SELECT count(*) FROM audit_events WHERE tenant_id=?", TENANT_A)).isZero();
    }

    @Test
    void revokedProjectMembershipImmediatelyRemovesProjectAccess() {
        useContext(VIEWER, TenantRole.MEMBER);
        assertThat(service.getBoard(BOARD_A).id()).isEqualTo(BOARD_A);

        adminJdbc.update(
                "DELETE FROM project_memberships WHERE tenant_id=? AND project_id=? AND user_id=?",
                TENANT_A, PROJECT_A, VIEWER);

        assertThat(service.listProjects()).isEmpty();
        assertThatThrownBy(() -> service.getBoard(BOARD_A))
                .isInstanceOf(TenantAccessDeniedException.class)
                .hasMessage("Insufficient project role");
        assertThat(count("SELECT count(*) FROM audit_events WHERE tenant_id=?", TENANT_A)).isZero();
        assertThat(count("SELECT count(*) FROM outbox_events WHERE tenant_id=?", TENANT_A)).isZero();
    }

    @Test
    void crossTenantIdsCannotReadOrMutateAndLeaveForeignRowsUntouched() {
        useContext(MANAGER, TenantRole.MEMBER);

        assertThatThrownBy(() -> service.getBoard(BOARD_B))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Board not found");
        assertThatThrownBy(() -> service.updateTask(
                TASK_B, new UpdateTaskRequest(COLUMN_B, "Tampered", null, null, null, BigDecimal.ONE, 0)))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Task not found");
        assertThatThrownBy(() -> service.updateProject(
                PROJECT_B, new UpdateProjectRequest("Tampered", null)))
                .isInstanceOf(TenantAccessDeniedException.class)
                .hasMessage("Insufficient project role");
        assertThatThrownBy(() -> service.updateColumn(
                BOARD_A, COLUMN_B, new UpdateColumnRequest("Tampered", 0L)))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Board column not found");
        assertThat(resourceService.list()).extracting(ResourceService.ResourceView::id)
                .containsExactly(RESOURCE_A);
        assertThatThrownBy(() -> resourceService.downloadUrl(RESOURCE_B))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Resource not found");
        assertThatThrownBy(() -> resourceService.attach(RESOURCE_B, TASK_A))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Resource not found");
        assertThatThrownBy(() -> resourceService.attach(RESOURCE_A, TASK_B))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Task not found");
        assertThatThrownBy(() -> resourceService.delete(RESOURCE_B))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Resource not found");
        verify(resourceStorage, never()).createDownloadUrl(anyString(), any());
        verify(resourceStorage, never()).delete(anyString());

        assertThat(projectName(PROJECT_B)).isEqualTo("Beta project");
        assertThat(taskTitle(TASK_B)).isEqualTo("Beta task");
        assertThat(count("SELECT count(*) FROM audit_events")).isZero();
        assertThat(count("SELECT count(*) FROM outbox_events")).isZero();
        assertThat(count("SELECT count(*) FROM resources WHERE tenant_id=? AND id=?", TENANT_B, RESOURCE_B))
                .isEqualTo(1);
        assertThat(count("SELECT count(*) FROM task_resources WHERE tenant_id=? AND resource_id=?", TENANT_B, RESOURCE_B))
                .isEqualTo(1);
    }

    @Test
    void projectAuthorizationRunsBeforeTargetMembershipValidation() {
        useContext(VIEWER, TenantRole.MEMBER);

        assertThatThrownBy(() -> service.setProjectMember(
                PROJECT_A, OUTSIDER, new SetProjectMemberRequest(ProjectRole.VIEWER)))
                .isInstanceOf(TenantAccessDeniedException.class)
                .hasMessage("Insufficient project role");

        verifyNoInteractions(tenantMemberships);
        assertThat(count(
                "SELECT count(*) FROM project_memberships WHERE tenant_id=? AND project_id=? AND user_id=?",
                TENANT_A, PROJECT_A, OUTSIDER)).isZero();
    }

    @Test
    void managerCanAddAnActiveTenantMemberToProject() {
        useContext(MANAGER, TenantRole.ADMIN);
        TenantMembershipEntity activeTenantMember = new TenantMembershipEntity();
        activeTenantMember.setTenantId(TENANT_A);
        activeTenantMember.setUserId(OUTSIDER);
        activeTenantMember.setRole(TenantRole.MEMBER);
        activeTenantMember.setActive(true);
        when(tenantMemberships.findByTenantIdAndUserId(TENANT_A, OUTSIDER))
                .thenReturn(Optional.of(activeTenantMember));

        ApplicationDtos.ProjectMemberView result = service.setProjectMember(
                PROJECT_A, OUTSIDER, new SetProjectMemberRequest(ProjectRole.VIEWER));

        assertThat(result.userId()).isEqualTo(OUTSIDER);
        assertThat(result.role()).isEqualTo(ProjectRole.VIEWER);
        assertThat(count(
                "SELECT count(*) FROM project_memberships WHERE tenant_id=? AND project_id=? AND user_id=?",
                TENANT_A, PROJECT_A, OUTSIDER)).isEqualTo(1);
    }

    private static void seedProject(
            UUID tenantId,
            UUID projectId,
            UUID boardId,
            UUID columnId,
            UUID taskId,
            UUID managerId,
            String projectName,
            String taskTitle) {
        adminJdbc.update(
                "INSERT INTO projects(id,tenant_id,name,description,created_by) VALUES (?,?,?,?,?)",
                projectId, tenantId, projectName, null, managerId);
        seedProjectMembership(tenantId, projectId, managerId, ProjectRole.MANAGER);
        adminJdbc.update(
                "INSERT INTO boards(id,tenant_id,project_id,name) VALUES (?,?,?,?)",
                boardId, tenantId, projectId, "Kanban");
        adminJdbc.update(
                "INSERT INTO board_columns(id,tenant_id,board_id,name,position) VALUES (?,?,?,?,?)",
                columnId, tenantId, boardId, "To do", BigDecimal.valueOf(1000));
        adminJdbc.update("""
                INSERT INTO tasks(id,tenant_id,project_id,board_id,board_column_id,title,position,created_by)
                VALUES (?,?,?,?,?,?,?,?)
                """, taskId, tenantId, projectId, boardId, columnId, taskTitle, BigDecimal.valueOf(1000), managerId);
    }

    private static void seedProjectMembership(UUID tenantId, UUID projectId, UUID userId, ProjectRole role) {
        adminJdbc.update(
                "INSERT INTO project_memberships(id,tenant_id,project_id,user_id,role) VALUES (?,?,?,?,?)",
                UUID.randomUUID(), tenantId, projectId, userId, role.name());
    }

    private static void seedResource(
            UUID tenantId,
            UUID resourceId,
            UUID taskId,
            UUID uploader,
            String filename) {
        String storageKey = tenantId + "/" + resourceId + "/" + filename;
        adminJdbc.update("""
                INSERT INTO resources(id,tenant_id,original_name,storage_key,content_type,size_bytes,uploaded_by)
                VALUES (?,?,?,?,?,?,?)
                """, resourceId, tenantId, filename, storageKey, "text/plain", 12, uploader);
        adminJdbc.update("""
                INSERT INTO task_resources(id,tenant_id,task_id,resource_id)
                VALUES (?,?,?,?)
                """, UUID.randomUUID(), tenantId, taskId, resourceId);
    }

    private CreateTaskRequest createTask(String title) {
        return new CreateTaskRequest(COLUMN_A, null, title, null, null, null, null);
    }

    private void useContext(UUID userId, TenantRole tenantRole) {
        TenantContextHolder.set(new TenantContext(
                userId, TENANT_A, "alpha", "STARTER", TenantPlacement.POOL,
                Set.of(tenantRole), "request-test", "correlation-test"));
    }

    private long count(String sql, Object... args) {
        Long value = adminJdbc.queryForObject(sql, Long.class, args);
        return value == null ? 0 : value;
    }

    private String projectName(UUID projectId) {
        return adminJdbc.queryForObject("SELECT name FROM projects WHERE id=?", String.class, projectId);
    }

    private String taskTitle(UUID taskId) {
        return adminJdbc.queryForObject("SELECT title FROM tasks WHERE id=?", String.class, taskId);
    }
}
