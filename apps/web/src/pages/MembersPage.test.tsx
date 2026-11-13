import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InvitationView } from '../api/types';
import { theme } from '../theme';
import { MembersPage } from './MembersPage';

const membersMock = vi.hoisted(() => ({
  list: vi.fn(),
  invitations: vi.fn(),
  invite: vi.fn(),
  revokeInvitation: vi.fn(),
  changeRole: vi.fn(),
  revoke: vi.fn(),
  transferOwnership: vi.fn(),
}));

vi.mock('../api/endpoints', () => ({
  membersApi: membersMock,
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    session: {
      activeTenant: {
        id: 'tenant-1',
        name: 'Workspace Alpha',
        role: 'OWNER',
      },
      user: { id: 'u1', email: 'owner@example.com', displayName: 'Owner' },
    },
    logout: vi.fn(),
  }),
}));

describe('MembersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  const pendingInvite: InvitationView = {
    id: 'inv-123',
    tenantId: 'tenant-1',
    tenantSlug: 'alpha',
    tenantName: 'Workspace Alpha',
    email: 'collab@university.edu.vn',
    role: 'MEMBER',
    status: 'PENDING',
    expiresAt: '2026-12-31T23:59:59Z',
  };

  function renderPage() {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const utils = render(
      <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <MembersPage />
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>,
    );
    return { user, writeTextSpy, ...utils };
  }

  it('copies invite link from invitations table and displays snackbar toast', async () => {
    membersMock.list.mockResolvedValue([]);
    membersMock.invitations.mockResolvedValue([pendingInvite]);

    const { user, writeTextSpy } = renderPage();

    const invitationsTab = await screen.findByRole('tab', { name: /Lời mời/i });
    await user.click(invitationsTab);

    expect(await screen.findByText('collab@university.edu.vn')).toBeInTheDocument();

    const copyBtn = screen.getByRole('button', { name: 'Sao chép liên kết mời cho collab@university.edu.vn' });
    expect(copyBtn).toBeInTheDocument();

    await user.click(copyBtn);

    expect(writeTextSpy).toHaveBeenCalledWith(
      expect.stringContaining('/invitations/inv-123'),
    );

    const toastElements = await screen.findAllByText('Đã sao chép liên kết mời vào bộ nhớ tạm!');
    expect(toastElements.length).toBeGreaterThanOrEqual(1);
  });
});
