package vn.edu.ctu.saas.customization;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import vn.edu.ctu.saas.tenant.TenantPlacement;

class TenantCapabilityPlacementTest {
    @Test
    void poolOnlySupportsBranding() {
        assertThat(supported(TenantPlacement.POOL)).containsExactly(TenantCapability.BRANDING);
    }

    @Test
    void schemaPlacementAddsControlledCustomData() {
        assertThat(supported(TenantPlacement.SCHEMA_PER_TENANT))
                .containsExactlyInAnyOrder(TenantCapability.BRANDING, TenantCapability.CUSTOM_DATA);
    }

    @Test
    void siloSupportsTheCompleteFiniteCapabilitySet() {
        assertThat(supported(TenantPlacement.SILO_DATABASE))
                .containsExactlyInAnyOrder(TenantCapability.values());
    }

    private Set<TenantCapability> supported(TenantPlacement placement) {
        return java.util.Arrays.stream(TenantCapability.values())
                .filter(capability -> TenantCapabilityService.supported(placement, capability))
                .collect(Collectors.toSet());
    }
}
