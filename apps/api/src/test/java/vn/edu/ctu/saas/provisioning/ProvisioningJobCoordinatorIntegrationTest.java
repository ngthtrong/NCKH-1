package vn.edu.ctu.saas.provisioning;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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
import vn.edu.ctu.saas.admin.AdminService;
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
import vn.edu.ctu.saas.provisioning.ProvisioningJobCoordinator.FailureOutcome;
import vn.edu.ctu.saas.provisioning.ProvisioningJobCoordinator.ProvisioningClaim;
import vn.edu.ctu.saas.support.TestAppProperties;
import vn.edu.ctu.saas.tenant.TenantPlacement;
import vn.edu.ctu.saas.tenant.TenantStatus;

@DataJpaTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.locations=classpath:db/migration/control"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({
        AdminService.class,
        ProvisioningJobClaimer.class,
        ProvisioningEventRecorder.class,
        ProvisioningJobCoordinator.class,
        ProvisioningJobCoordinatorIntegrationTest.PropertiesConfiguration.class
})
@Testcontainers(disabledWithoutDocker = true)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class ProvisioningJobCoordinatorIntegrationTest {
    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine")
            .withDatabaseName("provisioning_coordinator_test")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired private ProvisioningJobCoordinator coordinator;
    @Autowired private AdminService adminService;
    @Autowired private ProvisioningJobRepository jobs;
    @Autowired private ProvisioningEventRepository events;
    @Autowired private TenantRepository tenants;
    @Autowired private TenantPlacementRepository placements;
    @Autowired private PlatformTransactionManager transactionManager;

    private TransactionTemplate transactions;
    private UUID tenantId;
    private UUID jobId;

    @BeforeEach
    void setUp() {
        transactions = new TransactionTemplate(transactionManager);
        transactions.executeWithoutResult(ignored -> {
            events.deleteAllInBatch();
            jobs.deleteAllInBatch();
            placements.deleteAllInBatch();
            tenants.deleteAllInBatch();

            TenantEntity tenant = new TenantEntity();
            tenant.setSlug("coordinator-test");
            tenant.setName("Coordinator test");
            tenant.setTier("STARTER");
            tenant.setStatus(TenantStatus.PROVISIONING);
            tenant = tenants.saveAndFlush(tenant);
            tenantId = tenant.getId();

            TenantPlacementEntity placement = new TenantPlacementEntity();
            placement.setTenantId(tenantId);
            placement.setPlacementType(TenantPlacement.POOL);
            placements.saveAndFlush(placement);

            ProvisioningJobEntity job = new ProvisioningJobEntity();
            job.setTenantId(tenantId);
            job.setIdempotencyKey("coordinator-test-job");
            job.setStatus(ProvisioningStatus.QUEUED);
            job = jobs.saveAndFlush(job);
            jobId = job.getId();
        });
    }

    @Test
    void retryTransitionReleasesLeaseAndASecondClaimAdvancesTheAttempt() {
        Instant startedAt = Instant.now();
        ProvisioningClaim first = coordinator.claimNext("worker-a", startedAt).orElseThrow();

        FailureOutcome outcome = coordinator.recordFailure(
                first, new IllegalStateException("temporary migration failure"), startedAt.plusSeconds(1));

        assertThat(outcome).isEqualTo(FailureOutcome.RETRY_SCHEDULED);
        ProvisioningJobEntity failed = loadJob();
        assertThat(failed.getStatus()).isEqualTo(ProvisioningStatus.RETRYABLE_FAILED);
        assertThat(failed.getAttempts()).isEqualTo(1);
        assertThat(failed.getLeaseToken()).isNull();
        assertThat(failed.getNextAttemptAt()).isAfter(startedAt);
        assertThat(coordinator.claimNext("worker-b", startedAt.plusSeconds(2))).isEmpty();

        ProvisioningClaim retry = coordinator.claimNext("worker-b", startedAt.plusSeconds(20)).orElseThrow();
        assertThat(retry.attempt()).isEqualTo(2);
        assertThat(loadJob().getStatus()).isEqualTo(ProvisioningStatus.RUNNING);
        assertThat(eventTransitions()).containsExactly(
                "QUEUED->RUNNING#1",
                "RUNNING->RETRYABLE_FAILED#1",
                "RETRYABLE_FAILED->RUNNING#2");
    }

    @Test
    void successActivatesTenantAndClearsLeaseInOneControlTransaction() {
        ProvisioningClaim claim = coordinator.claimNext("worker-success", Instant.now()).orElseThrow();
        TenantPlacementEntity prepared = transactions.execute(
                ignored -> placements.findByTenantId(tenantId).orElseThrow());
        prepared.setDatabaseName("pool_db");
        prepared.setSchemaVersion("1");

        assertThat(coordinator.completeSuccessfully(claim, prepared, Instant.now())).isTrue();

        ProvisioningJobEntity completed = loadJob();
        assertThat(completed.getStatus()).isEqualTo(ProvisioningStatus.SUCCEEDED);
        assertThat(completed.getLeaseOwner()).isNull();
        assertThat(completed.getLeaseToken()).isNull();
        assertThat(completed.getLeaseExpiresAt()).isNull();
        assertThat(loadTenant().getStatus()).isEqualTo(TenantStatus.ACTIVE);
        String schemaVersion = transactions.execute(
                ignored -> placements.findByTenantId(tenantId).orElseThrow().getSchemaVersion());
        assertThat(schemaVersion).isEqualTo("1");
    }

    @Test
    void finalFailureRequiresRollbackBeforeMarkingTenantFailed() {
        Instant now = Instant.now();
        transactions.executeWithoutResult(ignored -> {
            ProvisioningJobEntity job = jobs.findById(jobId).orElseThrow();
            job.setStatus(ProvisioningStatus.RETRYABLE_FAILED);
            job.setAttempts(2);
            job.setNextAttemptAt(now.minusSeconds(1));
            jobs.saveAndFlush(job);
        });
        ProvisioningClaim claim = coordinator.claimNext("worker-final", now).orElseThrow();

        FailureOutcome outcome = coordinator.recordFailure(
                claim, new IllegalStateException("permanent migration failure"), now.plusSeconds(1));

        assertThat(outcome).isEqualTo(FailureOutcome.ROLLBACK_REQUIRED);
        assertThat(loadJob().getStatus()).isEqualTo(ProvisioningStatus.RUNNING);
        assertThat(loadTenant().getStatus()).isEqualTo(TenantStatus.PROVISIONING);
        assertThat(coordinator.completeRollback(
                claim,
                "MIGRATION_FAILED",
                "permanent migration failure",
                null,
                now.plusSeconds(2))).isTrue();
        assertThat(loadJob().getStatus()).isEqualTo(ProvisioningStatus.FAILED_ROLLED_BACK);
        assertThat(loadTenant().getStatus()).isEqualTo(TenantStatus.FAILED);
    }

    @Test
    void rollbackFailureIsNotReportedAsSuccessfullyRolledBack() {
        Instant now = Instant.now();
        transactions.executeWithoutResult(ignored -> {
            ProvisioningJobEntity job = jobs.findById(jobId).orElseThrow();
            job.setStatus(ProvisioningStatus.RETRYABLE_FAILED);
            job.setAttempts(2);
            job.setNextAttemptAt(now.minusSeconds(1));
            jobs.saveAndFlush(job);
        });
        ProvisioningClaim claim = coordinator.claimNext("worker-rollback-failure", now).orElseThrow();
        assertThat(coordinator.recordFailure(
                claim, new IllegalStateException("migration failed"), now.plusSeconds(1)))
                .isEqualTo(FailureOutcome.ROLLBACK_REQUIRED);

        assertThat(coordinator.completeRollback(
                claim,
                "MIGRATION_FAILED",
                "migration failed",
                new IllegalStateException("database still in use"),
                now.plusSeconds(2))).isTrue();

        ProvisioningJobEntity failed = loadJob();
        assertThat(failed.getStatus()).isEqualTo(ProvisioningStatus.ROLLBACK_FAILED);
        assertThat(failed.getLastErrorMessage()).contains("rollback: database still in use");
        assertThat(loadTenant().getStatus()).isEqualTo(TenantStatus.FAILED);

        adminService.retryProvisioning(tenantId);
        ProvisioningJobEntity queued = loadJob();
        assertThat(queued.getStatus()).isEqualTo(ProvisioningStatus.QUEUED);
        assertThat(queued.getAttempts()).isZero();
        assertThat(queued.getLastErrorCode()).isNull();
        assertThat(queued.getLastErrorMessage()).isNull();
        assertThat(loadTenant().getStatus()).isEqualTo(TenantStatus.PROVISIONING);

        ProvisioningClaim recovery = coordinator.claimNext(
                "worker-after-rollback-failure", now.plusSeconds(3)).orElseThrow();
        assertThat(recovery.attempt()).isEqualTo(1);
        assertThat(recovery.rollbackOnly()).isFalse();
        var work = coordinator.loadWork(recovery, now.plusSeconds(4));
        work.placement().setSchemaVersion(TenantDatabaseProvisioner.LATEST_APPLICATION_SCHEMA_VERSION);
        assertThat(coordinator.completeSuccessfully(
                recovery, work.placement(), now.plusSeconds(5))).isTrue();
        assertThat(loadJob().getStatus()).isEqualTo(ProvisioningStatus.SUCCEEDED);
        assertThat(loadTenant().getStatus()).isEqualTo(TenantStatus.ACTIVE);
        assertThat(eventTransitions()).containsExactly(
                "RETRYABLE_FAILED->RUNNING#3",
                "RUNNING->ROLLBACK_FAILED#3",
                "ROLLBACK_FAILED->QUEUED#0",
                "QUEUED->RUNNING#1",
                "RUNNING->SUCCEEDED#1");
    }

    private ProvisioningJobEntity loadJob() {
        return transactions.execute(ignored -> jobs.findById(jobId).orElseThrow());
    }

    private TenantEntity loadTenant() {
        return transactions.execute(ignored -> tenants.findById(tenantId).orElseThrow());
    }

    private List<String> eventTransitions() {
        return transactions.execute(ignored -> events.findAllByProvisioningJobIdOrderByCreatedAt(jobId).stream()
                .map(this::transition)
                .toList());
    }

    private String transition(ProvisioningEventEntity event) {
        String from = event.getFromStatus() == null ? "null" : event.getFromStatus().name();
        return from + "->" + event.getToStatus().name() + "#" + event.getAttempt();
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class PropertiesConfiguration {
        @Bean
        AppProperties appProperties() {
            return TestAppProperties.create();
        }
    }
}
