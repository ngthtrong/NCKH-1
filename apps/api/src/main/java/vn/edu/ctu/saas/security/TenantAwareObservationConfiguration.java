package vn.edu.ctu.saas.security;

import io.micrometer.common.KeyValues;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.observation.DefaultServerRequestObservationConvention;
import org.springframework.http.server.observation.ServerRequestObservationContext;
import org.springframework.http.server.observation.ServerRequestObservationConvention;

@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class TenantAwareObservationConfiguration {
    public static final String TENANT_ID_ATTRIBUTE = "saas.tenant_id";
    public static final String TENANT_TIER_ATTRIBUTE = "saas.tenant_tier";
    public static final String TENANT_PLACEMENT_ATTRIBUTE = "saas.tenant_placement";

    @Bean
    ServerRequestObservationConvention tenantAwareServerRequestObservationConvention() {
        return new DefaultServerRequestObservationConvention() {
            @Override
            public KeyValues getLowCardinalityKeyValues(ServerRequestObservationContext context) {
                return super.getLowCardinalityKeyValues(context)
                        .and("tenant_id", attribute(context, TENANT_ID_ATTRIBUTE))
                        .and("tenant_tier", attribute(context, TENANT_TIER_ATTRIBUTE))
                        .and("tenant_placement", attribute(context, TENANT_PLACEMENT_ATTRIBUTE));
            }

            private String attribute(ServerRequestObservationContext context, String name) {
                Object value = context.getCarrier().getAttribute(name);
                return value == null ? "none" : value.toString();
            }
        };
    }
}
