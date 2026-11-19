package vn.tenantflow.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.tenantflow.cache.TenantConfigCacheService;
import vn.tenantflow.domain.entity.Tenant;
import vn.tenantflow.domain.model.ApiException;
import vn.tenantflow.domain.model.TenantSettings;
import vn.tenantflow.domain.repository.TenantRepository;
import vn.tenantflow.security.TenantContext;
import vn.tenantflow.security.TenantInfo;

@Service
public class TenantSettingsService {

    private final TenantRepository tenantRepository;
    private final TenantConfigCacheService cacheService;

    public TenantSettingsService(TenantRepository tenantRepository, TenantConfigCacheService cacheService) {
        this.tenantRepository = tenantRepository;
        this.cacheService = cacheService;
    }

    public TenantSettings getSettings() {
        TenantInfo info = TenantContext.get();
        return cacheService.getTenantSettings(info.tenantId());
    }

    @Transactional
    public TenantSettings updateSettings(TenantSettings updated) {
        TenantInfo info = TenantContext.get();
        if (!info.isTenantAdmin()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Chỉ TENANT_ADMIN mới có quyền thay đổi cài đặt tổ chức");
        }

        if (updated.wipMode() == null || (!"STRICT".equals(updated.wipMode()) && !"WARN".equals(updated.wipMode()))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WIP_MODE", "wipMode phải là STRICT hoặc WARN");
        }
        if (updated.cardDisplayMode() == null || (!"FULL".equals(updated.cardDisplayMode()) && !"COMPACT".equals(updated.cardDisplayMode()))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DISPLAY_MODE", "cardDisplayMode phải là FULL hoặc COMPACT");
        }
        if (updated.customFields() != null) {
            for (TenantSettings.CustomFieldDef cf : updated.customFields()) {
                if (cf.key() == null || cf.key().isBlank() || cf.label() == null || cf.label().isBlank()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CUSTOM_FIELD", "Mỗi trường mở rộng phải có key và label");
                }
                if (!"TEXT".equals(cf.type()) && !"NUMBER".equals(cf.type())) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CUSTOM_FIELD_TYPE", "Kiểu trường mở rộng phải là TEXT hoặc NUMBER");
                }
            }
        }

        Tenant tenant = tenantRepository.findById(info.tenantId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND", "Không tìm thấy tổ chức"));
        tenant.setSettings(updated);
        tenantRepository.save(tenant);

        // Invalidate Redis L2 and publish Pub/Sub to evict L1 Caffeine across all API nodes
        cacheService.invalidateTenantConfig(info.tenantId());
        return updated;
    }
}
