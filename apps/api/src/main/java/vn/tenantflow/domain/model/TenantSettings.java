package vn.tenantflow.domain.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TenantSettings(
        Theme theme,
        String wipMode,
        Integer defaultWipLimit,
        String cardDisplayMode,
        String cardDensity,
        List<String> defaultColumns,
        List<CustomFieldDef> customFields,
        String inviteCode
) {
    public TenantSettings {
        if (cardDensity == null && cardDisplayMode != null) {
            cardDensity = cardDisplayMode;
        }
        if (cardDisplayMode == null && cardDensity != null) {
            cardDisplayMode = cardDensity;
        }
    }

    public TenantSettings(
            Theme theme,
            String wipMode,
            Integer defaultWipLimit,
            String cardDisplayMode,
            List<String> defaultColumns,
            List<CustomFieldDef> customFields,
            String inviteCode
    ) {
        this(theme, wipMode, defaultWipLimit, cardDisplayMode, cardDisplayMode, defaultColumns, customFields, inviteCode);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Theme(String primary, String accent, String logoText, String tagline) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CustomFieldDef(
            String key,
            String label,
            String type,
            boolean required,
            List<String> options
    ) {}

    public String effectiveInviteCode(String slug) {
        if (inviteCode != null && !inviteCode.isBlank()) {
            return inviteCode.trim().toUpperCase();
        }
        if (slug != null && !slug.isBlank()) {
            String clean = slug.trim().toUpperCase().replace("T-", "");
            return clean + "-2026";
        }
        return "TF-2026";
    }

    public static TenantSettings defaults() {
        return softwareTemplate("TENANT", "Nền tảng điều phối công việc đa thuê bao", "TENANT-2026");
    }

    public static TenantSettings softwareTemplate(String logoText, String tagline) {
        return softwareTemplate(logoText, tagline, (logoText != null ? logoText.toUpperCase() : "ACME") + "-2026");
    }

    public static TenantSettings softwareTemplate(String logoText, String tagline, String inviteCode) {
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
                ),
                inviteCode != null ? inviteCode : "ACME-2026"
        );
    }

    public static TenantSettings mediaTemplate(String logoText, String tagline) {
        return mediaTemplate(logoText, tagline, (logoText != null ? logoText.toUpperCase() : "LOTUS") + "-2026");
    }

    public static TenantSettings mediaTemplate(String logoText, String tagline, String inviteCode) {
        return new TenantSettings(
                new Theme("#fd7e14", "#be185d", logoText, tagline != null ? tagline : "Sáng tạo nội dung đa nền tảng"),
                "WARN",
                3,
                "COMPACT",
                List.of("Ý tưởng", "Sản xuất", "Duyệt nội dung", "Xuất bản"),
                List.of(
                        new CustomFieldDef("channel", "Kênh phát hành", "SELECT", false, List.of("Facebook", "TikTok", "YouTube")),
                        new CustomFieldDef("budget_vnd", "Ngân sách", "NUMBER", false, List.of()),
                        new CustomFieldDef("publish_date", "Ngày xuất bản", "DATE", false, List.of())
                ),
                inviteCode != null ? inviteCode : "LOTUS-2026"
        );
    }
}
