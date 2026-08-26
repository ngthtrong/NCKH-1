package vn.edu.ctu.saas.provisioning;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import vn.edu.ctu.saas.config.AppProperties;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.support.TestAppProperties;
import vn.edu.ctu.saas.tenant.TenantPlacement;

class TenantDatabaseProvisionerTest {
    private final AppProperties properties = TestAppProperties.create();
    private final PlacementSecretCipher cipher = new PlacementSecretCipher(properties);
    private final TenantDatabaseProvisioner provisioner = new TenantDatabaseProvisioner(properties, cipher);

    @Test
    void siloPreparationIsDeterministicAndKeepsTheSameRuntimeCredentialAcrossRetries() {
        UUID tenantId = UUID.fromString("12345678-1234-1234-1234-123456789abc");
        TenantEntity tenant = tenant(tenantId);
        TenantPlacementEntity placement = placement(tenantId, TenantPlacement.SILO_DATABASE);

        provisioner.prepare(tenant, placement);
        String encryptedPassword = placement.getEncryptedPassword();

        assertThat(placement.getDatabaseHost()).isEqualTo("localhost");
        assertThat(placement.getDatabasePort()).isEqualTo(5432);
        assertThat(placement.getDatabaseName()).isEqualTo("tenant_12345678123412341234123456789abc");
        assertThat(placement.getDatabaseUsername()).isEqualTo("tenant_12345678123412341234_app");
        assertThat(cipher.decrypt(encryptedPassword)).matches("[0-9a-f]{64}");

        provisioner.prepare(tenant, placement);
        assertThat(placement.getEncryptedPassword()).isEqualTo(encryptedPassword);
    }

    @Test
    void preparationRejectsPlacementMetadataThatPointsAtAnotherDatabase() {
        UUID tenantId = UUID.randomUUID();
        TenantPlacementEntity placement = placement(tenantId, TenantPlacement.SILO_DATABASE);
        placement.setDatabaseName("tenant_from_another_claim");

        assertThatThrownBy(() -> provisioner.prepare(tenant(tenantId), placement))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("database name");
    }

    @Test
    void poolPreparationUsesTheConfiguredSharedDatabaseWithoutGeneratingACredential() {
        UUID tenantId = UUID.randomUUID();
        TenantPlacementEntity placement = placement(tenantId, TenantPlacement.POOL);

        provisioner.prepare(tenant(tenantId), placement);

        assertThat(placement.getDatabaseName()).isEqualTo("pool_db");
        assertThat(placement.getEncryptedPassword()).isNull();
    }

    private TenantEntity tenant(UUID tenantId) {
        TenantEntity tenant = new TenantEntity();
        tenant.setId(tenantId);
        return tenant;
    }

    private TenantPlacementEntity placement(UUID tenantId, TenantPlacement type) {
        TenantPlacementEntity placement = new TenantPlacementEntity();
        placement.setTenantId(tenantId);
        placement.setPlacementType(type);
        return placement;
    }
}
