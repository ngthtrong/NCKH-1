import { DeleteOutline, DownloadOutlined, InsertDriveFileOutlined, Upload } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type ChangeEvent } from 'react';
import { errorMessage } from '../api/client';
import { resourcesApi } from '../api/endpoints';
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

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) upload.mutate(file);
    event.target.value = '';
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
          <>
            <input ref={inputRef} type="file" hidden onChange={chooseFile} />
            <Button
              variant="contained"
              startIcon={<Upload />}
              onClick={() => inputRef.current?.click()}
              disabled={upload.isPending}
            >
              {upload.isPending ? 'Đang tải…' : 'Tải tệp lên'}
            </Button>
          </>
        }
      />
      {feedback && (
        <Alert severity={feedback.endsWith('thành công.') ? 'success' : 'error'} onClose={() => setFeedback(null)} sx={{ mb: 2 }}>
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
                  <InsertDriveFileOutlined />
                </Box>
                <Box minWidth={0} flex={1}>
                  <Typography fontWeight={700} noWrap title={item.fileName}>
                    {item.fileName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatBytes(item.sizeBytes)} · {item.uploadedBy.displayName} ·{' '}
                    {new Intl.DateTimeFormat('vi-VN').format(new Date(item.uploadedAt))}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" display={{ xs: 'none', md: 'block' }}>
                  {item.taskCount} liên kết công việc
                </Typography>
                <Button
                  size="small"
                  startIcon={<DownloadOutlined />}
                  onClick={() => download.mutate(item.id)}
                  disabled={download.isPending}
                >
                  Tải xuống
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
    </Box>
  );
}
