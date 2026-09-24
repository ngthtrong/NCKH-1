import { ThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '../theme';
import { OnboardingPage } from './OnboardingPage';

const api = vi.hoisted(() => ({
  create: vi.fn(),
  onboarding: vi.fn(),
  createSession: vi.fn(),
  completeFake: vi.fn(),
}));
const auth = vi.hoisted(() => ({ reloadTenants: vi.fn(), selectTenant: vi.fn() }));

vi.mock('../api/endpoints', () => ({
  tenantsApi: { create: api.create, onboarding: api.onboarding },
  paymentsApi: { createSession: api.createSession, completeFake: api.completeFake },
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => auth,
}));

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates the first workspace with the selected local defaults', async () => {
    const tenant = {
      id: '10000000-0000-0000-0000-000000000001',
      name: 'Nhóm SaaS',
      slug: 'nhom-saas',
      tier: 'STARTER',
      placement: 'POOL',
      role: 'OWNER',
      status: 'PENDING_PAYMENT',
    };
    api.create.mockResolvedValue(tenant);
    api.onboarding.mockResolvedValue({
      tenant,
      payment: null,
      provisioning: null,
    });
    auth.reloadTenants.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/onboarding']}>
          <OnboardingPage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    await user.type(screen.getByLabelText('Tên workspace'), 'Nhóm SaaS');
    expect(screen.getByLabelText('Slug subdomain')).toHaveValue('nhom-saas');
    await user.click(screen.getByRole('button', { name: 'Tạo workspace' }));

    expect(api.create).toHaveBeenCalledWith({
      name: 'Nhóm SaaS',
      slug: 'nhom-saas',
      tier: 'STARTER',
      placement: 'POOL',
    });
  });

  it('explains placement trade-offs without claiming an optimal model', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/onboarding']}>
          <OnboardingPage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: /Tùy chọn nâng cao/i }));

    expect(screen.getByText('So sánh ba mô hình')).toBeVisible();
    expect(screen.getByText(/Chung CSDL và bảng; tách tenant bằng tenant_id và RLS/)).toBeVisible();
    expect(screen.getByText(/mỗi tenant có schema và role riêng/)).toBeVisible();
    expect(screen.getByText(/Mỗi tenant có CSDL và role riêng/)).toBeVisible();
    expect(screen.getByText(/không phải kết luận mô hình tối ưu/)).toBeVisible();
  });

  it('lets the owner create a new payment attempt after a failed session', async () => {
    const tenant = {
      id: '10000000-0000-0000-0000-000000000001',
      name: 'Nhóm SaaS',
      slug: 'nhom-saas',
      tier: 'STARTER',
      placement: 'POOL',
      role: 'OWNER',
      status: 'PENDING_PAYMENT',
    } as const;
    api.onboarding.mockResolvedValue({
      tenant,
      payment: {
        id: '20000000-0000-0000-0000-000000000001',
        provider: 'fake',
        status: 'FAILED',
        amountMinor: 100_000,
        currency: 'VND',
      },
      provisioning: null,
    });
    api.createSession.mockResolvedValue({});
    auth.reloadTenants.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[`/onboarding?tenant=${tenant.id}`]}>
          <OnboardingPage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    await user.click(await screen.findByRole('button', { name: 'Tạo lần thanh toán mới' }));

    expect(api.createSession).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ amountMinor: 100_000, currency: 'VND' }),
      expect.stringMatching(new RegExp(`^onboarding-${tenant.id}-`)),
    );
  });
});
