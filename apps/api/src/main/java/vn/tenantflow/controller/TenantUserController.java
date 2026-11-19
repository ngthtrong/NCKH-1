package vn.tenantflow.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.tenantflow.service.TenantUserService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/tenant-users")
public class TenantUserController {

    private final TenantUserService userService;

    public TenantUserController(TenantUserService userService) {
        this.userService = userService;
    }

    public record AddMemberRequest(
            @NotBlank String email,
            @NotBlank String fullName,
            String password,
            String role
    ) {}

    public record UpdateRoleRequest(@NotBlank String role) {}

    @GetMapping
    public List<Map<String, Object>> listMembers() {
        return userService.listMembers();
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> addMember(@Valid @RequestBody AddMemberRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(userService.addMember(req.email(), req.fullName(), req.password(), req.role()));
    }

    @PatchMapping("/{id}/role")
    public Map<String, Object> updateRole(@PathVariable UUID id, @Valid @RequestBody UpdateRoleRequest req) {
        return userService.updateRole(id, req.role());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removeMember(@PathVariable UUID id) {
        userService.removeMember(id);
        return ResponseEntity.noContent().build();
    }
}
