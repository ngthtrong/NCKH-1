import type { ApiProblem } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

let accessToken: string | null = null;
let sessionRefreshHandler: (() => Promise<string | null>) | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function setApiAccessToken(token: string | null): void {
  accessToken = token;
}

export function setApiSessionRefreshHandler(handler: (() => Promise<string | null>) | null): void {
  sessionRefreshHandler = handler;
  if (!handler) refreshInFlight = null;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly problem?: ApiProblem;

  constructor(status: number, problem?: ApiProblem) {
    super(problem?.detail ?? problem?.message ?? problem?.title ?? `Yêu cầu thất bại (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.code = problem?.code;
    this.problem = problem;
  }
}

export type RateLimitNotification = {
  status: number;
  retryAfterSeconds?: number;
};

type RateLimitListener = (info: RateLimitNotification) => void;
const rateLimitListeners = new Set<RateLimitListener>();
let lastRateLimitTimestamp = 0;
const RATE_LIMIT_DEBOUNCE_MS = 5000;

export function addRateLimitListener(listener: RateLimitListener): () => void {
  rateLimitListeners.add(listener);
  return () => {
    rateLimitListeners.delete(listener);
  };
}

function notifyRateLimit(status: number, retryAfterHeader: string | null) {
  const now = Date.now();
  if (now - lastRateLimitTimestamp < RATE_LIMIT_DEBOUNCE_MS) return;
  lastRateLimitTimestamp = now;
  const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
  rateLimitListeners.forEach((listener) => {
    try {
      listener({ status, retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined });
    } catch {
      // Ignore listener error
    }
  });
}

function cookie(name: string): string | undefined {
  const prefix = `${encodeURIComponent(name)}=`;
  return document.cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
}

async function refreshSession(): Promise<string | null> {
  if (!sessionRefreshHandler) return null;
  if (!refreshInFlight) {
    refreshInFlight = sessionRefreshHandler().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function request<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const { body: rawBody, skipAuth, ...requestInit } = options;
  const headers = new Headers(options.headers);
  const method = options.method?.toUpperCase() ?? 'GET';
  let body: BodyInit | undefined;

  if (rawBody instanceof FormData || rawBody instanceof Blob) {
    body = rawBody;
  } else if (rawBody !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(rawBody);
  }

  headers.set('Accept', 'application/json');
  if (accessToken && !skipAuth) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = cookie('XSRF-TOKEN');
    if (csrfToken) headers.set('X-CSRF-TOKEN', decodeURIComponent(csrfToken));
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestInit,
    method,
    headers,
    body,
    credentials: 'include',
  });

  if (response.status === 401 && accessToken && !skipAuth && !retried && sessionRefreshHandler) {
    const refreshedToken = await refreshSession();
    if (refreshedToken) return request<T>(path, options, true);
  }

  if (response.status === 429) {
    notifyRateLimit(response.status, response.headers.get('Retry-After'));
  }

  if (!response.ok) {
    let problem: ApiProblem | undefined;
    if (response.headers.get('content-type')?.includes('json')) {
      problem = (await response.json()) as ApiProblem;
    }
    throw new ApiError(response.status, problem);
  }

  if (response.status === 204) return undefined as T;
  const responseBody = await response.text();
  if (!responseBody) return null as T;
  return JSON.parse(responseBody) as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Đã xảy ra lỗi không xác định.';
}
