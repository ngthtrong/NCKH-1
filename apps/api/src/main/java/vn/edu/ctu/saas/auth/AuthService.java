package vn.edu.ctu.saas.auth;

import static vn.edu.ctu.saas.auth.AuthDtos.*;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.common.NotFoundException;
import vn.edu.ctu.saas.config.AppProperties;
import vn.edu.ctu.saas.control.RefreshSessionEntity;
import vn.edu.ctu.saas.control.RefreshSessionRepository;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.control.TenantSessionGrantEntity;
import vn.edu.ctu.saas.control.TenantSessionGrantRepository;
import vn.edu.ctu.saas.control.UserAccountEntity;
import vn.edu.ctu.saas.control.UserAccountRepository;
import vn.edu.ctu.saas.security.JwtTokenService;
import vn.edu.ctu.saas.security.TokenHasher;
import vn.edu.ctu.saas.tenant.TenantStatus;

@Service
public class AuthService {
    private final UserAccountRepository userRepository;
    private final TenantRepository tenantRepository;
    private final TenantMembershipRepository membershipRepository;
    private final TenantPlacementRepository placementRepository;
    private final TenantSessionGrantRepository grantRepository;
    private final RefreshSessionRepository refreshRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final TokenHasher tokenHasher;
    private final AppProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            UserAccountRepository userRepository,
            TenantRepository tenantRepository,
            TenantMembershipRepository membershipRepository,
            TenantPlacementRepository placementRepository,
            TenantSessionGrantRepository grantRepository,
            RefreshSessionRepository refreshRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenService jwtTokenService,
            TokenHasher tokenHasher,
            AppProperties properties) {
        this.userRepository = userRepository;
        this.tenantRepository = tenantRepository;
        this.membershipRepository = membershipRepository;
        this.placementRepository = placementRepository;
        this.grantRepository = grantRepository;
        this.refreshRepository = refreshRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
        this.tokenHasher = tokenHasher;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        UserAccountEntity user = userRepository.findByEmailIgnoreCase(request.email().trim())
                .filter(UserAccountEntity::isEnabled)
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials");
        }
        return new LoginResponse(
                jwtTokenService.globalToken(user),
                properties.jwt().globalTtl().toSeconds(),
                userView(user),
                tenantViews(user.getId()));
    }

    @Transactional
    public LoginResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String displayName = request.displayName().trim();
        if (displayName.length() < 2) {
            throw new IllegalArgumentException("Display name must contain at least 2 characters");
        }
        int passwordBytes = request.password().getBytes(StandardCharsets.UTF_8).length;
        if (passwordBytes > 72) {
            throw new IllegalArgumentException("Password must not exceed 72 UTF-8 bytes");
        }
        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new ConflictException("An account with this email already exists");
        }

        UserAccountEntity user = new UserAccountEntity();
        user.setEmail(email);
        user.setDisplayName(displayName);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setEnabled(true);
        user.setSystemAdmin(false);
        try {
            user = userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            throw new ConflictException("An account with this email already exists");
        }
        return new LoginResponse(
                jwtTokenService.globalToken(user),
                properties.jwt().globalTtl().toSeconds(),
                userView(user),
                List.of());
    }

    @Transactional
    public TenantTransferResponse createTransfer(UUID userId, String tenantSlug, String tenantBaseUrl) {
        TenantEntity tenant = tenantRepository.findBySlug(tenantSlug)
                .orElseThrow(() -> new NotFoundException("Tenant not found"));
        membershipRepository.findByTenantIdAndUserId(tenant.getId(), userId)
                .filter(TenantMembershipEntity::isActive)
                .orElseThrow(() -> new BadCredentialsException("Active membership is required"));
        String code = randomToken(32);
        TenantSessionGrantEntity grant = new TenantSessionGrantEntity();
        grant.setCodeHash(tokenHasher.sha256(code));
        grant.setUserId(userId);
        grant.setTenantId(tenant.getId());
        grant.setExpiresAt(Instant.now().plusSeconds(60));
        grantRepository.save(grant);
        return new TenantTransferResponse(
                code, tenantBaseUrl + "/auth/exchange?code=" + code, 60);
    }

    @Transactional
    public IssuedTenantSession exchange(String code, String hostSlug) {
        TenantSessionGrantEntity grant = grantRepository.findByCodeHash(tokenHasher.sha256(code))
                .orElseThrow(() -> new BadCredentialsException("Transfer code is invalid"));
        if (grant.getConsumedAt() != null || grant.getExpiresAt().isBefore(Instant.now())) {
            throw new BadCredentialsException("Transfer code is expired or already used");
        }
        TenantEntity tenant = tenantRepository.findById(grant.getTenantId())
                .orElseThrow(() -> new NotFoundException("Tenant not found"));
        if (tenant.getStatus() != TenantStatus.ACTIVE) {
            throw new BadCredentialsException("Tenant is not active");
        }
        if (!tenant.getSlug().equals(hostSlug)) {
            throw new BadCredentialsException("Transfer code does not match tenant host");
        }
        TenantMembershipEntity membership = activeMembership(tenant.getId(), grant.getUserId());
        TenantPlacementEntity placement = placementRepository.findByTenantId(tenant.getId())
                .orElseThrow(() -> new NotFoundException("Tenant placement not found"));
        UserAccountEntity user = userRepository.findById(grant.getUserId())
                .orElseThrow(() -> new NotFoundException("User not found"));
        grant.setConsumedAt(Instant.now());
        grantRepository.save(grant);
        return issue(user, tenant, membership, placement);
    }

    @Transactional
    public IssuedTenantSession refresh(String refreshToken) {
        RefreshSessionEntity session = refreshRepository.findByTokenHash(tokenHasher.sha256(refreshToken))
                .orElseThrow(() -> new BadCredentialsException("Refresh session is invalid"));
        if (session.getRevokedAt() != null || session.getExpiresAt().isBefore(Instant.now())) {
            throw new BadCredentialsException("Refresh session is expired or revoked");
        }
        session.setRevokedAt(Instant.now());
        refreshRepository.save(session);
        UserAccountEntity user = userRepository.findById(session.getUserId())
                .filter(UserAccountEntity::isEnabled)
                .orElseThrow(() -> new BadCredentialsException("User is disabled"));
        TenantEntity tenant = tenantRepository.findById(session.getTenantId())
                .orElseThrow(() -> new NotFoundException("Tenant not found"));
        TenantMembershipEntity membership = activeMembership(tenant.getId(), user.getId());
        TenantPlacementEntity placement = placementRepository.findByTenantId(tenant.getId())
                .orElseThrow(() -> new NotFoundException("Tenant placement not found"));
        return issue(user, tenant, membership, placement);
    }

    @Transactional
    public void revoke(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) return;
        refreshRepository.findByTokenHash(tokenHasher.sha256(refreshToken)).ifPresent(session -> {
            session.setRevokedAt(Instant.now());
            refreshRepository.save(session);
        });
    }

    @Transactional(readOnly = true)
    public List<TenantView> tenantViews(UUID userId) {
        return membershipRepository.findAllByUserIdAndActiveTrue(userId).stream()
                .map(membership -> {
                    TenantEntity tenant = tenantRepository.findById(membership.getTenantId()).orElseThrow();
                    TenantPlacementEntity placement = placementRepository.findByTenantId(tenant.getId()).orElseThrow();
                    return tenantView(tenant, placement, membership);
                })
                .toList();
    }

    private IssuedTenantSession issue(
            UserAccountEntity user,
            TenantEntity tenant,
            TenantMembershipEntity membership,
            TenantPlacementEntity placement) {
        String rawRefresh = randomToken(48);
        RefreshSessionEntity refresh = new RefreshSessionEntity();
        refresh.setTokenHash(tokenHasher.sha256(rawRefresh));
        refresh.setUserId(user.getId());
        refresh.setTenantId(tenant.getId());
        refresh.setExpiresAt(Instant.now().plus(properties.jwt().refreshTtl()));
        refreshRepository.save(refresh);
        String csrf = randomToken(24);
        TenantSessionResponse response = new TenantSessionResponse(
                jwtTokenService.tenantToken(user, tenant, membership, placement),
                properties.jwt().accessTtl().toSeconds(),
                userView(user),
                tenantView(tenant, placement, membership));
        return new IssuedTenantSession(response, rawRefresh, csrf);
    }

    private TenantMembershipEntity activeMembership(UUID tenantId, UUID userId) {
        return membershipRepository.findByTenantIdAndUserId(tenantId, userId)
                .filter(TenantMembershipEntity::isActive)
                .orElseThrow(() -> new BadCredentialsException("Active membership is required"));
    }

    private String randomToken(int bytes) {
        byte[] value = new byte[bytes];
        secureRandom.nextBytes(value);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }

    private UserView userView(UserAccountEntity user) {
        return new UserView(
                user.getId(), user.getEmail(), user.getDisplayName(),
                user.isSystemAdmin() ? List.of("SYSTEM_ADMIN") : List.of());
    }

    private TenantView tenantView(
            TenantEntity tenant,
            TenantPlacementEntity placement,
            TenantMembershipEntity membership) {
        return new TenantView(
                tenant.getId(), tenant.getSlug(), tenant.getName(), tenant.getTier(), tenant.getStatus(),
                placement.getPlacementType(), membership.getRole());
    }

    public record IssuedTenantSession(TenantSessionResponse response, String refreshToken, String csrfToken) {}
}
