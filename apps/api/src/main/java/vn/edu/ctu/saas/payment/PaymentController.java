package vn.edu.ctu.saas.payment;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class PaymentController {
    private final PaymentService paymentService;
    private final OnboardingService onboardingService;

    public PaymentController(PaymentService paymentService, OnboardingService onboardingService) {
        this.paymentService = paymentService;
        this.onboardingService = onboardingService;
    }

    @GetMapping("/tenants/{tenantId}/onboarding")
    public OnboardingService.OnboardingView onboarding(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID tenantId) {
        return onboardingService.status(UUID.fromString(jwt.getSubject()), tenantId);
    }

    @PostMapping("/tenants/{tenantId}/payment-session")
    public PaymentService.PaymentSessionView createSession(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID tenantId,
            @RequestHeader("Idempotency-Key") @Size(min = 8, max = 120) String idempotencyKey,
            @Valid @RequestBody CreatePaymentRequest request) {
        return paymentService.createSession(
                UUID.fromString(jwt.getSubject()), tenantId, idempotencyKey,
                request.amountMinor(), request.currency(), request.returnUrl());
    }

    @PostMapping("/payments/webhooks/fake")
    public PaymentService.PaymentResultView fakeWebhook(
            @RequestBody String body,
            @RequestHeader HttpHeaders headers) {
        String signature = headers.getFirst("X-Payment-Signature");
        Map<String, String> normalized = Map.of(
                "x-payment-signature", signature == null ? "" : signature);
        return paymentService.handleWebhook(body, normalized);
    }

    @PostMapping("/tenants/{tenantId}/payments/{paymentId}/fake-complete")
    public PaymentService.PaymentResultView completeFakeCheckout(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID tenantId,
            @PathVariable UUID paymentId) {
        return paymentService.completeFakeCheckout(UUID.fromString(jwt.getSubject()), tenantId, paymentId);
    }

    public record CreatePaymentRequest(
            @Positive long amountMinor,
            @NotBlank @Pattern(regexp = "[A-Za-z]{3}") String currency,
            @NotBlank String returnUrl) {}
}
