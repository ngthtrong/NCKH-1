#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const composeFile = resolve(repositoryRoot, 'infra/compose.yaml');
const environmentFile = resolve(
  repositoryRoot,
  process.env.ENV_FILE?.trim() || 'infra/.env',
);

if (!existsSync(environmentFile)) {
  throw new Error(`Environment file not found: ${environmentFile}`);
}
process.loadEnvFile(environmentFile);

const httpPort = process.env.HTTP_PORT?.trim() || '8080';
const minioPort = process.env.MINIO_PORT?.trim() || '9000';
const gatewayOrigin = process.env.E2E_GATEWAY_URL?.trim() || `http://127.0.0.1:${httpPort}`;
const accountsOrigin =
  process.env.E2E_ACCOUNTS_URL?.trim() ||
  process.env.PUBLIC_ACCOUNTS_URL?.trim() ||
  `http://accounts.localhost:${httpPort}`;
const minioHealthUrl = `http://127.0.0.1:${minioPort}/minio/health/live`;
const ownerEmail = required('E2E_OWNER_EMAIL', 'DEMO_OWNER_EMAIL');
const ownerPassword = required('E2E_OWNER_PASSWORD', 'DEMO_OWNER_PASSWORD');
const tenantSlugs = [
  process.env.E2E_POOL_TENANT_SLUG?.trim() || 'pool-demo',
  process.env.E2E_SILO_TENANT_SLUG?.trim() || 'silo-demo',
];
const runId = `${Date.now()}-${process.pid}`;

let minioStopped = false;
const created = [];

try {
  console.log('Authenticating local System Admin and resolving Pool/Silo sessions...');
  const login = await jsonRequest('/api/v1/auth/login', {
    method: 'POST',
    host: new URL(accountsOrigin).host,
    body: { email: ownerEmail, password: ownerPassword },
    expectedStatus: 200,
  });
  const globalToken = login.accessToken;
  assert(globalToken, 'Login did not return an access token');

  const tenants = [];
  for (const slug of tenantSlugs) {
    tenants.push(await tenantSession(globalToken, slug));
  }
  assert(
    new Set(tenants.map((tenant) => tenant.placement)).size === 2,
    'Expected one Pool placement and one Silo placement',
  );

  for (const tenant of tenants) {
    const filename = `compose-minio-outage-${tenant.slug}-${runId}.txt`;
    const content = `local Compose MinIO outage evidence for ${tenant.slug}; run ${runId}`;
    const form = new FormData();
    form.set('file', new Blob([content], { type: 'text/plain' }), filename);
    const resource = await jsonRequest('/api/v1/resources', {
      method: 'POST',
      host: tenant.host,
      token: tenant.token,
      body: form,
      expectedStatus: 200,
    });
    const download = await jsonRequest(`/api/v1/resources/${resource.id}/download-url`, {
      host: tenant.host,
      token: tenant.token,
      expectedStatus: 200,
    });
    await expectObject(download.url, 200, content, `${tenant.slug} upload/download before outage`);
    Object.assign(tenant, { resourceId: resource.id, downloadUrl: download.url, content });
    created.push(tenant);
  }

  console.log('Stopping MinIO and deleting both resource metadata rows...');
  compose('stop', 'minio');
  minioStopped = true;
  for (const tenant of tenants) {
    await request(`/api/v1/resources/${tenant.resourceId}`, {
      method: 'DELETE',
      host: tenant.host,
      token: tenant.token,
      expectedStatus: 200,
    });
  }

  console.log('Waiting for both tenant-scoped cleanup events to reach attempt 5...');
  for (const tenant of tenants) {
    tenant.deadLetter = await waitFor(async () => {
      const page = await adminDeadLetters(globalToken, tenant.id);
      const item = page.items.find((candidate) => candidate.resourceId === tenant.resourceId);
      return item?.attempts === 5 && item.deadLetteredAt ? item : null;
    }, 70_000, `${tenant.slug} resource cleanup dead-letter`);
  }
  assert(
    tenants[0].deadLetter.tenantId !== tenants[1].deadLetter.tenantId,
    'Dead-letter records must remain tenant scoped',
  );

  console.log('Starting MinIO and requeueing Pool before Silo...');
  compose('start', 'minio');
  minioStopped = false;
  await waitFor(async () => (await fetch(minioHealthUrl)).ok || null, 30_000, 'MinIO health');

  const [first, second] = tenants;
  await requeue(globalToken, first);
  await waitForObjectStatus(first.downloadUrl, 404, 30_000, `${first.slug} physical cleanup`);
  await expectObject(
    second.downloadUrl,
    200,
    second.content,
    `${second.slug} object survives foreign-tenant requeue`,
  );
  const secondPage = await adminDeadLetters(globalToken, second.id);
  const untouchedSecond = secondPage.items.find((item) => item.id === second.deadLetter.id);
  assert(
    untouchedSecond?.attempts === 5 && untouchedSecond.requeueCount === 0,
    'Requeueing the first tenant must not mutate the second tenant dead-letter',
  );

  await requeue(globalToken, second);
  await waitForObjectStatus(second.downloadUrl, 404, 30_000, `${second.slug} physical cleanup`);

  for (const tenant of tenants) {
    const page = await adminDeadLetters(globalToken, tenant.id);
    assert(
      !page.items.some((item) => item.id === tenant.deadLetter.id),
      `${tenant.slug} processed cleanup must leave the dead-letter list`,
    );
    const audit = await jsonRequest('/api/v1/audit?limit=200', {
      host: tenant.host,
      token: tenant.token,
      expectedStatus: 200,
    });
    assert(
      audit.some(
        (event) =>
          event.action === 'RESOURCE_DELETE_REQUEUED' &&
          event.aggregateId === tenant.resourceId,
      ),
      `${tenant.slug} requeue audit event was not found`,
    );
  }

  console.log(
    'PASS: prolonged MinIO outage reached attempt 5 for Pool/Silo; tenant-scoped requeue recovered each object independently.',
  );
} finally {
  if (minioStopped) {
    try {
      compose('start', 'minio');
    } catch (error) {
      console.error(`WARNING: could not restart MinIO: ${error.message}`);
    }
  }
  for (const tenant of created) {
    if (!tenant.resourceId || !tenant.token) continue;
    try {
      await request(`/api/v1/resources/${tenant.resourceId}`, {
        method: 'DELETE',
        host: tenant.host,
        token: tenant.token,
        expectedStatus: [200, 404],
      });
    } catch {
      // Metadata is normally deleted before fault injection; cleanup is best effort.
    }
  }
}

function required(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`${names.join(' or ')} is required`);
}

async function tenantSession(globalToken, slug) {
  const transfer = await jsonRequest('/api/v1/auth/tenant-transfer', {
    method: 'POST',
    host: new URL(accountsOrigin).host,
    token: globalToken,
    body: { tenantSlug: slug },
    expectedStatus: 200,
  });
  const redirect = new URL(transfer.redirectUrl);
  const code = redirect.searchParams.get('code');
  assert(code, `Tenant transfer for ${slug} did not return a code`);
  const host = redirect.host;
  const session = await jsonRequest('/api/v1/auth/exchange', {
    method: 'POST',
    host,
    body: { code },
    expectedStatus: 200,
  });
  assert(session.activeTenant.slug === slug, `Tenant exchange returned the wrong slug for ${slug}`);
  return {
    id: session.activeTenant.id,
    slug,
    placement: session.activeTenant.placement,
    host,
    token: session.accessToken,
  };
}

async function adminDeadLetters(globalToken, tenantId) {
  return jsonRequest(`/api/v1/admin/tenants/${tenantId}/resource-dead-letters?size=100`, {
    host: new URL(accountsOrigin).host,
    token: globalToken,
    expectedStatus: 200,
  });
}

async function requeue(globalToken, tenant) {
  await request(
    `/api/v1/admin/tenants/${tenant.id}/resource-dead-letters/${tenant.deadLetter.id}/requeue`,
    {
      method: 'POST',
      host: new URL(accountsOrigin).host,
      token: globalToken,
      expectedStatus: 200,
    },
  );
}

async function jsonRequest(path, options) {
  const response = await request(path, options);
  const body = await response.text();
  if (!body) throw new Error(`${options.method || 'GET'} ${path} returned an empty JSON body`);
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error(`${options.method || 'GET'} ${path} returned invalid JSON: ${error.message}`);
  }
}

async function request(path, { method = 'GET', host, token, body, expectedStatus }) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const requestOrigin = new URL(gatewayOrigin);
  requestOrigin.host = host;
  const response = await fetch(new URL(path, requestOrigin), { method, headers, body: payload });
  const allowed = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
  if (!allowed.includes(response.status)) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`${method} ${path} returned ${response.status}: ${detail}`);
  }
  return response;
}

async function expectObject(url, status, expectedBody, label) {
  const response = await fetch(url);
  if (response.status !== status) {
    throw new Error(`${label} returned ${response.status}, expected ${status}`);
  }
  if (expectedBody !== undefined && (await response.text()) !== expectedBody) {
    throw new Error(`${label} returned unexpected content`);
  }
}

async function waitForObjectStatus(url, status, timeoutMs, label) {
  return waitFor(async () => ((await fetch(url)).status === status ? true : null), timeoutMs, label);
}

async function waitFor(operation, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await operation();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
  }
  throw new Error(`${label} timed out${lastError ? `: ${lastError.message}` : ''}`);
}

function compose(...args) {
  execFileSync(
    'docker',
    ['compose', '--env-file', environmentFile, '-f', composeFile, ...args],
    { cwd: repositoryRoot, stdio: 'inherit' },
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
