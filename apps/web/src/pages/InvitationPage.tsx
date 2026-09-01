import {
  ArrowForward,
  CheckCircleOutline,
  GroupAddOutlined,
  Login,
} from '@mui/icons-material';
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { invitationsApi } from '../api/endpoints';
import type { InvitationView } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { StatusChip } from '../components/StatusChip';

export function InvitationPage() {
  const { token = '' } = useParams();
  const { status: authStatus, session, reloadTenants } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<InvitationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setInvitation(await invitationsApi.preview(token));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // The token is the stable capability key for this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const respond = async (decision: 'accept' | 'reject') => {
    setSubmitting(true);
    setError(null);
    try {
      const next = decision === 'accept'
        ? await invitationsApi.accept(token)
        : await invitationsApi.reject(token);
      setInvitation(next);
      if (decision === 'accept') await reloadTenants();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  const returnPath = `${location.pathname}${location.search}`;
  const canRespond = invitation?.status === 'PENDING';
  const signedInAsRecipient = session?.user.email.toLowerCase() === invitation?.email.toLowerCase();

  return (
    <Box className="onboarding-page">
      <Box className="selection-topbar">
        <Box className="brand">
          <Box className="brand__symbol">T</Box>
          <Typography className="brand__name">TenantFlow</Typography>
        </Box>
        {authStatus === 'authenticated' && (
          <Button onClick={() => navigate('/select-tenant')}>Danh sách workspace</Button>
        )}
      </Box>
      <Box component="main" className="onboarding-content">
        <Paper variant="outlined" className="onboarding-card">
          {loading ? (
            <Stack alignItems="center" spacing={2} py={4}>
              <CircularProgress />
              <Typography>Đang kiểm tra lời mời…</Typography>
            </Stack>
          ) : error && !invitation ? (
            <Alert
              severity="error"
              action={<Button color="inherit" size="small" onClick={() => void load()}>Thử lại</Button>}
            >
              {error}
            </Alert>
          ) : invitation ? (
            <Stack spacing={2.5}>
              <GroupAddOutlined color="primary" fontSize="large" />
              <Box>
                <Typography className="eyebrow">Lời mời tenant</Typography>
                <Typography variant="h4" component="h1" mt={0.5}>
                  Tham gia {invitation.tenantName}
                </Typography>
                <Typography color="text.secondary" mt={1}>
                  {invitation.tenantSlug}.localhost · vai trò {invitation.role} · gửi tới {invitation.email}
                </Typography>
              </Box>
              <Box><StatusChip status={invitation.status} /></Box>
              {error && <Alert severity="error">{error}</Alert>}

              {canRespond && authStatus === 'anonymous' && (
                <Alert severity="info">
                  Đăng nhập bằng đúng email nhận lời mời, hoặc đăng ký tài khoản mới với email đó.
                </Alert>
              )}
              {canRespond && authStatus === 'authenticated' && !signedInAsRecipient && (
                <Alert severity="warning">
                  Bạn đang đăng nhập bằng {session?.user.email}; lời mời chỉ chấp nhận tài khoản
                  {` ${invitation.email}`}.
                </Alert>
              )}
              {invitation.status === 'ACCEPTED' && (
                <Alert severity="success" icon={<CheckCircleOutline />}>
                  Lời mời đã được chấp nhận. Membership đã sẵn sàng trong danh sách workspace.
                </Alert>
              )}
              {['REJECTED', 'REVOKED', 'EXPIRED'].includes(invitation.status) && (
                <Alert severity="warning">Lời mời này không còn có thể chấp nhận.</Alert>
              )}

              {canRespond && authStatus === 'anonymous' ? (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    component={RouterLink}
                    to="/login"
                    state={{ from: returnPath }}
                    variant="contained"
                    startIcon={<Login />}
                  >
                    Đăng nhập để phản hồi
                  </Button>
                  <Button
                    component={RouterLink}
                    to={`/register?invitation=${encodeURIComponent(token)}`}
                    variant="outlined"
                  >
                    Tạo tài khoản từ lời mời
                  </Button>
                </Stack>
              ) : canRespond && authStatus === 'authenticated' ? (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="contained"
                    disabled={submitting || !signedInAsRecipient}
                    onClick={() => void respond('accept')}
                  >
                    {submitting ? 'Đang xử lý…' : 'Chấp nhận lời mời'}
                  </Button>
                  <Button
                    color="inherit"
                    disabled={submitting || !signedInAsRecipient}
                    onClick={() => void respond('reject')}
                  >
                    Từ chối
                  </Button>
                </Stack>
              ) : invitation.status === 'ACCEPTED' && authStatus === 'authenticated' ? (
                <Button
                  variant="contained"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/select-tenant')}
                >
                  Mở danh sách workspace
                </Button>
              ) : null}
            </Stack>
          ) : null}
        </Paper>
      </Box>
    </Box>
  );
}
