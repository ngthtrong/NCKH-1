import CloudQueueOutlined from '@mui/icons-material/CloudQueueOutlined';
import PaletteOutlined from '@mui/icons-material/PaletteOutlined';
import PeopleOutline from '@mui/icons-material/PeopleOutline';
import StorageOutlined from '@mui/icons-material/StorageOutlined';
import ViewKanbanOutlined from '@mui/icons-material/ViewKanbanOutlined';
import WorkspacePremiumOutlined from '@mui/icons-material/WorkspacePremiumOutlined';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { membersApi, resourcesApi, tenantSettingsApi } from '../api/endpoints';
import type { TenantCapability } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { FullPageLoader } from '../components/AsyncState';
import { KanbanConfigurationPanel } from '../components/KanbanConfigurationPanel';
import { PageHeader } from '../components/PageHeader';
import { TenantBrandingPanel } from '../components/TenantBrandingPanel';
import { formatTenantHost } from '../utils/tenantHost';

const capabilityLabels: Record<TenantCapability, { label: string; desc: string }> = {
  BRANDING: {
    label: 'Tùy biến nhận diện thương hiệu',
    desc: 'Cho phép thay đổi màu chủ đạo và tải lên biểu trưng tổ chức.',
  },
  CUSTOM_DATA: {
    label: 'Trường dữ liệu mở rộng',
    desc: 'Bổ sung các trường dữ liệu tùy biến riêng vào thẻ công việc.',
  },
  APPROVALS: {
    label: 'Quy trình phê duyệt nhiều bước',
    desc: 'Thiết lập luồng phê duyệt trạng thái công việc qua các cấp quản lý.',
  },
  AUTOMATION: {
    label: 'Tự động hóa luồng làm việc',
    desc: 'Tự động kích hoạt hành động dựa trên quy tắc chuyển trạng thái.',
  },
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Không thể lưu cài đặt không gian làm việc.';
}

export function TenantSettingsPage() {
  const queryClient = useQueryClient();
  const { session, currentTenant } = useAuth();
  const tenant = currentTenant ?? session?.activeTenant;
  const canManage = ['OWNER', 'ADMIN'].includes(tenant?.role ?? '');
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState('');

  const settings = useQuery({ queryKey: ['tenant-settings'], queryFn: tenantSettingsApi.get });
  const quota = useQuery({ queryKey: ['resource-quota'], queryFn: resourcesApi.quota });
  const members = useQuery({ queryKey: ['members'], queryFn: membersApi.list });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
    await queryClient.invalidateQueries({ queryKey: ['current-tenant'] });
  };

  if (settings.isLoading) return <FullPageLoader />;
  if (settings.error || !settings.data) {
    return <Alert severity="error">{message(settings.error)}</Alert>;
  }

  const tenantName = tenant?.name ?? 'Workspace';
  const tenantSlug = tenant?.slug ?? 'workspace';
  const tenantTier = tenant?.tier ?? 'STANDARD';

  const tierMap: Record<string, { label: string; color: 'default' | 'primary' | 'secondary' | 'info' | 'success' }> = {
    STANDARD: { label: 'Gói Cơ bản (Starter)', color: 'default' },
    PRO: { label: 'Gói Chuyên nghiệp (Pro)', color: 'primary' },
    ENTERPRISE: { label: 'Gói Doanh nghiệp (Enterprise)', color: 'info' },
  };
  const tierInfo = tierMap[tenantTier] ?? { label: tenantTier, color: 'default' };

  const usedBytes = quota.data?.usedBytes ?? 0;
  const limitBytes = quota.data?.limitBytes ?? 100 * 1024 * 1024;
  const storagePercent = Math.min(100, Math.round((usedBytes / limitBytes) * 100));

  return (
    <Stack spacing={3} className="page-container">
      <PageHeader
        title="Cài đặt không gian làm việc"
        description={`Quản lý nhận diện, quy trình nghiệp vụ và tài nguyên cho tổ chức ${tenantName}.`}
      />

      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {!canManage && (
        <Alert severity="info">
          Bạn đang xem cài đặt với quyền thành viên (chế độ chỉ đọc).
        </Alert>
      )}

      {/* Modern B2B SaaS Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, tab) => setActiveTab(tab)}
          aria-label="Cài đặt tổ chức"
          sx={{
            minHeight: 44,
            '& .MuiTab-root': {
              minHeight: 44,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              py: 1,
            },
          }}
        >
          <Tab icon={<PaletteOutlined sx={{ fontSize: 18 }} />} iconPosition="start" label="Nhận diện thương hiệu" />
          <Tab icon={<ViewKanbanOutlined sx={{ fontSize: 18 }} />} iconPosition="start" label="Quy trình & Trường dữ liệu" />
          <Tab icon={<WorkspacePremiumOutlined sx={{ fontSize: 18 }} />} iconPosition="start" label="Gói dịch vụ & Hạn mức tài nguyên" />
        </Tabs>
      </Box>

      {/* Tab 0: Branding */}
      {activeTab === 0 && (
        <Box>
          <TenantBrandingPanel canManage={canManage} />
        </Box>
      )}

      {/* Tab 1: Workflow & Dynamic Fields */}
      {activeTab === 1 && (
        <Box>
          <KanbanConfigurationPanel canManage={canManage} />
        </Box>
      )}

      {/* Tab 2: Plan & Resource Quota */}
      {activeTab === 2 && (
        <Stack spacing={3}>
          <Grid container spacing={3}>
            {/* Plan Info Card */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                    <WorkspacePremiumOutlined color="primary" sx={{ fontSize: 28 }} />
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        Gói dịch vụ đang kích hoạt
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Hạng thành viên và phạm vi quyền hạn của tổ chức
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        Cấp độ dịch vụ:
                      </Typography>
                      <Chip
                        label={tierInfo.label}
                        color={tierInfo.color}
                        size="small"
                        sx={{ fontWeight: 700, borderRadius: 2 }}
                      />
                    </Box>
                    <Divider />
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        Địa chỉ không gian làm việc:
                      </Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                        {formatTenantHost(tenantSlug)}
                      </Typography>
                    </Box>
                    <Divider />
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        Trạng thái vận hành:
                      </Typography>
                      <Chip label="Đang hoạt động" color="success" size="small" sx={{ fontWeight: 600 }} />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Storage Quota Card */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                    <StorageOutlined color="primary" sx={{ fontSize: 28 }} />
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        Dung lượng lưu trữ tệp đính kèm
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Hạn mức tài nguyên tệp tin của không gian làm việc
                      </Typography>
                    </Box>
                  </Stack>

                  <Box sx={{ mt: 3, mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2" fontWeight={600}>
                        {formatBytes(usedBytes)} đã dùng
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Hạn mức: {formatBytes(limitBytes)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={storagePercent}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: '#e2e8f0',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: storagePercent > 90 ? 'error.main' : storagePercent > 75 ? 'warning.main' : 'primary.main',
                          borderRadius: 4,
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Đã sử dụng {storagePercent}% hạn mức cho phép.
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Stack direction="row" alignItems="center" spacing={1}>
                    <PeopleOutline sx={{ color: 'text.secondary', fontSize: 20 }} />
                    <Typography variant="body2" color="text.secondary">
                      Số thành viên đang tham gia: <strong>{members.data?.length ?? 1} thành viên</strong>
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Capabilities Status Card (Read-only Entitlements per Tier) */}
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box mb={2.5}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <WorkspacePremiumOutlined sx={{ color: 'primary.main', fontSize: 24 }} />
                  <Typography variant="h6" fontWeight={750}>
                    Tính năng theo gói dịch vụ ({tenantTier})
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                  Quyền lợi tính năng được quản lý tập trung theo gói dịch vụ của tổ chức. Để mở rộng hoặc thay đổi các phân hệ nâng cao, vui lòng liên hệ quản trị viên nền tảng.
                </Typography>
              </Box>

              <Stack spacing={2} divider={<Divider />}>
                {(['BRANDING', 'CUSTOM_DATA', 'APPROVALS', 'AUTOMATION'] as TenantCapability[]).map((capKey) => {
                  const item = settings.data.capabilities.find((c) => c.capability === capKey);
                  const isAvailable = Boolean(item && item.supported && item.granted && item.enabled);
                  const isGranted = Boolean(item && item.supported && item.granted);
                  const info = capabilityLabels[capKey];

                  return (
                    <Box
                      key={capKey}
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      gap={2}
                      py={0.75}
                    >
                      <Box flex={1} minWidth={0}>
                        <Typography fontWeight={700} fontSize="0.9375rem" color="#0f172a">
                          {info.label}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: '0.825rem' }}>
                          {info.desc}
                        </Typography>
                      </Box>
                      <Box>
                        {isAvailable ? (
                          <Chip
                            label="Đã kích hoạt"
                            size="small"
                            color="success"
                            variant="filled"
                            sx={{ fontWeight: 700, borderRadius: '6px', fontSize: '0.75rem' }}
                          />
                        ) : isGranted ? (
                          <Chip
                            label="Sẵn sàng"
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 600, borderRadius: '6px', fontSize: '0.75rem' }}
                          />
                        ) : (
                          <Chip
                            label="Yêu cầu nâng cấp gói"
                            size="small"
                            sx={{
                              fontWeight: 600,
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              bgcolor: '#f1f5f9',
                              color: '#64748b',
                              border: '1px solid #e2e8f0',
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}
    </Stack>
  );
}
