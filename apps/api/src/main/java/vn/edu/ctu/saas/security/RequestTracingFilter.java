package vn.edu.ctu.saas.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestTracingFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String requestId = safeId(request.getHeader("X-Request-ID"));
        String correlationId = safeId(request.getHeader("X-Correlation-ID"));
        MDC.put("request_id", requestId);
        MDC.put("correlation_id", correlationId);
        response.setHeader("X-Request-ID", requestId);
        response.setHeader("X-Correlation-ID", correlationId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }

    private String safeId(String supplied) {
        if (supplied != null && supplied.matches("[A-Za-z0-9._:-]{1,120}")) return supplied;
        return UUID.randomUUID().toString();
    }
}

