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

import java.util.List;
import java.util.Map;
import java.util.UUID;

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

    public Map<String, Object> login(String email, String password) {
        String normalizedEmail = email.trim().toLowerCase();

        // Check System Admin credentials
        boolean isSysAdmin = appProperties.sysadmin().email().equalsIgnoreCase(normalizedEmail);
        if (isSysAdmin) {
            if (!appProperties.sysadmin().password().equals(password)) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
            }
            TenantInfo sysInfo = new TenantInfo(
                    null, "admin", null,
                    appProperties.sysadmin().email(),
                    appProperties.sysadmin().fullName(),
                    "SYSTEM_ADMIN", "ENTERPRISE", true
            );
            String adminToken = jwtService.generateWorkspaceToken(sysInfo);
            return Map.of(
                    "user", Map.of(
                            "email", appProperties.sysadmin().email(),
                            "fullName", appProperties.sysadmin().fullName(),
                            "systemAdmin", true
                    ),
                    "preAuthToken", adminToken,
                    "accessToken", adminToken,
                    "workspaces", List.of()
            );
        }

        List<TenantUser> memberships = tenantUserRepository.findByEmailIgnoreCase(normalizedEmail);
        if (memberships.isEmpty()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
        }

        // Verify password against any matching membership
        TenantUser matched = memberships.stream()
                .filter(u -> passwordEncoder.matches(password, u.getPasswordHash()))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng"));

        List<UUID> tenantIds = memberships.stream().map(TenantUser::getTenantId).toList();
        Map<UUID, Tenant> tenantMap = tenantRepository.findAllById(tenantIds).stream()
                .collect(java.util.stream.Collectors.toMap(Tenant::getId, t -> t));

        List<Map<String, Object>> workspaces = memberships.stream()
                .map(m -> {
                    Tenant t = tenantMap.get(m.getTenantId());
                    if (t == null) return null;
                    return Map.<String, Object>of(
                            "tenantId", t.getId(),
                            "slug", t.getSlug(),
                            "name", t.getName(),
                            "tier", t.getTier(),
                            "status", t.getStatus(),
                            "role", m.getRole()
                    );
                })
                .filter(java.util.Objects::nonNull)
                .toList();

        String preAuthToken = jwtService.generatePreAuthToken(matched.getEmail(), matched.getFullName(), false);

        return Map.of(
                "user", Map.of(
                        "email", matched.getEmail(),
                        "fullName", matched.getFullName(),
                        "systemAdmin", false
                ),
                "preAuthToken", preAuthToken,
                "workspaces", workspaces
        );
    }

    public Map<String, Object> switchWorkspace(String email, String tenantSlug) {
        Tenant tenant = tenantRepository.findBySlug(tenantSlug.trim().toLowerCase())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND", "Không tìm thấy tổ chức: " + tenantSlug));

        if (!"ACTIVE".equals(tenant.getStatus())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "TENANT_SUSPENDED", "Tổ chức đang bị tạm khóa (SUSPENDED)");
        }

        TenantUser membership = tenantUserRepository.findByTenantIdAndEmailIgnoreCase(tenant.getId(), email)
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "NOT_A_MEMBER", "Bạn không phải thành viên của tổ chức này"));

        TenantInfo info = new TenantInfo(
                tenant.getId(),
                tenant.getSlug(),
                membership.getId(),
                membership.getEmail(),
                membership.getFullName(),
                membership.getRole(),
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
                        "status", tenant.getStatus(),
                        "role", membership.getRole(),
                        "settings", tenant.getSettings()
                ),
                "user", Map.of(
                        "id", membership.getId(),
                        "email", membership.getEmail(),
                        "fullName", membership.getFullName(),
                        "role", membership.getRole()
                )
        );
    }
}
