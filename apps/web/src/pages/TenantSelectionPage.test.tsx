import { ThemeProvider } from '@mui/material';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TenantSummary } from '../api/types';
import { theme } from '../theme';
import { TenantSelectionPage } from './TenantSelectionPage';

const auth = vi.hoisted(() => ({ selectTenant: vi.fn(), tenants: [] as TenantSummary[] }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({
  ...auth, session: { user: { email: 'owner@example.test' } },
  reloadTenants: vi.fn(), logout: vi.fn(),
}) }));

function renderPage() {
  return render(<ThemeProvider theme={theme}><MemoryRouter><TenantSelectionPage /></MemoryRouter></ThemeProvider>);
}

describe('TenantSelectionPage configuration entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.tenants = [
      { id: 'acme', slug: 't-acme', name: 'Acme Software', tier: 'ENTERPRISE', role: 'ADMIN', status: 'ACTIVE', placement: 'POOL' },
      { id: 'lotus', slug: 't-lotus', name: 'Lotus Media', tier: 'PROFESSIONAL', role: 'MEMBER', status: 'ACTIVE', placement: 'POOL' },
    ];
  });

  it('authenticates the selected workspace before opening its configuration', async () => {
    const user = userEvent.setup();
    renderPage();
    const acme = screen.getByRole('heading', { name: 'Acme Software' }).closest('.tenant-card')! as HTMLElement;
    await user.click(within(acme).getByRole('button', { name: /cấu hình tenant/i }));
    expect(auth.selectTenant).toHaveBeenCalledWith(auth.tenants[0], 'customize');
  });

  it('keeps configuration unavailable to members and inactive tenants', () => {
    auth.tenants[0].status = 'SUSPENDED';
    renderPage();
    expect(screen.queryByRole('button', { name: /cấu hình tenant/i })).not.toBeInTheDocument();
  });

  it('still opens the workspace normally from the primary action', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getAllByRole('button', { name: 'Mở không gian' })[1]);
    expect(auth.selectTenant).toHaveBeenCalledWith(auth.tenants[1]);
  });
});
