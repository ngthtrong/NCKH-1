package vn.tenantflow.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.tenantflow.service.TenantTelemetryService;

import java.util.Map;

@RestController
@RequestMapping({"/api/admin/metrics", "/api/platform/metrics"})
public class AdminMetricsController {

    private final TenantTelemetryService telemetryService;

    public AdminMetricsController(TenantTelemetryService telemetryService) {
        this.telemetryService = telemetryService;
    }

    @GetMapping("/overview")
    public Map<String, Object> getMetricsOverview() {
        return telemetryService.getMetricsOverview();
    }
}
