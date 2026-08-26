package vn.edu.ctu.saas.tenant;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.ctu.saas.auth.AuthDtos.TenantView;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.common.NotFoundException;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.control.UserAccountEntity;
import vn.edu.ctu.saas.control.UserAccountRepository;

@Service
public class TenantManagementService {
    private final TenantRepository tenantRepository;
    private final TenantPlacementRepository placementRepository;
    private final TenantMembershipRepository membershipRepository;
    private final UserAccountRepository userRepository;

    public TenantManagementService(
            TenantRepository tenantRepository,
            TenantPlacementRepository placementRepository,
            TenantMembershipRepository membershipRepository,
            UserAccountRepository userRepository) {
        this.tenantRepository = tenantRepository;
        this.placementRepository = placementRepository;
        this.membershipRepository = membershipRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public TenantView create(UUID ownerId, String slugInput, String name, String tier, TenantPlacement placementType) {
        String slug = slugInput.trim().toLowerCase(Locale.ROOT);
        if (!slug.matches("[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?")) {
            throw new IllegalArgumentException("Slug must be a valid DNS label");
        }
        if (slug.equals("accounts") || slug.equals("www") || tenantRepository.existsBySlug(slug)) {
            throw new ConflictException("Tenant slug is unavailable");
        }
        userRepository.findById(ownerId).orElseThrow(() -> new NotFoundException("Owner not found"));
        String normalizedTier = tier.trim().toUpperCase(Locale.ROOT);
        if (!List.of("STARTER", "PROFESSIONAL", "ENTERPRISE").contains(normalizedTier)) {
            throw new IllegalArgumentException("Unsupported tenant tier");
        }
        TenantEntity tenant = new TenantEntity();
        tenant.setSlug(slug);
        tenant.setName(name.trim());
        tenant.setTier(normalizedTier);
        tenant.setStatus(TenantStatus.PENDING_PAYMENT);
        tenantRepository.save(tenant);

        TenantPlacementEntity placement = new TenantPlacementEntity();
        placement.setTenantId(tenant.getId());
        placement.setPlacementType(placementType);
        placementRepository.save(placement);

        TenantMembershipEntity membership = new TenantMembershipEntity();
        membership.setTenantId(tenant.getId());
        membership.setUserId(ownerId);
        membership.setRole(TenantRole.OWNER);
        membershipRepository.save(membership);
        return view(tenant, placement, membership);
    }

    @Transactional(readOnly = true)
    public List<MemberView> members(TenantContext context) {
        return membershipRepository.findAllByTenantIdAndActiveTrue(context.tenantId()).stream()
                .map(membership -> {
                    UserAccountEntity user = userRepository.findById(membership.getUserId()).orElseThrow();
                    return new MemberView(
                            membership.getId(), user.getId(), user.getEmail(), user.getDisplayName(),
                            membership.getRole(), membership.isActive(), membership.getSecurityVersion());
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TenantView> tenantViews(UUID userId) {
        return membershipRepository.findAllByUserIdAndActiveTrue(userId).stream()
                .map(membership -> {
                    TenantEntity tenant = tenantRepository.findById(membership.getTenantId()).orElseThrow();
                    TenantPlacementEntity placement = placementRepository.findByTenantId(tenant.getId()).orElseThrow();
                    return view(tenant, placement, membership);
                })
                .toList();
    }

    @Transactional
    public MemberView updateMember(TenantContext context, UUID memberId, TenantRole role, boolean active) {
        requireAdmin(context);
        TenantMembershipEntity membership = membershipRepository.findById(memberId)
                .filter(item -> item.getTenantId().equals(context.tenantId()))
                .orElseThrow(() -> new NotFoundException("Membership not found"));
        if (role == TenantRole.OWNER && membership.getRole() != TenantRole.OWNER) {
            throw new ConflictException("Ownership transfer requires the dedicated ownership workflow");
        }
        if (membership.getRole() == TenantRole.OWNER && (!active || role != TenantRole.OWNER)) {
            throw new ConflictException("The tenant owner cannot be demoted or revoked");
        }
        if (!context.hasAnyRole(TenantRole.OWNER)
                && context.hasAnyRole(TenantRole.ADMIN)
                && membership.getRole() == TenantRole.ADMIN
                && (membership.getRole() != role || membership.isActive() != active)) {
            throw new TenantAccessDeniedException("Only the tenant owner can modify an administrator");
        }
        if (membership.getRole() != role || membership.isActive() != active) {
            membership.setRole(role);
            membership.setActive(active);
            membership.setSecurityVersion(membership.getSecurityVersion() + 1);
            membershipRepository.save(membership);
        }
        UserAccountEntity user = userRepository.findById(membership.getUserId()).orElseThrow();
        return new MemberView(
                membership.getId(), user.getId(), user.getEmail(), user.getDisplayName(), membership.getRole(),
                membership.isActive(), membership.getSecurityVersion());
    }

    @Transactional
    public MemberView inviteExistingUser(TenantContext context, String email, TenantRole role) {
        requireAdmin(context);
        if (role == TenantRole.OWNER) throw new ConflictException("Only one tenant owner is supported");
        UserAccountEntity user = userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new NotFoundException("User must register before being invited"));
        TenantMembershipEntity membership = membershipRepository
                .findByTenantIdAndUserId(context.tenantId(), user.getId())
                .orElseGet(() -> {
                    TenantMembershipEntity created = new TenantMembershipEntity();
                    created.setTenantId(context.tenantId());
                    created.setUserId(user.getId());
                    return created;
                });
        if (membership.isActive() && membership.getId() != null) {
            throw new ConflictException("User is already an active tenant member");
        }
        membership.setRole(role);
        membership.setActive(true);
        if (membership.getId() != null) membership.setSecurityVersion(membership.getSecurityVersion() + 1);
        membershipRepository.save(membership);
        return new MemberView(
                membership.getId(), user.getId(), user.getEmail(), user.getDisplayName(),
                membership.getRole(), membership.isActive(), membership.getSecurityVersion());
    }

    @Transactional
    public MemberView changeRole(TenantContext context, UUID membershipId, TenantRole role) {
        return updateMember(context, membershipId, role, true);
    }

    @Transactional
    public void revoke(TenantContext context, UUID membershipId) {
        requireAdmin(context);
        TenantMembershipEntity membership = membershipRepository.findById(membershipId)
                .filter(item -> item.getTenantId().equals(context.tenantId()))
                .orElseThrow(() -> new NotFoundException("Membership not found"));
        updateMember(context, membershipId, membership.getRole(), false);
    }

    private void requireAdmin(TenantContext context) {
        if (!context.hasAnyRole(TenantRole.OWNER, TenantRole.ADMIN)) {
            throw new TenantAccessDeniedException("Tenant administrator role is required");
        }
    }

    private TenantView view(TenantEntity tenant, TenantPlacementEntity placement, TenantMembershipEntity membership) {
        return new TenantView(
                tenant.getId(), tenant.getSlug(), tenant.getName(), tenant.getTier(), tenant.getStatus(),
                placement.getPlacementType(), membership.getRole());
    }

    public record MemberView(
            UUID membershipId,
            UUID userId,
            String email,
            String displayName,
            TenantRole role,
            boolean active,
            long securityVersion) {}
}
