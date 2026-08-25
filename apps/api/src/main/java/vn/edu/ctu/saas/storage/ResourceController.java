package vn.edu.ctu.saas.storage;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/resources")
public class ResourceController {
    private final ResourceService service;
    private final ObjectProvider<FileSystemResourceStorage> fileSystemStorage;

    public ResourceController(ResourceService service, ObjectProvider<FileSystemResourceStorage> fileSystemStorage) {
        this.service = service;
        this.fileSystemStorage = fileSystemStorage;
    }

    @GetMapping
    public List<ResourceService.ResourceView> list() { return service.list(); }

    @GetMapping("/quota")
    public ResourceService.QuotaView quota() { return service.quota(); }

    @PostMapping
    public ResourceService.ResourceView upload(@RequestParam("file") MultipartFile file) throws java.io.IOException {
        if (file.isEmpty() || file.getOriginalFilename() == null) {
            throw new IllegalArgumentException("A non-empty file is required");
        }
        return service.upload(file.getOriginalFilename(), file.getContentType(), file.getSize(), file.getInputStream());
    }

    @GetMapping("/{resourceId}/download-url")
    public ResourceService.DownloadUrl downloadUrl(@PathVariable UUID resourceId) { return service.downloadUrl(resourceId); }

    @PostMapping("/{resourceId}/tasks/{taskId}")
    public void attach(@PathVariable UUID resourceId, @PathVariable UUID taskId) { service.attach(resourceId, taskId); }

    @DeleteMapping("/{resourceId}")
    public void delete(@PathVariable UUID resourceId) { service.delete(resourceId); }

    @GetMapping("/content")
    public ResponseEntity<Resource> filesystemContent(
            @RequestParam String key,
            @RequestParam long expires,
            @RequestParam String signature) throws java.io.IOException {
        FileSystemResourceStorage storage = fileSystemStorage.getIfAvailable();
        if (storage == null) return ResponseEntity.notFound().build();
        Path path = storage.verifyAndResolve(key, expires, signature);
        if (!Files.isRegularFile(path)) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(new FileSystemResource(path));
    }
}
