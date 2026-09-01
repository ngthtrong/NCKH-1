package vn.edu.ctu.saas.admin;

import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.ctu.saas.tenant.TenantPlacement;
import vn.edu.ctu.saas.tenant.TenantStatus;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('SYSTEM_ADMIN')")
public class AdminController {
    private final AdminService service;
    private final ResourceOutboxAdminService resourceOutboxService;

    public AdminController(AdminService service, ResourceOutboxAdminService resourceOutboxService) {
        this.service = service;
        this.resourceOutboxService = resourceOutboxService;
    }

    @GetMapping("/tenants")
    public AdminService.PageView<AdminService.AdminTenantView> tenants(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(required = false) TenantStatus status,
            @RequestParam(required = false) TenantPlacement placement) {
        return service.tenants(page, size, search, status, placement);
    }

    @GetMapping("/tenants/{tenantId}")
    public AdminService.AdminTenantDetailView tenant(@PathVariable UUID tenantId) {
        return service.tenant(tenantId);
    }

    @PostMapping("/tenants/{tenantId}/provisioning/retry")
    public void retryProvisioning(@PathVariable UUID tenantId) {
        service.retryProvisioning(tenantId);
    }

    @GetMapping("/tenants/{tenantId}/resource-dead-letters")
    public ResourceOutboxAdminService.DeadLetterPage resourceDeadLetters(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID tenantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return resourceOutboxService.deadLetters(tenantId, UUID.fromString(jwt.getSubject()), page, size);
    }

    @PostMapping("/tenants/{tenantId}/resource-dead-letters/{eventId}/requeue")
    public void requeueResourceDeadLetter(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID tenantId,
            @PathVariable UUID eventId) {
        resourceOutboxService.requeue(tenantId, eventId, UUID.fromString(jwt.getSubject()));
    }
}
