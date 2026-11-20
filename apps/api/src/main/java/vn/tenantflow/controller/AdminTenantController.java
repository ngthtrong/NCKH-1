package vn.tenantflow.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.tenantflow.domain.entity.Tenant;
import vn.tenantflow.service.AdminTenantService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping({"/api/platform/tenants", "/api/admin/tenants"})
public class AdminTenantController {

    private final AdminTenantService adminTenantService;

    public AdminTenantController(AdminTenantService adminTenantService) {
        this.adminTenantService = adminTenantService;
    }

    public record CreateTenantRequest(
            @NotBlank String slug,
            @NotBlank String name,
            String tier,
            String industryTemplate,
            Integer rateLimitRpm,
            Integer maxMembers,
            String adminEmail,
            String adminName,
            String adminPassword
    ) {}

    public record UpdateTenantRequest(String status, String tier, Integer rateLimitRpm, Integer maxMembers) {}

    @GetMapping
    public List<Map<String, Object>> listTenants() {
        return adminTenantService.listAllTenants();
    }

    @PostMapping
    public ResponseEntity<Tenant> createTenant(@Valid @RequestBody CreateTenantRequest req) {
        Tenant created = adminTenantService.createTenant(
                req.slug(), req.name(), req.tier(), req.industryTemplate(),
                req.rateLimitRpm(), req.maxMembers(),
                req.adminEmail(), req.adminName(), req.adminPassword()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping({"/{id}", "/{id}/status"})
    public Tenant updateTenant(@PathVariable UUID id, @RequestBody UpdateTenantRequest req) {
        return adminTenantService.updateTenant(id, req.status(), req.tier(), req.rateLimitRpm(), req.maxMembers());
    }
}
