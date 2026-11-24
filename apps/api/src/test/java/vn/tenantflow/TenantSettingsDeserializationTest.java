package vn.tenantflow;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import vn.tenantflow.domain.model.TenantSettings;

import static org.junit.jupiter.api.Assertions.*;

public class TenantSettingsDeserializationTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void testDeserializeWithCardDensityAndExtraProperties() throws Exception {
        String json = """
            {
              "theme": {
                "primary": "#0d6efd",
                "accent": "#0ea5e9",
                "logoText": "ACME",
                "tagline": "Software"
              },
              "wipMode": "STRICT",
              "defaultWipLimit": 2,
              "cardDisplayMode": "FULL",
              "cardDensity": "FULL",
              "unknownPropertyThatMightBeAddedLater": true,
              "defaultColumns": ["Backlog", "In Progress", "Code Review", "Done"],
              "customFields": []
            }
            """;

        TenantSettings settings = mapper.readValue(json, TenantSettings.class);
        assertNotNull(settings);
        assertEquals("FULL", settings.cardDisplayMode());
        assertEquals("FULL", settings.cardDensity());
        assertEquals("STRICT", settings.wipMode());
    }

    @Test
    void testDeserializeWithoutCardDensityFallsBackToCardDisplayMode() throws Exception {
        String json = """
            {
              "theme": {
                "primary": "#fd7e14",
                "accent": "#be185d",
                "logoText": "LOTUS",
                "tagline": "Media"
              },
              "wipMode": "WARN",
              "defaultWipLimit": 3,
              "cardDisplayMode": "COMPACT",
              "defaultColumns": ["To Do", "Done"],
              "customFields": []
            }
            """;

        TenantSettings settings = mapper.readValue(json, TenantSettings.class);
        assertNotNull(settings);
        assertEquals("COMPACT", settings.cardDisplayMode());
        assertEquals("COMPACT", settings.cardDensity());
    }
}
