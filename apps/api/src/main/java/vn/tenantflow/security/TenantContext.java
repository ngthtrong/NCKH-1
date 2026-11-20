package vn.tenantflow.security;

public final class TenantContext {
    private static final ThreadLocal<TenantInfo> CONTEXT = new ThreadLocal<>();
    private static final ThreadLocal<String> CACHE_STATUS = new ThreadLocal<>();

    private TenantContext() {}

    public static void set(TenantInfo info) {
        CONTEXT.set(info);
    }

    public static TenantInfo get() {
        return CONTEXT.get();
    }

    public static void setCacheStatus(String status) {
        CACHE_STATUS.set(status);
    }

    public static String getCacheStatus() {
        return CACHE_STATUS.get();
    }

    public static void clear() {
        CONTEXT.remove();
        CACHE_STATUS.remove();
    }
}
