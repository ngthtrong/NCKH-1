package vn.edu.ctu.saas.tenant;

public final class TenantContextHolder {
    private static final ThreadLocal<TenantContext> CURRENT = new ThreadLocal<>();

    private TenantContextHolder() {}

    public static void set(TenantContext context) {
        if (context == null) {
            throw new IllegalArgumentException("Tenant context cannot be null");
        }
        CURRENT.set(context);
    }

    public static TenantContext getRequired() {
        TenantContext context = CURRENT.get();
        if (context == null) {
            throw new MissingTenantContextException();
        }
        return context;
    }

    public static TenantContext getNullable() {
        return CURRENT.get();
    }

    public static void clear() {
        CURRENT.remove();
    }
}

