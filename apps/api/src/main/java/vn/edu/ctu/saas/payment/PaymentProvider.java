package vn.edu.ctu.saas.payment;

import java.util.Map;

public interface PaymentProvider {
    String name();
    CheckoutSession createSession(String reference, long amountMinor, String currency, String returnUrl);
    VerifiedPayment verifyWebhook(String rawBody, Map<String, String> headers);

    record CheckoutSession(String provider, String reference, String checkoutUrl) {}
    record VerifiedPayment(
            String reference,
            boolean successful,
            String eventId,
            long amountMinor,
            String currency) {}
}
