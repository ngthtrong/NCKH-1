import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TenantSummary } from '../api/types';
import { theme } from '../theme';
import { AppShell } from './AppShell';

const mockSelectTenant = vi.fn();
const mockLogout = vi.fn();
const settingsApi = vi.hoisted(() => ({ get: vi.fn(), updateBranding: vi.fn() }));
const kanbanApi = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn() }));

const tenantA: TenantSummary = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Workspace Alpha',
  slug: 'ws-alpha',
  tier: 'PROFESSIONAL',
  role: 'ADMIN',
  status: 'ACTIVE',
  placement: 'POOL',
};

const tenantB: TenantSummary = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Workspace Beta',
  slug: 'ws-beta',
  tier: 'ENTERPRISE',
  role: 'MEMBER',
  status: 'ACTIVE',
  placement: 'POOL',
};

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    status: 'authenticated',
    session: {
      accessToken: 'token',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'John Doe',
        platformRoles: [],
      },
      activeTenant: tenantA,
    },
    currentTenant: tenantA,
    tenants: [tenantA, tenantB],
    selectTenant: mockSelectTenant,
    logout: mockLogout,
    login: vi.fn(),
    register: vi.fn(),
    exchangeTenantCode: vi.fn(),
    reloadTenants: vi.fn(),
  }),
}));

vi.mock('../api/endpoints', () => ({
  notificationsApi: { list: vi.fn().mockResolvedValue([]) },
  tenantSettingsApi: settingsApi,
}));
vi.mock('../api/kanbanSettings', () => ({ kanbanSettingsApi: kanbanApi }));

describe('AppShell Tenant Switcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantA.role = 'ADMIN';
    settingsApi.get.mockResolvedValue({
      capabilities: [{ capability: 'BRANDING', supported: true, granted: true, enabled: true, version: 0 }],
      branding: { primaryColor: '#246BFD', accentColor: '#0F9F8F', version: 2 },
    });
    kanbanApi.get.mockResolvedValue({ version: 3, settings: {
      wipMode: 'STRICT', wipLimit: 3, cardStyle: 'FULL',
      defaultColumns: ['Todo', 'Doing', 'Done'],
      fields: [{ key: 'story_points', label: 'Story points', type: 'NUMBER', required: false }],
    } });
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  function renderShell() {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const utils = render(
      <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route path="/" element={<AppShell />}>
                <Route path="dashboard" element={<div>Dashboard content</div>} />
                <Route path="onboarding" element={<div>Onboarding Page</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>,
    );

    return { user, ...utils };
  }

  it('displays current tenant name and tier in tenant switcher', () => {
    renderShell();

    expect(screen.getByText('Workspace Alpha')).toBeInTheDocument();
    expect(screen.getByText('Chuyên nghiệp')).toBeInTheDocument();
  });

  it('opens in-place dropdown menu on click, displaying all tenants and create option', async () => {
    const { user } = renderShell();

    const switcher = screen.getByRole('button', { name: 'Đổi không gian làm việc' });
    await user.click(switcher);

    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Workspace Beta')).toBeInTheDocument();
    expect(screen.getByText('Doanh nghiệp')).toBeInTheDocument();
    expect(screen.getByText('+ Tạo không gian làm việc mới')).toBeInTheDocument();
  });

  it('calls selectTenant when choosing another tenant from the menu', async () => {
    const { user } = renderShell();

    const switcher = screen.getByRole('button', { name: 'Đổi không gian làm việc' });
    await user.click(switcher);

    const betaOption = await screen.findByText('Workspace Beta');
    await user.click(betaOption);

    await waitFor(() => {
      expect(mockSelectTenant).toHaveBeenCalledWith(tenantB);
    });
  });

  it('navigates to onboarding when clicking create workspace option', async () => {
    const { user } = renderShell();

    const switcher = screen.getByRole('button', { name: 'Đổi không gian làm việc' });
    await user.click(switcher);

    const createOption = await screen.findByText('+ Tạo không gian làm việc mới');
    await user.click(createOption);

    expect(await screen.findByText('Onboarding Page')).toBeInTheDocument();
  });

  it('opens tenant configuration without leaving the current workspace page', async () => {
    const { user } = renderShell();
    await user.click(screen.getByRole('button', { name: 'Cấu hình tenant' }));
    expect(await screen.findByRole('dialog', { name: 'Cấu hình tenant' })).toBeVisible();
    expect(await screen.findByLabelText(/Mã trường/)).toHaveValue('story_points');
    expect(screen.getByLabelText('Màu chính')).toHaveValue('#246bfd');
    await user.click(screen.getByRole('button', { name: 'Đóng cấu hình tenant' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Dashboard content')).toBeVisible();
  });

  it('does not offer tenant configuration to a member', () => {
    tenantA.role = 'MEMBER';
    renderShell();
    expect(screen.queryByRole('button', { name: 'Cấu hình tenant' })).not.toBeInTheDocument();
  });

  it('saves the edited WIP mode and dynamic fields with the current configuration version', async () => {
    kanbanApi.save.mockResolvedValue({});
    const { user } = renderShell();
    await user.click(screen.getByRole('button', { name: 'Cấu hình tenant' }));
    await user.click(await screen.findByRole('combobox', { name: 'Khi vượt giới hạn công việc' }));
    await user.click(screen.getByRole('option', { name: 'Cho phép và cảnh báo (WARN)' }));
    await user.click(screen.getByRole('button', { name: 'Thêm trường' }));
    await user.type(screen.getAllByLabelText('Tên trường', { exact: false })[1], 'Budget');
    await user.type(screen.getAllByLabelText('Mã trường', { exact: false })[1], 'budget_usd');
    await user.click(screen.getByRole('button', { name: 'Lưu quy trình và trường mở rộng' }));
    await waitFor(() => expect(kanbanApi.save).toHaveBeenCalledWith({ version: 3, settings: {
      wipMode: 'WARN', wipLimit: 3, cardStyle: 'FULL', defaultColumns: ['Todo', 'Doing', 'Done'],
      fields: [
        { key: 'story_points', label: 'Story points', type: 'NUMBER', required: false },
        { key: 'budget_usd', label: 'Budget', type: 'STRING', required: false },
      ],
    } }));
    expect(await screen.findByText('Đã lưu cấu hình workspace.')).toBeVisible();
  });
});
