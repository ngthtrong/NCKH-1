import { sleep } from "k6";
import {
  checkSuccessfulRead,
  configuredTenants,
  correctnessThresholds,
  durationEnvironment,
  integerEnvironment,
  requestTenant,
} from "./lib/config.js";

const tenantConfigs = configuredTenants();
const vusPerTenant = integerEnvironment("BASELINE_VUS", 10);

export const options = {
  scenarios: Object.fromEntries(tenantConfigs.map((tenantConfig, index) => [
    `baseline_${tenantConfig.slug}`,
    {
      executor: "constant-vus",
      exec: "tenantBaseline",
      vus: vusPerTenant,
      duration: durationEnvironment("BASELINE_DURATION", "1m"),
      gracefulStop: "10s",
      env: { TENANT_INDEX: String(index) },
      tags: { experiment: "baseline", tenant: tenantConfig.slug },
    },
  ])),
  thresholds: correctnessThresholds(),
};

export function tenantBaseline() {
  const selectedTenant = tenantConfigs[Number.parseInt(__ENV.TENANT_INDEX, 10)];
  const response = requestTenant(selectedTenant, { workload: "baseline" });
  checkSuccessfulRead(response, `tenant ${selectedTenant.slug}`);
  sleep(Number.parseFloat(__ENV.THINK_TIME_SECONDS || "1"));
}
