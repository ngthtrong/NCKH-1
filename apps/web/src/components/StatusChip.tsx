import { Chip } from '@mui/material';

type Status =
  | 'PENDING_PAYMENT'
  | 'PROVISIONING'
  | 'ACTIVE'
  | 'FAILED'
  | 'SUSPENDED'
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'RETRYABLE_FAILED'
  | 'FAILED_ROLLED_BACK'
  | 'INVITED';

const labels: Record<Status, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PROVISIONING: 'Đang khởi tạo',
  ACTIVE: 'Đang hoạt động',
  FAILED: 'Thất bại',
  SUSPENDED: 'Tạm ngưng',
  QUEUED: 'Trong hàng đợi',
  RUNNING: 'Đang xử lý',
  SUCCEEDED: 'Hoàn tất',
  RETRYABLE_FAILED: 'Có thể thử lại',
  FAILED_ROLLED_BACK: 'Đã hoàn tác',
  INVITED: 'Đã mời',
};

export function StatusChip({ status }: { status: Status }) {
  const color =
    status === 'ACTIVE' || status === 'SUCCEEDED'
      ? 'success'
      : status === 'FAILED' || status === 'FAILED_ROLLED_BACK'
        ? 'error'
        : status === 'SUSPENDED'
          ? 'default'
          : 'warning';
  return <Chip label={labels[status]} color={color} size="small" variant="outlined" />;
}
