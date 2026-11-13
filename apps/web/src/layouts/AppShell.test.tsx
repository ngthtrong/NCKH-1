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
  tenantSettingsApi: { get: vi.fn().mockResolvedValue(null) },
}));

describe('AppShell Tenant Switcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
