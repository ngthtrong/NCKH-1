import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { tenantSettingsApi } from '../api/endpoints';
import type { TenantCapability } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { FullPageLoader } from '../components/AsyncState';
import { PageHeader } from '../components/PageHeader';

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
  const [primary, setPrimary] = useState('#4F46E5');
  const [accent, setAccent] = useState('#0EA5E9');
  const [error, setError] = useState('');
  const settings = useQuery({ queryKey: ['tenant-settings'], queryFn: tenantSettingsApi.get });

  useEffect(() => {
    if (!settings.data) return;
    setPrimary(settings.data.branding.primaryColor);
    setAccent(settings.data.branding.accentColor);
  }, [settings.data]);

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
  const saveBranding = useMutation({
    mutationFn: () => tenantSettingsApi.updateBranding(
      primary, accent, settings.data?.branding.version ?? 0,
    ),
    onSuccess: refresh,
    onError: (cause) => setError(message(cause)),
  });
  const uploadLogo = useMutation({
    mutationFn: (file: File) => tenantSettingsApi.uploadLogo(
      file, settings.data?.branding.version ?? 0,
    ),
    onSuccess: refresh,
    onError: (cause) => setError(message(cause)),
  });
  const deleteLogo = useMutation({
    mutationFn: () => tenantSettingsApi.deleteLogo(settings.data?.branding.version ?? 0),
    onSuccess: refresh,
    onError: (cause) => setError(message(cause)),
  });

  if (settings.isLoading) return <FullPageLoader />;
  if (settings.error || !settings.data) return <Alert severity="error">{message(settings.error)}</Alert>;

  const brandingCapability = settings.data.capabilities.find((item) => item.capability === 'BRANDING');
  const submitBranding = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    saveBranding.mutate();
  };
  const selectLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) uploadLogo.mutate(file);
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Tenant configuration"
        title="Tùy chỉnh workspace"
        description="Capability do System Admin cấp và luôn bị giới hạn theo placement."
      />
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {!canManage && <Alert severity="info">Bạn đang xem cấu hình ở chế độ chỉ đọc.</Alert>}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>Capability</Typography>
              <Stack spacing={1.5}>
                {settings.data.capabilities.map((item) => (
                  <Box key={item.capability} display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                    <Box>
                      <Typography fontWeight={700}>{labels[item.capability]}</Typography>
                      <Stack direction="row" spacing={1} mt={0.5}>
                        <Chip size="small" label={item.supported ? 'Placement hỗ trợ' : 'Ngoài giới hạn placement'} />
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
            <CardContent component="form" onSubmit={submitBranding}>
              <Typography variant="h6" gutterBottom>Branding theo tenant</Typography>
              <Stack spacing={2}>
                <TextField
                  label="Màu chính"
                  type="color"
                  value={primary}
                  onChange={(event) => setPrimary(event.target.value.toUpperCase())}
                  disabled={!canManage || !brandingCapability?.enabled}
                />
                <TextField
                  label="Màu nhấn"
                  type="color"
                  value={accent}
                  onChange={(event) => setAccent(event.target.value.toUpperCase())}
                  disabled={!canManage || !brandingCapability?.enabled}
                />
                {settings.data.branding.logoUrl && (
                  <Box component="img" src={settings.data.branding.logoUrl} alt="Logo tenant" sx={{ maxWidth: 180, maxHeight: 80, objectFit: 'contain' }} />
                )}
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button type="submit" variant="contained" disabled={!canManage || !brandingCapability?.enabled || saveBranding.isPending}>Lưu màu sắc</Button>
                  <Button component="label" variant="outlined" disabled={!canManage || !brandingCapability?.enabled || uploadLogo.isPending}>
                    Tải logo
                    <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={selectLogo} />
                  </Button>
                  {settings.data.branding.logoUrl && <Button color="error" onClick={() => deleteLogo.mutate()} disabled={!canManage || deleteLogo.isPending}>Xóa logo</Button>}
                </Stack>
                <Typography variant="caption" color="text.secondary">PNG, JPEG hoặc WebP, tối đa 2 MiB. HTML, CSS và JavaScript không được chấp nhận.</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
