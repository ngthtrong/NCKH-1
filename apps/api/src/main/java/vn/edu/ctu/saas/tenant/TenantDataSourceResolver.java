package vn.edu.ctu.saas.tenant;

import java.util.UUID;
import javax.sql.DataSource;

public interface TenantDataSourceResolver {
    DataSource resolve(TenantContext context);
    default String schemaName(TenantContext context) { return "public"; }
    void evict(UUID tenantId);
}
