package vn.edu.ctu.saas.security;

import tools.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantStatus;

@Component
public class TenantContextFilter extends OncePerRequestFilter {
    private final TenantRepository tenantRepository;
    private final TenantMembershipRepository membershipRepository;
    private final TenantPlacementRepository placementRepository;
    private final TenantHostResolver hostResolver;
    private final ObjectMapper objectMapper;

    public TenantContextFilter(
            TenantRepository tenantRepository,
            TenantMembershipRepository membershipRepository,
            TenantPlacementRepository placementRepository,
            TenantHostResolver hostResolver,
            ObjectMapper objectMapper) {
        this.tenantRepository = tenantRepository;
        this.membershipRepository = membershipRepository;
        this.placementRepository = placementRepository;
        this.hostResolver = hostResolver;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication instanceof JwtAuthenticationToken jwtAuthentication) {
                Jwt jwt = jwtAuthentication.getToken();
                if ("tenant".equals(jwt.getClaimAsString("kind"))) {
                    establish(jwt, request);
                }
            }
            filterChain.doFilter(request, response);
        } catch (TenantVerificationException exception) {
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getOutputStream(), Map.of(
                    "timestamp", Instant.now().toString(),
                    "status", 403,
                    "code", "TENANT_CONTEXT_REJECTED",
                    "message", exception.getMessage(),
                    "path", request.getRequestURI(),
                    "requestId", String.valueOf(MDC.get("request_id"))));
        } finally {
            TenantContextHolder.clear();
            MDC.remove("tenant_id");
            MDC.remove("tenant_slug");
            MDC.remove("placement");
            MDC.remove("tier");
        }
    }

    private void establish(Jwt jwt, HttpServletRequest request) {
        UUID userId = parseUuid(jwt.getSubject(), "sub");
        UUID tenantId = parseUuid(jwt.getClaimAsString("tid"), "tid");
        String tokenSlug = jwt.getClaimAsString("tenant_slug");
        String hostSlug = hostResolver.resolveTenantSlug(request)
                .orElseThrow(() -> new TenantVerificationException("A tenant subdomain is required"));
        if (!hostSlug.equals(tokenSlug)) {
            throw new TenantVerificationException("Token tenant does not match request host");
        }

        TenantEntity tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new TenantVerificationException("Tenant does not exist"));
        if (!tenant.getSlug().equals(hostSlug) || tenant.getStatus() != TenantStatus.ACTIVE) {
            throw new TenantVerificationException("Tenant is not active for this host");
        }

        TenantMembershipEntity membership = membershipRepository.findByTenantIdAndUserId(tenantId, userId)
                .filter(TenantMembershipEntity::isActive)
                .orElseThrow(() -> new TenantVerificationException("Tenant membership is no longer active"));
        Long tokenVersion = jwt.getClaim("membership_version");
        if (tokenVersion == null || tokenVersion != membership.getSecurityVersion()) {
            throw new TenantVerificationException("Tenant membership changed; sign in again");
        }

        TenantPlacementEntity placement = placementRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new TenantVerificationException("Tenant placement is unavailable"));
        TenantContext context = new TenantContext(
                userId,
                tenantId,
                hostSlug,
                tenant.getTier(),
                placement.getPlacementType(),
                Set.of(membership.getRole()),
                MDC.get("request_id"),
                MDC.get("correlation_id"));
        TenantContextHolder.set(context);
        request.setAttribute(TenantAwareObservationConfiguration.TENANT_ID_ATTRIBUTE, tenantId.toString());
        request.setAttribute(TenantAwareObservationConfiguration.TENANT_TIER_ATTRIBUTE, tenant.getTier());
        request.setAttribute(
                TenantAwareObservationConfiguration.TENANT_PLACEMENT_ATTRIBUTE,
                placement.getPlacementType().name());
        MDC.put("tenant_id", tenantId.toString());
        MDC.put("tenant_slug", hostSlug);
        MDC.put("placement", placement.getPlacementType().name());
        MDC.put("tier", tenant.getTier());
    }

    private UUID parseUuid(String value, String claim) {
        try {
            return UUID.fromString(value);
        } catch (RuntimeException exception) {
            throw new TenantVerificationException("Invalid " + claim + " claim");
        }
    }

    private static class TenantVerificationException extends RuntimeException {
        TenantVerificationException(String message) { super(message); }
    }
}
