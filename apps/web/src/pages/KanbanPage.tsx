import { PooledTaskFields } from '../components/PooledTaskFields';
import { kanbanSettingsApi } from '../api/kanbanSettings';
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
import Add from '@mui/icons-material/Add';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ArrowForward from '@mui/icons-material/ArrowForward';
import AttachFile from '@mui/icons-material/AttachFile';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import ChatBubbleOutline from '@mui/icons-material/ChatBubbleOutline';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Close from '@mui/icons-material/Close';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import DragIndicator from '@mui/icons-material/DragIndicator';
import EditOutlined from '@mui/icons-material/EditOutlined';
import ForumOutlined from '@mui/icons-material/ForumOutlined';
import InsertLink from '@mui/icons-material/InsertLink';
import OpenInNew from '@mui/icons-material/OpenInNew';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked';
import TaskAlt from '@mui/icons-material/TaskAlt';
import {
  Alert,
  Avatar,
  Box,
  Breadcrumbs,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  Link,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { approvalsApi, boardsApi, customDataApi, membersApi, projectsApi, resourcesApi, tenantSettingsApi } from '../api/endpoints';
import type { Board, BoardColumn, Comment, ProjectRole, TaskCard, TaskPriority, UUID } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, ErrorState, SectionLoader } from '../components/AsyncState';
import { PageHeader } from '../components/PageHeader';
import { KanbanFilterBar, type KanbanFilterState } from '../components/kanban/KanbanFilterBar';
import { QuickAddTaskInline } from '../components/kanban/QuickAddTaskInline';
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

function localDateTimeValue(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

const priorityPastelConfig: Record<TaskPriority, { bg: string; color: string; border: string }> = {
  URGENT: { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  HIGH: { bg: '#ffedd5', color: '#ea580c', border: '#fed7aa' },
  MEDIUM: { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' },
  LOW: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
};

function TaskCardView({
  task,
  overlay = false,
  onOpen,
}: {
  task: TaskCard;
  overlay?: boolean;
  onOpen?: () => void;
}) {
  const isOverdue = task.dueDate ? new Date(task.dueDate).getTime() < Date.now() : false;
  const isDueSoon = task.dueDate
    ? !isOverdue && new Date(task.dueDate).getTime() - Date.now() < 24 * 60 * 60 * 1000
    : false;
  const dueDateColor = isOverdue ? '#dc2626' : isDueSoon ? '#ea580c' : 'text.secondary';
  const isSubtasksComplete = task.subtaskCount > 0 && task.completedSubtaskCount === task.subtaskCount;

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
      sx={{
        borderRadius: 2.5,
        p: 1.5,
        bgcolor: '#ffffff',
        border: '1px solid #e2e8f0',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        cursor: onOpen ? 'pointer' : 'default',
        '&:hover': onOpen
          ? {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
              borderColor: '#cbd5e1',
            }
          : undefined,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
        <Chip
          size="small"
          label={priorityLabel[task.priority]}
          className={`priority priority--${task.priority.toLowerCase()}`}
          sx={{
            bgcolor: priorityPastelConfig[task.priority].bg,
            color: priorityPastelConfig[task.priority].color,
            border: `1px solid ${priorityPastelConfig[task.priority].border}`,
            fontWeight: 600,
            borderRadius: 1.5,
            height: 22,
            fontSize: '0.75rem',
          }}
        />
        {!overlay && (
          <DragIndicator
            className="task-card__handle-icon"
            fontSize="small"
            sx={{ color: 'text.disabled', opacity: 0.6 }}
          />
        )}
      </Stack>
      <Typography
        fontWeight={700}
        fontSize="0.9375rem"
        mt={1.25}
        sx={{ color: '#0f172a', lineHeight: 1.35 }}
        className="task-card__title"
      >
        {task.title}
      </Typography>
      {task.description && (
        <Typography
          variant="body2"
          color="text.secondary"
          mt={0.5}
          className="line-clamp-2"
          sx={{ fontSize: '0.8125rem' }}
        >
          {task.description}
        </Typography>
      )}
      <Stack direction="row" alignItems="center" gap={1.5} mt={1.5} color="text.secondary">
        {task.dueDate && (
          <Tooltip
            title={
              isOverdue
                ? 'Đã quá hạn'
                : isDueSoon
                  ? 'Sắp đến hạn (trong vòng 24h)'
                  : `Hạn: ${shortDate(task.dueDate)}`
            }
          >
            <Box
              className="task-meta"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: dueDateColor,
                fontWeight: isOverdue || isDueSoon ? 600 : 500,
                fontSize: '0.75rem',
              }}
            >
              <CalendarTodayOutlined sx={{ fontSize: 13 }} /> {shortDate(task.dueDate)}
            </Box>
          </Tooltip>
        )}
        {task.subtaskCount > 0 && (
          <Tooltip title={`Tiến độ subtask: ${task.completedSubtaskCount}/${task.subtaskCount}`}>
            <Box
              className="task-meta"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: isSubtasksComplete ? 'success.main' : 'text.secondary',
                fontWeight: isSubtasksComplete ? 700 : 500,
                fontSize: '0.75rem',
              }}
            >
              <TaskAlt
                sx={{
                  fontSize: 13,
                  color: isSubtasksComplete ? 'success.main' : 'inherit',
                }}
              />
              {task.completedSubtaskCount}/{task.subtaskCount}
            </Box>
          </Tooltip>
        )}
        {task.commentCount > 0 && (
          <Box
            className="task-meta"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem' }}
          >
            <ChatBubbleOutline sx={{ fontSize: 13 }} /> {task.commentCount}
          </Box>
        )}
        <Box flex={1} />
        {task.assignee && (
          <Tooltip title={task.assignee.displayName}>
            <Avatar
              src={task.assignee.avatarUrl}
              sx={{
                width: 24,
                height: 24,
                fontSize: '0.7rem',
                bgcolor: 'primary.light',
                color: 'primary.dark',
                fontWeight: 700,
                border: '1px solid #e2e8f0',
              }}
            >
              {task.assignee.displayName[0]}
            </Avatar>
          </Tooltip>
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
  wipMode,
  disabled,
  canManageColumns,
  canEditTasks,
  columnIndex,
  columnCount,
  filters,
  onAdd,
  onQuickAdd,
  onRename,
  onDelete,
  onMove,
  onOpenTask,
}: {
  column: BoardColumn;
  wipMode?: string;
  disabled: boolean;
  canManageColumns: boolean;
  canEditTasks: boolean;
  columnIndex: number;
  columnCount: number;
  filters: KanbanFilterState;
  onAdd: (columnId: UUID) => void;
  onQuickAdd: (columnId: UUID, title: string) => Promise<unknown> | unknown;
  onRename: (column: BoardColumn) => void;
  onDelete: (column: BoardColumn) => void;
  onMove: (columnId: UUID, direction: -1 | 1) => void;
  onOpenTask: (taskId: UUID) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, disabled });
  const atLimit = Boolean(column.taskLimit && column.tasks.length >= column.taskLimit);
  const isWipWarn = wipMode === 'WARN' && atLimit;

  const isFiltered = filters.search.trim() !== '' || filters.priority !== 'ALL' || filters.assigneeId !== 'ALL';
  const visibleTasks = column.tasks.filter((task) => {
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    if (filters.priority !== 'ALL' && task.priority !== filters.priority) {
      return false;
    }
    if (filters.assigneeId !== 'ALL') {
      if (filters.assigneeId === 'UNASSIGNED') {
        if (task.assignee) return false;
      } else if (task.assignee?.id !== filters.assigneeId) {
        return false;
      }
    }
    return true;
  });

  const cardCountText = isFiltered
    ? `${visibleTasks.length}/${column.tasks.length}`
    : column.taskLimit
      ? `${column.tasks.length}/${column.taskLimit}`
      : `${column.tasks.length}`;

  const countBadge = (
    <Chip
      label={cardCountText}
      size="small"
      sx={{
        borderRadius: 4,
        height: 22,
        fontSize: '0.75rem',
        fontWeight: isWipWarn ? 800 : 700,
        ...(isWipWarn
          ? {
              bgcolor: '#fef3c7',
              color: '#b45309',
              border: '1px solid #fde68a',
            }
          : {
              bgcolor: 'action.selected',
              color: 'text.secondary',
            }),
      }}
    />
  );

  return (
    <Box className={`kanban-column ${isOver ? 'kanban-column--over' : ''}`} ref={setNodeRef}>
      <Stack direction="row" alignItems="center" gap={1} className="kanban-column__header">
        <span className="kanban-column__dot" />
        <Typography fontWeight={700} fontSize="0.9375rem" sx={{ color: 'text.primary' }}>
          {column.name}
        </Typography>
        {column.completed && (
          <Chip
            label="Hoàn tất"
            size="small"
            color="success"
            variant="outlined"
            sx={{ borderRadius: 1.5, height: 20, fontSize: '0.7rem' }}
          />
        )}
        {isWipWarn ? (
          <Tooltip
            title={`Cảnh báo: Cột đã đạt hoặc vượt giới hạn WIP (${column.tasks.length}/${column.taskLimit})`}
          >
            {countBadge}
          </Tooltip>
        ) : (
          countBadge
        )}
        <Box flex={1} />
        {column.taskLimit && !isWipWarn && (
          <Typography
            variant="caption"
            color={atLimit ? 'error' : 'text.secondary'}
            sx={{ fontWeight: 500 }}
          >
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
      <SortableContext items={visibleTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <Stack spacing={1.25} className="kanban-column__tasks">
          {visibleTasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              disabled={disabled}
              onOpen={() => onOpenTask(task.id)}
            />
          ))}
          {visibleTasks.length === 0 && (
            <Box className="kanban-column__empty">
              {column.tasks.length === 0 ? 'Thả công việc vào đây' : 'Không có thẻ phù hợp'}
            </Box>
          )}
        </Stack>
      </SortableContext>
      {canEditTasks && (
        <Box sx={{ mt: 1 }}>
          <QuickAddTaskInline
            columnId={column.id}
            disabled={disabled || (atLimit && wipMode === 'STRICT')}
            onAddTask={onQuickAdd}
            onOpenFullDialog={() => onAdd(column.id)}
          />
        </Box>
      )}
    </Box>
  );
}

export function KanbanPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [filters, setFilters] = useState<KanbanFilterState>({
    search: '',
    priority: 'ALL',
    assigneeId: 'ALL',
  });
  const [selectedProjectId, setSelectedProjectId] = useState<UUID | ''>('');
  const [activeTaskId, setActiveTaskId] = useState<UUID | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [taskDialogColumn, setTaskDialogColumn] = useState<UUID | null>(null);
  const [taskParentId, setTaskParentId] = useState<UUID | undefined>();
  const kanbanConfiguration = useQuery({ queryKey: ['kanban-settings'], queryFn: kanbanSettingsApi.get });
  const [newCustomData, setNewCustomData] = useState<Record<string, unknown>>({});
  const [detailCustomData, setDetailCustomData] = useState<Record<string, unknown>>({});
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [taskDueAt, setTaskDueAt] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState<UUID | ''>('');
  const [selectedTaskId, setSelectedTaskId] = useState<UUID | null>(null);
  const [detailTitle, setDetailTitle] = useState('');
  const [detailDescription, setDetailDescription] = useState('');
  const [detailPriority, setDetailPriority] = useState<TaskPriority>('MEDIUM');
  const [detailDueAt, setDetailDueAt] = useState('');
  const [detailAssigneeId, setDetailAssigneeId] = useState<UUID | ''>('');
  const [detailColumnId, setDetailColumnId] = useState<UUID | ''>('');
  const [quickSubtaskTitle, setQuickSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  const [commentBody, setCommentBody] = useState('');
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState('');
  const [boardDialog, setBoardDialog] = useState<'create' | 'rename' | null>(null);
  const [boardName, setBoardName] = useState('');
  const [columnDialog, setColumnDialog] = useState<
    { mode: 'create' } | { mode: 'rename'; column: BoardColumn } | null
  >(null);
  const [columnName, setColumnName] = useState('');
  const [columnCompleted, setColumnCompleted] = useState(false);
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
  useEffect(() => {
    const requestedTaskId = searchParams.get('task');
    if (!board || !requestedTaskId) return;
    if (board.columns.some((column) => column.tasks.some((task) => task.id === requestedTaskId))) {
      setSelectedTaskId(requestedTaskId);
    } else {
      setSnackbar('Công việc trong thông báo không còn khả dụng.');
    }
    const next = new URLSearchParams(searchParams);
    next.delete('task');
    setSearchParams(next, { replace: true });
  }, [board, searchParams, setSearchParams]);

  const selectedProject = projects.data?.find((project) => project.id === selectedProjectId);
  const needProjectPeople = Boolean(selectedProjectId);
  const projectMembers = useQuery({
    queryKey: ['project-members', selectedProjectId],
    queryFn: () => projectsApi.members(selectedProjectId as UUID),
    enabled: Boolean(selectedProjectId),
  });
  const tenantMembers = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.list,
    enabled: Boolean(selectedProjectId),
  });
  const comments = useQuery({
    queryKey: ['task-comments', selectedTaskId],
    queryFn: () => boardsApi.comments(selectedTaskId as UUID),
    enabled: Boolean(selectedTaskId),
  });
  const resources = useQuery({
    queryKey: ['resources'],
    queryFn: resourcesApi.list,
    enabled: Boolean(selectedTaskId),
  });
  const downloadResource = useMutation({
    mutationFn: resourcesApi.downloadUrl,
    onSuccess: ({ url }) => window.open(url, '_blank', 'noopener,noreferrer'),
    onError: (cause) => setSnackbar(errorMessage(cause)),
  });
  const tenantSettings = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: tenantSettingsApi.get,
  });
  const customCapability = tenantSettings.data?.capabilities.find((item) => item.capability === 'CUSTOM_DATA');
  const approvalCapability = tenantSettings.data?.capabilities.find((item) => item.capability === 'APPROVALS');
  const taskCustom = useQuery({
    queryKey: ['task-custom-values', selectedTaskId],
    queryFn: () => customDataApi.taskValues(selectedTaskId as UUID),
    enabled: Boolean(selectedTaskId && customCapability?.supported),
  });
  const approvalRuns = useQuery({
    queryKey: ['task-approval-runs', selectedTaskId],
    queryFn: () => approvalsApi.runs(selectedTaskId as UUID),
    enabled: Boolean(selectedTaskId && approvalCapability?.supported),
  });
  useEffect(() => {
    if (taskCustom.data) setCustomValues(taskCustom.data.values);
  }, [taskCustom.data]);

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
      const status = (cause as { status?: number }).status;
      if (status === 422) {
        setSnackbar('Không thể chuyển công việc: vi phạm giới hạn WIP (chế độ nghiêm ngặt).');
      } else if (status === 409) {
        setSnackbar('Công việc đã được người khác cập nhật. Bảng đang được tải lại.');
      } else {
        setSnackbar(errorMessage(cause));
      }
      void queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });
  const quickCreateTask = useMutation({
    mutationFn: ({ columnId, title }: { columnId: UUID; title: string }) =>
      boardsApi.createTask(boardId!, columnId, {
        title: title.trim(),
        priority: 'MEDIUM',
      }),
    onSuccess: acceptBoard,
    onError: (cause) => {
      const status = (cause as { status?: number }).status;
      if (status === 422) {
        setSnackbar('Không thể thêm công việc: vi phạm giới hạn WIP của cột.');
      } else {
        setSnackbar(errorMessage(cause));
      }
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
        priority: taskPriority,
        customData: newCustomData,
      }),
    onSuccess: (updatedBoard) => {
      setBoard(updatedBoard);
      queryClient.setQueryData(['board', boardId], updatedBoard);
      setTaskDialogColumn(null);
      setTaskParentId(undefined);
      setTaskTitle('');
    setNewCustomData({});
      setTaskDescription('');
      setTaskPriority('MEDIUM');
      setTaskDueAt('');
      setTaskAssigneeId('');
    },
    onError: (cause) => setSnackbar(errorMessage(cause)),
  });
  const createColumn = useMutation({
    mutationFn: ({ name, completed, version }: { name: string; completed: boolean; version: number }) =>
      boardsApi.createColumn(boardId!, { name, completed, version }),
    onSuccess: (updatedBoard) => {
      acceptBoard(updatedBoard);
      setColumnDialog(null);
      setColumnName('');
      setColumnCompleted(false);
    },
    onError: handleColumnError,
  });
  const renameColumn = useMutation({
    mutationFn: ({ columnId, name, completed, version }: {
      columnId: UUID;
      name: string;
      completed: boolean;
      version: number;
    }) => boardsApi.updateColumn(boardId!, columnId, { name, completed, version }),
    onSuccess: (updatedBoard) => {
      acceptBoard(updatedBoard);
      setColumnDialog(null);
      setColumnName('');
      setColumnCompleted(false);
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
        columnId: (detailColumnId || task.columnId) as UUID,
        title: detailTitle.trim(),
        description: detailDescription.trim() || undefined,
        priority: detailPriority,
        customData: detailCustomData,
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task-comments', selectedTaskId] }),
        queryClient.invalidateQueries({ queryKey: ['board', boardId] }),
      ]);
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
    onSuccess: () => void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['task-comments', selectedTaskId] }),
      queryClient.invalidateQueries({ queryKey: ['board', boardId] }),
    ]),
    onError: (cause) => setSnackbar(errorMessage(cause)),
  });
  const saveCustomValues = useMutation({
    mutationFn: () => customDataApi.updateTaskValues(
      selectedTaskId as UUID, customValues, taskCustom.data?.version ?? 0,
    ),
    onSuccess: async () => {
      setSnackbar('Đã lưu field mở rộng của công việc.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task-custom-values', selectedTaskId] }),
        queryClient.invalidateQueries({ queryKey: ['task-approval-runs', selectedTaskId] }),
      ]);
    },
    onError: (cause) => setSnackbar(errorMessage(cause)),
  });
  const submitApproval = useMutation({
    mutationFn: () => approvalsApi.submit(selectedTaskId as UUID),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task-approval-runs', selectedTaskId] }),
    onError: (cause) => setSnackbar(errorMessage(cause)),
  });
  const decideApproval = useMutation({
    mutationFn: ({ runId, decision, version }: { runId: UUID; decision: 'APPROVED' | 'REJECTED'; version: number }) =>
      approvalsApi.decide(runId, decision, version),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task-approval-runs', selectedTaskId] }),
        queryClient.invalidateQueries({ queryKey: ['board', boardId] }),
      ]);
    },
    onError: (cause) => setSnackbar(errorMessage(cause)),
  });
  const withdrawApproval = useMutation({
    mutationFn: ({ runId, version }: { runId: UUID; version: number }) => approvalsApi.withdraw(runId, version),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task-approval-runs', selectedTaskId] }),
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
    const currentWipMode = kanbanConfiguration.data?.settings.wipMode ?? 'STRICT';
    const result = moveBoardTask(board, String(active.id), String(over.id), currentWipMode);
    if (!result) {
      setSnackbar('Không thể chuyển công việc: cột đích đã đạt giới hạn WIP.');
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
      {
        onError: (cause) => {
          setBoard(previous);
          const status = (cause as { status?: number }).status;
          if (status === 422) {
            setSnackbar('Không thể chuyển công việc: vi phạm giới hạn WIP (chế độ nghiêm ngặt).');
          }
        },
      },
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
  const selectedTaskSubtasks = useMemo(() => {
    if (!board || !selectedTaskId) return [];
    return board.columns.flatMap((column) =>
      column.tasks
        .filter((task) => task.parentTaskId === selectedTaskId)
        .map((task) => ({
          ...task,
          columnName: column.name,
          isCompleted: column.completed,
        })),
    );
  }, [board, selectedTaskId]);
  const completedSubtasksCount = selectedTaskSubtasks.filter((t) => t.isCompleted).length;
  const totalSubtasksCount = selectedTaskSubtasks.length;
  const subtasksPercent =
    totalSubtasksCount > 0 ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100) : 0;
  const attachedResources = (resources.data?.items ?? [])
    .filter((resource) => selectedTaskId && resource.taskIds.includes(selectedTaskId));
  const latestApproval = approvalRuns.data?.[0];
  const currentApprovalStep = latestApproval?.steps.find(
    (step) => step.position === latestApproval.currentStep && step.status === 'PENDING',
  );
  const currentUserCanDecide = currentApprovalStep?.approvers.some(
    (approver) => approver.userId === session?.user.id && !approver.decision,
  );
  const memberNameByUserId = new Map(
    (tenantMembers.data ?? []).map((member) => [member.user.id, member.user.displayName]),
  );
  const assignableMembers = (projectMembers.data ?? []).map((member) => ({
    userId: member.userId,
    name: memberNameByUserId.get(member.userId) ?? member.userId,
  }));
  const columnMutationPending =
    createColumn.isPending || renameColumn.isPending || reorderColumns.isPending || deleteColumn.isPending;
  const boardInteractionDisabled = moveTask.isPending || quickCreateTask.isPending || columnMutationPending;
  const orderedColumns = board
    ? [...board.columns].sort((left, right) => left.position - right.position)
    : [];

  const openCreateColumn = () => {
    setColumnName('');
    setColumnCompleted(false);
    setColumnDialog({ mode: 'create' });
  };

  const openCreateTask = (columnId: UUID, parentTaskId?: UUID) => {
    setTaskDialogColumn(columnId);
    setTaskParentId(parentTaskId);
    setTaskTitle('');
    setNewCustomData({});
    setTaskDescription('');
    setTaskPriority('MEDIUM');
    setTaskDueAt('');
    setTaskAssigneeId('');
  };

  const openTask = (taskId: UUID) => {
    const task = board?.columns.flatMap((column) => column.tasks)
      .find((candidate) => candidate.id === taskId);
    if (!task) return;
    setSelectedTaskId(taskId);
    setDetailColumnId(task.columnId);
    setDetailTitle(task.title);
    setDetailCustomData(task.customData ?? {});
    setDetailDescription(task.description ?? '');
    setDetailPriority(task.priority);
    setDetailDueAt(task.dueDate ? localDateTimeValue(task.dueDate) : '');
    setDetailAssigneeId(task.assignee?.id ?? '');
    setQuickSubtaskTitle('');
  };

  const handleQuickAddSubtask = async () => {
    const trimmed = quickSubtaskTitle.trim();
    if (!trimmed || !boardId || !selectedTask || isAddingSubtask) return;
    try {
      setIsAddingSubtask(true);
      const targetColumnId = selectedTask.columnId;
      const updatedBoard = await boardsApi.createTask(boardId, targetColumnId, {
        title: trimmed,
        priority: 'MEDIUM',
        parentTaskId: selectedTask.id,
      });
      acceptBoard(updatedBoard);
      setQuickSubtaskTitle('');
    } catch (cause) {
      setSnackbar(errorMessage(cause));
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (st: TaskCard & { isCompleted: boolean; columnName: string }) => {
    if (!board || !boardId) return;
    const completedCol = board.columns.find((c) => c.completed);
    const nonCompletedCol = board.columns.find((c) => !c.completed);
    const targetCol = st.isCompleted ? nonCompletedCol : (completedCol ?? board.columns[board.columns.length - 1]);
    if (!targetCol || targetCol.id === st.columnId) return;

    try {
      const result = moveBoardTask(board, st.id, targetCol.id, 'OFF');
      if (result) {
        setBoard(result.board);
        await moveTask.mutateAsync({
          taskId: result.taskId,
          targetColumnId: result.targetColumnId,
          targetPosition: result.targetPosition,
          version: result.version,
        });
      }
    } catch (cause) {
      setSnackbar(errorMessage(cause));
    }
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
    setColumnCompleted(column.completed);
    setColumnDialog({ mode: 'rename', column });
  };

  const submitColumn = (event: FormEvent) => {
    event.preventDefault();
    if (!board || !columnDialog || !columnName.trim()) return;
    if (columnDialog.mode === 'create') {
      createColumn.mutate({ name: columnName.trim(), completed: columnCompleted, version: board.version });
    } else {
      renameColumn.mutate({
        columnId: columnDialog.column.id,
        name: columnName.trim(),
        completed: columnCompleted,
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
    <Box className={`page-container page-container--wide ${kanbanConfiguration.data?.settings.cardStyle === 'COMPACT' ? 'kanban-view--compact' : ''}`}>
      <PageHeader
        breadcrumbs={selectedProject ? (
          <Breadcrumbs aria-label="Điều hướng bảng Kanban">
            <Link component={RouterLink} to="/projects" underline="hover" color="inherit">Dự án</Link>
            <Link component={RouterLink} to={`/projects/${selectedProject.id}`} underline="hover" color="inherit">
              {selectedProject.name}
            </Link>
            <Typography color="text.primary">{board?.name ?? 'Bảng công việc'}</Typography>
          </Breadcrumbs>
        ) : undefined}
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
                    if (
                      window.confirm(
                        `Xóa bảng “${board.name}”? Bạn chỉ có thể xóa khi bảng không còn công việc.`,
                      )
                    ) {
                      deleteBoard.mutate();
                    }
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
      {board && (
        <KanbanFilterBar
          filters={filters}
          onFilterChange={setFilters}
          assignees={assignableMembers}
        />
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
                wipMode={kanbanConfiguration.data?.settings.wipMode}
                disabled={boardInteractionDisabled}
                canManageColumns={canManageColumns}
                canEditTasks={Boolean(canEditTasks)}
                columnIndex={columnIndex}
                columnCount={orderedColumns.length}
                filters={filters}
                onAdd={(columnId) => openCreateTask(columnId)}
                onQuickAdd={async (columnId, title) => {
                  await quickCreateTask.mutateAsync({ columnId, title });
                }}
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
      {kanbanConfiguration.data?.settings.wipMode === 'WARN' && board?.columns.some(column => column.taskLimit && column.tasks.length > column.taskLimit) &&
        <Alert severity="warning">Một cột đang vượt giới hạn WIP. Bạn vẫn có thể tiếp tục; hãy hoàn thành bớt công việc trước khi nhận thêm.</Alert>}
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
              <PooledTaskFields fields={kanbanConfiguration.data?.settings.fields ?? []} values={newCustomData} onChange={setNewCustomData} />
              <TextField
                label="Hạn hoàn thành"
                type="datetime-local"
                value={taskDueAt}
                onChange={(event) => setTaskDueAt(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <FormControl size="small">
                <InputLabel id="task-priority-label">Mức ưu tiên</InputLabel>
                <Select
                  labelId="task-priority-label"
                  label="Mức ưu tiên"
                  value={taskPriority}
                  onChange={(event) => setTaskPriority(event.target.value as TaskPriority)}
                >
                  {(Object.keys(priorityLabel) as TaskPriority[]).map((priority) => (
                    <MenuItem key={priority} value={priority}>{priorityLabel[priority]}</MenuItem>
                  ))}
                </Select>
              </FormControl>
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
      <Drawer
        anchor="right"
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTaskId(null)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 540, md: 620 },
            p: { xs: 2, sm: 3 },
            boxSizing: 'border-box',
            bgcolor: '#ffffff',
            borderLeft: '1px solid #e2e8f0',
            boxShadow: '-8px 0 32px rgba(15, 23, 42, 0.08)',
          },
        }}
      >
        {selectedTask && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Drawer Header */}
            <Box sx={{ pb: 2, borderBottom: '1px solid #f1f5f9', mb: 2.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Breadcrumbs separator="›" sx={{ fontSize: '0.8125rem' }}>
                  <Typography color="text.secondary" sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                    {board?.name ?? 'Bảng'}
                  </Typography>
                  <Typography color="text.primary" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                    {board?.columns.find((c) => c.id === (detailColumnId || selectedTask.columnId))?.name ?? 'Cột'}
                  </Typography>
                </Breadcrumbs>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Chip
                    label={`#${selectedTask.id.slice(0, 8)}`}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderRadius: 1.5,
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      bgcolor: '#f8fafc',
                      borderColor: '#e2e8f0',
                      color: 'text.secondary',
                    }}
                  />
                  {selectedTask.parentTaskId && (
                    <Chip
                      label="Công việc con"
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ borderRadius: 1.5, fontWeight: 600 }}
                    />
                  )}
                  <IconButton
                    aria-label="Đóng chi tiết"
                    edge="end"
                    size="small"
                    onClick={() => setSelectedTaskId(null)}
                    sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{ color: '#0f172a', mt: 1, wordBreak: 'break-word', lineHeight: 1.3 }}
              >
                {detailTitle || selectedTask.title}
              </Typography>
            </Box>

            {/* Scrollable Content */}
            <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
              <Stack spacing={2.5}>
                {/* Title & Description inputs */}
                <TextField
                  label="Tiêu đề"
                  value={detailTitle}
                  onChange={(event) => setDetailTitle(event.target.value)}
                  disabled={!canEditTasks}
                  required
                  fullWidth
                  size="small"
                  inputProps={{ maxLength: 240 }}
                />
                <TextField
                  label="Mô tả"
                  value={detailDescription}
                  onChange={(event) => setDetailDescription(event.target.value)}
                  disabled={!canEditTasks}
                  multiline
                  minRows={3}
                  fullWidth
                  size="small"
                  placeholder="Thêm mô tả chi tiết cho công việc này..."
                  inputProps={{ maxLength: 10_000 }}
                />

                {/* Metadata Grid Container */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    color="text.secondary"
                    sx={{ mb: 1.5, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}
                  >
                    Thuộc tính công việc
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 1.5,
                    }}
                  >
                    <FormControl fullWidth size="small" disabled={!canEditTasks}>
                      <InputLabel id="detail-column-label">Cột trạng thái</InputLabel>
                      <Select
                        labelId="detail-column-label"
                        label="Cột trạng thái"
                        value={detailColumnId}
                        onChange={(event) => setDetailColumnId(event.target.value as UUID)}
                        sx={{ bgcolor: '#ffffff', borderRadius: 2 }}
                      >
                        {orderedColumns.map((col) => (
                          <MenuItem key={col.id} value={col.id}>
                            {col.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth size="small" disabled={!canEditTasks}>
                      <InputLabel id="detail-assignee-label">Người thực hiện</InputLabel>
                      <Select
                        labelId="detail-assignee-label"
                        label="Người thực hiện"
                        value={detailAssigneeId}
                        onChange={(event) => setDetailAssigneeId(event.target.value as UUID | '')}
                        sx={{ bgcolor: '#ffffff', borderRadius: 2 }}
                      >
                        <MenuItem value="">Chưa giao</MenuItem>
                        {assignableMembers.map((member) => (
                          <MenuItem key={member.userId} value={member.userId}>
                            {member.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth size="small" disabled={!canEditTasks}>
                      <InputLabel id="detail-priority-label">Mức ưu tiên</InputLabel>
                      <Select
                        labelId="detail-priority-label"
                        label="Mức ưu tiên"
                        value={detailPriority}
                        onChange={(event) => setDetailPriority(event.target.value as TaskPriority)}
                        sx={{ bgcolor: '#ffffff', borderRadius: 2 }}
                      >
                        {(Object.keys(priorityLabel) as TaskPriority[]).map((priority) => (
                          <MenuItem key={priority} value={priority}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor: priorityPastelConfig[priority].color,
                                }}
                              />
                              <span>{priorityLabel[priority]}</span>
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      label="Hạn hoàn thành"
                      type="datetime-local"
                      size="small"
                      value={detailDueAt}
                      onChange={(event) => setDetailDueAt(event.target.value)}
                      disabled={!canEditTasks}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      sx={{ bgcolor: '#ffffff', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Box>
                </Paper>

                {/* Custom fields if any */}
                <PooledTaskFields
                  fields={kanbanConfiguration.data?.settings.fields ?? []}
                  values={detailCustomData}
                  onChange={setDetailCustomData}
                  disabled={!canEditTasks}
                />

                {/* Action buttons */}
                {canEditTasks && (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Button
                      variant="contained"
                      disabled={!detailTitle.trim() || updateTask.isPending}
                      onClick={() => updateTask.mutate()}
                      sx={{ px: 2.5, py: 0.75, borderRadius: 2, fontWeight: 600, textTransform: 'none' }}
                    >
                      {updateTask.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
                    </Button>
                    {selectedProject?.role === 'MANAGER' && (
                      <Button
                        color="error"
                        variant="text"
                        startIcon={<DeleteOutline />}
                        disabled={deleteTask.isPending}
                        onClick={() => {
                          if (window.confirm('Xóa mềm công việc này và các subtask trực thuộc?')) {
                            deleteTask.mutate();
                          }
                        }}
                        sx={{ borderRadius: 2, textTransform: 'none' }}
                      >
                        Xóa
                      </Button>
                    )}
                  </Stack>
                )}

                {/* Subtasks Section */}
                {!selectedTask.parentTaskId && (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <TaskAlt color="action" />
                        <Typography variant="h6" fontWeight={700} fontSize="1rem">
                          Công việc con ({completedSubtasksCount}/{totalSubtasksCount})
                        </Typography>
                      </Stack>
                      {canEditTasks && (
                        <Button
                          size="small"
                          startIcon={<Add />}
                          onClick={() => {
                            openCreateTask(selectedTask.columnId, selectedTask.id);
                          }}
                          sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                          Thêm subtask
                        </Button>
                      )}
                    </Stack>

                    {totalSubtasksCount > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Stack direction="row" justifyContent="space-between" mb={0.75} alignItems="center">
                          <Typography variant="caption" color="text.secondary" fontWeight={500}>
                            Tiến độ hoàn thành
                          </Typography>
                          <Typography variant="caption" fontWeight={700} color={subtasksPercent === 100 ? 'success.main' : 'text.primary'}>
                            {subtasksPercent}%
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={subtasksPercent}
                          sx={{ height: 6, borderRadius: 3, bgcolor: '#e2e8f0' }}
                          color={subtasksPercent === 100 ? 'success' : 'primary'}
                        />
                      </Box>
                    )}

                    {/* Quick add subtask input on Enter */}
                    {canEditTasks && (
                      <Box sx={{ mb: 1.5 }}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Thêm công việc con (nhấn Enter để thêm)..."
                          value={quickSubtaskTitle}
                          onChange={(e) => setQuickSubtaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              void handleQuickAddSubtask();
                            }
                          }}
                          disabled={isAddingSubtask}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Add fontSize="small" sx={{ color: 'text.secondary' }} />
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              bgcolor: '#f8fafc',
                            },
                          }}
                        />
                      </Box>
                    )}

                    {/* Subtask checklist with circular checkboxes */}
                    <Stack spacing={1}>
                      {selectedTaskSubtasks.map((st) => (
                        <Paper
                          key={st.id}
                          variant="outlined"
                          sx={{
                            p: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderRadius: 2,
                            bgcolor: st.isCompleted ? '#f8fafc' : '#ffffff',
                            borderColor: '#e2e8f0',
                            transition: 'all 0.15s ease',
                            '&:hover': {
                              bgcolor: 'action.hover',
                              borderColor: 'primary.light',
                            },
                          }}
                        >
                          <Stack direction="row" alignItems="center" gap={1} minWidth={0} flex={1}>
                            <Checkbox
                              size="small"
                              icon={<RadioButtonUnchecked fontSize="small" />}
                              checkedIcon={<CheckCircle fontSize="small" color="success" />}
                              checked={st.isCompleted}
                              onChange={() => void handleToggleSubtask(st)}
                              disabled={!canEditTasks}
                              sx={{ p: 0.5 }}
                            />
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              noWrap
                              onClick={() => openTask(st.id)}
                              sx={{
                                cursor: 'pointer',
                                textDecoration: st.isCompleted ? 'line-through' : 'none',
                                color: st.isCompleted ? 'text.secondary' : 'text.primary',
                                flex: 1,
                                '&:hover': { color: 'primary.main' },
                              }}
                            >
                              {st.title}
                            </Typography>
                          </Stack>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ ml: 1, flexShrink: 0 }}>
                            <Chip
                              size="small"
                              label={st.columnName}
                              color={st.isCompleted ? 'success' : 'default'}
                              variant={st.isCompleted ? 'filled' : 'outlined'}
                              sx={{ height: 22, fontSize: '0.7rem', borderRadius: 1.5 }}
                            />
                            <Chip
                              size="small"
                              label={priorityLabel[st.priority]}
                              className={`priority priority--${st.priority.toLowerCase()}`}
                              sx={{
                                height: 22,
                                fontSize: '0.7rem',
                                borderRadius: 1.5,
                                bgcolor: priorityPastelConfig[st.priority].bg,
                                color: priorityPastelConfig[st.priority].color,
                                border: `1px solid ${priorityPastelConfig[st.priority].border}`,
                              }}
                            />
                          </Stack>
                        </Paper>
                      ))}
                      {totalSubtasksCount === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
                          Chưa có công việc con nào. Nhập tiêu đề ở trên và nhấn Enter để thêm nhanh.
                        </Typography>
                      )}
                    </Stack>
                  </Paper>
                )}

                {/* Resources Section formatted as neat cards with download/open button */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} mb={1.5}>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <AttachFile color="action" />
                      <Box>
                        <Typography variant="h6" fontWeight={700} fontSize="1rem">Tài nguyên</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {attachedResources.length} tệp hoặc liên kết đính kèm
                        </Typography>
                      </Box>
                    </Stack>
                    <Button
                      component={RouterLink}
                      to={`/resources?task=${selectedTask.id}`}
                      size="small"
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      Mở kho tài nguyên
                    </Button>
                  </Stack>
                  {resources.isLoading ? (
                    <SectionLoader />
                  ) : resources.isError ? (
                    <ErrorState message={errorMessage(resources.error)} onRetry={() => void resources.refetch()} />
                  ) : attachedResources.length === 0 ? (
                    <Typography color="text.secondary" variant="body2">
                      Chưa có tài nguyên. Mở kho để gắn file hoặc liên kết vào công việc.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {attachedResources.map((resource) => (
                        <Paper
                          key={resource.id}
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1.5,
                            bgcolor: '#f8fafc',
                            borderColor: '#e2e8f0',
                            transition: 'all 0.15s ease',
                            '&:hover': {
                              bgcolor: '#f1f5f9',
                              borderColor: 'primary.light',
                            },
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={1.25} minWidth={0} flex={1}>
                            <Box
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: 1.5,
                                bgcolor: resource.kind === 'LINK' ? '#eff6ff' : '#f1f5f9',
                                color: resource.kind === 'LINK' ? '#2563eb' : '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {resource.kind === 'LINK' ? <InsertLink fontSize="small" /> : <DescriptionOutlined fontSize="small" />}
                            </Box>
                            <Box minWidth={0} flex={1}>
                              <Typography fontWeight={600} fontSize="0.875rem" noWrap>
                                {resource.fileName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {resource.kind === 'LINK' ? 'Liên kết ngoài' : (resource.contentType || 'Tệp đính kèm')}
                              </Typography>
                            </Box>
                          </Stack>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={resource.kind === 'LINK' ? <OpenInNew fontSize="small" /> : <DownloadOutlined fontSize="small" />}
                            disabled={downloadResource.isPending}
                            onClick={() => downloadResource.mutate(resource.id)}
                            sx={{
                              borderRadius: 1.5,
                              textTransform: 'none',
                              fontWeight: 600,
                              bgcolor: '#ffffff',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {resource.kind === 'LINK' ? 'Mở' : 'Tải về'}
                          </Button>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Paper>

                {/* Custom Capability Fields */}
                {customCapability?.supported && taskCustom.data?.definition && (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
                    <Typography variant="h6" fontWeight={700} fontSize="1rem" gutterBottom>Field mở rộng</Typography>
                    {!customCapability.enabled && (
                      <Alert severity="info" sx={{ mb: 2 }}>Capability đã tắt; dữ liệu hiện có chỉ đọc.</Alert>
                    )}
                    <Stack spacing={1.5}>
                      {taskCustom.data.definition.fields
                        .filter((field) => field.status === 'ACTIVE')
                        .map((field) => field.dataType === 'BOOLEAN' ? (
                          <FormControlLabel
                            key={field.id}
                            label={field.displayName}
                            control={<Checkbox checked={Boolean(customValues[field.id])} />}
                            disabled={!canEditTasks || !customCapability.enabled}
                            onChange={(_, checked) => setCustomValues((current) => ({ ...current, [field.id]: checked }))}
                          />
                        ) : field.dataType === 'SINGLE_SELECT' ? (
                          <FormControl key={field.id} fullWidth size="small" disabled={!canEditTasks || !customCapability.enabled}>
                            <InputLabel>{field.displayName}</InputLabel>
                            <Select
                              label={field.displayName}
                              value={String(customValues[field.id] ?? '')}
                              onChange={(event) => setCustomValues((current) => ({ ...current, [field.id]: event.target.value }))}
                            >
                              {!field.required && <MenuItem value="">Không chọn</MenuItem>}
                              {field.options.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                            </Select>
                          </FormControl>
                        ) : (
                          <TextField
                            key={field.id}
                            label={field.displayName}
                            required={field.required}
                            type={field.dataType === 'NUMBER' ? 'number' : field.dataType === 'DATE' ? 'date' : 'text'}
                            InputLabelProps={field.dataType === 'DATE' ? { shrink: true } : undefined}
                            value={String(customValues[field.id] ?? '')}
                            disabled={!canEditTasks || !customCapability.enabled}
                            onChange={(event) => setCustomValues((current) => ({ ...current, [field.id]: event.target.value }))}
                          />
                        ))}
                      {canEditTasks && customCapability.enabled && (
                        <Button
                          variant="outlined"
                          disabled={saveCustomValues.isPending}
                          onClick={() => saveCustomValues.mutate()}
                          sx={{ alignSelf: 'flex-start', borderRadius: 1.5, textTransform: 'none' }}
                        >
                          Lưu field mở rộng
                        </Button>
                      )}
                    </Stack>
                  </Paper>
                )}

                {/* Approvals */}
                {approvalCapability?.supported && (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                      <Box>
                        <Typography variant="h6" fontWeight={700} fontSize="1rem">Phê duyệt</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {latestApproval
                            ? `${latestApproval.status} · bước ${latestApproval.currentStep}/${latestApproval.steps.length}`
                            : 'Chưa có lượt duyệt.'}
                        </Typography>
                      </Box>
                      {latestApproval && <Chip label={latestApproval.status} color={latestApproval.status === 'APPROVED' ? 'success' : latestApproval.status === 'REJECTED' ? 'error' : 'default'} />}
                    </Stack>
                    <Stack direction="row" spacing={1} mt={2} flexWrap="wrap">
                      {approvalCapability.enabled && canEditTasks && latestApproval && latestApproval.status !== 'PENDING' && (
                        <Button variant="outlined" onClick={() => submitApproval.mutate()} disabled={submitApproval.isPending} sx={{ textTransform: 'none' }}>Gửi duyệt</Button>
                      )}
                      {approvalCapability.enabled && canEditTasks && !latestApproval && (
                        <Button variant="outlined" onClick={() => submitApproval.mutate()} disabled={submitApproval.isPending} sx={{ textTransform: 'none' }}>Gửi duyệt</Button>
                      )}
                      {approvalCapability.enabled && currentUserCanDecide && latestApproval && (
                        <>
                          <Button color="success" variant="contained" disabled={decideApproval.isPending} onClick={() => decideApproval.mutate({ runId: latestApproval.id, decision: 'APPROVED', version: latestApproval.version })} sx={{ textTransform: 'none' }}>Đồng ý</Button>
                          <Button color="error" disabled={decideApproval.isPending} onClick={() => decideApproval.mutate({ runId: latestApproval.id, decision: 'REJECTED', version: latestApproval.version })} sx={{ textTransform: 'none' }}>Từ chối</Button>
                        </>
                      )}
                      {approvalCapability.enabled && latestApproval?.status === 'PENDING' && (latestApproval.submittedBy === session?.user.id || selectedProject?.role === 'MANAGER') && (
                        <Button disabled={withdrawApproval.isPending} onClick={() => withdrawApproval.mutate({ runId: latestApproval.id, version: latestApproval.version })} sx={{ textTransform: 'none' }}>Thu hồi lượt duyệt</Button>
                      )}
                    </Stack>
                  </Paper>
                )}

                <Divider sx={{ my: 1 }} />

                {/* Comments Section with Timeline styling */}
                <Box>
                  <Stack direction="row" alignItems="center" gap={1} mb={2}>
                    <ForumOutlined color="action" />
                    <Typography variant="h6" fontWeight={700} fontSize="1rem">Bình luận trao đổi</Typography>
                  </Stack>
                  {comments.isLoading ? (
                    <SectionLoader />
                  ) : comments.isError ? (
                    <ErrorState message={errorMessage(comments.error)} onRetry={() => void comments.refetch()} />
                  ) : !comments.data?.length ? (
                    <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
                      Chưa có bình luận nào cho công việc này.
                    </Typography>
                  ) : (
                    <Box
                      sx={{
                        position: 'relative',
                        mb: 2.5,
                        pl: 1,
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 16,
                          bottom: 16,
                          left: 20,
                          width: '2px',
                          bgcolor: '#f1f5f9',
                          zIndex: 0,
                        },
                      }}
                    >
                      <Stack spacing={2}>
                        {comments.data.map((comment) => {
                          const canChange = canEditTasks && (
                            selectedProject?.role === 'MANAGER' || comment.authorUserId === session?.user.id
                          );
                          const authorName = memberNameByUserId.get(comment.authorUserId) ?? comment.authorUserId;
                          const initials = authorName
                            .split(' ')
                            .map((n) => n[0])
                            .filter(Boolean)
                            .slice(-2)
                            .join('')
                            .toUpperCase() || 'U';

                          return (
                            <Box key={comment.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                              <Avatar
                                sx={{
                                  width: 32,
                                  height: 32,
                                  fontSize: '0.75rem',
                                  bgcolor: 'primary.main',
                                  color: '#ffffff',
                                  fontWeight: 700,
                                  border: '2px solid #ffffff',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                  flexShrink: 0,
                                }}
                              >
                                {initials}
                              </Avatar>
                              <Paper
                                variant="outlined"
                                sx={{
                                  flex: 1,
                                  p: 1.5,
                                  borderRadius: 2.5,
                                  bgcolor: '#f8fafc',
                                  borderColor: '#e2e8f0',
                                }}
                              >
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                                  <Stack direction="row" alignItems="baseline" spacing={1} flexWrap="wrap">
                                    <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
                                      {authorName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {formatRelativeTime(comment.createdAt)}
                                    </Typography>
                                  </Stack>
                                  {canChange && (
                                    <Stack direction="row">
                                      <IconButton
                                        size="small"
                                        aria-label="Sửa bình luận"
                                        onClick={() => {
                                          setEditingComment(comment);
                                          setEditingCommentBody(comment.body);
                                        }}
                                        sx={{ p: 0.5, color: 'text.secondary' }}
                                      >
                                        <EditOutlined fontSize="small" />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        color="error"
                                        aria-label="Xóa bình luận"
                                        disabled={deleteComment.isPending}
                                        onClick={() => deleteComment.mutate(comment.id)}
                                        sx={{ p: 0.5 }}
                                      >
                                        <DeleteOutline fontSize="small" />
                                      </IconButton>
                                    </Stack>
                                  )}
                                </Stack>
                                <Typography sx={{ whiteSpace: 'pre-wrap', mt: 0.75, color: '#334155' }} variant="body2">
                                  {comment.body}
                                </Typography>
                              </Paper>
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>
                  )}

                  {canEditTasks && (
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: '#ffffff',
                        borderColor: '#e2e8f0',
                      }}
                    >
                      <TextField
                        placeholder="Viết bình luận trao đổi về công việc..."
                        value={commentBody}
                        onChange={(event) => setCommentBody(event.target.value)}
                        multiline
                        minRows={2}
                        fullWidth
                        variant="standard"
                        InputProps={{ disableUnderline: true }}
                        inputProps={{ maxLength: 10_000, style: { fontSize: '0.875rem' } }}
                        sx={{ mb: 1 }}
                      />
                      <Stack direction="row" justifyContent="flex-end">
                        <Button
                          variant="contained"
                          size="small"
                          disabled={!commentBody.trim() || addComment.isPending}
                          onClick={() => addComment.mutate()}
                          sx={{
                            borderRadius: 1.5,
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 2,
                          }}
                        >
                          Gửi bình luận
                        </Button>
                      </Stack>
                    </Paper>
                  )}
                </Box>
              </Stack>
            </Box>
          </Box>
        )}
      </Drawer>
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
            <FormControlLabel
              control={
                <Checkbox
                  checked={columnCompleted}
                  onChange={(event) => setColumnCompleted(event.target.checked)}
                />
              }
              label="Công việc trong cột này được tính là đã hoàn tất"
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
