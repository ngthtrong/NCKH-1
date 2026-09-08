package vn.edu.ctu.saas.customization;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.io.IOException;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;

@RestController
@RequestMapping("/api/v1/tenant-settings")
public class TenantCustomizationController {
    private final TenantCapabilityService capabilities;
    private final BrandingService branding;

    public TenantCustomizationController(TenantCapabilityService capabilities, BrandingService branding) {
        this.capabilities = capabilities;
        this.branding = branding;
    }

    @GetMapping
    public SettingsView settings() {
        TenantContext context = TenantContextHolder.getRequired();
        return new SettingsView(capabilities.list(context.tenantId()), branding.get(context));
    }

    @PatchMapping("/capabilities")
    public List<TenantCapabilityService.CapabilityView> setEnabled(@Valid @RequestBody EnableCapabilityRequest request) {
        return capabilities.setEnabled(
                TenantContextHolder.getRequired(), request.capability(), request.enabled(), request.version());
    }

    @PatchMapping("/branding")
    public BrandingService.BrandingView updateBranding(@Valid @RequestBody UpdateBrandingRequest request) {
        return branding.update(TenantContextHolder.getRequired(), request.primaryColor(), request.accentColor(), request.version());
    }

    @PostMapping("/branding/logo")
    public BrandingService.BrandingView uploadLogo(
            @RequestParam("file") MultipartFile file,
            @RequestParam long version) throws IOException {
        return branding.uploadLogo(TenantContextHolder.getRequired(), file.getContentType(), file.getSize(), file.getInputStream(), version);
    }

    @DeleteMapping("/branding/logo")
    public BrandingService.BrandingView deleteLogo(@RequestParam long version) {
        return branding.deleteLogo(TenantContextHolder.getRequired(), version);
    }

    public record SettingsView(
            List<TenantCapabilityService.CapabilityView> capabilities,
            BrandingService.BrandingView branding) {}
    public record EnableCapabilityRequest(
            @NotNull TenantCapability capability, boolean enabled, @PositiveOrZero long version) {}
    public record UpdateBrandingRequest(
            @NotBlank String primaryColor, @NotBlank String accentColor, @PositiveOrZero long version) {}
}
