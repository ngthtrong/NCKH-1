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
    public record Theme(String primary, String accent, String logoText, String tagline) {}

    public record CustomFieldDef(
            String key,
            String label,
            String type,
            boolean required,
            List<String> options
    ) {}

    public static TenantSettings defaults() {
        return softwareTemplate("TENANT", "Không gian làm việc Kanban đa thuê bao");
    }

    public static TenantSettings softwareTemplate(String logoText, String tagline) {
        return new TenantSettings(
                new Theme("#0d6efd", "#0ea5e9", logoText, tagline != null ? tagline : "Phát triển phần mềm chuẩn mực"),
                "STRICT",
                2,
                "FULL",
                List.of("Backlog", "In Progress", "Code Review", "Done"),
                List.of(
                        new CustomFieldDef("story_points", "Story Points", "NUMBER", true, List.of()),
                        new CustomFieldDef("bug_severity", "Mức độ lỗi", "SELECT", false, List.of("Low", "Medium", "Critical")),
                        new CustomFieldDef("pull_request_url", "Pull Request URL", "TEXT", false, List.of())
                )
        );
    }

    public static TenantSettings mediaTemplate(String logoText, String tagline) {
        return new TenantSettings(
                new Theme("#fd7e14", "#be185d", logoText, tagline != null ? tagline : "Sáng tạo nội dung đa nền tảng"),
                "WARN",
                3,
                "COMPACT",
                List.of("Ý tưởng", "Sản xuất", "Duyệt nội dung", "Xuất bản"),
                List.of(
                        new CustomFieldDef("channel", "Kênh phát hành", "SELECT", false, List.of("Facebook", "TikTok", "YouTube")),
                        new CustomFieldDef("budget_vnd", "Ngân sách (VNĐ)", "NUMBER", false, List.of()),
                        new CustomFieldDef("publish_date", "Ngày xuất bản", "DATE", false, List.of())
                )
        );
    }
}
