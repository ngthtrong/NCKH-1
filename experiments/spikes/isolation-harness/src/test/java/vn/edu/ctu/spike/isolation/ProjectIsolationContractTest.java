package vn.edu.ctu.spike.isolation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Stream;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.Transaction;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;
import org.testcontainers.containers.PostgreSQLContainer;

class ProjectIsolationContractTest {
    private static final UUID TENANT_A = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID TENANT_B = UUID.fromString("20000000-0000-0000-0000-000000000002");
    private static final UUID PROJECT_A = UUID.fromString("a0000000-0000-0000-0000-000000000001");
    private static final UUID PROJECT_B = UUID.fromString("b0000000-0000-0000-0000-000000000002");
    private static final UUID PROJECT_A_SECOND = UUID.fromString("a0000000-0000-0000-0000-000000000003");

    private static PostgreSQLContainer<?> postgres;
    private static MatrixEnvironment environment;

    @BeforeAll
    static void startPostgreSql() throws SQLException {
        postgres = new PostgreSQLContainer<>("postgres:18-alpine")
                .withDatabaseName("spike_admin")
                .withUsername("spike_admin")
                .withPassword("spike-admin-password");
        postgres.start();
        environment = new MatrixEnvironment(postgres);
        environment.provision();
    }

    @AfterAll
    static void stopPostgreSql() {
        if (environment != null) environment.close();
        if (postgres != null) postgres.stop();
    }

    @TestFactory
    Stream<DynamicTest> projectCrudSecurityMatrix() {
        return Stream.of(CandidateKind.values())
                .flatMap(candidate -> Stream.of(Placement.values())
                        .map(placement -> DynamicTest.dynamicTest(
                                candidate.id + " / " + placement,
                                () -> runContract(candidate, placement))));
    }

    private void runContract(CandidateKind candidate, Placement placement) {
        try (ProjectRepository repository = candidate == CandidateKind.HIBERNATE_FILTER
                ? new HibernateProjectRepository(environment, candidate, placement)
                : new JdbcProjectRepository(environment, candidate, placement)) {
            repository.create(TENANT_A, PROJECT_A, "Tenant A project");
            repository.create(TENANT_B, PROJECT_B, "Tenant B project");

            assertEquals(List.of(PROJECT_A), repository.listIds(TENANT_A), "project-list tenant A");
            assertEquals(List.of(PROJECT_B), repository.listIds(TENANT_B), "project-list tenant B");

            repository.create(TENANT_A, PROJECT_A_SECOND, "Tenant A second");
            assertEquals(2, repository.listIds(TENANT_A).size(), "project-create remains tenant scoped");
            assertEquals(1, repository.listIds(TENANT_B).size(), "project-create does not leak to tenant B");

            assertTrue(repository.find(TENANT_A, PROJECT_B).isEmpty(), "known foreign ID read must miss");
            assertFalse(repository.rename(TENANT_A, PROJECT_B, "forbidden"), "known foreign ID update must miss");
            assertFalse(repository.delete(TENANT_A, PROJECT_B), "known foreign ID delete must miss");
            assertEquals("Tenant B project", repository.find(TENANT_B, PROJECT_B).orElseThrow().name());

            assertEquals(2, repository.nativeCount(TENANT_A), "native-query guard tenant A");
            assertEquals(1, repository.nativeCount(TENANT_B), "native-query guard tenant B");

            assertEquals(2, repository.bulkSuffix(TENANT_A, " [bulk]"), "bulk update tenant A only");
            assertEquals("Tenant B project", repository.find(TENANT_B, PROJECT_B).orElseThrow().name());

            assertEquals(2, repository.backgroundSuffix(TENANT_A, " [job]"), "background job tenant A only");
            assertEquals("Tenant B project", repository.find(TENANT_B, PROJECT_B).orElseThrow().name());

            repository.verifyContextReset(TENANT_A, TENANT_B);
            assertFalse(environment.runtimeRoleHasBypassRls(candidate, placement, TENANT_A));

            if (candidate == CandidateKind.POSTGRES_RLS) {
                int totalRows = repository.listIds(TENANT_A).size() + repository.listIds(TENANT_B).size();
                assertEquals(0, environment.countAsTableOwner(candidate, placement, TENANT_A),
                        "FORCE RLS must constrain the non-superuser table owner without tenant context");
                assertEquals(totalRowsForDatabase(placement, TENANT_A, totalRows),
                        environment.countAsSuperuser(candidate, placement, TENANT_A),
                        "superuser negative control must demonstrate documented RLS bypass");
                if (placement == Placement.POOL) {
                    assertEquals(2, environment.countOwnerBypassControl(candidate),
                            "owner negative control without FORCE RLS must demonstrate bypass");
                }
            }

            assertTrue(repository.rename(TENANT_A, PROJECT_A, "Tenant A renamed"), "own update");
            assertTrue(repository.delete(TENANT_A, PROJECT_A_SECOND), "own delete");
            assertEquals(List.of(PROJECT_A), repository.listIds(TENANT_A), "own CRUD result");
            assertEquals(List.of(PROJECT_B), repository.listIds(TENANT_B), "tenant B remains unchanged");

            runGuardOmissionMatrix(repository, candidate, placement);
        }
    }

    private void runGuardOmissionMatrix(
            ProjectRepository repository, CandidateKind candidate, Placement placement) {
        boolean poolCandidateLeakExpected = placement == Placement.POOL
                && candidate != CandidateKind.POSTGRES_RLS;

        int visibleRows = repository.nativeCountWithoutApplicationGuard(TENANT_A);
        recordGuardOmission(
                candidate,
                placement,
                "native-query",
                visibleRows > repository.listIds(TENANT_A).size());
        assertEquals(poolCandidateLeakExpected ? 2 : 1, visibleRows,
                "unguarded native query must expose the candidate's actual isolation boundary");

        String tenantBBeforeBulk = repository.find(TENANT_B, PROJECT_B).orElseThrow().name();
        int bulkRows = repository.bulkSuffixWithoutApplicationGuard(TENANT_A, " [unguarded-bulk]");
        String tenantBAfterBulk = repository.find(TENANT_B, PROJECT_B).orElseThrow().name();
        boolean bulkLeak = !tenantBBeforeBulk.equals(tenantBAfterBulk);
        recordGuardOmission(candidate, placement, "bulk-update", bulkLeak);
        assertEquals(poolCandidateLeakExpected, bulkLeak,
                "unguarded bulk mutation classification must match the physical/database guard boundary");
        assertEquals(poolCandidateLeakExpected ? 2 : 1, bulkRows,
                "unguarded bulk mutation row count");

        String tenantBBeforeJob = repository.find(TENANT_B, PROJECT_B).orElseThrow().name();
        int backgroundRows = repository.backgroundSuffixWithoutApplicationGuard(
                TENANT_A, " [unguarded-job]");
        String tenantBAfterJob = repository.find(TENANT_B, PROJECT_B).orElseThrow().name();
        boolean backgroundLeak = !tenantBBeforeJob.equals(tenantBAfterJob);
        recordGuardOmission(candidate, placement, "background-job", backgroundLeak);
        assertEquals(poolCandidateLeakExpected, backgroundLeak,
                "unguarded background mutation classification must match the physical/database guard boundary");
        assertEquals(poolCandidateLeakExpected ? 2 : 1, backgroundRows,
                "unguarded background mutation row count");
    }

    private void recordGuardOmission(
            CandidateKind candidate, Placement placement, String path, boolean crossTenantLeak) {
        String outcome;
        if (crossTenantLeak) {
            outcome = "CANDIDATE_CROSS_TENANT_LEAK";
        } else if (placement == Placement.SILO_DATABASE) {
            outcome = "SILO_DATABASE_BOUNDARY_PROTECTED";
        } else {
            outcome = "POOL_DATABASE_GUARD_PROTECTED";
        }
        System.out.printf(
                "GUARD_OMISSION candidate=%s placement=%s path=%s outcome=%s%n",
                candidate.id, placement, path, outcome);
    }

    private int totalRowsForDatabase(Placement placement, UUID tenantId, int matrixTotal) {
        if (placement == Placement.POOL) return matrixTotal;
        return tenantId.equals(TENANT_A) ? 2 : 1;
    }

    private enum CandidateKind {
        EXPLICIT_PREDICATE("explicit-tenant-predicate", "explicit", false),
        HIBERNATE_FILTER("hibernate-global-tenant-mechanism", "hibernate", false),
        POSTGRES_RLS("postgresql-rls-with-application-guard", "rls", true);

        private final String id;
        private final String databasePrefix;
        private final boolean rls;

        CandidateKind(String id, String databasePrefix, boolean rls) {
            this.id = id;
            this.databasePrefix = databasePrefix;
            this.rls = rls;
        }
    }

    private enum Placement {
        POOL,
        SILO_DATABASE
    }

    private record Project(UUID id, UUID tenantId, String name) {}

    private record DatabaseTarget(
            String jdbcUrl,
            String runtimeRole,
            String runtimePassword,
            String ownerRole,
            String ownerPassword) {}

    private interface ProjectRepository extends AutoCloseable {
        void create(UUID tenantId, UUID projectId, String name);

        List<UUID> listIds(UUID tenantId);

        Optional<Project> find(UUID tenantId, UUID projectId);

        boolean rename(UUID tenantId, UUID projectId, String name);

        boolean delete(UUID tenantId, UUID projectId);

        int nativeCount(UUID tenantId);

        int bulkSuffix(UUID tenantId, String suffix);

        int backgroundSuffix(UUID tenantId, String suffix);

        int nativeCountWithoutApplicationGuard(UUID tenantId);

        int bulkSuffixWithoutApplicationGuard(UUID tenantId, String suffix);

        int backgroundSuffixWithoutApplicationGuard(UUID tenantId, String suffix);

        void verifyContextReset(UUID firstTenant, UUID secondTenant);

        @Override
        default void close() {}
    }

    private static final class MatrixEnvironment implements AutoCloseable {
        private static final String ROLE_PASSWORD = "local-spike-role-password";
        private final PostgreSQLContainer<?> container;
        private final Map<CandidateKind, Map<Placement, Map<UUID, DatabaseTarget>>> targets =
                new EnumMap<>(CandidateKind.class);

        private MatrixEnvironment(PostgreSQLContainer<?> container) {
            this.container = container;
        }

        void provision() throws SQLException {
            for (CandidateKind candidate : CandidateKind.values()) {
                Map<Placement, Map<UUID, DatabaseTarget>> byPlacement = new EnumMap<>(Placement.class);
                byPlacement.put(Placement.POOL, provisionPool(candidate));
                byPlacement.put(Placement.SILO_DATABASE, provisionSilos(candidate));
                targets.put(candidate, byPlacement);
            }
        }

        DatabaseTarget target(CandidateKind candidate, Placement placement, UUID tenantId) {
            return targets.get(candidate).get(placement).get(tenantId);
        }

        private Map<UUID, DatabaseTarget> provisionPool(CandidateKind candidate) throws SQLException {
            String base = candidate.databasePrefix + "_pool";
            DatabaseTarget target = createDatabase(base, candidate.rls, true);
            Map<UUID, DatabaseTarget> result = new HashMap<>();
            result.put(TENANT_A, target);
            result.put(TENANT_B, target);
            return result;
        }

        private Map<UUID, DatabaseTarget> provisionSilos(CandidateKind candidate) throws SQLException {
            Map<UUID, DatabaseTarget> result = new HashMap<>();
            result.put(TENANT_A, createDatabase(candidate.databasePrefix + "_silo_a", candidate.rls, false));
            result.put(TENANT_B, createDatabase(candidate.databasePrefix + "_silo_b", candidate.rls, false));
            return result;
        }

        private DatabaseTarget createDatabase(String base, boolean rls, boolean ownerControl) throws SQLException {
            String database = "p2_" + base;
            String owner = "p2_" + base + "_owner";
            String runtime = "p2_" + base + "_runtime";
            try (Connection admin = adminConnection(container.getDatabaseName()); Statement statement = admin.createStatement()) {
                admin.setAutoCommit(true);
                statement.execute("CREATE ROLE " + identifier(owner) + " LOGIN PASSWORD " + literal(ROLE_PASSWORD));
                statement.execute("CREATE ROLE " + identifier(runtime) + " LOGIN PASSWORD " + literal(ROLE_PASSWORD));
                statement.execute("CREATE DATABASE " + identifier(database) + " OWNER " + identifier(owner));
            }

            String url = jdbcUrl(database);
            try (Connection ownerConnection = DriverManager.getConnection(url, owner, ROLE_PASSWORD);
                    Statement statement = ownerConnection.createStatement()) {
                statement.execute("""
                        CREATE TABLE projects (
                            id uuid PRIMARY KEY,
                            tenant_id uuid NOT NULL,
                            name varchar(160) NOT NULL,
                            version bigint NOT NULL DEFAULT 0,
                            UNIQUE (tenant_id, name)
                        )
                        """);
                statement.execute("GRANT USAGE ON SCHEMA public TO " + identifier(runtime));
                statement.execute("GRANT SELECT,INSERT,UPDATE,DELETE ON projects TO " + identifier(runtime));
                if (rls) {
                    statement.execute("ALTER TABLE projects ENABLE ROW LEVEL SECURITY");
                    statement.execute("ALTER TABLE projects FORCE ROW LEVEL SECURITY");
                    statement.execute("""
                            CREATE POLICY tenant_isolation ON projects
                            USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
                            WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
                            """);
                    if (ownerControl) {
                        statement.execute("""
                                CREATE TABLE owner_bypass_control (
                                    id uuid PRIMARY KEY,
                                    tenant_id uuid NOT NULL
                                )
                                """);
                        statement.execute("ALTER TABLE owner_bypass_control ENABLE ROW LEVEL SECURITY");
                        statement.execute("""
                                CREATE POLICY tenant_isolation_control ON owner_bypass_control
                                USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
                                """);
                        statement.execute("INSERT INTO owner_bypass_control(id,tenant_id) VALUES "
                                + "('00000000-0000-0000-0000-000000000001','" + TENANT_A + "'),"
                                + "('00000000-0000-0000-0000-000000000002','" + TENANT_B + "')");
                    }
                }
            }
            return new DatabaseTarget(url, runtime, ROLE_PASSWORD, owner, ROLE_PASSWORD);
        }

        boolean runtimeRoleHasBypassRls(CandidateKind candidate, Placement placement, UUID tenantId) {
            DatabaseTarget target = target(candidate, placement, tenantId);
            String sql = "SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname=?";
            try (Connection connection = adminConnection(databaseName(target.jdbcUrl));
                    PreparedStatement statement = connection.prepareStatement(sql)) {
                statement.setString(1, target.runtimeRole);
                try (ResultSet result = statement.executeQuery()) {
                    assertTrue(result.next());
                    return result.getBoolean(1);
                }
            } catch (SQLException exception) {
                throw new IllegalStateException(exception);
            }
        }

        int countAsTableOwner(CandidateKind candidate, Placement placement, UUID tenantId) {
            DatabaseTarget target = target(candidate, placement, tenantId);
            return count(target.jdbcUrl, target.ownerRole, target.ownerPassword, "projects");
        }

        int countAsSuperuser(CandidateKind candidate, Placement placement, UUID tenantId) {
            DatabaseTarget target = target(candidate, placement, tenantId);
            return count(target.jdbcUrl, container.getUsername(), container.getPassword(), "projects");
        }

        int countOwnerBypassControl(CandidateKind candidate) {
            DatabaseTarget target = target(candidate, Placement.POOL, TENANT_A);
            return count(target.jdbcUrl, target.ownerRole, target.ownerPassword, "owner_bypass_control");
        }

        private int count(String url, String username, String password, String table) {
            try (Connection connection = DriverManager.getConnection(url, username, password);
                    Statement statement = connection.createStatement();
                    ResultSet result = statement.executeQuery("SELECT count(*) FROM " + identifier(table))) {
                result.next();
                return result.getInt(1);
            } catch (SQLException exception) {
                throw new IllegalStateException(exception);
            }
        }

        private Connection adminConnection(String database) throws SQLException {
            return DriverManager.getConnection(jdbcUrl(database), container.getUsername(), container.getPassword());
        }

        private String jdbcUrl(String database) {
            return "jdbc:postgresql://" + container.getHost() + ":" + container.getMappedPort(5432)
                    + "/" + database + "?loggerLevel=OFF";
        }

        private String databaseName(String url) {
            String withoutQuery = url.substring(0, url.indexOf('?'));
            return withoutQuery.substring(withoutQuery.lastIndexOf('/') + 1);
        }

        private static String identifier(String value) {
            if (!value.matches("[a-z0-9_]+")) throw new IllegalArgumentException("Unsafe identifier");
            return '"' + value + '"';
        }

        private static String literal(String value) {
            return "'" + value.replace("'", "''") + "'";
        }

        @Override
        public void close() {}
    }

    private static final class JdbcProjectRepository implements ProjectRepository {
        private final MatrixEnvironment environment;
        private final CandidateKind candidate;
        private final Placement placement;

        private JdbcProjectRepository(MatrixEnvironment environment, CandidateKind candidate, Placement placement) {
            this.environment = environment;
            this.candidate = candidate;
            this.placement = placement;
        }

        @Override
        public void create(UUID tenantId, UUID projectId, String name) {
            inTransaction(tenantId, connection -> {
                try (PreparedStatement statement = connection.prepareStatement(
                        "INSERT INTO projects(id,tenant_id,name) VALUES (?,?,?)")) {
                    statement.setObject(1, projectId);
                    statement.setObject(2, tenantId);
                    statement.setString(3, name);
                    statement.executeUpdate();
                    return null;
                } catch (SQLException exception) {
                    throw new IllegalStateException(exception);
                }
            });
        }

        @Override
        public List<UUID> listIds(UUID tenantId) {
            return inTransaction(tenantId, connection -> queryIds(connection,
                    "SELECT id FROM projects WHERE tenant_id=? ORDER BY id", tenantId));
        }

        @Override
        public Optional<Project> find(UUID tenantId, UUID projectId) {
            return inTransaction(tenantId, connection -> {
                String sql = "SELECT id,tenant_id,name FROM projects WHERE tenant_id=? AND id=?";
                try (PreparedStatement statement = connection.prepareStatement(sql)) {
                    statement.setObject(1, tenantId);
                    statement.setObject(2, projectId);
                    try (ResultSet result = statement.executeQuery()) {
                        return result.next()
                                ? Optional.of(new Project(
                                        result.getObject("id", UUID.class),
                                        result.getObject("tenant_id", UUID.class),
                                        result.getString("name")))
                                : Optional.empty();
                    }
                } catch (SQLException exception) {
                    throw new IllegalStateException(exception);
                }
            });
        }

        @Override
        public boolean rename(UUID tenantId, UUID projectId, String name) {
            return inTransaction(tenantId, connection -> executeUpdate(
                    connection,
                    "UPDATE projects SET name=?,version=version+1 WHERE tenant_id=? AND id=?",
                    name,
                    tenantId,
                    projectId)) == 1;
        }

        @Override
        public boolean delete(UUID tenantId, UUID projectId) {
            return inTransaction(tenantId, connection -> executeUpdate(
                    connection, "DELETE FROM projects WHERE tenant_id=? AND id=?", tenantId, projectId)) == 1;
        }

        @Override
        public int nativeCount(UUID tenantId) {
            return inTransaction(tenantId, connection -> {
                String sql = candidate.rls
                        ? "SELECT count(*) FROM projects"
                        : "SELECT count(*) FROM projects WHERE tenant_id=?";
                try (PreparedStatement statement = connection.prepareStatement(sql)) {
                    if (!candidate.rls) statement.setObject(1, tenantId);
                    try (ResultSet result = statement.executeQuery()) {
                        result.next();
                        return result.getInt(1);
                    }
                } catch (SQLException exception) {
                    throw new IllegalStateException(exception);
                }
            });
        }

        @Override
        public int bulkSuffix(UUID tenantId, String suffix) {
            return suffix(tenantId, suffix);
        }

        @Override
        public int backgroundSuffix(UUID tenantId, String suffix) {
            return suffix(tenantId, suffix);
        }

        @Override
        public int nativeCountWithoutApplicationGuard(UUID tenantId) {
            return inTransaction(tenantId, connection -> {
                try (Statement statement = connection.createStatement();
                        ResultSet result = statement.executeQuery("SELECT count(*) FROM projects")) {
                    result.next();
                    return result.getInt(1);
                } catch (SQLException exception) {
                    throw new IllegalStateException(exception);
                }
            });
        }

        @Override
        public int bulkSuffixWithoutApplicationGuard(UUID tenantId, String suffix) {
            return unguardedSuffix(tenantId, suffix);
        }

        @Override
        public int backgroundSuffixWithoutApplicationGuard(UUID tenantId, String suffix) {
            return unguardedSuffix(tenantId, suffix);
        }

        private int unguardedSuffix(UUID tenantId, String suffix) {
            return inTransaction(tenantId, connection -> executeUpdate(
                    connection,
                    "UPDATE projects SET name=name || ?,version=version+1",
                    suffix));
        }

        private int suffix(UUID tenantId, String suffix) {
            return inTransaction(tenantId, connection -> executeUpdate(
                    connection,
                    "UPDATE projects SET name=name || ?,version=version+1 WHERE tenant_id=?",
                    suffix,
                    tenantId));
        }

        @Override
        public void verifyContextReset(UUID firstTenant, UUID secondTenant) {
            if (placement == Placement.SILO_DATABASE) {
                assertEquals(2, listIds(firstTenant).size());
                assertEquals(1, listIds(secondTenant).size());
                return;
            }
            DatabaseTarget target = environment.target(candidate, placement, firstTenant);
            try (Connection connection = DriverManager.getConnection(
                    target.jdbcUrl, target.runtimeRole, target.runtimePassword)) {
                connection.setAutoCommit(false);
                setTenantContext(connection, firstTenant);
                assertEquals(2, unguardedCount(connection));
                connection.commit();
                if (candidate.rls) {
                    try (Statement statement = connection.createStatement();
                            ResultSet result = statement.executeQuery("SELECT current_setting('app.tenant_id', true)")) {
                        result.next();
                        assertTrue(result.getString(1) == null || result.getString(1).isBlank(),
                                "transaction-local tenant context must be cleared on commit");
                    }
                }
                setTenantContext(connection, secondTenant);
                assertEquals(1, unguardedCount(connection));
                connection.commit();
            } catch (SQLException exception) {
                throw new IllegalStateException(exception);
            }
        }

        private int unguardedCount(Connection connection) throws SQLException {
            String sql = candidate.rls
                    ? "SELECT count(*) FROM projects"
                    : "SELECT count(*) FROM projects WHERE tenant_id=current_setting('app.tenant_id')::uuid";
            try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
                result.next();
                return result.getInt(1);
            }
        }

        private <T> T inTransaction(UUID tenantId, Function<Connection, T> work) {
            DatabaseTarget target = environment.target(candidate, placement, tenantId);
            try (Connection connection = DriverManager.getConnection(
                    target.jdbcUrl, target.runtimeRole, target.runtimePassword)) {
                connection.setAutoCommit(false);
                try {
                    setTenantContext(connection, tenantId);
                    T result = work.apply(connection);
                    connection.commit();
                    return result;
                } catch (RuntimeException exception) {
                    connection.rollback();
                    throw exception;
                }
            } catch (SQLException exception) {
                throw new IllegalStateException(exception);
            }
        }

        private void setTenantContext(Connection connection, UUID tenantId) throws SQLException {
            try (PreparedStatement statement = connection.prepareStatement("SELECT set_config('app.tenant_id', ?, true)")) {
                statement.setString(1, tenantId.toString());
                statement.execute();
            }
        }

        private List<UUID> queryIds(Connection connection, String sql, UUID tenantId) {
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                statement.setObject(1, tenantId);
                try (ResultSet result = statement.executeQuery()) {
                    List<UUID> ids = new ArrayList<>();
                    while (result.next()) ids.add(result.getObject(1, UUID.class));
                    return ids;
                }
            } catch (SQLException exception) {
                throw new IllegalStateException(exception);
            }
        }

        private int executeUpdate(Connection connection, String sql, Object... values) {
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                for (int index = 0; index < values.length; index++) statement.setObject(index + 1, values[index]);
                return statement.executeUpdate();
            } catch (SQLException exception) {
                throw new IllegalStateException(exception);
            }
        }
    }

    private static final class HibernateProjectRepository implements ProjectRepository {
        private final MatrixEnvironment environment;
        private final CandidateKind candidate;
        private final Placement placement;
        private final Map<String, SessionFactory> factories = new HashMap<>();

        private HibernateProjectRepository(
                MatrixEnvironment environment, CandidateKind candidate, Placement placement) {
            this.environment = environment;
            this.candidate = candidate;
            this.placement = placement;
        }

        @Override
        public void create(UUID tenantId, UUID projectId, String name) {
            inSession(tenantId, session -> {
                session.persist(new ProjectEntity(projectId, tenantId, name));
                return null;
            });
        }

        @Override
        public List<UUID> listIds(UUID tenantId) {
            return inSession(tenantId, session -> session
                    .createQuery("select p.id from SpikeProject p order by p.id", UUID.class)
                    .getResultList());
        }

        @Override
        public Optional<Project> find(UUID tenantId, UUID projectId) {
            return inSession(tenantId, session -> session
                    .createQuery("from SpikeProject p where p.id=:id", ProjectEntity.class)
                    .setParameter("id", projectId)
                    .getResultStream()
                    .findFirst()
                    .map(row -> new Project(row.id, row.tenantId, row.name)));
        }

        @Override
        public boolean rename(UUID tenantId, UUID projectId, String name) {
            return inSession(tenantId, session -> session
                    .createMutationQuery("""
                            update SpikeProject p set p.name=:name,p.version=p.version+1
                            where p.tenantId=:tenantId and p.id=:id
                            """)
                    .setParameter("name", name)
                    .setParameter("tenantId", tenantId)
                    .setParameter("id", projectId)
                    .executeUpdate()) == 1;
        }

        @Override
        public boolean delete(UUID tenantId, UUID projectId) {
            return inSession(tenantId, session -> session
                    .createMutationQuery("delete SpikeProject p where p.tenantId=:tenantId and p.id=:id")
                    .setParameter("tenantId", tenantId)
                    .setParameter("id", projectId)
                    .executeUpdate()) == 1;
        }

        @Override
        public int nativeCount(UUID tenantId) {
            return inSession(tenantId, session -> ((Number) session
                    .createNativeQuery("SELECT count(*) FROM projects WHERE tenant_id=:tenantId")
                    .setParameter("tenantId", tenantId)
                    .getSingleResult()).intValue());
        }

        @Override
        public int bulkSuffix(UUID tenantId, String suffix) {
            return suffix(tenantId, suffix);
        }

        @Override
        public int backgroundSuffix(UUID tenantId, String suffix) {
            return suffix(tenantId, suffix);
        }

        @Override
        public int nativeCountWithoutApplicationGuard(UUID tenantId) {
            return inSessionWithoutFilter(tenantId, session -> ((Number) session
                    .createNativeQuery("SELECT count(*) FROM projects")
                    .getSingleResult()).intValue());
        }

        @Override
        public int bulkSuffixWithoutApplicationGuard(UUID tenantId, String suffix) {
            return inSessionWithoutFilter(tenantId, session -> session
                    .createMutationQuery(
                            "update SpikeProject p set p.name=concat(p.name,:suffix),p.version=p.version+1")
                    .setParameter("suffix", suffix)
                    .executeUpdate());
        }

        @Override
        public int backgroundSuffixWithoutApplicationGuard(UUID tenantId, String suffix) {
            return inSessionWithoutFilter(tenantId, session -> session
                    .createNativeMutationQuery(
                            "UPDATE projects SET name=name || :suffix,version=version+1")
                    .setParameter("suffix", suffix)
                    .executeUpdate());
        }

        private int suffix(UUID tenantId, String suffix) {
            return inSession(tenantId, session -> session
                    .createMutationQuery("""
                            update SpikeProject p set p.name=concat(p.name,:suffix),p.version=p.version+1
                            where p.tenantId=:tenantId
                            """)
                    .setParameter("suffix", suffix)
                    .setParameter("tenantId", tenantId)
                    .executeUpdate());
        }

        @Override
        public void verifyContextReset(UUID firstTenant, UUID secondTenant) {
            assertEquals(2, listIds(firstTenant).size());
            assertEquals(1, listIds(secondTenant).size());
        }

        private <T> T inSession(UUID tenantId, Function<Session, T> work) {
            return inSession(tenantId, true, work);
        }

        private <T> T inSessionWithoutFilter(UUID tenantId, Function<Session, T> work) {
            return inSession(tenantId, false, work);
        }

        private <T> T inSession(UUID tenantId, boolean enableTenantFilter, Function<Session, T> work) {
            DatabaseTarget target = environment.target(candidate, placement, tenantId);
            SessionFactory factory = factories.computeIfAbsent(target.jdbcUrl, ignored -> buildFactory(target));
            try (Session session = factory.openSession()) {
                if (enableTenantFilter) {
                    session.enableFilter("tenantFilter").setParameter("tenantId", tenantId);
                }
                Transaction transaction = session.beginTransaction();
                try {
                    T result = work.apply(session);
                    transaction.commit();
                    return result;
                } catch (RuntimeException exception) {
                    transaction.rollback();
                    throw exception;
                }
            }
        }

        private SessionFactory buildFactory(DatabaseTarget target) {
            StandardServiceRegistry registry = new StandardServiceRegistryBuilder()
                    .applySetting("jakarta.persistence.jdbc.driver", "org.postgresql.Driver")
                    .applySetting("jakarta.persistence.jdbc.url", target.jdbcUrl)
                    .applySetting("jakarta.persistence.jdbc.user", target.runtimeRole)
                    .applySetting("jakarta.persistence.jdbc.password", target.runtimePassword)
                    .applySetting("hibernate.hbm2ddl.auto", "validate")
                    .applySetting("hibernate.show_sql", "false")
                    .applySetting("hibernate.connection.pool_size", "1")
                    .build();
            try {
                return new MetadataSources(registry)
                        .addAnnotatedClass(ProjectEntity.class)
                        .buildMetadata()
                        .buildSessionFactory();
            } catch (RuntimeException exception) {
                StandardServiceRegistryBuilder.destroy(registry);
                throw exception;
            }
        }

        @Override
        public void close() {
            factories.values().forEach(SessionFactory::close);
        }
    }

    @Entity(name = "SpikeProject")
    @Table(name = "projects")
    @FilterDef(name = "tenantFilter", parameters = @ParamDef(name = "tenantId", type = UUID.class))
    @Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
    public static class ProjectEntity {
        @Id
        private UUID id;

        @Column(name = "tenant_id", nullable = false, updatable = false)
        private UUID tenantId;

        @Column(nullable = false)
        private String name;

        @Column(nullable = false)
        private long version;

        protected ProjectEntity() {}

        ProjectEntity(UUID id, UUID tenantId, String name) {
            this.id = id;
            this.tenantId = tenantId;
            this.name = name;
        }
    }
}
