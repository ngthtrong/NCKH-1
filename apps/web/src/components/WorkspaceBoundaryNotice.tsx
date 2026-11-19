import LockOutlined from '@mui/icons-material/LockOutlined';
import ArrowBack from '@mui/icons-material/ArrowBack';
import SwapHoriz from '@mui/icons-material/SwapHoriz';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { formatTenantHost } from '../utils/tenantHost';

export function WorkspaceBoundaryNotice({
  resourceType = 'nội dung',
  onSwitchTenant,
}: {
  resourceType?: string;
  onSwitchTenant?: () => void;
}) {
  const navigate = useNavigate();
  const { currentTenant, session } = useAuth();
  const tenant = currentTenant ?? session?.activeTenant;
  const tenantName = tenant?.name ?? 'không gian làm việc';
  const tenantSlug = tenant?.slug;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        p: 3,
      }}
    >
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          maxWidth: 520,
          width: '100%',
          p: { xs: 3.5, sm: 5 },
          borderRadius: 3,
          textAlign: 'center',
          borderColor: '#e2e8f0',
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            mx: 'auto',
            mb: 2.5,
            borderRadius: '50%',
            backgroundColor: '#f1f5f9',
            display: 'grid',
            placeItems: 'center',
            color: '#475569',
            border: '1px solid #e2e8f0',
          }}
        >
          <LockOutlined sx={{ fontSize: 28 }} />
        </Box>

        <Typography
          variant="h5"
          component="h2"
          sx={{
            fontWeight: 700,
            color: '#0f172a',
            letterSpacing: '-0.02em',
            mb: 1.5,
          }}
        >
          Nội dung thuộc không gian làm việc khác
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: '#64748b',
            lineHeight: 1.6,
            mb: 3.5,
          }}
        >
          {resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} này không nằm trong phạm vi dữ liệu của{' '}
          <strong style={{ color: '#0f172a' }}>{tenantName}</strong>
          {tenantSlug ? ` (${formatTenantHost(tenantSlug)})` : ''}, hoặc tài khoản của bạn chưa được cấp quyền truy cập.
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          justifyContent="center"
        >
          <Button
            variant="contained"
            color="primary"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/dashboard')}
            sx={{ px: 2.5 }}
          >
            Quay về {tenantName}
          </Button>

          <Button
            variant="outlined"
            startIcon={<SwapHoriz />}
            onClick={() => {
              if (onSwitchTenant) onSwitchTenant();
              else navigate('/select-tenant');
            }}
            sx={{
              borderColor: '#cbd5e1',
              color: '#334155',
              '&:hover': {
                borderColor: '#94a3b8',
                backgroundColor: '#f8fafc',
              },
            }}
          >
            Chuyển tổ chức khác
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
