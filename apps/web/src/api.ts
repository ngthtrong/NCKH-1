import type {
  AdminTenant,
  AuthUser,
  Board,
  BoardColumn,
  CacheProbeResult,
  Card,
  DiscoveredTenant,
  InspectorTelemetry,
  MetricsOverview,
  NoisyNeighborTestResult,
  PublicBranding,
  RlsProbeResult,
  TenantInfo,
  TenantMember,
  TenantSettings,
} from './types';

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const TOKEN_KEY = 'tenantflow_token';

export function getStoredToken(): string | null {
  // Purge any legacy localStorage token to prevent session leakage
  try {
    if (localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function clearStoredToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
}

type TelemetryListener = (entry: InspectorTelemetry) => void;
const telemetryListeners = new Set<TelemetryListener>();

export function subscribeTelemetry(fn: TelemetryListener): () => void {
  telemetryListeners.add(fn);
  return () => telemetryListeners.delete(fn);
}

export function recordCustomTelemetry(entry: InspectorTelemetry) {
  telemetryListeners.forEach((fn) => fn(entry));
}

function resolveTenantSlug(res: Response, path: string): string {
  const fromHeader = res.headers.get('X-Tenant-Slug');
  if (fromHeader) return fromHeader;
  try {
    const host = window.location.hostname.toLowerCase();
    if (host.endsWith('.localhost')) {
      return host.replace('.localhost', '') || 'admin';
    }
    const parts = host.split('.');
    if (parts.length >= 3) {
      return parts[0];
    }
  } catch {}
  return 'admin';
}

function emitTelemetry(method: string, path: string, res: Response, clientElapsedMs: number) {
  const limit = res.headers.get('X-RateLimit-Limit');
  const rem = res.headers.get('X-RateLimit-Remaining');
  const serverLatency = res.headers.get('X-Response-Time-Ms') || res.headers.get('X-Latency-Ms');
  const latency = serverLatency ? parseInt(serverLatency, 10) : clientElapsedMs;
  const rawCache = res.headers.get('X-Cache-Status') || res.headers.get('X-Cache-Source');
  const cacheStatus = rawCache && rawCache !== 'N/A' ? rawCache : 'DIRECT';

  const entry: InspectorTelemetry = {
    timestamp: new Date().toLocaleTimeString('vi-VN'),
    tenantSlug: resolveTenantSlug(res, path),
    method,
    path,
    status: res.status,
    tenantId: res.headers.get('X-Tenant-ID') || '—',
    subdomainMatch: res.headers.get('X-Subdomain-Match') || '—',
    cacheStatus,
    rateLimit: limit && rem ? `${rem}/${limit}` : '—',
    rlsContext: res.headers.get('X-RLS-Context') || '—',
    responseTimeMs: `${latency} ms`,
    latencyMs: latency,
  };
  telemetryListeners.forEach((fn) => fn(entry));
}

type RequestOptions = RequestInit & { skipTelemetryLog?: boolean };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const method = options.method || 'GET';
  const start = performance.now();
  const res = await fetch(path, { ...options, headers });
  const clientElapsed = Math.max(1, Math.round(performance.now() - start));

  if (!options.skipTelemetryLog) {
    emitTelemetry(method, path, res, clientElapsed);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      String(data.code ?? 'API_ERROR'),
      String(data.error ?? `Request failed with status ${res.status}`)
    );
  }
  return data as T;
}

export const api = {
  getPublicBranding: () => request<PublicBranding>('/api/public/tenant-branding'),

  discoverTenant: (email: string) =>
    request<DiscoveredTenant[]>('/api/public/discover-tenant', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  login: (email: string, password: string, tenantSlug?: string) =>
    request<{
      accessToken: string;
      user: AuthUser;
      tenant?: { id: string; slug: string; name: string; tier: string; settings: TenantSettings };
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, tenantSlug }),
    }),

  registerMember: (payload: {
    email: string;
    fullName: string;
    password: string;
    inviteCode: string;
    tenantSlug?: string;
  }) =>
    request<{
      accessToken: string;
      user: AuthUser;
      tenant?: { id: string; slug: string; name: string; tier: string; settings: TenantSettings };
    }>('/api/auth/register-member', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: () => request<TenantInfo>('/api/auth/me'),

  // Platform Admin & Self-Service Onboarding
  listTenants: (opts?: { skipTelemetryLog?: boolean }) => request<AdminTenant[]>('/api/platform/tenants', opts),
  createTenant: (payload: {
    slug: string;
    name: string;
    tier?: string;
    industryTemplate?: string;
    rateLimitRpm?: number;
    maxMembers?: number;
    adminEmail?: string;
    adminName?: string;
    adminPassword?: string;
  }) => request<AdminTenant>('/api/platform/tenants', { method: 'POST', body: JSON.stringify(payload) }),
  updateTenant: (
    id: string,
    payload: { status?: 'ACTIVE' | 'SUSPENDED'; tier?: string; rateLimitRpm?: number; maxMembers?: number }
  ) => request<AdminTenant>(`/api/platform/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getMetricsOverview: (opts?: { skipTelemetryLog?: boolean }) =>
    request<MetricsOverview>('/api/admin/metrics/overview', opts),

  // Settings (K4)
  getSettings: () => request<TenantSettings>('/api/tenant-settings/kanban'),
  updateSettings: (settings: TenantSettings) =>
    request<TenantSettings>('/api/tenant-settings/kanban', { method: 'PUT', body: JSON.stringify(settings) }),

  // Members
  listMembers: () => request<TenantMember[]>('/api/tenant-users'),
  addMember: (payload: { email: string; fullName: string; password?: string; role: string }) =>
    request<TenantMember>('/api/tenant-users', { method: 'POST', body: JSON.stringify(payload) }),
  updateMemberRole: (id: string, role: string) =>
    request<TenantMember>(`/api/tenant-users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeMember: (id: string) => request<void>(`/api/tenant-users/${id}`, { method: 'DELETE' }),

  // Boards & Columns
  listBoards: () => request<Board[]>('/api/boards'),
  createBoard: (name: string) => request<Board>('/api/boards', { method: 'POST', body: JSON.stringify({ name }) }),
  renameBoard: (id: string, name: string) =>
    request<Board>(`/api/boards/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  deleteBoard: (id: string) => request<void>(`/api/boards/${id}`, { method: 'DELETE' }),

  getBoardDetail: (
    id: string,
    filters?: { q?: string; columnId?: string; assigneeId?: string; cfKey?: string; cfValue?: string }
  ) => {
    const params = new URLSearchParams();
    if (filters?.q) params.set('q', filters.q);
    if (filters?.columnId) params.set('columnId', filters.columnId);
    if (filters?.assigneeId) params.set('assigneeId', filters.assigneeId);
    if (filters?.cfKey && filters?.cfValue) {
      params.set('cfKey', filters.cfKey);
      params.set('cfValue', filters.cfValue);
    }
    const qs = params.toString();
    return request<{ board: Board; columns: BoardColumn[]; cards: Card[] }>(`/api/boards/${id}${qs ? `?${qs}` : ''}`);
  },

  addColumn: (boardId: string, payload: { name: string; position?: number; wipLimit?: number | null }) =>
    request<BoardColumn>(`/api/boards/${boardId}/columns`, { method: 'POST', body: JSON.stringify(payload) }),
  updateColumn: (columnId: string, payload: { name?: string; position?: number; wipLimit?: number | null }) =>
    request<BoardColumn>(`/api/columns/${columnId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteColumn: (columnId: string) => request<void>(`/api/columns/${columnId}`, { method: 'DELETE' }),

  // Cards
  createCard: (
    boardId: string,
    payload: {
      columnId: string;
      title: string;
      description?: string;
      assigneeId?: string | null;
      customFields: Record<string, unknown>;
    }
  ) => request<Card>(`/api/boards/${boardId}/tasks`, { method: 'POST', body: JSON.stringify(payload) }),

  updateCard: (
    cardId: string,
    payload: {
      title?: string;
      description?: string;
      assigneeId?: string | null;
      customFields: Record<string, unknown>;
    }
  ) => request<Card>(`/api/cards/${cardId}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  deleteCard: (cardId: string) => request<void>(`/api/cards/${cardId}`, { method: 'DELETE' }),

  moveCard: (cardId: string, payload: { targetColumnId: string; targetPosition: number; expectedVersion: number }) =>
    request<{ card: Card; wipWarning: boolean; targetColumnId: string; wipLimit: number }>(
      `/api/cards/${cardId}/move`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    ),

  // Architecture Dev Inspector Probes
  probeRls: (targetSlug?: string) =>
    request<RlsProbeResult>(
      targetSlug ? `/api/inspector/rls-probe?targetSlug=${encodeURIComponent(targetSlug)}` : '/api/inspector/rls-probe'
    ),
  probeCache: (targetSlug?: string) =>
    request<CacheProbeResult>(
      targetSlug ? `/api/inspector/cache-probe?targetSlug=${encodeURIComponent(targetSlug)}` : '/api/inspector/cache-probe',
      { method: 'POST' }
    ),
  runNoisyNeighborTest: (payload?: {
    noisySlug?: string;
    noisyRequests?: number;
    normalSlug?: string;
    normalRequests?: number;
  }) =>
    request<NoisyNeighborTestResult>('/api/admin/inspector/noisy-neighbor-test', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
};
