import {
  ArrowForward,
  BusinessOutlined,
  StorageOutlined,
  Logout,
  Refresh,
  Add,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
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
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
          <Box>
            <Typography className="eyebrow">Không gian của bạn</Typography>
            <Typography variant="h4" component="h1">
              Chọn tổ chức để tiếp tục
            </Typography>
            <Typography color="text.secondary" mt={1}>
              Mỗi tổ chức có miền truy cập và phạm vi dữ liệu độc lập.
            </Typography>
          </Box>
          <Stack direction="row" gap={1}>
            <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/onboarding')}>
              Tạo workspace
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
            description="Tạo workspace Pool/Silo đầu tiên hoặc chờ lời mời từ một tổ chức."
          />
        ) : (
          <Box className="tenant-grid">
            {tenants.map((tenant) => {
              const canOpen = tenant.status === 'ACTIVE';
              return (
                <Paper key={tenant.id} className="tenant-card" variant="outlined">
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Avatar variant="rounded" className="tenant-card__avatar">
                      <BusinessOutlined />
                    </Avatar>
                    <StatusChip status={tenant.status} />
                  </Stack>
                  <Typography variant="h6" mt={2} noWrap>
                    {tenant.name}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    {tenant.host ?? `${tenant.slug}.localhost`}
                  </Typography>
                  <Stack direction="row" gap={1} mt={2} flexWrap="wrap">
                    <Chip size="small" label={tenant.role} />
                    <Chip
                      size="small"
                      variant="outlined"
                      icon={<StorageOutlined />}
                      label={`${tenant.placement} · ${tenant.tier}`}
                    />
                  </Stack>
                  {canOpen ? (
                    <Button
                      fullWidth
                      variant="contained"
                      sx={{ mt: 2.5 }}
                      endIcon={<ArrowForward />}
                      disabled={openingSlug !== null}
                      onClick={() => void openTenant(tenant)}
                    >
                      {openingSlug === tenant.slug ? 'Đang chuyển hướng…' : 'Mở không gian'}
                    </Button>
                  ) : tenant.role === 'OWNER' || tenant.role === 'ADMIN' ? (
                    <Button
                      fullWidth
                      variant="outlined"
                      sx={{ mt: 2.5 }}
                      onClick={() => navigate(`/onboarding?tenant=${tenant.id}`)}
                    >
                      Tiếp tục onboarding
                    </Button>
                  ) : (
                    <Button fullWidth disabled sx={{ mt: 2.5 }}>Chưa thể truy cập</Button>
                  )}
                </Paper>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
