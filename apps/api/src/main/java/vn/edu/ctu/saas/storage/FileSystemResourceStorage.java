package vn.edu.ctu.saas.storage;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import vn.edu.ctu.saas.config.AppProperties;

@Component
@ConditionalOnProperty(name = "app.storage.type", havingValue = "filesystem")
public class FileSystemResourceStorage implements ResourceStorage {
    private final Path root;
    private final byte[] signingSecret;

    public FileSystemResourceStorage(AppProperties properties) {
        this.root = Path.of(properties.storage().filesystemRoot()).toAbsolutePath().normalize();
        this.signingSecret = properties.storage().signingSecret().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    @Override
    public StoredObject store(UUID tenantId, UUID resourceId, String filename, String contentType, long size, InputStream input) {
        String safeName = filename.replaceAll("[^A-Za-z0-9._-]", "_");
        String key = tenantId + "/" + resourceId + "/" + safeName;
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
            return new StoredObject(key, Files.size(target));
        } catch (Exception exception) {
            throw new IllegalStateException("Resource upload failed", exception);
        }
    }

    @Override
    public String createDownloadUrl(String storageKey, Duration expiresIn) {
        long expires = Instant.now().plus(expiresIn).getEpochSecond();
        String signature = sign(storageKey + ":" + expires);
        return "/api/v1/resources/content?key=" + java.net.URLEncoder.encode(storageKey, java.nio.charset.StandardCharsets.UTF_8)
                + "&expires=" + expires + "&signature=" + signature;
    }

    @Override
    public void delete(String storageKey) {
        try {
            Files.deleteIfExists(resolve(storageKey));
        } catch (Exception exception) {
            throw new IllegalStateException("Resource deletion failed", exception);
        }
    }

    public Path verifyAndResolve(String storageKey, long expires, String signature) {
        if (Instant.now().getEpochSecond() > expires || !constantTime(sign(storageKey + ":" + expires), signature)) {
            throw new IllegalArgumentException("Resource URL is expired or invalid");
        }
        return resolve(storageKey);
    }

    private Path resolve(String storageKey) {
        Path resolved = root.resolve(storageKey).normalize();
        if (!resolved.startsWith(root)) throw new IllegalArgumentException("Unsafe storage key");
        return resolved;
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(signingSecret, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot sign resource URL", exception);
        }
    }

    private boolean constantTime(String expected, String supplied) {
        return supplied != null && java.security.MessageDigest.isEqual(
                expected.getBytes(java.nio.charset.StandardCharsets.US_ASCII),
                supplied.getBytes(java.nio.charset.StandardCharsets.US_ASCII));
    }
}

