package vn.edu.ctu.saas.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.control.PaymentStatus;
import vn.edu.ctu.saas.control.PaymentTransactionEntity;
import vn.edu.ctu.saas.control.PaymentTransactionRepository;
import vn.edu.ctu.saas.control.ProvisioningEventEntity;
import vn.edu.ctu.saas.control.ProvisioningEventRepository;
import vn.edu.ctu.saas.control.ProvisioningJobEntity;
import vn.edu.ctu.saas.control.ProvisioningJobRepository;
import vn.edu.ctu.saas.control.ProvisioningStatus;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.provisioning.ProvisioningEventRecorder;
import vn.edu.ctu.saas.tenant.TenantPlacement;
import vn.edu.ctu.saas.tenant.TenantStatus;

class AdminServiceTest {
    private static final UUID TENANT_ID = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID JOB_ID = UUID.fromString("20000000-0000-0000-0000-000000000001");

    private TenantRepository tenants;
    private TenantPlacementRepository placements;
    private TenantMembershipRepository memberships;
    private ProvisioningJobRepository jobs;
    private ProvisioningEventRepository events;
    private PaymentTransactionRepository payments;
    private ProvisioningEventRecorder recorder;
    private AdminService service;

    @BeforeEach
    void setUp() {
        tenants = mock(TenantRepository.class);
        placements = mock(TenantPlacementRepository.class);
        memberships = mock(TenantMembershipRepository.class);
        jobs = mock(ProvisioningJobRepository.class);
        events = mock(ProvisioningEventRepository.class);
        payments = mock(PaymentTransactionRepository.class);
        recorder = mock(ProvisioningEventRecorder.class);
        service = new AdminService(tenants, placements, memberships, jobs, events, payments, recorder);
    }

    @Test
    void tenantListAppliesStatusAndPlacementAndIncludesLatestPayment() {
        TenantEntity tenant = tenant();
        TenantPlacementEntity placement = placement();
        ProvisioningJobEntity job = job(ProvisioningStatus.SUCCEEDED);
        PaymentTransactionEntity payment = payment();
        when(tenants.searchForAdmin(
                org.mockito.ArgumentMatchers.eq("alpha"),
                org.mockito.ArgumentMatchers.eq(TenantStatus.ACTIVE),
                org.mockito.ArgumentMatchers.eq(TenantPlacement.POOL),
                any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(tenant)));
        when(placements.findByTenantId(TENANT_ID)).thenReturn(Optional.of(placement));
        when(jobs.findTopByTenantIdOrderByCreatedAtDesc(TENANT_ID)).thenReturn(Optional.of(job));
        when(payments.findTopByTenantIdOrderByCreatedAtDesc(TENANT_ID)).thenReturn(Optional.of(payment));
        when(memberships.countByTenantIdAndActiveTrue(TENANT_ID)).thenReturn(3L);

        AdminService.PageView<AdminService.AdminTenantView> result = service.tenants(
                0, 20, " alpha ", TenantStatus.ACTIVE, TenantPlacement.POOL);

        assertThat(result.items()).singleElement().satisfies(view -> {
            assertThat(view.slug()).isEqualTo("alpha");
            assertThat(view.placement()).isEqualTo(TenantPlacement.POOL);
            assertThat(view.paymentStatus()).isEqualTo(PaymentStatus.SUCCEEDED);
            assertThat(view.paymentProvider()).isEqualTo("fake-local");
            assertThat(view.memberCount()).isEqualTo(3);
        });
    }

    @Test
    void tenantDetailIncludesPaymentProvisioningAndOrderedEvents() {
        TenantEntity tenant = tenant();
        ProvisioningJobEntity job = job(ProvisioningStatus.SUCCEEDED);
        ProvisioningEventEntity event = new ProvisioningEventEntity();
        event.setId(UUID.fromString("30000000-0000-0000-0000-000000000001"));
        event.setProvisioningJobId(JOB_ID);
        event.setTenantId(TENANT_ID);
        event.setFromStatus(ProvisioningStatus.RUNNING);
        event.setToStatus(ProvisioningStatus.SUCCEEDED);
        event.setAttempt(1);
        event.setMessage("Local provisioning completed");
        when(tenants.findById(TENANT_ID)).thenReturn(Optional.of(tenant));
        when(jobs.findTopByTenantIdOrderByCreatedAtDesc(TENANT_ID)).thenReturn(Optional.of(job));
        when(payments.findTopByTenantIdOrderByCreatedAtDesc(TENANT_ID)).thenReturn(Optional.of(payment()));
        when(events.findAllByProvisioningJobIdOrderByCreatedAt(JOB_ID)).thenReturn(List.of(event));
        when(placements.findByTenantId(TENANT_ID)).thenReturn(Optional.of(placement()));

        AdminService.AdminTenantDetailView result = service.tenant(TENANT_ID);

        assertThat(result.payment().status()).isEqualTo(PaymentStatus.SUCCEEDED);
        assertThat(result.provisioning().status()).isEqualTo(ProvisioningStatus.SUCCEEDED);
        assertThat(result.events()).singleElement().satisfies(view -> {
            assertThat(view.fromStatus()).isEqualTo(ProvisioningStatus.RUNNING);
            assertThat(view.toStatus()).isEqualTo(ProvisioningStatus.SUCCEEDED);
            assertThat(view.message()).isEqualTo("Local provisioning completed");
        });
    }

    @Test
    void retryRejectsACompletedProvisioningJobWithoutMutation() {
        TenantEntity tenant = tenant();
        ProvisioningJobEntity job = job(ProvisioningStatus.SUCCEEDED);
        when(tenants.findById(TENANT_ID)).thenReturn(Optional.of(tenant));
        when(jobs.findTopByTenantIdOrderByCreatedAtDesc(TENANT_ID)).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> service.retryProvisioning(TENANT_ID))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("not retryable");

        assertThat(job.getStatus()).isEqualTo(ProvisioningStatus.SUCCEEDED);
        verify(jobs, never()).save(any());
        verify(tenants, never()).save(any());
    }

    private TenantEntity tenant() {
        TenantEntity tenant = new TenantEntity();
        tenant.setId(TENANT_ID);
        tenant.setName("Alpha workspace");
        tenant.setSlug("alpha");
        tenant.setTier("STARTER");
        tenant.setStatus(TenantStatus.ACTIVE);
        return tenant;
    }

    private TenantPlacementEntity placement() {
        TenantPlacementEntity placement = new TenantPlacementEntity();
        placement.setTenantId(TENANT_ID);
        placement.setPlacementType(TenantPlacement.POOL);
        return placement;
    }

    private ProvisioningJobEntity job(ProvisioningStatus status) {
        ProvisioningJobEntity job = new ProvisioningJobEntity();
        job.setId(JOB_ID);
        job.setTenantId(TENANT_ID);
        job.setStatus(status);
        job.setAttempts(1);
        return job;
    }

    private PaymentTransactionEntity payment() {
        PaymentTransactionEntity payment = new PaymentTransactionEntity();
        payment.setId(UUID.fromString("40000000-0000-0000-0000-000000000001"));
        payment.setTenantId(TENANT_ID);
        payment.setProvider("fake-local");
        payment.setStatus(PaymentStatus.SUCCEEDED);
        payment.setAmountMinor(99_000);
        payment.setCurrency("VND");
        return payment;
    }
}
