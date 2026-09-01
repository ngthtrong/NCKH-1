import {
  AttachFile,
  DeleteOutline,
  DownloadOutlined,
  InsertDriveFileOutlined,
  LinkOutlined,
  Upload,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { errorMessage } from '../api/client';
import { boardsApi, projectsApi, resourcesApi } from '../api/endpoints';
import type { ResourceItem } from '../api/types';
import { EmptyState, ErrorState, SectionLoader } from '../components/AsyncState';
import { PageHeader } from '../components/PageHeader';

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let amount = value / 1024;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount.toFixed(amount >= 10 ? 1 : 2)} ${units[unit]}`;
}

export function ResourcesPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [attachTarget, setAttachTarget] = useState<ResourceItem | null>(null);
  const resources = useQuery({ queryKey: ['resources'], queryFn: resourcesApi.list });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['resources'] });
  const upload = useMutation({
    mutationFn: resourcesApi.upload,
    onSuccess: async () => {
      setFeedback('Tải tệp lên thành công.');
      await refresh();
    },
    onError: (cause) => setFeedback(errorMessage(cause)),
  });
  const remove = useMutation({
    mutationFn: resourcesApi.remove,
    onSuccess: () => void refresh(),
    onError: (cause) => setFeedback(errorMessage(cause)),
  });
  const download = useMutation({
    mutationFn: resourcesApi.downloadUrl,
    onSuccess: ({ url }) => window.open(url, '_blank', 'noopener,noreferrer'),
    onError: (cause) => setFeedback(errorMessage(cause)),
  });
  const createLink = useMutation({
    mutationFn: () => resourcesApi.createLink(linkName.trim(), linkUrl.trim()),
    onSuccess: async () => {
      setLinkOpen(false);
      setLinkName('');
      setLinkUrl('');
      setFeedback('Đã tạo liên kết tài nguyên.');
      await refresh();
    },
    onError: (cause) => setFeedback(errorMessage(cause)),
  });
  const taskOptions = useQuery({
    queryKey: ['resource-task-options'],
    enabled: Boolean(attachTarget),
    queryFn: async () => {
      const projects = (await projectsApi.list()).filter(
        (project) => project.status === 'ACTIVE' && project.role !== 'VIEWER',
      );
      const boardGroups = await Promise.all(projects.map(async (project) => ({
        project,
        boards: await boardsApi.list(project.id),
      })));
      const boardDetails = await Promise.all(boardGroups.flatMap(({ project, boards }) =>
        boards.map(async (summary) => ({ project, board: await boardsApi.get(summary.id) }))));
      return boardDetails.flatMap(({ project, board }) => board.columns.flatMap((column) =>
        column.tasks.map((task) => ({
          id: task.id,
          label: `${project.name} · ${board.name} · ${task.title}`,
        }))));
    },
  });
  const toggleAttachment = useMutation({
    mutationFn: ({ resourceId, taskId, attached }: {
      resourceId: string;
      taskId: string;
      attached: boolean;
    }) => attached
      ? resourcesApi.detach(resourceId, taskId)
      : resourcesApi.attach(resourceId, taskId),
    onSuccess: async () => {
      await refresh();
      const updated = queryClient.getQueryData<Awaited<ReturnType<typeof resourcesApi.list>>>(['resources'])
        ?.items.find((item) => item.id === attachTarget?.id);
      if (updated) setAttachTarget(updated);
    },
    onError: (cause) => setFeedback(errorMessage(cause)),
  });

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) upload.mutate(file);
    event.target.value = '';
  };
  const submitLink = (event: FormEvent) => {
    event.preventDefault();
    if (linkName.trim() && linkUrl.trim()) createLink.mutate();
  };
  const removeResource = (item: ResourceItem) => {
    if (window.confirm(`Xóa tài nguyên “${item.fileName}”? Liên kết từ công việc cũng sẽ bị gỡ.`)) {
      remove.mutate(item.id);
    }
  };

  const quota = resources.data?.quota;
  const quotaPercent = quota ? Math.min(100, (quota.usedBytes / quota.limitBytes) * 100) : 0;
  return (
    <Box className="page-container">
      <PageHeader
        eyebrow="Tệp dùng chung"
        title="Tài nguyên"
        description="Tệp được lưu trong namespace riêng của tenant và tải xuống qua URL có thời hạn."
        actions={
          <Stack direction="row" spacing={1}>
            <input ref={inputRef} type="file" hidden onChange={chooseFile} />
            <Button variant="outlined" startIcon={<LinkOutlined />} onClick={() => setLinkOpen(true)}>
              Thêm liên kết
            </Button>
            <Button
              variant="contained"
              startIcon={<Upload />}
              onClick={() => inputRef.current?.click()}
              disabled={upload.isPending}
            >
              {upload.isPending ? 'Đang tải…' : 'Tải tệp lên'}
            </Button>
          </Stack>
        }
      />
      {feedback && (
        <Alert severity={feedback.startsWith('Đã') || feedback.endsWith('thành công.') ? 'success' : 'error'} onClose={() => setFeedback(null)} sx={{ mb: 2 }}>
          {feedback}
        </Alert>
      )}
      {quota && (
        <Paper variant="outlined" className="quota-card">
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
            <Box>
              <Typography fontWeight={700}>Dung lượng tenant</Typography>
              <Typography variant="body2" color="text.secondary">
                Đã dùng {formatBytes(quota.usedBytes)} / {formatBytes(quota.limitBytes)}
              </Typography>
            </Box>
            <Typography fontWeight={700}>{quotaPercent.toFixed(1)}%</Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={quotaPercent}
            color={quotaPercent > 90 ? 'error' : quotaPercent > 75 ? 'warning' : 'primary'}
            sx={{ mt: 1.5 }}
          />
        </Paper>
      )}
      <Paper className="panel" variant="outlined">
        {resources.isLoading ? (
          <SectionLoader />
        ) : resources.isError ? (
          <ErrorState message={errorMessage(resources.error)} onRetry={() => void resources.refetch()} />
        ) : !resources.data?.items.length ? (
          <EmptyState
            title="Chưa có tài nguyên"
            description="Tải tệp đầu tiên lên để chia sẻ với các công việc trong tenant."
            action={<Button onClick={() => inputRef.current?.click()}>Chọn tệp</Button>}
          />
        ) : (
          <Box className="resource-list">
            {resources.data.items.map((item) => (
              <Box className="resource-row" key={item.id}>
                <Box className="file-icon">
                  {item.kind === 'LINK' ? <LinkOutlined /> : <InsertDriveFileOutlined />}
                </Box>
                <Box minWidth={0} flex={1}>
                  <Typography fontWeight={700} noWrap title={item.fileName}>
                    {item.fileName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.kind === 'LINK' ? 'Liên kết' : formatBytes(item.sizeBytes)} · {item.uploadedBy.displayName} ·{' '}
                    {new Intl.DateTimeFormat('vi-VN').format(new Date(item.uploadedAt))}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" display={{ xs: 'none', md: 'block' }}>
                  {item.taskCount} liên kết công việc
                </Typography>
                <Button
                  size="small"
                  startIcon={item.kind === 'LINK' ? <LinkOutlined /> : <DownloadOutlined />}
                  onClick={() => download.mutate(item.id)}
                  disabled={download.isPending}
                >
                  {item.kind === 'LINK' ? 'Mở' : 'Tải xuống'}
                </Button>
                <Button
                  size="small"
                  startIcon={<AttachFile />}
                  onClick={() => setAttachTarget(item)}
                >
                  Gắn task
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteOutline />}
                  onClick={() => removeResource(item)}
                  disabled={remove.isPending}
                >
                  Xóa
                </Button>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
      <Dialog open={linkOpen} onClose={() => setLinkOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={submitLink}>
          <DialogTitle>Thêm liên kết tài nguyên</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <TextField
                label="Tên liên kết"
                value={linkName}
                onChange={(event) => setLinkName(event.target.value)}
                required
                inputProps={{ maxLength: 255 }}
              />
              <TextField
                label="URL HTTP(S)"
                type="url"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                required
                inputProps={{ maxLength: 2_000 }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLinkOpen(false)}>Hủy</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!linkName.trim() || !linkUrl.trim() || createLink.isPending}
            >
              Tạo liên kết
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog open={Boolean(attachTarget)} onClose={() => setAttachTarget(null)} fullWidth maxWidth="md">
        <DialogTitle>Gắn “{attachTarget?.fileName}” với công việc</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" mb={1}>
            Một tài nguyên có thể dùng lại cho nhiều công việc trong các dự án bạn được phép sửa.
          </Typography>
          {taskOptions.isLoading ? (
            <SectionLoader />
          ) : taskOptions.isError ? (
            <ErrorState message={errorMessage(taskOptions.error)} onRetry={() => void taskOptions.refetch()} />
          ) : !taskOptions.data?.length ? (
            <EmptyState title="Chưa có công việc phù hợp" description="Tạo công việc trong một dự án đang hoạt động trước." />
          ) : (
            <Stack>
              {taskOptions.data.map((task) => {
                const attached = attachTarget?.taskIds.includes(task.id) ?? false;
                return (
                  <FormControlLabel
                    key={task.id}
                    control={(
                      <Checkbox
                        checked={attached}
                        disabled={toggleAttachment.isPending}
                        onChange={() => attachTarget && toggleAttachment.mutate({
                          resourceId: attachTarget.id,
                          taskId: task.id,
                          attached,
                        })}
                      />
                    )}
                    label={task.label}
                  />
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setAttachTarget(null)}>Đóng</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
