package vn.edu.ctu.saas.customization;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantMembershipEntity;
import vn.edu.ctu.saas.control.TenantMembershipRepository;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.control.TenantPlacementRepository;
import vn.edu.ctu.saas.control.TenantRepository;
import vn.edu.ctu.saas.provisioning.TenantDatabaseProvisioner;
import vn.edu.ctu.saas.tenant.TenantContext;
import vn.edu.ctu.saas.tenant.TenantContextHolder;
import vn.edu.ctu.saas.tenant.TenantJdbcExecutor;
import vn.edu.ctu.saas.tenant.TenantStatus;

@Component
@Profile("worker")
public class CustomizationSchemaWorker {
    private static final Logger log = LoggerFactory.getLogger(CustomizationSchemaWorker.class);
    private final TenantRepository tenants;
    private final TenantPlacementRepository placements;
    private final TenantMembershipRepository memberships;
    private final TenantCapabilityService capabilities;
    private final TenantJdbcExecutor jdbcExecutor;
    private final TenantDdlExecutor ddl;

    public CustomizationSchemaWorker(
            TenantRepository tenants,
            TenantPlacementRepository placements,
            TenantMembershipRepository memberships,
            TenantCapabilityService capabilities,
            TenantJdbcExecutor jdbcExecutor,
            TenantDdlExecutor ddl) {
        this.tenants = tenants;
        this.placements = placements;
        this.memberships = memberships;
        this.capabilities = capabilities;
        this.jdbcExecutor = jdbcExecutor;
        this.ddl = ddl;
    }

    @Scheduled(fixedDelayString = "${CUSTOMIZATION_SCHEMA_POLL_INTERVAL:PT3S}")
    public void poll() {
        tenants.findAll().stream()
                .filter(tenant -> tenant.getStatus() == TenantStatus.ACTIVE)
                .filter(tenant -> capabilities.effective(tenant.getId(), TenantCapability.CUSTOM_DATA))
                .forEach(this::processSafely);
    }

    private void processSafely(TenantEntity tenant) {
        TenantPlacementEntity placement = placements.findByTenantId(tenant.getId()).orElse(null);
        if (placement == null || !TenantDatabaseProvisioner.LATEST_APPLICATION_SCHEMA_VERSION.equals(placement.getSchemaVersion())) return;
        TenantMembershipEntity membership = memberships.findAllByTenantIdAndActiveTrue(tenant.getId()).stream().findFirst().orElse(null);
        if (membership == null) return;
        String correlation = "custom-schema-" + UUID.randomUUID();
        TenantContextHolder.set(new TenantContext(membership.getUserId(), tenant.getId(), tenant.getSlug(), tenant.getTier(),
                placement.getPlacementType(), Set.of(membership.getRole()), correlation, correlation));
        try {
            for (Job job : queuedJobs()) process(placement, job);
        } catch (RuntimeException exception) {
            log.warn("Customization schema polling failed for tenant {}", tenant.getId(), exception);
        } finally {
            TenantContextHolder.clear();
        }
    }

    private List<Job> queuedJobs() {
        TenantContext context = TenantContextHolder.getRequired();
        return jdbcExecutor.write(jdbc -> jdbc.query("""
                UPDATE customization_schema_jobs SET status='RUNNING',attempts=attempts+1,updated_at=now()
                WHERE (tenant_id,id) IN (
                    SELECT tenant_id,id FROM customization_schema_jobs
                    WHERE tenant_id=? AND (status='QUEUED' OR (status='RUNNING' AND updated_at<now()-interval '5 minutes'))
                      AND available_at<=now() AND attempts<5 ORDER BY created_at LIMIT 10 FOR UPDATE SKIP LOCKED)
                RETURNING id,definition_id,field_id,operation,target_version
                """, (rs, rowNum) -> new Job(
                        rs.getObject("id", UUID.class), rs.getObject("definition_id", UUID.class),
                        rs.getObject("field_id", UUID.class), rs.getString("operation"), rs.getLong("target_version")),
                context.tenantId()));
    }

    private void process(TenantPlacementEntity placement, Job job) {
        TenantContext context = TenantContextHolder.getRequired();
        if (!capabilities.effective(context.tenantId(), TenantCapability.CUSTOM_DATA)) {
            jdbcExecutor.writeWithoutResult(jdbc -> jdbc.update("""
                    UPDATE customization_schema_jobs
                    SET status='QUEUED',attempts=greatest(attempts-1,0),available_at=now()+interval '1 minute',updated_at=now()
                    WHERE tenant_id=? AND id=? AND status='RUNNING'
                    """, context.tenantId(), job.id()));
            return;
        }
        try {
            Definition definition = jdbcExecutor.read(jdbc -> jdbc.query("""
                    SELECT kind,physical_table FROM custom_definitions WHERE tenant_id=? AND id=?
                    """, rs -> rs.next() ? new Definition(
                            CustomDefinitionKind.valueOf(rs.getString(1)), rs.getString(2)) : null,
                    context.tenantId(), job.definitionId()));
            if (definition == null) throw new IllegalStateException("Customization definition is missing");
            if ("CREATE_DEFINITION".equals(job.operation())) {
                ddl.createDefinition(placement, definition.kind(), definition.physicalTable());
                jdbcExecutor.writeWithoutResult(jdbc -> jdbc.update("""
                        UPDATE custom_definitions SET status='ACTIVE',last_error=NULL,updated_at=now()
                        WHERE tenant_id=? AND id=? AND version=?
                        """, context.tenantId(), job.definitionId(), job.targetVersion()));
            } else if ("ADD_FIELD".equals(job.operation())) {
                Field field = jdbcExecutor.read(jdbc -> jdbc.query("""
                        SELECT physical_column,data_type FROM custom_fields WHERE tenant_id=? AND id=?
                        """, rs -> rs.next() ? new Field(rs.getString(1), CustomFieldType.valueOf(rs.getString(2))) : null,
                        context.tenantId(), job.fieldId()));
                if (field == null) throw new IllegalStateException("Customization field is missing");
                ddl.addField(placement, definition.physicalTable(), field.physicalColumn(), field.type());
                jdbcExecutor.writeWithoutResult(jdbc -> jdbc.update("""
                        UPDATE custom_fields SET status='ACTIVE',last_error=NULL,updated_at=now()
                        WHERE tenant_id=? AND id=? AND version=?
                        """, context.tenantId(), job.fieldId(), job.targetVersion()));
            } else {
                throw new IllegalArgumentException("Unsupported customization schema operation");
            }
            jdbcExecutor.writeWithoutResult(jdbc -> jdbc.update("""
                    UPDATE customization_schema_jobs SET status='SUCCEEDED',last_error=NULL,updated_at=now()
                    WHERE tenant_id=? AND id=?
                    """, context.tenantId(), job.id()));
        } catch (TenantDdlExecutor.CapabilityDisabledException exception) {
            jdbcExecutor.writeWithoutResult(jdbc -> jdbc.update("""
                    UPDATE customization_schema_jobs
                    SET status='QUEUED',attempts=greatest(attempts-1,0),last_error=NULL,
                        available_at=now()+interval '1 minute',updated_at=now()
                    WHERE tenant_id=? AND id=? AND status='RUNNING'
                    """, context.tenantId(), job.id()));
        } catch (RuntimeException exception) {
            String message = exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage();
            if (message.length() > 480) message = message.substring(0, 480);
            String safe = message;
            jdbcExecutor.writeWithoutResult(jdbc -> {
                jdbc.update("""
                        UPDATE customization_schema_jobs SET status=CASE WHEN attempts>=5 THEN 'FAILED' ELSE 'QUEUED' END,
                            available_at=now()+interval '1 second'*power(2,least(attempts,6)),last_error=?,updated_at=now()
                        WHERE tenant_id=? AND id=?
                        """, safe, context.tenantId(), job.id());
                jdbc.update("""
                        UPDATE custom_definitions SET status='FAILED',last_error=?,updated_at=now()
                        WHERE tenant_id=? AND id=? AND ?='CREATE_DEFINITION'
                        """, safe, context.tenantId(), job.definitionId(), job.operation());
                if (job.fieldId() != null) jdbc.update("""
                        UPDATE custom_fields SET status='FAILED',last_error=?,updated_at=now()
                        WHERE tenant_id=? AND id=?
                        """, safe, context.tenantId(), job.fieldId());
            });
        }
    }

    private record Job(UUID id, UUID definitionId, UUID fieldId, String operation, long targetVersion) {}
    private record Definition(CustomDefinitionKind kind, String physicalTable) {}
    private record Field(String physicalColumn, CustomFieldType type) {}
}
