import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Add,
  ArrowBack,
  ArrowForward,
  CalendarTodayOutlined,
  ChatBubbleOutline,
  DeleteOutline,
  DragIndicator,
  EditOutlined,
  TaskAlt,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { boardsApi, projectsApi } from '../api/endpoints';
import type { Board, BoardColumn, TaskCard, TaskPriority, UUID } from '../api/types';
import { EmptyState, ErrorState, SectionLoader } from '../components/AsyncState';
import { PageHeader } from '../components/PageHeader';
import { moveBoardTask } from './boardState';

const priorityLabel: Record<TaskPriority, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Vừa',
  HIGH: 'Cao',
  URGENT: 'Khẩn cấp',
};

function shortDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(
    new Date(value),
  );
}

function TaskCardView({ task, overlay = false }: { task: TaskCard; overlay?: boolean }) {
  return (
    <Paper className={`task-card ${overlay ? 'task-card--overlay' : ''}`} variant="outlined">
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
        <Chip
          size="small"
          label={priorityLabel[task.priority]}
          className={`priority priority--${task.priority.toLowerCase()}`}
        />
        {!overlay && <DragIndicator className="task-card__handle-icon" fontSize="small" />}
      </Stack>
      <Typography fontWeight={700} mt={1.25} className="task-card__title">
        {task.title}
      </Typography>
      {task.description && (
        <Typography variant="body2" color="text.secondary" mt={0.5} className="line-clamp-2">
          {task.description}
        </Typography>
      )}
      <Stack direction="row" alignItems="center" gap={1.5} mt={1.5} color="text.secondary">
        {task.dueDate && (
          <Box className="task-meta">
            <CalendarTodayOutlined /> {shortDate(task.dueDate)}
          </Box>
        )}
        {task.subtaskCount > 0 && (
          <Box className="task-meta">
            <TaskAlt /> {task.completedSubtaskCount}/{task.subtaskCount}
          </Box>
        )}
        {task.commentCount > 0 && (
          <Box className="task-meta">
            <ChatBubbleOutline /> {task.commentCount}
          </Box>
        )}
        <Box flex={1} />
        {task.assignee && (
          <Avatar src={task.assignee.avatarUrl} sx={{ width: 25, height: 25 }}>
            {task.assignee.displayName[0]}
          </Avatar>
        )}
      </Stack>
    </Paper>
  );
}

function SortableTaskCard({ task, disabled }: { task: TaskCard; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled,
  });
  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      {...attributes}
      {...listeners}
    >
      <TaskCardView task={task} />
    </Box>
  );
}

function KanbanColumn({
  column,
  disabled,
  canManageColumns,
  columnIndex,
  columnCount,
  onAdd,
  onRename,
  onDelete,
  onMove,
}: {
  column: BoardColumn;
  disabled: boolean;
  canManageColumns: boolean;
  columnIndex: number;
  columnCount: number;
  onAdd: (columnId: UUID) => void;
  onRename: (column: BoardColumn) => void;
  onDelete: (column: BoardColumn) => void;
  onMove: (columnId: UUID, direction: -1 | 1) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, disabled });
  const atLimit = Boolean(column.taskLimit && column.tasks.length >= column.taskLimit);
  return (
    <Box className={`kanban-column ${isOver ? 'kanban-column--over' : ''}`} ref={setNodeRef}>
      <Stack direction="row" alignItems="center" gap={1} className="kanban-column__header">
        <span className="kanban-column__dot" />
        <Typography fontWeight={750}>{column.name}</Typography>
        <Chip label={column.tasks.length} size="small" />
        <Box flex={1} />
        {column.taskLimit && (
          <Typography variant="caption" color={atLimit ? 'error' : 'text.secondary'}>
            WIP {column.tasks.length}/{column.taskLimit}
          </Typography>
        )}
        {canManageColumns && (
          <Stack direction="row" className="kanban-column__actions">
            <IconButton
              size="small"
              aria-label={`Chuyển cột ${column.name} sang trái`}
              disabled={disabled || columnIndex === 0}
              onClick={() => onMove(column.id, -1)}
            >
              <ArrowBack fontSize="inherit" />
            </IconButton>
            <IconButton
              size="small"
              aria-label={`Chuyển cột ${column.name} sang phải`}
              disabled={disabled || columnIndex === columnCount - 1}
              onClick={() => onMove(column.id, 1)}
            >
              <ArrowForward fontSize="inherit" />
            </IconButton>
            <IconButton
              size="small"
              aria-label={`Đổi tên cột ${column.name}`}
              disabled={disabled}
              onClick={() => onRename(column)}
            >
              <EditOutlined fontSize="inherit" />
            </IconButton>
            <IconButton
              size="small"
              aria-label={`Xóa cột ${column.name}`}
              disabled={disabled || columnCount === 1 || column.tasks.length > 0}
              onClick={() => onDelete(column)}
            >
              <DeleteOutline fontSize="inherit" />
            </IconButton>
          </Stack>
        )}
      </Stack>
      <SortableContext items={column.tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <Stack spacing={1.25} className="kanban-column__tasks">
          {column.tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} disabled={disabled} />
          ))}
          {column.tasks.length === 0 && (
            <Box className="kanban-column__empty">Thả công việc vào đây</Box>
          )}
        </Stack>
      </SortableContext>
      <Button
        fullWidth
        startIcon={<Add />}
        color="inherit"
        disabled={disabled || atLimit}
        onClick={() => onAdd(column.id)}
      >
        Thêm công việc
      </Button>
    </Box>
  );
}

export function KanbanPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [board, setBoard] = useState<Board | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<UUID | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [taskDialogColumn, setTaskDialogColumn] = useState<UUID | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [columnDialog, setColumnDialog] = useState<
    { mode: 'create' } | { mode: 'rename'; column: BoardColumn } | null
  >(null);
  const [columnName, setColumnName] = useState('');
  const [deleteColumnTarget, setDeleteColumnTarget] = useState<BoardColumn | null>(null);
  const projects = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list });
  const boardQuery = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardsApi.get(boardId!),
    enabled: Boolean(boardId),
  });
  useEffect(() => {
    if (boardQuery.data) setBoard(boardQuery.data);
  }, [boardQuery.data]);

  const acceptBoard = (updatedBoard: Board) => {
    setBoard(updatedBoard);
    queryClient.setQueryData(['board', boardId], updatedBoard);
  };

  const handleColumnError = (cause: unknown) => {
    setSnackbar(
      (cause as { status?: number }).status === 409
        ? 'Bố cục cột đã thay đổi hoặc thao tác không hợp lệ. Bảng đang được tải lại.'
        : errorMessage(cause),
    );
    void queryClient.invalidateQueries({ queryKey: ['board', boardId] });
  };

  const moveTask = useMutation({
    mutationFn: ({ taskId, targetColumnId, targetPosition, version }: {
      taskId: UUID;
      targetColumnId: UUID;
      targetPosition: number;
      version: number;
    }) => boardsApi.moveTask(boardId!, taskId, { targetColumnId, targetPosition, version }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['board', boardId] }),
    onError: (cause) => {
      setSnackbar(
        (cause as { status?: number }).status === 409
          ? 'Công việc đã được người khác cập nhật. Bảng đang được tải lại.'
          : errorMessage(cause),
      );
      void queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
  const createTask = useMutation({
    mutationFn: () =>
      boardsApi.createTask(boardId!, taskDialogColumn!, {
        title: taskTitle.trim(),
        priority: taskPriority,
      }),
    onSuccess: (updatedBoard) => {
      setBoard(updatedBoard);
      queryClient.setQueryData(['board', boardId], updatedBoard);
      setTaskDialogColumn(null);
      setTaskTitle('');
      setTaskPriority('MEDIUM');
    },
    onError: (cause) => setSnackbar(errorMessage(cause)),
  });
  const createColumn = useMutation({
    mutationFn: ({ name, version }: { name: string; version: number }) =>
      boardsApi.createColumn(boardId!, { name, version }),
    onSuccess: (updatedBoard) => {
      acceptBoard(updatedBoard);
      setColumnDialog(null);
      setColumnName('');
    },
    onError: handleColumnError,
  });
  const renameColumn = useMutation({
    mutationFn: ({ columnId, name, version }: { columnId: UUID; name: string; version: number }) =>
      boardsApi.updateColumn(boardId!, columnId, { name, version }),
    onSuccess: (updatedBoard) => {
      acceptBoard(updatedBoard);
      setColumnDialog(null);
      setColumnName('');
    },
    onError: handleColumnError,
  });
  const reorderColumns = useMutation({
    mutationFn: ({ columnIds, version }: { columnIds: UUID[]; version: number }) =>
      boardsApi.reorderColumns(boardId!, { columnIds, version }),
    onSuccess: acceptBoard,
    onError: handleColumnError,
  });
  const deleteColumn = useMutation({
    mutationFn: ({ columnId, version }: { columnId: UUID; version: number }) =>
      boardsApi.deleteColumn(boardId!, columnId, version),
    onSuccess: (updatedBoard) => {
      acceptBoard(updatedBoard);
      setDeleteColumnTarget(null);
    },
    onError: handleColumnError,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const activeTask = useMemo(
    () => board?.columns.flatMap((column) => column.tasks).find((task) => task.id === activeTaskId),
    [activeTaskId, board],
  );

  const handleDragStart = ({ active }: DragStartEvent) => setActiveTaskId(String(active.id));
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTaskId(null);
    if (!board || !over || active.id === over.id || moveTask.isPending) return;
    const previous = board;
    const result = moveBoardTask(board, String(active.id), String(over.id));
    if (!result) {
      setSnackbar('Không thể chuyển công việc: cột đích đã đầy hoặc vị trí không hợp lệ.');
      return;
    }
    setBoard(result.board);
    moveTask.mutate(
      {
        taskId: result.taskId,
        targetColumnId: result.targetColumnId,
        targetPosition: result.targetPosition,
        version: result.version,
      },
      { onError: () => setBoard(previous) },
    );
  };

  const submitTask = (event: FormEvent) => {
    event.preventDefault();
    if (taskTitle.trim() && taskDialogColumn) createTask.mutate();
  };

  const projectOptions = projects.data?.filter((project) => project.boardId) ?? [];
  const selectedProject = projects.data?.find(
    (project) => project.boardId === boardId || project.id === board?.projectId,
  );
  const canEditTasks = selectedProject?.role === 'MEMBER' || selectedProject?.role === 'MANAGER';
  const canManageColumns = selectedProject?.role === 'MANAGER';
  const columnMutationPending =
    createColumn.isPending || renameColumn.isPending || reorderColumns.isPending || deleteColumn.isPending;
  const boardInteractionDisabled = moveTask.isPending || columnMutationPending;
  const orderedColumns = board
    ? [...board.columns].sort((left, right) => left.position - right.position)
    : [];

  const openCreateColumn = () => {
    setColumnName('');
    setColumnDialog({ mode: 'create' });
  };

  const openRenameColumn = (column: BoardColumn) => {
    setColumnName(column.name);
    setColumnDialog({ mode: 'rename', column });
  };

  const submitColumn = (event: FormEvent) => {
    event.preventDefault();
    if (!board || !columnDialog || !columnName.trim()) return;
    if (columnDialog.mode === 'create') {
      createColumn.mutate({ name: columnName.trim(), version: board.version });
    } else {
      renameColumn.mutate({
        columnId: columnDialog.column.id,
        name: columnName.trim(),
        version: board.version,
      });
    }
  };

  const moveColumn = (columnId: UUID, direction: -1 | 1) => {
    if (!board || reorderColumns.isPending) return;
    const currentIndex = orderedColumns.findIndex((column) => column.id === columnId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedColumns.length) return;
    reorderColumns.mutate({
      columnIds: arrayMove(orderedColumns, currentIndex, targetIndex).map((column) => column.id),
      version: board.version,
    });
  };

  return (
    <Box className="page-container page-container--wide">
      <PageHeader
        eyebrow="Kanban"
        title={board?.name ?? 'Bảng công việc'}
        description="Kéo thả thẻ để cập nhật trạng thái. Giới hạn WIP được kiểm tra trước khi lưu."
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            {canManageColumns && (
              <Button
                variant="outlined"
                startIcon={<Add />}
                disabled={!board || columnMutationPending}
                onClick={openCreateColumn}
              >
                Thêm cột
              </Button>
            )}
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="project-board-label">Dự án</InputLabel>
              <Select
                labelId="project-board-label"
                label="Dự án"
                value={boardId ?? ''}
                onChange={(event) => navigate(`/kanban/${event.target.value}`)}
              >
                {projectOptions.map((project) => (
                  <MenuItem key={project.id} value={project.boardId}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        }
      />
      {projects.isError && <ErrorState message={errorMessage(projects.error)} />}
      {!boardId ? (
        projects.isLoading ? (
          <SectionLoader />
        ) : (
          <EmptyState
            title="Chọn một bảng công việc"
            description="Chọn dự án trong danh sách phía trên hoặc mở bảng từ trang tổng quan."
          />
        )
      ) : boardQuery.isLoading && !board ? (
        <SectionLoader label="Đang tải bảng công việc…" />
      ) : boardQuery.isError ? (
        <ErrorState message={errorMessage(boardQuery.error)} onRetry={() => void boardQuery.refetch()} />
      ) : board ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveTaskId(null)}
        >
          <Box className="kanban-board">
            {orderedColumns.map((column, columnIndex) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  disabled={boardInteractionDisabled || !canEditTasks}
                  canManageColumns={canManageColumns}
                  columnIndex={columnIndex}
                  columnCount={orderedColumns.length}
                  onAdd={setTaskDialogColumn}
                  onRename={openRenameColumn}
                  onDelete={setDeleteColumnTarget}
                  onMove={moveColumn}
                />
              ))}
          </Box>
          <DragOverlay>{activeTask ? <TaskCardView task={activeTask} overlay /> : null}</DragOverlay>
        </DndContext>
      ) : null}
      <Dialog open={Boolean(taskDialogColumn)} onClose={() => setTaskDialogColumn(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={submitTask}>
          <DialogTitle>Thêm công việc</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <TextField
                label="Tên công việc"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                required
                autoFocus
                inputProps={{ maxLength: 200 }}
              />
              <FormControl size="small">
                <InputLabel id="task-priority-label">Độ ưu tiên</InputLabel>
                <Select
                  labelId="task-priority-label"
                  label="Độ ưu tiên"
                  value={taskPriority}
                  onChange={(event) => setTaskPriority(event.target.value as TaskPriority)}
                >
                  {Object.entries(priorityLabel).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTaskDialogColumn(null)}>Hủy</Button>
            <Button type="submit" variant="contained" disabled={!taskTitle.trim() || createTask.isPending}>
              {createTask.isPending ? 'Đang thêm…' : 'Thêm'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog open={Boolean(columnDialog)} onClose={() => setColumnDialog(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={submitColumn}>
          <DialogTitle>{columnDialog?.mode === 'rename' ? 'Đổi tên cột' : 'Thêm cột'}</DialogTitle>
          <DialogContent>
            <TextField
              label="Tên cột"
              value={columnName}
              onChange={(event) => setColumnName(event.target.value)}
              required
              autoFocus
              fullWidth
              margin="dense"
              inputProps={{ maxLength: 120 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setColumnDialog(null)}>Hủy</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!columnName.trim() || createColumn.isPending || renameColumn.isPending}
            >
              {createColumn.isPending || renameColumn.isPending ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog
        open={Boolean(deleteColumnTarget)}
        onClose={() => setDeleteColumnTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Xóa cột?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Cột “{deleteColumnTarget?.name}” sẽ bị xóa. Chỉ cột trống và không phải cột cuối cùng mới
            được phép xóa.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteColumnTarget(null)}>Hủy</Button>
          <Button
            color="error"
            variant="contained"
            disabled={!board || deleteColumn.isPending}
            onClick={() => {
              if (board && deleteColumnTarget) {
                deleteColumn.mutate({ columnId: deleteColumnTarget.id, version: board.version });
              }
            }}
          >
            {deleteColumn.isPending ? 'Đang xóa…' : 'Xóa cột'}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={5000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </Box>
  );
}
