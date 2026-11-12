package vn.edu.ctu.saas.common;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Keep serialization failures explicit inside transactional JDBC callbacks. */
public final class JsonSupport {
    private JsonSupport() {}
    public static String write(ObjectMapper mapper, Object value) {
        try { return mapper.writeValueAsString(value); }
        catch (java.io.IOException exception) { throw new IllegalStateException("Cannot serialize JSON", exception); }
    }
    public static JsonNode tree(ObjectMapper mapper, String value) {
        try { return mapper.readTree(value); }
        catch (java.io.IOException exception) { throw new IllegalArgumentException("Invalid JSON", exception); }
    }
    public static <T> T read(ObjectMapper mapper, String value, Class<T> type) {
        try { return mapper.readValue(value, type); }
        catch (java.io.IOException exception) { throw new IllegalArgumentException("Invalid JSON", exception); }
    }
    public static <T> T read(ObjectMapper mapper, String value, TypeReference<T> type) {
        try { return mapper.readValue(value, type); }
        catch (java.io.IOException exception) { throw new IllegalArgumentException("Invalid JSON", exception); }
    }
}
