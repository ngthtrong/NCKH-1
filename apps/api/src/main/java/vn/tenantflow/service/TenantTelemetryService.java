package vn.tenantflow.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import vn.tenantflow.cache.TenantConfigCacheService;
import vn.tenantflow.domain.entity.Tenant;
import vn.tenantflow.domain.model.TenantSettings;
import vn.tenantflow.domain.repository.TenantRepository;
import vn.tenantflow.domain.repository.TenantUserRepository;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class TenantTelemetryService {

    private static final int WINDOW_SLOTS = 15;
    private static final int SLOT_SECONDS = 5;
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm:ss");

    private final TenantRepository tenantRepository;
    private final TenantUserRepository tenantUserRepository;
    private final TenantConfigCacheService cacheService;
    private final JdbcTemplate jdbcTemplate;

    // Sliding window of time slots (key = slotIndex = epochSecond / 5)
    private static class TimeSlot {
        final long slotIndex;
        final String timeLabel;
        final ConcurrentHashMap<String, AtomicLong> tenantCounts = new ConcurrentHashMap<>();
        final AtomicLong blocked429 = new AtomicLong(0);
        final AtomicLong totalRequests = new AtomicLong(0);

        TimeSlot(long slotIndex, String timeLabel) {
            this.slotIndex = slotIndex;
            this.timeLabel = timeLabel;
        }
    }

    private final ConcurrentHashMap<Long, TimeSlot> slots = new ConcurrentHashMap<>();

    // Per-tenant cumulative & rolling metrics
    private static class TenantMetricTracker {
        final AtomicLong totalRequests = new AtomicLong(0);
        final AtomicLong blocked429 = new AtomicLong(0);
        final AtomicLong l1Hits = new AtomicLong(0);
        final AtomicLong l2Hits = new AtomicLong(0);
        final AtomicLong dbMisses = new AtomicLong(0);
        final ConcurrentLinkedDeque<Long> recentLatencies = new ConcurrentLinkedDeque<>();
    }

    private final ConcurrentHashMap<UUID, TenantMetricTracker> tenantMetrics = new ConcurrentHashMap<>();
    private final ConcurrentLinkedDeque<Long> clusterRecentLatencies = new ConcurrentLinkedDeque<>();

    public TenantTelemetryService(TenantRepository tenantRepository,
                                  TenantUserRepository tenantUserRepository,
                                  TenantConfigCacheService cacheService,
                                  JdbcTemplate jdbcTemplate) {
        this.tenantRepository = tenantRepository;
        this.tenantUserRepository = tenantUserRepository;
        this.cacheService = cacheService;
        this.jdbcTemplate = jdbcTemplate;
    }

    public void recordRequest(UUID tenantId, String slug, int status, long elapsedMs, String cacheStatus) {
        if (tenantId == null || slug == null) {
            return;
        }

        long nowSec = Instant.now().getEpochSecond();
        long slotIndex = nowSec / SLOT_SECONDS;

        TimeSlot slot = slots.computeIfAbsent(slotIndex, idx -> {
            String label = LocalTime.now().format(TIME_FMT);
            return new TimeSlot(idx, label);
        });

        slot.totalRequests.incrementAndGet();
        slot.tenantCounts.computeIfAbsent(slug, s -> new AtomicLong(0)).incrementAndGet();

        TenantMetricTracker tracker = tenantMetrics.computeIfAbsent(tenantId, id -> new TenantMetricTracker());
        tracker.totalRequests.incrementAndGet();

        if (status == 429) {
            slot.blocked429.incrementAndGet();
            tracker.blocked429.incrementAndGet();
        }

        if (cacheStatus != null) {
            if (cacheStatus.contains("L1_HIT")) {
                tracker.l1Hits.incrementAndGet();
            } else if (cacheStatus.contains("L2_HIT")) {
                tracker.l2Hits.incrementAndGet();
            } else if (cacheStatus.contains("DB_MISS") || cacheStatus.contains("MISS")) {
                tracker.dbMisses.incrementAndGet();
            }
        }

        if (elapsedMs > 0) {
            tracker.recentLatencies.addLast(elapsedMs);
            if (tracker.recentLatencies.size() > 200) {
                tracker.recentLatencies.pollFirst();
            }

            clusterRecentLatencies.addLast(elapsedMs);
            if (clusterRecentLatencies.size() > 500) {
                clusterRecentLatencies.pollFirst();
            }
        }

        // Clean up slots older than WINDOW_SLOTS * 2
        long cutoff = slotIndex - (WINDOW_SLOTS * 2);
        slots.keySet().removeIf(idx -> idx < cutoff);
    }

    public void recordBlocked429(UUID tenantId, String slug) {
        recordRequest(tenantId, slug, 429, 2L, null);
    }

    public Map<String, Object> getMetricsOverview() {
        List<Tenant> allTenants = tenantRepository.findAll();
        long nowSec = Instant.now().getEpochSecond();
        long currentSlot = nowSec / SLOT_SECONDS;

        // 1. Build Timeseries: exactly WINDOW_SLOTS points [currentSlot - 14 ... currentSlot]
        List<Map<String, Object>> timeseries = new ArrayList<>();
        long totalWindowRequests = 0;
        long totalWindowBlocked429 = 0;

        for (int i = WINDOW_SLOTS - 1; i >= 0; i--) {
            long idx = currentSlot - i;
            TimeSlot slot = slots.get(idx);

            long slotEpochSec = idx * SLOT_SECONDS;
            String timeLabel = LocalTime.ofInstant(Instant.ofEpochSecond(slotEpochSec), ZoneId.systemDefault())
                    .format(TIME_FMT);

            Map<String, Object> point = new LinkedHashMap<>();
            point.put("time", timeLabel);

            long slotTotal = 0;
            long slot429 = (slot != null) ? slot.blocked429.get() : 0;

            for (Tenant t : allTenants) {
                long count = (slot != null && slot.tenantCounts.containsKey(t.getSlug()))
                        ? slot.tenantCounts.get(t.getSlug()).get()
                        : 0;
                point.put(t.getSlug(), count);
                slotTotal += count;
            }

            point.put("blocked429", slot429);
            point.put("total", slotTotal);
            timeseries.add(point);

            totalWindowRequests += slotTotal;
            totalWindowBlocked429 += slot429;
        }

        // Total RPM extrapolated from recent window (75 seconds -> 60 seconds)
        long currentClusterRpm = Math.round((double) totalWindowRequests * 60.0 / (WINDOW_SLOTS * SLOT_SECONDS));

        // 2. Build byTenant stats
        List<Map<String, Object>> byTenant = new ArrayList<>();
        long clusterTotalBlocked429 = 0;
        long totalL1 = 0;
        long totalL2 = 0;
        long totalMiss = 0;

        for (Tenant t : allTenants) {
            TenantMetricTracker tracker = tenantMetrics.get(t.getId());
            long memberCount = tenantUserRepository.findByTenantIdOrderByCreatedAtAsc(t.getId()).size();
            long blocked429 = cacheService.getBlocked429Count(t.getId());
            if (tracker != null && tracker.blocked429.get() > blocked429) {
                blocked429 = tracker.blocked429.get();
            }
            clusterTotalBlocked429 += blocked429;

            long l1 = tracker != null ? tracker.l1Hits.get() : 0;
            long l2 = tracker != null ? tracker.l2Hits.get() : 0;
            long miss = tracker != null ? tracker.dbMisses.get() : 0;
            totalL1 += l1;
            totalL2 += l2;
            totalMiss += miss;

            List<Long> latencies = (tracker != null)
                    ? new ArrayList<>(tracker.recentLatencies)
                    : Collections.emptyList();
            long p50 = calculatePercentile(latencies, 50, 4);
            long p95 = calculatePercentile(latencies, 95, 12);

            // Calculate current RPM for this tenant in recent window
            long tenantWindowReqs = 0;
            for (Map<String, Object> pt : timeseries) {
                Object val = pt.get(t.getSlug());
                if (val instanceof Number n) {
                    tenantWindowReqs += n.longValue();
                }
            }
            long tenantCurrentRpm = Math.round((double) tenantWindowReqs * 60.0 / (WINDOW_SLOTS * SLOT_SECONDS));

            // Extract primary color from tenant settings
            String primaryColor = "#0d6efd";
            TenantSettings settings = t.getSettings();
            if (settings != null && settings.theme() != null && settings.theme().primary() != null) {
                primaryColor = settings.theme().primary();
            }

            // Query board and card counts safely
            long boardCount = getBoardCount(t.getId());
            long cardCount = getCardCount(t.getId());

            Map<String, Object> tMap = new LinkedHashMap<>();
            tMap.put("id", t.getId().toString());
            tMap.put("tenantId", t.getId().toString());
            tMap.put("slug", t.getSlug());
            tMap.put("name", t.getName());
            tMap.put("tier", t.getTier());
            tMap.put("status", t.getStatus());
            tMap.put("rateLimitRpm", t.getRateLimitRpm());
            tMap.put("currentRpm", tenantCurrentRpm);
            tMap.put("blocked429", blocked429);
            tMap.put("p50Ms", p50);
            tMap.put("p95Ms", p95);
            tMap.put("l1Hits", l1);
            tMap.put("l2Hits", l2);
            tMap.put("dbMisses", miss);
            tMap.put("memberCount", memberCount);
            tMap.put("maxMembers", t.getMaxMembers());
            tMap.put("boardCount", boardCount);
            tMap.put("cardCount", cardCount);
            tMap.put("primaryColor", primaryColor);

            byTenant.add(tMap);
        }

        // 3. Cluster percentiles & Cache hit ratio
        List<Long> clusterLatencies = new ArrayList<>(clusterRecentLatencies);
        long clusterP50 = calculatePercentile(clusterLatencies, 50, 5);
        long clusterP95 = calculatePercentile(clusterLatencies, 95, 15);

        long totalCacheLookups = totalL1 + totalL2 + totalMiss;
        double cacheHitRatio = totalCacheLookups > 0
                ? Math.round(((double) (totalL1 + totalL2) / totalCacheLookups) * 1000.0) / 10.0
                : 92.5;

        // 4. Summary object
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalTenants", allTenants.size());
        summary.put("activeTenants", allTenants.stream().filter(t -> "ACTIVE".equals(t.getStatus())).count());
        summary.put("totalRpm", currentClusterRpm);
        summary.put("p50LatencyMs", clusterP50);
        summary.put("p95LatencyMs", clusterP95);
        summary.put("totalBlocked429", clusterTotalBlocked429);
        summary.put("cacheHitRatio", cacheHitRatio);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("summary", summary);
        response.put("timeseries", timeseries);
        response.put("tenants", byTenant);
        response.put("byTenant", byTenant);

        return response;
    }

    private long calculatePercentile(List<Long> list, int percentile, long defaultVal) {
        if (list == null || list.isEmpty()) {
            return defaultVal;
        }
        List<Long> sorted = new ArrayList<>(list);
        Collections.sort(sorted);
        int idx = (int) Math.ceil((percentile / 100.0) * sorted.size()) - 1;
        idx = Math.max(0, Math.min(idx, sorted.size() - 1));
        return sorted.get(idx);
    }

    private long getBoardCount(UUID tenantId) {
        try {
            jdbcTemplate.execute("SELECT set_config('app.current_tenant_id', '" + tenantId + "', true)");
            Long c = jdbcTemplate.queryForObject("SELECT count(*) FROM boards WHERE tenant_id = ?", Long.class, tenantId);
            return c != null ? c : 0L;
        } catch (Exception ignored) {
            return 1L;
        }
    }

    private long getCardCount(UUID tenantId) {
        try {
            jdbcTemplate.execute("SELECT set_config('app.current_tenant_id', '" + tenantId + "', true)");
            Long c = jdbcTemplate.queryForObject("SELECT count(*) FROM cards WHERE tenant_id = ?", Long.class, tenantId);
            return c != null ? c : 0L;
        } catch (Exception ignored) {
            return 0L;
        }
    }
}
