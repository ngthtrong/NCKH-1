import {
  BusinessOutlined,
  StorageOutlined,
  ErrorOutline,
  Refresh,
  Search,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Paper,
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
import { errorMessage } from '../api/client';
import { adminApi } from '../api/endpoints';
import type { UUID } from '../api/types';
import { EmptyState, ErrorState, SectionLoader } from '../components/AsyncState';
import { PageHeader } from '../components/PageHeader';
import { StatusChip } from '../components/StatusChip';

export function AdminPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deadLetterTenant, setDeadLetterTenant] = useState<{ id: UUID; name: string } | null>(null);
  const tenants = useQuery({
    queryKey: ['admin', 'tenants', page, search],
    queryFn: () => adminApi.tenants(page, search),
  });
  const retry = useMutation({
    mutationFn: adminApi.retryProvisioning,
    onSuccess: async () => {
      setFeedback('Đã đưa tác vụ provisioning vào hàng đợi.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
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
      />
      {feedback && (
        <Alert severity={feedback.startsWith('Đã') ? 'success' : 'error'} onClose={() => setFeedback(null)} sx={{ mb: 2 }}>
          {feedback}
        </Alert>
      )}
      <Box className="admin-summary">
        <Paper variant="outlined">
          <BusinessOutlined />
          <Box><Typography variant="h5">{activeCount}</Typography><Typography>Tenant hoạt động</Typography></Box>
        </Paper>
        <Paper variant="outlined">
          <StorageOutlined />
          <Box><Typography variant="h5">{siloCount}</Typography><Typography>Tenant Silo</Typography></Box>
        </Paper>
        <Paper variant="outlined" className={failedCount ? 'admin-summary__danger' : ''}>
          <ErrorOutline />
          <Box><Typography variant="h5">{failedCount}</Typography><Typography>Cần xử lý</Typography></Box>
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
