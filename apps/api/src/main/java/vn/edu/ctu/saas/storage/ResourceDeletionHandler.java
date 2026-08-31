package vn.edu.ctu.saas.storage;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import vn.edu.ctu.saas.notification.TenantEvent;

@Component
public class ResourceDeletionHandler {
    public static final String EVENT_TYPE = "RESOURCE_DELETE_REQUESTED";

    private final ResourceStorage storage;
    private final ObjectMapper objectMapper;

    public ResourceDeletionHandler(ResourceStorage storage, ObjectMapper objectMapper) {
        this.storage = storage;
        this.objectMapper = objectMapper;
    }

    public boolean supports(TenantEvent event) {
        return EVENT_TYPE.equals(event.eventType());
    }

    public void handle(TenantEvent event) {
        if (!supports(event)) {
            throw new IllegalArgumentException("Unsupported resource deletion event");
        }
        JsonNode payload;
        try {
            payload = objectMapper.readTree(event.payloadJson());
        } catch (Exception exception) {
            throw new IllegalArgumentException("Invalid resource deletion event payload", exception);
        }
        String storageKey = payload.path("storageKey").asText();
        if (!ResourceStorageKey.belongsTo(storageKey, event.tenantId(), event.aggregateId())) {
            throw new IllegalArgumentException("Resource deletion key does not belong to the event resource");
        }
        storage.delete(storageKey);
    }
}
