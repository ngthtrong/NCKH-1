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
  ForumOutlined,
  TaskAlt,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
import { boardsApi, membersApi, projectsApi } from '../api/endpoints';
import type { Board, BoardColumn, Comment, ProjectRole, TaskCard, TaskPriority, UUID } from '../api/types';
import { useAuth } from '../auth/AuthContext';
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

function TaskCardView({
  task,
  overlay = false,
  onOpen,
}: {
  task: TaskCard;
  overlay?: boolean;
  onOpen?: () => void;
}) {
  return (
    <Paper
      className={`task-card ${overlay ? 'task-card--overlay' : ''}`}
      variant="outlined"
      onClick={onOpen}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={(event) => {
        if (onOpen && (event.key === 'Enter' || event.key === ' ')) onOpen();
      }}
    >
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

function SortableTaskCard({
  task,
  disabled,
  onOpen,
}: {
  task: TaskCard;
  disabled: boolean;
  onOpen: () => void;
}) {
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
      <TaskCardView task={task} onOpen={onOpen} />
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
  onOpenTask,
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
  onOpenTask: (taskId: UUID) => void;
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
            <SortableTaskCard
              key={task.id}
              task={task}
              disabled={disabled}
              onOpen={() => onOpenTask(task.id)}
            />
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
  const { session } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<UUID | ''>('');
  const [activeTaskId, setActiveTaskId] = useState<UUID | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [taskDialogColumn, setTaskDialogColumn] = useState<UUID | null>(null);
  const [taskParentId, setTaskParentId] = useState<UUID | undefined>();
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueAt, setTaskDueAt] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState<UUID | ''>('');
  const [selectedTaskId, setSelectedTaskId] = useState<UUID | null>(null);
  const [detailTitle, setDetailTitle] = useState('');
  const [detailDescription, setDetailDescription] = useState('');
  const [detailDueAt, setDetailDueAt] = useState('');
  const [detailAssigneeId, setDetailAssigneeId] = useState<UUID | ''>('');
  const [commentBody, setCommentBody] = useState('');
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState('');
  const [boardDialog, setBoardDialog] = useState<'create' | 'rename' | null>(null);
  const [boardName, setBoardName] = useState('');
  const [columnDialog, setColumnDialog] = useState<
    { mode: 'create' } | { mode: 'rename'; column: BoardColumn } | null
  >(null);
  const [columnName, setColumnName] = useState('');
  const [deleteColumnTarget, setDeleteColumnTarget] = useState<BoardColumn | null>(null);
  const projects = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list });
  const projectBoards = useQuery({
    queryKey: ['project-boards', selectedProjectId],
    queryFn: () => boardsApi.list(selectedProjectId as UUID),
    enabled: Boolean(selectedProjectId),
  });
  const boardQuery = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardsApi.get(boardId!),
    enabled: Boolean(boardId),
  });
  useEffect(() => {
    if (boardQuery.data) {
      setBoard(boardQuery.data);
      setSelectedProjectId(boardQuery.data.projectId);
    }
  }, [boardQuery.data]);
  useEffect(() => {
    if (!boardId) setBoard(null);
  }, [boardId]);

  const selectedProject = projects.data?.find((project) => project.id === selectedProjectId);
  const needProjectPeople = Boolean(taskDialogColumn || selectedTaskId);
  const projectMembers = useQuery({
    queryKey: ['project-members', selectedProjectId],
    queryFn: () => projectsApi.members(selectedProjectId as UUID),
    enabled: Boolean(selectedProjectId && needProjectPeople),
  });
  const tenantMembers = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.list,
    enabled: needProjectPeople,
  });
  const comments = useQuery({
    queryKey: ['task-comments', selectedTaskId],
    queryFn: () => boardsApi.comments(selectedTaskId as UUID),
    enabled: Boolean(selectedTaskId),
  });

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
    onSuccess: acceptBoard,
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
        description: taskDescription.trim() || undefined,
        assigneeId: taskAssigneeId || undefined,
        dueDate: taskDueAt ? new Date(taskDueAt).toISOString() : undefined,
        parentTaskId: taskParentId,
        priority: 'MEDIUM',
      }),
    onSuccess: (updatedBoard) => {
      setBoard(updatedBoard);
      queryClient.setQueryData(['board', boardId], updatedBoard);
      setTaskDialogColumn(null);
      setTaskParentId(undefined);
      setTaskTitle('');
      setTaskDescription('');
      setTaskDueAt('');
      setTaskAssigneeId('');
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
  const createBoard = useMutation({
    mutationFn: () => boardsApi.create(selectedProjectId as UUID, boardName.trim()),
    onSuccess: async (created) => {
      setBoardDialog(null);
      setBoardName('');
      await queryClient.invalidateQueries({ queryKey: ['project-boards', selectedProjectId] });
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate(`/kanban/${created.id}`);
    },
    onError: (cause) => setSnackbar(errorMessage(cause)),
  });
  const renameBoard = useMutation({
    mutationFn: () => boardsApi.update(boardId!, boardName.trim(), board!.version),
    onSuccess: async (updated) => {
      acceptBoard(updated);
      setBoardDialog(null);
      setBoardName('');
      await queryClient.invalidateQueries({ queryKey: ['project-boards', selectedProjectId] });
    },
    onError: handleColumnError,
  });
  const deleteBoard = useMutation({
    mutationFn: () => boardsApi.remove(boardId!),
    onSuccess: async () => {
      const remaining = (projectBoards.data ?? []).filter((candidate) => candidate.id !== boardId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-boards', selectedProjectId] }),
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
      ]);
      navigate(remaining[0] ? `/kanban/${remaining[0].id}` : '/kanban');
      setSnackbar('Đã xóa mềm bảng công việc.');
    },
    onError: (cause) => setSnackbar(errorMessage(cause)),
  });
  const updateTask = useMutation({
    mutationFn: () => {
      const task = board?.columns.flatMap((column) => column.tasks)
        .find((candidate) => candidate.id === selectedTaskId);
      if (!task) throw new Error('Task not found');
      return boardsApi.updateTask(task.id, {
        columnId: task.columnId,
        title: detailTitle.trim(),
        description: detailDescription.trim() || undefined,
        assigneeId: detailAssigneeId || undefined,
        dueDate: detailDueAt ? new Date(detailDueAt).toISOString() : undefined,
        position: task.position,
        version: task.version,
      });
    },
    onSuccess: async () => {
      setSnackbar('Đã cập nhật công việc.');
      await queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
    onError: (cause) => {
      setSnackbar((cause as { status?: number }).status === 409
        ? 'Có phiên bản mới hơn. Nội dung đang nhập được giữ lại; hãy sao chép nếu cần rồi tải lại.'
        : errorMessage(cause));
    },
  });
  const deleteTask = useMutation({
    mutationFn: () => boardsApi.deleteTask(selectedTaskId as UUID),
    onSuccess: async () => {
      setSelectedTaskId(null);
      await queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      setSnackbar('Đã xóa mềm công việc và subtask trực thuộc.');
    },
    onError: (cause) => setSnackbar(errorMessage(cause)),
  });
  const addComment = useMutation({
    mutationFn: () => boardsApi.addComment(selectedTaskId as UUID, commentBody.trim()),
    onSuccess: async () => {
      setCommentBody('');
      await queryClient.invalidateQueries({ queryKey: ['task-comments', selectedTaskId] });
    },
    onError: (cause) => setSnackbar(errorMessage(cause)),
  });
  const updateComment = useMutation({
    mutationFn: () => boardsApi.updateComment(editingComment!.id, editingCommentBody.trim()),
    onSuccess: async () => {
      setEditingComment(null);
      setEditingCommentBody('');
      await queryClient.invalidateQueries({ queryKey: ['task-comments', selectedTaskId] });
    },
    onError: (cause) => setSnackbar(errorMessage(cause)),
  });
  const deleteComment = useMutation({
    mutationFn: boardsApi.deleteComment,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['task-comments', selectedTaskId] }),
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

  const projectOptions = projects.data ?? [];
  const projectActive = selectedProject?.status === 'ACTIVE';
  const canEditTasks = projectActive
    && (selectedProject?.role === 'MEMBER' || selectedProject?.role === 'MANAGER');
  const canManageColumns = projectActive && selectedProject?.role === 'MANAGER';
  const selectedTask = board?.columns.flatMap((column) => column.tasks)
    .find((task) => task.id === selectedTaskId);
  const memberNameByUserId = new Map(
    (tenantMembers.data ?? []).map((member) => [member.user.id, member.user.displayName]),
  );
  const assignableMembers = (projectMembers.data ?? []).map((member) => ({
    userId: member.userId,
    name: memberNameByUserId.get(member.userId) ?? member.userId,
  }));
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

  const openCreateTask = (columnId: UUID, parentTaskId?: UUID) => {
    setTaskDialogColumn(columnId);
    setTaskParentId(parentTaskId);
    setTaskTitle('');
    setTaskDescription('');
    setTaskDueAt('');
    setTaskAssigneeId('');
  };

  const openTask = (taskId: UUID) => {
    const task = board?.columns.flatMap((column) => column.tasks)
      .find((candidate) => candidate.id === taskId);
    if (!task) return;
    setSelectedTaskId(taskId);
    setDetailTitle(task.title);
    setDetailDescription(task.description ?? '');
    setDetailDueAt(task.dueDate?.slice(0, 16) ?? '');
    setDetailAssigneeId(task.assignee?.id ?? '');
  };

  const selectProject = async (projectId: UUID) => {
    setSelectedProjectId(projectId);
    const available = await queryClient.fetchQuery({
      queryKey: ['project-boards', projectId],
      queryFn: () => boardsApi.list(projectId),
    });
    navigate(available[0] ? `/kanban/${available[0].id}` : '/kanban');
  };

  const submitBoard = (event: FormEvent) => {
    event.preventDefault();
    if (!boardName.trim()) return;
    if (boardDialog === 'create') createBoard.mutate();
    else if (boardDialog === 'rename' && board) renameBoard.mutate();
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
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
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
              <InputLabel id="project-select-label">Dự án</InputLabel>
              <Select
                labelId="project-select-label"
                label="Dự án"
                value={selectedProjectId}
                onChange={(event) => void selectProject(event.target.value as UUID)}
              >
                {projectOptions.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}{project.status === 'ARCHIVED' ? ' · đã lưu trữ' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }} disabled={!selectedProjectId}>
              <InputLabel id="board-select-label">Bảng</InputLabel>
              <Select
                labelId="board-select-label"
                label="Bảng"
                value={boardId ?? ''}
                onChange={(event) => navigate(`/kanban/${event.target.value}`)}
              >
                {(projectBoards.data ?? []).map((candidate) => (
                  <MenuItem key={candidate.id} value={candidate.id}>{candidate.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedProject?.role === 'MANAGER' && projectActive && (
              <Button
                size="small"
                onClick={() => {
                  setBoardName('');
                  setBoardDialog('create');
                }}
              >
                Bảng mới
              </Button>
            )}
            {canManageColumns && board && (
              <>
                <IconButton
                  aria-label="Đổi tên bảng"
                  onClick={() => {
                    setBoardName(board.name);
                    setBoardDialog('rename');
                  }}
                >
                  <EditOutlined />
                </IconButton>
                <IconButton
                  aria-label="Xóa bảng"
                  color="error"
                  disabled={deleteBoard.isPending}
                  onClick={() => {
                    if (window.confirm(`Xóa mềm bảng “${board.name}”?`)) deleteBoard.mutate();
                  }}
                >
                  <DeleteOutline />
                </IconButton>
              </>
            )}
          </Stack>
        }
      />
      {projects.isError && <ErrorState message={errorMessage(projects.error)} />}
      {selectedProject?.status === 'ARCHIVED' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Dự án đã lưu trữ: bảng và nội dung chỉ đọc cho đến khi được khôi phục.
        </Alert>
      )}
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
                  onAdd={(columnId) => openCreateTask(columnId)}
                  onRename={openRenameColumn}
                  onDelete={setDeleteColumnTarget}
                  onMove={moveColumn}
                  onOpenTask={openTask}
                />
              ))}
          </Box>
          <DragOverlay>{activeTask ? <TaskCardView task={activeTask} overlay /> : null}</DragOverlay>
        </DndContext>
      ) : null}
      <Dialog open={Boolean(taskDialogColumn)} onClose={() => setTaskDialogColumn(null)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={submitTask}>
          <DialogTitle>{taskParentId ? 'Thêm công việc con' : 'Thêm công việc'}</DialogTitle>
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
              <TextField
                label="Mô tả"
                value={taskDescription}
                onChange={(event) => setTaskDescription(event.target.value)}
                multiline
                minRows={3}
                inputProps={{ maxLength: 10_000 }}
              />
              <TextField
                label="Hạn hoàn thành"
                type="datetime-local"
                value={taskDueAt}
                onChange={(event) => setTaskDueAt(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <FormControl size="small">
                <InputLabel id="task-assignee-label">Người thực hiện</InputLabel>
                <Select
                  labelId="task-assignee-label"
                  label="Người thực hiện"
                  value={taskAssigneeId}
                  onChange={(event) => setTaskAssigneeId(event.target.value as UUID | '')}
                >
                  <MenuItem value="">Chưa giao</MenuItem>
                  {assignableMembers.map((member) => (
                    <MenuItem key={member.userId} value={member.userId}>
                      {member.name}
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
      <Dialog open={Boolean(boardDialog)} onClose={() => setBoardDialog(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={submitBoard}>
          <DialogTitle>{boardDialog === 'rename' ? 'Đổi tên bảng' : 'Tạo bảng mới'}</DialogTitle>
          <DialogContent>
            <TextField
              label="Tên bảng"
              value={boardName}
              onChange={(event) => setBoardName(event.target.value)}
              required
              autoFocus
              fullWidth
              margin="dense"
              inputProps={{ maxLength: 160 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBoardDialog(null)}>Hủy</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!boardName.trim() || createBoard.isPending || renameBoard.isPending}
            >
              {createBoard.isPending || renameBoard.isPending ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog open={Boolean(selectedTask)} onClose={() => setSelectedTaskId(null)} fullWidth maxWidth="md">
        <DialogTitle>Chi tiết công việc</DialogTitle>
        <DialogContent>
          {selectedTask && (
            <Stack spacing={2} mt={0.5}>
              {selectedTask.parentTaskId && <Chip label="Công việc con" size="small" sx={{ alignSelf: 'flex-start' }} />}
              <TextField
                label="Tiêu đề"
                value={detailTitle}
                onChange={(event) => setDetailTitle(event.target.value)}
                disabled={!canEditTasks}
                required
                inputProps={{ maxLength: 240 }}
              />
              <TextField
                label="Mô tả"
                value={detailDescription}
                onChange={(event) => setDetailDescription(event.target.value)}
                disabled={!canEditTasks}
                multiline
                minRows={3}
                inputProps={{ maxLength: 10_000 }}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Hạn hoàn thành"
                  type="datetime-local"
                  value={detailDueAt}
                  onChange={(event) => setDetailDueAt(event.target.value)}
                  disabled={!canEditTasks}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <FormControl fullWidth disabled={!canEditTasks}>
                  <InputLabel id="detail-assignee-label">Người thực hiện</InputLabel>
                  <Select
                    labelId="detail-assignee-label"
                    label="Người thực hiện"
                    value={detailAssigneeId}
                    onChange={(event) => setDetailAssigneeId(event.target.value as UUID | '')}
                  >
                    <MenuItem value="">Chưa giao</MenuItem>
                    {assignableMembers.map((member) => (
                      <MenuItem key={member.userId} value={member.userId}>{member.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              {canEditTasks && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button
                    variant="contained"
                    disabled={!detailTitle.trim() || updateTask.isPending}
                    onClick={() => updateTask.mutate()}
                  >
                    {updateTask.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
                  </Button>
                  {!selectedTask.parentTaskId && (
                    <Button
                      startIcon={<TaskAlt />}
                      onClick={() => {
                        setSelectedTaskId(null);
                        openCreateTask(selectedTask.columnId, selectedTask.id);
                      }}
                    >
                      Thêm subtask
                    </Button>
                  )}
                  {selectedProject?.role === 'MANAGER' && (
                    <Button
                      color="error"
                      startIcon={<DeleteOutline />}
                      disabled={deleteTask.isPending}
                      onClick={() => {
                        if (window.confirm('Xóa mềm công việc này và các subtask trực thuộc?')) {
                          deleteTask.mutate();
                        }
                      }}
                    >
                      Xóa
                    </Button>
                  )}
                </Stack>
              )}
              <Divider />
              <Stack direction="row" alignItems="center" gap={1}>
                <ForumOutlined color="action" />
                <Typography variant="h6">Bình luận</Typography>
              </Stack>
              {comments.isLoading ? (
                <SectionLoader />
              ) : comments.isError ? (
                <ErrorState message={errorMessage(comments.error)} onRetry={() => void comments.refetch()} />
              ) : !comments.data?.length ? (
                <Typography color="text.secondary">Chưa có bình luận.</Typography>
              ) : (
                <Stack spacing={1.25}>
                  {comments.data.map((comment) => {
                    const canChange = canEditTasks && (
                      selectedProject?.role === 'MANAGER' || comment.authorUserId === session?.user.id
                    );
                    return (
                      <Paper key={comment.id} variant="outlined" sx={{ p: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between" gap={2}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {memberNameByUserId.get(comment.authorUserId) ?? comment.authorUserId}
                              {' · '}{new Date(comment.createdAt).toLocaleString('vi-VN')}
                            </Typography>
                            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{comment.body}</Typography>
                          </Box>
                          {canChange && (
                            <Stack direction="row">
                              <IconButton
                                size="small"
                                aria-label="Sửa bình luận"
                                onClick={() => {
                                  setEditingComment(comment);
                                  setEditingCommentBody(comment.body);
                                }}
                              >
                                <EditOutlined fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                aria-label="Xóa bình luận"
                                disabled={deleteComment.isPending}
                                onClick={() => deleteComment.mutate(comment.id)}
                              >
                                <DeleteOutline fontSize="small" />
                              </IconButton>
                            </Stack>
                          )}
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
              {canEditTasks && (
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <TextField
                    label="Viết bình luận"
                    value={commentBody}
                    onChange={(event) => setCommentBody(event.target.value)}
                    multiline
                    minRows={2}
                    fullWidth
                    inputProps={{ maxLength: 10_000 }}
                  />
                  <Button
                    variant="contained"
                    disabled={!commentBody.trim() || addComment.isPending}
                    onClick={() => addComment.mutate()}
                  >
                    Gửi
                  </Button>
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setSelectedTaskId(null)}>Đóng</Button></DialogActions>
      </Dialog>
      <Dialog open={Boolean(editingComment)} onClose={() => setEditingComment(null)} fullWidth maxWidth="sm">
        <DialogTitle>Sửa bình luận</DialogTitle>
        <DialogContent>
          <TextField
            label="Nội dung"
            value={editingCommentBody}
            onChange={(event) => setEditingCommentBody(event.target.value)}
            multiline
            minRows={3}
            fullWidth
            margin="dense"
            inputProps={{ maxLength: 10_000 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingComment(null)}>Hủy</Button>
          <Button
            variant="contained"
            disabled={!editingCommentBody.trim() || updateComment.isPending}
            onClick={() => updateComment.mutate()}
          >
            Lưu
          </Button>
        </DialogActions>
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
