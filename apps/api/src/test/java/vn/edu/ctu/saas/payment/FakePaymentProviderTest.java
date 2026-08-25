package vn.edu.ctu.saas.payment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import vn.edu.ctu.saas.support.TestAppProperties;

class FakePaymentProviderTest {
    private static final String SECRET = "test-payment-webhook-secret";
    private final FakePaymentProvider provider = new FakePaymentProvider(
            JsonMapper.builder().build(), TestAppProperties.create());

    @Test
    void acceptsAuthenticWebhookAndRejectsForgery() throws Exception {
        String body = "{\"reference\":\"pay-1\",\"eventId\":\"evt-1\",\"status\":\"SUCCEEDED\"}";

        PaymentProvider.VerifiedPayment verified = provider.verifyWebhook(
                body, Map.of("x-payment-signature", hmac(body)));

        assertThat(verified.reference()).isEqualTo("pay-1");
        assertThat(verified.eventId()).isEqualTo("evt-1");
        assertThat(verified.successful()).isTrue();
        assertThatThrownBy(() -> provider.verifyWebhook(
                body, Map.of("x-payment-signature", "forged")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("signature");
    }

    @Test
    void reusesProviderReferenceAndPreservesExistingQuery() {
        PaymentProvider.CheckoutSession session = provider.createSession(
                "pay-1", 100_000, "VND", "http://alpha.localhost:8080/payment?source=app");

        assertThat(session.checkoutUrl())
                .isEqualTo("http://alpha.localhost:8080/payment?source=app&payment_reference=pay-1");
    }

    private String hmac(String body) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
    }
}
