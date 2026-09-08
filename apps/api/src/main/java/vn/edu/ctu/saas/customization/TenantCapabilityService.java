package vn.edu.ctu.saas.customization;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.common.NotFoundException;
import vn.edu.ctu.saas.control.TenantCapabilityEntity;
import vn.edu.ctu.saas.control.TenantCapabilityRepository;
import vn.edu.ctu.saas.control.TenantConfigEventEntity;
import vn.edu.ctu.saas.control.TenantConfigEventRepository;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.provisioning.TenantDatabaseProvisioner;
import vn.edu.ctu.saas.tenant.TenantAccessDeniedException;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;
import vn.edu.ctu.saas.tenant.TenantPlacement;
import vn.edu.ctu.saas.tenant.TenantRole;

@Service
public class TenantCapabilityService {
    private final TenantRepository tenants;
    private final TenantPlacementRepository placements;
    private final TenantCapabilityRepository capabilities;
    private final TenantConfigEventRepository events;
    private final TenantJdbcExecutor tenantJdbc;

    public TenantCapabilityService(
            TenantRepository tenants,
            TenantPlacementRepository placements,
            TenantCapabilityRepository capabilities,
            TenantConfigEventRepository events,
            TenantJdbcExecutor tenantJdbc) {
        this.tenants = tenants;
        this.placements = placements;
        this.capabilities = capabilities;
        this.events = events;
        this.tenantJdbc = tenantJdbc;
    }

    @Transactional(readOnly = true)
    public List<CapabilityView> list(UUID tenantId) {
        TenantPlacement placement = placement(tenantId).getPlacementType();
        var rows = capabilities.findAllByTenantId(tenantId);
        return Arrays.stream(TenantCapability.values()).map(capability -> {
            TenantCapabilityEntity row = rows.stream()
                    .filter(candidate -> candidate.getCapability() == capability)
                    .findFirst().orElse(null);
            boolean implicitBranding = capability == TenantCapability.BRANDING && row == null;
            return new CapabilityView(
                    capability,
                    supported(placement, capability),
                    implicitBranding || row != null && row.isGranted(),
                    implicitBranding || row != null && row.isGranted() && row.isEnabled(),
                    row == null ? 0 : row.getVersion());
        }).toList();
    }

    @Transactional(readOnly = true)
    public boolean effective(UUID tenantId, TenantCapability capability) {
        TenantPlacement placement = placement(tenantId).getPlacementType();
        if (!supported(placement, capability)) return false;
        return capabilities.findByTenantIdAndCapability(tenantId, capability)
                .map(row -> row.isGranted() && row.isEnabled())
                .orElse(capability == TenantCapability.BRANDING);
    }

    public void require(UUID tenantId, TenantCapability capability) {
        if (!effective(tenantId, capability)) {
            throw new TenantAccessDeniedException("Tenant capability " + capability + " is not enabled");
        }
    }

    @Transactional
    public List<CapabilityView> setGrant(
            UUID actorUserId, UUID tenantId, TenantCapability capability, boolean granted, long expectedVersion) {
        lockTenant(tenantId);
        TenantPlacementEntity placement = placement(tenantId);
        if (granted && !supported(placement.getPlacementType(), capability)) {
            throw new ConflictException("Capability is outside the selected tenant placement");
        }
        if (granted) requireApplicationSchemaReady(placement, capability);
        TenantCapabilityEntity row = capabilities.findByTenantIdAndCapability(tenantId, capability)
                .orElseGet(() -> newCapability(tenantId, capability));
        if (row.getVersion() != expectedVersion) throw new ConflictException("Capability version is stale");
        if (!granted && capability == TenantCapability.APPROVALS) assertApprovalsCanBeDisabled(actorUserId, tenantId, placement);
        row.setGranted(granted);
        if (!granted) row.setEnabled(false);
        row.setVersion(row.getVersion() + 1);
        capabilities.save(row);
        audit(actorUserId, tenantId, granted ? "CAPABILITY_GRANTED" : "CAPABILITY_REVOKED",
                "{\"capability\":\"" + capability + "\"}");
        return list(tenantId);
    }

    @Transactional
    public List<CapabilityView> setEnabled(TenantContext context, TenantCapability capability, boolean enabled, long expectedVersion) {
        requireTenantAdmin(context);
        lockTenant(context.tenantId());
        TenantPlacementEntity placement = placement(context.tenantId());
        TenantCapabilityEntity row = capabilities.findByTenantIdAndCapability(context.tenantId(), capability)
                .orElseGet(() -> newCapability(context.tenantId(), capability));
        if (!row.isGranted() && !(capability == TenantCapability.BRANDING && row.getId() == null)) {
            throw new TenantAccessDeniedException("Capability has not been granted by System Admin");
        }
        if (!supported(placement.getPlacementType(), capability)) {
            throw new ConflictException("Capability is outside the selected tenant placement");
        }
        if (enabled) requireApplicationSchemaReady(placement, capability);
        if (row.getVersion() != expectedVersion) throw new ConflictException("Capability version is stale");
        if (!enabled && capability == TenantCapability.APPROVALS) {
            assertApprovalsCanBeDisabled(context.userId(), context.tenantId(), placement);
        }
        row.setGranted(true);
        row.setEnabled(enabled);
        row.setVersion(row.getVersion() + 1);
        capabilities.save(row);
        audit(context.userId(), context.tenantId(), enabled ? "CAPABILITY_ENABLED" : "CAPABILITY_DISABLED",
                "{\"capability\":\"" + capability + "\"}");
        return list(context.tenantId());
    }

    public static boolean supported(TenantPlacement placement, TenantCapability capability) {
        return switch (placement) {
            case POOL -> capability == TenantCapability.BRANDING;
            case SCHEMA_PER_TENANT -> capability == TenantCapability.BRANDING
                    || capability == TenantCapability.CUSTOM_DATA;
            case SILO_DATABASE -> true;
        };
    }

    private TenantPlacementEntity placement(UUID tenantId) {
        tenants.findById(tenantId).orElseThrow(() -> new NotFoundException("Tenant not found"));
        return placements.findByTenantId(tenantId)
                .orElseThrow(() -> new NotFoundException("Tenant placement not found"));
    }

    private void lockTenant(UUID tenantId) {
        tenants.lockById(tenantId).orElseThrow(() -> new NotFoundException("Tenant not found"));
    }

    private void requireApplicationSchemaReady(
            TenantPlacementEntity placement, TenantCapability capability) {
        if (capability != TenantCapability.BRANDING
                && !TenantDatabaseProvisioner.LATEST_APPLICATION_SCHEMA_VERSION.equals(placement.getSchemaVersion())) {
            throw new ConflictException("Tenant application schema must be upgraded before enabling " + capability);
        }
    }

    private TenantCapabilityEntity newCapability(UUID tenantId, TenantCapability capability) {
        TenantCapabilityEntity entity = new TenantCapabilityEntity();
        entity.setTenantId(tenantId);
        entity.setCapability(capability);
        entity.setGranted(capability == TenantCapability.BRANDING);
        entity.setEnabled(capability == TenantCapability.BRANDING);
        return entity;
    }

    private void requireTenantAdmin(TenantContext context) {
        if (!context.hasAnyRole(TenantRole.OWNER, TenantRole.ADMIN)) {
            throw new TenantAccessDeniedException("Tenant administrator role is required");
        }
    }

    private void assertApprovalsCanBeDisabled(
            UUID actorUserId, UUID tenantId, TenantPlacementEntity placement) {
        if (!TenantDatabaseProvisioner.LATEST_APPLICATION_SCHEMA_VERSION.equals(placement.getSchemaVersion())) {
            throw new ConflictException("Tenant application schema is not ready for approval validation");
        }
        TenantEntity tenant = tenants.findById(tenantId).orElseThrow();
        TenantContext prior = TenantContextHolder.getNullable();
        TenantContextHolder.set(new TenantContext(actorUserId, tenantId, tenant.getSlug(), tenant.getTier(),
                placement.getPlacementType(), Set.of(), "capability-change", "capability-change"));
        try {
            long pending = tenantJdbc.read(jdbc -> jdbc.queryForObject(
                    "SELECT count(*) FROM approval_runs WHERE tenant_id=? AND status='PENDING'",
                    Long.class, tenantId));
            long enabledWorkflows = tenantJdbc.read(jdbc -> jdbc.queryForObject(
                    "SELECT count(*) FROM approval_workflows WHERE tenant_id=? AND enabled=true",
                    Long.class, tenantId));
            if (pending > 0 || enabledWorkflows > 0) {
                throw new ConflictException("Disable approval workflows and resolve pending approval runs first");
            }
        } finally {
            if (prior == null) TenantContextHolder.clear(); else TenantContextHolder.set(prior);
        }
    }

    private void audit(UUID actorUserId, UUID tenantId, String type, String details) {
        TenantConfigEventEntity event = new TenantConfigEventEntity();
        event.setTenantId(tenantId);
        event.setActorUserId(actorUserId);
        event.setEventType(type);
        event.setDetailsJson(details);
        events.save(event);
    }

    public record CapabilityView(
            TenantCapability capability, boolean supported, boolean granted, boolean enabled, long version) {}
}
