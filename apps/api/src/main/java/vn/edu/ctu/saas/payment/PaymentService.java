package vn.edu.ctu.saas.payment;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.common.NotFoundException;
import vn.edu.ctu.saas.config.AppProperties;
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
import vn.edu.ctu.saas.tenant.TenantAccessDeniedException;
import vn.edu.ctu.saas.tenant.TenantRole;
import vn.edu.ctu.saas.tenant.TenantStatus;

@Service
public class PaymentService {
    private final PaymentProvider provider;
    private final PaymentTransactionRepository paymentRepository;
    private final PaymentWebhookEventRepository webhookEventRepository;
    private final TenantRepository tenantRepository;
    private final TenantMembershipRepository membershipRepository;
    private final ProvisioningService provisioningService;
    private final PaymentIdempotencyLock idempotencyLock;
    private final TokenHasher tokenHasher;
    private final AppProperties properties;

    public PaymentService(
            PaymentProvider provider,
            PaymentTransactionRepository paymentRepository,
            PaymentWebhookEventRepository webhookEventRepository,
            TenantRepository tenantRepository,
            TenantMembershipRepository membershipRepository,
            ProvisioningService provisioningService,
            PaymentIdempotencyLock idempotencyLock,
            TokenHasher tokenHasher,
            AppProperties properties) {
        this.provider = provider;
        this.paymentRepository = paymentRepository;
        this.webhookEventRepository = webhookEventRepository;
        this.tenantRepository = tenantRepository;
        this.membershipRepository = membershipRepository;
        this.provisioningService = provisioningService;
        this.idempotencyLock = idempotencyLock;
        this.tokenHasher = tokenHasher;
        this.properties = properties;
    }

    @Transactional
    public PaymentSessionView createSession(
            UUID userId, UUID tenantId, String idempotencyKey, long amountMinor, String currency, String returnUrl) {
        String normalizedKey = normalizeIdempotencyKey(idempotencyKey);
        String normalizedCurrency = normalizeCurrency(currency);
        String validatedReturnUrl = validateReturnUrl(returnUrl);
        if (amountMinor <= 0) throw new IllegalArgumentException("Payment amount must be positive");
        requireOwner(userId, tenantId);
        idempotencyLock.acquire(normalizedKey);
        PaymentTransactionEntity payment = paymentRepository.findByIdempotencyKey(normalizedKey).orElse(null);
        if (payment != null) {
            assertSameIdempotentRequest(payment, tenantId, amountMinor, normalizedCurrency, validatedReturnUrl);
        } else {
            TenantEntity tenant = tenantRepository.findById(tenantId)
                    .orElseThrow(() -> new NotFoundException("Tenant not found"));
            if (tenant.getStatus() != TenantStatus.PENDING_PAYMENT) {
                throw new ConflictException("Tenant is not waiting for payment");
            }
            PaymentTransactionEntity entity = new PaymentTransactionEntity();
            entity.setTenantId(tenantId);
            entity.setProvider(provider.name());
            entity.setProviderReference(UUID.randomUUID().toString());
            entity.setIdempotencyKey(normalizedKey);
            entity.setStatus(PaymentStatus.PENDING);
            entity.setAmountMinor(amountMinor);
            entity.setCurrency(normalizedCurrency);
            entity.setReturnUrl(validatedReturnUrl);
            payment = paymentRepository.save(entity);
        }
        PaymentProvider.CheckoutSession checkout = provider.createSession(
                payment.getProviderReference(), payment.getAmountMinor(), payment.getCurrency(), payment.getReturnUrl());
        return new PaymentSessionView(payment.getId(), checkout.provider(), checkout.reference(), checkout.checkoutUrl(), payment.getStatus());
    }

    @Transactional
    public PaymentResultView completeFakeCheckout(UUID userId, UUID tenantId, UUID paymentId) {
        requireOwner(userId, tenantId);
        PaymentTransactionEntity payment = paymentRepository.findById(paymentId)
                .filter(candidate -> candidate.getTenantId().equals(tenantId))
                .orElseThrow(() -> new NotFoundException("Payment not found"));
        if (!(provider instanceof FakePaymentProvider fakeProvider) || !"fake".equals(payment.getProvider())) {
            throw new ConflictException("Local checkout confirmation is only available with the fake payment provider");
        }
        if (payment.getStatus() == PaymentStatus.FAILED || payment.getStatus() == PaymentStatus.EXPIRED) {
            throw new ConflictException("Payment is no longer eligible for local checkout confirmation");
        }
        FakePaymentProvider.SignedWebhook webhook = fakeProvider.successfulCheckout(
                payment.getProviderReference(), payment.getAmountMinor(), payment.getCurrency());
        return handleWebhook(webhook.body(), webhook.headers());
    }

    @Transactional
    public PaymentResultView handleWebhook(String body, Map<String, String> headers) {
        PaymentProvider.VerifiedPayment verified = provider.verifyWebhook(body, headers);
        if (verified.eventId() == null || verified.eventId().isBlank() || verified.eventId().length() > 160) {
            throw new IllegalArgumentException("Invalid payment webhook event id");
        }
        PaymentTransactionEntity payment = paymentRepository.findByProviderReference(verified.reference())
                .orElseThrow(() -> new NotFoundException("Payment reference not found"));
        if (payment.getAmountMinor() != verified.amountMinor()
                || !payment.getCurrency().equals(normalizeCurrency(verified.currency()))) {
            throw new ConflictException("Payment callback amount or currency does not match the transaction");
        }
        String payloadHash = tokenHasher.sha256(body);
        PaymentWebhookEventEntity priorEvent = webhookEventRepository
                .findByProviderAndProviderEventId(payment.getProvider(), verified.eventId())
                .orElse(null);
        if (priorEvent != null) {
            if (!MessageDigestSupport.constantTimeEquals(priorEvent.getPayloadSha256(), payloadHash)) {
                throw new ConflictException("Webhook event id was reused with a different payload");
            }
            return new PaymentResultView(payment.getId(), payment.getTenantId(), payment.getStatus(), true);
        }

        TenantEntity tenant = tenantRepository.findById(payment.getTenantId())
                .orElseThrow(() -> new NotFoundException("Tenant not found"));
        String outcome;
        boolean duplicateState = payment.getStatus() == PaymentStatus.SUCCEEDED;
        if (duplicateState) {
            outcome = "IGNORED_FINAL_STATE";
        } else if (verified.successful()) {
            if (tenant.getStatus() != TenantStatus.PENDING_PAYMENT
                    && tenant.getStatus() != TenantStatus.PROVISIONING) {
                throw new ConflictException("Tenant state does not accept a successful payment callback");
            }
            payment.setStatus(PaymentStatus.SUCCEEDED);
            tenant.setStatus(TenantStatus.PROVISIONING);
            tenantRepository.save(tenant);
            provisioningService.enqueue(tenant.getId(), "payment:" + payment.getId());
            outcome = "APPLIED_SUCCEEDED";
        } else {
            payment.setStatus(PaymentStatus.FAILED);
            outcome = "APPLIED_FAILED";
        }
        paymentRepository.save(payment);

        PaymentWebhookEventEntity event = new PaymentWebhookEventEntity();
        event.setProvider(payment.getProvider());
        event.setProviderEventId(verified.eventId());
        event.setPaymentId(payment.getId());
        event.setPayloadSha256(payloadHash);
        event.setSuccessful(verified.successful());
        event.setOutcome(outcome);
        webhookEventRepository.save(event);
        return new PaymentResultView(payment.getId(), payment.getTenantId(), payment.getStatus(), duplicateState);
    }

    private void assertSameIdempotentRequest(
            PaymentTransactionEntity payment,
            UUID tenantId,
            long amountMinor,
            String currency,
            String returnUrl) {
        if (!payment.getTenantId().equals(tenantId)
                || payment.getAmountMinor() != amountMinor
                || !payment.getCurrency().equals(currency)
                || !Objects.equals(payment.getReturnUrl(), returnUrl)) {
            throw new ConflictException("Idempotency-Key was already used for a different payment request");
        }
    }

    private TenantMembershipEntity requireOwner(UUID userId, UUID tenantId) {
        TenantMembershipEntity membership = membershipRepository.findByTenantIdAndUserId(tenantId, userId)
                .filter(TenantMembershipEntity::isActive)
                .orElseThrow(() -> new NotFoundException("Tenant membership not found"));
        if (membership.getRole() != TenantRole.OWNER) {
            throw new TenantAccessDeniedException("Only the tenant owner can manage onboarding payment");
        }
        return membership;
    }

    private String normalizeIdempotencyKey(String value) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.length() < 8 || normalized.length() > 120) {
            throw new IllegalArgumentException("Idempotency-Key must contain 8 to 120 characters");
        }
        return normalized;
    }

    private String normalizeCurrency(String value) {
        String normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-Z]{3}")) {
            throw new IllegalArgumentException("Currency must be a three-letter ISO code");
        }
        return normalized;
    }

    private String validateReturnUrl(String value) {
        try {
            URI uri = new URI(value == null ? "" : value.trim());
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (!uri.isAbsolute() || host == null || uri.getUserInfo() != null || uri.getFragment() != null) {
                throw new IllegalArgumentException("Return URL must be an absolute URL without credentials or fragment");
            }
            boolean localhost = properties.baseDomain().equalsIgnoreCase("localhost");
            if ((!localhost && !"https".equalsIgnoreCase(scheme))
                    || (localhost && !"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))) {
                throw new IllegalArgumentException("Return URL uses an unsupported scheme");
            }
            String normalizedHost = host.toLowerCase(Locale.ROOT);
            String baseDomain = properties.baseDomain().toLowerCase(Locale.ROOT);
            if (!normalizedHost.equals(baseDomain) && !normalizedHost.endsWith("." + baseDomain)) {
                throw new IllegalArgumentException("Return URL must belong to the configured application domain");
            }
            return uri.toString();
        } catch (URISyntaxException exception) {
            throw new IllegalArgumentException("Return URL is invalid", exception);
        }
    }

    private static final class MessageDigestSupport {
        private MessageDigestSupport() {}

        private static boolean constantTimeEquals(String left, String right) {
            return java.security.MessageDigest.isEqual(
                    left.getBytes(java.nio.charset.StandardCharsets.US_ASCII),
                    right.getBytes(java.nio.charset.StandardCharsets.US_ASCII));
        }
    }

    public record PaymentSessionView(
            UUID paymentId, String provider, String reference, String checkoutUrl, PaymentStatus status) {}
    public record PaymentResultView(UUID paymentId, UUID tenantId, PaymentStatus status, boolean duplicate) {}
}
