package vn.edu.ctu.saas.tenant;

import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/invitations")
public class InvitationController {
    private final TenantInvitationService invitationService;

    public InvitationController(TenantInvitationService invitationService) {
        this.invitationService = invitationService;
    }

    @GetMapping("/{token}")
    public TenantInvitationService.InvitationView preview(@PathVariable String token) {
        return invitationService.preview(token);
    }

    @PostMapping("/{token}/accept")
    public TenantInvitationService.InvitationView accept(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String token) {
        return invitationService.accept(token, UUID.fromString(jwt.getSubject()));
    }

    @PostMapping("/{token}/reject")
    public TenantInvitationService.InvitationView reject(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String token) {
        return invitationService.reject(token, UUID.fromString(jwt.getSubject()));
    }
}
