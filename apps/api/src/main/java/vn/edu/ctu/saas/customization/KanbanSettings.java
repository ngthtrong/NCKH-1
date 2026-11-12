package vn.edu.ctu.saas.customization;

import java.util.List;

/** Tenant metadata for the shared-table, maturity-level-3 application. */
public record KanbanSettings(String wipMode, int wipLimit, String cardStyle,
                             List<String> defaultColumns, List<Field> fields) {
    public record Field(String key, String label, String type, boolean required) {}

    public static KanbanSettings defaults() {
        return new KanbanSettings("OFF", 2, "FULL", List.of("To do", "In progress", "Done"), List.of());
    }

    public void validate() {
        if (!List.of("STRICT", "WARN", "OFF").contains(wipMode == null ? "" : wipMode)
                || wipLimit < 1 || wipLimit > 10000
                || !List.of("FULL", "COMPACT").contains(cardStyle == null ? "" : cardStyle)) {
            throw new IllegalArgumentException("Invalid WIP mode, limit or card style");
        }
        if (defaultColumns == null || defaultColumns.size() < 2 || defaultColumns.size() > 12
                || defaultColumns.stream().anyMatch(v -> v == null || v.isBlank() || v.length() > 120)
                || defaultColumns.stream().distinct().count() != defaultColumns.size()) {
            throw new IllegalArgumentException("Choose 2–12 distinct column names, up to 120 characters each");
        }
        if (fields == null || fields.size() > 30) throw new IllegalArgumentException("At most 30 fields are allowed");
        var keys = new java.util.HashSet<String>();
        for (Field field : fields) {
            if (field == null || field.key() == null || !field.key().matches("[a-z][a-z0-9_]{0,39}")
                    || !keys.add(field.key()) || field.label() == null || field.label().isBlank()
                    || field.label().length() > 120
                    || !List.of("STRING", "NUMBER", "BOOLEAN").contains(field.type() == null ? "" : field.type())) {
                throw new IllegalArgumentException("Fields need unique lowercase keys, labels and STRING/NUMBER/BOOLEAN types");
            }
        }
    }

    public void validateData(java.util.Map<String, Object> data) {
        if (data == null) throw new IllegalArgumentException("Custom data must be an object");
        if (data.keySet().stream().anyMatch(k -> fields.stream().noneMatch(f -> f.key().equals(k)))) {
            throw new IllegalArgumentException("Custom data contains fields outside this tenant's schema");
        }
        for (Field field : fields) {
            Object value = data.get(field.key());
            if (value == null || value instanceof String s && s.isBlank()) {
                if (field.required()) throw new IllegalArgumentException("Required field: " + field.label());
                continue;
            }
            boolean valid = switch (field.type()) {
                case "STRING" -> value instanceof String s && s.length() <= 5000;
                case "NUMBER" -> value instanceof Number n && Double.isFinite(n.doubleValue());
                case "BOOLEAN" -> value instanceof Boolean;
                default -> false;
            };
            if (!valid) throw new IllegalArgumentException("Invalid type or value for " + field.label());
        }
    }
}
