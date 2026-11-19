package vn.tenantflow.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.tenantflow.domain.entity.Tenant;
import vn.tenantflow.service.AdminTenantService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/tenants")
public class AdminTenantController {

    private final AdminTenantService adminTenantService;

    public AdminTenantController(AdminTenantService adminTenantService) {
        this.adminTenantService = adminTenantService;
    }

    public record CreateTenantRequest(
            @NotBlank String slug,
            @NotBlank String name,
            @NotBlank String tier,
            String adminEmail,
            String adminName,
            String adminPassword
    ) {}

    public record UpdateStatusRequest(@NotBlank String status) {}

    @GetMapping
    public List<Tenant> listTenants() {
        return adminTenantService.listAllTenants();
    }

    @PostMapping
    public ResponseEntity<Tenant> createTenant(@Valid @RequestBody CreateTenantRequest req) {
        Tenant created = adminTenantService.createTenant(
                req.slug(), req.name(), req.tier(),
                req.adminEmail(), req.adminName(), req.adminPassword()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{id}/status")
    public Tenant updateStatus(@PathVariable UUID id, @Valid @RequestBody UpdateStatusRequest req) {
        return adminTenantService.updateTenantStatus(id, req.status());
    }
}
