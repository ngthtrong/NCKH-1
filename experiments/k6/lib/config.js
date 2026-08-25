import http from "k6/http";
import { check, fail } from "k6";

const DEFAULT_PATH = "/api/v1/projects?size=20";

function positiveInteger(name, fallback) {
  const raw = __ENV[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

export function requiredEnvironment(name) {
  const value = __ENV[name];
  if (!value) {
    throw new Error(`${name} is required; do not put access tokens in the repository`);
  }
  return value;
}

export function durationEnvironment(name, fallback) {
  return __ENV[name] || fallback;
}

export function integerEnvironment(name, fallback) {
  return positiveInteger(name, fallback);
}

export function tenant(prefix) {
  const slug = requiredEnvironment(`${prefix}_SLUG`);
  const token = requiredEnvironment(`${prefix}_TOKEN`);
  const baseUrl = (__ENV.BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
  const domain = __ENV.TENANT_DOMAIN || "localhost";
  const host = __ENV[`${prefix}_HOST`] || `${slug}.${domain}`;

  return {
    slug,
    token,
    baseUrl,
    host,
  };
}

export function configuredTenants() {
  const prefixes = ["TENANT_A", "TENANT_B", "TENANT_C", "TENANT_D", "TENANT_E"];
  const configured = [];
  for (const prefix of prefixes) {
    const hasSlug = Boolean(__ENV[`${prefix}_SLUG`]);
    const hasToken = Boolean(__ENV[`${prefix}_TOKEN`]);
    if (hasSlug !== hasToken) {
      throw new Error(`${prefix}_SLUG and ${prefix}_TOKEN must be configured together`);
    }
    if (hasSlug) configured.push(tenant(prefix));
  }
  if (configured.length < 2) {
    throw new Error("At least TENANT_A and TENANT_B must be configured");
  }
  return configured;
}

export function projectPath() {
  return __ENV.PROJECT_LIST_PATH || DEFAULT_PATH;
}

export function requestTenant(tenantConfig, tags = {}) {
  const response = http.get(`${tenantConfig.baseUrl}${projectPath()}`, {
    headers: {
      Authorization: `Bearer ${tenantConfig.token}`,
      Host: tenantConfig.host,
      Accept: "application/json",
    },
    redirects: 0,
    tags: {
      tenant: tenantConfig.slug,
      endpoint: "project-list",
      run_id: __ENV.RUN_ID || "manual",
      ...tags,
    },
    timeout: __ENV.REQUEST_TIMEOUT || "10s",
  });

  return response;
}

export function checkSuccessfulRead(response, label) {
  return check(response, {
    [`${label}: HTTP 200`]: (result) => result.status === 200,
    [`${label}: JSON response`]: (result) =>
      (result.headers["Content-Type"] || "").toLowerCase().includes("application/json"),
  });
}

export function correctnessThresholds(extra = {}) {
  const thresholds = {
    checks: ["rate>0.99"],
    http_req_failed: ["rate<0.01"],
    ...extra,
  };

  if (__ENV.SLO_P95_MS) {
    const slo = positiveInteger("SLO_P95_MS", 0);
    thresholds.http_req_duration = [`p(95)<${slo}`];
  }

  return thresholds;
}

export function failOnUnexpectedStatus(response, allowedStatuses, label) {
  if (!allowedStatuses.includes(response.status)) {
    fail(`${label} returned unexpected HTTP ${response.status}`);
  }
}
