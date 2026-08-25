package vn.edu.ctu.saas.provisioning;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import vn.edu.ctu.saas.support.TestAppProperties;

class PlacementSecretCipherTest {
    private final PlacementSecretCipher cipher = new PlacementSecretCipher(TestAppProperties.create());

    @Test
    void encryptsWithRandomNonceAndAuthenticatesCiphertext() {
        String first = cipher.encrypt("database-password");
        String second = cipher.encrypt("database-password");

        assertThat(first).isNotEqualTo(second);
        assertThat(cipher.decrypt(first)).isEqualTo("database-password");

        char replacement = first.charAt(first.length() - 2) == 'A' ? 'B' : 'A';
        String tampered = first.substring(0, first.length() - 2) + replacement + first.substring(first.length() - 1);
        assertThatThrownBy(() -> cipher.decrypt(tampered))
                .isInstanceOf(IllegalStateException.class);
    }
}
