package vn.edu.ctu.saas.tenant;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;
import vn.edu.ctu.saas.auth.AuthDtos.TenantView;

@RestController
@RequestMapping("/api/v1")
public class TenantController {
    private final TenantManagementService tenantService;
    private final TenantInvitationService invitationService;

    public TenantController(
            TenantManagementService tenantService,
            TenantInvitationService invitationService) {
        this.tenantService = tenantService;
        this.invitationService = invitationService;
    }

    @PostMapping("/tenants")
    public TenantView create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateTenantRequest request) {
        return tenantService.create(
                UUID.fromString(jwt.getSubject()), request.slug(), request.name(), request.tier(), request.placement());
    }

    @GetMapping("/tenants")
    public List<TenantView> tenants(@AuthenticationPrincipal Jwt jwt) {
        return tenantService.tenantViews(UUID.fromString(jwt.getSubject()));
    }

    @GetMapping("/members")
    public List<TenantManagementService.MemberView> members() {
        return tenantService.members(TenantContextHolder.getRequired());
    }

    @PatchMapping("/members/{membershipId}")
    public TenantManagementService.MemberView updateMember(
            @PathVariable UUID membershipId,
            @Valid @RequestBody UpdateMemberRequest request) {
        return tenantService.updateMember(TenantContextHolder.getRequired(), membershipId, request.role(), request.active());
    }

    @PostMapping("/members/invitations")
    public TenantInvitationService.InvitationCreatedView invite(
            @Valid @RequestBody InviteMemberRequest request) {
        return invitationService.create(
                TenantContextHolder.getRequired(), request.email(), request.role());
    }

    @GetMapping("/members/invitations")
    public List<TenantInvitationService.InvitationView> invitations() {
        return invitationService.list(TenantContextHolder.getRequired());
    }

    @DeleteMapping("/members/invitations/{invitationId}")
    public void revokeInvitation(@PathVariable UUID invitationId) {
        invitationService.revoke(TenantContextHolder.getRequired(), invitationId);
    }

    @PatchMapping("/members/{membershipId}/role")
    public TenantManagementService.MemberView changeRole(
            @PathVariable UUID membershipId,
            @Valid @RequestBody ChangeRoleRequest request) {
        return tenantService.changeRole(TenantContextHolder.getRequired(), membershipId, request.role());
    }

    @DeleteMapping("/members/{membershipId}")
    public void revoke(@PathVariable UUID membershipId) {
        tenantService.revoke(TenantContextHolder.getRequired(), membershipId);
    }

    @PostMapping("/members/{membershipId}/transfer-ownership")
    public TenantManagementService.MemberView transferOwnership(@PathVariable UUID membershipId) {
        return tenantService.transferOwnership(TenantContextHolder.getRequired(), membershipId);
    }

    public record CreateTenantRequest(
            @NotBlank String slug,
            @NotBlank String name,
            @NotBlank String tier,
            @NotNull TenantPlacement placement) {}

    public record UpdateMemberRequest(@NotNull TenantRole role, boolean active) {}
    public record InviteMemberRequest(@jakarta.validation.constraints.Email @NotBlank String email, @NotNull TenantRole role) {}
    public record ChangeRoleRequest(@NotNull TenantRole role) {}
}
