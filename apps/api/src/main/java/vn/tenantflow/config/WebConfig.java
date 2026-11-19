package vn.tenantflow.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import vn.tenantflow.ratelimit.RateLimitFilter;
import vn.tenantflow.security.JwtTenantFilter;

@Configuration
public class WebConfig {

    @Bean
    public FilterRegistrationBean<JwtTenantFilter> jwtTenantFilterRegistration(JwtTenantFilter filter) {
        FilterRegistrationBean<JwtTenantFilter> reg = new FilterRegistrationBean<>(filter);
        reg.addUrlPatterns("/api/*");
        reg.setOrder(1);
        return reg;
    }

    @Bean
    public FilterRegistrationBean<RateLimitFilter> rateLimitFilterRegistration(RateLimitFilter filter) {
        FilterRegistrationBean<RateLimitFilter> reg = new FilterRegistrationBean<>(filter);
        reg.addUrlPatterns("/api/*");
        reg.setOrder(2);
        return reg;
    }
}
