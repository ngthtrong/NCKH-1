package vn.tenantflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class TenantFlowApplication {
    public static void main(String[] args) {
        SpringApplication.run(TenantFlowApplication.class, args);
    }
}
