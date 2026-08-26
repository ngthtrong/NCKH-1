package vn.edu.ctu.saas.payment;

import java.sql.PreparedStatement;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Serializes creation attempts for one payment idempotency key.
 *
 * <p>The database unique constraint remains the final invariant. This
 * transaction-scoped advisory lock closes the check-then-insert race for a key
 * that does not have a row to pessimistically lock yet.</p>
 */
@Component
public class PaymentIdempotencyLock {
    private static final String LOCK_SQL =
            "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))";

    private final JdbcTemplate jdbcTemplate;

    public PaymentIdempotencyLock(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void acquire(String idempotencyKey) {
        jdbcTemplate.execute(LOCK_SQL, (PreparedStatement statement) -> {
            statement.setString(1, "payment:" + idempotencyKey);
            statement.execute();
            return null;
        });
    }
}
