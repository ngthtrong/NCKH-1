import { check } from "k6";
import { Rate, Trend } from "k6/metrics";
import {
  durationEnvironment,
  integerEnvironment,
  requestTenant,
  tenant,
} from "./lib/config.js";

const aggressorTenant = tenant("TENANT_A");
const victimTenant = tenant("TENANT_B");
const victimLatency = new Trend("victim_latency", true);
const victimErrorRate = new Rate("victim_error_rate");

const thresholds = {
  victim_error_rate: ["rate<0.01"],
  "checks{role:victim}": ["rate>0.99"],
};

if (__ENV.SLO_P95_MS) {
  thresholds.victim_latency = [`p(95)<${integerEnvironment("SLO_P95_MS", 0)}`];
}

export const options = {
  scenarios: {
    aggressor: {
      executor: "constant-arrival-rate",
      exec: "aggressor",
      rate: integerEnvironment("AGGRESSOR_RATE", 100),
      timeUnit: "1s",
      duration: durationEnvironment("NOISY_DURATION", "2m"),
      preAllocatedVUs: integerEnvironment("AGGRESSOR_PREALLOCATED_VUS", 50),
      maxVUs: integerEnvironment("AGGRESSOR_MAX_VUS", 300),
      tags: { experiment: "noisy-neighbor", role: "aggressor" },
    },
    victim: {
      executor: "constant-arrival-rate",
      exec: "victim",
      rate: integerEnvironment("VICTIM_RATE", 2),
      timeUnit: "1s",
      duration: durationEnvironment("NOISY_DURATION", "2m"),
      preAllocatedVUs: integerEnvironment("VICTIM_PREALLOCATED_VUS", 5),
      maxVUs: integerEnvironment("VICTIM_MAX_VUS", 20),
      tags: { experiment: "noisy-neighbor", role: "victim" },
    },
  },
  thresholds,
};

export function aggressor() {
  const response = requestTenant(aggressorTenant, {
    workload: "noisy-neighbor",
    role: "aggressor",
    rate_limit_variant: __ENV.RATE_LIMIT_VARIANT || "unspecified",
  });

  check(response, {
    "aggressor gets success or rate limit": (result) =>
      result.status === 200 || result.status === 429,
  }, { role: "aggressor" });
}

export function victim() {
  const response = requestTenant(victimTenant, {
    workload: "noisy-neighbor",
    role: "victim",
    rate_limit_variant: __ENV.RATE_LIMIT_VARIANT || "unspecified",
  });

  const successful = response.status === 200;
  victimLatency.add(response.timings.duration, { tenant: victimTenant.slug });
  victimErrorRate.add(!successful, { tenant: victimTenant.slug });
  check(response, {
    "victim remains available": () => successful,
  }, { role: "victim" });
}
