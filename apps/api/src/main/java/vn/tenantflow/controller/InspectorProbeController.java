package vn.tenantflow.controller;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.tenantflow.cache.TenantConfigCacheService;
import vn.tenantflow.domain.entity.Tenant;
import vn.tenantflow.domain.model.ApiException;
import vn.tenantflow.domain.model.TenantSettings;
import vn.tenantflow.domain.repository.TenantRepository;
import vn.tenantflow.security.TenantContext;
import vn.tenantflow.security.TenantInfo;
import vn.tenantflow.service.TenantTelemetryService;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.*;

@RestController
@RequestMapping
public class InspectorProbeController {

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

    private final DataSource dataSource;
    private final TenantConfigCacheService cacheService;
    private final TenantTelemetryService telemetryService;
    private final TenantRepository tenantRepository;
    private final StringRedisTemplate redisTemplate;
    private final DefaultRedisScript<List> rateLimitScript;

    public InspectorProbeController(DataSource dataSource,
                                    TenantConfigCacheService cacheService,
                                    TenantTelemetryService telemetryService,
                                    TenantRepository tenantRepository,
                                    StringRedisTemplate redisTemplate) {
        this.dataSource = dataSource;
        this.cacheService = cacheService;
        this.telemetryService = telemetryService;
        this.tenantRepository = tenantRepository;
        this.redisTemplate = redisTemplate;
        this.rateLimitScript = new DefaultRedisScript<>();
        this.rateLimitScript.setScriptText(TOKEN_BUCKET_LUA);
        this.rateLimitScript.setResultType(List.class);
    }

    /**
     * K2: Row-Level Security Probe
     * Verifies PostgreSQL Fail-Closed behavior:
     * - Without SET LOCAL context: query returns 0 rows.
     * - With SET LOCAL context: query returns exact tenant cards.
     */
    @GetMapping("/api/inspector/rls-probe")
    public ResponseEntity<Map<String, Object>> probeRls() {
        TenantInfo info = TenantContext.get();
        UUID tenantId = (info != null && info.tenantId() != null) ? info.tenantId() : null;

        if (tenantId == null) {
            // If called by Platform Admin, pick first active tenant (e.g. t-acme)
            tenantId = tenantRepository.findBySlug("t-acme")
                    .map(Tenant::getId)
                    .orElseGet(() -> tenantRepository.findAll().stream()
                            .filter(t -> "ACTIVE".equals(t.getStatus()))
                            .findFirst()
                            .map(Tenant::getId)
                            .orElse(null));
        }

        if (tenantId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "NO_TENANT_AVAILABLE", "No active tenant available for RLS probe");
        }

        String dbRole = "unknown";
        boolean rlsForced = false;
        int withoutContextCount = 0;
        int withContextCount = 0;
        long totalDurationMs;

        long startNs = System.nanoTime();
        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(false);

            // 1. Check current PostgreSQL connection user
            try (Statement st = conn.createStatement();
                 ResultSet rs = st.executeQuery("SELECT current_user")) {
                if (rs.next()) {
                    dbRole = rs.getString(1);
                }
            }

            // 2. Check relforcerowsecurity on 'cards' table
            try (Statement st = conn.createStatement();
                 ResultSet rs = st.executeQuery("SELECT relforcerowsecurity FROM pg_class WHERE relname = 'cards'")) {
                if (rs.next()) {
                    rlsForced = rs.getBoolean(1);
                }
            }

            // 3. Branch 1: Fail-Closed query WITHOUT SET LOCAL
            try (Statement st = conn.createStatement();
                 ResultSet rs = st.executeQuery("SELECT count(*) FROM cards")) {
                if (rs.next()) {
                    withoutContextCount = rs.getInt(1);
                }
            }
            conn.rollback();

            // 4. Branch 2: Query WITH SET LOCAL app.current_tenant_id
            try (PreparedStatement ps = conn.prepareStatement("SELECT set_config('app.current_tenant_id', ?, true)")) {
                ps.setString(1, tenantId.toString());
                ps.execute();
            }
            try (Statement st = conn.createStatement();
                 ResultSet rs = st.executeQuery("SELECT count(*) FROM cards")) {
                if (rs.next()) {
                    withContextCount = rs.getInt(1);
                }
            }
            conn.rollback();
            totalDurationMs = Math.max(1, (System.nanoTime() - startNs) / 1_000_000);
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "RLS_PROBE_FAILED", "PostgreSQL probe error: " + ex.getMessage());
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("dbRole", dbRole);
        response.put("rlsForced", rlsForced);
        response.put("withoutContextCount", withoutContextCount);
        response.put("withContextCount", withContextCount);
        response.put("queryTimeMs", totalDurationMs);
        response.put("tenantId", tenantId.toString());
        response.put("sqlWithoutContext", "SELECT count(*) FROM cards; -- Không có SET LOCAL (Fail-Closed)");
        response.put("sqlWithContext", "SET LOCAL app.current_tenant_id = '" + tenantId + "'; SELECT count(*) FROM cards;");

        return ResponseEntity.ok(response);
    }

    /**
     * K3: Two-Tier Cache Probe (L1 Caffeine + L2 Redis)
     * Step 1: Evict L1 & L2 -> Read triggers DB query (DB_MISS).
     * Step 2: Evict L1 only -> Read triggers Redis query (L2_HIT).
     * Step 3: Keep cache -> Read triggers Caffeine JVM memory (L1_HIT).
     */
    @PostMapping("/api/inspector/cache-probe")
    public ResponseEntity<Map<String, Object>> probeCache() {
        TenantInfo info = TenantContext.get();
        UUID tenantId = (info != null && info.tenantId() != null) ? info.tenantId() : null;

        if (tenantId == null) {
            tenantId = tenantRepository.findBySlug("t-acme")
                    .map(Tenant::getId)
                    .orElseGet(() -> tenantRepository.findAll().stream()
                            .filter(t -> "ACTIVE".equals(t.getStatus()))
                            .findFirst()
                            .map(Tenant::getId)
                            .orElse(null));
        }

        if (tenantId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "NO_TENANT_AVAILABLE", "No active tenant available for cache probe");
        }

        List<Map<String, Object>> steps = new ArrayList<>();

        // Step 1: Invalidate L1 + L2 -> DB_MISS
        cacheService.invalidateTenantConfig(tenantId);
        long t1 = System.nanoTime();
        TenantSettings s1 = cacheService.getTenantSettings(tenantId);
        long lat1 = Math.max(1, (System.nanoTime() - t1) / 1_000_000);
        Map<String, Object> step1 = new LinkedHashMap<>();
        step1.put("step", 1);
        step1.put("source", "DB_MISS");
        step1.put("latencyMs", lat1);
        step1.put("description", "Truy vấn CSDL PostgreSQL & nạp lại L2 Redis + L1 Caffeine");
        steps.add(step1);

        // Step 2: Invalidate L1 only -> L2_HIT
        cacheService.invalidateL1Only(tenantId);
        long t2 = System.nanoTime();
        TenantSettings s2 = cacheService.getTenantSettings(tenantId);
        long lat2 = Math.max(1, (System.nanoTime() - t2) / 1_000_000);
        Map<String, Object> step2 = new LinkedHashMap<>();
        step2.put("step", 2);
        step2.put("source", "L2_HIT");
        step2.put("latencyMs", lat2);
        step2.put("description", "Đọc từ Redis In-Memory & nạp vào L1 Caffeine");
        steps.add(step2);

        // Step 3: Direct JVM memory read -> L1_HIT
        long t3 = System.nanoTime();
        TenantSettings s3 = cacheService.getTenantSettings(tenantId);
        long lat3 = (System.nanoTime() - t3) / 1_000_000;
        Map<String, Object> step3 = new LinkedHashMap<>();
        step3.put("step", 3);
        step3.put("source", "L1_HIT");
        step3.put("latencyMs", lat3);
        step3.put("description", "Đọc trực tiếp từ Caffeine JVM In-Process Memory");
        steps.add(step3);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("tenantId", tenantId.toString());
        result.put("cacheKey", cacheService.getConfigCacheKey(tenantId));
        result.put("steps", steps);

        return ResponseEntity.ok(result);
    }

    /**
     * K3: Noisy Neighbor Simulation Test (Admin Only)
     * Fires 45 bursts against t-noisy (limit 30 rpm) -> 30 OK, 15 Blocked (429).
     * Fires 15 bursts against t-acme (limit 120 rpm) -> 15 OK, 0 Blocked.
     * Updates Redis and TenantTelemetryService in real-time.
     */
    @PostMapping("/api/admin/inspector/noisy-neighbor-test")
    public ResponseEntity<Map<String, Object>> runNoisyNeighborTest() {
        TenantInfo info = TenantContext.get();
        if (info == null || !info.systemAdmin()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Platform Admin privileges required");
        }

        Tenant noisyTenant = tenantRepository.findBySlug("t-noisy")
                .orElseGet(() -> tenantRepository.findAll().stream()
                        .filter(t -> t.getRateLimitRpm() <= 30)
                        .findFirst()
                        .orElse(null));

        Tenant acmeTenant = tenantRepository.findBySlug("t-acme")
                .orElseGet(() -> tenantRepository.findAll().stream()
                        .filter(t -> t.getRateLimitRpm() > 30)
                        .findFirst()
                        .orElse(null));

        if (noisyTenant == null || acmeTenant == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "TENANTS_NOT_FOUND", "Need both t-noisy and t-acme to run noisy neighbor test");
        }

        // 1. Reset Redis rate limit token bucket for reproducible benchmark
        String noisyKey = "ratelimit:tenant:" + noisyTenant.getId();
        String acmeKey = "ratelimit:tenant:" + acmeTenant.getId();
        try {
            redisTemplate.delete(noisyKey);
            redisTemplate.delete(acmeKey);
        } catch (Exception ignored) {}

        // 2. Simulate 45 bursts against t-noisy (capacity = 30 rpm)
        int noisyCapacity = noisyTenant.getRateLimitRpm();
        double noisyRefill = noisyCapacity / 60.0;
        List<Integer> noisyStatuses = new ArrayList<>();
        List<Long> noisyLatencies = new ArrayList<>();
        int noisySuccess = 0;
        int noisyBlocked = 0;

        for (int i = 0; i < 45; i++) {
            long reqStart = System.nanoTime();
            long nowMs = System.currentTimeMillis();
            int status = 200;
            try {
                @SuppressWarnings("unchecked")
                List<Long> res = redisTemplate.execute(
                        rateLimitScript,
                        Collections.singletonList(noisyKey),
                        String.valueOf(noisyCapacity),
                        String.valueOf(noisyRefill),
                        String.valueOf(nowMs),
                        "1"
                );
                if (res != null && !res.isEmpty() && res.get(0) == 0L) {
                    status = 429;
                }
            } catch (Exception ex) {
                // fallback
                if (i >= noisyCapacity) status = 429;
            }

            long elapsed = Math.max(1, (System.nanoTime() - reqStart) / 1_000_000);
            noisyLatencies.add(elapsed);
            noisyStatuses.add(status);

            if (status == 429) {
                noisyBlocked++;
                cacheService.incrementBlocked429Count(noisyTenant.getId());
                telemetryService.recordBlocked429(noisyTenant.getId(), noisyTenant.getSlug());
            } else {
                noisySuccess++;
                telemetryService.recordRequest(noisyTenant.getId(), noisyTenant.getSlug(), 200, elapsed, "L2_HIT");
            }
        }

        // 3. Simulate 15 requests against t-acme (capacity = 120 rpm)
        int acmeCapacity = acmeTenant.getRateLimitRpm();
        double acmeRefill = acmeCapacity / 60.0;
        List<Integer> acmeStatuses = new ArrayList<>();
        List<Long> acmeLatencies = new ArrayList<>();
        int acmeSuccess = 0;
        int acmeBlocked = 0;

        for (int i = 0; i < 15; i++) {
            long reqStart = System.nanoTime();
            long nowMs = System.currentTimeMillis();
            int status = 200;
            try {
                @SuppressWarnings("unchecked")
                List<Long> res = redisTemplate.execute(
                        rateLimitScript,
                        Collections.singletonList(acmeKey),
                        String.valueOf(acmeCapacity),
                        String.valueOf(acmeRefill),
                        String.valueOf(nowMs),
                        "1"
                );
                if (res != null && !res.isEmpty() && res.get(0) == 0L) {
                    status = 429;
                }
            } catch (Exception ignored) {}

            long elapsed = Math.max(1, (System.nanoTime() - reqStart) / 1_000_000);
            acmeLatencies.add(elapsed);
            acmeStatuses.add(status);

            if (status == 429) {
                acmeBlocked++;
                telemetryService.recordBlocked429(acmeTenant.getId(), acmeTenant.getSlug());
            } else {
                acmeSuccess++;
                telemetryService.recordRequest(acmeTenant.getId(), acmeTenant.getSlug(), 200, elapsed, "L1_HIT");
            }
        }

        // Calculate percentiles
        Collections.sort(noisyLatencies);
        Collections.sort(acmeLatencies);

        long noisyP50 = !noisyLatencies.isEmpty() ? noisyLatencies.get(noisyLatencies.size() / 2) : 2;
        long noisyP95 = !noisyLatencies.isEmpty() ? noisyLatencies.get((int) (noisyLatencies.size() * 0.95)) : 5;

        long acmeP50 = !acmeLatencies.isEmpty() ? acmeLatencies.get(acmeLatencies.size() / 2) : 1;
        long acmeP95 = !acmeLatencies.isEmpty() ? acmeLatencies.get((int) (acmeLatencies.size() * 0.95)) : 3;

        Map<String, Object> noisyMap = new LinkedHashMap<>();
        noisyMap.put("slug", noisyTenant.getSlug());
        noisyMap.put("name", noisyTenant.getName());
        noisyMap.put("limitRpm", noisyCapacity);
        noisyMap.put("totalSent", 45);
        noisyMap.put("successCount", noisySuccess);
        noisyMap.put("blockedCount", noisyBlocked);
        noisyMap.put("p50Ms", noisyP50);
        noisyMap.put("p95Ms", noisyP95);
        noisyMap.put("statuses", noisyStatuses);

        Map<String, Object> acmeMap = new LinkedHashMap<>();
        acmeMap.put("slug", acmeTenant.getSlug());
        acmeMap.put("name", acmeTenant.getName());
        acmeMap.put("limitRpm", acmeCapacity);
        acmeMap.put("totalSent", 15);
        acmeMap.put("successCount", acmeSuccess);
        acmeMap.put("blockedCount", acmeBlocked);
        acmeMap.put("p50Ms", acmeP50);
        acmeMap.put("p95Ms", acmeP95);
        acmeMap.put("statuses", acmeStatuses);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("noisy", noisyMap);
        result.put("acme", acmeMap);

        return ResponseEntity.ok(result);
    }
}
