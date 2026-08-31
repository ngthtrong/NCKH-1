package vn.edu.ctu.saas.storage;

import java.util.UUID;
import java.util.regex.Pattern;

final class ResourceStorageKey {
    private static final Pattern SAFE_FILENAME = Pattern.compile("[A-Za-z0-9._-]+");

    private ResourceStorageKey() {}

    static String create(UUID tenantId, UUID resourceId, String filename) {
        String safeName = filename == null ? "" : filename.replaceAll("[^A-Za-z0-9._-]", "_");
        if (safeName.isBlank() || ".".equals(safeName) || "..".equals(safeName)) {
            safeName = "resource";
        }
        return tenantId + "/" + resourceId + "/" + safeName;
    }

    static boolean belongsTo(String storageKey, UUID tenantId, UUID resourceId) {
        Parsed parsed = parse(storageKey);
        return parsed != null
                && parsed.tenantId().equals(tenantId)
                && parsed.resourceId().equals(resourceId);
    }

    static Parsed parse(String storageKey) {
        if (storageKey == null || storageKey.isBlank() || storageKey.indexOf('\\') >= 0) return null;
        String[] segments = storageKey.split("/", -1);
        if (segments.length != 3 || !SAFE_FILENAME.matcher(segments[2]).matches()
                || ".".equals(segments[2]) || "..".equals(segments[2])) {
            return null;
        }
        UUID tenantId = canonicalUuid(segments[0]);
        UUID resourceId = canonicalUuid(segments[1]);
        if (tenantId == null || resourceId == null) return null;
        return new Parsed(tenantId, resourceId, segments[2]);
    }

    private static UUID canonicalUuid(String value) {
        try {
            UUID parsed = UUID.fromString(value);
            return parsed.toString().equals(value) ? parsed : null;
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    record Parsed(UUID tenantId, UUID resourceId, String filename) {}
}
