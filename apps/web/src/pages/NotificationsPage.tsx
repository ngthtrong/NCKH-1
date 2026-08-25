import {
  Check,
  CommentOutlined,
  GroupAddOutlined,
  NotificationsOutlined,
  TaskAltOutlined,
} from '@mui/icons-material';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { notificationsApi } from '../api/endpoints';
import type { NotificationItem } from '../api/types';
import { EmptyState, ErrorState, SectionLoader } from '../components/AsyncState';
import { PageHeader } from '../components/PageHeader';

const icons = {
  TASK: <TaskAltOutlined />,
  COMMENT: <CommentOutlined />,
  MEMBERSHIP: <GroupAddOutlined />,
  SYSTEM: <NotificationsOutlined />,
};

function relativeTime(value: string): string {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
  if (Math.abs(seconds) < 60) return 'vừa xong';
  if (Math.abs(seconds) < 3600) return formatter.format(Math.round(seconds / 60), 'minute');
  if (Math.abs(seconds) < 86_400) return formatter.format(Math.round(seconds / 3600), 'hour');
  return formatter.format(Math.round(seconds / 86_400), 'day');
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: notificationsApi.list });
  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData<NotificationItem[]>(['notifications']);
      queryClient.setQueryData<NotificationItem[]>(['notifications'], (items = []) =>
        items.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)),
      );
      return { previous };
    },
    onError: (_error, _id, context) =>
      queryClient.setQueryData(['notifications'], context?.previous),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const openNotification = (item: NotificationItem) => {
    if (!item.readAt) markRead.mutate(item.id);
    if (item.actionUrl?.startsWith('/') && !item.actionUrl.startsWith('//')) {
      const target = new URL(item.actionUrl, window.location.origin);
      if (target.origin === window.location.origin) {
        navigate(`${target.pathname}${target.search}${target.hash}`);
      }
    }
  };
  const unread = notifications.data?.filter((item) => !item.readAt).length ?? 0;

  return (
    <Box className="page-container page-container--narrow">
      <PageHeader
        eyebrow="Hộp thư"
        title="Thông báo"
        description={`${unread} thông báo chưa đọc trong không gian này.`}
        actions={
          unread ? (
            <Button startIcon={<Check />} onClick={() => markAll.mutate()} disabled={markAll.isPending}>
              Đánh dấu tất cả đã đọc
            </Button>
          ) : undefined
        }
      />
      {markAll.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(markAll.error)}</Alert>}
      <Paper variant="outlined" className="notification-panel">
        {notifications.isLoading ? (
          <SectionLoader />
        ) : notifications.isError ? (
          <ErrorState
            message={errorMessage(notifications.error)}
            onRetry={() => void notifications.refetch()}
          />
        ) : !notifications.data?.length ? (
          <EmptyState
            title="Bạn đã xem hết"
            description="Thông báo về công việc, bình luận và thành viên sẽ xuất hiện tại đây."
          />
        ) : (
          <Stack>
            {notifications.data.map((item) => (
              <Box
                component="button"
                type="button"
                className={`notification-row ${item.readAt ? '' : 'notification-row--unread'}`}
                key={item.id}
                onClick={() => openNotification(item)}
              >
                <Box className={`notification-icon notification-icon--${item.type.toLowerCase()}`}>
                  {icons[item.type]}
                </Box>
                <Box flex={1} minWidth={0} textAlign="left">
                  <Stack direction="row" justifyContent="space-between" gap={2}>
                    <Typography fontWeight={item.readAt ? 600 : 750}>{item.title}</Typography>
                    <Typography variant="caption" color="text.secondary" whiteSpace="nowrap">
                      {relativeTime(item.createdAt)}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" mt={0.25}>
                    {item.message}
                  </Typography>
                </Box>
                {!item.readAt && <span className="unread-dot" aria-label="Chưa đọc" />}
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
