package vn.tenantflow.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.tenantflow.security.TenantContext;
import vn.tenantflow.security.TenantInfo;
import vn.tenantflow.service.AuthService;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {}
    public record SwitchWorkspaceRequest(@NotBlank String tenantSlug) {}

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP", "service", "tenantflow-kanban-api");
    }

    @PostMapping("/auth/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req.email(), req.password()));
    }

    @PostMapping("/auth/switch-workspace")
    public ResponseEntity<Map<String, Object>> switchWorkspace(@Valid @RequestBody SwitchWorkspaceRequest req) {
        TenantInfo current = TenantContext.get();
        return ResponseEntity.ok(authService.switchWorkspace(current.email(), req.tenantSlug()));
    }

    @GetMapping("/auth/me")
    public ResponseEntity<TenantInfo> me() {
        return ResponseEntity.ok(TenantContext.get());
    }
}
