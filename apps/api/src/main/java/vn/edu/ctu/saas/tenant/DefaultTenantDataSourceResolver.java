package vn.edu.ctu.saas.tenant;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import javax.sql.DataSource;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import vn.edu.ctu.saas.common.NotFoundException;
import vn.edu.ctu.saas.config.AppProperties;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.provisioning.PlacementSecretCipher;

@Component
public class DefaultTenantDataSourceResolver implements TenantDataSourceResolver {
    private final TenantPlacementRepository placementRepository;
    private final PlacementSecretCipher cipher;
    private final AppProperties properties;
    private final HikariDataSource poolDataSource;
    private final Map<UUID, CachedDataSource> siloDataSources = new ConcurrentHashMap<>();

    public DefaultTenantDataSourceResolver(
            TenantPlacementRepository placementRepository,
            PlacementSecretCipher cipher,
            AppProperties properties) {
        this.placementRepository = placementRepository;
        this.cipher = cipher;
        this.properties = properties;
        AppProperties.Datasource.Pool pool = properties.datasource().pool();
        this.poolDataSource = build("pool-application", pool.jdbcUrl(), pool.username(), pool.password(), pool.maximumPoolSize());
    }

    @Override
    public DataSource resolve(TenantContext context) {
        if (context.placement() == TenantPlacement.POOL) {
            return poolDataSource;
        }
        CachedDataSource cached = siloDataSources.compute(context.tenantId(), (tenantId, existing) -> {
            if (existing != null && !existing.dataSource().isClosed()) {
                return existing.touch();
            }
            enforceGlobalCap();
            TenantPlacementEntity placement = placementRepository.findByTenantId(tenantId)
                    .orElseThrow(() -> new NotFoundException("Tenant placement not found"));
            if (placement.getDatabaseName() == null || placement.getDatabaseUsername() == null
                    || placement.getEncryptedPassword() == null) {
                throw new IllegalStateException("Silo tenant has not been provisioned");
            }
            String host = placement.getDatabaseHost() == null ? "localhost" : placement.getDatabaseHost();
            int port = placement.getDatabasePort() == null ? 5432 : placement.getDatabasePort();
            String url = "jdbc:postgresql://" + host + ":" + port + "/" + placement.getDatabaseName();
            HikariDataSource dataSource = build(
                    "silo-" + tenantId,
                    url,
                    placement.getDatabaseUsername(),
                    cipher.decrypt(placement.getEncryptedPassword()),
                    properties.datasource().silo().maximumPoolSize());
            return new CachedDataSource(dataSource, Instant.now());
        });
        return cached.dataSource();
    }

    private HikariDataSource build(String name, String url, String username, String password, int maxPoolSize) {
        HikariConfig config = new HikariConfig();
        config.setPoolName(name);
        config.setJdbcUrl(url);
        config.setUsername(username);
        config.setPassword(password);
        config.setMaximumPoolSize(maxPoolSize);
        config.setMinimumIdle(0);
        config.setConnectionTimeout(5_000);
        config.setIdleTimeout(Math.max(30_000, properties.datasource().silo().idleTimeout().toMillis()));
        config.setMaxLifetime(30 * 60_000);
        return new HikariDataSource(config);
    }

    private void enforceGlobalCap() {
        int perTenant = Math.max(1, properties.datasource().silo().maximumPoolSize());
        int maxCached = Math.max(1, properties.datasource().silo().globalConnectionCap() / perTenant);
        if (siloDataSources.size() < maxCached) return;
        siloDataSources.entrySet().stream()
                .min(Comparator.comparing(entry -> entry.getValue().lastUsed()))
                .ifPresent(entry -> evict(entry.getKey()));
    }

    @Scheduled(fixedDelayString = "PT1M")
    public void evictIdleDataSources() {
        Duration idleTimeout = properties.datasource().silo().idleTimeout();
        Instant cutoff = Instant.now().minus(idleTimeout);
        siloDataSources.entrySet().stream()
                .filter(entry -> entry.getValue().lastUsed().isBefore(cutoff))
                .map(Map.Entry::getKey)
                .toList()
                .forEach(this::evict);
    }

    @Override
    public void evict(UUID tenantId) {
        CachedDataSource removed = siloDataSources.remove(tenantId);
        if (removed != null) removed.dataSource().close();
    }

    @PreDestroy
    void close() {
        siloDataSources.values().forEach(cached -> cached.dataSource().close());
        poolDataSource.close();
    }

    private record CachedDataSource(HikariDataSource dataSource, Instant lastUsed) {
        CachedDataSource touch() { return new CachedDataSource(dataSource, Instant.now()); }
    }
}

