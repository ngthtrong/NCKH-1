package vn.edu.ctu.saas.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import io.minio.MinioClient;
import io.minio.StatObjectArgs;
import io.minio.errors.ErrorResponseException;
import java.io.ByteArrayInputStream;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import vn.edu.ctu.saas.common.NotFoundException;
import vn.edu.ctu.saas.admin.ResourceOutboxAdminService;
import vn.edu.ctu.saas.config.AppProperties;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.control.UserAccountEntity;
import vn.edu.ctu.saas.control.UserAccountRepository;
import vn.edu.ctu.saas.notification.NotificationDispatcher;
import vn.edu.ctu.saas.notification.OutboxWorker;
import vn.edu.ctu.saas.notification.TenantEvent;
import vn.edu.ctu.saas.provisioning.TenantDatabaseProvisioner;
import vn.edu.ctu.saas.support.TestAppProperties;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantDataSourceResolver;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;
import vn.edu.ctu.saas.tenant.TenantPlacement;
import vn.edu.ctu.saas.tenant.TenantRole;

@Testcontainers(disabledWithoutDocker = true)
class ResourceDeletionOutboxIntegrationTest {
    private static final String APP_ROLE = "resource_delete_app";
    private static final String ROLE_PASSWORD = "resource-delete-password";
    private static final UUID TENANT_A = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID TENANT_B = UUID.fromString("20000000-0000-0000-0000-000000000002");
    private static final UUID USER_A = UUID.fromString("30000000-0000-0000-0000-000000000001");
    private static final UUID USER_A_RECIPIENT = UUID.fromString("30000000-0000-0000-0000-000000000002");
    private static final UUID USER_A_OUTSIDER = UUID.fromString("30000000-0000-0000-0000-000000000003");
    private static final UUID USER_B_FOREIGN = UUID.fromString("30000000-0000-0000-0000-000000000004");
    private static final UUID SYSTEM_ADMIN = UUID.fromString("30000000-0000-0000-0000-000000000099");
    private static final UUID RESOURCE_A = UUID.fromString("40000000-0000-0000-0000-000000000001");
    private static final UUID RESOURCE_B = UUID.fromString("40000000-0000-0000-0000-000000000002");
    private static final UUID CORRUPT_RESOURCE_A = UUID.fromString("40000000-0000-0000-0000-000000000003");
    private static final UUID PROJECT_A = UUID.fromString("50000000-0000-0000-0000-000000000001");

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine")
            .withDatabaseName("resource_deletion")
            .withUsername("postgres")
            .withPassword("postgres");

    @Container
    static final GenericContainer<?> MINIO = new GenericContainer<>(
            "quay.io/minio/minio:RELEASE.2025-04-22T22-12-26Z")
            .withEnv("MINIO_ROOT_USER", "minioadmin")
            .withEnv("MINIO_ROOT_PASSWORD", "minioadmin123")
            .withCommand("server", "/data")
            .withExposedPorts(9000)
            .waitingFor(Wait.forHttp("/minio/health/ready").forPort(9000));

    private static JdbcTemplate adminJdbc;
    private static DriverManagerDataSource applicationDataSource;

    private ResourceStorage storage;
    private ResourceService service;

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
            statement.execute("GRANT CONNECT ON DATABASE resource_deletion TO " + APP_ROLE);
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
        insertResource(TENANT_A, RESOURCE_A, USER_A, TENANT_A + "/" + RESOURCE_A + "/evidence.csv");
        insertResource(TENANT_B, RESOURCE_B, UUID.randomUUID(), TENANT_B + "/" + RESOURCE_B + "/foreign.pdf");

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
        storage = mock(ResourceStorage.class);
        service = new ResourceService(executor, storage);
        TenantContextHolder.set(new TenantContext(
                USER_A, TENANT_A, "alpha", "STARTER", TenantPlacement.POOL,
                Set.of(TenantRole.MEMBER), "resource-delete-test", "resource-delete-correlation"));
    }

    @AfterEach
    void clearTenantContext() {
        TenantContextHolder.clear();
    }

    @Test
    void deletionCommitsMetadataAuditAndCleanupEventAtomicallyWithoutCallingStorageInline() {
        service.delete(RESOURCE_A);

        assertThat(count(
                "SELECT count(*) FROM resources WHERE id=? AND deleted_at IS NOT NULL", RESOURCE_A)).isOne();
        assertThat(count("SELECT count(*) FROM audit_events WHERE tenant_id=? AND aggregate_id=?", TENANT_A, RESOURCE_A))
                .isEqualTo(1);
        assertThat(count("""
                SELECT count(*) FROM outbox_events
                WHERE tenant_id=? AND aggregate_id=? AND event_type=?
                  AND payload_json->>'storageKey'=?
                """, TENANT_A, RESOURCE_A, ResourceDeletionHandler.EVENT_TYPE,
                TENANT_A + "/" + RESOURCE_A + "/evidence.csv")).isEqualTo(1);
        verifyNoInteractions(storage);
    }

    @Test
    void crossTenantResourceAndBackgroundJobMatrixRejectsForeignIdsKeysEventsAndRecipients() {
        String storageKeyA = TENANT_A + "/" + RESOURCE_A + "/evidence.csv";
        when(storage.createDownloadUrl(eq(storageKeyA), any())).thenReturn("https://storage.test/alpha");

        assertThat(service.list()).extracting(ResourceService.ResourceView::id)
                .containsExactly(RESOURCE_A);
        assertThat(service.downloadUrl(RESOURCE_A).url()).isEqualTo("https://storage.test/alpha");
        assertThatThrownBy(() -> service.downloadUrl(RESOURCE_B))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Resource not found");
        assertThatThrownBy(() -> service.delete(RESOURCE_B))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Resource not found");

        String wrongResourceStorageKey = TENANT_A + "/" + RESOURCE_B + "/tampered.pdf";
        insertResource(TENANT_A, CORRUPT_RESOURCE_A, USER_A, wrongResourceStorageKey);
        assertThatThrownBy(() -> service.downloadUrl(CORRUPT_RESOURCE_A))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Resource storage key does not belong to the current tenant");
        assertThatThrownBy(() -> service.delete(CORRUPT_RESOURCE_A))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Resource storage key does not belong to the current tenant");

        String traversalStorageKey = TENANT_A + "/" + CORRUPT_RESOURCE_A + "/../../"
                + TENANT_B + "/" + RESOURCE_B + "/foreign.pdf";
        adminJdbc.update(
                "UPDATE resources SET storage_key=? WHERE tenant_id=? AND id=?",
                traversalStorageKey, TENANT_A, CORRUPT_RESOURCE_A);
        assertThatThrownBy(() -> service.downloadUrl(CORRUPT_RESOURCE_A))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Resource storage key does not belong to the current tenant");
        assertThatThrownBy(() -> service.delete(CORRUPT_RESOURCE_A))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Resource storage key does not belong to the current tenant");

        assertThat(count("SELECT count(*) FROM resources WHERE id=?", RESOURCE_B)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM resources WHERE id=?", CORRUPT_RESOURCE_A)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM outbox_events")).isZero();
        verify(storage, never()).createDownloadUrl(eq(wrongResourceStorageKey), any());
        verify(storage, never()).createDownloadUrl(eq(traversalStorageKey), any());
        verify(storage, never()).delete(anyString());

        adminJdbc.update(
                "INSERT INTO projects(id,tenant_id,name,created_by) VALUES (?,?,?,?)",
                PROJECT_A, TENANT_A, "Notification scope", USER_A);
        adminJdbc.update("""
                INSERT INTO project_memberships(id,tenant_id,project_id,user_id,role)
                VALUES (?,?,?,?,?),(?,?,?,?,?)
                """, UUID.randomUUID(), TENANT_A, PROJECT_A, USER_A_RECIPIENT, "VIEWER",
                UUID.randomUUID(), TENANT_A, PROJECT_A, USER_B_FOREIGN, "VIEWER");
        UUID localEventId = insertNotificationEvent(TENANT_A, PROJECT_A, USER_A);
        UUID foreignEventId = insertNotificationEvent(TENANT_B, UUID.randomUUID(), USER_B_FOREIGN);

        TenantMembershipEntity actor = membership(TENANT_A, USER_A);
        TenantMembershipEntity validRecipient = membership(TENANT_A, USER_A_RECIPIENT);
        TenantMembershipEntity unrelatedRecipient = membership(TENANT_A, USER_A_OUTSIDER);
        TenantMembershipEntity foreignRecipient = membership(TENANT_B, USER_B_FOREIGN);
        UserAccountEntity validUser = user(USER_A_RECIPIENT, "recipient@alpha.test");
        UserAccountEntity unrelatedUser = user(USER_A_OUTSIDER, "outsider@alpha.test");
        UserAccountEntity foreignUser = user(USER_B_FOREIGN, "foreign@beta.test");

        TenantRepository tenants = mock(TenantRepository.class);
        TenantPlacementRepository placements = mock(TenantPlacementRepository.class);
        TenantMembershipRepository memberships = mock(TenantMembershipRepository.class);
        UserAccountRepository users = mock(UserAccountRepository.class);
        NotificationDispatcher dispatcher = mock(NotificationDispatcher.class);
        when(tenants.findAll()).thenReturn(java.util.List.of(activeTenantA()));
        when(placements.findByTenantId(TENANT_A)).thenReturn(java.util.Optional.of(placementA()));
        when(memberships.findAllByTenantIdAndActiveTrue(TENANT_A)).thenReturn(java.util.List.of(
                actor, validRecipient, unrelatedRecipient, foreignRecipient));
        when(users.findById(USER_A_RECIPIENT)).thenReturn(java.util.Optional.of(validUser));
        when(users.findById(USER_A_OUTSIDER)).thenReturn(java.util.Optional.of(unrelatedUser));
        when(users.findById(USER_B_FOREIGN)).thenReturn(java.util.Optional.of(foreignUser));

        OutboxWorker worker = new OutboxWorker(
                tenants,
                placements,
                memberships,
                users,
                tenantExecutor(),
                dispatcher,
                new ResourceDeletionHandler(storage, new tools.jackson.databind.ObjectMapper()),
                new tools.jackson.databind.ObjectMapper());
        worker.poll();

        ArgumentCaptor<TenantEvent> deliveredEvent = ArgumentCaptor.forClass(TenantEvent.class);
        verify(dispatcher).dispatch(deliveredEvent.capture(), eq(validUser));
        assertThat(deliveredEvent.getValue().id()).isEqualTo(localEventId);
        assertThat(deliveredEvent.getValue().tenantId()).isEqualTo(TENANT_A);
        verify(dispatcher, never()).dispatch(any(TenantEvent.class), eq(unrelatedUser));
        verify(dispatcher, never()).dispatch(any(TenantEvent.class), eq(foreignUser));
        verify(users, never()).findById(USER_A_OUTSIDER);
        verify(users, never()).findById(USER_B_FOREIGN);
        assertThat(count("SELECT count(*) FROM outbox_events WHERE id=? AND processed_at IS NOT NULL", localEventId))
                .isEqualTo(1);
        assertThat(count("SELECT count(*) FROM outbox_events WHERE id=? AND processed_at IS NULL", foreignEventId))
                .isEqualTo(1);
        assertThat(TenantContextHolder.getNullable()).isNull();
    }

    @Test
    void transientMinioDeleteFailureBacksOffThenEventuallyRemovesTheObject() {
        byte[] content = "failure-injection-evidence".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        AppProperties properties = minioProperties();
        MinioResourceStorage minio = new MinioResourceStorage(properties);
        String storageKey = minio.store(
                TENANT_A,
                RESOURCE_A,
                "evidence.csv",
                "text/csv",
                content.length,
                new ByteArrayInputStream(content)).storageKey();
        service.delete(RESOURCE_A);

        AtomicBoolean failNextDelete = new AtomicBoolean(true);
        ResourceStorage faultInjectedMinio = new ResourceStorage() {
            @Override
            public StoredObject store(
                    UUID tenantId,
                    UUID resourceId,
                    String filename,
                    String contentType,
                    long size,
                    java.io.InputStream input) {
                return minio.store(tenantId, resourceId, filename, contentType, size, input);
            }

            @Override
            public String createDownloadUrl(String key, java.time.Duration expiresIn) {
                return minio.createDownloadUrl(key, expiresIn);
            }

            @Override
            public void delete(String key) {
                if (failNextDelete.compareAndSet(true, false)) {
                    throw new IllegalStateException("injected MinIO outage");
                }
                minio.delete(key);
            }
        };
        TenantPlacementEntity placement = placementA();
        placement.setSchemaVersion("2");
        OutboxWorker worker = outboxWorker(faultInjectedMinio, placement);

        worker.poll();

        assertThat(count("""
                SELECT count(*) FROM outbox_events
                WHERE tenant_id=? AND aggregate_id=? AND attempts=0 AND processed_at IS NULL
                  AND last_error IS NULL
                """, TENANT_A, RESOURCE_A)).isEqualTo(1);
        assertThat(failNextDelete).isTrue();

        placement.setSchemaVersion(TenantDatabaseProvisioner.LATEST_APPLICATION_SCHEMA_VERSION);

        worker.poll();

        assertThat(count("""
                SELECT count(*) FROM outbox_events
                WHERE tenant_id=? AND aggregate_id=? AND attempts=1 AND processed_at IS NULL
                  AND available_at>now() AND last_error LIKE '%injected MinIO outage%'
                """, TENANT_A, RESOURCE_A)).isEqualTo(1);

        adminJdbc.update("""
                UPDATE outbox_events SET available_at=now()-interval '1 second'
                WHERE tenant_id=? AND aggregate_id=?
                """, TENANT_A, RESOURCE_A);
        worker.poll();

        assertThat(count("""
                SELECT count(*) FROM outbox_events
                WHERE tenant_id=? AND aggregate_id=? AND attempts=1 AND processed_at IS NOT NULL
                """, TENANT_A, RESOURCE_A)).isEqualTo(1);
        MinioClient inspector = MinioClient.builder()
                .endpoint(properties.storage().endpoint())
                .credentials(properties.storage().accessKey(), properties.storage().secretKey())
                .build();
        assertThatThrownBy(() -> inspector.statObject(StatObjectArgs.builder()
                .bucket(properties.storage().bucket())
                .object(storageKey)
                .build()))
                .isInstanceOf(ErrorResponseException.class);
    }

    @Test
    void fifthResourceCleanupFailureMovesEventToDeadLetterAndStopsAutomaticDelivery() {
        service.delete(RESOURCE_A);
        AtomicInteger deleteAttempts = new AtomicInteger();
        ResourceStorage unavailableStorage = mock(ResourceStorage.class);
        org.mockito.Mockito.doAnswer(invocation -> {
            deleteAttempts.incrementAndGet();
            throw new IllegalStateException("persistent injected MinIO outage");
        }).when(unavailableStorage).delete(org.mockito.ArgumentMatchers.anyString());
        OutboxWorker worker = outboxWorker(unavailableStorage);

        for (int attempt = 1; attempt <= 5; attempt++) {
            worker.poll();
            if (attempt < 5) makeCleanupDue(TENANT_A, RESOURCE_A);
        }

        assertThat(deleteAttempts).hasValue(5);
        assertThat(count("""
                SELECT count(*) FROM outbox_events
                WHERE tenant_id=? AND aggregate_id=? AND attempts=5 AND processed_at IS NULL
                  AND dead_lettered_at IS NOT NULL
                  AND last_error LIKE '%persistent injected MinIO outage%'
                """, TENANT_A, RESOURCE_A)).isEqualTo(1);
        assertThat(count("""
                SELECT count(*) FROM audit_events
                WHERE tenant_id=? AND aggregate_id=? AND actor_user_id IS NULL
                  AND event_type='RESOURCE_DELETE_DEAD_LETTERED'
                  AND details_json->>'attempts'='5'
                """, TENANT_A, RESOURCE_A)).isEqualTo(1);

        makeCleanupDue(TENANT_A, RESOURCE_A);
        worker.poll();

        assertThat(deleteAttempts).hasValue(5);
        assertThat(count("""
                SELECT count(*) FROM audit_events
                WHERE tenant_id=? AND aggregate_id=? AND event_type='RESOURCE_DELETE_DEAD_LETTERED'
                """, TENANT_A, RESOURCE_A)).isEqualTo(1);
    }

    @Test
    void systemAdminCanListAndRequeueOnlyTheSelectedTenantsResourceDeadLetterWithAudit() {
        UUID eventA = insertDeadLetter(TENANT_A, RESOURCE_A, "alpha cleanup failed");
        UUID eventB = insertDeadLetter(TENANT_B, RESOURCE_B, "foreign cleanup failed");
        TenantContextHolder.clear();
        ResourceOutboxAdminService adminService = resourceOutboxAdminService();

        ResourceOutboxAdminService.DeadLetterPage page =
                adminService.deadLetters(TENANT_A, SYSTEM_ADMIN, 0, 20);

        assertThat(page.totalItems()).isEqualTo(1);
        assertThat(page.items()).singleElement().satisfies(item -> {
            assertThat(item.id()).isEqualTo(eventA);
            assertThat(item.tenantId()).isEqualTo(TENANT_A);
            assertThat(item.resourceId()).isEqualTo(RESOURCE_A);
            assertThat(item.attempts()).isEqualTo(5);
        });
        assertThatThrownBy(() -> adminService.requeue(TENANT_A, eventB, SYSTEM_ADMIN))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Resource cleanup dead letter not found");

        adminService.requeue(TENANT_A, eventA, SYSTEM_ADMIN);

        assertThat(count("""
                SELECT count(*) FROM outbox_events
                WHERE tenant_id=? AND id=? AND attempts=0 AND processed_at IS NULL
                  AND dead_lettered_at IS NULL AND last_error IS NULL
                  AND requeue_count=1 AND last_requeued_at IS NOT NULL AND available_at<=now()
                """, TENANT_A, eventA)).isEqualTo(1);
        assertThat(count("""
                SELECT count(*) FROM audit_events
                WHERE tenant_id=? AND actor_user_id=? AND aggregate_id=?
                  AND event_type='RESOURCE_DELETE_REQUEUED'
                  AND details_json->>'outboxEventId'=?
                  AND details_json->>'previousAttempts'='5'
                  AND details_json->>'previousLastError'='alpha cleanup failed'
                """, TENANT_A, SYSTEM_ADMIN, RESOURCE_A, eventA.toString())).isEqualTo(1);
        assertThat(count("""
                SELECT count(*) FROM outbox_events
                WHERE tenant_id=? AND id=? AND attempts=5 AND dead_lettered_at IS NOT NULL
                  AND last_error='foreign cleanup failed'
                """, TENANT_B, eventB)).isEqualTo(1);
        assertThat(TenantContextHolder.getNullable()).isNull();
    }

    private OutboxWorker outboxWorker(ResourceStorage resourceStorage) {
        TenantPlacementEntity placement = placementA();
        return outboxWorker(resourceStorage, placement);
    }

    private OutboxWorker outboxWorker(
            ResourceStorage resourceStorage,
            TenantPlacementEntity placement) {
        TenantEntity tenant = activeTenantA();
        TenantMembershipEntity membership = new TenantMembershipEntity();
        membership.setTenantId(TENANT_A);
        membership.setUserId(USER_A);
        membership.setRole(TenantRole.MEMBER);
        membership.setActive(true);

        TenantRepository tenants = mock(TenantRepository.class);
        TenantPlacementRepository placements = mock(TenantPlacementRepository.class);
        TenantMembershipRepository memberships = mock(TenantMembershipRepository.class);
        when(tenants.findAll()).thenReturn(java.util.List.of(tenant));
        when(placements.findByTenantId(TENANT_A)).thenReturn(java.util.Optional.of(placement));
        when(memberships.findAllByTenantIdAndActiveTrue(TENANT_A))
                .thenReturn(java.util.List.of(membership));

        return new OutboxWorker(
                tenants,
                placements,
                memberships,
                mock(UserAccountRepository.class),
                tenantExecutor(),
                mock(NotificationDispatcher.class),
                new ResourceDeletionHandler(resourceStorage, new tools.jackson.databind.ObjectMapper()),
                new tools.jackson.databind.ObjectMapper());
    }

    private ResourceOutboxAdminService resourceOutboxAdminService() {
        TenantRepository tenants = mock(TenantRepository.class);
        TenantPlacementRepository placements = mock(TenantPlacementRepository.class);
        when(tenants.findById(TENANT_A)).thenReturn(java.util.Optional.of(activeTenantA()));
        when(placements.findByTenantId(TENANT_A)).thenReturn(java.util.Optional.of(placementA()));
        return new ResourceOutboxAdminService(tenants, placements, tenantExecutor());
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

    private TenantEntity activeTenantA() {
        TenantEntity tenant = new TenantEntity();
        tenant.setId(TENANT_A);
        tenant.setSlug("alpha");
        tenant.setName("Alpha");
        tenant.setTier("STARTER");
        tenant.setStatus(vn.edu.ctu.saas.tenant.TenantStatus.ACTIVE);
        return tenant;
    }

    private TenantPlacementEntity placementA() {
        TenantPlacementEntity placement = new TenantPlacementEntity();
        placement.setTenantId(TENANT_A);
        placement.setPlacementType(TenantPlacement.POOL);
        placement.setSchemaVersion(TenantDatabaseProvisioner.LATEST_APPLICATION_SCHEMA_VERSION);
        return placement;
    }

    private UUID insertDeadLetter(UUID tenantId, UUID resourceId, String lastError) {
        UUID eventId = UUID.randomUUID();
        adminJdbc.update("""
                INSERT INTO outbox_events(
                    id,tenant_id,actor_user_id,event_type,aggregate_type,aggregate_id,
                    correlation_id,payload_json,attempts,last_error,dead_lettered_at)
                VALUES (?,?,?,?,?,?,?,CAST(? AS jsonb),5,?,now())
                """, eventId, tenantId, USER_A, ResourceDeletionHandler.EVENT_TYPE,
                "RESOURCE", resourceId, "dead-letter-test", "{\"storageKey\":\"" + tenantId
                        + "/" + resourceId + "/evidence.csv\"}", lastError);
        return eventId;
    }

    private UUID insertNotificationEvent(UUID tenantId, UUID projectId, UUID actorUserId) {
        UUID eventId = UUID.randomUUID();
        adminJdbc.update("""
                INSERT INTO outbox_events(
                    id,tenant_id,actor_user_id,event_type,aggregate_type,aggregate_id,
                    correlation_id,payload_json)
                VALUES (?,?,?,?,?,?,?,CAST(? AS jsonb))
                """, eventId, tenantId, actorUserId, "PROJECT_UPDATED", "Project", projectId,
                "notification-matrix", "{}");
        return eventId;
    }

    private TenantMembershipEntity membership(UUID tenantId, UUID userId) {
        TenantMembershipEntity membership = new TenantMembershipEntity();
        membership.setTenantId(tenantId);
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

    private void makeCleanupDue(UUID tenantId, UUID resourceId) {
        adminJdbc.update("""
                UPDATE outbox_events SET available_at=now()-interval '1 second'
                WHERE tenant_id=? AND aggregate_id=?
                """, tenantId, resourceId);
    }

    private AppProperties minioProperties() {
        AppProperties baseline = TestAppProperties.create();
        AppProperties.Storage minio = new AppProperties.Storage(
                "minio",
                "http://" + MINIO.getHost() + ":" + MINIO.getMappedPort(9000),
                "http://" + MINIO.getHost() + ":" + MINIO.getMappedPort(9000),
                "us-east-1",
                "minioadmin",
                "minioadmin123",
                "resource-failure-injection",
                baseline.storage().filesystemRoot(),
                baseline.storage().signingSecret());
        return new AppProperties(
                baseline.baseDomain(),
                baseline.accountsSubdomain(),
                baseline.jwt(),
                baseline.datasource(),
                baseline.provisioning(),
                baseline.payment(),
                minio,
                baseline.rateLimit(),
                baseline.seed());
    }

    private static void insertResource(UUID tenantId, UUID resourceId, UUID uploader, String storageKey) {
        adminJdbc.update("""
                INSERT INTO resources(id,tenant_id,original_name,storage_key,content_type,size_bytes,uploaded_by)
                VALUES (?,?,?,?,?,?,?)
                """, resourceId, tenantId, "evidence.csv", storageKey, "text/csv", 42, uploader);
    }

    private long count(String sql, Object... args) {
        Long value = adminJdbc.queryForObject(sql, Long.class, args);
        return value == null ? 0 : value;
    }
}
