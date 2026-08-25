package vn.edu.ctu.saas.security;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;
import vn.edu.ctu.saas.config.AppProperties;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.UserAccountEntity;

@Service
public class JwtTokenService {
    private final JwtEncoder encoder;
    private final AppProperties properties;

    public JwtTokenService(JwtEncoder encoder, AppProperties properties) {
        this.encoder = encoder;
        this.properties = properties;
    }

    public String globalToken(UserAccountEntity user) {
        Instant now = Instant.now();
        List<String> roles = new ArrayList<>(List.of("USER"));
        if (user.isSystemAdmin()) roles.add("SYSTEM_ADMIN");
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(properties.jwt().issuer())
                .issuedAt(now)
                .expiresAt(now.plus(properties.jwt().globalTtl()))
                .subject(user.getId().toString())
                .claim("kind", "global")
                .claim("email", user.getEmail())
                .claim("roles", roles)
                .id(UUID.randomUUID().toString())
                .build();
        return encode(claims);
    }

    public String tenantToken(
            UserAccountEntity user,
            TenantEntity tenant,
            TenantMembershipEntity membership,
            TenantPlacementEntity placement) {
        Instant now = Instant.now();
        List<String> roles = new ArrayList<>(List.of("USER", "TENANT_" + membership.getRole().name()));
        if (user.isSystemAdmin()) roles.add("SYSTEM_ADMIN");
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(properties.jwt().issuer())
                .issuedAt(now)
                .expiresAt(now.plus(properties.jwt().accessTtl()))
                .subject(user.getId().toString())
                .claim("kind", "tenant")
                .claim("email", user.getEmail())
                .claim("tid", tenant.getId().toString())
                .claim("tenant_slug", tenant.getSlug())
                .claim("tier", tenant.getTier())
                .claim("placement", placement.getPlacementType().name())
                .claim("membership_version", membership.getSecurityVersion())
                .claim("roles", roles)
                .id(UUID.randomUUID().toString())
                .build();
        return encode(claims);
    }

    private String encode(JwtClaimsSet claims) {
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}
