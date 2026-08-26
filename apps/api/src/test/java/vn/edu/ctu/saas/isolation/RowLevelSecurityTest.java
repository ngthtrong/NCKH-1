package vn.edu.ctu.saas.isolation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@Testcontainers(disabledWithoutDocker = true)
class RowLevelSecurityTest {
    private static final String APP_ROLE = "rls_test_app";
    private static final String OWNER_ROLE = "rls_test_owner";
    private static final String ROLE_PASSWORD = "rls-test-password";
    private static final UUID TENANT_A = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID TENANT_B = UUID.fromString("20000000-0000-0000-0000-000000000002");

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine")
            .withDatabaseName("application_test")
            .withUsername("postgres")
            .withPassword("postgres");

    @BeforeAll
    static void migrateAndSeed() throws SQLException {
        Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration/application")
                .load()
                .migrate();

        try (Connection connection = adminConnection(); Statement statement = connection.createStatement()) {
            connection.setAutoCommit(true);
            statement.execute("CREATE ROLE " + APP_ROLE + " LOGIN PASSWORD '" + ROLE_PASSWORD
                    + "' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS");
            statement.execute("CREATE ROLE " + OWNER_ROLE + " LOGIN PASSWORD '" + ROLE_PASSWORD
                    + "' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS");
            statement.execute("GRANT CONNECT ON DATABASE application_test TO " + APP_ROLE + ", " + OWNER_ROLE);
            statement.execute("GRANT USAGE ON SCHEMA public TO " + APP_ROLE + ", " + OWNER_ROLE);
            statement.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO " + APP_ROLE);
        }

        insertProjectAsSuperuser(TENANT_A, "Alpha project");
        insertProjectAsSuperuser(TENANT_B, "Beta project");
        try (Connection connection = adminConnection(); Statement statement = connection.createStatement()) {
            statement.execute("ALTER TABLE projects OWNER TO " + OWNER_ROLE);
        }
    }

    @Test
    void runtimeRoleAndForcedOwnerCannotReadAcrossTenantsWithNativeSql() throws SQLException {
        assertThat(projectNames(APP_ROLE, TENANT_A)).containsExactly("Alpha project");
        assertThat(projectNames(APP_ROLE, TENANT_B)).containsExactly("Beta project");
        assertThat(projectNamesWithoutContext(APP_ROLE)).isEmpty();

        // FORCE ROW LEVEL SECURITY makes even the non-superuser table owner obey the policy.
        assertThat(projectNames(OWNER_ROLE, TENANT_A)).containsExactly("Alpha project");
        assertThat(projectNamesWithoutContext(OWNER_ROLE)).isEmpty();
    }

    @Test
    void withCheckRejectsCrossTenantInsert() throws SQLException {
        try (Connection connection = roleConnection(APP_ROLE)) {
            connection.setAutoCommit(false);
            setTenant(connection, TENANT_A);
            assertThatThrownBy(() -> insertProject(connection, TENANT_B, "Cross-tenant insert"))
                    .isInstanceOf(SQLException.class)
                    .satisfies(error -> assertThat(((SQLException) error).getSQLState()).isEqualTo("42501"));
            connection.rollback();
        }
    }

    @Test
    void bulkUpdateTouchesOnlyCurrentTenant() throws SQLException {
        try (Connection connection = roleConnection(APP_ROLE)) {
            connection.setAutoCommit(false);
            setTenant(connection, TENANT_A);
            try (Statement statement = connection.createStatement()) {
                assertThat(statement.executeUpdate("UPDATE projects SET description = 'updated by tenant A'"))
                        .isEqualTo(1);
            }
            connection.commit();
        }

        try (Connection connection = adminConnection(); PreparedStatement statement = connection.prepareStatement(
                "SELECT tenant_id, description FROM projects ORDER BY tenant_id")) {
            try (ResultSet rows = statement.executeQuery()) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getObject("tenant_id", UUID.class)).isEqualTo(TENANT_A);
                assertThat(rows.getString("description")).isEqualTo("updated by tenant A");
                assertThat(rows.next()).isTrue();
                assertThat(rows.getObject("tenant_id", UUID.class)).isEqualTo(TENANT_B);
                assertThat(rows.getString("description")).isNull();
            }
        }
    }

    @Test
    void privilegedBypassIsVisibleAndRuntimeRoleHasNoBypassAttribute() throws SQLException {
        try (Connection connection = adminConnection(); Statement statement = connection.createStatement()) {
            try (ResultSet rows = statement.executeQuery("SELECT count(*) FROM projects")) {
                rows.next();
                assertThat(rows.getInt(1)).isEqualTo(2);
            }
            try (PreparedStatement role = connection.prepareStatement(
                    "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = ?")) {
                role.setString(1, APP_ROLE);
                try (ResultSet row = role.executeQuery()) {
                    assertThat(row.next()).isTrue();
                    assertThat(row.getBoolean("rolsuper")).isFalse();
                    assertThat(row.getBoolean("rolbypassrls")).isFalse();
                }
            }
        }
    }

    private static List<String> projectNames(String role, UUID tenantId) throws SQLException {
        try (Connection connection = roleConnection(role)) {
            connection.setAutoCommit(false);
            setTenant(connection, tenantId);
            List<String> names = queryNames(connection);
            connection.rollback();
            return names;
        }
    }

    private static List<String> projectNamesWithoutContext(String role) throws SQLException {
        try (Connection connection = roleConnection(role)) {
            connection.setAutoCommit(false);
            List<String> names = queryNames(connection);
            connection.rollback();
            return names;
        }
    }

    private static List<String> queryNames(Connection connection) throws SQLException {
        List<String> names = new ArrayList<>();
        try (Statement statement = connection.createStatement();
             ResultSet rows = statement.executeQuery("SELECT name FROM projects ORDER BY name")) {
            while (rows.next()) names.add(rows.getString(1));
        }
        return names;
    }

    private static void setTenant(Connection connection, UUID tenantId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT set_config('app.tenant_id', ?, true)")) {
            statement.setString(1, tenantId.toString());
            statement.execute();
        }
    }

    private static void insertProjectAsSuperuser(UUID tenantId, String name) throws SQLException {
        try (Connection connection = adminConnection()) {
            insertProject(connection, tenantId, name);
        }
    }

    private static void insertProject(Connection connection, UUID tenantId, String name) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO projects(id, tenant_id, name, description, created_by, created_at, updated_at) "
                        + "VALUES (?, ?, ?, NULL, ?, ?, ?)")) {
            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            statement.setObject(1, UUID.randomUUID());
            statement.setObject(2, tenantId);
            statement.setString(3, name);
            statement.setObject(4, UUID.randomUUID());
            statement.setObject(5, now);
            statement.setObject(6, now);
            statement.executeUpdate();
        }
    }

    private static Connection adminConnection() throws SQLException {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    }

    private static Connection roleConnection(String role) throws SQLException {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), role, ROLE_PASSWORD);
    }
}
