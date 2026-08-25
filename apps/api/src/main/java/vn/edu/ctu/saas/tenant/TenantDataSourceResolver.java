package vn.edu.ctu.saas.tenant;

import java.util.UUID;
import javax.sql.DataSource;

public interface TenantDataSourceResolver {
    DataSource resolve(TenantContext context);
    void evict(UUID tenantId);
}

