package vn.edu.ctu.saas.config;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ArchitectureController {
    private final boolean reportMode;
    private final boolean rateLimitEnabled;
    private final boolean cacheEnabled;
    public ArchitectureController(@Value("${app.report-mode:false}") boolean reportMode,
            @Value("${app.rate-limit.enabled:true}") boolean rateLimitEnabled,
            @Value("${app.cache.enabled:true}") boolean cacheEnabled) {
        this.reportMode = reportMode;
        this.rateLimitEnabled = rateLimitEnabled;
        this.cacheEnabled = cacheEnabled;
    }
    @GetMapping("/api/v1/architecture")
    public Map<String,Object> get() {
        return Map.of("mode", reportMode ? "POOL" : "BRIDGE", "maturityLevel", 3,
                "rateLimitEnabled", rateLimitEnabled, "cacheEnabled", cacheEnabled);
    }
}
