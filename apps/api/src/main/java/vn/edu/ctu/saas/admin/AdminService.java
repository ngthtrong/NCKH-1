package vn.edu.ctu.saas.admin;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.common.NotFoundException;
import vn.edu.ctu.saas.control.ProvisioningJobEntity;
import vn.edu.ctu.saas.control.ProvisioningJobRepository;
import vn.edu.ctu.saas.control.ProvisioningEventEntity;
import vn.edu.ctu.saas.control.ProvisioningEventRepository;
import vn.edu.ctu.saas.control.ProvisioningStatus;
import vn.edu.ctu.saas.control.PaymentStatus;
import vn.edu.ctu.saas.control.PaymentTransactionEntity;
import vn.edu.ctu.saas.control.PaymentTransactionRepository;
import vn.edu.ctu.saas.provisioning.ProvisioningEventRecorder;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.tenant.TenantPlacement;
import vn.edu.ctu.saas.tenant.TenantStatus;

@Service
public class AdminService {
    private final TenantRepository tenantRepository;
    private final TenantPlacementRepository placementRepository;
    private final TenantMembershipRepository membershipRepository;
    private final ProvisioningJobRepository jobRepository;
    private final ProvisioningEventRepository provisioningEventRepository;
    private final PaymentTransactionRepository paymentRepository;
    private final ProvisioningEventRecorder eventRecorder;

    public AdminService(
            TenantRepository tenantRepository,
            TenantPlacementRepository placementRepository,
            TenantMembershipRepository membershipRepository,
            ProvisioningJobRepository jobRepository,
            ProvisioningEventRepository provisioningEventRepository,
            PaymentTransactionRepository paymentRepository,
            ProvisioningEventRecorder eventRecorder) {
        this.tenantRepository = tenantRepository;
        this.placementRepository = placementRepository;
        this.membershipRepository = membershipRepository;
        this.jobRepository = jobRepository;
        this.provisioningEventRepository = provisioningEventRepository;
        this.paymentRepository = paymentRepository;
        this.eventRecorder = eventRecorder;
    }

    @Transactional(readOnly = true)
    public PageView<AdminTenantView> tenants(
            int page,
            int size,
            String search,
            TenantStatus status,
            TenantPlacement placement) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(100, Math.max(1, size));
        PageRequest pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        String normalized = search == null ? "" : search.trim();
        Page<TenantEntity> result = tenantRepository.searchForAdmin(
                normalized, status, placement, pageable);
        List<AdminTenantView> items = result.getContent().stream().map(this::view).toList();
        return new PageView<>(items, result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public AdminTenantDetailView tenant(UUID tenantId) {
        TenantEntity tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NotFoundException("Tenant not found"));
        PaymentTransactionEntity payment = paymentRepository
                .findTopByTenantIdOrderByCreatedAtDesc(tenantId).orElse(null);
        ProvisioningJobEntity job = jobRepository.findTopByTenantIdOrderByCreatedAtDesc(tenantId).orElse(null);
        List<ProvisioningEventView> events = job == null ? List.of()
                : provisioningEventRepository.findAllByProvisioningJobIdOrderByCreatedAt(job.getId()).stream()
                        .map(this::eventView)
                        .toList();
        return new AdminTenantDetailView(
                view(tenant),
                payment == null ? null : new PaymentAdminView(
                        payment.getId(), payment.getProvider(), payment.getStatus(), payment.getAmountMinor(),
                        payment.getCurrency(), payment.getCreatedAt()),
                job == null ? null : new ProvisioningAdminView(
                        job.getId(), job.getStatus(), job.getAttempts(), job.getLastErrorCode(),
                        job.getLastErrorMessage(), job.getNextAttemptAt(), job.getCreatedAt()),
                events);
    }

    @Transactional
    public void retryProvisioning(UUID tenantId) {
        TenantEntity tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NotFoundException("Tenant not found"));
        ProvisioningJobEntity job = jobRepository.findTopByTenantIdOrderByCreatedAtDesc(tenantId)
                .orElseThrow(() -> new NotFoundException("Provisioning job not found"));
        if (job.getStatus() != ProvisioningStatus.RETRYABLE_FAILED
                && job.getStatus() != ProvisioningStatus.FAILED_ROLLED_BACK
                && job.getStatus() != ProvisioningStatus.ROLLBACK_FAILED) {
            throw new ConflictException("Provisioning job is not retryable in its current state");
        }
        ProvisioningStatus previousStatus = job.getStatus();
        job.setStatus(ProvisioningStatus.QUEUED);
        job.setAttempts(0);
        job.setNextAttemptAt(Instant.now());
        job.setLastErrorCode(null);
        job.setLastErrorMessage(null);
        job.setLeaseOwner(null);
        job.setLeaseToken(null);
        job.setLeaseExpiresAt(null);
        tenant.setStatus(TenantStatus.PROVISIONING);
        tenantRepository.save(tenant);
        jobRepository.save(job);
        eventRecorder.record(job, previousStatus, ProvisioningStatus.QUEUED, null, "Manual retry requested");
    }

    private AdminTenantView view(TenantEntity tenant) {
        TenantPlacementEntity placement = placementRepository.findByTenantId(tenant.getId()).orElse(null);
        ProvisioningJobEntity job = jobRepository.findTopByTenantIdOrderByCreatedAtDesc(tenant.getId()).orElse(null);
        PaymentTransactionEntity payment = paymentRepository
                .findTopByTenantIdOrderByCreatedAtDesc(tenant.getId()).orElse(null);
        return new AdminTenantView(
                tenant.getId(), tenant.getName(), tenant.getSlug(), tenant.getTier(),
                placement == null ? null : placement.getPlacementType(), tenant.getStatus(),
                job == null ? null : job.getStatus(), membershipRepository.countByTenantIdAndActiveTrue(tenant.getId()),
                tenant.getCreatedAt(), job == null ? null : job.getLastErrorMessage(),
                payment == null ? null : payment.getStatus(), payment == null ? null : payment.getProvider());
    }

    private ProvisioningEventView eventView(ProvisioningEventEntity event) {
        return new ProvisioningEventView(
                event.getId(), event.getFromStatus(), event.getToStatus(), event.getAttempt(),
                event.getErrorCode(), event.getMessage(), event.getCreatedAt());
    }

    public record AdminTenantView(
            UUID id,
            String name,
            String slug,
            String tier,
            TenantPlacement placement,
            TenantStatus status,
            ProvisioningStatus provisioningStatus,
            long memberCount,
            Instant createdAt,
            String lastError,
            PaymentStatus paymentStatus,
            String paymentProvider) {}

    public record PaymentAdminView(
            UUID id, String provider, PaymentStatus status, long amountMinor, String currency, Instant createdAt) {}

    public record ProvisioningAdminView(
            UUID id,
            ProvisioningStatus status,
            int attempts,
            String lastErrorCode,
            String lastErrorMessage,
            Instant nextAttemptAt,
            Instant createdAt) {}

    public record ProvisioningEventView(
            UUID id,
            ProvisioningStatus fromStatus,
            ProvisioningStatus toStatus,
            int attempt,
            String errorCode,
            String message,
            Instant createdAt) {}

    public record AdminTenantDetailView(
            AdminTenantView tenant,
            PaymentAdminView payment,
            ProvisioningAdminView provisioning,
            List<ProvisioningEventView> events) {}

    public record PageView<T>(List<T> items, int page, int size, long totalItems, int totalPages) {}
}
