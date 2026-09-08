package vn.edu.ctu.saas.customization;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import org.springframework.stereotype.Component;
import vn.edu.ctu.saas.config.AppProperties;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.tenant.TenantPlacement;

@Component
public class TenantDdlExecutor {
    private final AppProperties properties;
    private final TenantCapabilityService capabilities;

    public TenantDdlExecutor(AppProperties properties, TenantCapabilityService capabilities) {
        this.properties = properties;
        this.capabilities = capabilities;
    }

    public void createDefinition(
            TenantPlacementEntity placement,
            CustomDefinitionKind kind,
            String physicalTable) {
        String table = identifier(physicalTable);
        execute(placement, statement -> {
            if (kind == CustomDefinitionKind.TASK) {
                statement.execute("CREATE TABLE IF NOT EXISTS " + table + " ("
                        + "tenant_id uuid NOT NULL,project_id uuid NOT NULL,task_id uuid NOT NULL,"
                        + "version bigint NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now(),"
                        + "updated_at timestamptz NOT NULL DEFAULT now(),"
                        + "PRIMARY KEY(tenant_id,task_id),"
                        + "FOREIGN KEY(tenant_id,task_id) REFERENCES tasks(tenant_id,id) ON DELETE CASCADE)");
            } else {
                statement.execute("CREATE TABLE IF NOT EXISTS " + table + " ("
                        + "id uuid NOT NULL,tenant_id uuid NOT NULL,project_id uuid NOT NULL,created_by uuid NOT NULL,"
                        + "version bigint NOT NULL DEFAULT 0,deleted_at timestamptz,"
                        + "created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),"
                        + "PRIMARY KEY(tenant_id,id))");
            }
            grantRuntime(statement, placement, table);
        });
    }

    public void addField(
            TenantPlacementEntity placement,
            String physicalTable,
            String physicalColumn,
            CustomFieldType type) {
        String table = identifier(physicalTable);
        String column = identifier(physicalColumn);
        String sqlType = switch (type) {
            case TEXT, SINGLE_SELECT -> "text";
            case NUMBER -> "numeric";
            case BOOLEAN -> "boolean";
            case DATE -> "date";
        };
        execute(placement, statement -> {
            statement.execute("ALTER TABLE " + table + " ADD COLUMN IF NOT EXISTS " + column + " " + sqlType);
            grantRuntime(statement, placement, table);
        });
    }

    private void execute(TenantPlacementEntity placement, SqlWork work) {
        if (placement.getPlacementType() == TenantPlacement.POOL) {
            throw new IllegalArgumentException("Pool placement does not support physical tenant custom tables");
        }
        String schema = identifier(placement.getSchemaName());
        String url = withDatabase(properties.provisioning().adminUrl(), identifier(placement.getDatabaseName()));
        try (Connection connection = DriverManager.getConnection(
                url, properties.provisioning().adminUsername(), properties.provisioning().adminPassword());
             Statement statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                try (PreparedStatement lock = connection.prepareStatement(
                        "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))")) {
                    lock.setString(1, placement.getTenantId().toString());
                    lock.execute();
                }
                if (!capabilities.effective(placement.getTenantId(), TenantCapability.CUSTOM_DATA)) {
                    throw new CapabilityDisabledException();
                }
                statement.execute("SET LOCAL search_path TO " + schema);
                work.run(statement);
                connection.commit();
            } catch (SQLException | RuntimeException exception) {
                connection.rollback();
                throw exception;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Tenant customization DDL failed", exception);
        }
    }

    private void grantRuntime(Statement statement, TenantPlacementEntity placement, String table) throws SQLException {
        String role = identifier(placement.getDatabaseUsername());
        statement.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE " + table + " TO " + role);
    }

    private String identifier(String value) {
        if (value == null || !value.matches("[a-z_][a-z0-9_]{0,62}")) {
            throw new IllegalArgumentException("Unsafe PostgreSQL identifier");
        }
        return value;
    }

    private String withDatabase(String jdbcUrl, String database) {
        int query = jdbcUrl.indexOf('?');
        String suffix = query >= 0 ? jdbcUrl.substring(query) : "";
        String clean = query >= 0 ? jdbcUrl.substring(0, query) : jdbcUrl;
        return clean.substring(0, clean.lastIndexOf('/') + 1) + database + suffix;
    }

    @FunctionalInterface
    private interface SqlWork { void run(Statement statement) throws SQLException; }

    static final class CapabilityDisabledException extends RuntimeException {
        CapabilityDisabledException() { super("CUSTOM_DATA capability is disabled"); }
    }
}
