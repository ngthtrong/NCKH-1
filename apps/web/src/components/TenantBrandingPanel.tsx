import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { tenantSettingsApi } from '../api/endpoints';

export function TenantBrandingPanel({ canManage, compact = false }: { canManage: boolean; compact?: boolean }) {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ['tenant-settings'], queryFn: tenantSettingsApi.get });
  const [primary, setPrimary] = useState('#4F46E5');
  const [accent, setAccent] = useState('#0EA5E9');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!settings.data) return;
    setPrimary(settings.data.branding.primaryColor);
    setAccent(settings.data.branding.accentColor);
  }, [settings.data]);

  const refresh = async () => {
    setSaved(true);
    await queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
  };
  const onError = (cause: unknown) => setError(cause instanceof Error ? cause.message : 'Không thể lưu nhận diện tổ chức.');
  const save = useMutation({
    mutationFn: () => tenantSettingsApi.updateBranding(primary, accent, settings.data!.branding.version),
    onSuccess: refresh, onError,
  });
  const upload = useMutation({
    mutationFn: (file: File) => tenantSettingsApi.uploadLogo(file, settings.data!.branding.version),
    onSuccess: refresh, onError,
  });
  const remove = useMutation({
    mutationFn: () => tenantSettingsApi.deleteLogo(settings.data!.branding.version),
    onSuccess: refresh, onError,
  });

  if (settings.isLoading) return <Typography role="status">Đang tải nhận diện tổ chức…</Typography>;
  if (settings.error || !settings.data) return <Alert severity="error">Không tải được nhận diện tổ chức.</Alert>;
  const capability = settings.data.capabilities.find((item) => item.capability === 'BRANDING');
  const enabled = Boolean(capability?.supported && capability.granted && capability.enabled);
  const busy = save.isPending || upload.isPending || remove.isPending;
  const disabled = !canManage || !enabled || busy;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (disabled) return;
    setError(''); setSaved(false); save.mutate();
  };
  const selectLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && !disabled) { setError(''); setSaved(false); upload.mutate(file); }
    event.target.value = '';
  };

  return <Box component="form" onSubmit={submit} className={compact ? 'tenant-branding-panel' : undefined}>
    <Stack spacing={compact ? 1.5 : 2}>
      <Box>
        <Typography variant="h6" component="h2">Nhận diện tổ chức</Typography>
        {!compact && <Typography variant="body2" color="text.secondary">Chọn màu chủ đạo cho không gian làm việc này.</Typography>}
      </Box>
      {!enabled && <Alert severity="info">Tính năng nhận diện cần được cấp và bật trong cài đặt workspace.</Alert>}
      <Stack direction="row" spacing={2}>
        <TextField label="Màu chính" type="color" value={primary} fullWidth
          onChange={(event) => { setPrimary(event.target.value.toUpperCase()); setSaved(false); }} disabled={disabled}
          helperText={primary.toUpperCase()} />
        <TextField label="Màu nhấn" type="color" value={accent} fullWidth
          onChange={(event) => { setAccent(event.target.value.toUpperCase()); setSaved(false); }} disabled={disabled}
          helperText={accent.toUpperCase()} />
      </Stack>
      {settings.data.branding.logoUrl && <Box component="img" src={settings.data.branding.logoUrl} alt="Logo tenant" sx={{ maxWidth: 180, maxHeight: 80, objectFit: 'contain' }} />}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button type="submit" variant="contained" disabled={disabled}>{save.isPending ? 'Đang lưu…' : 'Lưu màu sắc'}</Button>
        {!compact && <>
          <Button component="label" variant="outlined" disabled={disabled}>Tải logo
            <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={selectLogo} />
          </Button>
          {settings.data.branding.logoUrl && <Button color="error" disabled={disabled} onClick={() => { setError(''); setSaved(false); remove.mutate(); }}>Xóa logo</Button>}
        </>}
      </Stack>
      {!compact && <Typography variant="caption" color="text.secondary">PNG, JPEG hoặc WebP, tối đa 2 MiB. HTML, CSS và JavaScript không được chấp nhận.</Typography>}
      {error && <Alert severity="error">{error}</Alert>}
      {saved && <Alert severity="success">Đã lưu nhận diện tổ chức.</Alert>}
    </Stack>
  </Box>;
}
