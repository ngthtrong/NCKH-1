package vn.edu.ctu.saas.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import vn.edu.ctu.saas.tenant.TenantPlacement;
import vn.edu.ctu.saas.tenant.TenantRole;
import vn.edu.ctu.saas.tenant.TenantStatus;

public final class AuthDtos {
    private AuthDtos() {}

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
    public record RegisterRequest(
            @Email @NotBlank @Size(max = 320) String email,
            @NotBlank @Size(min = 2, max = 160) String displayName,
            @NotBlank @Size(min = 10, max = 128) String password) {}
    public record LoginResponse(String accessToken, long expiresInSeconds, UserView user, List<TenantView> tenants) {}
    public record TenantTransferRequest(@NotBlank String tenantSlug) {}
    public record TenantTransferResponse(String code, String redirectUrl, long expiresInSeconds) {}
    public record ExchangeRequest(@NotBlank String code) {}
    public record TenantSessionResponse(String accessToken, long expiresInSeconds, UserView user, TenantView activeTenant) {}
    public record UserView(UUID id, String email, String displayName, List<String> platformRoles) {}
    public record TenantView(
            UUID id,
            String slug,
            String name,
            String tier,
            TenantStatus status,
            TenantPlacement placement,
            TenantRole role) {}
    public record MeResponse(UserView user, TenantView tenant, boolean tenantScoped) {}
}
