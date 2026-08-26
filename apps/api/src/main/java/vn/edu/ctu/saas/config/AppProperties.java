package vn.edu.ctu.saas.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String baseDomain,
        String accountsSubdomain,
        Jwt jwt,
        Datasource datasource,
        Provisioning provisioning,
        Payment payment,
        Storage storage,
        RateLimit rateLimit,
        Seed seed) {

    public record Jwt(String secret, String issuer, Duration accessTtl, Duration globalTtl, Duration refreshTtl) {}

    public record Datasource(Pool pool, Silo silo) {
        public record Pool(String jdbcUrl, String username, String password, int maximumPoolSize) {}
        public record Silo(int maximumPoolSize, Duration idleTimeout, int globalConnectionCap) {}
    }

    public record Provisioning(
            String adminUrl,
            String adminUsername,
            String adminPassword,
            String encryptionKey,
            int maxAttempts,
            Duration leaseDuration) {}

    public record Payment(String provider, String webhookSecret) {}

    public record Storage(
            String type,
            String endpoint,
            String publicEndpoint,
            String accessKey,
            String secretKey,
            String bucket,
            String filesystemRoot,
            String signingSecret) {}

    public record RateLimit(boolean enabled, long requestsPerMinute) {}

    public record Seed(boolean enabled, String ownerEmail, String ownerPassword) {}
}
