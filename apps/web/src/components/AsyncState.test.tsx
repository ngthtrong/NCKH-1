import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SkeletonBoardLoader } from './AsyncState';

describe('SkeletonBoardLoader', () => {
  it('renders 3 simulated kanban columns with pulse skeleton cards by default', () => {
    const { container } = render(<SkeletonBoardLoader />);

    const board = screen.getByRole('status', { name: 'Đang tải bảng công việc…' });
    expect(board).toBeInTheDocument();

    const columns = container.querySelectorAll('.kanban-column');
    expect(columns).toHaveLength(3);

    const taskCards = container.querySelectorAll('.task-card');
    expect(taskCards.length).toBeGreaterThanOrEqual(6);
  });

  it('supports custom number of columns', () => {
    const { container } = render(<SkeletonBoardLoader columns={4} ariaLabel="Loading board..." />);

    expect(screen.getByRole('status', { name: 'Loading board...' })).toBeInTheDocument();
    const columns = container.querySelectorAll('.kanban-column');
    expect(columns).toHaveLength(4);
  });
});
