package vn.edu.ctu.saas.storage;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import vn.edu.ctu.saas.notification.TenantEvent;
import vn.edu.ctu.saas.support.TestAppProperties;

class ResourceDeletionHandlerTest {
    private final ResourceStorage storage = mock(ResourceStorage.class);
    private final ResourceDeletionHandler handler = new ResourceDeletionHandler(storage, new ObjectMapper());

    @Test
    void deletesOnlyStorageKeyNamespacedByEventTenant() {
        UUID tenantId = UUID.randomUUID();
        UUID resourceId = UUID.randomUUID();
        String key = tenantId + "/" + resourceId + "/evidence.csv";

        handler.handle(event(tenantId, resourceId, "{\"storageKey\":\"" + key + "\"}"));

        verify(storage).delete(key);
    }

    @Test
    void rejectsCrossTenantWrongResourceAndTraversalKeys() {
        UUID tenantId = UUID.randomUUID();
        UUID resourceId = UUID.randomUUID();
        UUID foreignTenantId = UUID.randomUUID();
        String foreignKey = foreignTenantId + "/" + resourceId + "/secret.pdf";
        String wrongResourceKey = tenantId + "/" + UUID.randomUUID() + "/secret.pdf";
        String traversalKey = tenantId + "/" + resourceId + "/../../"
                + foreignTenantId + "/" + UUID.randomUUID() + "/secret.pdf";

        assertRejected(tenantId, resourceId, foreignKey);
        assertRejected(tenantId, resourceId, wrongResourceKey);
        assertRejected(tenantId, resourceId, traversalKey);
        verify(storage, never()).delete(anyString());

        FileSystemResourceStorage filesystem = new FileSystemResourceStorage(TestAppProperties.create());
        assertThatThrownBy(() -> filesystem.createDownloadUrl(
                traversalKey, java.time.Duration.ofMinutes(1)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Unsafe storage key");
        assertThatThrownBy(() -> filesystem.delete(traversalKey))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Unsafe storage key");
    }

    private void assertRejected(UUID tenantId, UUID resourceId, String storageKey) {
        assertThatThrownBy(() -> handler.handle(event(
                tenantId, resourceId, "{\"storageKey\":\"" + storageKey + "\"}")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not belong");
    }

    private TenantEvent event(UUID tenantId, UUID resourceId, String payload) {
        return new TenantEvent(
                UUID.randomUUID(), tenantId, UUID.randomUUID(), ResourceDeletionHandler.EVENT_TYPE,
                "RESOURCE", resourceId, "test-correlation", payload, Instant.now());
    }
}
