import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      gap={2}
      className="page-header"
    >
      <Box>
        {eyebrow && <Typography className="eyebrow">{eyebrow}</Typography>}
        <Typography component="h1" variant="h4">
          {title}
        </Typography>
        {description && (
          <Typography color="text.secondary" mt={0.5}>
            {description}
          </Typography>
        )}
      </Box>
      {actions && <Stack direction="row" gap={1}>{actions}</Stack>}
    </Stack>
  );
}
