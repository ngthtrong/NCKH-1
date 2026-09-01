import { ThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
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
});
