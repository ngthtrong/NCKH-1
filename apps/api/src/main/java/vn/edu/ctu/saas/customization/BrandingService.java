package vn.edu.ctu.saas.customization;

import java.io.InputStream;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.control.TenantBrandingEntity;
import vn.edu.ctu.saas.control.TenantBrandingRepository;
import vn.edu.ctu.saas.storage.ResourceStorage;
import vn.edu.ctu.saas.tenant.TenantAccessDeniedException;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantRole;

@Service
public class BrandingService {
    private static final Set<String> CONTENT_TYPES = Set.of("image/png", "image/jpeg", "image/webp");
    private static final long MAX_LOGO_BYTES = 2 * 1024 * 1024;
    private final TenantBrandingRepository branding;
    private final TenantCapabilityService capabilities;
    private final ResourceStorage storage;

    public BrandingService(
            TenantBrandingRepository branding,
            TenantCapabilityService capabilities,
            ResourceStorage storage) {
        this.branding = branding;
        this.capabilities = capabilities;
        this.storage = storage;
    }

    @Transactional(readOnly = true)
    public BrandingView get(TenantContext context) {
        TenantBrandingEntity row = branding.findByTenantId(context.tenantId()).orElse(null);
        if (row == null) return new BrandingView("#4F46E5", "#0EA5E9", null, 0);
        return view(row);
    }

    @Transactional
    public BrandingView update(TenantContext context, String primary, String accent, long expectedVersion) {
        requireAdmin(context);
        capabilities.require(context.tenantId(), TenantCapability.BRANDING);
        String primaryColor = color(primary);
        String accentColor = color(accent);
        TenantBrandingEntity row = branding.findByTenantId(context.tenantId()).orElseGet(() -> create(context.tenantId()));
        if (row.getVersion() != expectedVersion) throw new ConflictException("Branding version is stale");
        row.setPrimaryColor(primaryColor);
        row.setAccentColor(accentColor);
        row.setVersion(row.getVersion() + 1);
        return view(branding.save(row));
    }

    @Transactional
    public BrandingView uploadLogo(
            TenantContext context, String contentType, long size, InputStream input, long expectedVersion) {
        requireAdmin(context);
        capabilities.require(context.tenantId(), TenantCapability.BRANDING);
        if (!CONTENT_TYPES.contains(contentType) || size <= 0 || size > MAX_LOGO_BYTES) {
            throw new IllegalArgumentException("Logo must be a PNG, JPEG or WebP image up to 2 MiB");
        }
        TenantBrandingEntity row = branding.findByTenantId(context.tenantId()).orElseGet(() -> create(context.tenantId()));
        if (row.getVersion() != expectedVersion) throw new ConflictException("Branding version is stale");
        UUID logoId = UUID.randomUUID();
        String extension = switch (contentType) {
            case "image/png" -> "png";
            case "image/jpeg" -> "jpg";
            default -> "webp";
        };
        ResourceStorage.StoredObject stored = storage.store(
                context.tenantId(), logoId, "tenant-logo." + extension, contentType, size, input);
        String oldKey = row.getLogoStorageKey();
        row.setLogoStorageKey(stored.storageKey());
        row.setLogoContentType(contentType);
        row.setVersion(row.getVersion() + 1);
        BrandingView result = view(branding.save(row));
        if (oldKey != null) storage.delete(oldKey);
        return result;
    }

    @Transactional
    public BrandingView deleteLogo(TenantContext context, long expectedVersion) {
        requireAdmin(context);
        capabilities.require(context.tenantId(), TenantCapability.BRANDING);
        TenantBrandingEntity row = branding.findByTenantId(context.tenantId()).orElseGet(() -> create(context.tenantId()));
        if (row.getVersion() != expectedVersion) throw new ConflictException("Branding version is stale");
        String oldKey = row.getLogoStorageKey();
        row.setLogoStorageKey(null);
        row.setLogoContentType(null);
        row.setVersion(row.getVersion() + 1);
        BrandingView result = view(branding.save(row));
        if (oldKey != null) storage.delete(oldKey);
        return result;
    }

    private TenantBrandingEntity create(UUID tenantId) {
        TenantBrandingEntity row = new TenantBrandingEntity();
        row.setTenantId(tenantId);
        return row;
    }

    private BrandingView view(TenantBrandingEntity row) {
        String logoUrl = row.getLogoStorageKey() == null ? null
                : storage.createDownloadUrl(row.getLogoStorageKey(), Duration.ofMinutes(10));
        return new BrandingView(row.getPrimaryColor(), row.getAccentColor(), logoUrl, row.getVersion());
    }

    private String color(String value) {
        String normalized = value == null ? "" : value.trim().toUpperCase();
        if (!normalized.matches("#[0-9A-F]{6}")) throw new IllegalArgumentException("Color must use #RRGGBB format");
        return normalized;
    }

    private void requireAdmin(TenantContext context) {
        if (!context.hasAnyRole(TenantRole.OWNER, TenantRole.ADMIN)) {
            throw new TenantAccessDeniedException("Tenant administrator role is required");
        }
    }

    public record BrandingView(String primaryColor, String accentColor, String logoUrl, long version) {}
}
