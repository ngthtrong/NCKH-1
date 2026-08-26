package vn.edu.ctu.saas.provisioning;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@Testcontainers(disabledWithoutDocker = true)
class ProvisioningJobClaimerIntegrationTest {
    private static final UUID TENANT_ID =
            UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID JOB_ID =
            UUID.fromString("20000000-0000-0000-0000-000000000001");
    private static final int MAX_ATTEMPTS = 3;

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine")
            .withDatabaseName("provisioning_claim_test")
            .withUsername("postgres")
            .withPassword("postgres");

    private static JdbcTemplate jdbc;
    private static ProvisioningJobClaimer claimer;

    @BeforeAll
    static void migrate() {
        Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration/control")
                .load()
                .migrate();
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        jdbc = new JdbcTemplate(dataSource);
        claimer = new ProvisioningJobClaimer(new NamedParameterJdbcTemplate(dataSource));
    }

    @BeforeEach
    void seedTenant() {
        jdbc.execute("TRUNCATE TABLE provisioning_events, provisioning_jobs, tenant_placements, tenants CASCADE");
        Instant now = Instant.now();
        jdbc.update("""
                INSERT INTO tenants(id,slug,name,tier,status,created_at,updated_at)
                VALUES (?,?,?,?,?,?,?)
                """, TENANT_ID, "lease-test", "Lease test", "STARTER", "PROVISIONING",
                Timestamp.from(now), Timestamp.from(now));
    }

    @Test
    void concurrentWorkersClaimQueuedJobExactlyOnce() throws Exception {
        insertJob("QUEUED", 0, null, null);
        Instant now = Instant.now();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            List<Future<Optional<ProvisioningJobClaimer.ClaimedJob>>> futures = List.of(
                    executor.submit(() -> claimWhenReleased("worker-a", ready, start, now)),
                    executor.submit(() -> claimWhenReleased("worker-b", ready, start, now)));

            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            List<ProvisioningJobClaimer.ClaimedJob> claims = futures.stream()
                    .map(this::await)
                    .flatMap(Optional::stream)
                    .toList();

            assertThat(claims).hasSize(1);
            assertThat(claims.getFirst().jobId()).isEqualTo(JOB_ID);
            assertThat(claims.getFirst().attempt()).isEqualTo(1);
            assertThat(claims.getFirst().rollbackOnly()).isFalse();
            assertThat(value("SELECT attempts FROM provisioning_jobs WHERE id=?", Integer.class, JOB_ID))
                    .isEqualTo(1);
            assertThat(value("SELECT status FROM provisioning_jobs WHERE id=?", String.class, JOB_ID))
                    .isEqualTo("RUNNING");
            assertThat(value("SELECT count(*) FROM provisioning_jobs WHERE lease_token IS NOT NULL", Long.class))
                    .isEqualTo(1L);
        }
    }

    @Test
    void expiredRunningLeaseIsRecoveredAsNextAttempt() {
        Instant now = Instant.now();
        insertJob("RUNNING", 1, UUID.randomUUID(), now.minusSeconds(1));

        ProvisioningJobClaimer.ClaimedJob claim = claimer.claimNext(
                "recovery-worker", UUID.randomUUID(), now, now.plus(Duration.ofMinutes(10)), MAX_ATTEMPTS)
                .orElseThrow();

        assertThat(claim.previousStatus().name()).isEqualTo("RUNNING");
        assertThat(claim.attempt()).isEqualTo(2);
        assertThat(claim.rollbackOnly()).isFalse();
    }

    @Test
    void expiredLeaseAtRetryLimitIsClaimedOnlyForRollback() {
        Instant now = Instant.now();
        insertJob("RUNNING", MAX_ATTEMPTS, UUID.randomUUID(), now.minusSeconds(1));

        ProvisioningJobClaimer.ClaimedJob claim = claimer.claimNext(
                "rollback-worker", UUID.randomUUID(), now, now.plus(Duration.ofMinutes(10)), MAX_ATTEMPTS)
                .orElseThrow();

        assertThat(claim.attempt()).isEqualTo(MAX_ATTEMPTS);
        assertThat(claim.rollbackOnly()).isTrue();
        assertThat(value("SELECT attempts FROM provisioning_jobs WHERE id=?", Integer.class, JOB_ID))
                .isEqualTo(MAX_ATTEMPTS);
    }

    @Test
    void liveLeaseCannotBeStolenAndOnlyItsTokenCanRenewIt() {
        Instant now = Instant.now();
        UUID token = UUID.randomUUID();
        insertJob("RUNNING", 1, token, now.plus(Duration.ofMinutes(5)));

        assertThat(claimer.claimNext(
                "other-worker", UUID.randomUUID(), now, now.plus(Duration.ofMinutes(10)), MAX_ATTEMPTS))
                .isEmpty();
        assertThat(claimer.renew(JOB_ID, UUID.randomUUID(), now, now.plus(Duration.ofMinutes(10))))
                .isFalse();
        assertThat(claimer.renew(JOB_ID, token, now, now.plus(Duration.ofMinutes(10))))
                .isTrue();
    }

    private Optional<ProvisioningJobClaimer.ClaimedJob> claimWhenReleased(
            String workerId, CountDownLatch ready, CountDownLatch start, Instant now) throws Exception {
        ready.countDown();
        assertThat(start.await(10, TimeUnit.SECONDS)).isTrue();
        return claimer.claimNext(
                workerId, UUID.randomUUID(), now, now.plus(Duration.ofMinutes(10)), MAX_ATTEMPTS);
    }

    private Optional<ProvisioningJobClaimer.ClaimedJob> await(
            Future<Optional<ProvisioningJobClaimer.ClaimedJob>> future) {
        try {
            return future.get(20, TimeUnit.SECONDS);
        } catch (Exception exception) {
            throw new AssertionError("Concurrent provisioning claim failed", exception);
        }
    }

    private void insertJob(String status, int attempts, UUID leaseToken, Instant leaseExpiresAt) {
        Instant now = Instant.now();
        jdbc.update("""
                INSERT INTO provisioning_jobs(
                    id,tenant_id,idempotency_key,status,attempts,next_attempt_at,
                    lease_owner,lease_token,lease_expires_at,created_at,updated_at)
                VALUES (?,?,?,?,?,NULL,?,?,?,?,?)
                """, JOB_ID, TENANT_ID, "lease-test-job", status, attempts,
                leaseToken == null ? null : "previous-worker", leaseToken,
                leaseExpiresAt == null ? null : Timestamp.from(leaseExpiresAt),
                Timestamp.from(now), Timestamp.from(now));
    }

    private <T> T value(String sql, Class<T> type, Object... args) {
        return jdbc.queryForObject(sql, type, args);
    }
}
