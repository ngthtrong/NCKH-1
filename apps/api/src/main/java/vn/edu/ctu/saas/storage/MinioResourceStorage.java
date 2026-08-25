package vn.edu.ctu.saas.storage;

import io.minio.BucketExistsArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.http.Method;
import java.io.InputStream;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import vn.edu.ctu.saas.config.AppProperties;

@Component
@ConditionalOnProperty(name = "app.storage.type", havingValue = "minio", matchIfMissing = true)
public class MinioResourceStorage implements ResourceStorage {
    private final MinioClient client;
    private final AppProperties.Storage properties;
    private final AtomicBoolean bucketReady = new AtomicBoolean();

    public MinioResourceStorage(AppProperties appProperties) {
        this.properties = appProperties.storage();
        this.client = MinioClient.builder()
                .endpoint(properties.endpoint())
                .credentials(properties.accessKey(), properties.secretKey())
                .build();
    }

    @Override
    public StoredObject store(
            UUID tenantId, UUID resourceId, String filename, String contentType, long size, InputStream input) {
        ensureBucket();
        String safeName = filename.replaceAll("[^A-Za-z0-9._-]", "_");
        if (safeName.isBlank()) safeName = "resource";
        String key = tenantId + "/" + resourceId + "/" + safeName;
        try {
            client.putObject(PutObjectArgs.builder()
                    .bucket(properties.bucket())
                    .object(key)
                    .contentType(contentType)
                    .stream(input, size, -1)
                    .build());
            return new StoredObject(key, size);
        } catch (Exception exception) {
            throw new IllegalStateException("Resource upload failed", exception);
        }
    }

    @Override
    public String createDownloadUrl(String storageKey, Duration expiresIn) {
        ensureBucket();
        try {
            String internalUrl = client.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET)
                    .bucket(properties.bucket())
                    .object(storageKey)
                    .expiry((int) Math.min(expiresIn.toSeconds(), 7 * 24 * 60 * 60))
                    .build());
            if (properties.publicEndpoint() == null || properties.publicEndpoint().isBlank()) return internalUrl;
            return internalUrl.replaceFirst("^" + java.util.regex.Pattern.quote(properties.endpoint()), properties.publicEndpoint());
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot create resource download URL", exception);
        }
    }

    @Override
    public void delete(String storageKey) {
        try {
            client.removeObject(RemoveObjectArgs.builder().bucket(properties.bucket()).object(storageKey).build());
        } catch (Exception exception) {
            throw new IllegalStateException("Resource deletion failed", exception);
        }
    }

    private void ensureBucket() {
        if (bucketReady.get()) return;
        synchronized (bucketReady) {
            if (bucketReady.get()) return;
            try {
                boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(properties.bucket()).build());
                if (!exists) client.makeBucket(MakeBucketArgs.builder().bucket(properties.bucket()).build());
                bucketReady.set(true);
            } catch (Exception exception) {
                throw new IllegalStateException("Resource bucket is unavailable", exception);
            }
        }
    }
}

