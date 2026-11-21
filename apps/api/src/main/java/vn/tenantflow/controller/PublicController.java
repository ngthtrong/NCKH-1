package vn.tenantflow.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.tenantflow.config.AppProperties;
import vn.tenantflow.domain.entity.Tenant;
import vn.tenantflow.domain.entity.TenantUser;
import vn.tenantflow.domain.model.ApiException;
import vn.tenantflow.domain.repository.TenantRepository;
import vn.tenantflow.domain.repository.TenantUserRepository;
import vn.tenantflow.security.JwtTenantFilter;

import java.util.*;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final TenantRepository tenantRepository;
    private final TenantUserRepository tenantUserRepository;
    private final AppProperties appProperties;

    public PublicController(TenantRepository tenantRepository,
                            TenantUserRepository tenantUserRepository,
                            AppProperties appProperties) {
        this.tenantRepository = tenantRepository;
        this.tenantUserRepository = tenantUserRepository;
        this.appProperties = appProperties;
    }

    public record DiscoverTenantRequest(String email) {}

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
                "theme", tenant.getSettings() != null ? tenant.getSettings().theme() : Map.of()
        );
    }

    @PostMapping("/discover-tenant")
    public List<Map<String, Object>> discoverTenant(@RequestBody DiscoverTenantRequest body) {
        if (body == null || body.email() == null || body.email().isBlank()) {
            return List.of();
        }

        String normalizedEmail = body.email().trim().toLowerCase();

        // 1. Platform Admin check
        if (appProperties.sysadmin().email().equalsIgnoreCase(normalizedEmail)) {
            Map<String, Object> adminResult = new HashMap<>();
            adminResult.put("type", "PLATFORM_ADMIN");
            adminResult.put("name", "Cổng Quản trị Nền tảng (Platform Admin)");
            adminResult.put("slug", "admin");
            adminResult.put("tier", "ENTERPRISE");
            adminResult.put("primaryColor", "#0f172a");
            adminResult.put("logoText", "ADMIN");
            return List.of(adminResult);
        }

        // 2. Query tenant_users by email
        List<TenantUser> users = tenantUserRepository.findByEmailIgnoreCase(normalizedEmail);
        if (users.isEmpty()) {
            return List.of();
        }

        List<UUID> tenantIds = users.stream().map(TenantUser::getTenantId).distinct().toList();
        List<Tenant> tenants = tenantRepository.findAllById(tenantIds).stream()
                .filter(t -> "ACTIVE".equalsIgnoreCase(t.getStatus()))
                .toList();

        List<Map<String, Object>> result = new ArrayList<>();
        for (Tenant t : tenants) {
            String primaryColor = "#0d6efd";
            String logoText = t.getSlug().replaceFirst("^t-", "").toUpperCase();
            if (t.getSettings() != null && t.getSettings().theme() != null) {
                if (t.getSettings().theme().primary() != null && !t.getSettings().theme().primary().isBlank()) {
                    primaryColor = t.getSettings().theme().primary();
                }
                if (t.getSettings().theme().logoText() != null && !t.getSettings().theme().logoText().isBlank()) {
                    logoText = t.getSettings().theme().logoText();
                }
            }

            Map<String, Object> item = new HashMap<>();
            item.put("type", "TENANT");
            item.put("slug", t.getSlug());
            item.put("name", t.getName());
            item.put("tier", t.getTier());
            item.put("primaryColor", primaryColor);
            item.put("logoText", logoText);
            result.add(item);
        }

        return result;
    }
}
