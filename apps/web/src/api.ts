import type {
  AdminTenant,
  Board,
  BoardColumn,
  Card,
  TenantInfo,
  TenantMember,
  TenantSettings,
  WorkspaceSummary,
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

async function request<T>(path: string, options: RequestInit = {}, overrideToken?: string): Promise<T> {
  const token = overrideToken ?? getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });
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
  login: (email: string, password: string) =>
    request<{
      user: { email: string; fullName: string; systemAdmin: boolean };
      preAuthToken: string;
      accessToken?: string;
      workspaces: WorkspaceSummary[];
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  switchWorkspace: (tenantSlug: string, preAuthToken: string) =>
    request<{
      accessToken: string;
      tenant: { id: string; slug: string; name: string; tier: string; status: string; role: string; settings: TenantSettings };
    }>(
      '/api/auth/switch-workspace',
      {
        method: 'POST',
        body: JSON.stringify({ tenantSlug }),
      },
      preAuthToken
    ),

  me: () => request<TenantInfo>('/api/auth/me'),

  // Admin (UC01)
  listTenants: () => request<AdminTenant[]>('/api/admin/tenants'),
  createTenant: (payload: {
    slug: string;
    name: string;
    tier: string;
    adminEmail?: string;
    adminName?: string;
    adminPassword?: string;
  }) => request<AdminTenant>('/api/admin/tenants', { method: 'POST', body: JSON.stringify(payload) }),
  updateTenantStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') =>
    request<AdminTenant>(`/api/admin/tenants/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Settings (UC03, UC04)
  getSettings: () => request<TenantSettings>('/api/tenant-settings/kanban'),
  updateSettings: (settings: TenantSettings) =>
    request<TenantSettings>('/api/tenant-settings/kanban', { method: 'PUT', body: JSON.stringify(settings) }),

  // Members (UC05)
  listMembers: () => request<TenantMember[]>('/api/tenant-users'),
  addMember: (payload: { email: string; fullName: string; password?: string; role: string }) =>
    request<TenantMember>('/api/tenant-users', { method: 'POST', body: JSON.stringify(payload) }),
  updateMemberRole: (id: string, role: string) =>
    request<TenantMember>(`/api/tenant-users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeMember: (id: string) => request<void>(`/api/tenant-users/${id}`, { method: 'DELETE' }),

  // Boards & Columns (UC06, UC07)
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

  // Cards (UC08, UC09, UC10)
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
