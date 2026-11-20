package vn.tenantflow.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.tenantflow.domain.entity.Tenant;
import vn.tenantflow.domain.model.ApiException;
import vn.tenantflow.domain.repository.TenantRepository;
import vn.tenantflow.security.JwtTenantFilter;

import java.util.Map;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final TenantRepository tenantRepository;

    public PublicController(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    @GetMapping("/tenant-branding")
    public Map<String, Object> getTenantBranding(@RequestParam(required = false) String slug,
                                                 HttpServletRequest request) {
        String resolvedSlug = JwtTenantFilter.extractSubdomain(request.getHeader("Host"));
        if (resolvedSlug == null && slug != null && !slug.isBlank()) {
            resolvedSlug = slug.trim().toLowerCase();
        }
        if (resolvedSlug == null || "admin".equalsIgnoreCase(resolvedSlug)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NO_TENANT_SUBDOMAIN", "Không xác định được subdomain tổ chức");
        }

        final String targetSlug = resolvedSlug;
        Tenant tenant = tenantRepository.findBySlug(targetSlug)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND",
                        "Tổ chức '" + targetSlug + "' chưa được đăng ký trên hệ thống"));

        return Map.of(
                "id", tenant.getId(),
                "slug", tenant.getSlug(),
                "name", tenant.getName(),
                "tier", tenant.getTier(),
                "status", tenant.getStatus(),
                "theme", tenant.getSettings().theme()
        );
    }
}
