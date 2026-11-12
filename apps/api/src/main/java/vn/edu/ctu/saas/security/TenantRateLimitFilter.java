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

    private static final org.springframework.data.redis.core.script.DefaultRedisScript<Long> INCREMENT =
            new org.springframework.data.redis.core.script.DefaultRedisScript<>(
                    "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n", Long.class);

    public TenantRateLimitFilter(AppProperties properties) {
        this.properties = properties;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        TenantContext context = TenantContextHolder.getNullable();
        if (!properties.rateLimit().enabled() || context == null) {
            filterChain.doFilter(request, response);
            return;
        }
        long capacity = capacityFor(context.tier());
        if (distributed) {
            long window = java.time.Instant.now().getEpochSecond() / 60;
            long used;
            try {
                used = redis.getObject().execute(INCREMENT,
                        java.util.List.of("tenant:" + context.tenantId() + ":ratelimit:" + window), "120");
            } catch (org.springframework.dao.DataAccessException exception) {
                response.setStatus(503);
                response.setContentType("application/json");
                response.getWriter().write("{\"code\":\"RATE_LIMIT_UNAVAILABLE\",\"message\":\"Please retry shortly\"}");
                return;
            }
            response.setHeader("X-RateLimit-Limit", Long.toString(capacity));
            response.setHeader("X-RateLimit-Remaining", Long.toString(Math.max(0, capacity - used)));
            if (used > capacity) {
                response.setStatus(429);
                response.setHeader("Retry-After", Long.toString(60 - java.time.Instant.now().getEpochSecond() % 60));
                response.setContentType("application/json");
                response.getWriter().write("{\"code\":\"TENANT_RATE_LIMITED\",\"message\":\"Tenant request limit exceeded\"}");
                return;
            }
            filterChain.doFilter(request, response);
            return;
        }
        Bucket bucket = buckets.computeIfAbsent(context.tenantId(), ignored -> Bucket.builder()
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
