import { describe, expect, it } from 'vitest';
import type { Board } from '../api/types';
import { moveBoardTask } from './boardState';

const board: Board = {
  id: 'board-1',
  projectId: 'project-1',
  name: 'Research board',
  version: 0,
  columns: [
    {
      id: 'todo',
      name: 'To do',
      position: 0,
      tasks: [
        {
          id: 'task-1',
          title: 'First',
          priority: 'MEDIUM',
          position: 0,
          version: 4,
          subtaskCount: 0,
          completedSubtaskCount: 0,
          commentCount: 0,
        },
        {
          id: 'task-2',
          title: 'Second',
          priority: 'LOW',
          position: 1,
          version: 1,
          subtaskCount: 0,
          completedSubtaskCount: 0,
          commentCount: 0,
        },
      ],
    },
    { id: 'doing', name: 'Doing', position: 1, taskLimit: 2, tasks: [] },
  ],
};

describe('moveBoardTask', () => {
  it('moves a task between columns and preserves the optimistic-lock version', () => {
    const result = moveBoardTask(board, 'task-1', 'doing');

    expect(result).not.toBeNull();
    expect(result?.targetColumnId).toBe('doing');
    expect(result?.targetPosition).toBe(0);
    expect(result?.version).toBe(4);
    expect(result?.board.columns[0].tasks.map((task) => task.id)).toEqual(['task-2']);
    expect(result?.board.columns[1].tasks.map((task) => task.id)).toEqual(['task-1']);
    expect(board.columns[0].tasks).toHaveLength(2);
  });

  it('reorders a task in the same column', () => {
    const result = moveBoardTask(board, 'task-1', 'task-2');

    expect(result?.board.columns[0].tasks.map((task) => task.id)).toEqual(['task-2', 'task-1']);
    expect(result?.targetPosition).toBe(1);
  });

  it('refuses a move into a column at its WIP limit', () => {
    const constrained: Board = {
      ...board,
      columns: [
        board.columns[0],
        { ...board.columns[1], taskLimit: 1, tasks: [board.columns[0].tasks[1]] },
      ],
    };
    expect(moveBoardTask(constrained, 'task-1', 'doing')).toBeNull();
  });
});
