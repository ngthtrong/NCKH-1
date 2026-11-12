import Add from '@mui/icons-material/Add';
import ArrowForward from '@mui/icons-material/ArrowForward';
import Logout from '@mui/icons-material/Logout';
import Refresh from '@mui/icons-material/Refresh';
import {
  Alert,
  Avatar,
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import type { TenantSummary } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { EmptyState } from '../components/AsyncState';
import { StatusChip } from '../components/StatusChip';

const tierLabels: Record<string, string> = { STARTER: 'Khởi đầu', PROFESSIONAL: 'Chuyên nghiệp', ENTERPRISE: 'Doanh nghiệp' };

const roleLabels: Record<TenantSummary['role'], string> = {
  OWNER: 'Chủ sở hữu',
  ADMIN: 'Quản trị viên',
  MEMBER: 'Thành viên',
};

export function TenantSelectionPage() {
  const { session, tenants, selectTenant, reloadTenants, logout } = useAuth();
  const navigate = useNavigate();
  const [openingSlug, setOpeningSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openTenant = async (tenant: TenantSummary) => {
    setOpeningSlug(tenant.slug);
    setError(null);
    try {
      await selectTenant(tenant);
    } catch (cause) {
      setError(errorMessage(cause));
      setOpeningSlug(null);
    }
  };

  return (
    <Box className="selection-page">
      <Box className="selection-topbar">
        <Box className="brand">
          <Box className="brand__symbol">T</Box>
          <Typography className="brand__name">TenantFlow</Typography>
        </Box>
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography color="text.secondary" display={{ xs: 'none', sm: 'block' }}>
            {session?.user.email}
          </Typography>
          <Tooltip title="Đăng xuất">
            <IconButton onClick={() => void logout()}>
              <Logout />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Box component="main" className="selection-content">
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" className="selection-heading" mb={4}>
          <Box>

            <Typography variant="h4" component="h1">
              Chọn tổ chức để tiếp tục
            </Typography>
            <Typography color="text.secondary" mt={1}>
              Chọn không gian làm việc của bạn.
            </Typography>
          </Box>
          <Stack direction="row" gap={1}>
            <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/onboarding')}>
              Tạo tổ chức
            </Button>
            <Tooltip title="Tải lại danh sách">
              <IconButton onClick={() => void reloadTenants()}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {tenants.length === 0 ? (
          <EmptyState
            title="Chưa có không gian làm việc"
            description="Tạo tổ chức đầu tiên hoặc chờ lời mời từ một tổ chức."
          />
        ) : (
          <Box className="tenant-grid">
            {tenants.map((tenant) => {
              const canOpen = tenant.status === 'ACTIVE';
              return (
                <Paper key={tenant.id} className="tenant-card" variant="outlined">
                  <Avatar variant="rounded" className={`tenant-card__avatar tenant-avatar--${tenant.slug === 't-lotus' ? 'orange' : tenant.slug === 't-acme' ? 'blue' : 'slate'}`}>
                    {tenant.name.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()}
                  </Avatar>
                  <Box className="tenant-card__identity">
                    <Typography component="h2" variant="h6" noWrap>{tenant.name}</Typography>
                    <Typography color="text.secondary" variant="body2">{tenant.host ?? `${tenant.slug}.localhost`}</Typography>
                  </Box>
                  <Box className="tenant-card__membership">
                    <Typography variant="body2" fontWeight={600}>{roleLabels[tenant.role]}</Typography>
                    <Typography variant="body2" color="text.secondary">{tierLabels[tenant.tier] ?? tenant.tier}</Typography>
                  </Box>
                  <Box className="tenant-card__status"><StatusChip status={tenant.status} /></Box>
                  {canOpen ? (
                    <Button
                      variant="contained"
                      endIcon={<ArrowForward />}
                      disabled={openingSlug !== null}
                      onClick={() => void openTenant(tenant)}
                    >
                      {openingSlug === tenant.slug ? 'Đang chuyển hướng…' : 'Mở không gian'}
                    </Button>
                  ) : ['PENDING_PAYMENT', 'PROVISIONING', 'FAILED'].includes(tenant.status) &&
                    (tenant.role === 'OWNER' || tenant.role === 'ADMIN') ? (
                    <Button
                      variant="outlined"
                      onClick={() => navigate(`/onboarding?tenant=${tenant.id}`)}
                    >
                      Tiếp tục onboarding
                    </Button>
                  ) : (
                    <Button disabled>
                      {tenant.status === 'SUSPENDED' ? 'Workspace đã tạm ngưng' : 'Chưa thể truy cập'}
                    </Button>
                  )}
                </Paper>
              );
            })}
          </Box>
        )}
        {tenants.length > 0 && <Typography variant="body2" className="selection-help">Bạn có thể đổi tổ chức bất kỳ lúc nào từ menu không gian làm việc.</Typography>}
      </Box>
    </Box>
  );
}
