package vn.tenantflow.domain.model;

import java.util.List;

public record TenantSettings(
        Theme theme,
        String wipMode,
        Integer defaultWipLimit,
        String cardDisplayMode,
        List<String> defaultColumns,
        List<CustomFieldDef> customFields
) {
    public record Theme(String primary, String accent) {}

    public record CustomFieldDef(String key, String label, String type, boolean required) {}

    public static TenantSettings defaults() {
        return new TenantSettings(
                new Theme("#1D4ED8", "#0EA5E9"),
                "STRICT",
                2,
                "FULL",
                List.of("Chờ xử lý", "Đang làm", "Rà soát", "Hoàn thành"),
                List.of(
                        new CustomFieldDef("story_points", "Điểm nỗ lực", "NUMBER", true),
                        new CustomFieldDef("sprint", "Đợt phát triển", "TEXT", false)
                )
        );
    }
}
