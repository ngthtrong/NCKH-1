package vn.tenantflow.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Jwt jwt, Sysadmin sysadmin) {
    public record Jwt(String secret, long expirationMs) {}
    public record Sysadmin(String email, String password, String fullName) {}
}
