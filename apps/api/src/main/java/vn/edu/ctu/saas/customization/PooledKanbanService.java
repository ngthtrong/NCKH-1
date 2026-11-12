package vn.edu.ctu.saas.customization;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.tenant.*;

@Service
public class PooledKanbanService {
    private final TenantJdbcExecutor executor;
    private final ObjectMapper mapper;
    private final TenantConfigurationCache cache;

    public PooledKanbanService(TenantJdbcExecutor executor, ObjectMapper mapper, TenantConfigurationCache cache) {
        this.executor = executor;
        this.mapper = mapper;
        this.cache = cache;
    }

    public View get() {
        var context = TenantContextHolder.getRequired();
        return executor.read(jdbc -> {
            Long version = jdbc.query("SELECT version FROM tenant_kanban_settings WHERE tenant_id=?",
                    rs -> rs.next() ? rs.getLong(1) : null, context.tenantId());
            if (version == null) return new View(KanbanSettings.defaults(), 0);
            String json = cache.get(context.tenantId(), version, () -> jdbc.queryForObject(
                    "SELECT settings::text FROM tenant_kanban_settings WHERE tenant_id=?", String.class, context.tenantId()));
            return new View(vn.edu.ctu.saas.common.JsonSupport.read(mapper, json, KanbanSettings.class), version);
        });
    }

    public View update(View request) {
        var context = TenantContextHolder.getRequired();
        if (!context.hasAnyRole(TenantRole.OWNER, TenantRole.ADMIN)) {
            throw new TenantAccessDeniedException("Tenant administrator role is required");
        }
        if (request.settings() == null || request.version() < 0) throw new IllegalArgumentException("Invalid settings");
        request.settings().validate();
        View saved = executor.write(jdbc -> {
            jdbc.update("INSERT INTO tenant_kanban_settings(tenant_id) VALUES (?) ON CONFLICT DO NOTHING", context.tenantId());
            int updated = jdbc.update("""
                    UPDATE tenant_kanban_settings SET settings=CAST(? AS jsonb),version=version+1,updated_at=now()
                    WHERE tenant_id=? AND version=?
                    """, vn.edu.ctu.saas.common.JsonSupport.write(mapper, request.settings()), context.tenantId(), request.version());
            if (updated != 1) throw new ConflictException("Configuration changed; reload before saving");
            jdbc.update("UPDATE boards SET content_version=content_version+1 WHERE tenant_id=?", context.tenantId());
            jdbc.update("""
                    INSERT INTO audit_events(id,tenant_id,actor_user_id,event_type,aggregate_type,aggregate_id,details_json)
                    VALUES (?,?,?,?,?,?,CAST(? AS jsonb))
                    """, java.util.UUID.randomUUID(), context.tenantId(), context.userId(),
                    "KANBAN_SETTINGS_UPDATED", "Tenant", context.tenantId(), "{}");
            return new View(request.settings(), request.version() + 1);
        });
        cache.invalidate(context.tenantId());
        return saved;
    }

    public static KanbanSettings load(JdbcTemplate jdbc, TenantContext context, ObjectMapper mapper) {
        String json = jdbc.query("SELECT settings::text FROM tenant_kanban_settings WHERE tenant_id=?",
                rs -> rs.next() ? rs.getString(1) : null, context.tenantId());
        return json == null ? KanbanSettings.defaults() : vn.edu.ctu.saas.common.JsonSupport.read(mapper, json, KanbanSettings.class);
    }

    public static String encodeData(JdbcTemplate jdbc, TenantContext context, ObjectMapper mapper, Map<String,Object> data) {
        Map<String,Object> values = data == null ? Map.of() : data;
        load(jdbc, context, mapper).validateData(values);
        return vn.edu.ctu.saas.common.JsonSupport.write(mapper, values);
    }

    public static void checkWip(JdbcTemplate jdbc, TenantContext context, ObjectMapper mapper,
            java.util.UUID boardId, java.util.UUID targetColumnId, java.util.UUID existingTaskId) {
        // Serialize changes per board, including create, edit, drag and batch moves.
        jdbc.queryForObject("SELECT id FROM boards WHERE tenant_id=? AND id=? FOR UPDATE", java.util.UUID.class,
                context.tenantId(), boardId);
        KanbanSettings settings = load(jdbc, context, mapper);
        if (!settings.wipMode().equals("STRICT")) return;
        var column = jdbc.queryForMap("SELECT position,completed FROM board_columns WHERE tenant_id=? AND id=?",
                context.tenantId(), targetColumnId);
        // Backlog (first column) and completed columns are not work in progress.
        java.math.BigDecimal first = jdbc.queryForObject(
                "SELECT min(position) FROM board_columns WHERE tenant_id=? AND board_id=?", java.math.BigDecimal.class,
                context.tenantId(), boardId);
        if (Boolean.TRUE.equals(column.get("completed")) || first.compareTo((java.math.BigDecimal) column.get("position")) == 0) return;
        Long occupied = jdbc.queryForObject("""
                SELECT count(*) FROM tasks WHERE tenant_id=? AND board_column_id=? AND deleted_at IS NULL
                  AND (?::uuid IS NULL OR id<>?::uuid)
                """, Long.class, context.tenantId(), targetColumnId, existingTaskId, existingTaskId);
        if (occupied >= settings.wipLimit()) throw new WipLimitException("Cột đã đạt giới hạn WIP " + settings.wipLimit());
    }

    public record View(KanbanSettings settings, long version) {}
}
