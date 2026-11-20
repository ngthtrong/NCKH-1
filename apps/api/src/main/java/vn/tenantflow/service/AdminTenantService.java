package vn.tenantflow.service;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.tenantflow.cache.TenantConfigCacheService;
import vn.tenantflow.domain.entity.Board;
import vn.tenantflow.domain.entity.BoardColumn;
import vn.tenantflow.domain.entity.Tenant;
import vn.tenantflow.domain.entity.TenantUser;
import vn.tenantflow.domain.model.ApiException;
import vn.tenantflow.domain.model.TenantSettings;
import vn.tenantflow.domain.repository.BoardColumnRepository;
import vn.tenantflow.domain.repository.BoardRepository;
import vn.tenantflow.domain.repository.TenantRepository;
import vn.tenantflow.domain.repository.TenantUserRepository;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AdminTenantService {

    private final TenantRepository tenantRepository;
    private final TenantUserRepository tenantUserRepository;
    private final BoardRepository boardRepository;
    private final BoardColumnRepository columnRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;
    private final TenantConfigCacheService cacheService;

    public AdminTenantService(TenantRepository tenantRepository,
                              TenantUserRepository tenantUserRepository,
                              BoardRepository boardRepository,
                              BoardColumnRepository columnRepository,
                              PasswordEncoder passwordEncoder,
                              JdbcTemplate jdbcTemplate,
                              TenantConfigCacheService cacheService) {
        this.tenantRepository = tenantRepository;
        this.tenantUserRepository = tenantUserRepository;
        this.boardRepository = boardRepository;
        this.columnRepository = columnRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
        this.cacheService = cacheService;
    }

    public List<Map<String, Object>> listAllTenants() {
        return tenantRepository.findAll().stream().map(t -> {
            long memberCount = tenantUserRepository.findByTenantIdOrderByCreatedAtAsc(t.getId()).size();
            long blocked429 = cacheService.getBlocked429Count(t.getId());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", t.getId());
            row.put("slug", t.getSlug());
            row.put("name", t.getName());
            row.put("tier", t.getTier());
            row.put("rateLimitRpm", t.getRateLimitRpm());
            row.put("maxMembers", t.getMaxMembers());
            row.put("status", t.getStatus());
            row.put("settings", t.getSettings());
            row.put("memberCount", memberCount);
            row.put("blocked429Count", blocked429);
            row.put("createdAt", t.getCreatedAt());
            return row;
        }).toList();
    }

    @Transactional
    public Tenant createTenant(String slug, String name, String tier, String industryTemplate,
                               Integer rateLimitRpm, Integer maxMembers,
                               String adminEmail, String adminName, String adminPassword) {
        String normalizedSlug = slug.trim().toLowerCase().replaceAll("[^a-z0-9-]", "");
        if (normalizedSlug.isBlank() || "admin".equals(normalizedSlug)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SLUG", "Subdomain slug không hợp lệ");
        }
        if (tenantRepository.existsBySlug(normalizedSlug)) {
            throw new ApiException(HttpStatus.CONFLICT, "SLUG_EXISTS", "Subdomain '" + normalizedSlug + "' đã tồn tại");
        }

        String normalizedTier = (tier != null && !tier.isBlank()) ? tier.trim().toUpperCase() : "STANDARD";
        int rpm = rateLimitRpm != null ? rateLimitRpm : defaultRpmForTier(normalizedTier);
        int membersLimit = maxMembers != null ? maxMembers : defaultMaxMembersForTier(normalizedTier);
        String logoText = normalizedSlug.replaceFirst("^t-", "").toUpperCase();
        if (logoText.length() > 8) logoText = logoText.substring(0, 8);

        TenantSettings settings = "MEDIA".equalsIgnoreCase(industryTemplate)
                ? TenantSettings.mediaTemplate(logoText, null)
                : TenantSettings.softwareTemplate(logoText, null);

        Tenant tenant = new Tenant();
        tenant.setSlug(normalizedSlug);
        tenant.setName(name.trim());
        tenant.setTier(normalizedTier);
        tenant.setRateLimitRpm(rpm);
        tenant.setMaxMembers(membersLimit);
        tenant.setStatus("ACTIVE");
        tenant.setSettings(settings);
        tenant = tenantRepository.save(tenant);

        // Set RLS context for the newly created tenant to insert sample board & columns
        jdbcTemplate.queryForObject(
                "SELECT set_config('app.current_tenant_id', ?, true)",
                String.class,
                tenant.getId().toString()
        );

        if (adminEmail != null && !adminEmail.isBlank()) {
            TenantUser admin = new TenantUser();
            admin.setTenantId(tenant.getId());
            admin.setEmail(adminEmail.trim().toLowerCase());
            admin.setFullName((adminName != null && !adminName.isBlank()) ? adminName.trim() : "Quản trị viên " + tenant.getName());
            admin.setPasswordHash(passwordEncoder.encode((adminPassword != null && !adminPassword.isBlank()) ? adminPassword : "Password123!"));
            admin.setRole("TENANT_ADMIN");
            tenantUserRepository.save(admin);
        }

        Board board = new Board();
        board.setTenantId(tenant.getId());
        board.setName("Bảng công việc " + tenant.getName());
        board = boardRepository.save(board);

        List<String> cols = settings.defaultColumns();
        for (int i = 0; i < cols.size(); i++) {
            BoardColumn col = new BoardColumn();
            col.setTenantId(tenant.getId());
            col.setBoardId(board.getId());
            col.setName(cols.get(i));
            col.setPosition(i);
            boolean isFirstOrLast = (i == 0 || i == cols.size() - 1);
            col.setWipLimit(isFirstOrLast ? null : settings.defaultWipLimit());
            columnRepository.save(col);
        }

        return tenant;
    }

    @Transactional
    public Tenant updateTenant(UUID tenantId, String status, String tier, Integer rateLimitRpm, Integer maxMembers) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND", "Không tìm thấy tổ chức"));

        if (status != null && !status.isBlank()) {
            String normalized = status.trim().toUpperCase();
            if (!"ACTIVE".equals(normalized) && !"SUSPENDED".equals(normalized)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_STATUS", "Trạng thái phải là ACTIVE hoặc SUSPENDED");
            }
            tenant.setStatus(normalized);
        }
        if (tier != null && !tier.isBlank()) {
            String normalizedTier = tier.trim().toUpperCase();
            tenant.setTier(normalizedTier);
            if (rateLimitRpm == null) {
                tenant.setRateLimitRpm(defaultRpmForTier(normalizedTier));
            }
        }
        if (rateLimitRpm != null && rateLimitRpm > 0) {
            tenant.setRateLimitRpm(rateLimitRpm);
        }
        if (maxMembers != null && maxMembers > 0) {
            tenant.setMaxMembers(maxMembers);
        }

        tenant = tenantRepository.save(tenant);
        cacheService.invalidateTenantConfig(tenantId);
        return tenant;
    }

    private int defaultRpmForTier(String tier) {
        return switch (tier) {
            case "ENTERPRISE" -> 600;
            case "PRO" -> 120;
            default -> 30; // STANDARD / FREE
        };
    }

    private int defaultMaxMembersForTier(String tier) {
        return switch (tier) {
            case "ENTERPRISE" -> 500;
            case "PRO" -> 50;
            default -> 10;
        };
    }
}
