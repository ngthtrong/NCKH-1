import type { ApiProblem } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

let accessToken: string | null = null;

export function setApiAccessToken(token: string | null): void {
  accessToken = token;
}

export class ApiError extends Error {
  readonly status: number;
  readonly problem?: ApiProblem;

  constructor(status: number, problem?: ApiProblem) {
    super(problem?.detail ?? problem?.message ?? problem?.title ?? `Yêu cầu thất bại (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
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

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
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

  if (!response.ok) {
    let problem: ApiProblem | undefined;
    if (response.headers.get('content-type')?.includes('json')) {
      problem = (await response.json()) as ApiProblem;
    }
    throw new ApiError(response.status, problem);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Đã xảy ra lỗi không xác định.';
}
