package vn.edu.ctu.saas.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.edu.ctu.saas.config.AppProperties;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;

@Component
public class TenantRateLimitFilter extends OncePerRequestFilter {
    private final AppProperties properties;
    private final Map<UUID, Bucket> buckets = new ConcurrentHashMap<>();
    @org.springframework.beans.factory.annotation.Autowired
    private org.springframework.beans.factory.ObjectProvider<org.springframework.data.redis.core.StringRedisTemplate> redis;
    @org.springframework.beans.factory.annotation.Value("${app.redis.enabled:false}")
    private boolean distributed;
    @org.springframework.beans.factory.annotation.Autowired
    private TenantHostResolver hostResolver;

    // Atomic token bucket: Redis server time avoids skew between API processes.
    // The minute quota controls sustained throughput; a 10% burst prevents a full
    // minute of allowed work from flooding the shared executor at a window edge.
    private static final org.springframework.data.redis.core.script.DefaultRedisScript<Long> CONSUME =
            new org.springframework.data.redis.core.script.DefaultRedisScript<>("""
                local clock=redis.call('TIME')
                local now=tonumber(clock[1])+tonumber(clock[2])/1000000
                local rate=tonumber(ARGV[1]); local burst=tonumber(ARGV[2])
                local state=redis.call('HMGET',KEYS[1],'tokens','time')
                local tokens=tonumber(state[1]) or burst
                local last=tonumber(state[2]) or now
                tokens=math.min(burst,tokens+math.max(0,now-last)*rate)
                local allowed=tokens>=1
                if allowed then tokens=tokens-1 end
                redis.call('HSET',KEYS[1],'tokens',tostring(tokens),'time',tostring(now))
                redis.call('EXPIRE',KEYS[1],math.ceil(burst/rate)+60)
                if allowed then return math.floor(tokens) end
                return -math.max(1,math.ceil((1-tokens)/rate*1000))
                """, Long.class);

    public TenantRateLimitFilter(AppProperties properties) {
        this.properties = properties;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        TenantContext context = TenantContextHolder.getNullable();
        UUID tenantId = context == null ? null : context.tenantId();
        String tier = context == null ? null : context.tier();
        // In report mode this filter runs after signature/expiry verification,
        // before TenantContextFilter performs membership and placement SQL.
        var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (tenantId == null && authentication instanceof org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken jwtAuth) {
            var jwt = jwtAuth.getToken();
            if ("tenant".equals(jwt.getClaimAsString("kind"))
                    && hostResolver.resolveTenantSlug(request).filter(slug -> slug.equals(jwt.getClaimAsString("tenant_slug"))).isPresent()) {
                try {
                    tenantId = UUID.fromString(jwt.getClaimAsString("tid"));
                    tier = jwt.getClaimAsString("tier");
                } catch (RuntimeException ignored) { /* Context filter rejects invalid tenant claims. */ }
            }
        }
        if (!properties.rateLimit().enabled() || tenantId == null) {
            filterChain.doFilter(request, response);
            return;
        }
        response.setHeader("X-Tenant-ID", tenantId.toString());
        long capacity = capacityFor(tier);
        if (distributed) {
            long remaining;
            try {
                remaining = redis.getObject().execute(CONSUME,
                        java.util.List.of("tenant:" + tenantId + ":ratelimit:bucket"),
                        Double.toString(capacity / 60.0), Long.toString(Math.max(1, capacity / 10)));
            } catch (org.springframework.dao.DataAccessException exception) {
                response.setStatus(503);
                response.setContentType("application/json");
                response.getWriter().write("{\"code\":\"RATE_LIMIT_UNAVAILABLE\",\"message\":\"Please retry shortly\"}");
                return;
            }
            response.setHeader("X-RateLimit-Limit", Long.toString(capacity));
            response.setHeader("X-RateLimit-Remaining", Long.toString(Math.max(0, remaining)));
            if (remaining < 0) {
                response.setStatus(429);
                response.setHeader("Retry-After", Long.toString(Math.max(1, (-remaining + 999) / 1000)));
                response.setContentType("application/json");
                response.getWriter().write("{\"code\":\"TENANT_RATE_LIMITED\",\"message\":\"Tenant request limit exceeded\"}");
                return;
            }
            filterChain.doFilter(request, response);
            return;
        }
        Bucket bucket = buckets.computeIfAbsent(tenantId, ignored -> Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(capacity)
                        .refillGreedy(capacity, Duration.ofMinutes(1))
                        .build())
                .build());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        response.setHeader("X-RateLimit-Limit", Long.toString(capacity));
        response.setHeader("X-RateLimit-Remaining", Long.toString(probe.getRemainingTokens()));
        if (!probe.isConsumed()) {
            long waitSeconds = Math.max(1, probe.getNanosToWaitForRefill() / 1_000_000_000L);
            response.setStatus(429);
            response.setHeader("Retry-After", Long.toString(waitSeconds));
            response.setContentType("application/json");
            response.getWriter().write("{\"code\":\"TENANT_RATE_LIMITED\",\"message\":\"Tenant request limit exceeded\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private long capacityFor(String tier) {
        long base = properties.rateLimit().requestsPerMinute();
        return switch (tier == null ? "FREE" : tier.toUpperCase()) {
            case "ENTERPRISE" -> base * 10;
            case "PROFESSIONAL" -> base * 5;
            default -> base;
        };
    }
}
