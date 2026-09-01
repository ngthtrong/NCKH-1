package vn.edu.ctu.saas.payment;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import vn.edu.ctu.saas.config.AppProperties;

@Component
@ConditionalOnProperty(name = "app.payment.provider", havingValue = "fake", matchIfMissing = true)
public class FakePaymentProvider implements PaymentProvider {
    private final ObjectMapper objectMapper;
    private final byte[] secret;

    public FakePaymentProvider(ObjectMapper objectMapper, AppProperties properties) {
        this.objectMapper = objectMapper;
        this.secret = properties.payment().webhookSecret().getBytes(StandardCharsets.UTF_8);
    }

    @Override
    public String name() {
        return "fake";
    }

    @Override
    public CheckoutSession createSession(String reference, long amountMinor, String currency, String returnUrl) {
        String separator = returnUrl.contains("?") ? "&" : "?";
        return new CheckoutSession("fake", reference, returnUrl + separator + "payment_reference=" + reference);
    }

    @Override
    public VerifiedPayment verifyWebhook(String rawBody, Map<String, String> headers) {
        String supplied = headers.getOrDefault("x-payment-signature", "");
        String expected = hmac(rawBody);
        if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII), supplied.getBytes(StandardCharsets.US_ASCII))) {
            throw new IllegalArgumentException("Invalid payment webhook signature");
        }
        try {
            JsonNode payload = objectMapper.readTree(rawBody);
            String reference = payload.path("reference").asText();
            String eventId = payload.path("eventId").asText();
            long amountMinor = payload.path("amountMinor").asLong(-1);
            String currency = payload.path("currency").asText();
            if (reference.isBlank() || eventId.isBlank() || amountMinor <= 0 || !currency.matches("[A-Z]{3}")) {
                throw new IllegalArgumentException("Invalid payment webhook body");
            }
            return new VerifiedPayment(
                    reference,
                    "SUCCEEDED".equals(payload.path("status").asText()),
                    eventId,
                    amountMinor,
                    currency);
        } catch (Exception exception) {
            if (exception instanceof IllegalArgumentException illegal) throw illegal;
            throw new IllegalArgumentException("Invalid payment webhook body", exception);
        }
    }

    public SignedWebhook successfulCheckout(String reference, long amountMinor, String currency) {
        if (reference == null || reference.isBlank()) {
            throw new IllegalArgumentException("Payment reference is required");
        }
        if (amountMinor <= 0 || currency == null || !currency.matches("[A-Z]{3}")) {
            throw new IllegalArgumentException("Payment amount and currency are invalid");
        }
        try {
            String body = objectMapper.writeValueAsString(Map.of(
                    "reference", reference,
                    "eventId", "local-checkout-" + reference,
                    "status", "SUCCEEDED",
                    "amountMinor", amountMinor,
                    "currency", currency));
            return new SignedWebhook(body, Map.of("x-payment-signature", hmac(body)));
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot create the local payment callback", exception);
        }
    }

    private String hmac(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Cannot verify webhook", exception);
        }
    }

    public record SignedWebhook(String body, Map<String, String> headers) {}
}
