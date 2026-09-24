package vn.edu.ctu.saas.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.control.UserAccountEntity;
import vn.edu.ctu.saas.control.UserAccountRepository;
import vn.edu.ctu.saas.provisioning.TenantDatabaseProvisioner;
import vn.edu.ctu.saas.storage.ResourceDeletionHandler;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantDataSourceResolver;
import vn.edu.ctu.saas.tenant.TenantPlacement;
import vn.edu.ctu.saas.tenant.TenantRole;
import vn.edu.ctu.saas.tenant.TenantStatus;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;

@Testcontainers(disabledWithoutDocker = true)
class DeadlineReminderIntegrationTest {
    private static final String APP_ROLE = "deadline_reminder_app";
    private static final String ROLE_PASSWORD = "deadline-reminder-password";
    private static final Instant NOW = Instant.parse("2026-09-18T08:00:00Z");

    private static final UUID TENANT_A = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID TENANT_B = UUID.fromString("20000000-0000-0000-0000-000000000002");
    private static final UUID RECIPIENT = UUID.fromString("30000000-0000-0000-0000-000000000001");
    private static final UUID OTHER_USER = UUID.fromString("30000000-0000-0000-0000-000000000002");
    private static final UUID FOREIGN_USER = UUID.fromString("30000000-0000-0000-0000-000000000003");
    private static final UUID PROJECT_A = UUID.fromString("40000000-0000-0000-0000-000000000001");
    private static final UUID ARCHIVED_PROJECT = UUID.fromString("40000000-0000-0000-0000-000000000002");
    private static final UUID PROJECT_B = UUID.fromString("40000000-0000-0000-0000-000000000003");
    private static final UUID BOARD_A = UUID.fromString("50000000-0000-0000-0000-000000000001");
    private static final UUID ARCHIVED_BOARD = UUID.fromString("50000000-0000-0000-0000-000000000002");
    private static final UUID BOARD_B = UUID.fromString("50000000-0000-0000-0000-000000000003");
    private static final UUID TODO_COLUMN = UUID.fromString("60000000-0000-0000-0000-000000000001");
    private static final UUID DONE_COLUMN = UUID.fromString("60000000-0000-0000-0000-000000000002");
    private static final UUID ARCHIVED_COLUMN = UUID.fromString("60000000-0000-0000-0000-000000000003");
    private static final UUID FOREIGN_COLUMN = UUID.fromString("60000000-0000-0000-0000-000000000004");
    private static final UUID DUE_SOON_TASK = UUID.fromString("70000000-0000-0000-0000-000000000001");
    private static final UUID OVERDUE_TASK = UUID.fromString("70000000-0000-0000-0000-000000000002");

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine")
            .withDatabaseName("deadline_reminders")
            .withUsername("postgres")
            .withPassword("postgres");

    private static JdbcTemplate adminJdbc;
    private static DriverManagerDataSource applicationDataSource;

    private TenantJdbcExecutor executor;
    private ObjectMapper objectMapper;
    private DeadlineReminderService service;

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
            statement.execute("GRANT CONNECT ON DATABASE deadline_reminders TO " + APP_ROLE);
            statement.execute("GRANT USAGE ON SCHEMA public TO " + APP_ROLE);
            statement.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO " + APP_ROLE);
        }
        adminJdbc = new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        applicationDataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), APP_ROLE, ROLE_PASSWORD);
    }

    @BeforeEach
    void setUp() {
        adminJdbc.execute("""
                TRUNCATE TABLE projects, outbox_events, audit_events,
                    notifications, notification_preferences CASCADE
                """);
        seedData();
        executor = tenantExecutor();
        objectMapper = JsonMapper.builder().build();
        service = new DeadlineReminderService(executor, objectMapper);
        useTenantA();
    }

    @AfterEach
    void clearContext() {
        TenantContextHolder.clear();
    }

    @Test
    void queuesOnlyEligibleTenantTasksOnceAndCreatesNewReminderWhenDeadlineChanges() {
        assertThat(service.enqueueDueReminders(NOW, Duration.ofHours(24))).isEqualTo(2);
        assertThat(service.enqueueDueReminders(NOW, Duration.ofHours(24))).isZero();

        assertThat(adminJdbc.queryForList("""
                SELECT reminder_type FROM task_deadline_reminders
                WHERE tenant_id=? ORDER BY reminder_type
                """, String.class, TENANT_A)).containsExactly("DUE_SOON", "OVERDUE");
        assertThat(count("SELECT count(*) FROM task_deadline_reminders WHERE tenant_id=?", TENANT_B)).isZero();
        assertThat(count("SELECT count(*) FROM outbox_events WHERE tenant_id=?", TENANT_A)).isEqualTo(2);
        assertThat(count("SELECT count(*) FROM outbox_events WHERE tenant_id=?", TENANT_B)).isZero();
        assertThat(count("""
                SELECT count(*) FROM outbox_events
                WHERE tenant_id=? AND event_type='TASK_DUE_SOON'
                  AND payload_json->>'recipientUserId'=?
                  AND payload_json->>'title'='Sắp đến hạn'
                """, TENANT_A, RECIPIENT.toString())).isOne();

        adminJdbc.update("UPDATE tasks SET due_at=? WHERE tenant_id=? AND id=?",
                java.sql.Timestamp.from(NOW.plus(Duration.ofHours(2))), TENANT_A, DUE_SOON_TASK);
        assertThat(service.enqueueDueReminders(NOW, Duration.ofHours(24))).isOne();
        assertThat(count("SELECT count(*) FROM task_deadline_reminders WHERE tenant_id=?", TENANT_A)).isEqualTo(3);
    }

    @Test
    void workerDeliversToExactAssigneeAndDropsReminderMadeStaleBeforeDispatch() {
        assertThat(service.enqueueDueReminders(NOW, Duration.ofHours(24))).isEqualTo(2);
        adminJdbc.update("UPDATE tasks SET due_at=? WHERE tenant_id=? AND id=?",
                java.sql.Timestamp.from(NOW.plus(Duration.ofHours(2))), TENANT_A, DUE_SOON_TASK);
        TenantContextHolder.clear();

        TenantRepository tenants = mock(TenantRepository.class);
        TenantPlacementRepository placements = mock(TenantPlacementRepository.class);
        TenantMembershipRepository memberships = mock(TenantMembershipRepository.class);
        UserAccountRepository users = mock(UserAccountRepository.class);
        NotificationDispatcher dispatcher = mock(NotificationDispatcher.class);
        ResourceDeletionHandler deletionHandler = mock(ResourceDeletionHandler.class);

        UserAccountEntity recipient = user(RECIPIENT, "recipient@alpha.test");
        UserAccountEntity otherUser = user(OTHER_USER, "other@alpha.test");
        when(tenants.findAll()).thenReturn(List.of(activeTenantA()));
        when(placements.findByTenantId(TENANT_A)).thenReturn(Optional.of(placementA()));
        when(memberships.findAllByTenantIdAndActiveTrue(TENANT_A))
                .thenReturn(List.of(membership(RECIPIENT), membership(OTHER_USER)));
        when(users.findById(RECIPIENT)).thenReturn(Optional.of(recipient));
        when(users.findById(OTHER_USER)).thenReturn(Optional.of(otherUser));

        OutboxWorker worker = new OutboxWorker(
                tenants, placements, memberships, users, executor, dispatcher, deletionHandler, objectMapper);
        worker.poll();

        ArgumentCaptor<TenantEvent> event = ArgumentCaptor.forClass(TenantEvent.class);
        verify(dispatcher).dispatch(event.capture(), eq(recipient));
        assertThat(event.getValue().eventType()).isEqualTo("TASK_OVERDUE");
        assertThat(event.getValue().aggregateId()).isEqualTo(OVERDUE_TASK);
        verify(dispatcher, never()).dispatch(any(TenantEvent.class), eq(otherUser));
        verify(users, never()).findById(OTHER_USER);
        assertThat(count("""
                SELECT count(*) FROM outbox_events
                WHERE tenant_id=? AND processed_at IS NOT NULL
                """, TENANT_A)).isEqualTo(2);
        assertThat(TenantContextHolder.getNullable()).isNull();
    }

    @Test
    void dispatcherCreatesReadableInAppAndEmailDeliveryIdempotently() {
        assertThat(service.enqueueDueReminders(NOW, Duration.ofHours(24))).isEqualTo(2);
        TenantEvent event = overdueEvent();
        JavaMailSender mailSender = mock(JavaMailSender.class);
        DefaultNotificationDispatcher dispatcher = new DefaultNotificationDispatcher(executor, objectMapper);
        UserAccountEntity recipient = user(RECIPIENT, "recipient@alpha.test");

        dispatcher.dispatch(event, recipient);
        dispatcher.dispatch(event, recipient);

        assertThat(count("SELECT count(*) FROM notifications WHERE tenant_id=?", TENANT_A)).isOne();
        assertThat(adminJdbc.queryForObject("""
                SELECT title FROM notifications WHERE tenant_id=? AND source_event_id=?
                """, String.class, TENANT_A, event.id())).isEqualTo("Công việc đã quá hạn");
        assertThat(adminJdbc.queryForObject("""
                SELECT body FROM notifications WHERE tenant_id=? AND source_event_id=?
                """, String.class, TENANT_A, event.id()))
                .contains("Đã quá hạn")
                .contains(NOW.minus(Duration.ofHours(1)).toString());
        assertThat(adminJdbc.queryForObject("""
                SELECT action_url FROM notifications WHERE tenant_id=? AND source_event_id=?
                """, String.class, TENANT_A, event.id()))
                .isEqualTo("/kanban/" + BOARD_A + "?task=" + OVERDUE_TASK);
        assertThat(count("""
                SELECT count(*) FROM notification_delivery_attempts
                WHERE tenant_id=? AND status='SENT' AND channel='IN_APP'
                """, TENANT_A)).isOne();
        assertThat(count("""
                SELECT count(*) FROM notification_delivery_attempts
                WHERE tenant_id=? AND status='PENDING' AND channel='EMAIL'
                """, TENANT_A)).isOne();

        TenantRepository tenants = mock(TenantRepository.class);
        TenantPlacementRepository placements = mock(TenantPlacementRepository.class);
        TenantMembershipRepository memberships = mock(TenantMembershipRepository.class);
        UserAccountRepository users = mock(UserAccountRepository.class);
        when(tenants.findAll()).thenReturn(List.of(activeTenantA()));
        when(placements.findByTenantId(TENANT_A)).thenReturn(Optional.of(placementA()));
        when(memberships.findAllByTenantIdAndActiveTrue(TENANT_A))
                .thenReturn(List.of(membership(RECIPIENT)));
        when(users.findById(RECIPIENT)).thenReturn(Optional.of(recipient));

        new NotificationDeliveryWorker(
                tenants, placements, memberships, users, executor, mailSender,
                "http://%s.localhost:8080").poll();

        assertThat(count("""
                SELECT count(*) FROM notification_delivery_attempts
                WHERE tenant_id=? AND status='SENT' AND channel IN ('IN_APP','EMAIL')
                """, TENANT_A)).isEqualTo(2);
        assertThat(adminJdbc.queryForObject("""
                SELECT attempt_count FROM notification_delivery_attempts
                WHERE tenant_id=? AND channel='EMAIL'
                """, Integer.class, TENANT_A)).isOne();
        ArgumentCaptor<SimpleMailMessage> message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(message.capture());
        assertThat(message.getValue().getTo()).containsExactly("recipient@alpha.test");
        assertThat(message.getValue().getSubject()).contains("Công việc đã quá hạn");
        assertThat(message.getValue().getText()).contains("http://alpha.localhost:8080/kanban/");
        assertThat(TenantContextHolder.getNullable()).isNull();
    }

    @Test
    void emailDeliveryRetriesFiveTimesThenDeadLettersWithoutDuplicatingInAppNotification() {
        assertThat(service.enqueueDueReminders(NOW, Duration.ofHours(24))).isEqualTo(2);
        TenantEvent event = overdueEvent();
        DefaultNotificationDispatcher dispatcher = new DefaultNotificationDispatcher(executor, objectMapper);
        UserAccountEntity recipient = user(RECIPIENT, "recipient@alpha.test");
        dispatcher.dispatch(event, recipient);

        TenantRepository tenants = mock(TenantRepository.class);
        TenantPlacementRepository placements = mock(TenantPlacementRepository.class);
        TenantMembershipRepository memberships = mock(TenantMembershipRepository.class);
        UserAccountRepository users = mock(UserAccountRepository.class);
        JavaMailSender mailSender = mock(JavaMailSender.class);
        doThrow(new IllegalStateException("smtp unavailable"))
                .when(mailSender).send(any(SimpleMailMessage.class));
        when(tenants.findAll()).thenReturn(List.of(activeTenantA()));
        when(placements.findByTenantId(TENANT_A)).thenReturn(Optional.of(placementA()));
        when(memberships.findAllByTenantIdAndActiveTrue(TENANT_A))
                .thenReturn(List.of(membership(RECIPIENT)));
        when(users.findById(RECIPIENT)).thenReturn(Optional.of(recipient));
        NotificationDeliveryWorker worker = new NotificationDeliveryWorker(
                tenants, placements, memberships, users, executor, mailSender,
                "http://%s.localhost:8080");

        for (int attempt = 1; attempt <= 5; attempt++) {
            if (attempt > 1) {
                adminJdbc.update("""
                        UPDATE notification_delivery_attempts SET available_at=now()
                        WHERE tenant_id=? AND channel='EMAIL'
                        """, TENANT_A);
            }
            worker.poll();
        }

        assertThat(count("SELECT count(*) FROM notifications WHERE tenant_id=?", TENANT_A)).isOne();
        assertThat(adminJdbc.queryForMap("""
                SELECT status,attempt_count,error_code,dead_lettered_at IS NOT NULL AS dead_lettered
                FROM notification_delivery_attempts WHERE tenant_id=? AND channel='EMAIL'
                """, TENANT_A))
                .containsEntry("status", "FAILED")
                .containsEntry("attempt_count", 5)
                .containsEntry("error_code", "SMTP_ERROR")
                .containsEntry("dead_lettered", true);
        verify(mailSender, times(5)).send(any(SimpleMailMessage.class));
        assertThat(TenantContextHolder.getNullable()).isNull();
    }

    @Test
    void emailDeliveryHonorsPreferenceChangedAfterNotificationWasQueued() {
        assertThat(service.enqueueDueReminders(NOW, Duration.ofHours(24))).isEqualTo(2);
        TenantEvent event = overdueEvent();
        UserAccountEntity recipient = user(RECIPIENT, "recipient@alpha.test");
        new DefaultNotificationDispatcher(executor, objectMapper).dispatch(event, recipient);
        adminJdbc.update("""
                INSERT INTO notification_preferences(
                    id,tenant_id,user_id,in_app_enabled,email_enabled,web_push_enabled)
                VALUES (?,?,?,true,false,false)
                """, UUID.randomUUID(), TENANT_A, RECIPIENT);

        TenantRepository tenants = mock(TenantRepository.class);
        TenantPlacementRepository placements = mock(TenantPlacementRepository.class);
        TenantMembershipRepository memberships = mock(TenantMembershipRepository.class);
        UserAccountRepository users = mock(UserAccountRepository.class);
        JavaMailSender mailSender = mock(JavaMailSender.class);
        when(tenants.findAll()).thenReturn(List.of(activeTenantA()));
        when(placements.findByTenantId(TENANT_A)).thenReturn(Optional.of(placementA()));
        when(memberships.findAllByTenantIdAndActiveTrue(TENANT_A))
                .thenReturn(List.of(membership(RECIPIENT)));

        new NotificationDeliveryWorker(
                tenants, placements, memberships, users, executor, mailSender,
                "http://%s.localhost:8080").poll();

        assertThat(adminJdbc.queryForMap("""
                SELECT status,error_code FROM notification_delivery_attempts
                WHERE tenant_id=? AND channel='EMAIL'
                """, TENANT_A))
                .containsEntry("status", "SKIPPED")
                .containsEntry("error_code", "DISABLED_BY_USER");
        verify(mailSender, never()).send(any(SimpleMailMessage.class));
        verify(users, never()).findById(RECIPIENT);
        assertThat(TenantContextHolder.getNullable()).isNull();
    }

    @Test
    void assignmentEventTargetsOnlyCurrentAssignee() throws Exception {
        UUID eventId = UUID.randomUUID();
        String payload = objectMapper.writeValueAsString(java.util.Map.of(
                "projectId", PROJECT_A,
                "boardId", BOARD_A,
                "columnId", TODO_COLUMN,
                "title", "Đã quá hạn",
                "recipientUserId", RECIPIENT));
        adminJdbc.update("""
                INSERT INTO outbox_events(
                    id,tenant_id,actor_user_id,event_type,aggregate_type,aggregate_id,
                    correlation_id,payload_json)
                VALUES (?,?,?,'TASK_ASSIGNED','Task',?,?,CAST(? AS jsonb))
                """, eventId, TENANT_A, OTHER_USER, OVERDUE_TASK, "assignment-test", payload);
        TenantContextHolder.clear();

        TenantRepository tenants = mock(TenantRepository.class);
        TenantPlacementRepository placements = mock(TenantPlacementRepository.class);
        TenantMembershipRepository memberships = mock(TenantMembershipRepository.class);
        UserAccountRepository users = mock(UserAccountRepository.class);
        NotificationDispatcher dispatcher = mock(NotificationDispatcher.class);
        ResourceDeletionHandler deletionHandler = mock(ResourceDeletionHandler.class);
        UserAccountEntity recipient = user(RECIPIENT, "recipient@alpha.test");
        UserAccountEntity otherUser = user(OTHER_USER, "other@alpha.test");
        when(tenants.findAll()).thenReturn(List.of(activeTenantA()));
        when(placements.findByTenantId(TENANT_A)).thenReturn(Optional.of(placementA()));
        when(memberships.findAllByTenantIdAndActiveTrue(TENANT_A))
                .thenReturn(List.of(membership(RECIPIENT), membership(OTHER_USER)));
        when(users.findById(RECIPIENT)).thenReturn(Optional.of(recipient));
        when(users.findById(OTHER_USER)).thenReturn(Optional.of(otherUser));

        new OutboxWorker(
                tenants, placements, memberships, users, executor, dispatcher, deletionHandler, objectMapper)
                .poll();

        ArgumentCaptor<TenantEvent> captured = ArgumentCaptor.forClass(TenantEvent.class);
        verify(dispatcher).dispatch(captured.capture(), eq(recipient));
        assertThat(captured.getValue().eventType()).isEqualTo("TASK_ASSIGNED");
        verify(dispatcher, never()).dispatch(any(TenantEvent.class), eq(otherUser));
        verify(users, never()).findById(OTHER_USER);
        assertThat(TenantContextHolder.getNullable()).isNull();
    }

    private TenantEvent overdueEvent() {
        return adminJdbc.queryForObject("""
                SELECT id,tenant_id,actor_user_id,event_type,aggregate_type,aggregate_id,
                       correlation_id,payload_json::text,created_at
                FROM outbox_events
                WHERE tenant_id=? AND aggregate_id=? AND event_type='TASK_OVERDUE'
                """, (rs, rowNum) -> new TenantEvent(
                rs.getObject("id", UUID.class),
                rs.getObject("tenant_id", UUID.class),
                rs.getObject("actor_user_id", UUID.class),
                rs.getString("event_type"),
                rs.getString("aggregate_type"),
                rs.getObject("aggregate_id", UUID.class),
                rs.getString("correlation_id"),
                rs.getString("payload_json"),
                rs.getTimestamp("created_at").toInstant()), TENANT_A, OVERDUE_TASK);
    }

    private static void seedData() {
        insertProject(TENANT_A, PROJECT_A, "Active", "ACTIVE", RECIPIENT);
        insertProject(TENANT_A, ARCHIVED_PROJECT, "Archived", "ARCHIVED", RECIPIENT);
        insertProject(TENANT_B, PROJECT_B, "Foreign", "ACTIVE", FOREIGN_USER);
        insertProjectMember(TENANT_A, PROJECT_A, RECIPIENT);
        insertProjectMember(TENANT_A, PROJECT_A, OTHER_USER);
        insertProjectMember(TENANT_A, ARCHIVED_PROJECT, RECIPIENT);
        insertProjectMember(TENANT_B, PROJECT_B, FOREIGN_USER);

        insertBoard(TENANT_A, PROJECT_A, BOARD_A);
        insertBoard(TENANT_A, ARCHIVED_PROJECT, ARCHIVED_BOARD);
        insertBoard(TENANT_B, PROJECT_B, BOARD_B);
        insertColumn(TENANT_A, BOARD_A, TODO_COLUMN, false);
        insertColumn(TENANT_A, BOARD_A, DONE_COLUMN, true);
        insertColumn(TENANT_A, ARCHIVED_BOARD, ARCHIVED_COLUMN, false);
        insertColumn(TENANT_B, BOARD_B, FOREIGN_COLUMN, false);

        insertTask(TENANT_A, PROJECT_A, BOARD_A, TODO_COLUMN, DUE_SOON_TASK,
                "Sắp đến hạn", RECIPIENT, NOW.plus(Duration.ofHours(1)), false);
        insertTask(TENANT_A, PROJECT_A, BOARD_A, TODO_COLUMN, OVERDUE_TASK,
                "Đã quá hạn", RECIPIENT, NOW.minus(Duration.ofHours(1)), false);
        insertTask(TENANT_A, PROJECT_A, BOARD_A, DONE_COLUMN, UUID.randomUUID(),
                "Đã hoàn tất", RECIPIENT, NOW.minus(Duration.ofHours(2)), false);
        insertTask(TENANT_A, PROJECT_A, BOARD_A, TODO_COLUMN, UUID.randomUUID(),
                "Không người nhận", null, NOW.plus(Duration.ofHours(1)), false);
        insertTask(TENANT_A, PROJECT_A, BOARD_A, TODO_COLUMN, UUID.randomUUID(),
                "Đã xóa", RECIPIENT, NOW.plus(Duration.ofHours(1)), true);
        insertTask(TENANT_A, ARCHIVED_PROJECT, ARCHIVED_BOARD, ARCHIVED_COLUMN, UUID.randomUUID(),
                "Dự án lưu trữ", RECIPIENT, NOW.plus(Duration.ofHours(1)), false);
        insertTask(TENANT_B, PROJECT_B, BOARD_B, FOREIGN_COLUMN, UUID.randomUUID(),
                "Tenant khác", FOREIGN_USER, NOW.plus(Duration.ofHours(1)), false);
    }

    private static void insertProject(UUID tenantId, UUID projectId, String name, String status, UUID creator) {
        adminJdbc.update("""
                INSERT INTO projects(id,tenant_id,name,created_by,status) VALUES (?,?,?,?,?)
                """, projectId, tenantId, name, creator, status);
    }

    private static void insertProjectMember(UUID tenantId, UUID projectId, UUID userId) {
        adminJdbc.update("""
                INSERT INTO project_memberships(id,tenant_id,project_id,user_id,role) VALUES (?,?,?,?,?)
                """, UUID.randomUUID(), tenantId, projectId, userId, "MEMBER");
    }

    private static void insertBoard(UUID tenantId, UUID projectId, UUID boardId) {
        adminJdbc.update("INSERT INTO boards(id,tenant_id,project_id,name) VALUES (?,?,?,?)",
                boardId, tenantId, projectId, "Kanban");
    }

    private static void insertColumn(UUID tenantId, UUID boardId, UUID columnId, boolean completed) {
        adminJdbc.update("""
                INSERT INTO board_columns(id,tenant_id,board_id,name,position,completed) VALUES (?,?,?,?,?,?)
                """, columnId, tenantId, boardId, completed ? "Done" : "Todo", BigDecimal.valueOf(1000), completed);
    }

    private static void insertTask(
            UUID tenantId,
            UUID projectId,
            UUID boardId,
            UUID columnId,
            UUID taskId,
            String title,
            UUID assignee,
            Instant dueAt,
            boolean deleted) {
        adminJdbc.update("""
                INSERT INTO tasks(
                    id,tenant_id,project_id,board_id,board_column_id,title,assignee_user_id,
                    due_at,position,created_by,deleted_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)
                """, taskId, tenantId, projectId, boardId, columnId, title, assignee,
                java.sql.Timestamp.from(dueAt), BigDecimal.valueOf(1000),
                assignee == null ? RECIPIENT : assignee,
                deleted ? java.sql.Timestamp.from(NOW.minusSeconds(60)) : null);
    }

    private TenantJdbcExecutor tenantExecutor() {
        return new TenantJdbcExecutor(new TenantDataSourceResolver() {
            @Override
            public DataSource resolve(TenantContext ignored) {
                return applicationDataSource;
            }

            @Override
            public void evict(UUID ignored) {
                // Fixed integration-test data source.
            }
        });
    }

    private void useTenantA() {
        TenantContextHolder.set(new TenantContext(
                RECIPIENT, TENANT_A, "alpha", "STARTER", TenantPlacement.POOL,
                Set.of(TenantRole.MEMBER), "deadline-test", "deadline-correlation"));
    }

    private TenantEntity activeTenantA() {
        TenantEntity tenant = new TenantEntity();
        tenant.setId(TENANT_A);
        tenant.setSlug("alpha");
        tenant.setName("Alpha");
        tenant.setTier("STARTER");
        tenant.setStatus(TenantStatus.ACTIVE);
        return tenant;
    }

    private TenantPlacementEntity placementA() {
        TenantPlacementEntity placement = new TenantPlacementEntity();
        placement.setTenantId(TENANT_A);
        placement.setPlacementType(TenantPlacement.POOL);
        placement.setSchemaVersion(TenantDatabaseProvisioner.LATEST_APPLICATION_SCHEMA_VERSION);
        return placement;
    }

    private TenantMembershipEntity membership(UUID userId) {
        TenantMembershipEntity membership = new TenantMembershipEntity();
        membership.setTenantId(TENANT_A);
        membership.setUserId(userId);
        membership.setRole(TenantRole.MEMBER);
        membership.setActive(true);
        return membership;
    }

    private UserAccountEntity user(UUID userId, String email) {
        UserAccountEntity user = new UserAccountEntity();
        user.setId(userId);
        user.setEmail(email);
        user.setDisplayName(email);
        user.setEnabled(true);
        return user;
    }

    private long count(String sql, Object... args) {
        Long value = adminJdbc.queryForObject(sql, Long.class, args);
        return value == null ? 0 : value;
    }
}
