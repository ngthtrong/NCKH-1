package vn.edu.ctu.saas.common;

import java.util.Map;

public class ConflictException extends RuntimeException {
    private final Map<String, String> fieldErrors;

    public ConflictException(String message) {
        this(message, Map.of());
    }

    public ConflictException(String message, Map<String, String> fieldErrors) {
        super(message);
        this.fieldErrors = Map.copyOf(fieldErrors);
    }

    public Map<String, String> fieldErrors() {
        return fieldErrors;
    }
}
