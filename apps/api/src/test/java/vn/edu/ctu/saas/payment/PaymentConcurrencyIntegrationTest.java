package vn.edu.ctu.saas.payment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
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
import vn.edu.ctu.saas.control.PaymentTransactionRepository;
import vn.edu.ctu.saas.control.PaymentWebhookEventRepository;
import vn.edu.ctu.saas.control.PaymentStatus;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.control.UserAccountEntity;
import vn.edu.ctu.saas.control.UserAccountRepository;
import vn.edu.ctu.saas.provisioning.ProvisioningService;
import vn.edu.ctu.saas.security.TokenHasher;
import vn.edu.ctu.saas.support.TestAppProperties;
import vn.edu.ctu.saas.tenant.TenantRole;
import vn.edu.ctu.saas.tenant.TenantStatus;

@DataJpaTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.locations=classpath:db/migration/control"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(PaymentIdempotencyLock.class)
@Testcontainers(disabledWithoutDocker = true)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class PaymentConcurrencyIntegrationTest {
    private static final String IDEMPOTENCY_KEY = "concurrent-payment-001";

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine")
            .withDatabaseName("control_payment_test")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired private PaymentTransactionRepository payments;
    @Autowired private PaymentWebhookEventRepository events;
    @Autowired private TenantRepository tenants;
    @Autowired private TenantMembershipRepository memberships;
    @Autowired private UserAccountRepository users;
    @Autowired private PaymentIdempotencyLock idempotencyLock;
    @Autowired private PlatformTransactionManager transactionManager;

    private PaymentService service;
    private PaymentProvider provider;
    private ProvisioningService provisioning;
    private TransactionTemplate transactions;
    private UUID userId;
    private UUID tenantId;

    @BeforeEach
    void setUp() {
        transactions = new TransactionTemplate(transactionManager);
        provider = mock(PaymentProvider.class);
        provisioning = mock(ProvisioningService.class);
        when(provider.name()).thenReturn("fake");
        when(provider.createSession(anyString(), anyLong(), anyString(), anyString()))
                .thenAnswer(invocation -> new PaymentProvider.CheckoutSession(
                        "fake",
                        invocation.getArgument(0),
                        invocation.getArgument(3) + "?payment_reference=" + invocation.getArgument(0)));
        service = new PaymentService(
                provider, payments, events, tenants, memberships, provisioning,
                idempotencyLock, new TokenHasher(), TestAppProperties.create());

        transactions.executeWithoutResult(ignored -> {
            events.deleteAllInBatch();
            payments.deleteAllInBatch();
            memberships.deleteAllInBatch();
            tenants.deleteAllInBatch();
            users.deleteAllInBatch();

            UserAccountEntity user = new UserAccountEntity();
            user.setEmail("payment-concurrency@example.test");
            user.setDisplayName("Payment concurrency owner");
            user.setPasswordHash("unused-test-hash");
            user = users.saveAndFlush(user);
            userId = user.getId();

            TenantEntity tenant = new TenantEntity();
            tenant.setSlug("payment-concurrency");
            tenant.setName("Payment concurrency");
            tenant.setTier("STARTER");
            tenant.setStatus(TenantStatus.PENDING_PAYMENT);
            tenant = tenants.saveAndFlush(tenant);
            tenantId = tenant.getId();

            TenantMembershipEntity membership = new TenantMembershipEntity();
            membership.setTenantId(tenantId);
            membership.setUserId(userId);
            membership.setRole(TenantRole.OWNER);
            memberships.saveAndFlush(membership);
        });
    }

    @Test
    void concurrentRequestsWithSameKeyCreateExactlyOnePayment() throws Exception {
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            List<Future<PaymentService.PaymentSessionView>> attempts = List.of(
                    executor.submit(() -> createSessionWhenReleased(ready, start)),
                    executor.submit(() -> createSessionWhenReleased(ready, start)));

            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            PaymentService.PaymentSessionView first = attempts.get(0).get(20, TimeUnit.SECONDS);
            PaymentService.PaymentSessionView second = attempts.get(1).get(20, TimeUnit.SECONDS);

            assertThat(first.paymentId()).isEqualTo(second.paymentId());
            assertThat(first.reference()).isEqualTo(second.reference());
            Long paymentCount = transactions.execute(ignored -> payments.count());
            assertThat(paymentCount).isEqualTo(1L);
        }
    }

    @Test
    void concurrentDuplicateWebhookIsRecordedAndProvisionedExactlyOnce() throws Exception {
        PaymentService.PaymentSessionView session = transactions.execute(ignored -> service.createSession(
                userId,
                tenantId,
                IDEMPOTENCY_KEY,
                100_000,
                "VND",
                "http://payment-concurrency.localhost:8080/payment"));
        String body = "signed-concurrent-webhook";
        when(provider.verifyWebhook(body, java.util.Map.of())).thenReturn(
                new PaymentProvider.VerifiedPayment(
                        session.reference(), true, "concurrent-event-001", 100_000, "VND"));

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            List<Future<PaymentService.PaymentResultView>> attempts = List.of(
                    executor.submit(() -> handleWebhookWhenReleased(body, ready, start)),
                    executor.submit(() -> handleWebhookWhenReleased(body, ready, start)));

            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            PaymentService.PaymentResultView first = attempts.get(0).get(20, TimeUnit.SECONDS);
            PaymentService.PaymentResultView second = attempts.get(1).get(20, TimeUnit.SECONDS);

            assertThat(List.of(first.duplicate(), second.duplicate()))
                    .containsExactlyInAnyOrder(false, true);
            Long eventCount = transactions.execute(ignored -> events.count());
            assertThat(eventCount).isEqualTo(1L);
            PaymentStatus paymentStatus = transactions.execute(
                    ignored -> payments.findById(session.paymentId()).orElseThrow().getStatus());
            assertThat(paymentStatus).isEqualTo(PaymentStatus.SUCCEEDED);
            verify(provisioning, times(1)).enqueue(tenantId, "payment:" + session.paymentId());
        }
    }

    private PaymentService.PaymentSessionView createSessionWhenReleased(
            CountDownLatch ready, CountDownLatch start) throws Exception {
        ready.countDown();
        assertThat(start.await(10, TimeUnit.SECONDS)).isTrue();
        return transactions.execute(ignored -> service.createSession(
                userId,
                tenantId,
                IDEMPOTENCY_KEY,
                100_000,
                "VND",
                "http://payment-concurrency.localhost:8080/payment"));
    }

    private PaymentService.PaymentResultView handleWebhookWhenReleased(
            String body, CountDownLatch ready, CountDownLatch start) throws Exception {
        ready.countDown();
        assertThat(start.await(10, TimeUnit.SECONDS)).isTrue();
        return transactions.execute(ignored -> service.handleWebhook(body, java.util.Map.of()));
    }
}
