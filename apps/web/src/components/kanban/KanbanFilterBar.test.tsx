import { ThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { theme } from '../../theme';
import { KanbanFilterBar, type KanbanFilterState } from './KanbanFilterBar';

describe('KanbanFilterBar', () => {
  const assignees = [
    { userId: 'user-1', name: 'Nguyễn Văn A' },
    { userId: 'user-2', name: 'Trần Thị B' },
  ];

  it('renders search input and select fields', () => {
    const filters: KanbanFilterState = {
      search: '',
      priority: 'ALL',
      assigneeId: 'ALL',
    };
    const onFilterChange = vi.fn();

    render(
      <ThemeProvider theme={theme}>
        <KanbanFilterBar filters={filters} onFilterChange={onFilterChange} assignees={assignees} />
      </ThemeProvider>,
    );

    expect(screen.getByPlaceholderText('Tìm kiếm thẻ công việc...')).toBeInTheDocument();
    expect(screen.getByLabelText('Mức ưu tiên')).toBeInTheDocument();
    expect(screen.getByLabelText('Người thực hiện')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /đặt lại bộ lọc/i })).not.toBeInTheDocument();
  });

  it('calls onFilterChange when typing in search input', async () => {
    const user = userEvent.setup();
    const filters: KanbanFilterState = {
      search: '',
      priority: 'ALL',
      assigneeId: 'ALL',
    };
    const onFilterChange = vi.fn();

    render(
      <ThemeProvider theme={theme}>
        <KanbanFilterBar filters={filters} onFilterChange={onFilterChange} assignees={assignees} />
      </ThemeProvider>,
    );

    const input = screen.getByPlaceholderText('Tìm kiếm thẻ công việc...');
    await user.type(input, 'A');

    expect(onFilterChange).toHaveBeenCalledWith({
      search: 'A',
      priority: 'ALL',
      assigneeId: 'ALL',
    });
  });

  it('shows and handles reset button when filters are active', async () => {
    const user = userEvent.setup();
    const filters: KanbanFilterState = {
      search: 'Báo cáo',
      priority: 'HIGH',
      assigneeId: 'user-1',
    };
    const onFilterChange = vi.fn();

    render(
      <ThemeProvider theme={theme}>
        <KanbanFilterBar filters={filters} onFilterChange={onFilterChange} assignees={assignees} />
      </ThemeProvider>,
    );

    const resetButton = screen.getByRole('button', { name: /đặt lại bộ lọc/i });
    expect(resetButton).toBeInTheDocument();

    await user.click(resetButton);

    expect(onFilterChange).toHaveBeenCalledWith({
      search: '',
      priority: 'ALL',
      assigneeId: 'ALL',
    });
  });

  it('clears search when clicking clear icon', async () => {
    const user = userEvent.setup();
    const filters: KanbanFilterState = {
      search: 'Kiểm tra',
      priority: 'ALL',
      assigneeId: 'ALL',
    };
    const onFilterChange = vi.fn();

    render(
      <ThemeProvider theme={theme}>
        <KanbanFilterBar filters={filters} onFilterChange={onFilterChange} assignees={assignees} />
      </ThemeProvider>,
    );

    const clearButton = screen.getByRole('button', { name: /xóa từ khóa tìm kiếm/i });
    expect(clearButton).toBeInTheDocument();

    await user.click(clearButton);

    expect(onFilterChange).toHaveBeenCalledWith({
      search: '',
      priority: 'ALL',
      assigneeId: 'ALL',
    });
  });
});
