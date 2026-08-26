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
import vn.edu.ctu.saas.control.ProvisioningStatus;
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
    private final ProvisioningEventRecorder eventRecorder;

    public AdminService(
            TenantRepository tenantRepository,
            TenantPlacementRepository placementRepository,
            TenantMembershipRepository membershipRepository,
            ProvisioningJobRepository jobRepository,
            ProvisioningEventRecorder eventRecorder) {
        this.tenantRepository = tenantRepository;
        this.placementRepository = placementRepository;
        this.membershipRepository = membershipRepository;
        this.jobRepository = jobRepository;
        this.eventRecorder = eventRecorder;
    }

    @Transactional(readOnly = true)
    public PageView<AdminTenantView> tenants(int page, int size, String search) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(100, Math.max(1, size));
        PageRequest pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        String normalized = search == null ? "" : search.trim();
        Page<TenantEntity> result = normalized.isBlank()
                ? tenantRepository.findAll(pageable)
                : tenantRepository.findByNameContainingIgnoreCaseOrSlugContainingIgnoreCase(
                        normalized, normalized, pageable);
        List<AdminTenantView> items = result.getContent().stream().map(this::view).toList();
        return new PageView<>(items, result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    @Transactional
    public void retryProvisioning(UUID tenantId) {
        TenantEntity tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NotFoundException("Tenant not found"));
        ProvisioningJobEntity job = jobRepository.findTopByTenantIdOrderByCreatedAtDesc(tenantId)
                .orElseThrow(() -> new NotFoundException("Provisioning job not found"));
        if (job.getStatus() != ProvisioningStatus.RETRYABLE_FAILED
                && job.getStatus() != ProvisioningStatus.FAILED_ROLLED_BACK) {
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
        return new AdminTenantView(
                tenant.getId(), tenant.getName(), tenant.getSlug(), tenant.getTier(),
                placement == null ? null : placement.getPlacementType(), tenant.getStatus(),
                job == null ? null : job.getStatus(), membershipRepository.countByTenantIdAndActiveTrue(tenant.getId()),
                tenant.getCreatedAt(), job == null ? null : job.getLastErrorMessage());
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
            String lastError) {}

    public record PageView<T>(List<T> items, int page, int size, long totalItems, int totalPages) {}
}
