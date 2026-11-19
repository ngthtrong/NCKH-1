package vn.tenantflow.controller;

import org.springframework.web.bind.annotation.*;
import vn.tenantflow.domain.model.TenantSettings;
import vn.tenantflow.service.TenantSettingsService;

@RestController
@RequestMapping("/api/tenant-settings")
public class TenantSettingsController {

    private final TenantSettingsService settingsService;

    public TenantSettingsController(TenantSettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping("/kanban")
    public TenantSettings getKanbanSettings() {
        return settingsService.getSettings();
    }

    @PutMapping("/kanban")
    public TenantSettings updateKanbanSettings(@RequestBody TenantSettings settings) {
        return settingsService.updateSettings(settings);
    }
}
