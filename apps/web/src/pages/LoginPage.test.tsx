import { ThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { theme } from '../theme';
import { LoginPage } from './LoginPage';

const auth = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    status: 'anonymous',
    session: null,
    tenants: [],
    login: auth.login,
  }),
}));

describe('LoginPage', () => {
  it('submits credentials without persisting an access token in browser storage', async () => {
    auth.login.mockResolvedValue([]);
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
    const user = userEvent.setup();
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    await user.type(screen.getByLabelText('Email'), 'researcher@example.com');
    await user.type(screen.getByLabelText('Mật khẩu'), 'safe-password');
    await user.click(screen.getByRole('button', { name: /đăng nhập/i }));

    expect(auth.login).toHaveBeenCalledWith({
      email: 'researcher@example.com',
      password: 'safe-password',
    });
    expect(localStorageSpy).not.toHaveBeenCalled();
  });
});
