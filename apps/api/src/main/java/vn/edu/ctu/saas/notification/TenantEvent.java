package vn.edu.ctu.saas.notification;

import java.time.Instant;
import java.util.UUID;

public record TenantEvent(
        UUID id,
        UUID tenantId,
        UUID actorUserId,
        String eventType,
        String aggregateType,
        UUID aggregateId,
        String correlationId,
        String payloadJson,
        Instant createdAt) {}
