package vn.edu.ctu.saas.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
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
import vn.edu.ctu.saas.common.NotFoundException;
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
    private static final UUID RESOURCE_A = UUID.fromString("40000000-0000-0000-0000-000000000001");
    private static final UUID RESOURCE_B = UUID.fromString("40000000-0000-0000-0000-000000000002");

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine")
            .withDatabaseName("resource_deletion")
            .withUsername("postgres")
            .withPassword("postgres");

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
        adminJdbc.execute("TRUNCATE TABLE resources, audit_events, outbox_events CASCADE");
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

        assertThat(count("SELECT count(*) FROM resources WHERE id=?", RESOURCE_A)).isZero();
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
    void crossTenantResourceIdIsNotFoundAndCreatesNoCleanupEvent() {
        assertThatThrownBy(() -> service.delete(RESOURCE_B))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Resource not found");

        assertThat(count("SELECT count(*) FROM resources WHERE id=?", RESOURCE_B)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM outbox_events")).isZero();
        verifyNoInteractions(storage);
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
