package vn.edu.ctu.saas.auth;

import static vn.edu.ctu.saas.auth.AuthDtos.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.ctu.saas.config.AppProperties;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.control.UserAccountEntity;
import vn.edu.ctu.saas.control.UserAccountRepository;
import vn.edu.ctu.saas.security.TenantHostResolver;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private static final String REFRESH_COOKIE = "refresh_token";
    private static final String CSRF_COOKIE = "XSRF-TOKEN";
    private final AuthService authService;
    private final TenantHostResolver hostResolver;
    private final AppProperties properties;
    private final UserAccountRepository userRepository;
    private final TenantRepository tenantRepository;
    private final TenantMembershipRepository membershipRepository;
    private final TenantPlacementRepository placementRepository;

    public AuthController(
            AuthService authService,
            TenantHostResolver hostResolver,
            AppProperties properties,
            UserAccountRepository userRepository,
            TenantRepository tenantRepository,
            TenantMembershipRepository membershipRepository,
            TenantPlacementRepository placementRepository) {
        this.authService = authService;
        this.hostResolver = hostResolver;
        this.properties = properties;
        this.userRepository = userRepository;
        this.tenantRepository = tenantRepository;
        this.membershipRepository = membershipRepository;
        this.placementRepository = placementRepository;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/tenant-transfer")
    public TenantTransferResponse tenantTransfer(
            @AuthenticationPrincipal Jwt jwt,
            HttpServletRequest servletRequest,
            @Valid @RequestBody TenantTransferRequest request) {
        return authService.createTransfer(
                UUID.fromString(jwt.getSubject()), request.tenantSlug(),
                hostResolver.tenantUrl(request.tenantSlug(), servletRequest));
    }

    @PostMapping("/exchange")
    public TenantSessionResponse exchange(
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse,
            @Valid @RequestBody ExchangeRequest request) {
        String hostSlug = hostResolver.resolveTenantSlug(servletRequest)
                .orElseThrow(() -> new IllegalArgumentException("Tenant host is required"));
        AuthService.IssuedTenantSession issued = authService.exchange(request.code(), hostSlug);
        addSessionCookies(servletResponse, issued);
        return issued.response();
    }

    @PostMapping("/refresh")
    public TenantSessionResponse refresh(
            HttpServletResponse response,
            @CookieValue(name = REFRESH_COOKIE) String refreshToken,
            @CookieValue(name = CSRF_COOKIE) String csrfCookie,
            @RequestHeader(name = "X-CSRF-Token") String csrfHeader) {
        if (!constantTimeEquals(csrfCookie, csrfHeader)) {
            throw new IllegalArgumentException("CSRF token mismatch");
        }
        AuthService.IssuedTenantSession issued = authService.refresh(refreshToken);
        addSessionCookies(response, issued);
        return issued.response();
    }

    @PostMapping("/logout")
    public void logout(
            HttpServletResponse response,
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
            @CookieValue(name = CSRF_COOKIE, required = false) String csrfCookie,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfHeader) {
        if (refreshToken != null && !constantTimeEquals(csrfCookie, csrfHeader)) {
            throw new IllegalArgumentException("CSRF token mismatch");
        }
        authService.revoke(refreshToken);
        clearCookies(response);
    }

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        UserAccountEntity user = userRepository.findById(userId).orElseThrow();
        UserView userView = new UserView(user.getId(), user.getEmail(), user.getDisplayName());
        TenantContext context = TenantContextHolder.getNullable();
        if (context == null) return new MeResponse(userView, null, false);
        TenantEntity tenant = tenantRepository.findById(context.tenantId()).orElseThrow();
        TenantMembershipEntity membership = membershipRepository.findByTenantIdAndUserId(context.tenantId(), userId).orElseThrow();
        TenantPlacementEntity placement = placementRepository.findByTenantId(context.tenantId()).orElseThrow();
        TenantView tenantView = new TenantView(
                tenant.getId(), tenant.getSlug(), tenant.getName(), tenant.getTier(), tenant.getStatus(),
                placement.getPlacementType(), membership.getRole());
        return new MeResponse(userView, tenantView, true);
    }

    private void addSessionCookies(HttpServletResponse response, AuthService.IssuedTenantSession issued) {
        boolean secure = !properties.baseDomain().equals("localhost");
        ResponseCookie refresh = ResponseCookie.from(REFRESH_COOKIE, issued.refreshToken())
                .httpOnly(true).secure(secure).sameSite("Lax").path("/api/v1/auth")
                .maxAge(properties.jwt().refreshTtl()).build();
        ResponseCookie csrf = ResponseCookie.from(CSRF_COOKIE, issued.csrfToken())
                .httpOnly(false).secure(secure).sameSite("Lax").path("/")
                .maxAge(properties.jwt().refreshTtl()).build();
        response.addHeader(HttpHeaders.SET_COOKIE, refresh.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, csrf.toString());
    }

    private void clearCookies(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from(REFRESH_COOKIE, "")
                .path("/api/v1/auth").maxAge(Duration.ZERO).build().toString());
        response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from(CSRF_COOKIE, "")
                .path("/").maxAge(Duration.ZERO).build().toString());
    }

    private boolean constantTimeEquals(String left, String right) {
        if (left == null || right == null || left.length() != right.length()) return false;
        int diff = 0;
        for (int i = 0; i < left.length(); i++) diff |= left.charAt(i) ^ right.charAt(i);
        return diff == 0;
    }
}
