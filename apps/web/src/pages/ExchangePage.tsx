import { Alert, Box, Button } from '@mui/material';
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
  const started = useRef(false);
  const code = params.get('code');

  useEffect(() => {
    if (!code || started.current) return;
    started.current = true;
    exchangeTenantCode(code)
      .then(() => navigate('/dashboard', { replace: true }))
      .catch((cause: unknown) => setError(errorMessage(cause)));
  }, [code, exchangeTenantCode, navigate]);

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
  return <FullPageLoader label="Đang xác thực không gian làm việc…" />;
}
