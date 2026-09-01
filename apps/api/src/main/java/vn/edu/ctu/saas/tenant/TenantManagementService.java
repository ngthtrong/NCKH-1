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

    @Transactional
    public MemberView transferOwnership(TenantContext context, UUID targetMembershipId) {
        if (!context.hasAnyRole(TenantRole.OWNER)) {
            throw new TenantAccessDeniedException("Only the tenant owner can transfer ownership");
        }
        List<TenantMembershipEntity> activeMemberships = membershipRepository
                .lockActiveByTenantId(context.tenantId());
        TenantMembershipEntity currentOwner = activeMemberships.stream()
                .filter(membership -> membership.getUserId().equals(context.userId()))
                .filter(membership -> membership.getRole() == TenantRole.OWNER)
                .findFirst()
                .orElseThrow(() -> new TenantAccessDeniedException("Current owner membership is unavailable"));
        long owners = activeMemberships.stream()
                .filter(membership -> membership.getRole() == TenantRole.OWNER)
                .count();
        if (owners != 1) {
            throw new ConflictException("Tenant ownership invariant is not satisfied");
        }
        TenantMembershipEntity target = activeMemberships.stream()
                .filter(membership -> membership.getId().equals(targetMembershipId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Active target membership not found"));
        if (target.getId().equals(currentOwner.getId())) {
            throw new ConflictException("Select another active member as the new owner");
        }

        currentOwner.setRole(TenantRole.ADMIN);
        currentOwner.setSecurityVersion(currentOwner.getSecurityVersion() + 1);
        target.setRole(TenantRole.OWNER);
        target.setSecurityVersion(target.getSecurityVersion() + 1);
        membershipRepository.saveAll(List.of(currentOwner, target));

        UserAccountEntity user = userRepository.findById(target.getUserId()).orElseThrow();
        return new MemberView(
                target.getId(), user.getId(), user.getEmail(), user.getDisplayName(), target.getRole(),
                target.isActive(), target.getSecurityVersion());
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
