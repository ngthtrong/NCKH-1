package vn.tenantflow.cache;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import vn.tenantflow.config.RedisConfig;
import vn.tenantflow.domain.entity.Tenant;
import vn.tenantflow.domain.model.ApiException;
import vn.tenantflow.domain.model.TenantSettings;
import vn.tenantflow.domain.repository.TenantRepository;
import org.springframework.http.HttpStatus;

import java.time.Duration;
import java.util.UUID;

@Service
public class TenantConfigCacheService {

    private static final Logger log = LoggerFactory.getLogger(TenantConfigCacheService.class);

    private final Cache<UUID, TenantSettings> l1ConfigCache = Caffeine.newBuilder()
            .maximumSize(2000)
            .expireAfterWrite(Duration.ofMinutes(5))
            .build();

    private final StringRedisTemplate redisTemplate;
    private final TenantRepository tenantRepository;
    private final ObjectMapper objectMapper;

    public TenantConfigCacheService(StringRedisTemplate redisTemplate,
                                    TenantRepository tenantRepository,
                                    ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.tenantRepository = tenantRepository;
        this.objectMapper = objectMapper;
    }

    public TenantSettings getTenantSettings(UUID tenantId) {
        // 1. L1 Caffeine
        TenantSettings cached = l1ConfigCache.getIfPresent(tenantId);
        if (cached != null) {
            return cached;
        }

        // 2. L2 Redis
        String redisKey = configKey(tenantId);
        try {
            String json = redisTemplate.opsForValue().get(redisKey);
            if (json != null) {
                TenantSettings fromRedis = objectMapper.readValue(json, TenantSettings.class);
                l1ConfigCache.put(tenantId, fromRedis);
                return fromRedis;
            }
        } catch (Exception ex) {
            log.warn("Redis L2 read failed for {}: {}", redisKey, ex.getMessage());
        }

        // 3. Database fallback
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND", "Tenant not found"));
        TenantSettings settings = tenant.getSettings() != null ? tenant.getSettings() : TenantSettings.defaults();

        // Populate L2 & L1
        try {
            redisTemplate.opsForValue().set(redisKey, objectMapper.writeValueAsString(settings), Duration.ofMinutes(15));
        } catch (Exception ex) {
            log.warn("Redis L2 write failed for {}: {}", redisKey, ex.getMessage());
        }
        l1ConfigCache.put(tenantId, settings);
        return settings;
    }

    public void invalidateTenantConfig(UUID tenantId) {
        l1ConfigCache.invalidate(tenantId);
        try {
            redisTemplate.delete(configKey(tenantId));
            redisTemplate.convertAndSend(RedisConfig.CONFIG_INVALIDATE_CHANNEL, tenantId.toString());
        } catch (Exception ex) {
            log.warn("Failed to publish config invalidation for {}: {}", tenantId, ex.getMessage());
        }
    }

    public void onConfigInvalidateMessage(String tenantIdStr) {
        try {
            UUID tenantId = UUID.fromString(tenantIdStr.replace("\"", "").trim());
            l1ConfigCache.invalidate(tenantId);
            log.debug("Evicted L1 Caffeine config cache for tenant {}", tenantId);
        } catch (Exception ex) {
            log.warn("Invalid Pub/Sub invalidation payload: {}", tenantIdStr);
        }
    }

    public String getCachedBoardJson(UUID tenantId, UUID boardId) {
        try {
            return redisTemplate.opsForValue().get(boardKey(tenantId, boardId));
        } catch (Exception ex) {
            return null;
        }
    }

    public void putCachedBoardJson(UUID tenantId, UUID boardId, Object payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            redisTemplate.opsForValue().set(boardKey(tenantId, boardId), json, Duration.ofMinutes(5));
        } catch (JsonProcessingException ignored) {
        } catch (Exception ex) {
            log.warn("Redis L2 board cache write failed: {}", ex.getMessage());
        }
    }

    public void evictBoardCache(UUID tenantId, UUID boardId) {
        try {
            redisTemplate.delete(boardKey(tenantId, boardId));
        } catch (Exception ignored) {}
    }

    private String configKey(UUID tenantId) {
        return "tenant:" + tenantId + ":config";
    }

    private String boardKey(UUID tenantId, UUID boardId) {
        return "tenant:" + tenantId + ":board:" + boardId;
    }
}
