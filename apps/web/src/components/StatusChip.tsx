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
  | 'ROLLBACK_FAILED'
  | 'INVITED'
  | 'PENDING'
  | 'CREATED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'ARCHIVED'
  | 'DELETED';

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
  ROLLBACK_FAILED: 'Hoàn tác lỗi',
  INVITED: 'Đã mời',
  PENDING: 'Đang chờ',
  CREATED: 'Đã tạo',
  ACCEPTED: 'Đã chấp nhận',
  REJECTED: 'Đã từ chối',
  REVOKED: 'Đã thu hồi',
  EXPIRED: 'Đã hết hạn',
  ARCHIVED: 'Đã lưu trữ',
  DELETED: 'Đã xóa',
};

export function StatusChip({ status }: { status: Status }) {
  const color =
    status === 'ACTIVE' || status === 'SUCCEEDED' || status === 'ACCEPTED'
      ? 'success'
      : status === 'FAILED' || status === 'FAILED_ROLLED_BACK' || status === 'ROLLBACK_FAILED'
        ? 'error'
        : status === 'SUSPENDED' || status === 'REJECTED' || status === 'REVOKED' || status === 'EXPIRED'
          ? 'default'
          : 'warning';
  return <Chip label={labels[status]} color={color} size="small" variant="outlined" />;
}
