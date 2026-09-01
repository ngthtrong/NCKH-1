package vn.edu.ctu.saas.payment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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
import vn.edu.ctu.saas.tenant.TenantPlacement;
import vn.edu.ctu.saas.tenant.TenantRole;
import vn.edu.ctu.saas.tenant.TenantStatus;

class OnboardingServiceTest {
    private final UUID tenantId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();
    private TenantRepository tenants;
    private TenantPlacementRepository placements;
    private TenantMembershipRepository memberships;
    private PaymentTransactionRepository payments;
    private ProvisioningJobRepository provisioning;
    private OnboardingService service;

    @BeforeEach
    void setUp() {
        tenants = mock(TenantRepository.class);
        placements = mock(TenantPlacementRepository.class);
        memberships = mock(TenantMembershipRepository.class);
        payments = mock(PaymentTransactionRepository.class);
        provisioning = mock(ProvisioningJobRepository.class);
        service = new OnboardingService(tenants, placements, memberships, payments, provisioning);
    }

    @Test
    void ownerSeesCurrentPaymentAndProvisioningState() {
        TenantMembershipEntity membership = membership(TenantRole.OWNER);
        TenantEntity tenant = new TenantEntity();
        tenant.setId(tenantId);
        tenant.setSlug("research-team");
        tenant.setName("Research Team");
        tenant.setTier("STARTER");
        tenant.setStatus(TenantStatus.PROVISIONING);
        TenantPlacementEntity placement = new TenantPlacementEntity();
        placement.setTenantId(tenantId);
        placement.setPlacementType(TenantPlacement.POOL);
        PaymentTransactionEntity payment = new PaymentTransactionEntity();
        payment.setId(UUID.randomUUID());
        payment.setTenantId(tenantId);
        payment.setProvider("fake");
        payment.setStatus(PaymentStatus.SUCCEEDED);
        payment.setAmountMinor(100_000);
        payment.setCurrency("VND");
        ProvisioningJobEntity job = new ProvisioningJobEntity();
        job.setId(UUID.randomUUID());
        job.setTenantId(tenantId);
        job.setStatus(ProvisioningStatus.RUNNING);
        job.setAttempts(1);
        when(memberships.findByTenantIdAndUserId(tenantId, userId)).thenReturn(Optional.of(membership));
        when(tenants.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(placements.findByTenantId(tenantId)).thenReturn(Optional.of(placement));
        when(payments.findTopByTenantIdOrderByCreatedAtDesc(tenantId)).thenReturn(Optional.of(payment));
        when(provisioning.findTopByTenantIdOrderByCreatedAtDesc(tenantId)).thenReturn(Optional.of(job));

        OnboardingService.OnboardingView view = service.status(userId, tenantId);

        assertThat(view.tenant().status()).isEqualTo(TenantStatus.PROVISIONING);
        assertThat(view.payment().status()).isEqualTo(PaymentStatus.SUCCEEDED);
        assertThat(view.provisioning().status()).isEqualTo(ProvisioningStatus.RUNNING);
    }

    @Test
    void regularMemberCannotReadOnboardingDetails() {
        when(memberships.findByTenantIdAndUserId(tenantId, userId))
                .thenReturn(Optional.of(membership(TenantRole.MEMBER)));

        assertThatThrownBy(() -> service.status(userId, tenantId))
                .isInstanceOf(TenantAccessDeniedException.class)
                .hasMessageContaining("administrator role");

        verifyNoInteractions(tenants, placements, payments, provisioning);
    }

    private TenantMembershipEntity membership(TenantRole role) {
        TenantMembershipEntity membership = new TenantMembershipEntity();
        membership.setTenantId(tenantId);
        membership.setUserId(userId);
        membership.setRole(role);
        membership.setActive(true);
        return membership;
    }
}
