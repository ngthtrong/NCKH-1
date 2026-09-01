#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const environmentFile = resolve(repositoryRoot, process.env.ENV_FILE?.trim() || 'infra/.env');
if (!existsSync(environmentFile)) throw new Error(`Environment file not found: ${environmentFile}`);
process.loadEnvFile(environmentFile);

const httpPort = process.env.HTTP_PORT?.trim() || '8080';
const gatewayOrigin = process.env.E2E_GATEWAY_URL?.trim() || `http://127.0.0.1:${httpPort}`;
const accountsOrigin = process.env.E2E_ACCOUNTS_URL?.trim()
  || process.env.PUBLIC_ACCOUNTS_URL?.trim()
  || `http://accounts.localhost:${httpPort}`;
const ownerEmail = required('E2E_OWNER_EMAIL', 'DEMO_OWNER_EMAIL');
const ownerPassword = required('E2E_OWNER_PASSWORD', 'DEMO_OWNER_PASSWORD');
const tenantSlug = process.env.E2E_POOL_TENANT_SLUG?.trim() || 'pool-demo';
const runId = `${Date.now()}-${process.pid}`;

let tenant;
let projectId;
let resourceId;
let subscriptionId;
let originalPreferences;

try {
  const login = await jsonRequest('/api/v1/auth/login', {
    method: 'POST', host: new URL(accountsOrigin).host,
    body: { email: ownerEmail, password: ownerPassword }, expectedStatus: 200,
  });
  assert(login.user.platformRoles.includes('SYSTEM_ADMIN'), 'Seed owner is not exposed as SYSTEM_ADMIN');

  const adminPage = await jsonRequest('/api/v1/admin/tenants?status=ACTIVE&placement=POOL&size=100', {
    host: new URL(accountsOrigin).host, token: login.accessToken, expectedStatus: 200,
  });
  const controlTenant = adminPage.items.find((item) => item.slug === tenantSlug);
  assert(controlTenant, `Admin filters did not return active Pool tenant ${tenantSlug}`);
  const adminDetail = await jsonRequest(`/api/v1/admin/tenants/${controlTenant.id}`, {
    host: new URL(accountsOrigin).host, token: login.accessToken, expectedStatus: 200,
  });
  assert(adminDetail.tenant.id === controlTenant.id, 'Admin detail returned a different tenant');

  tenant = await tenantSession(login.accessToken, tenantSlug);
  originalPreferences = await jsonRequest('/api/v1/notifications/preferences', {
    host: tenant.host, token: tenant.token, expectedStatus: 200,
  });
  const project = await jsonRequest('/api/v1/projects', {
    method: 'POST', host: tenant.host, token: tenant.token,
    body: { name: `P-App smoke ${runId}`, description: 'Transient local technical verification' },
    expectedStatus: 201,
  });
  projectId = project.id;
  assert(project.status === 'ACTIVE' && project.role === 'MANAGER', 'New project is not active with Manager role');

  let board = await jsonRequest(`/api/v1/boards/${project.boardId}`, {
    host: tenant.host, token: tenant.token, expectedStatus: 200,
  });
  assert(board.columns.length >= 2, 'Default board does not contain enough columns');
  let secondBoard = await jsonRequest(`/api/v1/projects/${projectId}/boards`, {
    method: 'POST', host: tenant.host, token: tenant.token,
    body: { name: 'Release board' }, expectedStatus: 201,
  });
  secondBoard = await jsonRequest(`/api/v1/boards/${secondBoard.id}`, {
    method: 'PUT', host: tenant.host, token: tenant.token,
    body: { name: 'Release board renamed', version: secondBoard.version }, expectedStatus: 200,
  });
  await request(`/api/v1/boards/${secondBoard.id}`, {
    method: 'DELETE', host: tenant.host, token: tenant.token, expectedStatus: 204,
  });

  let task = await jsonRequest(`/api/v1/boards/${board.id}/tasks`, {
    method: 'POST', host: tenant.host, token: tenant.token,
    body: { columnId: board.columns[0].id, title: 'Parent task' }, expectedStatus: 201,
  });
  const subtask = await jsonRequest(`/api/v1/boards/${board.id}/tasks`, {
    method: 'POST', host: tenant.host, token: tenant.token,
    body: { columnId: board.columns[0].id, parentTaskId: task.id, title: 'One-level subtask' },
    expectedStatus: 201,
  });
  await request(`/api/v1/boards/${board.id}/tasks`, {
    method: 'POST', host: tenant.host, token: tenant.token,
    body: { columnId: board.columns[0].id, parentTaskId: subtask.id, title: 'Forbidden nested subtask' },
    expectedStatus: 409,
  });
  task = await jsonRequest(`/api/v1/tasks/${task.id}`, {
    method: 'PATCH', host: tenant.host, token: tenant.token,
    body: {
      columnId: task.columnId, title: 'Parent task updated', description: 'Kept through update',
      dueAt: '2026-09-15T00:00:00Z', position: task.position, version: task.version,
    }, expectedStatus: 200,
  });
  board = await jsonRequest(`/api/v1/boards/${board.id}/tasks/order`, {
    method: 'PUT', host: tenant.host, token: tenant.token,
    body: { items: [{
      taskId: task.id, targetColumnId: board.columns[1].id,
      targetPosition: 1024, version: task.version,
    }] }, expectedStatus: 200,
  });
  assert(board.tasks.find((item) => item.id === task.id)?.columnId === board.columns[1].id,
    'Batch task move did not update the target column');

  let comment = await jsonRequest(`/api/v1/tasks/${task.id}/comments`, {
    method: 'POST', host: tenant.host, token: tenant.token,
    body: { body: 'Local smoke comment' }, expectedStatus: 201,
  });
  comment = await jsonRequest(`/api/v1/comments/${comment.id}`, {
    method: 'PATCH', host: tenant.host, token: tenant.token,
    body: { body: 'Local smoke comment updated' }, expectedStatus: 200,
  });
  assert(comment.body.endsWith('updated'), 'Comment update was not returned');
  await request(`/api/v1/comments/${comment.id}`, {
    method: 'DELETE', host: tenant.host, token: tenant.token, expectedStatus: 204,
  });

  const link = await jsonRequest('/api/v1/resources/links', {
    method: 'POST', host: tenant.host, token: tenant.token,
    body: { name: 'Local reference', url: 'https://example.com/p-app-local-smoke' }, expectedStatus: 200,
  });
  resourceId = link.id;
  await request(`/api/v1/resources/${resourceId}/tasks/${task.id}`, {
    method: 'POST', host: tenant.host, token: tenant.token, expectedStatus: 200,
  });
  const resources = await jsonRequest('/api/v1/resources', {
    host: tenant.host, token: tenant.token, expectedStatus: 200,
  });
  assert(resources.find((item) => item.id === resourceId)?.taskIds.includes(task.id),
    'Resource list did not expose the attached task');
  const linkTarget = await jsonRequest(`/api/v1/resources/${resourceId}/download-url`, {
    host: tenant.host, token: tenant.token, expectedStatus: 200,
  });
  assert(linkTarget.url === link.linkUrl, 'Link resource did not resolve to its validated URL');
  await request(`/api/v1/resources/${resourceId}/tasks/${task.id}`, {
    method: 'DELETE', host: tenant.host, token: tenant.token, expectedStatus: 200,
  });
  await request(`/api/v1/resources/${resourceId}`, {
    method: 'DELETE', host: tenant.host, token: tenant.token, expectedStatus: 200,
  });
  resourceId = undefined;

  await request('/api/v1/notifications/preferences', {
    method: 'PUT', host: tenant.host, token: tenant.token,
    body: { inAppEnabled: false, emailEnabled: true, webPushEnabled: true }, expectedStatus: 400,
  });
  const preferences = await jsonRequest('/api/v1/notifications/preferences', {
    method: 'PUT', host: tenant.host, token: tenant.token,
    body: {
      inAppEnabled: true,
      emailEnabled: !originalPreferences.emailEnabled,
      webPushEnabled: !originalPreferences.webPushEnabled,
    },
    expectedStatus: 200,
  });
  assert(preferences.inAppEnabled, 'Mandatory in-app notifications were disabled');
  const endpoint = `https://push.example.test/local/${runId}`;
  const subscription = await jsonRequest('/api/v1/notifications/push-subscriptions', {
    method: 'POST', host: tenant.host, token: tenant.token,
    body: { endpoint, p256dh: 'local-p256dh', auth: 'local-auth' }, expectedStatus: 200,
  });
  subscriptionId = subscription.id;
  const duplicate = await jsonRequest('/api/v1/notifications/push-subscriptions', {
    method: 'POST', host: tenant.host, token: tenant.token,
    body: { endpoint, p256dh: 'rotated-p256dh', auth: 'rotated-auth' }, expectedStatus: 200,
  });
  assert(duplicate.id === subscriptionId, 'Push subscription endpoint was not handled idempotently');
  const subscriptions = await jsonRequest('/api/v1/notifications/push-subscriptions', {
    host: tenant.host, token: tenant.token, expectedStatus: 200,
  });
  assert(subscriptions.some((item) => item.id === subscriptionId), 'Push subscription was not listed');
  await request(`/api/v1/notifications/push-subscriptions/${subscriptionId}`, {
    method: 'DELETE', host: tenant.host, token: tenant.token, expectedStatus: 200,
  });
  subscriptionId = undefined;

  await jsonRequest(`/api/v1/projects/${projectId}/status`, {
    method: 'PATCH', host: tenant.host, token: tenant.token,
    body: { status: 'ARCHIVED' }, expectedStatus: 200,
  });
  await request(`/api/v1/tasks/${task.id}`, {
    method: 'PATCH', host: tenant.host, token: tenant.token,
    body: {
      columnId: board.columns[1].id, title: 'Must remain read-only',
      position: 1024, version: board.tasks.find((item) => item.id === task.id).version,
    }, expectedStatus: 409,
  });
  const restored = await jsonRequest(`/api/v1/projects/${projectId}/status`, {
    method: 'PATCH', host: tenant.host, token: tenant.token,
    body: { status: 'ACTIVE' }, expectedStatus: 200,
  });
  assert(restored.status === 'ACTIVE', 'Project restore did not return ACTIVE');

  console.log('PASS: APP03–APP06 local API workflow, invariants and System Admin detail/filter completed.');
} finally {
  if (tenant?.token && subscriptionId) {
    await bestEffort(`/api/v1/notifications/push-subscriptions/${subscriptionId}`, 'DELETE');
  }
  if (tenant?.token && resourceId) await bestEffort(`/api/v1/resources/${resourceId}`, 'DELETE');
  if (tenant?.token && projectId) await bestEffort(`/api/v1/projects/${projectId}`, 'DELETE');
  if (tenant?.token && originalPreferences) {
    try {
      await request('/api/v1/notifications/preferences', {
        method: 'PUT', host: tenant.host, token: tenant.token,
        body: originalPreferences, expectedStatus: 200,
      });
    } catch (error) {
      console.error(`WARNING: notification preference cleanup failed: ${error.message}`);
    }
  }
}

async function tenantSession(globalToken, slug) {
  const transfer = await jsonRequest('/api/v1/auth/tenant-transfer', {
    method: 'POST', host: new URL(accountsOrigin).host, token: globalToken,
    body: { tenantSlug: slug }, expectedStatus: 200,
  });
  const redirect = new URL(transfer.redirectUrl);
  const code = redirect.searchParams.get('code');
  assert(code, `Tenant transfer for ${slug} did not include a code`);
  const session = await jsonRequest('/api/v1/auth/exchange', {
    method: 'POST', host: redirect.host, body: { code }, expectedStatus: 200,
  });
  return { host: redirect.host, token: session.accessToken };
}

async function bestEffort(path, method) {
  try {
    await request(path, { method, host: tenant.host, token: tenant.token, expectedStatus: [200, 204, 404] });
  } catch (error) {
    console.error(`WARNING: local smoke cleanup failed: ${error.message}`);
  }
}

async function jsonRequest(path, options) {
  const response = await request(path, options);
  const body = await response.text();
  if (!body) throw new Error(`${options.method || 'GET'} ${path} returned an empty JSON body`);
  return JSON.parse(body);
}

async function request(path, { method = 'GET', host, token, body, expectedStatus }) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const origin = new URL(gatewayOrigin);
  origin.host = host;
  const response = await fetch(new URL(path, origin), { method, headers, body: payload });
  const allowed = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
  if (!allowed.includes(response.status)) {
    throw new Error(`${method} ${path} returned ${response.status}: ${(await response.text()).slice(0, 500)}`);
  }
  return response;
}

function required(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`${names.join(' or ')} is required`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
