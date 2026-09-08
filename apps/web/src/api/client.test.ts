import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request, setApiAccessToken } from './client';
import { approvalsApi, projectsApi } from './endpoints';

describe('typed API client', () => {
  beforeEach(() => {
    setApiAccessToken('access-token-in-memory');
  });

  it('sends the bearer token and a tenant-free business payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'project-1',
          name: 'Research',
          role: 'MANAGER',
          memberCount: 1,
          taskCount: 0,
          completedTaskCount: 0,
          updatedAt: '2026-01-01T00:00:00Z',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await projectsApi.create({ name: 'Research', description: 'Tenant-aware project' });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/projects');
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer access-token-in-memory');
    expect(JSON.parse(String(options.body))).toEqual({
      name: 'Research',
      description: 'Tenant-aware project',
    });
    expect(String(options.body)).not.toContain('tenantId');
    expect(options.credentials).toBe('include');
  });

  it('treats an empty successful response as a nullable result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

    await expect(approvalsApi.workflow('board-1')).resolves.toBeNull();
    await expect(request<void>('/health', { method: 'POST' })).resolves.toBeNull();
  });
});
