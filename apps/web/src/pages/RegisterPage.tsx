import { ArrowBack, ArrowForward, PersonAddOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export function RegisterPage() {
  const { register, status, session } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('invitation');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      navigate(
        invitationToken
          ? `/invitations/${encodeURIComponent(invitationToken)}`
          : session.activeTenant ? '/dashboard' : '/onboarding',
        { replace: true },
      );
    }
  }, [invitationToken, navigate, session, status]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) {
      setError('Mật khẩu xác nhận chưa khớp.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await register({ email: email.trim(), displayName: displayName.trim(), password });
      navigate(
        invitationToken ? `/invitations/${encodeURIComponent(invitationToken)}` : '/onboarding',
        { replace: true },
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  const valid =
    displayName.trim().length >= 2 &&
    email.trim().length > 0 &&
    password.length >= 10 &&
    confirmation.length > 0;

  return (
    <Box className="auth-page">
      <Box className="auth-story" component="aside">
        <Box className="brand brand--light">
          <Box className="brand__symbol">T</Box>
          <Typography className="brand__name">TenantFlow</Typography>
        </Box>
        <Box className="auth-story__content">
          <Typography className="eyebrow eyebrow--light">Bắt đầu trên môi trường local</Typography>
          <Typography variant="h2" component="h1">
            Tạo workspace Pool hoặc Silo trong một luồng duy nhất.
          </Typography>
          <Typography className="auth-story__lead">
            Tài khoản mới sẽ chọn gói, xác nhận thanh toán giả lập và theo dõi cấp phát trước khi vào
            subdomain riêng.
          </Typography>
        </Box>
        <Typography className="auth-story__footnote">
          Thanh toán ở giai đoạn này chỉ là adapter fake, không phát sinh giao dịch thật.
        </Typography>
      </Box>
      <Box className="auth-form-wrap">
        <Paper component="main" className="auth-card" elevation={0}>
          <PersonAddOutlined color="primary" sx={{ mb: 1 }} />
          <Typography variant="h4" component="h1">
            Tạo tài khoản
          </Typography>
          <Typography color="text.secondary" mt={1} mb={3}>
            Đăng ký tại host trung tâm, sau đó tạo không gian làm việc đầu tiên.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={submit} noValidate>
            <Stack spacing={2}>
              <TextField
                label="Tên hiển thị"
                autoComplete="name"
                autoFocus
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                inputProps={{ 'aria-label': 'Tên hiển thị' }}
              />
              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                inputProps={{ 'aria-label': 'Email' }}
              />
              <TextField
                label="Mật khẩu"
                type="password"
                autoComplete="new-password"
                required
                helperText="Tối thiểu 10 ký tự và không vượt giới hạn 72 byte của BCrypt."
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                inputProps={{ 'aria-label': 'Mật khẩu' }}
              />
              <TextField
                label="Xác nhận mật khẩu"
                type="password"
                autoComplete="new-password"
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                inputProps={{ 'aria-label': 'Xác nhận mật khẩu' }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={!valid || submitting}
                endIcon={<ArrowForward />}
              >
                {submitting ? 'Đang tạo tài khoản…' : 'Đăng ký và tạo workspace'}
              </Button>
            </Stack>
          </Box>
          <Stack direction="row" alignItems="center" gap={0.5} mt={3}>
            <ArrowBack fontSize="small" />
            <Link component={RouterLink} to="/login" underline="hover">
              Đã có tài khoản? Đăng nhập
            </Link>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
