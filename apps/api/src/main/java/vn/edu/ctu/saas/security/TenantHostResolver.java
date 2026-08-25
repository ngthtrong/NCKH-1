package vn.edu.ctu.saas.security;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Locale;
import java.util.Optional;
import org.springframework.stereotype.Component;
import vn.edu.ctu.saas.config.AppProperties;

@Component
public class TenantHostResolver {
    private final AppProperties properties;

    public TenantHostResolver(AppProperties properties) {
        this.properties = properties;
    }

    public Optional<String> resolveTenantSlug(HttpServletRequest request) {
        String host = request.getServerName().toLowerCase(Locale.ROOT);
        String suffix = "." + properties.baseDomain().toLowerCase(Locale.ROOT);
        if (!host.endsWith(suffix)) return Optional.empty();
        String prefix = host.substring(0, host.length() - suffix.length());
        if (prefix.isBlank() || prefix.equals(properties.accountsSubdomain()) || prefix.contains(".")) {
            return Optional.empty();
        }
        return Optional.of(prefix);
    }

    public String tenantUrl(String slug) {
        String scheme = properties.baseDomain().equals("localhost") ? "http" : "https";
        return scheme + "://" + slug + "." + properties.baseDomain();
    }

    public String tenantUrl(String slug, HttpServletRequest request) {
        String scheme = request.getScheme();
        int port = request.getServerPort();
        boolean defaultPort = (scheme.equals("http") && port == 80) || (scheme.equals("https") && port == 443);
        return scheme + "://" + slug + "." + properties.baseDomain() + (defaultPort ? "" : ":" + port);
    }
}
