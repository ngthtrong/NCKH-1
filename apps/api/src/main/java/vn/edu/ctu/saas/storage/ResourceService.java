package vn.edu.ctu.saas.storage;

import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Arrays;
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
                       r.kind,r.link_url,
                       (SELECT count(*) FROM task_resources tr WHERE tr.tenant_id=r.tenant_id AND tr.resource_id=r.id) task_count,
                       (SELECT coalesce(array_agg(tr.task_id),'{}'::uuid[]) FROM task_resources tr
                        WHERE tr.tenant_id=r.tenant_id AND tr.resource_id=r.id) task_ids
                FROM resources r
                WHERE r.tenant_id=? AND r.deleted_at IS NULL AND (
                    r.uploaded_by=? OR EXISTS (
                        SELECT 1 FROM task_resources tr
                        JOIN tasks t ON t.tenant_id=tr.tenant_id AND t.id=tr.task_id
                        JOIN project_memberships pm ON pm.tenant_id=t.tenant_id AND pm.project_id=t.project_id
                        WHERE tr.tenant_id=r.tenant_id AND tr.resource_id=r.id AND pm.user_id=?
                          AND t.deleted_at IS NULL
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
            long current = executor.read(jdbc -> {
                requireAnyProjectRole(jdbc, context, ProjectRole.MEMBER);
                return value(jdbc,
                        "SELECT coalesce(sum(size_bytes),0) FROM resources WHERE tenant_id=? AND deleted_at IS NULL",
                        context.tenantId());
            });
            if (size < 0 || size > quota - current) throw new ConflictException("Tenant resource quota exceeded");
            UUID id = UUID.randomUUID();
            ResourceStorage.StoredObject stored = storage.store(
                    context.tenantId(), id, filename,
                    contentType == null ? "application/octet-stream" : contentType, size, input);
            requireResourceStorageKey(context, id, stored.storageKey());
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

    public ResourceView createLink(String name, String url) {
        TenantContext context = TenantContextHolder.getRequired();
        String normalizedUrl = validateLinkUrl(url);
        return executor.write(jdbc -> {
            requireAnyProjectRole(jdbc, context, ProjectRole.MEMBER);
            UUID id = UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO resources(
                        id,tenant_id,original_name,storage_key,content_type,size_bytes,uploaded_by,kind,link_url)
                    VALUES (?,?,?,NULL,'text/uri-list',0,?,'LINK',?)
                    """, id, context.tenantId(), name.trim(), context.userId(), normalizedUrl);
            return find(jdbc, context, id);
        });
    }

    public DownloadUrl downloadUrl(UUID resourceId) {
        TenantContext context = TenantContextHolder.getRequired();
        ResourceView resource = executor.read(jdbc -> {
            ResourceView found = find(jdbc, context, resourceId);
            requireReadable(jdbc, context, resourceId);
            if (found.kind() == ResourceKind.FILE) {
                requireResourceStorageKey(context, found.id(), found.storageKey());
            }
            return found;
        });
        Duration expiresIn = Duration.ofMinutes(10);
        String url = resource.kind() == ResourceKind.LINK
                ? resource.linkUrl()
                : storage.createDownloadUrl(resource.storageKey(), expiresIn);
        return new DownloadUrl(url, Instant.now().plus(expiresIn));
    }

    public QuotaView quota() {
        TenantContext context = TenantContextHolder.getRequired();
        if (!context.hasAnyRole(TenantRole.OWNER, TenantRole.ADMIN)) {
            throw new TenantAccessDeniedException("Tenant administrator role is required to view aggregate quota");
        }
        long used = executor.read(jdbc -> value(jdbc,
                "SELECT coalesce(sum(size_bytes),0) FROM resources WHERE tenant_id=? AND deleted_at IS NULL",
                context.tenantId()));
        return new QuotaView(used, quotaBytes(context.tier()));
    }

    public void attach(UUID resourceId, UUID taskId) {
        TenantContext context = TenantContextHolder.getRequired();
        executor.writeWithoutResult(jdbc -> {
            find(jdbc, context, resourceId);
            requireReadable(jdbc, context, resourceId);
            UUID projectId = jdbc.query(
                    "SELECT project_id FROM tasks WHERE tenant_id=? AND id=? AND deleted_at IS NULL",
                    rs -> rs.next() ? rs.getObject(1, UUID.class) : null,
                    context.tenantId(), taskId);
            if (projectId == null) throw new NotFoundException("Task not found");
            requireProjectRole(jdbc, context, projectId, ProjectRole.MEMBER);
            requireActiveProject(jdbc, context, projectId);
            jdbc.update("""
                    INSERT INTO task_resources(id,tenant_id,task_id,resource_id)
                    VALUES (?,?,?,?) ON CONFLICT (tenant_id,task_id,resource_id) DO NOTHING
                    """, UUID.randomUUID(), context.tenantId(), taskId, resourceId);
        });
    }

    public void detach(UUID resourceId, UUID taskId) {
        TenantContext context = TenantContextHolder.getRequired();
        executor.writeWithoutResult(jdbc -> {
            find(jdbc, context, resourceId);
            UUID projectId = jdbc.query(
                    "SELECT project_id FROM tasks WHERE tenant_id=? AND id=? AND deleted_at IS NULL",
                    rs -> rs.next() ? rs.getObject(1, UUID.class) : null,
                    context.tenantId(), taskId);
            if (projectId == null) throw new NotFoundException("Task not found");
            requireProjectRole(jdbc, context, projectId, ProjectRole.MEMBER);
            requireActiveProject(jdbc, context, projectId);
            int deleted = jdbc.update("""
                    DELETE FROM task_resources WHERE tenant_id=? AND resource_id=? AND task_id=?
                    """, context.tenantId(), resourceId, taskId);
            if (deleted == 0) throw new NotFoundException("Resource attachment not found");
        });
    }

    public void delete(UUID resourceId) {
        TenantContext context = TenantContextHolder.getRequired();
        executor.writeWithoutResult(jdbc -> {
            ResourceView found = find(jdbc, context, resourceId);
            requireDeletable(jdbc, context, found);
            requireLinkedProjectsActive(jdbc, context, resourceId);
            if (found.kind() == ResourceKind.FILE) {
                requireResourceStorageKey(context, found.id(), found.storageKey());
            }
            jdbc.update("""
                    INSERT INTO audit_events(
                        id,tenant_id,actor_user_id,event_type,aggregate_type,aggregate_id,correlation_id,details_json)
                    VALUES (?,?,?,?,?,?,?,jsonb_build_object('storageKey',?,'originalName',?))
                    """, UUID.randomUUID(), context.tenantId(), context.userId(), "RESOURCE_DELETED",
                    "RESOURCE", resourceId, context.correlationId(),
                    found.storageKey() == null ? "" : found.storageKey(), found.originalName());
            if (found.kind() == ResourceKind.FILE) jdbc.update("""
                    INSERT INTO outbox_events(
                        id,tenant_id,actor_user_id,event_type,aggregate_type,aggregate_id,correlation_id,payload_json)
                    VALUES (?,?,?,?,?,?,?,jsonb_build_object('storageKey',?))
                    """, UUID.randomUUID(), context.tenantId(), context.userId(),
                    ResourceDeletionHandler.EVENT_TYPE, "RESOURCE", resourceId,
                    context.correlationId(), found.storageKey());
            jdbc.update("DELETE FROM task_resources WHERE tenant_id=? AND resource_id=?",
                    context.tenantId(), resourceId);
            int deleted = jdbc.update("""
                    UPDATE resources SET deleted_at=now(),updated_at=now()
                    WHERE tenant_id=? AND id=? AND deleted_at IS NULL
                    """, context.tenantId(), resourceId);
            if (deleted == 0) throw new NotFoundException("Resource not found");
        });
    }

    public boolean storageKeyBelongsToCurrentTenant(String key) {
        TenantContext context = TenantContextHolder.getRequired();
        ResourceStorageKey.Parsed parsed = ResourceStorageKey.parse(key);
        if (parsed == null || !parsed.tenantId().equals(context.tenantId())) return false;
        return executor.read(jdbc -> value(jdbc,
                "SELECT count(*) FROM resources WHERE tenant_id=? AND id=? AND storage_key=? AND deleted_at IS NULL",
                context.tenantId(), parsed.resourceId(), key) > 0);
    }

    private void requireAnyProjectRole(
            JdbcTemplate jdbc, TenantContext context, ProjectRole minimum) {
        List<String> roles = jdbc.query(
                """
                SELECT pm.role FROM project_memberships pm
                JOIN projects p ON p.tenant_id=pm.tenant_id AND p.id=pm.project_id
                WHERE pm.tenant_id=? AND pm.user_id=? AND p.status='ACTIVE'
                """,
                (rs, rowNum) -> rs.getString(1), context.tenantId(), context.userId());
        boolean allowed = roles.stream()
                .map(ProjectRole::valueOf)
                .anyMatch(role -> roleRank(role) >= roleRank(minimum));
        if (!allowed) throw new TenantAccessDeniedException("Project member role is required to upload resources");
    }

    private void requireResourceStorageKey(TenantContext context, UUID resourceId, String storageKey) {
        if (!ResourceStorageKey.belongsTo(storageKey, context.tenantId(), resourceId)) {
            throw new IllegalArgumentException("Resource storage key does not belong to the current tenant");
        }
    }

    private ResourceView find(JdbcTemplate jdbc, TenantContext context, UUID resourceId) {
        List<ResourceView> resources = jdbc.query("""
                SELECT r.id,r.original_name,r.storage_key,r.content_type,r.size_bytes,r.uploaded_by,r.created_at,
                       r.kind,r.link_url,
                       (SELECT count(*) FROM task_resources tr WHERE tr.tenant_id=r.tenant_id AND tr.resource_id=r.id) task_count,
                       (SELECT coalesce(array_agg(tr.task_id),'{}'::uuid[]) FROM task_resources tr
                        WHERE tr.tenant_id=r.tenant_id AND tr.resource_id=r.id) task_ids
                FROM resources r WHERE r.tenant_id=? AND r.id=? AND r.deleted_at IS NULL
                """, (rs, rowNum) -> resourceRow(rs), context.tenantId(), resourceId);
        if (resources.isEmpty()) throw new NotFoundException("Resource not found");
        return resources.getFirst();
    }

    private void requireReadable(JdbcTemplate jdbc, TenantContext context, UUID resourceId) {
        long allowed = value(jdbc, """
                SELECT count(*) FROM resources r
                WHERE r.tenant_id=? AND r.id=? AND r.deleted_at IS NULL AND (
                    r.uploaded_by=? OR EXISTS (
                        SELECT 1 FROM task_resources tr
                        JOIN tasks t ON t.tenant_id=tr.tenant_id AND t.id=tr.task_id
                        JOIN project_memberships pm ON pm.tenant_id=t.tenant_id AND pm.project_id=t.project_id
                        WHERE tr.tenant_id=r.tenant_id AND tr.resource_id=r.id AND pm.user_id=?
                          AND t.deleted_at IS NULL
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
                """
                SELECT pm.role FROM project_memberships pm
                JOIN projects p ON p.tenant_id=pm.tenant_id AND p.id=pm.project_id
                WHERE pm.tenant_id=? AND pm.project_id=? AND pm.user_id=? AND p.status<>'DELETED'
                """,
                (rs, rowNum) -> rs.getString(1), context.tenantId(), projectId, context.userId());
        if (roles.isEmpty() || roleRank(ProjectRole.valueOf(roles.getFirst())) < roleRank(minimum)) {
            throw new TenantAccessDeniedException("Insufficient project role");
        }
    }

    private void requireActiveProject(JdbcTemplate jdbc, TenantContext context, UUID projectId) {
        long active = value(jdbc,
                "SELECT count(*) FROM projects WHERE tenant_id=? AND id=? AND status='ACTIVE'",
                context.tenantId(), projectId);
        if (active == 0) throw new ConflictException("Archived projects are read-only");
    }

    private void requireLinkedProjectsActive(
            JdbcTemplate jdbc, TenantContext context, UUID resourceId) {
        long archived = value(jdbc, """
                SELECT count(DISTINCT t.project_id)
                FROM task_resources tr
                JOIN tasks t ON t.tenant_id=tr.tenant_id AND t.id=tr.task_id
                JOIN projects p ON p.tenant_id=t.tenant_id AND p.id=t.project_id
                WHERE tr.tenant_id=? AND tr.resource_id=? AND p.status<>'ACTIVE'
                """, context.tenantId(), resourceId);
        if (archived > 0) throw new ConflictException("Archived projects are read-only");
    }

    private int roleRank(ProjectRole role) {
        return switch (role) {
            case VIEWER -> 1;
            case MEMBER -> 2;
            case MANAGER -> 3;
        };
    }

    private ResourceView resourceRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        UUID[] taskIds = (UUID[]) rs.getArray("task_ids").getArray();
        return new ResourceView(
                rs.getObject("id", UUID.class), rs.getString("original_name"), rs.getString("storage_key"),
                rs.getString("content_type"), rs.getLong("size_bytes"), rs.getObject("uploaded_by", UUID.class),
                rs.getTimestamp("created_at").toInstant(), rs.getLong("task_count"),
                ResourceKind.valueOf(rs.getString("kind")), rs.getString("link_url"), Arrays.asList(taskIds));
    }

    private String validateLinkUrl(String value) {
        try {
            URI uri = URI.create(value.trim());
            String scheme = uri.getScheme();
            if (!uri.isAbsolute() || uri.getHost() == null
                    || !("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))) {
                throw new IllegalArgumentException("Resource link must use an absolute HTTP(S) URL");
            }
            return uri.toASCIIString();
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Resource link must use an absolute HTTP(S) URL");
        }
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
            UUID uploadedBy, Instant createdAt, long taskCount,
            ResourceKind kind, String linkUrl, List<UUID> taskIds) {}
    public enum ResourceKind { FILE, LINK }
    public record DownloadUrl(String url, Instant expiresAt) {}
    public record QuotaView(long usedBytes, long limitBytes) {}
}
