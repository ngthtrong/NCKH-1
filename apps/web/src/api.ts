import type {
  AdminTenant,
  AuthUser,
  Board,
  BoardColumn,
  Card,
  InspectorTelemetry,
  PublicBranding,
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
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

type TelemetryListener = (entry: InspectorTelemetry) => void;
const telemetryListeners = new Set<TelemetryListener>();

export function subscribeTelemetry(fn: TelemetryListener): () => void {
  telemetryListeners.add(fn);
  return () => telemetryListeners.delete(fn);
}

function emitTelemetry(method: string, path: string, res: Response) {
  const limit = res.headers.get('X-RateLimit-Limit');
  const rem = res.headers.get('X-RateLimit-Remaining');
  const entry: InspectorTelemetry = {
    timestamp: new Date().toLocaleTimeString('vi-VN'),
    method,
    path,
    status: res.status,
    tenantId: res.headers.get('X-Tenant-ID') || '—',
    subdomainMatch: res.headers.get('X-Subdomain-Match') || '—',
    cacheStatus: res.headers.get('X-Cache-Status') || 'N/A',
    rateLimit: limit && rem ? `${rem}/${limit}` : '—',
    rlsContext: res.headers.get('X-RLS-Context') || '—',
    responseTimeMs: res.headers.get('X-Response-Time-Ms') ? `${res.headers.get('X-Response-Time-Ms')} ms` : '—',
  };
  telemetryListeners.forEach((fn) => fn(entry));
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const method = options.method || 'GET';
  const res = await fetch(path, { ...options, headers });
  emitTelemetry(method, path, res);

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

  login: (email: string, password: string, tenantSlug?: string) =>
    request<{
      accessToken: string;
      user: AuthUser;
      tenant?: { id: string; slug: string; name: string; tier: string; settings: TenantSettings };
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, tenantSlug }),
    }),

  me: () => request<TenantInfo>('/api/auth/me'),

  // Platform Admin & Self-Service Onboarding
  listTenants: () => request<AdminTenant[]>('/api/platform/tenants'),
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
};
