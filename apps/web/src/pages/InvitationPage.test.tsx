import { ThemeProvider } from '@mui/material';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { theme } from '../theme';
import { InvitationPage } from './InvitationPage';

const api = vi.hoisted(() => ({ preview: vi.fn(), accept: vi.fn(), reject: vi.fn() }));
const auth = vi.hoisted(() => ({ reloadTenants: vi.fn() }));

vi.mock('../api/endpoints', () => ({ invitationsApi: api }));
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    status: 'authenticated',
    session: {
      accessToken: 'memory-only',
      user: {
        id: '30000000-0000-0000-0000-000000000002',
        email: 'invited@example.test',
        displayName: 'Invited User',
      },
    },
    reloadTenants: auth.reloadTenants,
  }),
}));

describe('InvitationPage', () => {
  it('accepts a pending invitation for the matching signed-in account', async () => {
    const pending = {
      id: '20000000-0000-0000-0000-000000000001',
      tenantId: '10000000-0000-0000-0000-000000000001',
      tenantSlug: 'alpha',
      tenantName: 'Alpha workspace',
      email: 'invited@example.test',
      role: 'MEMBER' as const,
      status: 'PENDING' as const,
      expiresAt: '2026-09-08T00:00:00Z',
      respondedAt: null,
    };
    api.preview.mockResolvedValue(pending);
    api.accept.mockResolvedValue({ ...pending, status: 'ACCEPTED' });
    auth.reloadTenants.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/invitations/local-token']}>
          <Routes>
            <Route path="/invitations/:token" element={<InvitationPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Tham gia Alpha workspace' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Chấp nhận lời mời' }));

    expect(api.accept).toHaveBeenCalledWith('local-token');
    await waitFor(() => expect(auth.reloadTenants).toHaveBeenCalled());
    expect(await screen.findByText(/membership đã sẵn sàng/i)).toBeVisible();
  });
});
