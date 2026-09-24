import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { theme } from '../theme';
import { ProjectsPage } from './ProjectsPage';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  changeStatus: vi.fn(),
  remove: vi.fn(),
  members: vi.fn(),
  setMember: vi.fn(),
  removeMember: vi.fn(),
}));

vi.mock('../api/endpoints', () => ({
  projectsApi: api,
  membersApi: { list: vi.fn() },
}));

describe('ProjectsPage', () => {
  it('archives an active project through the lifecycle endpoint', async () => {
    const project = {
      id: '40000000-0000-0000-0000-000000000001',
      name: 'Alpha project',
      description: 'Delivery workspace',
      status: 'ACTIVE' as const,
      role: 'MANAGER' as const,
      boardId: '50000000-0000-0000-0000-000000000001',
      memberCount: 3,
      taskCount: 5,
      completedTaskCount: 2,
      updatedAt: '2026-09-01T00:00:00Z',
    };
    api.list.mockResolvedValue([project]);
    api.changeStatus.mockResolvedValue({ ...project, status: 'ARCHIVED' });
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <ProjectsPage />
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByText('Alpha project')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Lưu trữ Alpha project' }));

    await waitFor(() => expect(api.changeStatus).toHaveBeenCalledWith(project.id, 'ARCHIVED'));
    expect(await screen.findByText('Đã lưu trữ dự án.')).toBeVisible();
  });

  it('filters projects by text and lifecycle status', async () => {
    api.list.mockResolvedValue([
      {
        id: '40000000-0000-0000-0000-000000000001',
        name: 'Alpha project',
        description: 'Delivery workspace',
        status: 'ACTIVE',
        role: 'MANAGER',
        boardId: '50000000-0000-0000-0000-000000000001',
        memberCount: 3,
        taskCount: 5,
        completedTaskCount: 2,
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: '40000000-0000-0000-0000-000000000002',
        name: 'Beta archive',
        description: 'Previous quarter',
        status: 'ARCHIVED',
        role: 'VIEWER',
        boardId: null,
        memberCount: 2,
        taskCount: 8,
        completedTaskCount: 8,
        updatedAt: '2026-08-01T00:00:00Z',
      },
    ]);
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <ProjectsPage />
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByText('Alpha project')).toBeVisible();
    expect(screen.getByText('Beta archive')).toBeVisible();

    await user.type(screen.getByLabelText('Tìm dự án'), 'beta');
    await waitFor(() => expect(screen.queryByText('Alpha project')).not.toBeInTheDocument());
    expect(screen.getByText('Beta archive')).toBeVisible();

    await user.clear(screen.getByLabelText('Tìm dự án'));
    await user.click(screen.getByRole('combobox', { name: 'Trạng thái' }));
    await user.click(screen.getByRole('option', { name: 'Đã lưu trữ' }));
    await waitFor(() => expect(screen.queryByText('Alpha project')).not.toBeInTheDocument());
    expect(screen.getByText('Beta archive')).toBeVisible();
  });
});
