import { ThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { theme } from '../theme';
import { RegisterPage } from './RegisterPage';

const auth = vi.hoisted(() => ({ register: vi.fn() }));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    status: 'anonymous',
    session: null,
    tenants: [],
    register: auth.register,
  }),
}));

describe('RegisterPage', () => {
  it('registers a new account without persisting credentials or tokens', async () => {
    auth.register.mockResolvedValue(undefined);
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
    const user = userEvent.setup();
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    await user.type(screen.getByLabelText('Tên hiển thị'), 'Nhóm nghiên cứu');
    await user.type(screen.getByLabelText('Email'), 'new@example.test');
    await user.type(screen.getByLabelText('Mật khẩu'), 'SafePassword123!');
    await user.type(screen.getByLabelText('Xác nhận mật khẩu'), 'SafePassword123!');
    await user.click(screen.getByRole('button', { name: /đăng ký và tạo workspace/i }));

    expect(auth.register).toHaveBeenCalledWith({
      displayName: 'Nhóm nghiên cứu',
      email: 'new@example.test',
      password: 'SafePassword123!',
    });
    expect(localStorageSpy).not.toHaveBeenCalled();
  });
});
