package vn.edu.ctu.saas.customization;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import vn.edu.ctu.saas.common.ConflictException;
import vn.edu.ctu.saas.common.NotFoundException;
import vn.edu.ctu.saas.tenant.ProjectRole;
import vn.edu.ctu.saas.tenant.TenantAccessDeniedException;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;

@Service
public class CustomDataService {
    private final TenantJdbcExecutor executor;
    private final TenantCapabilityService capabilities;
    private final ObjectMapper objectMapper;

    public CustomDataService(
            TenantJdbcExecutor executor,
            TenantCapabilityService capabilities,
            ObjectMapper objectMapper) {
        this.executor = executor;
        this.capabilities = capabilities;
        this.objectMapper = objectMapper;
    }

    public List<DefinitionView> definitions(UUID projectId) {
        TenantContext context = contextForRead();
        return executor.read(jdbc -> {
            requireProjectRole(jdbc, context, projectId, ProjectRole.VIEWER);
            return jdbc.query("""
                    SELECT id,project_id,kind,display_name,physical_table,status,version,last_error
                    FROM custom_definitions
                    WHERE tenant_id=? AND project_id=? AND deleted_at IS NULL
                    ORDER BY kind,created_at
                    """, (rs, rowNum) -> definitionRow(jdbc, context, rs), context.tenantId(), projectId);
        });
    }

    public DefinitionView createDefinition(UUID projectId, CustomDefinitionKind kind, String displayName) {
        TenantContext context = contextWithCapability();
        return executor.write(jdbc -> {
            requireActiveProject(jdbc, context, projectId);
            requireProjectRole(jdbc, context, projectId, ProjectRole.MANAGER);
            UUID id = UUID.randomUUID();
            String physical = (kind == CustomDefinitionKind.TASK ? "x_task_" : "x_entity_")
                    + id.toString().replace("-", "").substring(0, 24);
            jdbc.update("""
                    INSERT INTO custom_definitions(
                        id,tenant_id,project_id,kind,display_name,physical_table,status,version)
                    VALUES (?,?,?,?,?,?,'PENDING',0)
                    """, id, context.tenantId(), projectId, kind.name(), normalizedName(displayName), physical);
            enqueue(jdbc, context, id, null, "CREATE_DEFINITION", 0);
            audit(jdbc, context, "CUSTOM_DEFINITION_CREATED", "CustomDefinition", id,
                    Map.of("projectId", projectId, "kind", kind.name()));
            return findDefinition(jdbc, context, id);
        });
    }

    public DefinitionView addField(
            UUID definitionId,
            String displayName,
            CustomFieldType type,
            boolean required,
            int position,
            List<String> options) {
        TenantContext context = contextWithCapability();
        return executor.write(jdbc -> {
            DefinitionView definition = findDefinition(jdbc, context, definitionId);
            requireActiveProject(jdbc, context, definition.projectId());
            requireProjectRole(jdbc, context, definition.projectId(), ProjectRole.MANAGER);
            if (!"ACTIVE".equals(definition.status())) throw new ConflictException("Customization definition is not active");
            List<String> normalizedOptions = normalizeOptions(type, options);
            if (required && countRows(jdbc, definition) > 0) {
                throw new ConflictException("A required field cannot be added while existing rows have no value");
            }
            UUID fieldId = UUID.randomUUID();
            String physicalColumn = "f_" + fieldId.toString().replace("-", "");
            jdbc.update("""
                    INSERT INTO custom_fields(
                        id,tenant_id,definition_id,display_name,physical_column,data_type,
                        options_json,required,position,status,version)
                    VALUES (?,?,?,?,?,?,CAST(? AS jsonb),?,?,'PENDING',0)
                    """, fieldId, context.tenantId(), definitionId, normalizedName(displayName), physicalColumn,
                    type.name(), objectMapper.writeValueAsString(normalizedOptions), required, position);
            enqueue(jdbc, context, definitionId, fieldId, "ADD_FIELD", 0);
            audit(jdbc, context, "CUSTOM_FIELD_CREATED", "CustomField", fieldId,
                    Map.of("definitionId", definitionId, "type", type.name()));
            return findDefinition(jdbc, context, definitionId);
        });
    }

    public DefinitionView updateField(
            UUID definitionId,
            UUID fieldId,
            String displayName,
            boolean required,
            int position,
            List<String> options,
            long expectedVersion) {
        TenantContext context = contextWithCapability();
        return executor.write(jdbc -> {
            DefinitionView definition = findDefinition(jdbc, context, definitionId);
            requireActiveProject(jdbc, context, definition.projectId());
            requireProjectRole(jdbc, context, definition.projectId(), ProjectRole.MANAGER);
            FieldView field = definition.fields().stream().filter(item -> item.id().equals(fieldId)).findFirst()
                    .orElseThrow(() -> new NotFoundException("Custom field not found"));
            if (!"ACTIVE".equals(field.status())) throw new ConflictException("Custom field is not active");
            if (field.version() != expectedVersion) throw new ConflictException("Custom field version is stale");
            List<String> normalizedOptions = normalizeOptions(field.dataType(), options);
            if (required && !field.required() && nullValueCount(jdbc, definition, field) > 0) {
                throw new ConflictException("Existing rows must contain a value before this field becomes required");
            }
            if (field.dataType() == CustomFieldType.SINGLE_SELECT
                    && invalidOptionCount(jdbc, definition, field, normalizedOptions) > 0) {
                throw new ConflictException("Existing values are not included in the new option list");
            }
            int updated = jdbc.update("""
                    UPDATE custom_fields SET display_name=?,options_json=CAST(? AS jsonb),required=?,position=?,
                        version=version+1,updated_at=now()
                    WHERE tenant_id=? AND id=? AND definition_id=? AND version=? AND deleted_at IS NULL
                    """, normalizedName(displayName), objectMapper.writeValueAsString(normalizedOptions), required,
                    position, context.tenantId(), fieldId, definitionId, expectedVersion);
            if (updated == 0) throw new ConflictException("Custom field version is stale");
            return findDefinition(jdbc, context, definitionId);
        });
    }

    public void deleteField(UUID definitionId, UUID fieldId, long expectedVersion) {
        TenantContext context = contextWithCapability();
        executor.writeWithoutResult(jdbc -> {
            DefinitionView definition = findDefinition(jdbc, context, definitionId);
            requireActiveProject(jdbc, context, definition.projectId());
            requireProjectRole(jdbc, context, definition.projectId(), ProjectRole.MANAGER);
            int updated = jdbc.update("""
                    UPDATE custom_fields SET deleted_at=now(),version=version+1,updated_at=now()
                    WHERE tenant_id=? AND id=? AND definition_id=? AND version=? AND deleted_at IS NULL
                    """, context.tenantId(), fieldId, definitionId, expectedVersion);
            if (updated == 0) throw new ConflictException("Custom field version is stale");
        });
    }

    public void deleteDefinition(UUID definitionId, long expectedVersion) {
        TenantContext context = contextWithCapability();
        executor.writeWithoutResult(jdbc -> {
            DefinitionView definition = findDefinition(jdbc, context, definitionId);
            requireActiveProject(jdbc, context, definition.projectId());
            requireProjectRole(jdbc, context, definition.projectId(), ProjectRole.MANAGER);
            int updated = jdbc.update("""
                    UPDATE custom_definitions SET deleted_at=now(),version=version+1,updated_at=now()
                    WHERE tenant_id=? AND id=? AND version=? AND deleted_at IS NULL
                    """, context.tenantId(), definitionId, expectedVersion);
            if (updated == 0) throw new ConflictException("Customization definition version is stale");
        });
    }

    public DefinitionView restoreDefinition(UUID definitionId, long expectedVersion) {
        TenantContext context = contextWithCapability();
        return executor.write(jdbc -> {
            List<DeletedDefinition> rows = jdbc.query("""
                    SELECT project_id,kind FROM custom_definitions
                    WHERE tenant_id=? AND id=? AND deleted_at IS NOT NULL
                    """, (rs, rowNum) -> new DeletedDefinition(
                    rs.getObject(1, UUID.class), CustomDefinitionKind.valueOf(rs.getString(2))),
                    context.tenantId(), definitionId);
            if (rows.isEmpty()) throw new NotFoundException("Deleted customization definition not found");
            DeletedDefinition row = rows.getFirst();
            requireActiveProject(jdbc, context, row.projectId());
            requireProjectRole(jdbc, context, row.projectId(), ProjectRole.MANAGER);
            int updated = jdbc.update("""
                    UPDATE custom_definitions SET deleted_at=NULL,version=version+1,updated_at=now()
                    WHERE tenant_id=? AND id=? AND version=? AND deleted_at IS NOT NULL
                    """, context.tenantId(), definitionId, expectedVersion);
            if (updated == 0) throw new ConflictException("Customization definition version is stale");
            return findDefinition(jdbc, context, definitionId);
        });
    }

    public DefinitionView restoreField(UUID definitionId, UUID fieldId, long expectedVersion) {
        TenantContext context = contextWithCapability();
        return executor.write(jdbc -> {
            DefinitionView definition = findDefinition(jdbc, context, definitionId);
            requireActiveProject(jdbc, context, definition.projectId());
            requireProjectRole(jdbc, context, definition.projectId(), ProjectRole.MANAGER);
            int updated = jdbc.update("""
                    UPDATE custom_fields SET deleted_at=NULL,version=version+1,updated_at=now()
                    WHERE tenant_id=? AND id=? AND definition_id=? AND version=? AND deleted_at IS NOT NULL
                    """, context.tenantId(), fieldId, definitionId, expectedVersion);
            if (updated == 0) throw new ConflictException("Deleted custom field was not found or its version is stale");
            return findDefinition(jdbc, context, definitionId);
        });
    }

    public List<SchemaJobView> schemaJobs(UUID projectId) {
        TenantContext context = contextWithCapability();
        return executor.read(jdbc -> {
            requireProjectRole(jdbc, context, projectId, ProjectRole.MANAGER);
            return jdbc.query("""
                    SELECT j.id,j.definition_id,j.field_id,j.operation,j.target_version,j.status,
                           j.attempts,j.last_error,j.created_at,j.updated_at
                    FROM customization_schema_jobs j
                    JOIN custom_definitions d ON d.tenant_id=j.tenant_id AND d.id=j.definition_id
                    WHERE j.tenant_id=? AND d.project_id=? ORDER BY j.created_at DESC LIMIT 100
                    """, (rs, rowNum) -> new SchemaJobView(
                    rs.getObject("id", UUID.class), rs.getObject("definition_id", UUID.class),
                    rs.getObject("field_id", UUID.class), rs.getString("operation"),
                    rs.getLong("target_version"), rs.getString("status"), rs.getInt("attempts"),
                    rs.getString("last_error"), rs.getTimestamp("created_at").toInstant(),
                    rs.getTimestamp("updated_at").toInstant()), context.tenantId(), projectId);
        });
    }

    public List<RecordView> records(UUID definitionId) {
        TenantContext context = contextForRead();
        return executor.read(jdbc -> {
            DefinitionView definition = requireEntityDefinition(jdbc, context, definitionId, ProjectRole.VIEWER);
            String columns = activeFields(definition).stream().map(FieldView::physicalColumn)
                    .reduce("", (left, right) -> left + "," + identifier(right));
            List<Map<String, Object>> rows = jdbc.queryForList("SELECT id,version" + columns + " FROM "
                    + identifier(definition.physicalTable())
                    + " WHERE tenant_id=? AND project_id=? AND deleted_at IS NULL ORDER BY created_at DESC",
                    context.tenantId(), definition.projectId());
            return rows.stream().map(row -> recordView(definition, row)).toList();
        });
    }

    public RecordView createRecord(UUID definitionId, Map<String, Object> values) {
        TenantContext context = contextWithCapability();
        return executor.write(jdbc -> {
            DefinitionView definition = requireEntityDefinition(jdbc, context, definitionId, ProjectRole.MEMBER);
            requireActiveProject(jdbc, context, definition.projectId());
            List<FieldView> fields = activeFields(definition);
            Map<FieldView, Object> normalized = normalizedValues(fields, values);
            UUID id = UUID.randomUUID();
            StringBuilder columns = new StringBuilder("id,tenant_id,project_id,created_by");
            StringBuilder placeholders = new StringBuilder("?,?,?,?");
            List<Object> args = new ArrayList<>(List.of(id, context.tenantId(), definition.projectId(), context.userId()));
            normalized.forEach((field, value) -> {
                columns.append(',').append(identifier(field.physicalColumn()));
                placeholders.append(",?");
                args.add(value);
            });
            jdbc.update("INSERT INTO " + identifier(definition.physicalTable()) + "(" + columns + ") VALUES ("
                    + placeholders + ")", args.toArray());
            return record(jdbc, context, definition, id);
        });
    }

    public RecordView updateRecord(UUID definitionId, UUID recordId, Map<String, Object> values, long expectedVersion) {
        TenantContext context = contextWithCapability();
        return executor.write(jdbc -> {
            DefinitionView definition = requireEntityDefinition(jdbc, context, definitionId, ProjectRole.MEMBER);
            requireActiveProject(jdbc, context, definition.projectId());
            Map<FieldView, Object> normalized = normalizedValues(activeFields(definition), values);
            StringBuilder assignments = new StringBuilder();
            List<Object> args = new ArrayList<>();
            normalized.forEach((field, value) -> {
                if (!assignments.isEmpty()) assignments.append(',');
                assignments.append(identifier(field.physicalColumn())).append("=?");
                args.add(value);
            });
            if (!assignments.isEmpty()) assignments.append(',');
            assignments.append("version=version+1,updated_at=now()");
            args.add(context.tenantId());
            args.add(definition.projectId());
            args.add(recordId);
            args.add(expectedVersion);
            int updated = jdbc.update("UPDATE " + identifier(definition.physicalTable()) + " SET " + assignments
                    + " WHERE tenant_id=? AND project_id=? AND id=? AND version=? AND deleted_at IS NULL", args.toArray());
            if (updated == 0) throw new ConflictException("Custom record version is stale");
            return record(jdbc, context, definition, recordId);
        });
    }

    public void deleteRecord(UUID definitionId, UUID recordId, long expectedVersion) {
        TenantContext context = contextWithCapability();
        executor.writeWithoutResult(jdbc -> {
            DefinitionView definition = requireEntityDefinition(jdbc, context, definitionId, ProjectRole.MANAGER);
            requireActiveProject(jdbc, context, definition.projectId());
            int updated = jdbc.update("UPDATE " + identifier(definition.physicalTable())
                    + " SET deleted_at=now(),version=version+1,updated_at=now()"
                    + " WHERE tenant_id=? AND project_id=? AND id=? AND version=? AND deleted_at IS NULL",
                    context.tenantId(), definition.projectId(), recordId, expectedVersion);
            if (updated == 0) throw new ConflictException("Custom record version is stale");
        });
    }

    public TaskCustomDataView taskValues(UUID taskId) {
        TenantContext context = contextForRead();
        return executor.read(jdbc -> {
            UUID projectId = requireTaskProject(jdbc, context, taskId, ProjectRole.VIEWER);
            DefinitionView definition = taskDefinition(jdbc, context, projectId);
            if (definition == null || !"ACTIVE".equals(definition.status())) return new TaskCustomDataView(null, Map.of(), 0);
            return taskRecord(jdbc, context, taskId, definition);
        });
    }

    public TaskCustomDataView updateTaskValues(UUID taskId, Map<String, Object> values, long expectedVersion) {
        TenantContext context = contextWithCapability();
        return executor.write(jdbc -> {
            UUID projectId = requireTaskProject(jdbc, context, taskId, ProjectRole.MEMBER);
            requireActiveProject(jdbc, context, projectId);
            DefinitionView definition = taskDefinition(jdbc, context, projectId);
            if (definition == null || !"ACTIVE".equals(definition.status())) {
                throw new NotFoundException("Active Task custom field definition not found");
            }
            Map<FieldView, Object> normalized = normalizedValues(activeFields(definition), values);
            String table = identifier(definition.physicalTable());
            Long existingVersion = jdbc.query("SELECT version FROM " + table + " WHERE tenant_id=? AND task_id=?",
                    rs -> rs.next() ? rs.getLong(1) : null, context.tenantId(), taskId);
            if (existingVersion == null) {
                if (expectedVersion != 0) throw new ConflictException("Task custom data version is stale");
                StringBuilder columns = new StringBuilder("tenant_id,project_id,task_id");
                StringBuilder placeholders = new StringBuilder("?,?,?");
                List<Object> args = new ArrayList<>(List.of(context.tenantId(), projectId, taskId));
                normalized.forEach((field, value) -> {
                    columns.append(',').append(identifier(field.physicalColumn()));
                    placeholders.append(",?");
                    args.add(value);
                });
                jdbc.update("INSERT INTO " + table + "(" + columns + ") VALUES (" + placeholders + ")", args.toArray());
            } else {
                if (existingVersion != expectedVersion) throw new ConflictException("Task custom data version is stale");
                StringBuilder assignments = new StringBuilder();
                List<Object> args = new ArrayList<>();
                normalized.forEach((field, value) -> {
                    if (!assignments.isEmpty()) assignments.append(',');
                    assignments.append(identifier(field.physicalColumn())).append("=?");
                    args.add(value);
                });
                if (!assignments.isEmpty()) assignments.append(',');
                assignments.append("version=version+1,updated_at=now()");
                args.add(context.tenantId());
                args.add(taskId);
                args.add(expectedVersion);
                int updated = jdbc.update("UPDATE " + table + " SET " + assignments
                        + " WHERE tenant_id=? AND task_id=? AND version=?", args.toArray());
                if (updated == 0) throw new ConflictException("Task custom data version is stale");
            }
            invalidatePendingApproval(jdbc, context, taskId, "CUSTOM_FIELDS_CHANGED");
            return taskRecord(jdbc, context, taskId, definition);
        });
    }

    private DefinitionView requireEntityDefinition(
            JdbcTemplate jdbc, TenantContext context, UUID definitionId, ProjectRole role) {
        DefinitionView definition = findDefinition(jdbc, context, definitionId);
        if (definition.kind() != CustomDefinitionKind.ENTITY || !"ACTIVE".equals(definition.status())) {
            throw new ConflictException("Active entity definition is required");
        }
        requireProjectRole(jdbc, context, definition.projectId(), role);
        return definition;
    }

    private DefinitionView findDefinition(JdbcTemplate jdbc, TenantContext context, UUID definitionId) {
        List<DefinitionView> rows = jdbc.query("""
                SELECT id,project_id,kind,display_name,physical_table,status,version,last_error
                FROM custom_definitions WHERE tenant_id=? AND id=? AND deleted_at IS NULL
                """, (rs, rowNum) -> definitionRow(jdbc, context, rs), context.tenantId(), definitionId);
        if (rows.isEmpty()) throw new NotFoundException("Customization definition not found");
        return rows.getFirst();
    }

    private DefinitionView definitionRow(
            JdbcTemplate jdbc, TenantContext context, java.sql.ResultSet rs) throws java.sql.SQLException {
        UUID id = rs.getObject("id", UUID.class);
        List<FieldView> fields = jdbc.query("""
                SELECT id,display_name,physical_column,data_type,options_json::text,required,position,status,version,last_error
                FROM custom_fields WHERE tenant_id=? AND definition_id=? AND deleted_at IS NULL ORDER BY position,created_at
                """, (fieldRs, rowNum) -> new FieldView(
                        fieldRs.getObject("id", UUID.class), fieldRs.getString("display_name"),
                        fieldRs.getString("physical_column"), CustomFieldType.valueOf(fieldRs.getString("data_type")),
                        readOptions(fieldRs.getString("options_json")), fieldRs.getBoolean("required"),
                        fieldRs.getInt("position"), fieldRs.getString("status"), fieldRs.getLong("version"),
                        fieldRs.getString("last_error")), context.tenantId(), id);
        return new DefinitionView(id, rs.getObject("project_id", UUID.class),
                CustomDefinitionKind.valueOf(rs.getString("kind")), rs.getString("display_name"),
                rs.getString("physical_table"), rs.getString("status"), rs.getLong("version"),
                rs.getString("last_error"), fields);
    }

    private List<String> readOptions(String json) {
        JsonNode node = objectMapper.readTree(json);
        List<String> result = new ArrayList<>();
        node.forEach(item -> result.add(item.asText()));
        return List.copyOf(result);
    }

    private List<String> normalizeOptions(CustomFieldType type, List<String> options) {
        if (type != CustomFieldType.SINGLE_SELECT) return List.of();
        List<String> normalized = (options == null ? List.<String>of() : options).stream()
                .map(String::trim).filter(value -> !value.isBlank()).distinct().limit(50).toList();
        if (normalized.isEmpty()) throw new IllegalArgumentException("Single-select field requires at least one option");
        if (normalized.stream().anyMatch(value -> value.length() > 120)) {
            throw new IllegalArgumentException("Custom field option is too long");
        }
        return normalized;
    }

    private Map<FieldView, Object> normalizedValues(List<FieldView> fields, Map<String, Object> values) {
        Map<String, Object> supplied = values == null ? Map.of() : values;
        for (String key : supplied.keySet()) {
            if (fields.stream().noneMatch(field -> field.id().toString().equals(key))) {
                throw new IllegalArgumentException("Unknown custom field " + key);
            }
        }
        Map<FieldView, Object> result = new LinkedHashMap<>();
        for (FieldView field : fields) {
            Object raw = supplied.get(field.id().toString());
            if (raw == null || raw instanceof String text && text.isBlank()) {
                if (field.required()) throw new IllegalArgumentException("A required custom field is missing: " + field.displayName());
                result.put(field, null);
                continue;
            }
            result.put(field, normalizeValue(field, raw));
        }
        return result;
    }

    private Object normalizeValue(FieldView field, Object raw) {
        try {
            return switch (field.dataType()) {
                case TEXT -> {
                    String value = String.valueOf(raw).trim();
                    if (value.length() > 4000) throw new IllegalArgumentException("Custom text value is too long");
                    yield value;
                }
                case NUMBER -> new BigDecimal(String.valueOf(raw));
                case BOOLEAN -> {
                    if (raw instanceof Boolean value) yield value;
                    String value = String.valueOf(raw);
                    if (!value.equalsIgnoreCase("true") && !value.equalsIgnoreCase("false")) {
                        throw new IllegalArgumentException("Invalid boolean value");
                    }
                    yield Boolean.valueOf(value);
                }
                case DATE -> Date.valueOf(LocalDate.parse(String.valueOf(raw)));
                case SINGLE_SELECT -> {
                    String value = String.valueOf(raw).trim();
                    if (!field.options().contains(value)) throw new IllegalArgumentException("Invalid custom field option");
                    yield value;
                }
            };
        } catch (NumberFormatException | java.time.DateTimeException exception) {
            throw new IllegalArgumentException("Invalid value for custom field " + field.displayName(), exception);
        }
    }

    private List<FieldView> activeFields(DefinitionView definition) {
        return definition.fields().stream().filter(field -> "ACTIVE".equals(field.status())).toList();
    }

    private RecordView record(JdbcTemplate jdbc, TenantContext context, DefinitionView definition, UUID id) {
        String columns = activeFields(definition).stream().map(FieldView::physicalColumn)
                .reduce("", (left, right) -> left + "," + identifier(right));
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT id,version" + columns + " FROM "
                + identifier(definition.physicalTable())
                + " WHERE tenant_id=? AND project_id=? AND id=? AND deleted_at IS NULL",
                context.tenantId(), definition.projectId(), id);
        if (rows.isEmpty()) throw new NotFoundException("Custom record not found");
        return recordView(definition, rows.getFirst());
    }

    private RecordView recordView(DefinitionView definition, Map<String, Object> row) {
        Map<String, Object> values = new LinkedHashMap<>();
        for (FieldView field : activeFields(definition)) {
            Object value = row.get(field.physicalColumn());
            if (value instanceof Date date) value = date.toLocalDate().toString();
            values.put(field.id().toString(), value);
        }
        return new RecordView((UUID) row.get("id"), ((Number) row.get("version")).longValue(), values);
    }

    private TaskCustomDataView taskRecord(
            JdbcTemplate jdbc, TenantContext context, UUID taskId, DefinitionView definition) {
        String columns = activeFields(definition).stream().map(FieldView::physicalColumn)
                .reduce("", (left, right) -> left + "," + identifier(right));
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT version" + columns + " FROM "
                + identifier(definition.physicalTable()) + " WHERE tenant_id=? AND task_id=?",
                context.tenantId(), taskId);
        Map<String, Object> values = new LinkedHashMap<>();
        activeFields(definition).forEach(field -> values.put(field.id().toString(), null));
        long version = 0;
        if (!rows.isEmpty()) {
            Map<String, Object> row = rows.getFirst();
            version = ((Number) row.get("version")).longValue();
            for (FieldView field : activeFields(definition)) {
                Object value = row.get(field.physicalColumn());
                if (value instanceof Date date) value = date.toLocalDate().toString();
                values.put(field.id().toString(), value);
            }
        }
        return new TaskCustomDataView(definition, values, version);
    }

    private DefinitionView taskDefinition(JdbcTemplate jdbc, TenantContext context, UUID projectId) {
        List<DefinitionView> rows = jdbc.query("""
                SELECT id,project_id,kind,display_name,physical_table,status,version,last_error
                FROM custom_definitions
                WHERE tenant_id=? AND project_id=? AND kind='TASK' AND deleted_at IS NULL
                """, (rs, rowNum) -> definitionRow(jdbc, context, rs), context.tenantId(), projectId);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private UUID requireTaskProject(
            JdbcTemplate jdbc, TenantContext context, UUID taskId, ProjectRole role) {
        UUID projectId = jdbc.query("SELECT project_id FROM tasks WHERE tenant_id=? AND id=? AND deleted_at IS NULL",
                rs -> rs.next() ? rs.getObject(1, UUID.class) : null, context.tenantId(), taskId);
        if (projectId == null) throw new NotFoundException("Task not found");
        requireProjectRole(jdbc, context, projectId, role);
        return projectId;
    }

    private long countRows(JdbcTemplate jdbc, DefinitionView definition) {
        if (definition.kind() == CustomDefinitionKind.TASK) {
            return jdbc.queryForObject("SELECT count(*) FROM tasks WHERE tenant_id=? AND project_id=? AND deleted_at IS NULL",
                    Long.class, TenantContextHolder.getRequired().tenantId(), definition.projectId());
        }
        return jdbc.queryForObject("SELECT count(*) FROM " + identifier(definition.physicalTable())
                + " WHERE tenant_id=? AND project_id=? AND deleted_at IS NULL", Long.class,
                TenantContextHolder.getRequired().tenantId(), definition.projectId());
    }

    private long nullValueCount(JdbcTemplate jdbc, DefinitionView definition, FieldView field) {
        String key = definition.kind() == CustomDefinitionKind.TASK ? "task_id" : "id";
        String base = definition.kind() == CustomDefinitionKind.TASK
                ? "" : " AND deleted_at IS NULL";
        return jdbc.queryForObject("SELECT count(" + key + ") FROM " + identifier(definition.physicalTable())
                + " WHERE tenant_id=? AND " + identifier(field.physicalColumn()) + " IS NULL" + base,
                Long.class, TenantContextHolder.getRequired().tenantId());
    }

    private long invalidOptionCount(
            JdbcTemplate jdbc, DefinitionView definition, FieldView field, List<String> options) {
        String column = identifier(field.physicalColumn());
        if (options.isEmpty()) return nullValueCount(jdbc, definition, field);
        String placeholders = String.join(",", java.util.Collections.nCopies(options.size(), "?"));
        List<Object> args = new ArrayList<>();
        args.add(TenantContextHolder.getRequired().tenantId());
        args.addAll(options);
        return jdbc.queryForObject("SELECT count(*) FROM " + identifier(definition.physicalTable())
                + " WHERE tenant_id=? AND " + column + " IS NOT NULL AND " + column + " NOT IN (" + placeholders + ")",
                Long.class, args.toArray());
    }

    private void enqueue(
            JdbcTemplate jdbc, TenantContext context, UUID definitionId, UUID fieldId, String operation, long targetVersion) {
        jdbc.update("""
                INSERT INTO customization_schema_jobs(
                    id,tenant_id,definition_id,field_id,operation,target_version,status)
                VALUES (?,?,?,?,?,?,'QUEUED')
                """, UUID.randomUUID(), context.tenantId(), definitionId, fieldId, operation, targetVersion);
    }

    private void invalidatePendingApproval(JdbcTemplate jdbc, TenantContext context, UUID taskId, String reason) {
        ApprovalService.invalidatePending(jdbc, context, taskId, reason, objectMapper);
    }

    private void audit(
            JdbcTemplate jdbc, TenantContext context, String type, String aggregateType, UUID aggregateId,
            Map<String, ?> details) {
        jdbc.update("""
                INSERT INTO audit_events(
                    id,tenant_id,actor_user_id,event_type,aggregate_type,aggregate_id,correlation_id,details_json)
                VALUES (?,?,?,?,?,?,?,CAST(? AS jsonb))
                """, UUID.randomUUID(), context.tenantId(), context.userId(), type, aggregateType,
                aggregateId, context.correlationId(), objectMapper.writeValueAsString(details));
    }

    private TenantContext contextWithCapability() {
        TenantContext context = TenantContextHolder.getRequired();
        capabilities.require(context.tenantId(), TenantCapability.CUSTOM_DATA);
        return context;
    }

    private TenantContext contextForRead() {
        TenantContext context = TenantContextHolder.getRequired();
        if (!TenantCapabilityService.supported(context.placement(), TenantCapability.CUSTOM_DATA)) {
            throw new TenantAccessDeniedException("Custom data is outside the selected tenant placement");
        }
        return context;
    }

    private void requireProjectRole(
            JdbcTemplate jdbc, TenantContext context, UUID projectId, ProjectRole minimum) {
        List<String> roles = jdbc.query("""
                SELECT pm.role FROM project_memberships pm
                JOIN projects p ON p.tenant_id=pm.tenant_id AND p.id=pm.project_id
                WHERE pm.tenant_id=? AND pm.project_id=? AND pm.user_id=? AND p.status<>'DELETED'
                """, (rs, rowNum) -> rs.getString(1), context.tenantId(), projectId, context.userId());
        if (roles.isEmpty() || roleRank(ProjectRole.valueOf(roles.getFirst())) < roleRank(minimum)) {
            throw new TenantAccessDeniedException("Insufficient project role");
        }
    }

    private void requireActiveProject(JdbcTemplate jdbc, TenantContext context, UUID projectId) {
        Long count = jdbc.queryForObject(
                "SELECT count(*) FROM projects WHERE tenant_id=? AND id=? AND status='ACTIVE'",
                Long.class, context.tenantId(), projectId);
        if (count == null || count == 0) throw new ConflictException("Project is not active");
    }

    private int roleRank(ProjectRole role) {
        return switch (role) { case VIEWER -> 1; case MEMBER -> 2; case MANAGER -> 3; };
    }

    private String normalizedName(String value) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.length() < 2 || normalized.length() > 120) {
            throw new IllegalArgumentException("Customization name must contain 2 to 120 characters");
        }
        return normalized;
    }

    private String identifier(String value) {
        if (value == null || !value.matches("[a-z_][a-z0-9_]{0,62}")) {
            throw new IllegalArgumentException("Unsafe customization identifier");
        }
        return value;
    }

    public record DefinitionView(
            UUID id, UUID projectId, CustomDefinitionKind kind, String displayName, String physicalTable,
            String status, long version, String lastError, List<FieldView> fields) {}
    public record FieldView(
            UUID id, String displayName, String physicalColumn, CustomFieldType dataType, List<String> options,
            boolean required, int position, String status, long version, String lastError) {}
    public record RecordView(UUID id, long version, Map<String, Object> values) {}
    public record TaskCustomDataView(DefinitionView definition, Map<String, Object> values, long version) {}
    public record SchemaJobView(
            UUID id, UUID definitionId, UUID fieldId, String operation, long targetVersion, String status,
            int attempts, String lastError, java.time.Instant createdAt, java.time.Instant updatedAt) {}
    private record DeletedDefinition(UUID projectId, CustomDefinitionKind kind) {}
}
