package vn.edu.ctu.saas.tenant;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.common.NotFoundException;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantInvitationEntity;
import vn.edu.ctu.saas.control.TenantInvitationRepository;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.control.UserAccountEntity;
import vn.edu.ctu.saas.control.UserAccountRepository;
import vn.edu.ctu.saas.security.TokenHasher;

@Service
public class TenantInvitationService {
    private static final Duration INVITATION_TTL = Duration.ofDays(7);

    private final TenantInvitationRepository invitationRepository;
    private final TenantMembershipRepository membershipRepository;
    private final TenantRepository tenantRepository;
    private final UserAccountRepository userRepository;
    private final TokenHasher tokenHasher;
    private final SecureRandom secureRandom = new SecureRandom();

    public TenantInvitationService(
            TenantInvitationRepository invitationRepository,
            TenantMembershipRepository membershipRepository,
            TenantRepository tenantRepository,
            UserAccountRepository userRepository,
            TokenHasher tokenHasher) {
        this.invitationRepository = invitationRepository;
        this.membershipRepository = membershipRepository;
        this.tenantRepository = tenantRepository;
        this.userRepository = userRepository;
        this.tokenHasher = tokenHasher;
    }

    @Transactional
    public InvitationCreatedView create(TenantContext context, String emailInput, TenantRole role) {
        requireAdmin(context);
        if (role == TenantRole.OWNER) {
            throw new ConflictException("Ownership must use the dedicated transfer workflow");
        }
        String email = normalizeEmail(emailInput);
        TenantEntity tenant = activeTenant(context.tenantId());
        userRepository.findByEmailIgnoreCase(email).ifPresent(user ->
                membershipRepository.findByTenantIdAndUserId(tenant.getId(), user.getId())
                        .filter(TenantMembershipEntity::isActive)
                        .ifPresent(membership -> {
                            throw new ConflictException("User is already an active tenant member");
                        }));

        TenantInvitationEntity prior = invitationRepository
                .findTopByTenantIdAndEmailAndStatusOrderByCreatedAtDesc(
                        tenant.getId(), email, TenantInvitationStatus.PENDING)
                .orElse(null);
        if (prior != null && prior.getExpiresAt().isAfter(Instant.now())) {
            throw new ConflictException("A pending invitation already exists for this email");
        }
        if (prior != null) {
            prior.setStatus(TenantInvitationStatus.EXPIRED);
            prior.setRespondedAt(Instant.now());
            invitationRepository.saveAndFlush(prior);
        }

        String token = randomToken();
        TenantInvitationEntity invitation = new TenantInvitationEntity();
        invitation.setTenantId(tenant.getId());
        invitation.setEmail(email);
        invitation.setRole(role);
        invitation.setTokenHash(tokenHasher.sha256(token));
        invitation.setStatus(TenantInvitationStatus.PENDING);
        invitation.setInvitedBy(context.userId());
        invitation.setExpiresAt(Instant.now().plus(INVITATION_TTL));
        try {
            invitation = invitationRepository.saveAndFlush(invitation);
        } catch (DataIntegrityViolationException exception) {
            throw new ConflictException("A pending invitation already exists for this email");
        }
        return new InvitationCreatedView(view(invitation, tenant), token, "/invitations/" + token);
    }

    @Transactional
    public List<InvitationView> list(TenantContext context) {
        requireAdmin(context);
        TenantEntity tenant = tenantRepository.findById(context.tenantId())
                .orElseThrow(() -> new NotFoundException("Tenant not found"));
        List<TenantInvitationEntity> invitations = invitationRepository
                .findAllByTenantIdOrderByCreatedAtDesc(context.tenantId());
        Instant now = Instant.now();
        invitations.stream()
                .filter(invitation -> invitation.getStatus() == TenantInvitationStatus.PENDING)
                .filter(invitation -> !invitation.getExpiresAt().isAfter(now))
                .forEach(invitation -> {
                    invitation.setStatus(TenantInvitationStatus.EXPIRED);
                    invitation.setRespondedAt(now);
                });
        invitationRepository.saveAll(invitations);
        return invitations.stream().map(invitation -> view(invitation, tenant)).toList();
    }

    @Transactional
    public void revoke(TenantContext context, UUID invitationId) {
        requireAdmin(context);
        TenantInvitationEntity invitation = invitationRepository.findById(invitationId)
                .filter(candidate -> candidate.getTenantId().equals(context.tenantId()))
                .orElseThrow(() -> new NotFoundException("Invitation not found"));
        expireIfNeeded(invitation);
        if (invitation.getStatus() == TenantInvitationStatus.REVOKED) return;
        if (invitation.getStatus() != TenantInvitationStatus.PENDING) {
            throw new ConflictException("Only a pending invitation can be revoked");
        }
        invitation.setStatus(TenantInvitationStatus.REVOKED);
        invitation.setRespondedAt(Instant.now());
        invitationRepository.save(invitation);
    }

    @Transactional
    public InvitationView preview(String rawToken) {
        TenantInvitationEntity invitation = invitation(rawToken);
        expireIfNeeded(invitation);
        TenantEntity tenant = tenantRepository.findById(invitation.getTenantId())
                .orElseThrow(() -> new NotFoundException("Tenant not found"));
        return view(invitation, tenant);
    }

    @Transactional
    public InvitationView accept(String rawToken, UUID userId) {
        TenantInvitationEntity invitation = invitationForUser(rawToken, userId, true);
        TenantEntity tenant = activeTenant(invitation.getTenantId());
        expireIfNeeded(invitation);
        if (invitation.getStatus() == TenantInvitationStatus.ACCEPTED) {
            if (!userId.equals(invitation.getAcceptedByUserId())) {
                throw new TenantAccessDeniedException("Invitation belongs to another account");
            }
            return view(invitation, tenant);
        }
        if (invitation.getStatus() != TenantInvitationStatus.PENDING) {
            throw new ConflictException("Invitation can no longer be accepted");
        }

        TenantMembershipEntity membership = membershipRepository
                .findByTenantIdAndUserId(tenant.getId(), userId)
                .orElseGet(() -> {
                    TenantMembershipEntity created = new TenantMembershipEntity();
                    created.setTenantId(tenant.getId());
                    created.setUserId(userId);
                    created.setRole(invitation.getRole());
                    return created;
                });
        if (!membership.isActive() || membership.getId() == null) {
            membership.setRole(invitation.getRole());
            membership.setActive(true);
            if (membership.getId() != null) {
                membership.setSecurityVersion(membership.getSecurityVersion() + 1);
            }
            membershipRepository.save(membership);
        }
        invitation.setStatus(TenantInvitationStatus.ACCEPTED);
        invitation.setAcceptedByUserId(userId);
        invitation.setRespondedAt(Instant.now());
        invitationRepository.save(invitation);
        return view(invitation, tenant);
    }

    @Transactional
    public InvitationView reject(String rawToken, UUID userId) {
        TenantInvitationEntity invitation = invitationForUser(rawToken, userId, true);
        TenantEntity tenant = tenantRepository.findById(invitation.getTenantId())
                .orElseThrow(() -> new NotFoundException("Tenant not found"));
        expireIfNeeded(invitation);
        if (invitation.getStatus() == TenantInvitationStatus.REJECTED) return view(invitation, tenant);
        if (invitation.getStatus() != TenantInvitationStatus.PENDING) {
            throw new ConflictException("Invitation can no longer be rejected");
        }
        invitation.setStatus(TenantInvitationStatus.REJECTED);
        invitation.setRespondedAt(Instant.now());
        invitationRepository.save(invitation);
        return view(invitation, tenant);
    }

    private TenantInvitationEntity invitationForUser(String rawToken, UUID userId, boolean lock) {
        TenantInvitationEntity invitation = invitation(rawToken, lock);
        UserAccountEntity user = userRepository.findById(userId)
                .filter(UserAccountEntity::isEnabled)
                .orElseThrow(() -> new NotFoundException("User not found"));
        if (!invitation.getEmail().equalsIgnoreCase(user.getEmail())) {
            throw new TenantAccessDeniedException("Invitation belongs to another email address");
        }
        return invitation;
    }

    private TenantInvitationEntity invitation(String rawToken) {
        return invitation(rawToken, false);
    }

    private TenantInvitationEntity invitation(String rawToken, boolean lock) {
        String token = rawToken == null ? "" : rawToken.trim();
        if (token.length() < 32 || token.length() > 200) {
            throw new NotFoundException("Invitation not found");
        }
        String tokenHash = tokenHasher.sha256(token);
        return (lock
                ? invitationRepository.lockByTokenHash(tokenHash)
                : invitationRepository.findByTokenHash(tokenHash))
                .orElseThrow(() -> new NotFoundException("Invitation not found"));
    }

    private void expireIfNeeded(TenantInvitationEntity invitation) {
        if (invitation.getStatus() == TenantInvitationStatus.PENDING
                && !invitation.getExpiresAt().isAfter(Instant.now())) {
            invitation.setStatus(TenantInvitationStatus.EXPIRED);
            invitation.setRespondedAt(Instant.now());
            invitationRepository.save(invitation);
        }
    }

    private TenantEntity activeTenant(UUID tenantId) {
        TenantEntity tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NotFoundException("Tenant not found"));
        if (tenant.getStatus() != TenantStatus.ACTIVE) {
            throw new ConflictException("Tenant must be active to manage invitations");
        }
        return tenant;
    }

    private String normalizeEmail(String email) {
        String normalized = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        if (normalized.isBlank() || normalized.length() > 320) {
            throw new IllegalArgumentException("Invitation email is invalid");
        }
        return normalized;
    }

    private void requireAdmin(TenantContext context) {
        if (!context.hasAnyRole(TenantRole.OWNER, TenantRole.ADMIN)) {
            throw new TenantAccessDeniedException("Tenant administrator role is required");
        }
    }

    private String randomToken() {
        byte[] value = new byte[32];
        secureRandom.nextBytes(value);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }

    private InvitationView view(TenantInvitationEntity invitation, TenantEntity tenant) {
        return new InvitationView(
                invitation.getId(), tenant.getId(), tenant.getSlug(), tenant.getName(), invitation.getEmail(),
                invitation.getRole(), invitation.getStatus(), invitation.getExpiresAt(), invitation.getRespondedAt());
    }

    public record InvitationCreatedView(
            InvitationView invitation,
            String token,
            String acceptancePath) {}

    public record InvitationView(
            UUID id,
            UUID tenantId,
            String tenantSlug,
            String tenantName,
            String email,
            TenantRole role,
            TenantInvitationStatus status,
            Instant expiresAt,
            Instant respondedAt) {}
}
