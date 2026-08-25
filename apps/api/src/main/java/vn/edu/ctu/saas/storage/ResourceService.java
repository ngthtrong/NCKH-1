package vn.edu.ctu.saas.storage;

import java.io.InputStream;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.common.NotFoundException;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;
import vn.edu.ctu.saas.tenant.TenantAccessDeniedException;
import vn.edu.ctu.saas.tenant.ProjectRole;
import vn.edu.ctu.saas.tenant.TenantRole;

@Service
public class ResourceService {
    private final TenantJdbcExecutor executor;
    private final ResourceStorage storage;
    private final ConcurrentHashMap<UUID, ReentrantLock> tenantUploadLocks = new ConcurrentHashMap<>();

    public ResourceService(TenantJdbcExecutor executor, ResourceStorage storage) {
        this.executor = executor;
        this.storage = storage;
    }

    public List<ResourceView> list() {
        TenantContext context = TenantContextHolder.getRequired();
        return executor.read(jdbc -> jdbc.query("""
                SELECT r.id,r.original_name,r.storage_key,r.content_type,r.size_bytes,r.uploaded_by,r.created_at,
                       (SELECT count(*) FROM task_resources tr WHERE tr.tenant_id=r.tenant_id AND tr.resource_id=r.id) task_count
                FROM resources r
                WHERE r.tenant_id=? AND (
                    r.uploaded_by=? OR EXISTS (
                        SELECT 1 FROM task_resources tr
                        JOIN tasks t ON t.tenant_id=tr.tenant_id AND t.id=tr.task_id
                        JOIN project_memberships pm ON pm.tenant_id=t.tenant_id AND pm.project_id=t.project_id
                        WHERE tr.tenant_id=r.tenant_id AND tr.resource_id=r.id AND pm.user_id=?
                    )
                )
                ORDER BY r.created_at DESC
                """, (rs, rowNum) -> resourceRow(rs), context.tenantId(), context.userId(), context.userId()));
    }

    public ResourceView upload(String filename, String contentType, long size, InputStream input) {
        TenantContext context = TenantContextHolder.getRequired();
        ReentrantLock uploadLock = tenantUploadLocks.computeIfAbsent(context.tenantId(), ignored -> new ReentrantLock());
        uploadLock.lock();
        try {
            long quota = quotaBytes(context.tier());
            long current = executor.read(jdbc -> value(jdbc,
                    "SELECT coalesce(sum(size_bytes),0) FROM resources WHERE tenant_id=?", context.tenantId()));
            if (size < 0 || size > quota - current) throw new ConflictException("Tenant resource quota exceeded");
            UUID id = UUID.randomUUID();
            ResourceStorage.StoredObject stored = storage.store(
                    context.tenantId(), id, filename,
                    contentType == null ? "application/octet-stream" : contentType, size, input);
            try {
                return executor.write(jdbc -> {
                    jdbc.update("""
                            INSERT INTO resources(id,tenant_id,original_name,storage_key,content_type,size_bytes,uploaded_by)
                            VALUES (?,?,?,?,?,?,?)
                            """, id, context.tenantId(), filename, stored.storageKey(),
                            contentType == null ? "application/octet-stream" : contentType, stored.size(), context.userId());
                    return find(jdbc, context, id);
                });
            } catch (RuntimeException exception) {
                storage.delete(stored.storageKey());
                throw exception;
            }
        } finally {
            uploadLock.unlock();
        }
    }

    public DownloadUrl downloadUrl(UUID resourceId) {
        TenantContext context = TenantContextHolder.getRequired();
        ResourceView resource = executor.read(jdbc -> {
            ResourceView found = find(jdbc, context, resourceId);
            requireReadable(jdbc, context, resourceId);
            return found;
        });
        Duration expiresIn = Duration.ofMinutes(10);
        return new DownloadUrl(storage.createDownloadUrl(resource.storageKey(), expiresIn), Instant.now().plus(expiresIn));
    }

    public QuotaView quota() {
        TenantContext context = TenantContextHolder.getRequired();
        if (!context.hasAnyRole(TenantRole.OWNER, TenantRole.ADMIN)) {
            throw new TenantAccessDeniedException("Tenant administrator role is required to view aggregate quota");
        }
        long used = executor.read(jdbc -> value(jdbc,
                "SELECT coalesce(sum(size_bytes),0) FROM resources WHERE tenant_id=?", context.tenantId()));
        return new QuotaView(used, quotaBytes(context.tier()));
    }

    public void attach(UUID resourceId, UUID taskId) {
        TenantContext context = TenantContextHolder.getRequired();
        executor.writeWithoutResult(jdbc -> {
            find(jdbc, context, resourceId);
            requireReadable(jdbc, context, resourceId);
            UUID projectId = jdbc.query(
                    "SELECT project_id FROM tasks WHERE tenant_id=? AND id=?",
                    rs -> rs.next() ? rs.getObject(1, UUID.class) : null,
                    context.tenantId(), taskId);
            if (projectId == null) throw new NotFoundException("Task not found");
            requireProjectRole(jdbc, context, projectId, ProjectRole.MEMBER);
            jdbc.update("""
                    INSERT INTO task_resources(id,tenant_id,task_id,resource_id)
                    VALUES (?,?,?,?) ON CONFLICT (tenant_id,task_id,resource_id) DO NOTHING
                    """, UUID.randomUUID(), context.tenantId(), taskId, resourceId);
        });
    }

    public void delete(UUID resourceId) {
        TenantContext context = TenantContextHolder.getRequired();
        ResourceView resource = executor.write(jdbc -> {
            ResourceView found = find(jdbc, context, resourceId);
            requireDeletable(jdbc, context, found);
            int deleted = jdbc.update("DELETE FROM resources WHERE tenant_id=? AND id=?", context.tenantId(), resourceId);
            if (deleted == 0) throw new NotFoundException("Resource not found");
            return found;
        });
        storage.delete(resource.storageKey());
    }

    public boolean storageKeyBelongsToCurrentTenant(String key) {
        TenantContext context = TenantContextHolder.getRequired();
        if (!key.startsWith(context.tenantId() + "/")) return false;
        return executor.read(jdbc -> value(jdbc,
                "SELECT count(*) FROM resources WHERE tenant_id=? AND storage_key=?", context.tenantId(), key) > 0);
    }

    private ResourceView find(JdbcTemplate jdbc, TenantContext context, UUID resourceId) {
        List<ResourceView> resources = jdbc.query("""
                SELECT r.id,r.original_name,r.storage_key,r.content_type,r.size_bytes,r.uploaded_by,r.created_at,
                       (SELECT count(*) FROM task_resources tr WHERE tr.tenant_id=r.tenant_id AND tr.resource_id=r.id) task_count
                FROM resources r WHERE r.tenant_id=? AND r.id=?
                """, (rs, rowNum) -> resourceRow(rs), context.tenantId(), resourceId);
        if (resources.isEmpty()) throw new NotFoundException("Resource not found");
        return resources.getFirst();
    }

    private void requireReadable(JdbcTemplate jdbc, TenantContext context, UUID resourceId) {
        long allowed = value(jdbc, """
                SELECT count(*) FROM resources r
                WHERE r.tenant_id=? AND r.id=? AND (
                    r.uploaded_by=? OR EXISTS (
                        SELECT 1 FROM task_resources tr
                        JOIN tasks t ON t.tenant_id=tr.tenant_id AND t.id=tr.task_id
                        JOIN project_memberships pm ON pm.tenant_id=t.tenant_id AND pm.project_id=t.project_id
                        WHERE tr.tenant_id=r.tenant_id AND tr.resource_id=r.id AND pm.user_id=?
                    )
                )
                """, context.tenantId(), resourceId, context.userId(), context.userId());
        if (allowed == 0) throw new TenantAccessDeniedException("Project membership is required for this resource");
    }

    private void requireDeletable(JdbcTemplate jdbc, TenantContext context, ResourceView resource) {
        long links = value(jdbc,
                "SELECT count(*) FROM task_resources WHERE tenant_id=? AND resource_id=?",
                context.tenantId(), resource.id());
        if (links == 0 && resource.uploadedBy().equals(context.userId())) return;
        long unauthorizedProjects = value(jdbc, """
                SELECT count(DISTINCT t.project_id)
                FROM task_resources tr
                JOIN tasks t ON t.tenant_id=tr.tenant_id AND t.id=tr.task_id
                LEFT JOIN project_memberships pm
                  ON pm.tenant_id=t.tenant_id AND pm.project_id=t.project_id
                 AND pm.user_id=? AND pm.role='MANAGER'
                WHERE tr.tenant_id=? AND tr.resource_id=? AND pm.id IS NULL
                """, context.userId(), context.tenantId(), resource.id());
        if (links == 0 || unauthorizedProjects > 0) {
            throw new TenantAccessDeniedException("Project manager role is required to delete this resource");
        }
    }

    private void requireProjectRole(
            JdbcTemplate jdbc, TenantContext context, UUID projectId, ProjectRole minimum) {
        List<String> roles = jdbc.query(
                "SELECT role FROM project_memberships WHERE tenant_id=? AND project_id=? AND user_id=?",
                (rs, rowNum) -> rs.getString(1), context.tenantId(), projectId, context.userId());
        if (roles.isEmpty() || roleRank(ProjectRole.valueOf(roles.getFirst())) < roleRank(minimum)) {
            throw new TenantAccessDeniedException("Insufficient project role");
        }
    }

    private int roleRank(ProjectRole role) {
        return switch (role) {
            case VIEWER -> 1;
            case MEMBER -> 2;
            case MANAGER -> 3;
        };
    }

    private ResourceView resourceRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new ResourceView(
                rs.getObject("id", UUID.class), rs.getString("original_name"), rs.getString("storage_key"),
                rs.getString("content_type"), rs.getLong("size_bytes"), rs.getObject("uploaded_by", UUID.class),
                rs.getTimestamp("created_at").toInstant(), rs.getLong("task_count"));
    }

    private long value(JdbcTemplate jdbc, String sql, Object... args) {
        Long value = jdbc.queryForObject(sql, Long.class, args);
        return value == null ? 0 : value;
    }

    private long quotaBytes(String tier) {
        long megabytes = switch (tier == null ? "FREE" : tier.toUpperCase()) {
            case "ENTERPRISE" -> 2048;
            case "PROFESSIONAL" -> 500;
            default -> 50;
        };
        return megabytes * 1024 * 1024;
    }

    public record ResourceView(
            UUID id, String originalName, String storageKey, String contentType, long sizeBytes,
            UUID uploadedBy, Instant createdAt, long taskCount) {}
    public record DownloadUrl(String url, Instant expiresAt) {}
    public record QuotaView(long usedBytes, long limitBytes) {}
}
