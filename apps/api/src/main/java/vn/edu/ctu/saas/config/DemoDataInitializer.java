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
        for (String slug : List.of("pool-demo", "silo-demo")) {
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
        ensureTenant("silo-demo", "Silo Demo", "ENTERPRISE", TenantPlacement.SILO_DATABASE, owner, member);
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
        if (placementRepository.findByTenantId(tenant.getId()).isEmpty()) {
            TenantPlacementEntity placement = new TenantPlacementEntity();
            placement.setTenantId(tenant.getId());
            placement.setPlacementType(placementType);
            placementRepository.save(placement);
        }
        ensureMembership(tenant.getId(), owner.getId(), TenantRole.OWNER);
        ensureMembership(tenant.getId(), member.getId(), TenantRole.MEMBER);
        String key = "seed:" + tenant.getId();
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
                insertColumn(jdbc, tenant.getId(), boardId, todoId, "Cần làm", 1000);
                insertColumn(jdbc, tenant.getId(), boardId, doingId, "Đang làm", 2000);
                insertColumn(jdbc, tenant.getId(), boardId, doneId, "Hoàn tất", 3000);
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
                INSERT INTO board_columns(id,tenant_id,board_id,name,position) VALUES (?,?,?,?,?)
                ON CONFLICT (tenant_id,id) DO NOTHING
                """, id, tenantId, boardId, name, BigDecimal.valueOf(position));
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
