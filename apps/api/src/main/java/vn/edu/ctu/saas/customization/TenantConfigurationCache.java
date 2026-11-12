package vn.edu.ctu.saas.customization;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Component;

@Component
public class TenantConfigurationCache {
    public static final String CHANNEL = "tenant:config:invalidate";
    private final Cache<String, String> local = Caffeine.newBuilder()
            .maximumSize(2000).expireAfterWrite(Duration.ofSeconds(30)).recordStats().build();
    private final ObjectProvider<StringRedisTemplate> redis;
    private final boolean enabled;
    @Value("${app.cache.enabled:true}")
    private boolean cacheEnabled = true;
    @org.springframework.beans.factory.annotation.Autowired(required=false)
    private io.micrometer.core.instrument.MeterRegistry metrics;

    public TenantConfigurationCache(ObjectProvider<StringRedisTemplate> redis,
            @Value("${app.redis.enabled:false}") boolean enabled) {
        this.redis = redis;
        this.enabled = enabled;
    }

    // Including the persisted version prevents an in-flight old read from serving stale settings.
    public String get(UUID tenantId, long version, Supplier<String> loader) {
        return get(tenantId, "config", version, loader);
    }

    public String get(UUID tenantId, String resource, long version, Supplier<String> loader) {
        if (!cacheEnabled) return loader.get();
        String key = "tenant:" + tenantId + ":" + resource + ":" + version;
        String found = local.getIfPresent(key);
        if (found != null) { record("l1", "hit"); return found; }
        record("l1", "miss");
        if (enabled) {
            try {
                found = redis.getObject().opsForValue().get(key);
                if (found != null) { record("l2", "hit"); local.put(key, found); return found; }
                record("l2", "miss");
            } catch (org.springframework.dao.DataAccessException ignored) {
                // A cache outage may fall back to the authoritative database.
            }
        }
        String loaded = loader.get();
        if (enabled) {
            try { redis.getObject().opsForValue().set(key, loaded, Duration.ofMinutes(2)); }
            catch (org.springframework.dao.DataAccessException ignored) { /* Database remains authoritative. */ }
        }
        local.put(key, loaded);
        return loaded;
    }

    private void record(String layer, String result) {
        if (metrics != null) metrics.counter("tenant_cache_requests", "layer", layer, "result", result).increment();
    }

    public void invalidate(UUID tenantId) {
        invalidateLocal(tenantId.toString());
        if (enabled) {
            try { redis.getObject().convertAndSend(CHANNEL, tenantId.toString()); }
            catch (org.springframework.dao.DataAccessException ignored) { /* Versioned keys prevent stale reads. */ }
        }
    }

    void invalidateLocal(String tenantId) {
        String prefix = "tenant:" + tenantId + ":config:";
        local.asMap().keySet().removeIf(key -> key.startsWith(prefix));
    }

    @Configuration
    static class ListenerConfiguration {
        @Bean
        @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="app.redis.enabled", havingValue="true")
        RedisMessageListenerContainer tenantInvalidationListener(RedisConnectionFactory factory,
                TenantConfigurationCache cache) {
            var container = new RedisMessageListenerContainer();
            container.setConnectionFactory(factory);
            container.addMessageListener((message, pattern) -> cache.invalidateLocal(
                    new String(message.getBody(), java.nio.charset.StandardCharsets.UTF_8)), new ChannelTopic(CHANNEL));
            return container;
        }
    }
}
