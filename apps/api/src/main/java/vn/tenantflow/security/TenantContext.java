package vn.tenantflow.security;

public final class TenantContext {
    private static final ThreadLocal<TenantInfo> CONTEXT = new ThreadLocal<>();

    private TenantContext() {}

    public static void set(TenantInfo info) {
        CONTEXT.set(info);
    }

    public static TenantInfo get() {
        return CONTEXT.get();
    }

    public static void clear() {
        CONTEXT.remove();
    }
}
