import { arrayMove } from '@dnd-kit/sortable';
import type { Board, UUID } from '../api/types';

export interface MoveResult {
  board: Board;
  taskId: UUID;
  targetColumnId: UUID;
  targetPosition: number;
  version: number;
}

export function moveBoardTask(board: Board, taskId: UUID, overId: UUID): MoveResult | null {
  const sourceColumn = board.columns.find((column) =>
    column.tasks.some((task) => task.id === taskId),
  );
  if (!sourceColumn) return null;
  const task = sourceColumn.tasks.find((item) => item.id === taskId);
  if (!task) return null;

  const overColumn = board.columns.find((column) => column.id === overId);
  const targetColumn =
    overColumn ?? board.columns.find((column) => column.tasks.some((item) => item.id === overId));
  if (!targetColumn) return null;

  const sourceIndex = sourceColumn.tasks.findIndex((item) => item.id === taskId);
  let targetIndex = overColumn
    ? targetColumn.tasks.length
    : targetColumn.tasks.findIndex((item) => item.id === overId);

  if (sourceColumn.id === targetColumn.id) {
    if (targetIndex < 0) targetIndex = sourceIndex;
    const reordered = arrayMove(sourceColumn.tasks, sourceIndex, targetIndex).map((item, index) => ({
      ...item,
      position: index,
    }));
    return {
      board: {
        ...board,
        columns: board.columns.map((column) =>
          column.id === sourceColumn.id ? { ...column, tasks: reordered } : column,
        ),
      },
      taskId,
      targetColumnId: targetColumn.id,
      targetPosition: targetIndex,
      version: task.version,
    };
  }

  if (targetColumn.taskLimit && targetColumn.tasks.length >= targetColumn.taskLimit) return null;
  if (targetIndex < 0) targetIndex = targetColumn.tasks.length;
  const sourceTasks = sourceColumn.tasks
    .filter((item) => item.id !== taskId)
    .map((item, index) => ({ ...item, position: index }));
  const targetTasks = [...targetColumn.tasks];
  targetTasks.splice(targetIndex, 0, task);

  return {
    board: {
      ...board,
      columns: board.columns.map((column) => {
        if (column.id === sourceColumn.id) return { ...column, tasks: sourceTasks };
        if (column.id === targetColumn.id) {
          return {
            ...column,
            tasks: targetTasks.map((item, index) => ({ ...item, position: index })),
          };
        }
        return column;
      }),
    },
    taskId,
    targetColumnId: targetColumn.id,
    targetPosition: targetIndex,
    version: task.version,
  };
}
