package vn.edu.ctu.saas.support;

import java.time.Duration;
import vn.edu.ctu.saas.config.AppProperties;

public final class TestAppProperties {
    private TestAppProperties() {}

    public static AppProperties create() {
        return new AppProperties(
                "localhost",
                "accounts",
                new AppProperties.Jwt("test-jwt-secret-test-jwt-secret", "test", Duration.ofMinutes(15), Duration.ofMinutes(15), Duration.ofDays(7)),
                new AppProperties.Datasource(
                        new AppProperties.Datasource.Pool("jdbc:postgresql://localhost/pool_db", "pool_app", "pool-secret", 10),
                        new AppProperties.Datasource.Silo(2, Duration.ofMinutes(10), 10)),
                new AppProperties.Provisioning(
                        "jdbc:postgresql://localhost/postgres", "provisioner", "provisioner-secret",
                        "test-placement-encryption-key", 3, Duration.ofMinutes(10)),
                new AppProperties.Payment("fake", "test-payment-webhook-secret"),
                new AppProperties.Storage(
                        "filesystem", "http://localhost:9000", "http://localhost:9000",
                        "access", "secret", "resources", ".data/test-resources", "test-signing-secret"),
                new AppProperties.RateLimit(true, 120),
                new AppProperties.Seed(false, "owner@example.test", "ChangeMe123!"));
    }
}
