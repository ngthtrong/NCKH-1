import { ArrowForward, LockOutlined, VerifiedUserOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { login, status, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      navigate(session.activeTenant ? '/dashboard' : '/select-tenant', { replace: true });
    }
  }, [navigate, session, status]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      await login({ email: email.trim(), password });
      const requestedPath = (location.state as { from?: string } | null)?.from;
      const safeRequestedPath =
        requestedPath?.startsWith('/') && !requestedPath.startsWith('//') && requestedPath !== '/login'
          ? requestedPath
          : '/select-tenant';
      navigate(safeRequestedPath, { replace: true });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box className="auth-page">
      <Box className="auth-story" component="aside">
        <Box className="brand brand--light">
          <Box className="brand__symbol">T</Box>
          <Typography className="brand__name">TenantFlow</Typography>
        </Box>
        <Box className="auth-story__content">
          <Typography className="eyebrow eyebrow--light">Quản trị đa thuê bao an toàn</Typography>
          <Typography variant="h2" component="h1">
            Một nơi để đội ngũ biến kế hoạch thành kết quả.
          </Typography>
          <Typography className="auth-story__lead">
            Theo dõi dự án, cộng tác trên Kanban và quản lý tài nguyên trong một không gian được cô
            lập cho tổ chức của bạn.
          </Typography>
          <Stack spacing={1.5} mt={4}>
            <Box className="feature-line">
              <VerifiedUserOutlined /> Cô lập dữ liệu theo tenant
            </Box>
            <Box className="feature-line">
              <VerifiedUserOutlined /> Phân quyền theo tổ chức và dự án
            </Box>
            <Box className="feature-line">
              <VerifiedUserOutlined /> Lịch sử hoạt động có thể kiểm tra
            </Box>
          </Stack>
        </Box>
        <Typography className="auth-story__footnote">
          Nền tảng thử nghiệm cho đề tài kiến trúc SaaS đa thuê bao
        </Typography>
      </Box>
      <Box className="auth-form-wrap">
        <Paper component="main" className="auth-card" elevation={0}>
          <Box className="auth-mobile-brand brand">
            <Box className="brand__symbol">T</Box>
            <Typography className="brand__name">TenantFlow</Typography>
          </Box>
          <Typography variant="h4" component="h1">
            Chào mừng trở lại
          </Typography>
          <Typography color="text.secondary" mt={1} mb={3}>
            Đăng nhập để tiếp tục vào không gian làm việc.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={submit} noValidate>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                autoFocus
                fullWidth
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                inputProps={{ 'aria-label': 'Email' }}
              />
              <TextField
                label="Mật khẩu"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                fullWidth
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                inputProps={{ 'aria-label': 'Mật khẩu' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={showPassword}
                      onChange={(event) => setShowPassword(event.target.checked)}
                    />
                  }
                  label={<Typography variant="body2">Hiện mật khẩu</Typography>}
                />
                <Link component="button" type="button" underline="hover" variant="body2">
                  Quên mật khẩu?
                </Link>
              </Stack>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting || !email.trim() || !password}
                endIcon={<ArrowForward />}
              >
                {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </Button>
            </Stack>
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" mt={3}>
            Access token chỉ được giữ trong bộ nhớ của tab. Phiên làm việc được khôi phục bằng
            cookie bảo mật.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
