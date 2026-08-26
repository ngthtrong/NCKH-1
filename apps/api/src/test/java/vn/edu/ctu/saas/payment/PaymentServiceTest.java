package vn.edu.ctu.saas.payment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.control.PaymentStatus;
import vn.edu.ctu.saas.control.PaymentTransactionEntity;
import vn.edu.ctu.saas.control.PaymentTransactionRepository;
import vn.edu.ctu.saas.control.PaymentWebhookEventEntity;
import vn.edu.ctu.saas.control.PaymentWebhookEventRepository;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.provisioning.ProvisioningService;
import vn.edu.ctu.saas.security.TokenHasher;
import vn.edu.ctu.saas.support.TestAppProperties;
import vn.edu.ctu.saas.tenant.TenantRole;
import vn.edu.ctu.saas.tenant.TenantStatus;

class PaymentServiceTest {
    private PaymentProvider provider;
    private PaymentTransactionRepository payments;
    private PaymentWebhookEventRepository events;
    private TenantRepository tenants;
    private TenantMembershipRepository memberships;
    private ProvisioningService provisioning;
    private PaymentIdempotencyLock idempotencyLock;
    private TokenHasher hasher;
    private PaymentService service;

    @BeforeEach
    void setUp() {
        provider = mock(PaymentProvider.class);
        payments = mock(PaymentTransactionRepository.class);
        events = mock(PaymentWebhookEventRepository.class);
        tenants = mock(TenantRepository.class);
        memberships = mock(TenantMembershipRepository.class);
        provisioning = mock(ProvisioningService.class);
        idempotencyLock = mock(PaymentIdempotencyLock.class);
        hasher = new TokenHasher();
        service = new PaymentService(
                provider, payments, events, tenants, memberships, provisioning,
                idempotencyLock, hasher, TestAppProperties.create());
    }

    @Test
    void rejectsIdempotencyKeyReusedForAnotherTenant() {
        UUID userId = UUID.randomUUID();
        UUID requestedTenant = UUID.randomUUID();
        ownerMembership(userId, requestedTenant);

        PaymentTransactionEntity existing = payment(UUID.randomUUID(), UUID.randomUUID(), PaymentStatus.PENDING);
        existing.setIdempotencyKey("payment-key-001");
        existing.setAmountMinor(100_000);
        existing.setCurrency("VND");
        existing.setReturnUrl("http://alpha.localhost:8080/payment");
        when(payments.findByIdempotencyKey("payment-key-001")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.createSession(
                userId, requestedTenant, "payment-key-001", 100_000, "vnd",
                "http://alpha.localhost:8080/payment"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("different payment request");
        verify(provider, never()).createSession(any(), anyLong(), any(), any());
    }

    @Test
    void rejectsOffDomainReturnUrlBeforeCreatingPayment() {
        assertThatThrownBy(() -> service.createSession(
                UUID.randomUUID(), UUID.randomUUID(), "payment-key-002", 100_000, "VND",
                "https://attacker.example/collect"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("configured application domain");
        verify(payments, never()).save(any());
    }

    @Test
    void appliesSuccessfulWebhookOnceAndRecordsEvidence() {
        String body = "signed-body";
        PaymentTransactionEntity payment = payment(UUID.randomUUID(), UUID.randomUUID(), PaymentStatus.PENDING);
        TenantEntity tenant = new TenantEntity();
        tenant.setId(payment.getTenantId());
        tenant.setStatus(TenantStatus.PENDING_PAYMENT);
        when(provider.verifyWebhook(body, Map.of())).thenReturn(
                new PaymentProvider.VerifiedPayment(payment.getProviderReference(), true, "event-001"));
        when(payments.findByProviderReference(payment.getProviderReference())).thenReturn(Optional.of(payment));
        when(events.findByProviderAndProviderEventId("fake", "event-001")).thenReturn(Optional.empty());
        when(tenants.findById(payment.getTenantId())).thenReturn(Optional.of(tenant));

        PaymentService.PaymentResultView result = service.handleWebhook(body, Map.of());

        assertThat(result.duplicate()).isFalse();
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.SUCCEEDED);
        assertThat(tenant.getStatus()).isEqualTo(TenantStatus.PROVISIONING);
        verify(provisioning).enqueue(payment.getTenantId(), "payment:" + payment.getId());
        ArgumentCaptor<PaymentWebhookEventEntity> event = ArgumentCaptor.forClass(PaymentWebhookEventEntity.class);
        verify(events).save(event.capture());
        assertThat(event.getValue().getPayloadSha256()).isEqualTo(hasher.sha256(body));
        assertThat(event.getValue().getOutcome()).isEqualTo("APPLIED_SUCCEEDED");
    }

    @Test
    void duplicateWebhookDoesNotEnqueueProvisioningAgain() {
        String body = "same-signed-body";
        PaymentTransactionEntity payment = payment(UUID.randomUUID(), UUID.randomUUID(), PaymentStatus.SUCCEEDED);
        PaymentWebhookEventEntity prior = new PaymentWebhookEventEntity();
        prior.setPayloadSha256(hasher.sha256(body));
        when(provider.verifyWebhook(body, Map.of())).thenReturn(
                new PaymentProvider.VerifiedPayment(payment.getProviderReference(), true, "event-duplicate"));
        when(payments.findByProviderReference(payment.getProviderReference())).thenReturn(Optional.of(payment));
        when(events.findByProviderAndProviderEventId("fake", "event-duplicate")).thenReturn(Optional.of(prior));

        assertThat(service.handleWebhook(body, Map.of()).duplicate()).isTrue();
        verify(provisioning, never()).enqueue(any(), any());
        verify(events, never()).save(any());
    }

    @Test
    void rejectsEventIdReplayWithChangedPayload() {
        PaymentTransactionEntity payment = payment(UUID.randomUUID(), UUID.randomUUID(), PaymentStatus.PENDING);
        PaymentWebhookEventEntity prior = new PaymentWebhookEventEntity();
        prior.setPayloadSha256(hasher.sha256("original"));
        when(provider.verifyWebhook("changed", Map.of())).thenReturn(
                new PaymentProvider.VerifiedPayment(payment.getProviderReference(), true, "event-reused"));
        when(payments.findByProviderReference(payment.getProviderReference())).thenReturn(Optional.of(payment));
        when(events.findByProviderAndProviderEventId("fake", "event-reused")).thenReturn(Optional.of(prior));

        assertThatThrownBy(() -> service.handleWebhook("changed", Map.of()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("different payload");
        verify(provisioning, never()).enqueue(any(), any());
    }

    private void ownerMembership(UUID userId, UUID tenantId) {
        TenantMembershipEntity membership = new TenantMembershipEntity();
        membership.setUserId(userId);
        membership.setTenantId(tenantId);
        membership.setRole(TenantRole.OWNER);
        membership.setActive(true);
        when(memberships.findByTenantIdAndUserId(tenantId, userId)).thenReturn(Optional.of(membership));
    }

    private PaymentTransactionEntity payment(UUID id, UUID tenantId, PaymentStatus status) {
        PaymentTransactionEntity payment = new PaymentTransactionEntity();
        payment.setId(id);
        payment.setTenantId(tenantId);
        payment.setProvider("fake");
        payment.setProviderReference("reference-" + id);
        payment.setStatus(status);
        payment.setAmountMinor(100_000);
        payment.setCurrency("VND");
        payment.setReturnUrl("http://alpha.localhost:8080/payment");
        return payment;
    }
}
