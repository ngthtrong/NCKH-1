package vn.tenantflow.service;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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

import java.util.List;
import java.util.UUID;

@Service
public class AdminTenantService {

    private final TenantRepository tenantRepository;
    private final TenantUserRepository tenantUserRepository;
    private final BoardRepository boardRepository;
    private final BoardColumnRepository columnRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    public AdminTenantService(TenantRepository tenantRepository,
                              TenantUserRepository tenantUserRepository,
                              BoardRepository boardRepository,
                              BoardColumnRepository columnRepository,
                              PasswordEncoder passwordEncoder,
                              JdbcTemplate jdbcTemplate) {
        this.tenantRepository = tenantRepository;
        this.tenantUserRepository = tenantUserRepository;
        this.boardRepository = boardRepository;
        this.columnRepository = columnRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Tenant> listAllTenants() {
        return tenantRepository.findAll();
    }

    @Transactional
    public Tenant createTenant(String slug, String name, String tier, String adminEmail, String adminName, String adminPassword) {
        String normalizedSlug = slug.trim().toLowerCase();
        if (tenantRepository.existsBySlug(normalizedSlug)) {
            throw new ApiException(HttpStatus.CONFLICT, "SLUG_EXISTS", "Slug '" + normalizedSlug + "' đã tồn tại");
        }

        TenantSettings defaults = TenantSettings.defaults();
        Tenant tenant = new Tenant();
        tenant.setSlug(normalizedSlug);
        tenant.setName(name.trim());
        tenant.setTier(tier.toUpperCase());
        tenant.setStatus("ACTIVE");
        tenant.setSettings(defaults);
        tenant = tenantRepository.save(tenant);

        // Set RLS context for the newly created tenant so we can insert its sample board & columns
        jdbcTemplate.queryForObject(
                "SELECT set_config('app.current_tenant_id', ?, true)",
                String.class,
                tenant.getId().toString()
        );

        // Create default Tenant Admin user if provided
        if (adminEmail != null && !adminEmail.isBlank()) {
            TenantUser admin = new TenantUser();
            admin.setTenantId(tenant.getId());
            admin.setEmail(adminEmail.trim().toLowerCase());
            admin.setFullName((adminName != null && !adminName.isBlank()) ? adminName.trim() : "Tenant Admin");
            admin.setPasswordHash(passwordEncoder.encode((adminPassword != null && !adminPassword.isBlank()) ? adminPassword : "Password123!"));
            admin.setRole("TENANT_ADMIN");
            tenantUserRepository.save(admin);
        }

        // Auto-create 1 sample Kanban board using defaultColumns
        Board board = new Board();
        board.setTenantId(tenant.getId());
        board.setName("Bảng công việc " + tenant.getName());
        board = boardRepository.save(board);

        List<String> cols = defaults.defaultColumns();
        for (int i = 0; i < cols.size(); i++) {
            BoardColumn col = new BoardColumn();
            col.setTenantId(tenant.getId());
            col.setBoardId(board.getId());
            col.setName(cols.get(i));
            col.setPosition(i);
            boolean isFirstOrLast = (i == 0 || i == cols.size() - 1);
            col.setWipLimit(isFirstOrLast ? null : defaults.defaultWipLimit());
            columnRepository.save(col);
        }

        return tenant;
    }

    @Transactional
    public Tenant updateTenantStatus(UUID tenantId, String status) {
        String normalized = status.trim().toUpperCase();
        if (!"ACTIVE".equals(normalized) && !"SUSPENDED".equals(normalized)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_STATUS", "Trạng thái phải là ACTIVE hoặc SUSPENDED");
        }
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND", "Không tìm thấy tổ chức"));
        tenant.setStatus(normalized);
        return tenantRepository.save(tenant);
    }
}
