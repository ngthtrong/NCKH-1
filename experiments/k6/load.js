import {
  checkSuccessfulRead,
  configuredTenants,
  correctnessThresholds,
  durationEnvironment,
  integerEnvironment,
  requestTenant,
} from "./lib/config.js";

const tenantConfigs = configuredTenants();

export const options = {
  scenarios: Object.fromEntries(tenantConfigs.map((tenantConfig, index) => [
    `load_${tenantConfig.slug}`,
    {
      executor: "constant-arrival-rate",
      exec: "tenantLoad",
      rate: integerEnvironment("LOAD_RATE", 20),
      timeUnit: "1s",
      duration: durationEnvironment("LOAD_DURATION", "5m"),
      preAllocatedVUs: integerEnvironment("LOAD_PREALLOCATED_VUS", 20),
      maxVUs: integerEnvironment("LOAD_MAX_VUS", 100),
      env: { TENANT_INDEX: String(index) },
      tags: { experiment: "load", tenant: tenantConfig.slug },
    },
  ])),
  thresholds: correctnessThresholds(),
};

export function tenantLoad() {
  const selectedTenant = tenantConfigs[Number.parseInt(__ENV.TENANT_INDEX, 10)];
  const response = requestTenant(selectedTenant, { workload: "load" });
  checkSuccessfulRead(response, `tenant ${selectedTenant.slug}`);
}
