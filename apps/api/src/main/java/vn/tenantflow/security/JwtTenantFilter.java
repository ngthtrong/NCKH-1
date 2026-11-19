package vn.tenantflow.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.tenantflow.domain.entity.Tenant;
import vn.tenantflow.domain.repository.TenantRepository;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
public class JwtTenantFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final TenantRepository tenantRepository;

    public JwtTenantFilter(JwtService jwtService, TenantRepository tenantRepository) {
        this.jwtService = jwtService;
        this.tenantRepository = tenantRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();

        // Public endpoints
        if (path.equals("/api/auth/login") || path.equals("/api/health") || path.startsWith("/actuator")) {
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED, "Missing or invalid Authorization Bearer token");
            return;
        }

        String token = authHeader.substring(7).trim();
        Claims claims;
        try {
            claims = jwtService.parseToken(token);
        } catch (Exception ex) {
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired JWT token");
            return;
        }

        String tokenType = claims.get("token_type", String.class);
        TenantInfo info = jwtService.toTenantInfo(claims);

        // Allow /api/auth/switch-workspace and /api/auth/me with PRE_AUTH or ACCESS token
        if (path.equals("/api/auth/switch-workspace") || path.equals("/api/auth/me")) {
            try {
                TenantContext.set(info);
                filterChain.doFilter(request, response);
            } finally {
                TenantContext.clear();
                MDC.remove("tenant_id");
            }
            return;
        }

        if (!"ACCESS".equals(tokenType)) {
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED, "Workspace access token required");
            return;
        }

        // Control Plane: System Admin endpoints
        if (path.startsWith("/api/admin/")) {
            if (!info.systemAdmin()) {
                sendError(response, HttpServletResponse.SC_FORBIDDEN, "System Admin privileges required");
                return;
            }
            try {
                TenantContext.set(info);
                MDC.put("tenant_id", "SYSTEM_ADMIN");
                filterChain.doFilter(request, response);
            } finally {
                TenantContext.clear();
                MDC.remove("tenant_id");
            }
            return;
        }

        // Tenant-scoped endpoints: require tenantId + slug
        if (info.tenantId() == null || info.slug() == null) {
            sendError(response, HttpServletResponse.SC_FORBIDDEN, "Tenant context missing in JWT");
            return;
        }

        // K1: Extract subdomain from Host header and cross-check with JWT.slug
        String hostSubdomain = extractSubdomain(request.getHeader("Host"));
        if (hostSubdomain != null && !hostSubdomain.equalsIgnoreCase(info.slug())) {
            sendError(response, HttpServletResponse.SC_FORBIDDEN,
                    "Subdomain mismatch: Host subdomain '" + hostSubdomain + "' does not match JWT slug '" + info.slug() + "'");
            return;
        }

        // Check tenant status (ACTIVE vs SUSPENDED)
        Tenant tenant = tenantRepository.findById(info.tenantId()).orElse(null);
        if (tenant == null || !"ACTIVE".equals(tenant.getStatus())) {
            sendError(response, HttpServletResponse.SC_FORBIDDEN, "Tenant organization is suspended or unavailable");
            return;
        }

        try {
            TenantContext.set(info);
            MDC.put("tenant_id", info.tenantId().toString());
            response.setHeader("X-Tenant-ID", info.tenantId().toString());
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
            MDC.remove("tenant_id");
        }
    }

    /**
     * Extracts tenant slug from Host header such as:
     * - t-acme.localhost:8080 -> t-acme
     * - t-lotus.tenantflow.vn -> t-lotus
     * Returns null for bare localhost, 127.0.0.1, or internal docker hostnames (e.g. kanban-api:8080).
     */
    private String extractSubdomain(String hostHeader) {
        if (hostHeader == null || hostHeader.isBlank()) {
            return null;
        }
        String host = hostHeader.split(":")[0].trim().toLowerCase();
        if (host.equals("localhost") || host.equals("127.0.0.1") || host.equals("kanban-api")) {
            return null;
        }
        if (host.endsWith(".localhost")) {
            String sub = host.substring(0, host.length() - ".localhost".length());
            return sub.isBlank() ? null : sub;
        }
        String[] parts = host.split("\\.");
        if (parts.length >= 3) {
            return parts[0];
        }
        return null;
    }

    private void sendError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"error\":\"" + message.replace("\"", "\\\"") + "\"}");
    }
}
