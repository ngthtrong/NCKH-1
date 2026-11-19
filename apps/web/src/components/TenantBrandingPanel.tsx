import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import ViewKanbanOutlined from '@mui/icons-material/ViewKanbanOutlined';
import {
  Alert,
  alpha,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { tenantSettingsApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import { formatTenantHost } from '../utils/tenantHost';

export function TenantBrandingPanel({ canManage, compact = false }: { canManage: boolean; compact?: boolean }) {
  const queryClient = useQueryClient();
  const { session, currentTenant } = useAuth();
  const tenant = currentTenant ?? session?.activeTenant;
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
    await queryClient.invalidateQueries({ queryKey: ['current-tenant'] });
  };
  const onError = (cause: unknown) => setError(cause instanceof Error ? cause.message : 'Không thể lưu nhận diện tổ chức.');
  const save = useMutation({
    mutationFn: () => tenantSettingsApi.updateBranding(primary, accent, settings.data!.branding.version),
    onSuccess: refresh,
    onError,
  });
  const upload = useMutation({
    mutationFn: (file: File) => tenantSettingsApi.uploadLogo(file, settings.data!.branding.version),
    onSuccess: refresh,
    onError,
  });
  const remove = useMutation({
    mutationFn: () => tenantSettingsApi.deleteLogo(settings.data!.branding.version),
    onSuccess: refresh,
    onError,
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
    setError('');
    setSaved(false);
    save.mutate();
  };

  const selectLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && !disabled) {
      setError('');
      setSaved(false);
      upload.mutate(file);
    }
    event.target.value = '';
  };

  const tenantName = tenant?.name ?? 'Tổ chức của bạn';
  const tenantSlug = tenant?.slug ?? 'workspace';

  if (compact) {
    return (
      <Box component="form" onSubmit={submit} className="tenant-branding-panel">
        <Stack spacing={1.5}>
          <Typography variant="h6" component="h2">Nhận diện tổ chức</Typography>
          {!enabled && <Alert severity="info">Tính năng nhận diện cần được cấp và bật trong cài đặt workspace.</Alert>}
          <Stack direction="row" spacing={2}>
            <TextField
              label="Màu chính"
              type="color"
              value={primary}
              fullWidth
              onChange={(event) => { setPrimary(event.target.value.toUpperCase()); setSaved(false); }}
              disabled={disabled}
              helperText={primary.toUpperCase()}
            />
            <TextField
              label="Màu nhấn"
              type="color"
              value={accent}
              fullWidth
              onChange={(event) => { setAccent(event.target.value.toUpperCase()); setSaved(false); }}
              disabled={disabled}
              helperText={accent.toUpperCase()}
            />
          </Stack>
          {settings.data.branding.logoUrl && (
            <Box component="img" src={settings.data.branding.logoUrl} alt="Logo tenant" sx={{ maxWidth: 180, maxHeight: 80, objectFit: 'contain' }} />
          )}
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button type="submit" variant="contained" disabled={disabled}>
              {save.isPending ? 'Đang lưu…' : 'Lưu màu sắc'}
            </Button>
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
          {saved && <Alert severity="success">Đã lưu nhận diện tổ chức.</Alert>}
        </Stack>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={submit}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Màu sắc & Biểu trưng thương hiệu
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    Tùy chỉnh bảng màu đại diện cho không gian làm việc. Các thành viên trong tổ chức sẽ thấy màu sắc này khi đăng nhập.
                  </Typography>
                </Box>

                {!enabled && (
                  <Alert severity="info">
                    Tính năng nhận diện cần được cấp và bật trong cài đặt không gian làm việc.
                  </Alert>
                )}

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Màu chủ đạo (Primary)"
                    type="color"
                    value={primary}
                    fullWidth
                    onChange={(event) => {
                      setPrimary(event.target.value.toUpperCase());
                      setSaved(false);
                    }}
                    disabled={disabled}
                    helperText={`Mã màu: ${primary.toUpperCase()}`}
                  />
                  <TextField
                    label="Màu nhấn (Accent)"
                    type="color"
                    value={accent}
                    fullWidth
                    onChange={(event) => {
                      setAccent(event.target.value.toUpperCase());
                      setSaved(false);
                    }}
                    disabled={disabled}
                    helperText={`Mã màu: ${accent.toUpperCase()}`}
                  />
                </Stack>

                <Box sx={{ pt: 1, borderTop: '1px solid #f1f5f9' }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Biểu trưng tổ chức (Logo)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                    Định dạng PNG, JPEG hoặc WebP, dung lượng tối đa 2 MiB.
                  </Typography>
                  {settings.data.branding.logoUrl && (
                    <Box
                      sx={{
                        p: 1.5,
                        mb: 1.5,
                        borderRadius: 2,
                        border: '1px solid #e2e8f0',
                        bgcolor: '#f8fafc',
                        display: 'inline-block',
                      }}
                    >
                      <Box
                        component="img"
                        src={settings.data.branding.logoUrl}
                        alt="Logo tenant"
                        sx={{ maxWidth: 180, maxHeight: 60, objectFit: 'contain', display: 'block' }}
                      />
                    </Box>
                  )}
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Button
                      component="label"
                      variant="outlined"
                      size="small"
                      startIcon={<CloudUploadOutlined />}
                      disabled={disabled}
                    >
                      {settings.data.branding.logoUrl ? 'Thay đổi Logo' : 'Tải lên Logo'}
                      <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={selectLogo} />
                    </Button>
                    {settings.data.branding.logoUrl && (
                      <Button
                        color="error"
                        size="small"
                        startIcon={<DeleteOutline />}
                        disabled={disabled}
                        onClick={() => {
                          setError('');
                          setSaved(false);
                          remove.mutate();
                        }}
                      >
                        Xóa logo
                      </Button>
                    )}
                  </Stack>
                </Box>

                {error && <Alert severity="error">{error}</Alert>}
                {saved && (
                  <Alert severity="success" icon={<CheckCircleOutline fontSize="inherit" />}>
                    Đã lưu và cập nhật nhận diện tổ chức thành công.
                  </Alert>
                )}

                <Box sx={{ pt: 1 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={disabled}
                    sx={{
                      bgcolor: primary,
                      '&:hover': { bgcolor: primary },
                      boxShadow: 'none',
                      fontWeight: 600,
                    }}
                  >
                    {save.isPending ? 'Đang lưu…' : 'Lưu nhận diện'}
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 3,
              bgcolor: '#f8fafc',
              border: '1px solid #e2e8f0',
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Xem trước trực tiếp
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Hình ảnh không gian làm việc sau khi lưu cấu hình nhận diện.
              </Typography>

              {/* Miniature Workspace Card */}
              <Box
                sx={{
                  bgcolor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 2.5,
                  p: 2,
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                }}
              >
                {/* Miniature Workspace Header */}
                <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                  {settings.data.branding.logoUrl ? (
                    <Box
                      component="img"
                      src={settings.data.branding.logoUrl}
                      alt="Logo"
                      sx={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 1.5 }}
                    />
                  ) : (
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: primary,
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '1rem',
                        borderRadius: 1.5,
                      }}
                    >
                      {tenantName.charAt(0).toUpperCase()}
                    </Avatar>
                  )}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700} fontSize="0.9375rem" noWrap>
                      {tenantName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {formatTenantHost(tenantSlug)}
                    </Typography>
                  </Box>
                </Stack>

                {/* Miniature Navigation Items */}
                <Stack spacing={0.75} mb={2}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1.25,
                      py: 0.75,
                      borderRadius: 1.5,
                      bgcolor: alpha(primary, 0.1),
                      color: primary,
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      borderLeft: `3px solid ${primary}`,
                    }}
                  >
                    <ViewKanbanOutlined sx={{ fontSize: 18 }} />
                    Bảng Kanban
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1.25,
                      py: 0.75,
                      borderRadius: 1.5,
                      color: 'text.secondary',
                      fontWeight: 500,
                      fontSize: '0.8125rem',
                    }}
                  >
                    <FolderOutlined sx={{ fontSize: 18 }} />
                    Dự án
                  </Box>
                </Stack>

                {/* Miniature Action Button */}
                <Box sx={{ pt: 1.5, borderTop: '1px dashed #e2e8f0' }}>
                  <Button
                    fullWidth
                    size="small"
                    variant="contained"
                    sx={{
                      bgcolor: primary,
                      '&:hover': { bgcolor: primary },
                      borderRadius: 1.5,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      boxShadow: 'none',
                    }}
                  >
                    + Tạo công việc mới
                  </Button>
                </Box>
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', fontStyle: 'italic' }}>
                • Nút bấm, thanh bên và các trạng thái đang chọn sẽ tự động đồng bộ theo màu chủ đạo bạn đã chọn.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
