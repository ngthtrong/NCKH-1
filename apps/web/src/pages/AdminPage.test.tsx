import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '../theme';
import { AdminPage } from './AdminPage';

const api = vi.hoisted(() => ({
  tenants: vi.fn(),
  tenant: vi.fn(),
  retryProvisioning: vi.fn(),
  resourceDeadLetters: vi.fn(),
  requeueResourceDeadLetter: vi.fn(),
}));
const auth = vi.hoisted(() => ({ logout: vi.fn() }));

vi.mock('../api/endpoints', () => ({ adminApi: api }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => auth }));

const tenant = {
  id: '10000000-0000-0000-0000-000000000001',
  name: 'Alpha workspace',
  slug: 'alpha',
  tier: 'STARTER' as const,
  placement: 'POOL' as const,
  status: 'ACTIVE' as const,
  provisioningStatus: 'SUCCEEDED' as const,
  memberCount: 3,
  createdAt: '2026-09-01T00:00:00Z',
  paymentStatus: 'SUCCEEDED' as const,
  paymentProvider: 'fake-local',
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.tenants.mockResolvedValue({ items: [tenant], page: 0, size: 20, totalItems: 1, totalPages: 1 });
    api.tenant.mockResolvedValue({
      tenant,
      payment: {
        id: '20000000-0000-0000-0000-000000000001',
        provider: 'fake-local',
        status: 'SUCCEEDED',
        amountMinor: 99000,
        currency: 'VND',
        createdAt: '2026-09-01T00:01:00Z',
      },
      provisioning: {
        id: '30000000-0000-0000-0000-000000000001',
        status: 'SUCCEEDED',
        attempts: 1,
        createdAt: '2026-09-01T00:02:00Z',
      },
      events: [{
        id: '40000000-0000-0000-0000-000000000001',
        fromStatus: 'RUNNING',
        toStatus: 'SUCCEEDED',
        attempt: 1,
        message: 'Local provisioning completed',
        createdAt: '2026-09-01T00:03:00Z',
      }],
    });
  });

  it('shows payment and provisioning transition detail for a tenant', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Alpha workspace')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Chi tiết' }));

    await waitFor(() => expect(api.tenant).toHaveBeenCalledWith(tenant.id));
    expect(await screen.findByText('Lịch sử chuyển trạng thái')).toBeVisible();
    expect(screen.getByText('Local provisioning completed')).toBeVisible();
  });

  it('sends status and placement filters to the control-plane query', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Alpha workspace');

    await user.click(screen.getByLabelText('Trạng thái'));
    await user.click(screen.getByRole('option', { name: 'Đang hoạt động' }));
    await user.click(screen.getByLabelText('Placement'));
    await user.click(screen.getByRole('option', { name: 'Pool' }));

    await waitFor(() => expect(api.tenants).toHaveBeenCalledWith(0, '', 'ACTIVE', 'POOL'));
  });
});
