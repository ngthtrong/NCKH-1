import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { FullPageLoader } from '../components/AsyncState';

export function ExchangePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { exchangeTenantCode } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const started = useRef(false);
  const code = params.get('code');

  useEffect(() => {
    if (!code || started.current) return;
    started.current = true;
    exchangeTenantCode(code)
      .then(() => navigate('/dashboard', { replace: true }))
      .catch((cause: unknown) => setError(errorMessage(cause)));
  }, [code, exchangeTenantCode, navigate]);

  useEffect(() => {
    if (!code || error) return undefined;
    const timer = window.setTimeout(() => setSlow(true), 10_000);
    return () => window.clearTimeout(timer);
  }, [code, error]);

  if (!code) {
    return (
      <Box className="full-page-state">
        <Alert severity="error">Liên kết chuyển tenant không chứa mã xác thực.</Alert>
        <Button href="/select-tenant">Quay lại danh sách tổ chức</Button>
      </Box>
    );
  }
  if (error) {
    return (
      <Box className="full-page-state">
        <Alert severity="error">{error}</Alert>
        <Button href="/select-tenant">Chọn lại tổ chức</Button>
      </Box>
    );
  }
  if (slow) {
    return (
      <Box className="full-page-state">
        <CircularProgress size={34} />
        <Stack spacing={1.5} alignItems="center" maxWidth={520}>
          <Typography fontWeight={750}>Việc xác thực đang lâu hơn bình thường</Typography>
          <Alert severity="warning">
            Hệ thống vẫn đang kết nối với workspace. Bạn có thể chờ thêm hoặc tải lại trang để thử lại.
          </Alert>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="contained" onClick={() => window.location.reload()}>Tải lại trang</Button>
            <Button href="/select-tenant">Chọn workspace khác</Button>
          </Stack>
        </Stack>
      </Box>
    );
  }
  return <FullPageLoader label="Đang xác thực không gian làm việc…" />;
}
