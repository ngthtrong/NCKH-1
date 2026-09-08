package vn.edu.ctu.saas.customization;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.Statement;
import java.time.Instant;
import java.util.List;
import java.util.Map;
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
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.notification.TenantEvent;
import vn.edu.ctu.saas.tenant.TenantAccessDeniedException;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantDataSourceResolver;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;
import vn.edu.ctu.saas.tenant.TenantPlacement;
import vn.edu.ctu.saas.tenant.TenantRole;

@Testcontainers(disabledWithoutDocker = true)
class CustomizationIntegrationTest {
    private static final String APP_ROLE = "customization_test_app";
    private static final String APP_PASSWORD = "customization-test-password";
    private static final UUID TENANT = UUID.fromString("11000000-0000-0000-0000-000000000001");
    private static final UUID PROJECT = UUID.fromString("22000000-0000-0000-0000-000000000001");
    private static final UUID BOARD = UUID.fromString("33000000-0000-0000-0000-000000000001");
    private static final UUID WORK_COLUMN = UUID.fromString("44000000-0000-0000-0000-000000000001");
    private static final UUID DONE_COLUMN = UUID.fromString("44000000-0000-0000-0000-000000000002");
    private static final UUID TASK = UUID.fromString("55000000-0000-0000-0000-000000000001");
    private static final UUID MANAGER = UUID.fromString("66000000-0000-0000-0000-000000000001");
    private static final UUID SUBMITTER = UUID.fromString("66000000-0000-0000-0000-000000000002");
    private static final UUID APPROVER = UUID.fromString("66000000-0000-0000-0000-000000000003");

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine")
            .withDatabaseName("customization_test")
            .withUsername("postgres")
            .withPassword("postgres");

    private static JdbcTemplate admin;
    private static DriverManagerDataSource runtime;
    private TenantJdbcExecutor executor;
    private TenantCapabilityService capabilities;
    private TenantMembershipRepository memberships;
    private JsonMapper mapper;

    @BeforeAll
    static void migrate() throws Exception {
        Flyway.configure().dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration/application").load().migrate();
        try (Connection connection = POSTGRES.createConnection(""); Statement statement = connection.createStatement()) {
            statement.execute("CREATE ROLE " + APP_ROLE + " LOGIN PASSWORD '" + APP_PASSWORD
                    + "' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS");
            statement.execute("GRANT CONNECT ON DATABASE customization_test TO " + APP_ROLE);
            statement.execute("GRANT USAGE ON SCHEMA public TO " + APP_ROLE);
            statement.execute("GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO " + APP_ROLE);
        }
        admin = new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        runtime = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), APP_ROLE, APP_PASSWORD);
    }

    @BeforeEach
    void setUp() {
        admin.execute("TRUNCATE TABLE projects,audit_events,outbox_events,notifications CASCADE");
        admin.update("INSERT INTO projects(id,tenant_id,name,created_by) VALUES (?,?,?,?)",
                PROJECT, TENANT, "Customization", MANAGER);
        admin.update("INSERT INTO project_memberships(id,tenant_id,project_id,user_id,role) VALUES (?,?,?,?,?)",
                UUID.randomUUID(), TENANT, PROJECT, MANAGER, "MANAGER");
        admin.update("INSERT INTO project_memberships(id,tenant_id,project_id,user_id,role) VALUES (?,?,?,?,?)",
                UUID.randomUUID(), TENANT, PROJECT, SUBMITTER, "MEMBER");
        admin.update("INSERT INTO project_memberships(id,tenant_id,project_id,user_id,role) VALUES (?,?,?,?,?)",
                UUID.randomUUID(), TENANT, PROJECT, APPROVER, "MEMBER");
        admin.update("INSERT INTO boards(id,tenant_id,project_id,name) VALUES (?,?,?,?)",
                BOARD, TENANT, PROJECT, "Board");
        admin.update("INSERT INTO board_columns(id,tenant_id,board_id,name,position) VALUES (?,?,?,?,?)",
                WORK_COLUMN, TENANT, BOARD, "Work", 1000);
        admin.update("INSERT INTO board_columns(id,tenant_id,board_id,name,position) VALUES (?,?,?,?,?)",
                DONE_COLUMN, TENANT, BOARD, "Done", 2000);
        admin.update("""
                INSERT INTO tasks(id,tenant_id,project_id,board_id,board_column_id,title,position,created_by)
                VALUES (?,?,?,?,?,?,?,?)
                """, TASK, TENANT, PROJECT, BOARD, WORK_COLUMN, "Approval task", 1000, SUBMITTER);

        executor = new TenantJdbcExecutor(new TenantDataSourceResolver() {
            @Override public DataSource resolve(TenantContext ignored) { return runtime; }
            @Override public void evict(UUID ignored) {}
        });
        capabilities = mock(TenantCapabilityService.class);
        memberships = mock(TenantMembershipRepository.class);
        mapper = JsonMapper.builder().build();
        when(capabilities.effective(eq(TENANT), any())).thenReturn(true);
        doNothing().when(capabilities).require(eq(TENANT), any());
        when(memberships.findAllByTenantIdAndActiveTrue(TENANT)).thenReturn(List.of(
                membership(MANAGER), membership(SUBMITTER), membership(APPROVER)));
    }

    @AfterEach
    void clearContext() { TenantContextHolder.clear(); }

    @Test
    void multiStepApprovalBlocksCompletionAndHandlesAnyThenAll() {
        ApprovalService service = new ApprovalService(executor, capabilities, memberships, mapper);
        use(MANAGER);
        ApprovalService.WorkflowView workflow = service.saveWorkflow(
                BOARD, DONE_COLUMN, "Completion approval", true,
                List.of(
                        new ApprovalService.StepInput("Review", ApprovalService.ApprovalMode.ANY, List.of(MANAGER)),
                        new ApprovalService.StepInput("Confirm", ApprovalService.ApprovalMode.ALL, List.of(MANAGER, APPROVER))),
                0);
        assertThat(workflow.steps()).hasSize(2);

        use(SUBMITTER);
        ApprovalService.RunView submitted = service.submit(TASK);
        assertThatThrownBy(() -> executor.write(jdbc -> {
            ApprovalService.assertCompletionMoveAllowed(jdbc, TenantContextHolder.getRequired(), TASK, DONE_COLUMN);
            return null;
        })).isInstanceOf(ConflictException.class);

        use(MANAGER);
        ApprovalService.RunView secondStep = service.decide(
                submitted.id(), ApprovalService.Decision.APPROVED, submitted.version());
        assertThat(secondStep.currentStep()).isEqualTo(2);
        ApprovalService.RunView waitingForAll = service.decide(
                submitted.id(), ApprovalService.Decision.APPROVED, secondStep.version());
        assertThat(waitingForAll.status()).isEqualTo("PENDING");

        use(APPROVER);
        ApprovalService.RunView approved = service.decide(
                submitted.id(), ApprovalService.Decision.APPROVED, waitingForAll.version());
        assertThat(approved.status()).isEqualTo("APPROVED");
        assertThat(admin.queryForObject("SELECT board_column_id FROM tasks WHERE id=?", UUID.class, TASK))
                .isEqualTo(DONE_COLUMN);
    }

    @Test
    void customEntityUsesPhysicalColumnsAndRemainsReadableAfterCapabilityRevocation() {
        CustomDataService service = new CustomDataService(executor, capabilities, mapper);
        use(MANAGER);
        CustomDataService.DefinitionView pending = service.createDefinition(
                PROJECT, CustomDefinitionKind.ENTITY, "Risks");
        admin.execute("CREATE TABLE " + pending.physicalTable() + " ("
                + "id uuid NOT NULL,tenant_id uuid NOT NULL,project_id uuid NOT NULL,created_by uuid NOT NULL,"
                + "version bigint NOT NULL DEFAULT 0,deleted_at timestamptz,created_at timestamptz DEFAULT now(),"
                + "updated_at timestamptz DEFAULT now(),PRIMARY KEY(tenant_id,id))");
        admin.execute("GRANT SELECT,INSERT,UPDATE,DELETE ON " + pending.physicalTable() + " TO " + APP_ROLE);
        admin.update("UPDATE custom_definitions SET status='ACTIVE' WHERE id=?", pending.id());
        CustomDataService.DefinitionView withPendingField = service.addField(
                pending.id(), "Severity", CustomFieldType.SINGLE_SELECT, false, 1, List.of("LOW", "HIGH"));
        CustomDataService.FieldView field = withPendingField.fields().getFirst();
        admin.execute("ALTER TABLE " + pending.physicalTable() + " ADD COLUMN " + field.physicalColumn() + " text");
        admin.update("UPDATE custom_fields SET status='ACTIVE' WHERE id=?", field.id());

        use(SUBMITTER);
        CustomDataService.RecordView created = service.createRecord(
                pending.id(), Map.of(field.id().toString(), "HIGH"));
        assertThat(service.records(pending.id()).getFirst().values()).containsEntry(field.id().toString(), "HIGH");

        doThrow(new TenantAccessDeniedException("revoked")).when(capabilities).require(TENANT, TenantCapability.CUSTOM_DATA);
        assertThat(service.records(pending.id())).extracting(CustomDataService.RecordView::id).containsExactly(created.id());
        assertThatThrownBy(() -> service.createRecord(
                pending.id(), Map.of(field.id().toString(), "LOW")))
                .isInstanceOf(TenantAccessDeniedException.class);
    }

    @Test
    void automationNotificationIsIdempotentForTheSameEventAndRule() {
        AutomationService ruleService = new AutomationService(executor, capabilities, memberships, mapper);
        use(MANAGER);
        ruleService.create(PROJECT, new AutomationService.CreateRule(
                "Notify task creation", AutomationService.TriggerType.TASK_CREATED, null, null,
                AutomationService.ActionType.NOTIFY_USERS, List.of(APPROVER)));
        UUID eventId = UUID.randomUUID();
        TenantEvent event = new TenantEvent(
                eventId, TENANT, SUBMITTER, "TASK_CREATED", "Task", TASK,
                "automation-test", "{\"boardId\":\"" + BOARD + "\"}", Instant.now());
        AutomationEventHandler handler = new AutomationEventHandler(executor, capabilities, memberships, mapper);

        handler.handle(event);
        handler.handle(event);

        assertThat(admin.queryForObject(
                "SELECT count(*) FROM automation_executions WHERE tenant_id=?", Long.class, TENANT)).isEqualTo(1);
        assertThat(admin.queryForObject(
                "SELECT count(*) FROM notifications WHERE tenant_id=? AND recipient_user_id=?",
                Long.class, TENANT, APPROVER)).isEqualTo(1);
    }

    private TenantMembershipEntity membership(UUID userId) {
        TenantMembershipEntity membership = new TenantMembershipEntity();
        membership.setTenantId(TENANT);
        membership.setUserId(userId);
        membership.setRole(TenantRole.MEMBER);
        membership.setActive(true);
        return membership;
    }

    private void use(UUID userId) {
        TenantContextHolder.set(new TenantContext(
                userId, TENANT, "customization-test", "PRO", TenantPlacement.SILO_DATABASE,
                Set.of(TenantRole.MEMBER), "request-test", "correlation-test"));
    }
}
