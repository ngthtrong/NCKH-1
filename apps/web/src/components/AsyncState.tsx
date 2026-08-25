import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';

export function FullPageLoader({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <Box className="full-page-state" role="status">
      <CircularProgress size={34} />
      <Typography color="text.secondary">{label}</Typography>
    </Box>
  );
}

export function SectionLoader({ label = 'Đang tải dữ liệu…' }: { label?: string }) {
  return (
    <Stack alignItems="center" spacing={1.5} py={8} role="status">
      <CircularProgress size={30} />
      <Typography color="text.secondary">{label}</Typography>
    </Stack>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert
      severity="error"
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            Thử lại
          </Button>
        ) : undefined
      }
    >
      {message}
    </Alert>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Box className="empty-state">
      <Box className="empty-state__mark" aria-hidden="true">
        ✦
      </Box>
      <Typography variant="h6">{title}</Typography>
      <Typography color="text.secondary" maxWidth={440}>
        {description}
      </Typography>
      {action}
    </Box>
  );
}
