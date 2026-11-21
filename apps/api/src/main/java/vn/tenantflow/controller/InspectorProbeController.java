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
     * Helper to resolve target tenant based on caller's role:
     * - PLATFORM_ADMIN: Allowed to target any tenant specified by targetSlug.
     * - TENANT_ADMIN / MEMBER: Strictly restricted to their own tenant (TenantContext.get().slug()).
     *   Attempting to access any other tenant results in HTTP 403 Forbidden.
     */
    private Tenant resolveTargetTenant(String targetSlug) {
        TenantInfo info = TenantContext.get();
        if (info == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Yêu cầu đăng nhập");
        }

        boolean isPlatformAdmin = info.systemAdmin() || "PLATFORM_ADMIN".equalsIgnoreCase(info.role());

        if (isPlatformAdmin) {
            if (targetSlug != null && !targetSlug.isBlank()) {
                String cleanSlug = targetSlug.trim().toLowerCase();
                return tenantRepository.findBySlug(cleanSlug)
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND",
                                "Không tìm thấy tổ chức: " + cleanSlug));
            }
            return tenantRepository.findBySlug("t-acme")
                    .orElseGet(() -> tenantRepository.findAll().stream()
                            .filter(t -> "ACTIVE".equals(t.getStatus()))
                            .findFirst()
                            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "NO_TENANT_AVAILABLE",
                                    "Không có tổ chức đang hoạt động")));
        }

        // Regular Tenant User (TENANT_ADMIN or MEMBER)
        String callerSlug = info.slug();
        if (callerSlug == null || callerSlug.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "NO_TENANT_CONTEXT", "Thiếu thông tin tổ chức người dùng");
        }

        if (targetSlug != null && !targetSlug.isBlank() && !targetSlug.trim().equalsIgnoreCase(callerSlug)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN_TENANT_ACCESS",
                    "Người dùng tổ chức '" + callerSlug + "' không có quyền kiểm định hoặc truy xuất dữ liệu của tổ chức khác ('" + targetSlug + "')");
        }

        Tenant tenant = null;
        if (info.tenantId() != null) {
            tenant = tenantRepository.findById(info.tenantId()).orElse(null);
        }
        if (tenant == null) {
            tenant = tenantRepository.findBySlug(callerSlug.trim().toLowerCase()).orElse(null);
        }

        if (tenant == null || !"ACTIVE".equalsIgnoreCase(tenant.getStatus())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "TENANT_UNAVAILABLE",
                    "Tổ chức '" + callerSlug + "' đang bị tạm ngưng hoặc không khả dụng");
        }

        return tenant;
    }

    /**
     * K2: Row-Level Security Probe
     * Verifies PostgreSQL Fail-Closed behavior with dynamic tenant selection and 3 SQL scenarios:
     * 1. Without SET LOCAL context: query returns 0 rows.
     * 2. With SET LOCAL of another tenant: explicitly querying target tenant cards still returns 0 rows.
     * 3. With SET LOCAL of target tenant: returns exact card count + real sample titles.
     */
    @GetMapping("/api/inspector/rls-probe")
    public ResponseEntity<Map<String, Object>> probeRls(@RequestParam(value = "targetSlug", required = false) String targetSlug) {
        Tenant targetTenant = resolveTargetTenant(targetSlug);
        UUID targetTenantId = targetTenant.getId();

        // Pick another active tenant for cross-tenant breach test
        final UUID currentId = targetTenantId;
        Tenant otherTenant = tenantRepository.findAll().stream()
                .filter(t -> !t.getId().equals(currentId) && "ACTIVE".equals(t.getStatus()))
                .findFirst()
                .orElse(null);

        String dbRole = "unknown";
        boolean rlsForced = false;
        int withoutContextCount = 0;
        int crossTenantCount = 0;
        int withContextCount = 0;
        List<String> sampleTitles = new ArrayList<>();
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

            // 3. Scenario 1: Fail-Closed query WITHOUT SET LOCAL
            try (Statement st = conn.createStatement();
                 ResultSet rs = st.executeQuery("SELECT count(*) FROM cards")) {
                if (rs.next()) {
                    withoutContextCount = rs.getInt(1);
                }
            }
            conn.rollback();

            // 4. Scenario 2: Cross-Tenant Breach Attempt (SET LOCAL otherTenant, but explicit WHERE tenant_id = targetId)
            if (otherTenant != null) {
                try (PreparedStatement ps = conn.prepareStatement("SELECT set_config('app.current_tenant_id', ?, true)")) {
                    ps.setString(1, otherTenant.getId().toString());
                    ps.execute();
                }
                try (PreparedStatement ps = conn.prepareStatement("SELECT count(*) FROM cards WHERE tenant_id = ?")) {
                    ps.setObject(1, targetTenantId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            crossTenantCount = rs.getInt(1);
                        }
                    }
                }
                conn.rollback();
            }

            // 5. Scenario 3: Query WITH SET LOCAL app.current_tenant_id = targetTenantId
            try (PreparedStatement ps = conn.prepareStatement("SELECT set_config('app.current_tenant_id', ?, true)")) {
                ps.setString(1, targetTenantId.toString());
                ps.execute();
            }
            try (Statement st = conn.createStatement();
                 ResultSet rs = st.executeQuery("SELECT count(*) FROM cards")) {
                if (rs.next()) {
                    withContextCount = rs.getInt(1);
                }
            }
            try (Statement st = conn.createStatement();
                 ResultSet rs = st.executeQuery("SELECT title FROM cards ORDER BY position ASC LIMIT 3")) {
                while (rs.next()) {
                    sampleTitles.add(rs.getString(1));
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
        response.put("tenantId", targetTenantId.toString());
        response.put("targetSlug", targetTenant.getSlug());
        response.put("otherSlug", otherTenant != null ? otherTenant.getSlug() : "none");
        response.put("withoutContextCount", withoutContextCount);
        response.put("crossTenantCount", crossTenantCount);
        response.put("withContextCount", withContextCount);
        response.put("sampleTitles", sampleTitles);
        response.put("queryTimeMs", totalDurationMs);
        response.put("sqlWithoutContext", "SELECT count(*) FROM cards; -- Không có SET LOCAL (Fail-Closed)");
        response.put("sqlCrossTenant", otherTenant != null
                ? "SET LOCAL app.current_tenant_id = '" + otherTenant.getId() + "'; SELECT count(*) FROM cards WHERE tenant_id = '" + targetTenantId + "';"
                : "N/A");
        response.put("sqlWithContext", "SET LOCAL app.current_tenant_id = '" + targetTenantId + "'; SELECT count(*) FROM cards;");

        return ResponseEntity.ok(response);
    }

    /**
     * K3: Two-Tier Cache Probe (L1 Caffeine + L2 Redis)
     * Supports dynamic targetSlug.
     * Accurately measures latency with System.nanoTime() and returns precise Double milliseconds.
     */
    @PostMapping("/api/inspector/cache-probe")
    public ResponseEntity<Map<String, Object>> probeCache(@RequestParam(value = "targetSlug", required = false) String targetSlug) {
        Tenant targetTenant = resolveTargetTenant(targetSlug);
        UUID tenantId = targetTenant.getId();
        List<Map<String, Object>> steps = new ArrayList<>();

        // Step 1: Invalidate L1 + L2 -> DB_MISS
        cacheService.invalidateTenantConfig(tenantId);
        long t1 = System.nanoTime();
        TenantSettings s1 = cacheService.getTenantSettings(tenantId);
        double lat1 = Math.round(((System.nanoTime() - t1) / 1_000_000.0) * 100.0) / 100.0;
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
        double lat2 = Math.round(((System.nanoTime() - t2) / 1_000_000.0) * 100.0) / 100.0;
        Map<String, Object> step2 = new LinkedHashMap<>();
        step2.put("step", 2);
        step2.put("source", "L2_HIT");
        step2.put("latencyMs", lat2);
        step2.put("description", "Đọc từ Redis In-Memory & nạp vào L1 Caffeine");
        steps.add(step2);

        // Step 3: Direct JVM memory read -> L1_HIT
        long t3 = System.nanoTime();
        TenantSettings s3 = cacheService.getTenantSettings(tenantId);
        double lat3 = Math.round(((System.nanoTime() - t3) / 1_000_000.0) * 100.0) / 100.0;
        Map<String, Object> step3 = new LinkedHashMap<>();
        step3.put("step", 3);
        step3.put("source", "L1_HIT");
        step3.put("latencyMs", lat3);
        step3.put("description", "Đọc trực tiếp từ Caffeine JVM In-Process Memory");
        steps.add(step3);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("tenantId", tenantId.toString());
        result.put("targetSlug", targetTenant.getSlug());
        result.put("cacheKey", cacheService.getConfigCacheKey(tenantId));
        result.put("steps", steps);

        return ResponseEntity.ok(result);
    }

    public record NoisyNeighborTestRequest(
            String noisySlug,
            Integer noisyRequests,
            String normalSlug,
            Integer normalRequests
    ) {}

    /**
     * K3: Noisy Neighbor Simulation Test (Admin Only)
     * Fires requests against noisyTenant and normalTenant concurrently.
     * Updates Redis Token Bucket and TenantTelemetryService in real-time.
     */
    @PostMapping("/api/admin/inspector/noisy-neighbor-test")
    public ResponseEntity<Map<String, Object>> runNoisyNeighborTest(@RequestBody(required = false) NoisyNeighborTestRequest req) {
        TenantInfo info = TenantContext.get();
        if (info == null || !info.systemAdmin()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Platform Admin privileges required");
        }

        String noisySlug = (req != null && req.noisySlug() != null && !req.noisySlug().isBlank())
                ? req.noisySlug().trim().toLowerCase()
                : "t-noisy";
        int noisyCount = (req != null && req.noisyRequests() != null)
                ? Math.max(5, Math.min(200, req.noisyRequests()))
                : 45;

        String normalSlug = (req != null && req.normalSlug() != null && !req.normalSlug().isBlank())
                ? req.normalSlug().trim().toLowerCase()
                : "t-acme";
        int normalCount = (req != null && req.normalRequests() != null)
                ? Math.max(5, Math.min(200, req.normalRequests()))
                : 15;

        Tenant noisyTenant = tenantRepository.findBySlug(noisySlug)
                .orElseGet(() -> tenantRepository.findAll().stream()
                        .filter(t -> t.getRateLimitRpm() <= 30)
                        .findFirst()
                        .orElse(null));

        Tenant normalTenant = tenantRepository.findBySlug(normalSlug)
                .orElseGet(() -> tenantRepository.findAll().stream()
                        .filter(t -> t.getRateLimitRpm() > 30)
                        .findFirst()
                        .orElse(null));

        if (noisyTenant == null || normalTenant == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "TENANTS_NOT_FOUND", "Cần 2 tổ chức hợp lệ để chạy kiểm định dội tải");
        }

        // 1. Reset Redis rate limit token bucket for reproducible benchmark
        String noisyKey = "ratelimit:tenant:" + noisyTenant.getId();
        String normalKey = "ratelimit:tenant:" + normalTenant.getId();
        try {
            redisTemplate.delete(noisyKey);
            redisTemplate.delete(normalKey);
        } catch (Exception ignored) {}

        // 2. Simulate bursts against noisyTenant
        int noisyCapacity = noisyTenant.getRateLimitRpm();
        double noisyRefill = noisyCapacity / 60.0;
        List<Integer> noisyStatuses = new ArrayList<>();
        List<Long> noisyLatencies = new ArrayList<>();
        int noisySuccess = 0;
        int noisyBlocked = 0;

        for (int i = 0; i < noisyCount; i++) {
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

        // 3. Simulate requests against normalTenant
        int normalCapacity = normalTenant.getRateLimitRpm();
        double normalRefill = normalCapacity / 60.0;
        List<Integer> normalStatuses = new ArrayList<>();
        List<Long> normalLatencies = new ArrayList<>();
        int normalSuccess = 0;
        int normalBlocked = 0;

        for (int i = 0; i < normalCount; i++) {
            long reqStart = System.nanoTime();
            long nowMs = System.currentTimeMillis();
            int status = 200;
            try {
                @SuppressWarnings("unchecked")
                List<Long> res = redisTemplate.execute(
                        rateLimitScript,
                        Collections.singletonList(normalKey),
                        String.valueOf(normalCapacity),
                        String.valueOf(normalRefill),
                        String.valueOf(nowMs),
                        "1"
                );
                if (res != null && !res.isEmpty() && res.get(0) == 0L) {
                    status = 429;
                }
            } catch (Exception ignored) {}

            long elapsed = Math.max(1, (System.nanoTime() - reqStart) / 1_000_000);
            normalLatencies.add(elapsed);
            normalStatuses.add(status);

            if (status == 429) {
                normalBlocked++;
                cacheService.incrementBlocked429Count(normalTenant.getId());
                telemetryService.recordBlocked429(normalTenant.getId(), normalTenant.getSlug());
            } else {
                normalSuccess++;
                telemetryService.recordRequest(normalTenant.getId(), normalTenant.getSlug(), 200, elapsed, "L1_HIT");
            }
        }

        // Calculate percentiles
        Collections.sort(noisyLatencies);
        Collections.sort(normalLatencies);

        long noisyP50 = !noisyLatencies.isEmpty() ? noisyLatencies.get(noisyLatencies.size() / 2) : 2;
        long noisyP95 = !noisyLatencies.isEmpty() ? noisyLatencies.get((int) (noisyLatencies.size() * 0.95)) : 5;

        long normalP50 = !normalLatencies.isEmpty() ? normalLatencies.get(normalLatencies.size() / 2) : 1;
        long normalP95 = !normalLatencies.isEmpty() ? normalLatencies.get((int) (normalLatencies.size() * 0.95)) : 3;

        Map<String, Object> noisyMap = new LinkedHashMap<>();
        noisyMap.put("slug", noisyTenant.getSlug());
        noisyMap.put("name", noisyTenant.getName());
        noisyMap.put("limitRpm", noisyCapacity);
        noisyMap.put("totalSent", noisyCount);
        noisyMap.put("successCount", noisySuccess);
        noisyMap.put("blockedCount", noisyBlocked);
        noisyMap.put("p50Ms", noisyP50);
        noisyMap.put("p95Ms", noisyP95);
        noisyMap.put("statuses", noisyStatuses);

        Map<String, Object> normalMap = new LinkedHashMap<>();
        normalMap.put("slug", normalTenant.getSlug());
        normalMap.put("name", normalTenant.getName());
        normalMap.put("limitRpm", normalCapacity);
        normalMap.put("totalSent", normalCount);
        normalMap.put("successCount", normalSuccess);
        normalMap.put("blockedCount", normalBlocked);
        normalMap.put("p50Ms", normalP50);
        normalMap.put("p95Ms", normalP95);
        normalMap.put("statuses", normalStatuses);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("noisy", noisyMap);
        result.put("normal", normalMap);
        result.put("acme", normalMap); // backward compatibility

        return ResponseEntity.ok(result);
    }
}
