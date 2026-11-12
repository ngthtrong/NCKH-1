package vn.edu.ctu.saas.config;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.control.UserAccountEntity;
import vn.edu.ctu.saas.control.UserAccountRepository;
import vn.edu.ctu.saas.provisioning.ProvisioningService;
import vn.edu.ctu.saas.tenant.ProjectRole;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;
import vn.edu.ctu.saas.tenant.TenantPlacement;
import vn.edu.ctu.saas.tenant.TenantRole;
import vn.edu.ctu.saas.tenant.TenantStatus;

@Component
@Profile("worker")
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DemoDataInitializer {
    @org.springframework.beans.factory.annotation.Value("${app.report-mode:false}")
    private boolean reportMode;
    @org.springframework.beans.factory.annotation.Autowired
    private org.springframework.jdbc.core.JdbcTemplate controlJdbc;
    private static final Logger log = LoggerFactory.getLogger(DemoDataInitializer.class);
    private final AppProperties properties;
    private final UserAccountRepository userRepository;
    private final TenantRepository tenantRepository;
    private final TenantPlacementRepository placementRepository;
    private final TenantMembershipRepository membershipRepository;
    private final ProvisioningService provisioningService;
    private final PasswordEncoder passwordEncoder;
    private final TenantJdbcExecutor executor;

    public DemoDataInitializer(
            AppProperties properties,
            UserAccountRepository userRepository,
            TenantRepository tenantRepository,
            TenantPlacementRepository placementRepository,
            TenantMembershipRepository membershipRepository,
            ProvisioningService provisioningService,
            PasswordEncoder passwordEncoder,
            TenantJdbcExecutor executor) {
        this.properties = properties;
        this.userRepository = userRepository;
        this.tenantRepository = tenantRepository;
        this.placementRepository = placementRepository;
        this.membershipRepository = membershipRepository;
        this.provisioningService = provisioningService;
        this.passwordEncoder = passwordEncoder;
        this.executor = executor;
    }

    @Scheduled(initialDelayString = "PT1S", fixedDelayString = "PT30S")
    public void ensureDemoData() {
        SeedUsers users = ensureControlData();
        for (String slug : reportMode ? List.of("pool-demo", "t-acme", "t-lotus") : List.of("pool-demo", "schema-demo", "silo-demo")) {
            TenantEntity tenant = tenantRepository.findBySlug(slug).orElse(null);
            if (tenant != null && tenant.getStatus() == TenantStatus.ACTIVE) {
                seedApplicationData(tenant, users);
            }
        }
    }

    private SeedUsers ensureControlData() {
        UserAccountEntity owner = userRepository.findByEmailIgnoreCase(properties.seed().ownerEmail()).orElseGet(() -> {
            UserAccountEntity created = new UserAccountEntity();
            created.setEmail(properties.seed().ownerEmail().trim().toLowerCase());
            created.setDisplayName("Demo Owner");
            created.setPasswordHash(passwordEncoder.encode(properties.seed().ownerPassword()));
            created.setSystemAdmin(true);
            return userRepository.save(created);
        });
        if (!owner.isSystemAdmin()) {
            owner.setSystemAdmin(true);
            owner = userRepository.save(owner);
        }
        UserAccountEntity member = userRepository.findByEmailIgnoreCase("member@example.test").orElseGet(() -> {
            UserAccountEntity created = new UserAccountEntity();
            created.setEmail("member@example.test");
            created.setDisplayName("Demo Member");
            created.setPasswordHash(passwordEncoder.encode(properties.seed().ownerPassword()));
            return userRepository.save(created);
        });
        ensureTenant("pool-demo", "Pool Demo", "STARTER", TenantPlacement.POOL, owner, member);
        if (reportMode) {
            ensureTenant("t-acme", "Acme Software", "PROFESSIONAL", TenantPlacement.POOL, owner, member);
            ensureTenant("t-lotus", "Lotus Media", "PROFESSIONAL", TenantPlacement.POOL, owner, member);
        } else {
            ensureTenant("schema-demo", "Schema Demo", "PROFESSIONAL", TenantPlacement.SCHEMA_PER_TENANT, owner, member);
            ensureTenant("silo-demo", "Silo Demo", "ENTERPRISE", TenantPlacement.SILO_DATABASE, owner, member);
        }
        return new SeedUsers(owner, member);
    }

    private void ensureTenant(
            String slug,
            String name,
            String tier,
            TenantPlacement placementType,
            UserAccountEntity owner,
            UserAccountEntity member) {
        TenantEntity tenant = tenantRepository.findBySlug(slug).orElseGet(() -> {
            TenantEntity created = new TenantEntity();
            created.setSlug(slug);
            created.setName(name);
            created.setTier(tier);
            created.setStatus(TenantStatus.PROVISIONING);
            return tenantRepository.save(created);
        });
        TenantPlacementEntity placement = placementRepository.findByTenantId(tenant.getId()).orElse(null);
        if (placement == null) {
            TenantPlacementEntity createdPlacement = new TenantPlacementEntity();
            createdPlacement.setTenantId(tenant.getId());
            createdPlacement.setPlacementType(placementType);
            placementRepository.save(createdPlacement);
        } else if (placementType == TenantPlacement.SCHEMA_PER_TENANT
                && tenant.getStatus() == TenantStatus.ACTIVE
                && (placement.getSchemaName() == null || placement.getSchemaName().isBlank())) {
            tenant.setStatus(TenantStatus.PROVISIONING);
            tenant = tenantRepository.save(tenant);
        }
        ensureMembership(tenant.getId(), owner.getId(), TenantRole.OWNER);
        ensureMembership(tenant.getId(), member.getId(), TenantRole.MEMBER);
        String key = "seed:bridge-v2:" + tenant.getId();
        if (tenant.getStatus() != TenantStatus.ACTIVE) {
            provisioningService.enqueue(tenant.getId(), key);
        }
    }

    private void ensureMembership(UUID tenantId, UUID userId, TenantRole role) {
        if (membershipRepository.findByTenantIdAndUserId(tenantId, userId).isPresent()) return;
        TenantMembershipEntity membership = new TenantMembershipEntity();
        membership.setTenantId(tenantId);
        membership.setUserId(userId);
        membership.setRole(role);
        membershipRepository.save(membership);
    }

    private void seedApplicationData(TenantEntity tenant, SeedUsers users) {
        TenantPlacementEntity placement = placementRepository.findByTenantId(tenant.getId()).orElseThrow();
        String correlationId = "demo-seed-" + tenant.getId();
        TenantContextHolder.set(new TenantContext(
                users.owner().getId(), tenant.getId(), tenant.getSlug(), tenant.getTier(),
                placement.getPlacementType(), Set.of(TenantRole.OWNER), correlationId, correlationId));
        try {
            executor.writeWithoutResult(jdbc -> {
                if (reportMode && (tenant.getSlug().equals("t-acme") || tenant.getSlug().equals("t-lotus"))) {
                    boolean acme = tenant.getSlug().equals("t-acme");
                    String settings = acme
                            ? "{\"wipMode\":\"STRICT\",\"wipLimit\":2,\"cardStyle\":\"FULL\",\"defaultColumns\":[\"Backlog\",\"In Dev\",\"Code Review\",\"Done\"],\"fields\":[{\"key\":\"story_points\",\"label\":\"Story points\",\"type\":\"NUMBER\",\"required\":false},{\"key\":\"sprint\",\"label\":\"Sprint\",\"type\":\"STRING\",\"required\":false}]}"
                            : "{\"wipMode\":\"WARN\",\"wipLimit\":2,\"cardStyle\":\"COMPACT\",\"defaultColumns\":[\"Ý tưởng\",\"Sản xuất\",\"Phát hành\"],\"fields\":[{\"key\":\"channel\",\"label\":\"Kênh truyền thông\",\"type\":\"STRING\",\"required\":false},{\"key\":\"budget_usd\",\"label\":\"Ngân sách (USD)\",\"type\":\"NUMBER\",\"required\":false}]}";
                    jdbc.update("INSERT INTO tenant_kanban_settings(tenant_id,settings) VALUES (?,CAST(? AS jsonb)) ON CONFLICT DO NOTHING",
                            tenant.getId(), settings);
                    controlJdbc.update("""
                            INSERT INTO tenant_branding(id,tenant_id,primary_color,accent_color,version,created_at,updated_at)
                            VALUES (?,?,?,?,0,now(),now()) ON CONFLICT (tenant_id) DO NOTHING
                            """, UUID.randomUUID(), tenant.getId(), acme ? "#2563EB" : "#C2410C", acme ? "#0284C7" : "#EA580C");
                }
                UUID projectId = stableId(tenant.getId(), "project");
                UUID boardId = stableId(tenant.getId(), "board");
                UUID todoId = stableId(tenant.getId(), "todo");
                UUID doingId = stableId(tenant.getId(), "doing");
                UUID doneId = stableId(tenant.getId(), "done");
                jdbc.update("""
                        INSERT INTO projects(id,tenant_id,name,description,created_by)
                        VALUES (?,?,?,?,?) ON CONFLICT (tenant_id,id) DO NOTHING
                        """, projectId, tenant.getId(), "Nghiên cứu SaaS đa thuê bao",
                        "Dữ liệu minh họa giống nhau trên Pool và Silo", users.owner().getId());
                jdbc.update("""
                        INSERT INTO project_memberships(id,tenant_id,project_id,user_id,role)
                        VALUES (?,?,?,?,?) ON CONFLICT (tenant_id,project_id,user_id) DO NOTHING
                        """, stableId(tenant.getId(), "pm-owner"), tenant.getId(), projectId,
                        users.owner().getId(), ProjectRole.MANAGER.name());
                jdbc.update("""
                        INSERT INTO project_memberships(id,tenant_id,project_id,user_id,role)
                        VALUES (?,?,?,?,?) ON CONFLICT (tenant_id,project_id,user_id) DO NOTHING
                        """, stableId(tenant.getId(), "pm-member"), tenant.getId(), projectId,
                        users.member().getId(), ProjectRole.MEMBER.name());
                jdbc.update("""
                        INSERT INTO boards(id,tenant_id,project_id,name) VALUES (?,?,?,?)
                        ON CONFLICT (tenant_id,id) DO NOTHING
                        """, boardId, tenant.getId(), projectId, "Bảng nghiên cứu");
                String[] names = reportMode && tenant.getSlug().equals("t-acme")
                        ? new String[]{"Backlog", "In Dev", "Done"}
                        : reportMode && tenant.getSlug().equals("t-lotus")
                        ? new String[]{"Ý tưởng", "Sản xuất", "Phát hành"}
                        : new String[]{"Cần làm", "Đang làm", "Hoàn tất"};
                insertColumn(jdbc, tenant.getId(), boardId, todoId, names[0], 1000);
                insertColumn(jdbc, tenant.getId(), boardId, doingId, names[1], 2000);
                if (reportMode && tenant.getSlug().equals("t-acme")) {
                    insertColumn(jdbc, tenant.getId(), boardId, stableId(tenant.getId(), "review"), "Code Review", 2500);
                }
                insertColumn(jdbc, tenant.getId(), boardId, doneId, names[2], 3000);
                insertTask(jdbc, tenant.getId(), projectId, boardId, todoId, users.owner().getId(), "Hoàn thiện threat model", 1000);
                insertTask(jdbc, tenant.getId(), projectId, boardId, doingId, users.member().getId(), "Chạy spike cô lập dữ liệu", 1000);
                insertTask(jdbc, tenant.getId(), projectId, boardId, doneId, users.owner().getId(), "Chuẩn hóa giao thức nghiên cứu", 1000);
            });
        } catch (RuntimeException exception) {
            log.warn("Cannot seed application data for tenant {}", tenant.getId(), exception);
        } finally {
            TenantContextHolder.clear();
        }
    }

    private void insertColumn(
            org.springframework.jdbc.core.JdbcTemplate jdbc,
            UUID tenantId,
            UUID boardId,
            UUID id,
            String name,
            long position) {
        jdbc.update("""
                INSERT INTO board_columns(id,tenant_id,board_id,name,position,completed) VALUES (?,?,?,?,?,?)
                ON CONFLICT (tenant_id,id) DO NOTHING
                """, id, tenantId, boardId, name, BigDecimal.valueOf(position), position == 3000);
    }

    private void insertTask(
            org.springframework.jdbc.core.JdbcTemplate jdbc,
            UUID tenantId,
            UUID projectId,
            UUID boardId,
            UUID columnId,
            UUID assignee,
            String title,
            long position) {
        UUID id = stableId(tenantId, "task:" + title);
        jdbc.update("""
                INSERT INTO tasks(
                    id,tenant_id,project_id,board_id,board_column_id,title,assignee_user_id,position,created_by)
                VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT (tenant_id,id) DO NOTHING
                """, id, tenantId, projectId, boardId, columnId, title, assignee,
                BigDecimal.valueOf(position), assignee);
    }

    private UUID stableId(UUID tenantId, String name) {
        return UUID.nameUUIDFromBytes((tenantId + ":" + name).getBytes(StandardCharsets.UTF_8));
    }

    private record SeedUsers(UserAccountEntity owner, UserAccountEntity member) {}
}
