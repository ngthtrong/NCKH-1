package vn.edu.ctu.saas.provisioning;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.control.ProvisioningJobEntity;
import vn.edu.ctu.saas.control.ProvisioningJobRepository;
import vn.edu.ctu.saas.control.ProvisioningStatus;

class DefaultProvisioningServiceTest {
    @Test
    void enqueueIsIdempotentWithinTenantAndRejectsCrossTenantReuse() {
        ProvisioningJobRepository repository = mock(ProvisioningJobRepository.class);
        ProvisioningEventRecorder recorder = mock(ProvisioningEventRecorder.class);
        DefaultProvisioningService service = new DefaultProvisioningService(repository, recorder);
        UUID tenantId = UUID.randomUUID();

        when(repository.findByIdempotencyKey("provision-001")).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(invocation -> {
            ProvisioningJobEntity job = invocation.getArgument(0);
            job.setId(UUID.randomUUID());
            return job;
        });

        ProvisioningJobEntity created = service.enqueue(tenantId, "provision-001");
        assertThat(created.getStatus()).isEqualTo(ProvisioningStatus.QUEUED);
        verify(recorder).record(created, null, ProvisioningStatus.QUEUED, null, "Provisioning queued");

        when(repository.findByIdempotencyKey("provision-001")).thenReturn(Optional.of(created));
        assertThat(service.enqueue(tenantId, "provision-001")).isSameAs(created);
        assertThatThrownBy(() -> service.enqueue(UUID.randomUUID(), "provision-001"))
                .isInstanceOf(ConflictException.class);
    }
}
