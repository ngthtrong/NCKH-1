import { Alert, Box, Button, CircularProgress, Paper, Skeleton, Stack, Typography } from '@mui/material';

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

export function SkeletonBoardLoader({
  columns = 3,
  ariaLabel = 'Đang tải bảng công việc…',
}: {
  columns?: number;
  ariaLabel?: string;
}) {
  return (
    <Box
      className="kanban-board"
      role="status"
      aria-label={ariaLabel}
      sx={{
        width: '100%',
        minHeight: 460,
        opacity: 0.95,
      }}
    >
      {Array.from({ length: columns }).map((_, colIndex) => (
        <Box
          key={colIndex}
          className="kanban-column"
          sx={{
            minWidth: 280,
            borderRadius: '14px',
          }}
        >
          {/* Column Header */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            className="kanban-column__header"
            sx={{ mb: 1 }}
          >
            <Stack direction="row" alignItems="center" spacing={1.2}>
              <Skeleton
                variant="circular"
                width={10}
                height={10}
                animation="pulse"
              />
              <Skeleton
                variant="text"
                width={100 + (colIndex % 3) * 20}
                height={26}
                animation="pulse"
              />
            </Stack>
            <Skeleton
              variant="rounded"
              width={26}
              height={20}
              animation="pulse"
              sx={{ borderRadius: 1 }}
            />
          </Stack>

          {/* Cards in column */}
          <Stack spacing={1.5} className="kanban-column__tasks">
            {Array.from({ length: colIndex === 1 ? 3 : 2 }).map((_, cardIndex) => (
              <Paper
                key={cardIndex}
                variant="outlined"
                className="task-card"
                sx={{
                  cursor: 'default',
                  borderRadius: '10px',
                  bgcolor: '#ffffff',
                }}
              >
                {/* Priority / tag skeleton */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Skeleton
                    variant="rounded"
                    width={50 + (cardIndex % 2) * 15}
                    height={18}
                    animation="pulse"
                    sx={{ borderRadius: 1 }}
                  />
                  <Skeleton
                    variant="circular"
                    width={16}
                    height={16}
                    animation="pulse"
                  />
                </Stack>

                {/* Title */}
                <Skeleton
                  variant="text"
                  width="85%"
                  height={22}
                  animation="pulse"
                  sx={{ mb: 0.5 }}
                />
                <Skeleton
                  variant="text"
                  width="60%"
                  height={16}
                  animation="pulse"
                  sx={{ mb: 1.5 }}
                />

                {/* Footer */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" pt={1}>
                  <Skeleton
                    variant="text"
                    width={70}
                    height={16}
                    animation="pulse"
                  />
                  <Skeleton
                    variant="circular"
                    width={22}
                    height={22}
                    animation="pulse"
                  />
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}
