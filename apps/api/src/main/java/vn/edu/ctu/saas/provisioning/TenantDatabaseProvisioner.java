package vn.edu.ctu.saas.provisioning;

import java.net.URI;
import java.security.SecureRandom;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HexFormat;
import org.flywaydb.core.Flyway;
import org.springframework.stereotype.Component;
import vn.edu.ctu.saas.config.AppProperties;
import vn.edu.ctu.saas.control.TenantEntity;
import vn.edu.ctu.saas.control.TenantPlacementEntity;
import vn.edu.ctu.saas.tenant.TenantPlacement;

@Component
public class TenantDatabaseProvisioner {
    private final AppProperties properties;
    private final PlacementSecretCipher cipher;
    private final SecureRandom random = new SecureRandom();

    public TenantDatabaseProvisioner(AppProperties properties, PlacementSecretCipher cipher) {
        this.properties = properties;
        this.cipher = cipher;
    }

    public void provision(TenantEntity tenant, TenantPlacementEntity placement) {
        if (placement.getPlacementType() == TenantPlacement.POOL) {
            migratePool();
            placement.setDatabaseName(databaseName(properties.datasource().pool().jdbcUrl()));
            placement.setSchemaVersion("1");
            return;
        }
        String suffix = tenant.getId().toString().replace("-", "");
        String database = identifier("tenant_" + suffix);
        String runtimeRole = identifier("tenant_" + suffix.substring(0, 20) + "_app");
        String runtimePassword = randomPassword();
        createRoleAndDatabase(database, runtimeRole, runtimePassword);
        String tenantUrl = withDatabase(properties.provisioning().adminUrl(), database);
        migrate(tenantUrl, properties.provisioning().adminUsername(), properties.provisioning().adminPassword());
        grantRuntime(tenantUrl, runtimeRole);
        JdbcEndpoint endpoint = endpoint(properties.provisioning().adminUrl());
        placement.setDatabaseHost(endpoint.host());
        placement.setDatabasePort(endpoint.port());
        placement.setDatabaseName(database);
        placement.setDatabaseUsername(runtimeRole);
        placement.setEncryptedPassword(cipher.encrypt(runtimePassword));
        placement.setSchemaVersion("1");
    }

    public void rollback(TenantEntity tenant, TenantPlacementEntity placement) {
        if (placement.getPlacementType() != TenantPlacement.SILO_DATABASE) return;
        String suffix = tenant.getId().toString().replace("-", "");
        String database = identifier("tenant_" + suffix);
        String runtimeRole = identifier("tenant_" + suffix.substring(0, 20) + "_app");
        try (Connection connection = adminConnection(); Statement statement = connection.createStatement()) {
            connection.setAutoCommit(true);
            statement.execute("DROP DATABASE IF EXISTS " + database + " WITH (FORCE)");
            statement.execute("DROP ROLE IF EXISTS " + runtimeRole);
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to roll back tenant database", exception);
        }
    }

    private void migratePool() {
        AppProperties.Datasource.Pool pool = properties.datasource().pool();
        String adminUrl = withDatabase(properties.provisioning().adminUrl(), databaseName(pool.jdbcUrl()));
        migrate(adminUrl, properties.provisioning().adminUsername(), properties.provisioning().adminPassword());
        grantRuntime(adminUrl, identifier(pool.username()));
    }

    private void migrate(String url, String username, String password) {
        Flyway.configure()
                .dataSource(url, username, password)
                .locations("classpath:db/migration/application")
                .validateMigrationNaming(true)
                .load()
                .migrate();
    }

    private void createRoleAndDatabase(String database, String runtimeRole, String password) {
        try (Connection connection = adminConnection()) {
            connection.setAutoCommit(true);
            if (!roleExists(connection, runtimeRole)) {
                try (Statement statement = connection.createStatement()) {
                    statement.execute("CREATE ROLE " + runtimeRole + " LOGIN PASSWORD '" + password + "' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS");
                }
            } else {
                // A retry creates a fresh placement secret. Keep PostgreSQL and the
                // encrypted control-plane value in sync instead of persisting a
                // password that the existing runtime role does not know.
                try (Statement statement = connection.createStatement()) {
                    statement.execute("ALTER ROLE " + runtimeRole + " PASSWORD '" + password + "'");
                }
            }
            if (!databaseExists(connection, database)) {
                try (Statement statement = connection.createStatement()) {
                    statement.execute("CREATE DATABASE " + database + " OWNER " + identifier(properties.provisioning().adminUsername()));
                }
            }
            try (Statement statement = connection.createStatement()) {
                statement.execute("GRANT CONNECT ON DATABASE " + database + " TO " + runtimeRole);
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to create tenant database", exception);
        }
    }

    private void grantRuntime(String databaseUrl, String runtimeRole) {
        try (Connection connection = DriverManager.getConnection(
                databaseUrl, properties.provisioning().adminUsername(), properties.provisioning().adminPassword());
             Statement statement = connection.createStatement()) {
            statement.execute("GRANT USAGE ON SCHEMA public TO " + runtimeRole);
            statement.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO " + runtimeRole);
            statement.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO " + runtimeRole);
            statement.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO " + runtimeRole);
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to grant tenant runtime privileges", exception);
        }
    }

    private Connection adminConnection() throws SQLException {
        return DriverManager.getConnection(
                properties.provisioning().adminUrl(),
                properties.provisioning().adminUsername(),
                properties.provisioning().adminPassword());
    }

    private boolean roleExists(Connection connection, String role) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("SELECT 1 FROM pg_roles WHERE rolname = ?")) {
            statement.setString(1, role);
            try (ResultSet result = statement.executeQuery()) { return result.next(); }
        }
    }

    private boolean databaseExists(Connection connection, String database) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("SELECT 1 FROM pg_database WHERE datname = ?")) {
            statement.setString(1, database);
            try (ResultSet result = statement.executeQuery()) { return result.next(); }
        }
    }

    private String randomPassword() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private String identifier(String value) {
        if (value == null || !value.matches("[a-z_][a-z0-9_]{0,62}")) {
            throw new IllegalArgumentException("Unsafe PostgreSQL identifier");
        }
        return value;
    }

    private String databaseName(String jdbcUrl) {
        int query = jdbcUrl.indexOf('?');
        String clean = query >= 0 ? jdbcUrl.substring(0, query) : jdbcUrl;
        return clean.substring(clean.lastIndexOf('/') + 1);
    }

    private String withDatabase(String jdbcUrl, String database) {
        int query = jdbcUrl.indexOf('?');
        String suffix = query >= 0 ? jdbcUrl.substring(query) : "";
        String clean = query >= 0 ? jdbcUrl.substring(0, query) : jdbcUrl;
        return clean.substring(0, clean.lastIndexOf('/') + 1) + database + suffix;
    }

    private JdbcEndpoint endpoint(String jdbcUrl) {
        URI uri = URI.create(jdbcUrl.substring("jdbc:".length()));
        return new JdbcEndpoint(uri.getHost(), uri.getPort() < 0 ? 5432 : uri.getPort());
    }

    private record JdbcEndpoint(String host, int port) {}
}
