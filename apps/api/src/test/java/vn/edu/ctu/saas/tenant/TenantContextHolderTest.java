package vn.edu.ctu.saas.tenant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class TenantContextHolderTest {
    @AfterEach
    void clearContext() {
        TenantContextHolder.clear();
    }

    @Test
    void requiresAnExplicitContextAndClearsIt() {
        assertThatThrownBy(TenantContextHolder::getRequired)
                .isInstanceOf(MissingTenantContextException.class);

        TenantContext context = new TenantContext(
                UUID.randomUUID(), UUID.randomUUID(), "alpha", "STARTER",
                TenantPlacement.POOL, Set.of(TenantRole.MEMBER), "request", "correlation");
        TenantContextHolder.set(context);

        assertThat(TenantContextHolder.getRequired()).isSameAs(context);
        assertThat(context.hasAnyRole(TenantRole.OWNER, TenantRole.MEMBER)).isTrue();

        TenantContextHolder.clear();
        assertThat(TenantContextHolder.getNullable()).isNull();
    }

    @Test
    void rejectsNullInsteadOfSilentlyDroppingIsolation() {
        assertThatThrownBy(() -> TenantContextHolder.set(null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
