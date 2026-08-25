package vn.edu.ctu.saas.storage;

import java.io.InputStream;
import java.time.Duration;
import java.util.UUID;

public interface ResourceStorage {
    StoredObject store(UUID tenantId, UUID resourceId, String filename, String contentType, long size, InputStream input);
    String createDownloadUrl(String storageKey, Duration expiresIn);
    void delete(String storageKey);

    record StoredObject(String storageKey, long size) {}
}

