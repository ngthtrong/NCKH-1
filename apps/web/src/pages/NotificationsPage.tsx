import {
  Check,
  CommentOutlined,
  DeleteOutline,
  GroupAddOutlined,
  NotificationsOutlined,
  SettingsOutlined,
  TaskAltOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [endpoint, setEndpoint] = useState('');
  const [p256dh, setP256dh] = useState('');
  const [authSecret, setAuthSecret] = useState('');
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: notificationsApi.list });
  const preferences = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: notificationsApi.preferences,
    enabled: settingsOpen,
  });
  const subscriptions = useQuery({
    queryKey: ['push-subscriptions'],
    queryFn: notificationsApi.pushSubscriptions,
    enabled: settingsOpen,
  });
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
  const updatePreferences = useMutation({
    mutationFn: notificationsApi.updatePreferences,
    onSuccess: (updated) => queryClient.setQueryData(['notification-preferences'], updated),
  });
  const addSubscription = useMutation({
    mutationFn: notificationsApi.addPushSubscription,
    onSuccess: async () => {
      setEndpoint('');
      setP256dh('');
      setAuthSecret('');
      await queryClient.invalidateQueries({ queryKey: ['push-subscriptions'] });
    },
  });
  const removeSubscription = useMutation({
    mutationFn: notificationsApi.removePushSubscription,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['push-subscriptions'] }),
  });

  const submitSubscription = (event: FormEvent) => {
    event.preventDefault();
    if (endpoint.trim() && p256dh.trim() && authSecret.trim()) {
      addSubscription.mutate({ endpoint: endpoint.trim(), p256dh: p256dh.trim(), auth: authSecret.trim() });
    }
  };

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
          <Stack direction="row" spacing={1}>
            {Boolean(unread) && (
              <Button startIcon={<Check />} onClick={() => markAll.mutate()} disabled={markAll.isPending}>
                Đánh dấu tất cả đã đọc
              </Button>
            )}
            <Button startIcon={<SettingsOutlined />} onClick={() => setSettingsOpen(true)}>
              Tùy chọn
            </Button>
          </Stack>
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
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Tùy chọn thông báo</DialogTitle>
        <DialogContent>
          {preferences.isLoading ? (
            <SectionLoader />
          ) : preferences.isError ? (
            <ErrorState message={errorMessage(preferences.error)} onRetry={() => void preferences.refetch()} />
          ) : preferences.data ? (
            <Stack spacing={1} mb={3}>
              <FormControlLabel
                control={<Switch checked disabled />}
                label="Trong ứng dụng (bắt buộc cho sự kiện cốt lõi)"
              />
              <FormControlLabel
                control={(
                  <Switch
                    checked={preferences.data.emailEnabled}
                    disabled={updatePreferences.isPending}
                    onChange={(event) => updatePreferences.mutate({
                      ...preferences.data,
                      inAppEnabled: true,
                      emailEnabled: event.target.checked,
                    })}
                  />
                )}
                label="Email qua adapter local"
              />
              <FormControlLabel
                control={(
                  <Switch
                    checked={preferences.data.webPushEnabled}
                    disabled={updatePreferences.isPending}
                    onChange={(event) => updatePreferences.mutate({
                      ...preferences.data,
                      inAppEnabled: true,
                      webPushEnabled: event.target.checked,
                    })}
                  />
                )}
                label="Web Push"
              />
            </Stack>
          ) : null}
          {(updatePreferences.isError || addSubscription.isError || removeSubscription.isError) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage(updatePreferences.error ?? addSubscription.error ?? removeSubscription.error)}
            </Alert>
          )}
          <Typography variant="h6">Đăng ký Push local/test</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Lưu subscription để kiểm tra contract. Gửi VAPID thật vẫn tạm dừng cho đến khi có HTTPS và credential.
          </Typography>
          <Box component="form" onSubmit={submitSubscription}>
            <Stack spacing={1.5}>
              <TextField
                label="Endpoint HTTPS"
                type="url"
                value={endpoint}
                onChange={(event) => setEndpoint(event.target.value)}
                required
              />
              <TextField
                label="p256dh"
                value={p256dh}
                onChange={(event) => setP256dh(event.target.value)}
                required
              />
              <TextField
                label="Auth secret"
                type="password"
                value={authSecret}
                onChange={(event) => setAuthSecret(event.target.value)}
                required
              />
              <Button
                type="submit"
                variant="outlined"
                disabled={!endpoint.trim() || !p256dh.trim() || !authSecret.trim() || addSubscription.isPending}
                sx={{ alignSelf: 'flex-start' }}
              >
                Lưu subscription
              </Button>
            </Stack>
          </Box>
          <Stack spacing={1} mt={2}>
            {(subscriptions.data ?? []).map((subscription) => (
              <Paper key={subscription.id} variant="outlined" sx={{ p: 1.25 }}>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Typography variant="body2" noWrap title={subscription.endpoint} flex={1}>
                    {subscription.endpoint}
                  </Typography>
                  <IconButton
                    size="small"
                    color="error"
                    aria-label="Xóa push subscription"
                    disabled={removeSubscription.isPending}
                    onClick={() => removeSubscription.mutate(subscription.id)}
                  >
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setSettingsOpen(false)}>Đóng</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
