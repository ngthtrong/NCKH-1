package vn.tenantflow.ratelimit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.tenantflow.cache.TenantConfigCacheService;
import vn.tenantflow.security.TenantContext;
import vn.tenantflow.security.TenantInfo;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final String TOKEN_BUCKET_LUA = """
            local key = KEYS[1]
            local capacity = tonumber(ARGV[1])
            local refill_rate = tonumber(ARGV[2])
            local now_ms = tonumber(ARGV[3])
            local requested = tonumber(ARGV[4])

            local data = redis.call('HMGET', key, 'tokens', 'last_refill')
            local tokens = tonumber(data[1])
            local last_refill = tonumber(data[2])

            if tokens == nil then
                tokens = capacity
                last_refill = now_ms
            else
                local elapsed = math.max(0, (now_ms - last_refill) / 1000.0)
                tokens = math.min(capacity, tokens + elapsed * refill_rate)
                last_refill = now_ms
            end

            local allowed = 0
            if tokens >= requested then
                tokens = tokens - requested
                allowed = 1
            end

            redis.call('HMSET', key, 'tokens', tokens, 'last_refill', last_refill)
            redis.call('EXPIRE', key, 120)
            return { allowed, math.floor(tokens) }
            """;

    private final StringRedisTemplate redisTemplate;
    private final TenantConfigCacheService cacheService;
    private final DefaultRedisScript<List> rateLimitScript;

    public RateLimitFilter(StringRedisTemplate redisTemplate, TenantConfigCacheService cacheService) {
        this.redisTemplate = redisTemplate;
        this.cacheService = cacheService;
        this.rateLimitScript = new DefaultRedisScript<>();
        this.rateLimitScript.setScriptText(TOKEN_BUCKET_LUA);
        this.rateLimitScript.setResultType(List.class);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        TenantInfo info = TenantContext.get();
        if (info == null || info.tenantId() == null) {
            filterChain.doFilter(request, response);
            return;
        }

        int capacity = cacheService.getRateLimitRpm(info.tenantId());
        double refillRate = capacity / 60.0;
        String key = "ratelimit:tenant:" + info.tenantId();
        long nowMs = System.currentTimeMillis();

        try {
            @SuppressWarnings("unchecked")
            List<Long> result = redisTemplate.execute(
                    rateLimitScript,
                    Collections.singletonList(key),
                    String.valueOf(capacity),
                    String.valueOf(refillRate),
                    String.valueOf(nowMs),
                    "1"
            );

            if (result != null && result.size() >= 2) {
                long allowed = result.get(0);
                long remaining = result.get(1);
                response.setHeader("X-RateLimit-Limit", String.valueOf(capacity));
                response.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, remaining)));
                if (allowed == 0L) {
                    cacheService.incrementBlocked429Count(info.tenantId());
                    response.setStatus(429);
                    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.getWriter().write(
                            "{\"error\":\"Rate limit exceeded (" + capacity + " req/min) for tenant " + info.slug() + "\",\"code\":\"RATE_LIMIT_EXCEEDED\"}"
                    );
                    return;
                }
            }
        } catch (Exception ignored) {
            // Fail-open on Redis transient error
        }

        filterChain.doFilter(request, response);
    }
}
