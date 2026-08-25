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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Add,
  CalendarTodayOutlined,
  ChatBubbleOutline,
  DragIndicator,
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
  onAdd,
}: {
  column: BoardColumn;
  disabled: boolean;
  onAdd: (columnId: UUID) => void;
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
        disabled={atLimit}
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
  const projects = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list });
  const boardQuery = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardsApi.get(boardId!),
    enabled: Boolean(boardId),
  });
  useEffect(() => {
    if (boardQuery.data) setBoard(boardQuery.data);
  }, [boardQuery.data]);

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
  return (
    <Box className="page-container page-container--wide">
      <PageHeader
        eyebrow="Kanban"
        title={board?.name ?? 'Bảng công việc'}
        description="Kéo thả thẻ để cập nhật trạng thái. Giới hạn WIP được kiểm tra trước khi lưu."
        actions={
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
            {[...board.columns]
              .sort((left, right) => left.position - right.position)
              .map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  disabled={moveTask.isPending}
                  onAdd={setTaskDialogColumn}
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
      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={5000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </Box>
  );
}
