import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import ArrowBack from '@mui/icons-material/ArrowBack';
import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import Logout from '@mui/icons-material/Logout';
import Refresh from '@mui/icons-material/Refresh';
import Search from '@mui/icons-material/Search';
import Visibility from '@mui/icons-material/Visibility';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { adminApi } from '../api/endpoints';
import type { AdminTenant, TenantPlacement, TenantStatus, UUID } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, ErrorState, SectionLoader } from '../components/AsyncState';
import { StatusChip } from '../components/StatusChip';
import { getBaseDomain } from '../utils/tenantHost';

function formatPlacement(placement?: TenantPlacement | null): string {
  switch (placement) {
    case 'POOL':
      return 'Pool (Dùng chung)';
    case 'SCHEMA_PER_TENANT':
      return 'Schema riêng';
    case 'SILO_DATABASE':
      return 'Silo riêng biệt';
    default:
      return 'Chưa cấp';
  }
}

function renderTenantStatus(tenant: AdminTenant) {
  const isFailed =
    tenant.status === 'FAILED' ||
    ['FAILED', 'RETRYABLE_FAILED', 'FAILED_ROLLED_BACK', 'ROLLBACK_FAILED'].includes(
      tenant.provisioningStatus ?? '',
    );

  if (isFailed) {
    return (
      <Stack gap={0.5} alignItems="flex-start">
        <Chip
          label="Lỗi cấp phát"
          size="small"
          sx={{
            height: 24,
            fontSize: '0.75rem',
            fontWeight: 700,
            bgcolor: '#fee2e2',
            color: '#dc2626',
            borderRadius: '6px',
          }}
        />
        {tenant.lastError && (
          <Tooltip title={tenant.lastError}>
            <Typography variant="caption" color="error" className="line-clamp-1" sx={{ maxWidth: 220 }}>
              {tenant.lastError}
            </Typography>
          </Tooltip>
        )}
      </Stack>
    );
  }

  if (tenant.status === 'ACTIVE') {
    return (
      <Chip
        label="Đã kích hoạt"
        size="small"
        sx={{
          height: 24,
          fontSize: '0.75rem',
          fontWeight: 700,
          bgcolor: '#ecfdf5',
          color: '#059669',
          borderRadius: '6px',
        }}
      />
    );
  }

  if (
    tenant.status === 'PROVISIONING' ||
    tenant.provisioningStatus === 'QUEUED' ||
    tenant.provisioningStatus === 'RUNNING'
  ) {
    return (
      <Chip
        label="Đang khởi tạo"
        size="small"
        sx={{
          height: 24,
          fontSize: '0.75rem',
          fontWeight: 700,
          bgcolor: '#eff6ff',
          color: '#2563eb',
          borderRadius: '6px',
        }}
      />
    );
  }

  if (tenant.status === 'PENDING_PAYMENT') {
    return (
      <Chip
        label="Chờ thanh toán"
        size="small"
        sx={{
          height: 24,
          fontSize: '0.75rem',
          fontWeight: 700,
          bgcolor: '#fffbeb',
          color: '#d97706',
          borderRadius: '6px',
        }}
      />
    );
  }

  if (tenant.status === 'SUSPENDED') {
    return (
      <Chip
        label="Tạm ngưng"
        size="small"
        sx={{
          height: 24,
          fontSize: '0.75rem',
          fontWeight: 700,
          bgcolor: '#f1f5f9',
          color: '#64748b',
          borderRadius: '6px',
        }}
      />
    );
  }

  return <StatusChip status={tenant.status} />;
}

export function AdminPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { session, logout, tenants: authTenants } = useAuth();

  // Khóa chặt tên miền Control Plane: nếu truy cập từ tenant subdomain (ví dụ t-acme.tenantflow.tech),
  // tự động redirect ngay về accounts.<baseDomain>/admin
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const baseDomain = getBaseDomain();
    const currentHost = window.location.hostname.toLowerCase();
    const expectedAccountsHost = `accounts.${baseDomain}`;

    const isTenantSubdomain =
      baseDomain !== 'localhost'
        ? currentHost.endsWith(`.${baseDomain}`) && currentHost !== expectedAccountsHost
        : currentHost.endsWith('.localhost') && currentHost !== 'accounts.localhost';

    if (isTenantSubdomain && typeof window.location?.assign === 'function') {
      const protocol = window.location.protocol;
      const port = window.location.port ? `:${window.location.port}` : '';
      window.location.assign(`${protocol}//${expectedAccountsHost}${port}/admin`);
    }
  }, []);

  useEffect(() => {
    const isSystemAdmin = Boolean(
      session?.user?.systemAdmin || session?.user?.platformRoles?.includes('SYSTEM_ADMIN'),
    );
    if (session && !isSystemAdmin) {
      navigate('/select-tenant', { replace: true });
    }
  }, [navigate, session]);

  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TenantStatus | ''>('');
  const [placement, setPlacement] = useState<TenantPlacement | ''>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [detailTenantId, setDetailTenantId] = useState<UUID | null>(null);
  const [deadLetterTenant, setDeadLetterTenant] = useState<{ id: UUID; name: string } | null>(null);

  const tenants = useQuery({
    queryKey: ['admin', 'tenants', page, search, status, placement],
    queryFn: () => adminApi.tenants(page, search, status, placement),
  });

  const tenantDetail = useQuery({
    queryKey: ['admin', 'tenant', detailTenantId],
    queryFn: () => adminApi.tenant(detailTenantId!),
    enabled: detailTenantId !== null,
  });

  const capabilityQuery = useQuery({
    queryKey: ['admin', 'tenant-capabilities', detailTenantId],
    queryFn: () => adminApi.capabilities(detailTenantId!),
    enabled: detailTenantId !== null,
  });

  const updateTier = useMutation({
    mutationFn: (tier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE') =>
      adminApi.updateTier(detailTenantId!, tier),
    onSuccess: async () => {
      setFeedback('Đã cập nhật gói dịch vụ của tenant.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tenant', detailTenantId] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
    },
    onError: (cause) => setFeedback(errorMessage(cause)),
  });

  const setCapability = useMutation({
    mutationFn: ({
      capability,
      granted,
      version,
    }: {
      capability: 'BRANDING' | 'CUSTOM_DATA' | 'APPROVALS' | 'AUTOMATION';
      granted: boolean;
      version: number;
    }) => adminApi.setCapability(detailTenantId!, capability, granted, version),
    onSuccess: async () => {
      setFeedback('Đã cập nhật quyền capability của tenant.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tenant-capabilities', detailTenantId] });
    },
    onError: (cause) => setFeedback(errorMessage(cause)),
  });

  const retry = useMutation({
    mutationFn: adminApi.retryProvisioning,
    onSuccess: async () => {
      setFeedback('Đã xử lý provisioning cho tenant.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tenant'] });
    },
    onError: (cause) => setFeedback(errorMessage(cause)),
  });

  const deadLetters = useQuery({
    queryKey: ['admin', 'resource-dead-letters', deadLetterTenant?.id],
    queryFn: () => adminApi.resourceDeadLetters(deadLetterTenant!.id),
    enabled: deadLetterTenant !== null,
  });

  const requeueDeadLetter = useMutation({
    mutationFn: adminApi.requeueResourceDeadLetter,
    onSuccess: async () => {
      setFeedback('Đã đưa dọn dẹp tài nguyên vào hàng đợi.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'resource-dead-letters'] });
    },
    onError: (cause) => setFeedback(errorMessage(cause)),
  });

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  };

  const items = tenants.data?.items ?? [];
  const totalTenants = tenants.data?.totalItems ?? items.length;
  const activeCount = items.filter((tenant) => tenant.status === 'ACTIVE').length;
  const pendingOrFailedCount = items.filter(
    (tenant) =>
      tenant.status === 'PROVISIONING' ||
      tenant.status === 'FAILED' ||
      tenant.status === 'PENDING_PAYMENT' ||
      ['FAILED', 'RETRYABLE_FAILED', 'FAILED_ROLLED_BACK', 'ROLLBACK_FAILED'].includes(
        tenant.provisioningStatus ?? '',
      ),
  ).length;
  const totalMembers = items.reduce((sum, tenant) => sum + (tenant.memberCount || 0), 0);

  return (
    <Box className="page-container page-container--wide">
      {/* 1. Header Control Plane Topbar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          bgcolor: '#ffffff',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '9px',
              bgcolor: '#1d4ed8',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.15rem',
            }}
          >
            T
          </Box>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ lineHeight: 1.2 }}>
                TenantFlow
              </Typography>
              <Chip
                label="Control Plane"
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  bgcolor: '#dbeafe',
                  color: '#1d4ed8',
                  borderRadius: '4px',
                }}
              />
            </Stack>
            <Typography variant="caption" color="#64748b">
              Quản trị toàn cục nền tảng & cấu hình tổ chức thuê bao
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Chip
            icon={<AdminPanelSettingsOutlined sx={{ fontSize: '1rem !important' }} />}
            label="System Admin"
            size="small"
            sx={{
              height: 26,
              fontWeight: 650,
              fontSize: '0.75rem',
              bgcolor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
            }}
          />
          {session?.user.email && (
            <Typography variant="body2" color="#475569" fontWeight={500}>
              {session.user.email}
            </Typography>
          )}
          {(authTenants?.length ?? 0) > 0 && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/select-tenant')}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
            >
              Workspace
            </Button>
          )}
          <Button
            variant="outlined"
            color="inherit"
            size="small"
            startIcon={<Logout />}
            onClick={() => void logout()}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', color: '#64748b' }}
          >
            Đăng xuất
          </Button>
        </Stack>
      </Paper>

      {feedback && (
        <Alert
          severity={feedback.startsWith('Đã') ? 'success' : 'error'}
          onClose={() => setFeedback(null)}
          sx={{ mb: 2 }}
        >
          {feedback}
        </Alert>
      )}

      {/* 2. Thiết kế lại 4 thẻ KPI */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            p: 2.25,
            borderRadius: '12px',
            borderColor: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '10px',
              bgcolor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BusinessOutlined sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={750} color="#0f172a">
              {totalTenants}
            </Typography>
            <Typography variant="body2" color="#64748b" fontWeight={500}>
              Tổng tổ chức thuê bao
            </Typography>
          </Box>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            p: 2.25,
            borderRadius: '12px',
            borderColor: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '10px',
              bgcolor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircleOutline sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={750} color="#059669">
              {activeCount}
            </Typography>
            <Typography variant="body2" color="#64748b" fontWeight={500}>
              Đang hoạt động
            </Typography>
          </Box>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            p: 2.25,
            borderRadius: '12px',
            borderColor: pendingOrFailedCount > 0 ? '#fecaca' : '#e2e8f0',
            bgcolor: pendingOrFailedCount > 0 ? '#fff5f5' : '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '10px',
              bgcolor: pendingOrFailedCount > 0 ? '#fee2e2' : '#f8fafc',
              color: pendingOrFailedCount > 0 ? '#dc2626' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ErrorOutline sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography
              variant="h5"
              fontWeight={750}
              color={pendingOrFailedCount > 0 ? '#dc2626' : '#0f172a'}
            >
              {pendingOrFailedCount}
            </Typography>
            <Typography variant="body2" color="#64748b" fontWeight={500}>
              Đang khởi tạo / Cần xử lý
            </Typography>
          </Box>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            p: 2.25,
            borderRadius: '12px',
            borderColor: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '10px',
              bgcolor: '#f5f3ff',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GroupOutlined sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={750} color="#0f172a">
              {totalMembers}
            </Typography>
            <Typography variant="body2" color="#64748b" fontWeight={500}>
              Tổng thành viên nền tảng
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* 3. Bảng danh sách Tenant */}
      <Paper className="panel" variant="outlined" sx={{ borderRadius: '12px' }}>
        <Box component="form" onSubmit={submitSearch} className="table-toolbar">
          <TextField
            placeholder="Tìm tenant theo tên hoặc slug"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            sx={{ width: { xs: '100%', sm: 360 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="admin-status-filter-label">Trạng thái</InputLabel>
            <Select
              labelId="admin-status-filter-label"
              label="Trạng thái"
              value={status}
              onChange={(event) => {
                setPage(0);
                setStatus(event.target.value as TenantStatus | '');
              }}
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="PENDING_PAYMENT">Chờ thanh toán</MenuItem>
              <MenuItem value="PROVISIONING">Đang khởi tạo</MenuItem>
              <MenuItem value="ACTIVE">Đang hoạt động</MenuItem>
              <MenuItem value="FAILED">Thất bại</MenuItem>
              <MenuItem value="SUSPENDED">Tạm ngưng</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="admin-placement-filter-label">Placement</InputLabel>
            <Select
              labelId="admin-placement-filter-label"
              label="Placement"
              value={placement}
              onChange={(event) => {
                setPage(0);
                setPlacement(event.target.value as TenantPlacement | '');
              }}
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="POOL">Pool</MenuItem>
              <MenuItem value="SCHEMA_PER_TENANT">Schema riêng</MenuItem>
              <MenuItem value="SILO_DATABASE">Silo database</MenuItem>
            </Select>
          </FormControl>
          <Button type="submit">Tìm kiếm</Button>
          <Tooltip title="Làm mới">
            <Button onClick={() => void tenants.refetch()} startIcon={<Refresh />}>
              Làm mới
            </Button>
          </Tooltip>
        </Box>

        {tenants.isLoading ? (
          <SectionLoader />
        ) : tenants.isError ? (
          <ErrorState message={errorMessage(tenants.error)} onRetry={() => void tenants.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState title="Không có tenant" description="Không tìm thấy tenant phù hợp với bộ lọc." />
        ) : (
          <>
            <TableContainer>
              <Table className="data-table">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 220 }}>Tổ chức thuê bao</TableCell>
                    <TableCell>Gói & Phân bổ</TableCell>
                    <TableCell>Trạng thái</TableCell>
                    <TableCell align="center">Thành viên</TableCell>
                    <TableCell align="right">Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((tenant) => {
                    const isFailedOrRetryable = [
                      'FAILED',
                      'RETRYABLE_FAILED',
                      'FAILED_ROLLED_BACK',
                      'ROLLBACK_FAILED',
                    ].includes(tenant.provisioningStatus ?? tenant.status);

                    return (
                      <TableRow key={tenant.id} hover>
                        <TableCell sx={{ minWidth: 220 }}>
                          <Typography fontWeight={750} color="#0f172a" sx={{ lineHeight: 1.3 }}>
                            {tenant.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            <code>{tenant.slug}</code>
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={650}>
                            {tenant.tier}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatPlacement(tenant.placement)}
                          </Typography>
                        </TableCell>
                        <TableCell>{renderTenantStatus(tenant)}</TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={650}>
                            {tenant.memberCount}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" gap={0.75} justifyContent="flex-end" alignItems="center">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Visibility />}
                              onClick={() => setDetailTenantId(tenant.id)}
                              sx={{ textTransform: 'none', fontWeight: 650, borderRadius: '6px' }}
                            >
                              Chi tiết
                            </Button>
                            {isFailedOrRetryable && (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  startIcon={<Refresh />}
                                  disabled={retry.isPending}
                                  onClick={() => retry.mutate(tenant.id)}
                                  sx={{ textTransform: 'none', fontWeight: 650, borderRadius: '6px' }}
                                >
                                  Thử lại
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="warning"
                                  startIcon={<ErrorOutline />}
                                  onClick={() => setDeadLetterTenant({ id: tenant.id, name: tenant.name })}
                                  sx={{ textTransform: 'none', fontWeight: 650, borderRadius: '6px' }}
                                >
                                  Dọn dẹp lỗi
                                </Button>
                              </>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={tenants.data?.totalItems ?? 0}
              page={page}
              onPageChange={(_event, next) => setPage(next)}
              rowsPerPage={tenants.data?.size ?? 20}
              rowsPerPageOptions={[tenants.data?.size ?? 20]}
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
            />
          </>
        )}
      </Paper>

      {/* Modal Chi tiết Tenant & Điều chỉnh Gói / Feature Flags */}
      <Dialog
        open={detailTenantId !== null}
        onClose={() => setDetailTenantId(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Chi tiết tenant · {tenantDetail.data?.tenant.name ?? ''}
        </DialogTitle>
        <DialogContent>
          {tenantDetail.isLoading ? (
            <SectionLoader />
          ) : tenantDetail.isError ? (
            <ErrorState message={errorMessage(tenantDetail.error)} onRetry={() => void tenantDetail.refetch()} />
          ) : tenantDetail.data ? (
            <Stack gap={3} sx={{ pt: 1 }}>
              {/* Workspace & Gói dịch vụ */}
              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight={750} color="#0f172a">
                  Không gian làm việc & Gói dịch vụ
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: '8px', bgcolor: '#f8fafc' }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={3}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography variant="body1" fontWeight={750}>
                        {tenantDetail.data.tenant.name}
                      </Typography>
                      <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                        Slug: <code>{tenantDetail.data.tenant.slug}</code> · Phân bổ:{' '}
                        <strong>{formatPlacement(tenantDetail.data.tenant.placement)}</strong> ·{' '}
                        {tenantDetail.data.tenant.memberCount} thành viên
                      </Typography>
                    </Box>
                    <FormControl size="small" sx={{ minWidth: 170 }}>
                      <InputLabel id="edit-tier-select-label">Gói dịch vụ</InputLabel>
                      <Select
                        labelId="edit-tier-select-label"
                        label="Gói dịch vụ"
                        value={tenantDetail.data.tenant.tier}
                        disabled={updateTier.isPending}
                        onChange={(e) =>
                          updateTier.mutate(
                            e.target.value as 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE',
                          )
                        }
                      >
                        <MenuItem value="STARTER">STARTER</MenuItem>
                        <MenuItem value="PROFESSIONAL">PROFESSIONAL</MenuItem>
                        <MenuItem value="ENTERPRISE">ENTERPRISE</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                </Paper>
              </Box>

              {/* Feature Flags theo Placement */}
              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight={750} color="#0f172a">
                  Feature Flags (Quyền tính năng theo Placement)
                </Typography>
                {capabilityQuery.isLoading ? (
                  <SectionLoader />
                ) : capabilityQuery.isError ? (
                  <ErrorState
                    message={errorMessage(capabilityQuery.error)}
                    onRetry={() => void capabilityQuery.refetch()}
                  />
                ) : (
                  <Stack spacing={1}>
                    {(capabilityQuery.data ?? []).map((item) => (
                      <Box
                        key={item.capability}
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        gap={2}
                        sx={{
                          p: 1.5,
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          bgcolor: item.supported ? '#ffffff' : '#f8fafc',
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={700}>{item.capability}</Typography>
                          <Chip
                            size="small"
                            label={item.supported ? 'Được placement hỗ trợ' : 'Ngoài giới hạn'}
                            sx={{
                              height: 22,
                              fontSize: '0.7rem',
                              bgcolor: item.supported ? '#e0f2fe' : '#f1f5f9',
                              color: item.supported ? '#0369a1' : '#64748b',
                            }}
                          />
                          {item.granted && !item.enabled && (
                            <Chip size="small" color="warning" label="Tenant đang tắt" sx={{ height: 22 }} />
                          )}
                        </Stack>
                        <FormControlLabel
                          label={item.granted ? 'Đã cấp' : 'Chưa cấp'}
                          control={<Switch checked={item.granted} />}
                          disabled={!item.supported || setCapability.isPending}
                          onChange={(_, granted) =>
                            setCapability.mutate({
                              capability: item.capability,
                              granted,
                              version: item.version,
                            })
                          }
                        />
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>

              {/* Thanh toán */}
              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight={750} color="#0f172a">
                  Thanh toán
                </Typography>
                {tenantDetail.data.payment ? (
                  <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                    <StatusChip status={tenantDetail.data.payment.status} />
                    <Typography variant="body2">
                      {tenantDetail.data.payment.provider} ·{' '}
                      {tenantDetail.data.payment.amountMinor.toLocaleString('vi-VN')}{' '}
                      {tenantDetail.data.payment.currency}
                    </Typography>
                  </Stack>
                ) : (
                  <Typography color="text.secondary" variant="body2">
                    Chưa có giao dịch thanh toán.
                  </Typography>
                )}
              </Box>

              {/* Trạng thái Provisioning */}
              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight={750} color="#0f172a">
                  Provisioning
                </Typography>
                {tenantDetail.data.provisioning ? (
                  <Stack gap={0.5} alignItems="flex-start">
                    <StatusChip status={tenantDetail.data.provisioning.status} />
                    <Typography variant="body2" color="text.secondary">
                      {tenantDetail.data.provisioning.attempts} lần thử · tạo lúc{' '}
                      {new Date(tenantDetail.data.provisioning.createdAt).toLocaleString('vi-VN')}
                    </Typography>
                    {tenantDetail.data.provisioning.lastErrorMessage && (
                      <Alert severity="error" sx={{ mt: 1, width: '100%' }}>
                        {tenantDetail.data.provisioning.lastErrorMessage}
                      </Alert>
                    )}
                  </Stack>
                ) : (
                  <Typography color="text.secondary" variant="body2">
                    Chưa có tác vụ provisioning.
                  </Typography>
                )}
              </Box>

              {/* Lịch sử chuyển trạng thái */}
              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight={750} color="#0f172a">
                  Lịch sử chuyển trạng thái
                </Typography>
                {tenantDetail.data.events.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    Chưa có sự kiện ghi nhận.
                  </Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Thời điểm</TableCell>
                          <TableCell>Chuyển trạng thái</TableCell>
                          <TableCell>Lần thử</TableCell>
                          <TableCell>Ghi chú</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tenantDetail.data.events.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell>{new Date(event.createdAt).toLocaleString('vi-VN')}</TableCell>
                            <TableCell>
                              {event.fromStatus ?? '—'} → {event.toStatus}
                            </TableCell>
                            <TableCell>{event.attempt}</TableCell>
                            <TableCell>{event.message ?? event.errorCode ?? '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailTenantId(null)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Dọn dẹp tài nguyên lỗi */}
      <Dialog
        open={deadLetterTenant !== null}
        onClose={() => setDeadLetterTenant(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Dọn dẹp tài nguyên lỗi · {deadLetterTenant?.name}
        </DialogTitle>
        <DialogContent>
          {deadLetters.isLoading ? (
            <SectionLoader />
          ) : deadLetters.isError ? (
            <ErrorState message={errorMessage(deadLetters.error)} onRetry={() => void deadLetters.refetch()} />
          ) : (deadLetters.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              title="Không có cleanup bị dead-letter"
              description="Các lần xóa object storage đang hoàn tất hoặc vẫn còn trong chu kỳ retry tự động."
            />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Resource / event</TableCell>
                    <TableCell>Lỗi cuối</TableCell>
                    <TableCell>Thời điểm</TableCell>
                    <TableCell align="right">Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deadLetters.data?.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Typography variant="body2">{item.resourceId}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.id} · {item.attempts} lần thử
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={item.lastError ?? ''}>
                          <Typography variant="body2" color="error" className="line-clamp-1">
                            {item.lastError ?? 'Không có chi tiết'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(item.deadLetteredAt).toLocaleString('vi-VN')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Đã requeue {item.requeueCount} lần
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          startIcon={<Refresh />}
                          disabled={requeueDeadLetter.isPending}
                          onClick={() =>
                            requeueDeadLetter.mutate({
                              tenantId: item.tenantId,
                              eventId: item.id,
                            })
                          }
                        >
                          Requeue
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeadLetterTenant(null)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
