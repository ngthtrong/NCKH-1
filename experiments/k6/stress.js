import {
  checkSuccessfulRead,
  configuredTenants,
  correctnessThresholds,
  durationEnvironment,
  integerEnvironment,
  requestTenant,
} from "./lib/config.js";

const tenantConfigs = configuredTenants();

const startVus = integerEnvironment("STRESS_START_VUS", 10);
const peakVus = integerEnvironment("STRESS_PEAK_VUS", 80);

export const options = {
  scenarios: Object.fromEntries(tenantConfigs.map((tenantConfig, index) => [
    `stress_${tenantConfig.slug}`,
    {
      executor: "ramping-vus",
      exec: "tenantStress",
      startVUs: 0,
      stages: [
        { duration: durationEnvironment("STRESS_RAMP_UP", "2m"), target: startVus },
        { duration: durationEnvironment("STRESS_HOLD", "3m"), target: startVus },
        { duration: durationEnvironment("STRESS_PEAK_RAMP", "3m"), target: peakVus },
        { duration: durationEnvironment("STRESS_PEAK_HOLD", "3m"), target: peakVus },
        { duration: durationEnvironment("STRESS_RAMP_DOWN", "1m"), target: 0 },
      ],
      gracefulRampDown: "30s",
      env: { TENANT_INDEX: String(index) },
      tags: { experiment: "stress", tenant: tenantConfig.slug },
    },
  ])),
  thresholds: correctnessThresholds(),
};

export function tenantStress() {
  const selectedTenant = tenantConfigs[Number.parseInt(__ENV.TENANT_INDEX, 10)];
  const response = requestTenant(selectedTenant, { workload: "stress" });
  checkSuccessfulRead(response, `tenant ${selectedTenant.slug}`);
}
