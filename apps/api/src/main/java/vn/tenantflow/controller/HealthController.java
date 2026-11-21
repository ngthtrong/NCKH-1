package vn.tenantflow.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    @GetMapping({"/api/health", "/health", "/api/public/health"})
    public ResponseEntity<Map<String, String>> healthCheck(
            @RequestParam(value = "domain", required = false) String domain) {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }
}
