import {
  ArrowForward,
  BusinessOutlined,
  CheckCircleOutline,
  CreditCardOutlined,
  ExpandMore,
  Refresh,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { paymentsApi, tenantsApi } from '../api/endpoints';
import type {
  OnboardingView,
  TenantPlacement,
  TenantSummary,
  TenantTier,
} from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { StatusChip } from '../components/StatusChip';

const tierPrices: Record<TenantTier, number> = {
  STARTER: 100_000,
  PROFESSIONAL: 300_000,
  ENTERPRISE: 1_000_000,
};

const tierLabels: Record<TenantTier, string> = {
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Enterprise',
};

const placementLabels: Record<TenantPlacement, string> = {
  POOL: 'Dùng chung hạ tầng',
  SCHEMA_PER_TENANT: 'Lược đồ dữ liệu riêng',
  SILO_DATABASE: 'Cơ sở dữ liệu riêng',
};

const placementCharacteristics: Record<
  TenantPlacement,
  { boundary: string; operations: string; fit: string }
> = {
  POOL: {
    boundary: 'Chung CSDL và bảng; tách tenant bằng tenant_id và RLS.',
    operations: 'Ít tài nguyên và thao tác vận hành nhất.',
    fit: 'Phù hợp để bắt đầu và so sánh baseline.',
  },
  SCHEMA_PER_TENANT: {
    boundary: 'Chung CSDL; mỗi tenant có schema và role riêng.',
    operations: 'Mức vận hành trung bình.',
    fit: 'Phù hợp khi cần namespace dữ liệu riêng.',
  },
  SILO_DATABASE: {
    boundary: 'Mỗi tenant có CSDL và role riêng.',
    operations: 'Tốn tài nguyên và thao tác vận hành nhất.',
    fit: 'Phù hợp khi cần biên cô lập riêng ở cấp CSDL.',
  },
};

function slugFromName(value: string): string {
  return value
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

function activeStep(status?: OnboardingView['tenant']['status']): number {
  if (status === 'ACTIVE') return 3;
  if (status === 'PROVISIONING' || status === 'FAILED') return 2;
  if (status === 'PENDING_PAYMENT') return 1;
  return 0;
}

export function OnboardingPage() {
  const { reloadTenants, selectTenant } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [tier, setTier] = useState<TenantTier>('STARTER');
  const [placement, setPlacement] = useState<TenantPlacement>('POOL');
  const [onboarding, setOnboarding] = useState<OnboardingView | null>(null);
  const [loading, setLoading] = useState(Boolean(tenantId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paymentAttemptKey = useRef('');

  const loadStatus = useCallback(async () => {
    if (!tenantId) return;
    try {
      const next = await tenantsApi.onboarding(tenantId);
      setOnboarding(next);
      setError(null);
      await reloadTenants();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [reloadTenants, tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    void loadStatus();
  }, [loadStatus, tenantId]);

  useEffect(() => {
    if (
      !tenantId ||
      (onboarding && !['PENDING_PAYMENT', 'PROVISIONING'].includes(onboarding.tenant.status))
    ) {
      return;
    }
    const poll = window.setInterval(() => void loadStatus(), 3000);
    return () => window.clearInterval(poll);
  }, [loadStatus, onboarding, tenantId]);

  useEffect(() => {
    if (onboarding?.payment && ['FAILED', 'EXPIRED'].includes(onboarding.payment.status)) {
      paymentAttemptKey.current = '';
    }
  }, [onboarding?.payment]);

  const price = useMemo(() => tierPrices[tier], [tier]);

  const createTenant = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const tenant = await tenantsApi.create({ name: name.trim(), slug: slug.trim(), tier, placement });
      await reloadTenants();
      setSearchParams({ tenant: tenant.id }, { replace: true });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  const createPayment = async () => {
    if (!onboarding) return;
    setSubmitting(true);
    setError(null);
    try {
      const returnUrl = new URL(`/onboarding?tenant=${onboarding.tenant.id}`, window.location.origin);
      if (!paymentAttemptKey.current) {
        paymentAttemptKey.current = `onboarding-${onboarding.tenant.id}-${crypto.randomUUID()}`;
      }
      await paymentsApi.createSession(
        onboarding.tenant.id,
        {
          amountMinor: tierPrices[onboarding.tenant.tier],
          currency: 'VND',
          returnUrl: returnUrl.toString(),
        },
        paymentAttemptKey.current,
      );
      await loadStatus();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  const completePayment = async () => {
    if (!onboarding?.payment) return;
    setSubmitting(true);
    setError(null);
    try {
      await paymentsApi.completeFake(onboarding.tenant.id, onboarding.payment.id);
      await loadStatus();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  const openTenant = async (tenant: TenantSummary) => {
    setSubmitting(true);
    setError(null);
    try {
      await selectTenant(tenant);
    } catch (cause) {
      setError(errorMessage(cause));
      setSubmitting(false);
    }
  };

  return (
    <Box className="onboarding-page">
      <Box className="selection-topbar">
        <Box className="brand">
          <Box className="brand__symbol">T</Box>
          <Typography className="brand__name">TenantFlow</Typography>
        </Box>
        <Button onClick={() => navigate('/select-tenant')}>Danh sách workspace</Button>
      </Box>
      <Box component="main" className="onboarding-content">
        <Typography className="eyebrow">Onboarding local</Typography>
        <Typography variant="h4" component="h1" mb={1}>
          Tạo và kích hoạt không gian làm việc
        </Typography>
        <Typography color="text.secondary" mb={3}>
          Payment bên dưới là mô phỏng kỹ thuật local, không phải giao dịch hay dữ liệu nghiên cứu.
        </Typography>
        <Stepper activeStep={activeStep(onboarding?.tenant.status)} alternativeLabel sx={{ mb: 4 }}>
          {['Workspace', 'Fake payment', 'Provisioning', 'Active'].map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={tenantId ? (
              <Button color="inherit" size="small" onClick={() => void loadStatus()}>
                Thử lại
              </Button>
            ) : undefined}
          >
            {error}
          </Alert>
        )}

        {!tenantId ? (
          <Paper variant="outlined" className="onboarding-card">
            <Stack direction="row" gap={1.5} alignItems="center" mb={3}>
              <BusinessOutlined color="primary" />
              <Box>
                <Typography variant="h6">Thông tin workspace</Typography>
                <Typography variant="body2" color="text.secondary">
                  Starter và hạ tầng dùng chung đã được chọn sẵn, phù hợp để bắt đầu nhanh.
                </Typography>
              </Box>
            </Stack>
            <Box component="form" onSubmit={createTenant}>
              <Stack spacing={2}>
                <TextField
                  label="Tên workspace"
                  required
                  value={name}
                  inputProps={{ 'aria-label': 'Tên workspace' }}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (!slugTouched) setSlug(slugFromName(event.target.value));
                  }}
                />
                <TextField
                  label="Slug subdomain"
                  required
                  value={slug}
                  inputProps={{ 'aria-label': 'Slug subdomain' }}
                  helperText={slug ? `${slug}.localhost` : 'Chỉ gồm chữ thường, số và dấu gạch ngang.'}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(event.target.value.toLowerCase());
                  }}
                />
                <Alert severity="info">
                  Đang dùng {tierLabels[tier]} · {placementLabels[placement]} · giá mô phỏng{' '}
                  {new Intl.NumberFormat('vi-VN').format(price)} VND. Gói quyết định hạn mức sử dụng;
                  placement quyết định cách cô lập dữ liệu. Hai lựa chọn này không tự bật thêm tính năng.
                </Alert>
                <Accordion disableGutters variant="outlined">
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box>
                      <Typography fontWeight={700}>Tùy chọn nâng cao</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Thay đổi gói hoặc kiến trúc lưu trữ khi bạn thật sự cần.
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <FormControl fullWidth>
                        <InputLabel id="tier-label">Gói local</InputLabel>
                        <Select
                          labelId="tier-label"
                          label="Gói local"
                          value={tier}
                          onChange={(event) => setTier(event.target.value as TenantTier)}
                        >
                          <MenuItem value="STARTER">Starter — 100.000 VND</MenuItem>
                          <MenuItem value="PROFESSIONAL">Professional — 300.000 VND</MenuItem>
                          <MenuItem value="ENTERPRISE">Enterprise — 1.000.000 VND</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl fullWidth>
                        <InputLabel id="placement-label">Kiến trúc dữ liệu</InputLabel>
                        <Select
                          labelId="placement-label"
                          label="Kiến trúc dữ liệu"
                          value={placement}
                          onChange={(event) => setPlacement(event.target.value as TenantPlacement)}
                        >
                          <MenuItem value="POOL">Dùng chung hạ tầng</MenuItem>
                          <MenuItem value="SCHEMA_PER_TENANT">Lược đồ dữ liệu riêng</MenuItem>
                          <MenuItem value="SILO_DATABASE">Cơ sở dữ liệu riêng</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>
                    <Box mt={2}>
                      <Typography fontWeight={700}>So sánh ba mô hình</Typography>
                      <Typography variant="body2" color="text.secondary" mb={1.5}>
                        Pool là mặc định của bản demo, không phải kết luận mô hình tối ưu. Kết luận chỉ được đưa
                        ra sau khi đo trên cùng workload và điều kiện triển khai.
                      </Typography>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                          gap: 1.5,
                        }}
                      >
                        {(Object.keys(placementCharacteristics) as TenantPlacement[]).map((option) => {
                          const characteristic = placementCharacteristics[option];
                          const selected = option === placement;
                          return (
                            <Paper
                              key={option}
                              variant="outlined"
                              aria-label={`${placementLabels[option]}${selected ? ' đang chọn' : ''}`}
                              sx={{ p: 1.5, borderColor: selected ? 'primary.main' : 'divider' }}
                            >
                              <Typography fontWeight={700}>{placementLabels[option]}</Typography>
                              <Typography variant="body2" mt={0.75}>
                                {characteristic.boundary}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" mt={0.75}>
                                {characteristic.operations} {characteristic.fit}
                              </Typography>
                            </Paper>
                          );
                        })}
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
                <Button
                  type="submit"
                  size="large"
                  variant="contained"
                  disabled={submitting || name.trim().length < 2 || !slug}
                  endIcon={<ArrowForward />}
                >
                  {submitting ? 'Đang tạo…' : 'Tạo workspace'}
                </Button>
              </Stack>
            </Box>
          </Paper>
        ) : loading && !onboarding ? (
          <Paper variant="outlined" className="onboarding-card">
            <Stack alignItems="center" spacing={2}><CircularProgress /><Typography>Đang tải trạng thái…</Typography></Stack>
          </Paper>
        ) : onboarding ? (
          <Paper variant="outlined" className="onboarding-card">
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
              <Box>
                <Typography variant="h5">{onboarding.tenant.name}</Typography>
                <Typography color="text.secondary">
                  {onboarding.tenant.slug}.localhost · {placementLabels[onboarding.tenant.placement]} ·{' '}
                  {tierLabels[onboarding.tenant.tier]}
                </Typography>
              </Box>
              <StatusChip status={onboarding.tenant.status} />
            </Stack>

            {onboarding.tenant.status === 'PENDING_PAYMENT' && !onboarding.payment && (
              <Stack spacing={2}>
                <Alert severity="info">
                  Workspace đã được giữ địa chỉ. Bước thanh toán local dùng dữ liệu mô phỏng.
                </Alert>
                {onboarding.tenant.role !== 'OWNER' && (
                  <Alert severity="warning">Chỉ Owner của workspace có thể thực hiện bước này.</Alert>
                )}
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<CreditCardOutlined />}
                  disabled={submitting || onboarding.tenant.role !== 'OWNER'}
                  onClick={() => void createPayment()}
                >
                  {submitting ? 'Đang tạo phiên…' : 'Tiếp tục thanh toán mô phỏng'}
                </Button>
              </Stack>
            )}

            {onboarding.tenant.status === 'PENDING_PAYMENT' && onboarding.payment?.status === 'PENDING' && (
              <Stack spacing={2}>
                <Alert severity="warning">
                  Phiên {onboarding.payment.provider} đang chờ xác nhận, số tiền mô phỏng{' '}
                  {new Intl.NumberFormat('vi-VN').format(onboarding.payment.amountMinor)}{' '}
                  {onboarding.payment.currency}.
                </Alert>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<CreditCardOutlined />}
                  disabled={submitting || onboarding.tenant.role !== 'OWNER'}
                  onClick={() => void completePayment()}
                >
                  {submitting ? 'Đang xác nhận…' : 'Xác nhận fake payment thành công'}
                </Button>
              </Stack>
            )}

            {onboarding.tenant.status === 'PENDING_PAYMENT' &&
              onboarding.payment &&
              ['FAILED', 'EXPIRED'].includes(onboarding.payment.status) && (
                <Stack spacing={2}>
                  <Alert severity="error">
                    Phiên thanh toán trước không còn sử dụng được. Bạn có thể tạo một lần thử mới.
                  </Alert>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Refresh />}
                    disabled={submitting || onboarding.tenant.role !== 'OWNER'}
                    onClick={() => void createPayment()}
                  >
                    {submitting ? 'Đang tạo lại…' : 'Tạo lần thanh toán mới'}
                  </Button>
                </Stack>
              )}

            {onboarding.tenant.status === 'PENDING_PAYMENT' &&
              onboarding.payment?.status === 'SUCCEEDED' && (
                <Alert severity="info" icon={<CircularProgress size={20} />}>
                  Thanh toán đã được xác nhận. Đang chờ hệ thống bắt đầu cấp phát workspace.
                </Alert>
              )}

            {onboarding.tenant.status === 'PROVISIONING' && (
              <Stack spacing={2} alignItems="flex-start">
                <Alert severity="info" icon={<CircularProgress size={20} />}>
                  Hệ thống đang chuẩn bị {placementLabels[onboarding.tenant.placement]}. Trang tự làm mới
                  mỗi 3 giây.
                </Alert>
                <Typography variant="body2" color="text.secondary">
                  Job: {onboarding.provisioning?.status ?? 'QUEUED'} · lần thử{' '}
                  {onboarding.provisioning?.attempts ?? 0}
                </Typography>
                <Button startIcon={<Refresh />} disabled={submitting} onClick={() => void loadStatus()}>
                  Làm mới ngay
                </Button>
              </Stack>
            )}

            {onboarding.tenant.status === 'FAILED' && (
              <Alert severity="error">
                Cấp phát thất bại: {onboarding.provisioning?.lastErrorMessage ?? 'Chưa có chẩn đoán.'}
                {' '}Tenant không được tự chuyển sang ACTIVE; thao tác retry thuộc luồng quản trị.
              </Alert>
            )}

            {onboarding.tenant.status === 'ACTIVE' && (
              <Stack spacing={2}>
                <Alert severity="success" icon={<CheckCircleOutline />}>
                  Placement, migration và route đã sẵn sàng. Bạn có thể vào subdomain của workspace.
                </Alert>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  disabled={submitting}
                  onClick={() => void openTenant(onboarding.tenant)}
                >
                  {submitting ? 'Đang chuyển hướng…' : 'Vào workspace'}
                </Button>
              </Stack>
            )}
          </Paper>
        ) : null}
      </Box>
    </Box>
  );
}
