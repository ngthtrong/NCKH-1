import http from "k6/http";
import { check } from "k6";
import { correctnessThresholds } from "./lib/config.js";

export const options = {
  scenarios: {
    health: {
      executor: "shared-iterations",
      vus: 1,
      iterations: 1,
      maxDuration: "30s",
      tags: { experiment: "smoke" },
    },
  },
  thresholds: correctnessThresholds(),
};

export default function () {
  const baseUrl = (__ENV.BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
  const host = __ENV.ACCOUNTS_HOST || "accounts.localhost";
  const response = http.get(`${baseUrl}/actuator/health`, {
    headers: { Host: host, Accept: "application/json" },
    tags: { endpoint: "health", run_id: __ENV.RUN_ID || "manual" },
    timeout: __ENV.REQUEST_TIMEOUT || "10s",
  });

  check(response, {
    "health endpoint returns 200": (result) => result.status === 200,
    "health status is UP": (result) => {
      try {
        return result.json("status") === "UP";
      } catch (_) {
        return false;
      }
    },
  });
}
