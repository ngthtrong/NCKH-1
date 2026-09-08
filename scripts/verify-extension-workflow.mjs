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
const memberEmail = process.env.E2E_MEMBER_EMAIL?.trim() || 'member@example.test';
const runId = `${Date.now()}-${process.pid}`;
const expectedTenants = [
  ['pool-demo', 'POOL'],
  ['schema-demo', 'SCHEMA_PER_TENANT'],
  ['silo-demo', 'SILO_DATABASE'],
];

const cleanupProjects = [];
const capabilityRestores = [];
let brandingRestore;
let workflowCleanup;
let automationCleanup;

try {
  const ownerLogin = await login(ownerEmail, ownerPassword);
  const memberLogin = await login(memberEmail, ownerPassword);
  assert(ownerLogin.user.platformRoles.includes('SYSTEM_ADMIN'), 'Demo owner is not SYSTEM_ADMIN');

  const adminTenants = await jsonRequest('/api/v1/admin/tenants?status=ACTIVE&size=100', {
    host: new URL(accountsOrigin).host, token: ownerLogin.accessToken, expectedStatus: 200,
  });
  const tenants = new Map();
  for (const [slug, placement] of expectedTenants) {
    const tenant = adminTenants.items.find((candidate) => candidate.slug === slug);
    assert(tenant, `Active demo tenant ${slug} was not returned by System Admin API`);
    assert(tenant.placement === placement, `${slug} expected ${placement}, got ${tenant.placement}`);
    tenants.set(slug, tenant);
  }

  const sessions = new Map();
  for (const [slug, placement] of expectedTenants) {
    const session = await tenantSession(ownerLogin.accessToken, slug);
    sessions.set(slug, session);
    const settings = await jsonRequest('/api/v1/tenant-settings', {
      host: session.host, token: session.token, expectedStatus: 200,
    });
    assertCapabilityMatrix(settings.capabilities, placement);

    const project = await createProject(session, `EXT core ${placement} ${runId}`);
    cleanupProjects.push({ session, projectId: project.id });
    const board = await jsonRequest(`/api/v1/boards/${project.boardId}`, {
      host: session.host, token: session.token, expectedStatus: 200,
    });
    const task = await jsonRequest(`/api/v1/boards/${board.id}/tasks`, {
      method: 'POST', host: session.host, token: session.token, expectedStatus: 201,
      body: { columnId: board.columns[0].id, title: `Core task ${placement}` },
    });
    const loaded = await jsonRequest(`/api/v1/tasks/${task.id}`, {
      host: session.host, token: session.token, expectedStatus: 200,
    });
    assert(loaded.id === task.id, `Core Task round-trip failed for ${placement}`);
    await request(`/api/v1/tasks/${task.id}`, {
      method: 'DELETE', host: session.host, token: session.token, expectedStatus: 204,
    });
  }

  const pool = tenants.get('pool-demo');
  const poolCapabilities = await adminCapabilities(ownerLogin, pool.id);
  const poolCustom = capability(poolCapabilities, 'CUSTOM_DATA');
  await request(`/api/v1/admin/tenants/${pool.id}/capabilities/CUSTOM_DATA`, {
    method: 'PATCH', host: new URL(accountsOrigin).host, token: ownerLogin.accessToken,
    body: { granted: true, version: poolCustom.version }, expectedStatus: 409,
  });

  const schemaTenant = tenants.get('schema-demo');
  const schemaSession = sessions.get('schema-demo');
  await enableCapability(ownerLogin, schemaTenant, schemaSession, 'CUSTOM_DATA');
  await verifyBranding(schemaSession);
  await verifyCustomData(schemaSession);

  const siloTenant = tenants.get('silo-demo');
  const siloOwner = sessions.get('silo-demo');
  const siloMember = await tenantSession(memberLogin.accessToken, 'silo-demo');
  await enableCapability(ownerLogin, siloTenant, siloOwner, 'APPROVALS');
  await enableCapability(ownerLogin, siloTenant, siloOwner, 'AUTOMATION');
  await verifyApprovalAndAutomation(siloOwner, siloMember, memberLogin.user.id);

  console.log('PASS: EXT local smoke covered three placements, capability gates, branding, Custom Data, Approval and Automation.');
} finally {
  if (workflowCleanup) await bestEffortSaveWorkflowDisabled(workflowCleanup);
  if (automationCleanup) await bestEffortDisableRule(automationCleanup);
  for (const entry of cleanupProjects.reverse()) {
    await bestEffort(`/api/v1/projects/${entry.projectId}`, {
      method: 'DELETE', host: entry.session.host, token: entry.session.token, expectedStatus: [204, 404],
    });
  }
  if (brandingRestore) await bestEffortRestoreBranding(brandingRestore);
  for (const restore of capabilityRestores.reverse()) await bestEffortRestoreCapability(restore);
}

async function verifyBranding(session) {
  const settings = await jsonRequest('/api/v1/tenant-settings', {
    host: session.host, token: session.token, expectedStatus: 200,
  });
  const original = settings.branding;
  brandingRestore = { session, original, currentVersion: original.version };
  await request('/api/v1/tenant-settings/branding', {
    method: 'PATCH', host: session.host, token: session.token,
    body: { primaryColor: 'red', accentColor: '#102030', version: original.version }, expectedStatus: 400,
  });
  let changed = await jsonRequest('/api/v1/tenant-settings/branding', {
    method: 'PATCH', host: session.host, token: session.token,
    body: { primaryColor: '#123456', accentColor: '#ABCDEF', version: original.version }, expectedStatus: 200,
  });
  brandingRestore.currentVersion = changed.version;
  assert(changed.primaryColor === '#123456' && changed.accentColor === '#ABCDEF', 'Branding colors were not persisted');

  if (!original.logoUrl) {
    const form = new FormData();
    form.append('file', new Blob([tinyPng()], { type: 'image/png' }), `ext-${runId}.png`);
    changed = await jsonRequest(`/api/v1/tenant-settings/branding/logo?version=${changed.version}`, {
      method: 'POST', host: session.host, token: session.token, rawBody: form, expectedStatus: 200,
    });
    brandingRestore.currentVersion = changed.version;
    assert(changed.logoUrl, 'Tenant logo URL was not returned');
    changed = await jsonRequest(`/api/v1/tenant-settings/branding/logo?version=${changed.version}`, {
      method: 'DELETE', host: session.host, token: session.token, expectedStatus: 200,
    });
    brandingRestore.currentVersion = changed.version;
  }
}

async function verifyCustomData(session) {
  const project = await createProject(session, `EXT Custom Data ${runId}`);
  cleanupProjects.push({ session, projectId: project.id });
  let definition = await jsonRequest(`/api/v1/projects/${project.id}/custom-definitions`, {
    method: 'POST', host: session.host, token: session.token, expectedStatus: 200,
    body: { kind: 'ENTITY', displayName: `Risk ${runId}` },
  });
  definition = await waitForDefinition(session, project.id, definition.id, 45_000);
  assert(definition.status === 'ACTIVE', `Custom definition ended in ${definition.status}`);

  definition = await jsonRequest(`/api/v1/custom-definitions/${definition.id}/fields`, {
    method: 'POST', host: session.host, token: session.token, expectedStatus: 200,
    body: { displayName: 'Severity', dataType: 'SINGLE_SELECT', required: false, position: 1, options: ['LOW', 'HIGH'] },
  });
  const pendingField = definition.fields.at(-1);
  definition = await waitForField(session, project.id, definition.id, pendingField.id, 45_000);
  const field = definition.fields.find((candidate) => candidate.id === pendingField.id);
  assert(field?.status === 'ACTIVE', `Custom field ended in ${field?.status}`);

  const created = await jsonRequest(`/api/v1/custom-definitions/${definition.id}/records`, {
    method: 'POST', host: session.host, token: session.token, expectedStatus: 200,
    body: { values: { [field.id]: 'HIGH' } },
  });
  const records = await jsonRequest(`/api/v1/custom-definitions/${definition.id}/records`, {
    host: session.host, token: session.token, expectedStatus: 200,
  });
  assert(records.some((record) => record.id === created.id && record.values[field.id] === 'HIGH'),
    'Custom record did not round-trip through physical field storage');
  await request(`/api/v1/custom-definitions/${definition.id}/records/${created.id}?version=${created.version}`, {
    method: 'DELETE', host: session.host, token: session.token, expectedStatus: 200,
  });
  await request(`/api/v1/custom-definitions/${definition.id}/fields/${field.id}?version=${field.version}`, {
    method: 'DELETE', host: session.host, token: session.token, expectedStatus: 200,
  });
  await request(`/api/v1/custom-definitions/${definition.id}?version=${definition.version}`, {
    method: 'DELETE', host: session.host, token: session.token, expectedStatus: 200,
  });
}

async function verifyApprovalAndAutomation(owner, member, memberUserId) {
  const project = await createProject(owner, `EXT Approval Automation ${runId}`);
  cleanupProjects.push({ session: owner, projectId: project.id });
  await request(`/api/v1/projects/${project.id}/members/${memberUserId}`, {
    method: 'PUT', host: owner.host, token: owner.token, expectedStatus: 200, body: { role: 'MEMBER' },
  });
  const board = await jsonRequest(`/api/v1/boards/${project.boardId}`, {
    host: owner.host, token: owner.token, expectedStatus: 200,
  });
  const rule = await jsonRequest(`/api/v1/projects/${project.id}/automation-rules`, {
    method: 'POST', host: owner.host, token: owner.token, expectedStatus: 200,
    body: {
      name: `Notify member ${runId}`, triggerType: 'TASK_CREATED', triggerBoardId: null,
      triggerColumnId: null, actionType: 'NOTIFY_USERS', actionUserIds: [memberUserId],
    },
  });
  automationCleanup = { session: owner, rule };
  const task = await jsonRequest(`/api/v1/boards/${board.id}/tasks`, {
    method: 'POST', host: owner.host, token: owner.token, expectedStatus: 201,
    body: { columnId: board.columns[0].id, title: `Approval task ${runId}` },
  });
  await waitFor(async () => {
    const executions = await jsonRequest(`/api/v1/projects/${project.id}/automation-executions`, {
      host: owner.host, token: owner.token, expectedStatus: 200,
    });
    return executions.some((execution) => execution.ruleId === rule.id && execution.status === 'SUCCEEDED');
  }, 30_000, 'Automation execution did not succeed');

  const workflow = await jsonRequest(`/api/v1/boards/${board.id}/approval-workflow`, {
    method: 'PUT', host: owner.host, token: owner.token, expectedStatus: 200,
    body: {
      completionColumnId: board.columns.at(-1).id, name: `Completion ${runId}`, enabled: true,
      steps: [{ name: 'Manager review', mode: 'ANY', approverIds: [task.assigneeUserId ?? owner.userId] }],
      version: 0,
    },
  });
  workflowCleanup = { session: owner, workflow };
  const submitted = await jsonRequest(`/api/v1/tasks/${task.id}/approval-runs`, {
    method: 'POST', host: member.host, token: member.token, expectedStatus: 200,
  });
  const approved = await jsonRequest(`/api/v1/approval-runs/${submitted.id}/decisions`, {
    method: 'POST', host: owner.host, token: owner.token, expectedStatus: 200,
    body: { decision: 'APPROVED', version: submitted.version },
  });
  assert(approved.status === 'APPROVED', `Approval ended in ${approved.status}`);
  const finalTask = await jsonRequest(`/api/v1/tasks/${task.id}`, {
    host: owner.host, token: owner.token, expectedStatus: 200,
  });
  assert(finalTask.columnId === board.columns.at(-1).id, 'Approved Task did not enter completion column');
  await bestEffortSaveWorkflowDisabled(workflowCleanup);
  workflowCleanup = undefined;
  await bestEffortDisableRule(automationCleanup);
  automationCleanup = undefined;
}

async function enableCapability(adminLogin, tenant, session, name) {
  const initial = capability(await adminCapabilities(adminLogin, tenant.id), name);
  const restore = { adminLogin, tenant, session, name, initial };
  capabilityRestores.push(restore);
  let current = initial;
  if (!current.granted) {
    const rows = await jsonRequest(`/api/v1/admin/tenants/${tenant.id}/capabilities/${name}`, {
      method: 'PATCH', host: new URL(accountsOrigin).host, token: adminLogin.accessToken,
      body: { granted: true, version: current.version }, expectedStatus: 200,
    });
    current = capability(rows, name);
  }
  if (!current.enabled) {
    const rows = await jsonRequest('/api/v1/tenant-settings/capabilities', {
      method: 'PATCH', host: session.host, token: session.token,
      body: { capability: name, enabled: true, version: current.version }, expectedStatus: 200,
    });
    current = capability(rows, name);
  }
  restore.current = current;
}

async function bestEffortRestoreCapability(restore) {
  try {
    let current = capability(await adminCapabilities(restore.adminLogin, restore.tenant.id), restore.name);
    if (current.granted && current.enabled !== restore.initial.enabled) {
      const rows = await jsonRequest('/api/v1/tenant-settings/capabilities', {
        method: 'PATCH', host: restore.session.host, token: restore.session.token,
        body: { capability: restore.name, enabled: restore.initial.enabled, version: current.version }, expectedStatus: 200,
      });
      current = capability(rows, restore.name);
    }
    if (current.granted !== restore.initial.granted) {
      await request(`/api/v1/admin/tenants/${restore.tenant.id}/capabilities/${restore.name}`, {
        method: 'PATCH', host: new URL(accountsOrigin).host, token: restore.adminLogin.accessToken,
        body: { granted: restore.initial.granted, version: current.version }, expectedStatus: 200,
      });
    }
  } catch (error) {
    console.error(`WARNING: capability cleanup failed for ${restore.name}: ${error.message}`);
  }
}

async function bestEffortRestoreBranding({ session, original, currentVersion }) {
  try {
    await request('/api/v1/tenant-settings/branding', {
      method: 'PATCH', host: session.host, token: session.token, expectedStatus: 200,
      body: { primaryColor: original.primaryColor, accentColor: original.accentColor, version: currentVersion },
    });
  } catch (error) {
    console.error(`WARNING: branding cleanup failed: ${error.message}`);
  }
}

async function bestEffortSaveWorkflowDisabled({ session, workflow }) {
  try {
    await request(`/api/v1/boards/${workflow.boardId}/approval-workflow`, {
      method: 'PUT', host: session.host, token: session.token, expectedStatus: [200, 404],
      body: {
        completionColumnId: workflow.completionColumnId, name: workflow.name, enabled: false,
        steps: workflow.steps.map((step) => ({ name: step.name, mode: step.mode, approverIds: step.approverIds })),
        version: workflow.version,
      },
    });
  } catch (error) {
    console.error(`WARNING: approval workflow cleanup failed: ${error.message}`);
  }
}

async function bestEffortDisableRule({ session, rule }) {
  try {
    await request(`/api/v1/automation-rules/${rule.id}/disable`, {
      method: 'POST', host: session.host, token: session.token,
      body: { version: rule.version }, expectedStatus: [200, 404, 409],
    });
  } catch (error) {
    console.error(`WARNING: automation rule cleanup failed: ${error.message}`);
  }
}

async function waitForDefinition(session, projectId, definitionId, timeout) {
  let found;
  await waitFor(async () => {
    const rows = await jsonRequest(`/api/v1/projects/${projectId}/custom-definitions`, {
      host: session.host, token: session.token, expectedStatus: 200,
    });
    found = rows.find((row) => row.id === definitionId);
    if (found?.status === 'FAILED') throw new Error(`Definition DDL failed: ${found.lastError}`);
    return found?.status === 'ACTIVE';
  }, timeout, 'Custom definition did not become ACTIVE');
  return found;
}

async function waitForField(session, projectId, definitionId, fieldId, timeout) {
  let found;
  await waitFor(async () => {
    const rows = await jsonRequest(`/api/v1/projects/${projectId}/custom-definitions`, {
      host: session.host, token: session.token, expectedStatus: 200,
    });
    found = rows.find((row) => row.id === definitionId);
    const field = found?.fields.find((candidate) => candidate.id === fieldId);
    if (field?.status === 'FAILED') throw new Error(`Field DDL failed: ${field.lastError}`);
    return field?.status === 'ACTIVE';
  }, timeout, 'Custom field did not become ACTIVE');
  return found;
}

async function waitFor(check, timeout, message) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 750));
  }
  throw new Error(message);
}

async function createProject(session, name) {
  const project = await jsonRequest('/api/v1/projects', {
    method: 'POST', host: session.host, token: session.token, expectedStatus: 201,
    body: { name, description: 'Transient EXT local technical verification' },
  });
  assert(project.status === 'ACTIVE' && project.role === 'MANAGER', 'Created project is not active/managed');
  return project;
}

async function adminCapabilities(loginResult, tenantId) {
  return jsonRequest(`/api/v1/admin/tenants/${tenantId}/capabilities`, {
    host: new URL(accountsOrigin).host, token: loginResult.accessToken, expectedStatus: 200,
  });
}

function assertCapabilityMatrix(rows, placement) {
  const expected = {
    POOL: ['BRANDING'],
    SCHEMA_PER_TENANT: ['BRANDING', 'CUSTOM_DATA'],
    SILO_DATABASE: ['BRANDING', 'CUSTOM_DATA', 'APPROVALS', 'AUTOMATION'],
  }[placement];
  const supported = rows.filter((row) => row.supported).map((row) => row.capability).sort();
  assert(JSON.stringify(supported) === JSON.stringify([...expected].sort()),
    `${placement} capability matrix was ${supported.join(',')}`);
}

function capability(rows, name) {
  const row = rows.find((candidate) => candidate.capability === name);
  assert(row, `Capability ${name} was not returned`);
  return row;
}

async function login(email, password) {
  return jsonRequest('/api/v1/auth/login', {
    method: 'POST', host: new URL(accountsOrigin).host, expectedStatus: 200, body: { email, password },
  });
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
  return { host: redirect.host, token: session.accessToken, userId: session.user.id };
}

async function bestEffort(path, options) {
  try {
    await request(path, options);
  } catch (error) {
    console.error(`WARNING: local smoke cleanup failed: ${error.message}`);
  }
}

async function jsonRequest(path, options) {
  const response = await request(path, options);
  const textBody = await response.text();
  if (!textBody) throw new Error(`${options.method || 'GET'} ${path} returned an empty JSON body`);
  return JSON.parse(textBody);
}

async function request(path, { method = 'GET', host, token, body, rawBody, expectedStatus }) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload = rawBody;
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

function tinyPng() {
  return Uint8Array.from(Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'));
}

function required(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`Missing required environment variable: ${names.join(' or ')}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
