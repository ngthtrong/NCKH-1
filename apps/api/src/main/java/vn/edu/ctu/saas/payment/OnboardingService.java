package vn.edu.ctu.saas.payment;

import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.ctu.saas.auth.AuthDtos.TenantView;
import vn.edu.ctu.saas.common.NotFoundException;
import vn.edu.ctu.saas.control.PaymentStatus;
import vn.edu.ctu.saas.control.PaymentTransactionEntity;
import vn.edu.ctu.saas.control.PaymentTransactionRepository;
import vn.edu.ctu.saas.control.ProvisioningJobEntity;
import vn.edu.ctu.saas.control.ProvisioningJobRepository;
import vn.edu.ctu.saas.control.ProvisioningStatus;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.tenant.TenantAccessDeniedException;
import vn.edu.ctu.saas.tenant.TenantRole;

@Service
public class OnboardingService {
    private final TenantRepository tenantRepository;
    private final TenantPlacementRepository placementRepository;
    private final TenantMembershipRepository membershipRepository;
    private final PaymentTransactionRepository paymentRepository;
    private final ProvisioningJobRepository provisioningRepository;

    public OnboardingService(
            TenantRepository tenantRepository,
            TenantPlacementRepository placementRepository,
            TenantMembershipRepository membershipRepository,
            PaymentTransactionRepository paymentRepository,
            ProvisioningJobRepository provisioningRepository) {
        this.tenantRepository = tenantRepository;
        this.placementRepository = placementRepository;
        this.membershipRepository = membershipRepository;
        this.paymentRepository = paymentRepository;
        this.provisioningRepository = provisioningRepository;
    }

    @Transactional(readOnly = true)
    public OnboardingView status(UUID userId, UUID tenantId) {
        TenantMembershipEntity membership = membershipRepository.findByTenantIdAndUserId(tenantId, userId)
                .filter(TenantMembershipEntity::isActive)
                .orElseThrow(() -> new NotFoundException("Tenant membership not found"));
        if (membership.getRole() != TenantRole.OWNER && membership.getRole() != TenantRole.ADMIN) {
            throw new TenantAccessDeniedException("Tenant administrator role is required to view onboarding");
        }
        TenantEntity tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NotFoundException("Tenant not found"));
        TenantPlacementEntity placement = placementRepository.findByTenantId(tenantId)
                .orElseThrow(() -> new NotFoundException("Tenant placement not found"));
        PaymentTransactionEntity payment = paymentRepository
                .findTopByTenantIdOrderByCreatedAtDesc(tenantId)
                .orElse(null);
        ProvisioningJobEntity provisioning = provisioningRepository
                .findTopByTenantIdOrderByCreatedAtDesc(tenantId)
                .orElse(null);

        TenantView tenantView = new TenantView(
                tenant.getId(), tenant.getSlug(), tenant.getName(), tenant.getTier(), tenant.getStatus(),
                placement.getPlacementType(), membership.getRole());
        PaymentView paymentView = payment == null ? null : new PaymentView(
                payment.getId(), payment.getProvider(), payment.getStatus(), payment.getAmountMinor(),
                payment.getCurrency());
        ProvisioningView provisioningView = provisioning == null ? null : new ProvisioningView(
                provisioning.getId(), provisioning.getStatus(), provisioning.getAttempts(),
                provisioning.getLastErrorCode(), provisioning.getLastErrorMessage());
        return new OnboardingView(tenantView, paymentView, provisioningView);
    }

    public record OnboardingView(
            TenantView tenant,
            PaymentView payment,
            ProvisioningView provisioning) {}

    public record PaymentView(
            UUID id,
            String provider,
            PaymentStatus status,
            long amountMinor,
            String currency) {}

    public record ProvisioningView(
            UUID id,
            ProvisioningStatus status,
            int attempts,
            String lastErrorCode,
            String lastErrorMessage) {}
}
