package vn.edu.ctu.saas.tenant;

public class MissingTenantContextException extends RuntimeException {
    public MissingTenantContextException() {
        super("A verified tenant context is required");
    }
}

