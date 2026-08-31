package vn.edu.ctu.saas.provisioning;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import vn.edu.ctu.saas.config.AppProperties;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.provisioning.TenantDatabaseProvisioner.ProvisioningStage;
import vn.edu.ctu.saas.tenant.TenantPlacement;

/**
 * Separate JVM entry point used by the crash-recovery integration test. It
 * executes the production provisioner and deliberately waits at a confirmed
 * external-work boundary so the parent test can kill the operating-system
 * process rather than throwing an in-process test exception.
 */
final class ProvisioningCrashProcess {
    private static final String ENV_PREFIX = "NCKH_PROVISIONING_CRASH_";

    private ProvisioningCrashProcess() {}

    public static void main(String[] arguments) throws Exception {
        if (arguments.length != 2) {
            throw new IllegalArgumentException("Expected provisioning stage and marker path");
        }
        ProvisioningStage crashStage = ProvisioningStage.valueOf(arguments[0]);
        Path marker = Path.of(arguments[1]);
        AppProperties properties = propertiesFromEnvironment();
        UUID tenantId = UUID.fromString(requiredEnvironment("TENANT_ID"));

        TenantEntity tenant = new TenantEntity();
        tenant.setId(tenantId);
        TenantPlacementEntity placement = new TenantPlacementEntity();
        placement.setTenantId(tenantId);
        placement.setPlacementType(TenantPlacement.SILO_DATABASE);
        placement.setEncryptedPassword(requiredEnvironment("ENCRYPTED_PASSWORD"));

        TenantDatabaseProvisioner provisioner = new TenantDatabaseProvisioner(
                properties,
                new PlacementSecretCipher(properties),
                (stage, ignoredTenant, ignoredPlacement) -> {
                    if (stage != crashStage) return;
                    signalAndAwaitKill(marker, stage);
                });
        provisioner.provision(tenant, placement);
        throw new IllegalStateException("Provisioner returned before the configured crash checkpoint");
    }

    private static AppProperties propertiesFromEnvironment() {
        AppProperties baseline = vn.edu.ctu.saas.support.TestAppProperties.create();
        String adminUrl = requiredEnvironment("ADMIN_URL");
        String username = requiredEnvironment("ADMIN_USERNAME");
        String password = requiredEnvironment("ADMIN_PASSWORD");
        return new AppProperties(
                baseline.baseDomain(),
                baseline.accountsSubdomain(),
                baseline.jwt(),
                new AppProperties.Datasource(
                        new AppProperties.Datasource.Pool(adminUrl, username, password, 2),
                        baseline.datasource().silo()),
                new AppProperties.Provisioning(
                        adminUrl,
                        username,
                        password,
                        requiredEnvironment("ENCRYPTION_KEY"),
                        3,
                        Duration.ofSeconds(5)),
                baseline.payment(),
                baseline.storage(),
                baseline.rateLimit(),
                baseline.seed());
    }

    private static String requiredEnvironment(String suffix) {
        String value = System.getenv(ENV_PREFIX + suffix);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing crash-test environment " + suffix);
        }
        return value;
    }

    private static void signalAndAwaitKill(Path marker, ProvisioningStage stage) {
        try {
            Files.writeString(marker, stage.name(), StandardOpenOption.CREATE_NEW);
            new CountDownLatch(1).await();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Crash process was interrupted instead of killed", exception);
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot signal provisioning crash checkpoint", exception);
        }
    }
}
