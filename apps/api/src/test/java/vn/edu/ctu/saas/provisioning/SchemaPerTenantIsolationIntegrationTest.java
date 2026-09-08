package vn.edu.ctu.saas.provisioning;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import vn.edu.ctu.saas.config.AppProperties;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.support.TestAppProperties;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantDataSourceResolver;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;
import vn.edu.ctu.saas.tenant.TenantPlacement;
import vn.edu.ctu.saas.tenant.TenantRole;

@Testcontainers(disabledWithoutDocker = true)
class SchemaPerTenantIsolationIntegrationTest {
    private static final UUID TENANT_A = UUID.fromString("71000000-0000-0000-0000-000000000001");
    private static final UUID TENANT_B = UUID.fromString("72000000-0000-0000-0000-000000000002");
    private static final UUID USER = UUID.fromString("73000000-0000-0000-0000-000000000001");

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine")
            .withDatabaseName("provisioner_home")
            .withUsername("postgres")
            .withPassword("postgres");

    @AfterEach
    void clearContext() { TenantContextHolder.clear(); }

    @Test
    void twoTenantsShareOneDatabaseButRolesCannotReadAnExplicitForeignSchema() {
        AppProperties properties = properties();
        PlacementSecretCipher cipher = new PlacementSecretCipher(properties);
        TenantDatabaseProvisioner provisioner = new TenantDatabaseProvisioner(properties, cipher);
        TenantEntity tenantA = tenant(TENANT_A, "schema-a");
        TenantEntity tenantB = tenant(TENANT_B, "schema-b");
        TenantPlacementEntity placementA = placement(TENANT_A);
        TenantPlacementEntity placementB = placement(TENANT_B);

        provisioner.provision(tenantA, placementA);
        provisioner.provision(tenantB, placementB);

        assertThat(placementA.getDatabaseName()).isEqualTo("schema_shared");
        assertThat(placementB.getDatabaseName()).isEqualTo("schema_shared");
        assertThat(placementA.getSchemaName()).isNotEqualTo(placementB.getSchemaName());
        assertThat(placementA.getSchemaVersion()).isEqualTo("8");
        assertThat(placementB.getSchemaVersion()).isEqualTo("8");

        TenantJdbcExecutor executor = executor(cipher, placementA, placementB);
        use(tenantA);
        UUID project = UUID.randomUUID();
        executor.writeWithoutResult(jdbc -> jdbc.update(
                "INSERT INTO projects(id,tenant_id,name,created_by) VALUES (?,?,?,?)",
                project, TENANT_A, "Only A", USER));
        assertThat(executor.<String>read(jdbc -> jdbc.queryForObject(
                "SELECT current_schema()", String.class))).isEqualTo(placementA.getSchemaName());

        assertThatThrownBy(() -> executor.write(jdbc -> {
            jdbc.update("INSERT INTO projects(id,tenant_id,name,created_by) VALUES (?,?,?,?)",
                    UUID.randomUUID(), TENANT_A, "Rolled back", USER);
            throw new IllegalStateException("force rollback");
        })).isInstanceOf(IllegalStateException.class).hasMessage("force rollback");
        assertThat(executor.<Long>read(jdbc -> jdbc.queryForObject(
                "SELECT count(*) FROM projects", Long.class))).isEqualTo(1);

        use(tenantB);
        assertThat(executor.<String>read(jdbc -> jdbc.queryForObject(
                "SELECT current_schema()", String.class))).isEqualTo(placementB.getSchemaName());
        assertThat(executor.<Long>read(jdbc -> jdbc.queryForObject(
                "SELECT count(*) FROM projects", Long.class))).isZero();
        assertThatThrownBy(() -> executor.read(jdbc -> jdbc.queryForObject(
                "SELECT count(*) FROM " + placementA.getSchemaName() + ".projects", Long.class)))
                .isInstanceOf(RuntimeException.class);

        provisioner.rollback(tenantA, placementA);
        JdbcTemplate admin = new JdbcTemplate(new DriverManagerDataSource(
                sharedUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        assertThat(admin.queryForObject(
                "SELECT count(*) FROM information_schema.schemata WHERE schema_name=?",
                Long.class, placementA.getSchemaName())).isZero();
        assertThat(admin.queryForObject(
                "SELECT count(*) FROM information_schema.schemata WHERE schema_name=?",
                Long.class, placementB.getSchemaName())).isEqualTo(1);
        assertThat(executor.<Long>read(jdbc -> jdbc.queryForObject(
                "SELECT count(*) FROM projects", Long.class))).isZero();
    }

    private TenantJdbcExecutor executor(
            PlacementSecretCipher cipher,
            TenantPlacementEntity placementA,
            TenantPlacementEntity placementB) {
        Map<UUID, TenantPlacementEntity> placements = Map.of(TENANT_A, placementA, TENANT_B, placementB);
        return new TenantJdbcExecutor(new TenantDataSourceResolver() {
            @Override
            public DataSource resolve(TenantContext context) {
                TenantPlacementEntity placement = placements.get(context.tenantId());
                return new DriverManagerDataSource(
                        sharedUrl(), placement.getDatabaseUsername(), cipher.decrypt(placement.getEncryptedPassword()));
            }

            @Override
            public String schemaName(TenantContext context) {
                return placements.get(context.tenantId()).getSchemaName();
            }

            @Override public void evict(UUID ignored) {}
        });
    }

    private AppProperties properties() {
        AppProperties base = TestAppProperties.create();
        return new AppProperties(
                base.baseDomain(), base.accountsSubdomain(), base.jwt(),
                new AppProperties.Datasource(
                        base.datasource().pool(),
                        new AppProperties.Datasource.Schema(sharedUrl(), 2, Duration.ofMinutes(1), 8),
                        base.datasource().silo()),
                new AppProperties.Provisioning(
                        POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword(),
                        base.provisioning().encryptionKey(), 3, Duration.ofSeconds(30)),
                base.payment(), base.storage(), base.rateLimit(), base.seed());
    }

    private String sharedUrl() {
        String url = POSTGRES.getJdbcUrl();
        int query = url.indexOf('?');
        String suffix = query >= 0 ? url.substring(query) : "";
        String clean = query >= 0 ? url.substring(0, query) : url;
        return clean.substring(0, clean.lastIndexOf('/') + 1) + "schema_shared" + suffix;
    }

    private TenantEntity tenant(UUID id, String slug) {
        TenantEntity tenant = new TenantEntity();
        tenant.setId(id);
        tenant.setSlug(slug);
        return tenant;
    }

    private TenantPlacementEntity placement(UUID tenantId) {
        TenantPlacementEntity placement = new TenantPlacementEntity();
        placement.setTenantId(tenantId);
        placement.setPlacementType(TenantPlacement.SCHEMA_PER_TENANT);
        return placement;
    }

    private void use(TenantEntity tenant) {
        TenantContextHolder.set(new TenantContext(
                USER, tenant.getId(), tenant.getSlug(), "PRO", TenantPlacement.SCHEMA_PER_TENANT,
                Set.of(TenantRole.OWNER), "schema-test", "schema-test"));
    }
}
