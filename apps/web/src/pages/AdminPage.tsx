import {
  ArrowBack,
  BusinessOutlined,
  StorageOutlined,
  ErrorOutline,
  Logout,
  Refresh,
  Search,
  Visibility,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
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
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { adminApi } from '../api/endpoints';
import type { TenantPlacement, TenantStatus, UUID } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, ErrorState, SectionLoader } from '../components/AsyncState';
import { PageHeader } from '../components/PageHeader';
import { StatusChip } from '../components/StatusChip';

export function AdminPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { logout } = useAuth();
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
  const retry = useMutation({
    mutationFn: adminApi.retryProvisioning,
    onSuccess: async () => {
      setFeedback('Đã đưa tác vụ provisioning vào hàng đợi.');
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
      setFeedback('Đã đưa cleanup resource vào hàng đợi.');
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
  const activeCount = items.filter((tenant) => tenant.status === 'ACTIVE').length;
  const siloCount = items.filter((tenant) => tenant.placement === 'SILO_DATABASE').length;
  const failedCount = items.filter((tenant) => tenant.status === 'FAILED').length;

  return (
    <Box className="page-container page-container--wide">
      <PageHeader
        eyebrow="Control plane"
        title="Quản trị tenant"
        description="Theo dõi placement, trạng thái thanh toán và vòng đời provisioning."
        actions={(
          <>
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/select-tenant')}>
              Workspace
            </Button>
            <Button color="inherit" startIcon={<Logout />} onClick={() => void logout()}>
              Đăng xuất
            </Button>
          </>
        )}
      />
      {feedback && (
        <Alert severity={feedback.startsWith('Đã') ? 'success' : 'error'} onClose={() => setFeedback(null)} sx={{ mb: 2 }}>
          {feedback}
        </Alert>
      )}
      <Box className="admin-summary">
        <Paper variant="outlined">
          <BusinessOutlined />
          <Box><Typography variant="h5">{activeCount}</Typography><Typography>Hoạt động trên trang</Typography></Box>
        </Paper>
        <Paper variant="outlined">
          <StorageOutlined />
          <Box><Typography variant="h5">{siloCount}</Typography><Typography>Silo trên trang</Typography></Box>
        </Paper>
        <Paper variant="outlined" className={failedCount ? 'admin-summary__danger' : ''}>
          <ErrorOutline />
          <Box><Typography variant="h5">{failedCount}</Typography><Typography>Cần xử lý trên trang</Typography></Box>
        </Paper>
      </Box>
      <Paper className="panel" variant="outlined">
        <Box component="form" onSubmit={submitSearch} className="table-toolbar">
          <TextField
            placeholder="Tìm tenant theo tên hoặc slug"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            sx={{ width: { xs: '100%', sm: 360 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><Search /></InputAdornment>
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
              <MenuItem value="SILO_DATABASE">Silo database</MenuItem>
            </Select>
          </FormControl>
          <Button type="submit">Tìm kiếm</Button>
          <Tooltip title="Làm mới">
            <Button onClick={() => void tenants.refetch()} startIcon={<Refresh />}>Làm mới</Button>
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
                    <TableCell>Tenant</TableCell>
                    <TableCell>Tier / placement</TableCell>
                    <TableCell>Trạng thái</TableCell>
                    <TableCell>Thanh toán</TableCell>
                    <TableCell>Provisioning</TableCell>
                    <TableCell>Thành viên</TableCell>
                    <TableCell align="right">Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((tenant) => (
                    <TableRow key={tenant.id} hover>
                      <TableCell>
                        <Typography fontWeight={700}>{tenant.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{tenant.slug}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{tenant.tier}</Typography>
                        <Typography variant="caption" color="text.secondary">{tenant.placement}</Typography>
                      </TableCell>
                      <TableCell><StatusChip status={tenant.status} /></TableCell>
                      <TableCell>
                        {tenant.paymentStatus ? (
                          <Stack gap={0.5} alignItems="flex-start">
                            <StatusChip status={tenant.paymentStatus} />
                            <Typography variant="caption" color="text.secondary">
                              {tenant.paymentProvider}
                            </Typography>
                          </Stack>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {tenant.provisioningStatus ? (
                          <Stack gap={0.5} alignItems="flex-start">
                            <StatusChip status={tenant.provisioningStatus} />
                            {tenant.lastError && (
                              <Tooltip title={tenant.lastError}>
                                <Typography variant="caption" color="error" className="line-clamp-1">
                                  {tenant.lastError}
                                </Typography>
                              </Tooltip>
                            )}
                          </Stack>
                        ) : '—'}
                      </TableCell>
                      <TableCell>{tenant.memberCount}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" gap={0.5} justifyContent="flex-end">
                          <Button
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => setDetailTenantId(tenant.id)}
                          >
                            Chi tiết
                          </Button>
                          <Button
                            size="small"
                            color="warning"
                            startIcon={<ErrorOutline />}
                            disabled={tenant.status !== 'ACTIVE'}
                            onClick={() => setDeadLetterTenant({ id: tenant.id, name: tenant.name })}
                          >
                            Cleanup lỗi
                          </Button>
                          <Button
                            size="small"
                            startIcon={<Refresh />}
                            disabled={
                              retry.isPending ||
                              !['FAILED', 'RETRYABLE_FAILED', 'FAILED_ROLLED_BACK', 'ROLLBACK_FAILED'].includes(
                                tenant.provisioningStatus ?? tenant.status,
                              )
                            }
                            onClick={() => retry.mutate(tenant.id)}
                          >
                            Thử lại
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
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
      <Dialog
        open={detailTenantId !== null}
        onClose={() => setDetailTenantId(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Chi tiết tenant · {tenantDetail.data?.tenant.name ?? ''}</DialogTitle>
        <DialogContent>
          {tenantDetail.isLoading ? (
            <SectionLoader />
          ) : tenantDetail.isError ? (
            <ErrorState message={errorMessage(tenantDetail.error)} onRetry={() => void tenantDetail.refetch()} />
          ) : tenantDetail.data ? (
            <Stack gap={3} sx={{ pt: 1 }}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Workspace</Typography>
                <Typography>{tenantDetail.data.tenant.name} · {tenantDetail.data.tenant.slug}</Typography>
                <Typography color="text.secondary" variant="body2">
                  {tenantDetail.data.tenant.tier} · {tenantDetail.data.tenant.placement ?? 'Chưa cấp placement'} · {tenantDetail.data.tenant.memberCount} thành viên
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Thanh toán local</Typography>
                {tenantDetail.data.payment ? (
                  <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                    <StatusChip status={tenantDetail.data.payment.status} />
                    <Typography variant="body2">
                      {tenantDetail.data.payment.provider} · {tenantDetail.data.payment.amountMinor.toLocaleString('vi-VN')} {tenantDetail.data.payment.currency}
                    </Typography>
                  </Stack>
                ) : <Typography color="text.secondary">Chưa có giao dịch.</Typography>}
              </Box>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Provisioning</Typography>
                {tenantDetail.data.provisioning ? (
                  <Stack gap={0.5} alignItems="flex-start">
                    <StatusChip status={tenantDetail.data.provisioning.status} />
                    <Typography variant="body2">
                      {tenantDetail.data.provisioning.attempts} lần thử · tạo lúc {new Date(tenantDetail.data.provisioning.createdAt).toLocaleString('vi-VN')}
                    </Typography>
                    {tenantDetail.data.provisioning.lastErrorMessage && (
                      <Alert severity="error">{tenantDetail.data.provisioning.lastErrorMessage}</Alert>
                    )}
                  </Stack>
                ) : <Typography color="text.secondary">Chưa có tác vụ provisioning.</Typography>}
              </Box>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Lịch sử chuyển trạng thái</Typography>
                {tenantDetail.data.events.length === 0 ? (
                  <Typography color="text.secondary">Chưa có sự kiện.</Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
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
                            <TableCell>{event.fromStatus ?? '—'} → {event.toStatus}</TableCell>
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
      <Dialog
        open={deadLetterTenant !== null}
        onClose={() => setDeadLetterTenant(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Cleanup resource lỗi · {deadLetterTenant?.name}</DialogTitle>
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
                          onClick={() => requeueDeadLetter.mutate({
                            tenantId: item.tenantId,
                            eventId: item.id,
                          })}
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
