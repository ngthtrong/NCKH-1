import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request, setApiAccessToken, setApiSessionRefreshHandler } from './client';
import { approvalsApi, boardsApi, projectsApi } from './endpoints';

describe('typed API client', () => {
  beforeEach(() => {
    setApiAccessToken('access-token-in-memory');
    setApiSessionRefreshHandler(null);
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

  it('refreshes an expired session once and retries the original request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'project-1' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const refresh = vi.fn(async () => {
      setApiAccessToken('refreshed-token');
      return 'refreshed-token';
    });
    setApiSessionRefreshHandler(refresh);

    await expect(request<{ id: string }>('/projects/project-1')).resolves.toEqual({ id: 'project-1' });

    expect(refresh).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get('Authorization')).toBe(
      'Bearer refreshed-token',
    );
  });

  it('shares one refresh across concurrent unauthorized requests', async () => {
    let resolveRefresh!: (token: string) => void;
    const refreshPromise = new Promise<string>((resolve) => {
      resolveRefresh = resolve;
    });
    const refresh = vi.fn(() => refreshPromise.then((token) => {
      setApiAccessToken(token);
      return token;
    }));
    setApiSessionRefreshHandler(refresh);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockImplementation(async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const first = request<{ ok: boolean }>('/first');
    const second = request<{ ok: boolean }>('/second');
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    resolveRefresh('shared-token');

    await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }]);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('maps persisted task priority and related counts from the board response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        id: 'board-1',
        projectId: 'project-1',
        name: 'Delivery',
        version: 1,
        columns: [{ id: 'column-1', name: 'Doing', position: 1000, completed: false }],
        tasks: [{
          id: 'task-1',
          projectId: 'project-1',
          boardId: 'board-1',
          columnId: 'column-1',
          title: 'Important task',
          priority: 'URGENT',
          position: 1000,
          version: 0,
          subtaskCount: 3,
          completedSubtaskCount: 2,
          commentCount: 4,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        }],
      }), { status: 200, headers: { 'content-type': 'application/json' } }),
    ));

    const board = await boardsApi.get('board-1');

    expect(board.columns[0].tasks[0]).toMatchObject({
      priority: 'URGENT',
      subtaskCount: 3,
      completedSubtaskCount: 2,
      commentCount: 4,
    });
  });
});
