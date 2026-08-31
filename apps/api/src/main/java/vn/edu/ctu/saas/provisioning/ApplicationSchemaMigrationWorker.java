package vn.edu.ctu.saas.provisioning;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.tenant.TenantStatus;

/**
 * Upgrades application-plane databases for already-active tenants. Newly
 * provisioned tenants are migrated by {@link TenantDatabaseProvisioner}; this
 * worker closes the upgrade gap for Pool and Silo databases created by an
 * earlier application version.
 */
@Component
@Profile("worker")
public class ApplicationSchemaMigrationWorker {
    private static final Logger log = LoggerFactory.getLogger(ApplicationSchemaMigrationWorker.class);

    private final TenantRepository tenants;
    private final TenantPlacementRepository placements;
    private final TenantDatabaseProvisioner provisioner;

    public ApplicationSchemaMigrationWorker(
            TenantRepository tenants,
            TenantPlacementRepository placements,
            TenantDatabaseProvisioner provisioner) {
        this.tenants = tenants;
        this.placements = placements;
        this.provisioner = provisioner;
    }

    @Scheduled(
            initialDelayString = "${APPLICATION_MIGRATION_INITIAL_DELAY:PT0S}",
            fixedDelayString = "${APPLICATION_MIGRATION_POLL_INTERVAL:PT5M}")
    public void migrateActiveTenants() {
        tenants.findAll().stream()
                .filter(tenant -> tenant.getStatus() == TenantStatus.ACTIVE)
                .forEach(tenant -> placements.findByTenantId(tenant.getId()).ifPresent(placement -> {
                    if (TenantDatabaseProvisioner.LATEST_APPLICATION_SCHEMA_VERSION.equals(
                            placement.getSchemaVersion())) {
                        return;
                    }
                    migrateSafely(tenant, placement);
                }));
    }

    private void migrateSafely(
            vn.edu.ctu.saas.control.TenantEntity tenant,
            TenantPlacementEntity placement) {
        try {
            provisioner.provision(tenant, placement);
            placements.save(placement);
            log.info("Application schema upgraded to {} for active tenant {}",
                    placement.getSchemaVersion(), tenant.getId());
        } catch (RuntimeException failure) {
            log.error("Application schema upgrade failed for active tenant {}", tenant.getId(), failure);
        }
    }
}
