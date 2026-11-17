import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { tenantSettingsApi } from '../api/endpoints';
import type { TenantCapability } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { FullPageLoader } from '../components/AsyncState';
import { PageHeader } from '../components/PageHeader';
import { KanbanConfigurationPanel } from '../components/KanbanConfigurationPanel';
import { TenantBrandingPanel } from '../components/TenantBrandingPanel';

const labels: Record<TenantCapability, string> = {
  BRANDING: 'Nhận diện giao diện',
  CUSTOM_DATA: 'Bảng và field mở rộng',
  APPROVALS: 'Phê duyệt nhiều bước',
  AUTOMATION: 'Tự động hóa hữu hạn',
};

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Không thể lưu cấu hình tenant.';
}

export function TenantSettingsPage() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const canManage = ['OWNER', 'ADMIN'].includes(session?.activeTenant?.role ?? '');
  const [error, setError] = useState('');
  const settings = useQuery({ queryKey: ['tenant-settings'], queryFn: tenantSettingsApi.get });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
  };
  const toggle = useMutation({
    mutationFn: ({ capability, enabled, version }: {
      capability: TenantCapability; enabled: boolean; version: number;
    }) => tenantSettingsApi.setEnabled(capability, enabled, version),
    onSuccess: refresh,
    onError: (cause) => setError(message(cause)),
  });
  if (settings.isLoading) return <FullPageLoader />;
  if (settings.error || !settings.data) return <Alert severity="error">{message(settings.error)}</Alert>;

  return (
    <Stack spacing={3} className="page-container">
      <PageHeader
        eyebrow="Tenant configuration"
        title="Tùy chỉnh workspace"
        description="Quản lý nhận diện, quy trình Kanban và thông tin riêng của tổ chức."
      />
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {!canManage && <Alert severity="info">Bạn đang xem cấu hình ở chế độ chỉ đọc.</Alert>}
      <KanbanConfigurationPanel canManage={canManage} />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>Tính năng workspace</Typography>
              <Stack spacing={1.5}>
                {settings.data.capabilities.filter((item) => item.supported).map((item) => (
                  <Box key={item.capability} display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                    <Box>
                      <Typography fontWeight={700}>{labels[item.capability]}</Typography>
                      <Stack direction="row" spacing={1} mt={0.5}>
                        <Chip size="small" color={item.granted ? 'success' : 'default'} label={item.granted ? 'Đã cấp' : 'Chưa cấp'} />
                      </Stack>
                    </Box>
                    <FormControlLabel
                      control={<Switch checked={item.enabled} />}
                      label={item.enabled ? 'Bật' : 'Tắt'}
                      disabled={!canManage || !item.supported || !item.granted || toggle.isPending}
                      onChange={(_, enabled) => toggle.mutate({
                        capability: item.capability, enabled, version: item.version,
                      })}
                    />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <TenantBrandingPanel canManage={canManage} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
