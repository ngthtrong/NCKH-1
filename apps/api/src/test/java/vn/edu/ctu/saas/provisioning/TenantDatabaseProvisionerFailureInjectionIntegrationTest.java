package vn.edu.ctu.saas.provisioning;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.fail;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import vn.edu.ctu.saas.config.AppProperties;
import vn.edu.ctu.saas.control.ProvisioningEventEntity;
import vn.edu.ctu.saas.control.ProvisioningEventRepository;
import vn.edu.ctu.saas.control.ProvisioningJobEntity;
import vn.edu.ctu.saas.control.ProvisioningJobRepository;
import vn.edu.ctu.saas.control.ProvisioningStatus;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.provisioning.ProvisioningJobCoordinator.ProvisioningClaim;
import vn.edu.ctu.saas.provisioning.ProvisioningJobCoordinator.ProvisioningWorkItem;
import vn.edu.ctu.saas.provisioning.TenantDatabaseProvisioner.ProvisioningStage;
import vn.edu.ctu.saas.support.TestAppProperties;
import vn.edu.ctu.saas.tenant.TenantPlacement;
import vn.edu.ctu.saas.tenant.TenantStatus;

@DataJpaTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.locations=classpath:db/migration/control"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({
        ProvisioningJobClaimer.class,
        ProvisioningEventRecorder.class,
        ProvisioningJobCoordinator.class,
        TenantDatabaseProvisionerFailureInjectionIntegrationTest.PropertiesConfiguration.class
})
@Testcontainers(disabledWithoutDocker = true)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class TenantDatabaseProvisionerFailureInjectionIntegrationTest {
    private static final String ENV_PREFIX = "NCKH_PROVISIONING_CRASH_";

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine")
            .withDatabaseName("provisioning_crash_recovery")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired private ProvisioningJobCoordinator coordinator;
    @Autowired private ProvisioningJobRepository jobs;
    @Autowired private ProvisioningEventRepository events;
    @Autowired private TenantRepository tenants;
    @Autowired private TenantPlacementRepository placements;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private AppProperties properties;

    @TempDir Path temporaryDirectory;

    @Test
    void forceKilledJvmAtEachExternalBoundaryIsRecoveredByTheExpiredLeaseWithoutDuplicates() throws Exception {
        for (ProvisioningStage stage : ProvisioningStage.values()) {
            verifyCrashRecovery(stage);
        }
        verifyRepeatedRollbackFailureCanRecover();
    }

    private void verifyRepeatedRollbackFailureCanRecover() {
        TenantDatabaseProvisioner provisioner = new TenantDatabaseProvisioner(
                properties, new PlacementSecretCipher(properties));
        TenantEntity tenant = new TenantEntity();
        tenant.setId(UUID.randomUUID());
        tenant.setSlug("rollback-recovery");
        tenant.setName("Rollback recovery");
        tenant.setTier("STARTER");
        tenant.setStatus(TenantStatus.PROVISIONING);
        TenantPlacementEntity placement = new TenantPlacementEntity();
        placement.setTenantId(tenant.getId());
        placement.setPlacementType(TenantPlacement.SILO_DATABASE);
        provisioner.prepare(tenant, placement);
        provisioner.provision(tenant, placement);

        String blockerSchema = "rollback_block_" + tenant.getId().toString().replace("-", "").substring(0, 16);
        try {
            adminExecute("CREATE SCHEMA " + blockerSchema + " AUTHORIZATION " + placement.getDatabaseUsername());

            assertThatThrownBy(() -> provisioner.rollback(tenant, placement))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Failed to roll back tenant database")
                    .hasMessageContaining("cannot be dropped")
                    .hasRootCauseInstanceOf(SQLException.class);
            assertThat(adminCount("SELECT count(*) FROM pg_database WHERE datname=?", placement.getDatabaseName()))
                    .isZero();
            assertThat(adminCount("SELECT count(*) FROM pg_roles WHERE rolname=?", placement.getDatabaseUsername()))
                    .isEqualTo(1);

            assertThatThrownBy(() -> provisioner.rollback(tenant, placement))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("cannot be dropped");
            assertThat(adminCount("SELECT count(*) FROM pg_database WHERE datname=?", placement.getDatabaseName()))
                    .isZero();
            assertThat(adminCount("SELECT count(*) FROM pg_roles WHERE rolname=?", placement.getDatabaseUsername()))
                    .isEqualTo(1);

            adminExecute("DROP SCHEMA " + blockerSchema + " CASCADE");
            provisioner.rollback(tenant, placement);
            assertThat(adminCount("SELECT count(*) FROM pg_database WHERE datname=?", placement.getDatabaseName()))
                    .isZero();
            assertThat(adminCount("SELECT count(*) FROM pg_roles WHERE rolname=?", placement.getDatabaseUsername()))
                    .isZero();
        } finally {
            adminExecute("DROP SCHEMA IF EXISTS " + blockerSchema + " CASCADE");
            provisioner.rollback(tenant, placement);
        }
    }

    private void verifyCrashRecovery(ProvisioningStage stage) throws Exception {
        TenantDatabaseProvisioner provisioner = new TenantDatabaseProvisioner(
                properties, new PlacementSecretCipher(properties));
        Fixture fixture = prepareClaim(stage, provisioner);
        Path marker = temporaryDirectory.resolve(stage.name() + ".reached");
        Path output = temporaryDirectory.resolve(stage.name() + ".log");
        Process crashProcess = launchCrashProcess(stage, fixture, marker, output);

        try {
            awaitCheckpoint(crashProcess, marker, output, stage.name());
            assertThat(Files.readString(marker)).isEqualTo(stage.name());
            assertThat(crashProcess.isAlive()).isTrue();

            crashProcess.destroyForcibly();
            assertThat(crashProcess.waitFor(10, TimeUnit.SECONDS)).isTrue();
            assertThat(crashProcess.exitValue()).isNotZero();

            assertAbandonedAttempt(fixture);
            recoverExpiredLease(fixture, provisioner);
        } finally {
            if (crashProcess.isAlive()) {
                crashProcess.destroyForcibly();
                crashProcess.waitFor(10, TimeUnit.SECONDS);
            }
            provisioner.rollback(fixture.tenant(), fixture.placement());
        }
    }

    private Fixture prepareClaim(ProvisioningStage stage, TenantDatabaseProvisioner provisioner) {
        UUID tenantId = UUID.randomUUID();
        UUID jobId = new TransactionTemplate(transactionManager).execute(ignored -> {
            TenantEntity tenant = new TenantEntity();
            tenant.setId(tenantId);
            tenant.setSlug("crash-" + stage.name().toLowerCase().replace('_', '-'));
            tenant.setName("Crash recovery " + stage.name());
            tenant.setTier("STARTER");
            tenant.setStatus(TenantStatus.PROVISIONING);
            tenant = tenants.saveAndFlush(tenant);

            TenantPlacementEntity placement = new TenantPlacementEntity();
            placement.setTenantId(tenant.getId());
            placement.setPlacementType(TenantPlacement.SILO_DATABASE);
            placements.saveAndFlush(placement);

            ProvisioningJobEntity job = new ProvisioningJobEntity();
            job.setTenantId(tenant.getId());
            job.setIdempotencyKey("crash-recovery-" + stage.name().toLowerCase());
            job.setStatus(ProvisioningStatus.QUEUED);
            return jobs.saveAndFlush(job).getId();
        });

        Instant startedAt = Instant.now();
        ProvisioningClaim claim = coordinator.claimNext("worker-before-crash", startedAt).orElseThrow();
        assertThat(claim.jobId()).isEqualTo(jobId);
        assertThat(claim.tenantId()).isEqualTo(tenantId);
        ProvisioningWorkItem work = coordinator.loadWork(claim, startedAt.plusMillis(1));
        provisioner.prepare(work.tenant(), work.placement());
        assertThat(coordinator.persistPreparedPlacement(
                claim, work.placement(), startedAt.plusMillis(2))).isTrue();

        return new Fixture(
                tenantId,
                jobId,
                claim,
                work.tenant(),
                work.placement(),
                work.placement().getEncryptedPassword(),
                work.placement().getDatabaseName(),
                work.placement().getDatabaseUsername());
    }

    private Process launchCrashProcess(
            ProvisioningStage stage,
            Fixture fixture,
            Path marker,
            Path output) throws Exception {
        String javaExecutable = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        String classpath = System.getProperty("surefire.test.class.path");
        if (classpath == null || classpath.isBlank()) {
            classpath = System.getProperty("java.class.path");
        }
        ProcessBuilder builder = new ProcessBuilder(
                javaExecutable,
                "-cp",
                classpath,
                ProvisioningCrashProcess.class.getName(),
                stage.name(),
                marker.toString());
        builder.redirectErrorStream(true);
        builder.redirectOutput(output.toFile());
        builder.environment().put(ENV_PREFIX + "ADMIN_URL", POSTGRES.getJdbcUrl());
        builder.environment().put(ENV_PREFIX + "ADMIN_USERNAME", POSTGRES.getUsername());
        builder.environment().put(ENV_PREFIX + "ADMIN_PASSWORD", POSTGRES.getPassword());
        builder.environment().put(
                ENV_PREFIX + "ENCRYPTION_KEY", properties.provisioning().encryptionKey());
        builder.environment().put(ENV_PREFIX + "TENANT_ID", fixture.tenantId().toString());
        builder.environment().put(
                ENV_PREFIX + "ENCRYPTED_PASSWORD", fixture.encryptedPassword());
        return builder.start();
    }

    private void awaitCheckpoint(Process process, Path marker, Path output, String expectedMarker) throws Exception {
        Instant deadline = Instant.now().plusSeconds(30);
        while (!Files.exists(marker) || !Files.readString(marker).equals(expectedMarker)) {
            if (!process.isAlive()) {
                fail("Crash JVM exited before its checkpoint. Output:\n" + readOutput(output));
            }
            if (Instant.now().isAfter(deadline)) {
                fail("Timed out waiting for crash JVM checkpoint. Output:\n" + readOutput(output));
            }
            Thread.sleep(50);
        }
    }

    private void assertAbandonedAttempt(Fixture fixture) {
        ProvisioningJobEntity abandoned = loadJob(fixture.jobId());
        assertThat(abandoned.getStatus()).isEqualTo(ProvisioningStatus.RUNNING);
        assertThat(abandoned.getAttempts()).isEqualTo(1);
        assertThat(abandoned.getLeaseToken()).isEqualTo(fixture.firstClaim().leaseToken());
        assertThat(loadTenant(fixture.tenantId()).getStatus()).isEqualTo(TenantStatus.PROVISIONING);

        TenantPlacementEntity prepared = loadPlacement(fixture.tenantId());
        assertThat(prepared.getEncryptedPassword()).isEqualTo(fixture.encryptedPassword());
        assertThat(prepared.getSchemaVersion()).isNull();
        assertThat(adminCount("SELECT count(*) FROM pg_database WHERE datname=?", fixture.databaseName()))
                .isEqualTo(1);
        assertThat(adminCount("SELECT count(*) FROM pg_roles WHERE rolname=?", fixture.runtimeRole()))
                .isEqualTo(1);
    }

    private void recoverExpiredLease(Fixture fixture, TenantDatabaseProvisioner provisioner) {
        Instant recoveryAt = fixture.firstClaim().leaseExpiresAt().plusMillis(1);
        ProvisioningClaim recovery = coordinator.claimNext("worker-after-crash", recoveryAt).orElseThrow();
        assertThat(recovery.jobId()).isEqualTo(fixture.jobId());
        assertThat(recovery.attempt()).isEqualTo(2);
        assertThat(recovery.rollbackOnly()).isFalse();

        ProvisioningWorkItem work = coordinator.loadWork(recovery, recoveryAt.plusMillis(1));
        assertThat(work.placement().getEncryptedPassword()).isEqualTo(fixture.encryptedPassword());
        provisioner.provision(work.tenant(), work.placement());
        assertThat(coordinator.completeSuccessfully(
                recovery, work.placement(), recoveryAt.plusSeconds(1))).isTrue();

        ProvisioningJobEntity completed = loadJob(fixture.jobId());
        assertThat(completed.getStatus()).isEqualTo(ProvisioningStatus.SUCCEEDED);
        assertThat(completed.getAttempts()).isEqualTo(2);
        assertThat(completed.getLeaseToken()).isNull();
        assertThat(loadTenant(fixture.tenantId()).getStatus()).isEqualTo(TenantStatus.ACTIVE);
        TenantPlacementEntity finalized = loadPlacement(fixture.tenantId());
        assertThat(finalized.getEncryptedPassword()).isEqualTo(fixture.encryptedPassword());
        assertThat(finalized.getSchemaVersion())
                .isEqualTo(TenantDatabaseProvisioner.LATEST_APPLICATION_SCHEMA_VERSION);

        assertThat(adminCount("SELECT count(*) FROM pg_database WHERE datname=?", fixture.databaseName()))
                .isEqualTo(1);
        assertThat(adminCount("SELECT count(*) FROM pg_roles WHERE rolname=?", fixture.runtimeRole()))
                .isEqualTo(1);
        assertThat(applicationSchemaVersion(fixture.databaseName()))
                .isEqualTo(TenantDatabaseProvisioner.LATEST_APPLICATION_SCHEMA_VERSION);
        assertThat(eventTransitions(fixture.jobId())).containsExactly(
                "QUEUED->RUNNING#1",
                "RUNNING->RUNNING#2:LEASE_EXPIRED",
                "RUNNING->SUCCEEDED#2");
    }

    private ProvisioningJobEntity loadJob(UUID jobId) {
        return new TransactionTemplate(transactionManager).execute(
                ignored -> jobs.findById(jobId).orElseThrow());
    }

    private TenantEntity loadTenant(UUID tenantId) {
        return new TransactionTemplate(transactionManager).execute(
                ignored -> tenants.findById(tenantId).orElseThrow());
    }

    private TenantPlacementEntity loadPlacement(UUID tenantId) {
        return new TransactionTemplate(transactionManager).execute(
                ignored -> placements.findByTenantId(tenantId).orElseThrow());
    }

    private List<String> eventTransitions(UUID jobId) {
        return new TransactionTemplate(transactionManager).execute(ignored -> events
                .findAllByProvisioningJobIdOrderByCreatedAt(jobId)
                .stream()
                .map(this::transition)
                .toList());
    }

    private String transition(ProvisioningEventEntity event) {
        String from = event.getFromStatus() == null ? "null" : event.getFromStatus().name();
        String error = event.getErrorCode() == null ? "" : ":" + event.getErrorCode();
        return from + "->" + event.getToStatus().name() + "#" + event.getAttempt() + error;
    }

    private long adminCount(String sql, String value) {
        try (var connection = java.sql.DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
             var statement = connection.prepareStatement(sql)) {
            statement.setString(1, value);
            try (var rows = statement.executeQuery()) {
                rows.next();
                return rows.getLong(1);
            }
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot inspect provisioning resources", exception);
        }
    }

    private void adminExecute(String sql) {
        try (var connection = java.sql.DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
             var statement = connection.createStatement()) {
            statement.execute(sql);
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot prepare provisioning failure injection", exception);
        }
    }

    private String applicationSchemaVersion(String databaseName) {
        String adminUrl = POSTGRES.getJdbcUrl();
        int queryIndex = adminUrl.indexOf('?');
        String query = queryIndex < 0 ? "" : adminUrl.substring(queryIndex);
        String clean = queryIndex < 0 ? adminUrl : adminUrl.substring(0, queryIndex);
        String tenantUrl = clean.substring(0, clean.lastIndexOf('/') + 1) + databaseName + query;
        try (var connection = java.sql.DriverManager.getConnection(
                tenantUrl, POSTGRES.getUsername(), POSTGRES.getPassword());
             var statement = connection.prepareStatement("""
                     SELECT version
                     FROM flyway_schema_history
                     WHERE success
                     ORDER BY installed_rank DESC
                     LIMIT 1
                     """);
             var rows = statement.executeQuery()) {
            rows.next();
            return rows.getString(1);
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot inspect application schema version", exception);
        }
    }

    private String readOutput(Path output) {
        try {
            return Files.exists(output) ? Files.readString(output) : "<no output>";
        } catch (Exception exception) {
            return "<cannot read output: " + exception.getMessage() + ">";
        }
    }

    private static AppProperties provisioningProperties() {
        AppProperties baseline = TestAppProperties.create();
        return new AppProperties(
                baseline.baseDomain(),
                baseline.accountsSubdomain(),
                baseline.jwt(),
                new AppProperties.Datasource(
                        new AppProperties.Datasource.Pool(
                                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword(), 2),
                        baseline.datasource().silo()),
                new AppProperties.Provisioning(
                        POSTGRES.getJdbcUrl(),
                        POSTGRES.getUsername(),
                        POSTGRES.getPassword(),
                        baseline.provisioning().encryptionKey(),
                        3,
                        Duration.ofSeconds(5)),
                baseline.payment(),
                baseline.storage(),
                baseline.rateLimit(),
                baseline.seed());
    }

    private record Fixture(
            UUID tenantId,
            UUID jobId,
            ProvisioningClaim firstClaim,
            TenantEntity tenant,
            TenantPlacementEntity placement,
            String encryptedPassword,
            String databaseName,
            String runtimeRole) {}

    @TestConfiguration(proxyBeanMethods = false)
    static class PropertiesConfiguration {
        @Bean
        AppProperties appProperties() {
            return provisioningProperties();
        }
    }
}
