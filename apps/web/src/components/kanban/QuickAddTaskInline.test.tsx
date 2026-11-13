import { ThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { theme } from '../../theme';
import { QuickAddTaskInline } from './QuickAddTaskInline';

describe('QuickAddTaskInline', () => {
  it('renders button initially and opens input when clicked', async () => {
    const user = userEvent.setup();
    const onAddTask = vi.fn();

    render(
      <ThemeProvider theme={theme}>
        <QuickAddTaskInline columnId="col-1" onAddTask={onAddTask} />
      </ThemeProvider>,
    );

    const button = screen.getByRole('button', { name: /\+ Thêm thẻ\.\.\./i });
    expect(button).toBeInTheDocument();

    await user.click(button);

    expect(screen.getByPlaceholderText('Nhập tiêu đề thẻ...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm thẻ' })).toBeInTheDocument();
  });

  it('submits task on Enter and calls onAddTask', async () => {
    const user = userEvent.setup();
    const onAddTask = vi.fn().mockResolvedValue(undefined);

    render(
      <ThemeProvider theme={theme}>
        <QuickAddTaskInline columnId="col-1" onAddTask={onAddTask} />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: /\+ Thêm thẻ\.\.\./i }));
    const input = screen.getByPlaceholderText('Nhập tiêu đề thẻ...');
    await user.type(input, 'Viết tài liệu NCKH{enter}');

    expect(onAddTask).toHaveBeenCalledWith('col-1', 'Viết tài liệu NCKH');
  });

  it('submits task when clicking "Thêm thẻ" button', async () => {
    const user = userEvent.setup();
    const onAddTask = vi.fn().mockResolvedValue(undefined);

    render(
      <ThemeProvider theme={theme}>
        <QuickAddTaskInline columnId="col-1" onAddTask={onAddTask} />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: /\+ Thêm thẻ\.\.\./i }));
    const input = screen.getByPlaceholderText('Nhập tiêu đề thẻ...');
    await user.type(input, 'Thử nghiệm hệ thống');
    await user.click(screen.getByRole('button', { name: 'Thêm thẻ' }));

    expect(onAddTask).toHaveBeenCalledWith('col-1', 'Thử nghiệm hệ thống');
  });

  it('cancels input on Escape key', async () => {
    const user = userEvent.setup();
    const onAddTask = vi.fn();

    render(
      <ThemeProvider theme={theme}>
        <QuickAddTaskInline columnId="col-1" onAddTask={onAddTask} />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: /\+ Thêm thẻ\.\.\./i }));
    const input = screen.getByPlaceholderText('Nhập tiêu đề thẻ...');
    await user.type(input, 'Thẻ dang dở{Escape}');

    expect(screen.queryByPlaceholderText('Nhập tiêu đề thẻ...')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Thêm thẻ\.\.\./i })).toBeInTheDocument();
    expect(onAddTask).not.toHaveBeenCalled();
  });

  it('cancels input when clicking cancel icon button', async () => {
    const user = userEvent.setup();
    const onAddTask = vi.fn();

    render(
      <ThemeProvider theme={theme}>
        <QuickAddTaskInline columnId="col-1" onAddTask={onAddTask} />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: /\+ Thêm thẻ\.\.\./i }));
    await user.click(screen.getByRole('button', { name: /hủy tạo thẻ/i }));

    expect(screen.queryByPlaceholderText('Nhập tiêu đề thẻ...')).not.toBeInTheDocument();
    expect(onAddTask).not.toHaveBeenCalled();
  });

  it('respects disabled prop', () => {
    const onAddTask = vi.fn();

    render(
      <ThemeProvider theme={theme}>
        <QuickAddTaskInline columnId="col-1" onAddTask={onAddTask} disabled={true} />
      </ThemeProvider>,
    );

    const button = screen.getByRole('button', { name: /\+ Thêm thẻ\.\.\./i });
    expect(button).toBeDisabled();
  });
});
