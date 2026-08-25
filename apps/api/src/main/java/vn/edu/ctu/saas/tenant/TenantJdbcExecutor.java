package vn.edu.ctu.saas.tenant;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.function.Consumer;
import java.util.function.Function;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.stereotype.Component;

@Component
public class TenantJdbcExecutor {
    private final TenantDataSourceResolver dataSourceResolver;

    public TenantJdbcExecutor(TenantDataSourceResolver dataSourceResolver) {
        this.dataSourceResolver = dataSourceResolver;
    }

    public <T> T read(Function<JdbcTemplate, T> work) {
        return execute(work);
    }

    public <T> T write(Function<JdbcTemplate, T> work) {
        return execute(work);
    }

    public void writeWithoutResult(Consumer<JdbcTemplate> work) {
        execute(template -> {
            work.accept(template);
            return null;
        });
    }

    private <T> T execute(Function<JdbcTemplate, T> work) {
        TenantContext context = TenantContextHolder.getRequired();
        try (Connection connection = dataSourceResolver.resolve(context).getConnection()) {
            boolean previousAutoCommit = connection.getAutoCommit();
            connection.setAutoCommit(false);
            try {
                setLocal(connection, "app.tenant_id", context.tenantId().toString());
                setLocal(connection, "app.user_id", context.userId().toString());
                setLocal(connection, "app.correlation_id", context.correlationId());
                JdbcTemplate template = new JdbcTemplate(new SingleConnectionDataSource(connection, true));
                T result = work.apply(template);
                connection.commit();
                return result;
            } catch (RuntimeException | SQLException exception) {
                connection.rollback();
                throw exception;
            } finally {
                connection.setAutoCommit(previousAutoCommit);
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Tenant database operation failed", exception);
        }
    }

    private void setLocal(Connection connection, String key, String value) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("SELECT set_config(?, ?, true)")) {
            statement.setString(1, key);
            statement.setString(2, value == null ? "" : value);
            statement.execute();
        }
    }
}

