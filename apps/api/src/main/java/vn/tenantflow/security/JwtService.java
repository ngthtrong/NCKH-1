package vn.tenantflow.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;
import vn.tenantflow.config.AppProperties;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey secretKey;
    private final long expirationMs;

    public JwtService(AppProperties properties) {
        this.secretKey = Keys.hmacShaKeyFor(properties.jwt().secret().getBytes(StandardCharsets.UTF_8));
        this.expirationMs = properties.jwt().expirationMs();
    }

    public String generatePreAuthToken(String email, String fullName, boolean systemAdmin) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + expirationMs);
        Map<String, Object> claims = new HashMap<>();
        claims.put("email", email);
        claims.put("full_name", fullName);
        claims.put("system_admin", systemAdmin);
        claims.put("token_type", "PRE_AUTH");

        return Jwts.builder()
                .subject(email)
                .claims(claims)
                .issuedAt(now)
                .expiration(exp)
                .signWith(secretKey, Jwts.SIG.HS256)
                .compact();
    }

    public String generateWorkspaceToken(TenantInfo info) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + expirationMs);
        Map<String, Object> claims = new HashMap<>();
        claims.put("email", info.email());
        claims.put("full_name", info.fullName());
        claims.put("tenant_id", info.tenantId() != null ? info.tenantId().toString() : null);
        claims.put("slug", info.slug());
        claims.put("role", info.role());
        claims.put("tier", info.tier());
        claims.put("system_admin", info.systemAdmin());
        claims.put("token_type", "ACCESS");

        String sub = info.userId() != null ? info.userId().toString() : info.email();
        return Jwts.builder()
                .subject(sub)
                .claims(claims)
                .issuedAt(now)
                .expiration(exp)
                .signWith(secretKey, Jwts.SIG.HS256)
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public TenantInfo toTenantInfo(Claims claims) {
        String tenantIdStr = claims.get("tenant_id", String.class);
        UUID tenantId = tenantIdStr != null ? UUID.fromString(tenantIdStr) : null;
        String sub = claims.getSubject();
        UUID userId = null;
        if (sub != null && sub.length() == 36) {
            try {
                userId = UUID.fromString(sub);
            } catch (IllegalArgumentException ignored) {}
        }
        Boolean sysAdmin = claims.get("system_admin", Boolean.class);
        return new TenantInfo(
                tenantId,
                claims.get("slug", String.class),
                userId,
                claims.get("email", String.class),
                claims.get("full_name", String.class),
                claims.get("role", String.class),
                claims.get("tier", String.class),
                Boolean.TRUE.equals(sysAdmin)
        );
    }
}
