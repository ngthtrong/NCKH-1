package vn.tenantflow.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import vn.tenantflow.config.AppProperties;
import vn.tenantflow.domain.entity.Tenant;
import vn.tenantflow.domain.entity.TenantUser;
import vn.tenantflow.domain.model.ApiException;
import vn.tenantflow.domain.repository.TenantRepository;
import vn.tenantflow.domain.repository.TenantUserRepository;
import vn.tenantflow.security.JwtService;
import vn.tenantflow.security.TenantInfo;

import java.util.Map;

@Service
public class AuthService {

    private final TenantUserRepository tenantUserRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AppProperties appProperties;

    public AuthService(TenantUserRepository tenantUserRepository,
                       TenantRepository tenantRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AppProperties appProperties) {
        this.tenantUserRepository = tenantUserRepository;
        this.tenantRepository = tenantRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.appProperties = appProperties;
    }

    public Map<String, Object> login(String email, String password, String hostSubdomain, String requestedSlug) {
        String normalizedEmail = email.trim().toLowerCase();

        // 1. Platform Admin login (allowed on admin.<domain> or bare localhost)
        if (appProperties.sysadmin().email().equalsIgnoreCase(normalizedEmail)) {
            if (hostSubdomain != null && !"admin".equalsIgnoreCase(hostSubdomain)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "SUBDOMAIN_MISMATCH",
                        "Tài khoản Quản trị Nền tảng chỉ đăng nhập tại cổng admin");
            }
            if (!appProperties.sysadmin().password().equals(password)) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
            }
            TenantInfo sysInfo = new TenantInfo(
                    null, "admin", null,
                    appProperties.sysadmin().email(),
                    appProperties.sysadmin().fullName(),
                    "PLATFORM_ADMIN", "ENTERPRISE", true
            );
            String adminToken = jwtService.generateWorkspaceToken(sysInfo);
            return Map.of(
                    "accessToken", adminToken,
                    "user", Map.of(
                            "email", appProperties.sysadmin().email(),
                            "fullName", appProperties.sysadmin().fullName(),
                            "role", "PLATFORM_ADMIN",
                            "systemAdmin", true
                    )
            );
        }

        // 2. Tenant User login (strict 1-to-1 binding with subdomain)
        String targetSlug = (hostSubdomain != null && !hostSubdomain.isBlank())
                ? hostSubdomain
                : (requestedSlug != null && !requestedSlug.isBlank() ? requestedSlug.trim().toLowerCase() : null);

        if (targetSlug == null || "admin".equalsIgnoreCase(targetSlug)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "TENANT_SUBDOMAIN_REQUIRED",
                    "Vui lòng đăng nhập qua tên miền phụ của tổ chức (vd: t-acme.localhost)");
        }

        Tenant tenant = tenantRepository.findBySlug(targetSlug)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND",
                        "Không tìm thấy tổ chức: " + targetSlug));

        if (!"ACTIVE".equals(tenant.getStatus())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "TENANT_SUSPENDED",
                    "Tổ chức '" + targetSlug + "' đang bị tạm ngưng (SUSPENDED)");
        }

        TenantUser user = tenantUserRepository.findByTenantIdAndEmailIgnoreCase(tenant.getId(), normalizedEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "TENANT_ACCESS_DENIED",
                        "Tài khoản " + normalizedEmail + " không thuộc tổ chức '" + targetSlug + "'"));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
        }

        TenantInfo info = new TenantInfo(
                tenant.getId(),
                tenant.getSlug(),
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                tenant.getTier(),
                false
        );

        String accessToken = jwtService.generateWorkspaceToken(info);
        return Map.of(
                "accessToken", accessToken,
                "tenant", Map.of(
                        "id", tenant.getId(),
                        "slug", tenant.getSlug(),
                        "name", tenant.getName(),
                        "tier", tenant.getTier(),
                        "rateLimitRpm", tenant.getRateLimitRpm(),
                        "maxMembers", tenant.getMaxMembers(),
                        "status", tenant.getStatus(),
                        "settings", tenant.getSettings()
                ),
                "user", Map.of(
                        "id", user.getId(),
                        "email", user.getEmail(),
                        "fullName", user.getFullName(),
                        "role", user.getRole(),
                        "systemAdmin", false
                )
        );
    }
}
