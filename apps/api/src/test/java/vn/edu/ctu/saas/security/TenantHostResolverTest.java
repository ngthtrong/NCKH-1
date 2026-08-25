package vn.edu.ctu.saas.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import vn.edu.ctu.saas.support.TestAppProperties;

class TenantHostResolverTest {
    private final TenantHostResolver resolver = new TenantHostResolver(TestAppProperties.create());

    @Test
    void resolvesOnlyASingleTenantLabel() {
        assertThat(resolve("alpha.localhost")).contains("alpha");
        assertThat(resolve("accounts.localhost")).isEmpty();
        assertThat(resolve("nested.alpha.localhost")).isEmpty();
        assertThat(resolve("localhost")).isEmpty();
        assertThat(resolve("alpha.example.test")).isEmpty();
    }

    @Test
    void preservesDevelopmentPortInTransferUrl() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setScheme("http");
        request.setServerPort(8080);

        assertThat(resolver.tenantUrl("alpha", request)).isEqualTo("http://alpha.localhost:8080");
    }

    private java.util.Optional<String> resolve(String host) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setServerName(host);
        return resolver.resolveTenantSlug(request);
    }
}
