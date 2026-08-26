package vn.edu.ctu.saas.storage;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import vn.edu.ctu.saas.notification.TenantEvent;

class ResourceDeletionHandlerTest {
    private final ResourceStorage storage = mock(ResourceStorage.class);
    private final ResourceDeletionHandler handler = new ResourceDeletionHandler(storage, new ObjectMapper());

    @Test
    void deletesOnlyStorageKeyNamespacedByEventTenant() {
        UUID tenantId = UUID.randomUUID();
        String key = tenantId + "/" + UUID.randomUUID() + "/evidence.csv";

        handler.handle(event(tenantId, "{\"storageKey\":\"" + key + "\"}"));

        verify(storage).delete(key);
    }

    @Test
    void rejectsCrossTenantStorageKey() {
        UUID tenantId = UUID.randomUUID();
        String foreignKey = UUID.randomUUID() + "/" + UUID.randomUUID() + "/secret.pdf";

        assertThatThrownBy(() -> handler.handle(event(
                tenantId, "{\"storageKey\":\"" + foreignKey + "\"}")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not belong");
        verify(storage, never()).delete(foreignKey);
    }

    private TenantEvent event(UUID tenantId, String payload) {
        return new TenantEvent(
                UUID.randomUUID(), tenantId, UUID.randomUUID(), ResourceDeletionHandler.EVENT_TYPE,
                "RESOURCE", UUID.randomUUID(), "test-correlation", payload, Instant.now());
    }
}
