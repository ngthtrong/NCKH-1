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
    private final Map<UUID, CachedDataSource> isolatedDataSources = new ConcurrentHashMap<>();

    public DefaultTenantDataSourceResolver(
            TenantPlacementRepository placementRepository,
            PlacementSecretCipher cipher,
            AppProperties properties) {
        this.placementRepository = placementRepository;
        this.cipher = cipher;
        this.properties = properties;
        AppProperties.Datasource.Pool pool = properties.datasource().pool();
        this.poolDataSource = build("pool-application", pool.jdbcUrl(), pool.username(), pool.password(),
                pool.maximumPoolSize(), properties.datasource().silo().idleTimeout());
    }

    @Override
    public DataSource resolve(TenantContext context) {
        if (context.placement() == TenantPlacement.POOL) {
            return poolDataSource;
        }
        CachedDataSource cached = isolatedDataSources.compute(context.tenantId(), (tenantId, existing) -> {
            if (existing != null && !existing.dataSource().isClosed()) {
                return existing.touch();
            }
            enforceGlobalCap(context.placement());
            TenantPlacementEntity placement = placementRepository.findByTenantId(tenantId)
                    .orElseThrow(() -> new NotFoundException("Tenant placement not found"));
            if (placement.getPlacementType() != context.placement()) {
                throw new IllegalStateException("Tenant placement does not match the authenticated context");
            }
            if (placement.getDatabaseName() == null || placement.getDatabaseUsername() == null
                    || placement.getEncryptedPassword() == null) {
                throw new IllegalStateException("Tenant data placement has not been provisioned");
            }
            String host = placement.getDatabaseHost() == null ? "localhost" : placement.getDatabaseHost();
            int port = placement.getDatabasePort() == null ? 5432 : placement.getDatabasePort();
            String url = "jdbc:postgresql://" + host + ":" + port + "/" + placement.getDatabaseName();
            HikariDataSource dataSource = build(
                    context.placement().name().toLowerCase() + "-" + tenantId,
                    url,
                    placement.getDatabaseUsername(),
                    cipher.decrypt(placement.getEncryptedPassword()),
                    maximumPoolSize(context.placement()), idleTimeout(context.placement()));
            return new CachedDataSource(dataSource, context.placement(), Instant.now());
        });
        return cached.dataSource();
    }

    @Override
    public String schemaName(TenantContext context) {
        if (context.placement() != TenantPlacement.SCHEMA_PER_TENANT) return "public";
        TenantPlacementEntity placement = placementRepository.findByTenantId(context.tenantId())
                .orElseThrow(() -> new NotFoundException("Tenant placement not found"));
        if (placement.getPlacementType() != context.placement()
                || placement.getSchemaName() == null
                || !placement.getSchemaName().matches("[a-z_][a-z0-9_]{0,62}")) {
            throw new IllegalStateException("Tenant schema placement has not been provisioned");
        }
        return placement.getSchemaName();
    }

    private HikariDataSource build(
            String name, String url, String username, String password, int maxPoolSize, Duration idleTimeout) {
        HikariConfig config = new HikariConfig();
        config.setPoolName(name);
        config.setJdbcUrl(url);
        config.setUsername(username);
        config.setPassword(password);
        config.setMaximumPoolSize(maxPoolSize);
        config.setMinimumIdle(0);
        config.setConnectionTimeout(5_000);
        config.setIdleTimeout(Math.max(30_000, idleTimeout.toMillis()));
        config.setMaxLifetime(30 * 60_000);
        return new HikariDataSource(config);
    }

    private void enforceGlobalCap(TenantPlacement placement) {
        int maxCached = Math.max(1, globalConnectionCap(placement) / Math.max(1, maximumPoolSize(placement)));
        while (isolatedDataSources.values().stream().filter(value -> value.placement() == placement).count() >= maxCached) {
            UUID oldest = isolatedDataSources.entrySet().stream()
                    .filter(entry -> entry.getValue().placement() == placement)
                    .min(Comparator.comparing(entry -> entry.getValue().lastUsed()))
                    .map(Map.Entry::getKey).orElse(null);
            if (oldest == null) return;
            evict(oldest);
        }
    }

    @Scheduled(fixedDelayString = "PT1M")
    public void evictIdleDataSources() {
        isolatedDataSources.entrySet().stream()
                .filter(entry -> entry.getValue().lastUsed().isBefore(
                        Instant.now().minus(idleTimeout(entry.getValue().placement()))))
                .map(Map.Entry::getKey)
                .toList()
                .forEach(this::evict);
    }

    @Override
    public void evict(UUID tenantId) {
        CachedDataSource removed = isolatedDataSources.remove(tenantId);
        if (removed != null) removed.dataSource().close();
    }

    @PreDestroy
    void close() {
        isolatedDataSources.values().forEach(cached -> cached.dataSource().close());
        poolDataSource.close();
    }

    private int maximumPoolSize(TenantPlacement placement) {
        return placement == TenantPlacement.SCHEMA_PER_TENANT
                ? properties.datasource().schema().maximumPoolSize()
                : properties.datasource().silo().maximumPoolSize();
    }

    private int globalConnectionCap(TenantPlacement placement) {
        return placement == TenantPlacement.SCHEMA_PER_TENANT
                ? properties.datasource().schema().globalConnectionCap()
                : properties.datasource().silo().globalConnectionCap();
    }

    private Duration idleTimeout(TenantPlacement placement) {
        return placement == TenantPlacement.SCHEMA_PER_TENANT
                ? properties.datasource().schema().idleTimeout()
                : properties.datasource().silo().idleTimeout();
    }

    private record CachedDataSource(
            HikariDataSource dataSource, TenantPlacement placement, Instant lastUsed) {
        CachedDataSource touch() { return new CachedDataSource(dataSource, placement, Instant.now()); }
    }
}
