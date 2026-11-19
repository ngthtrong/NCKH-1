import { Box, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import type { KanbanField } from '../api/kanbanSettings';

export function PooledTaskFields({
  fields,
  values,
  onChange,
  disabled = false,
}: {
  fields: KanbanField[];
  values: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  disabled?: boolean;
}) {
  if (!fields.length) return null;

  return (
    <Box sx={{ mt: 1, pt: 1.5, borderTop: '1px dashed #e2e8f0' }}>
      <Typography
        variant="caption"
        sx={{
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 700,
          color: 'text.secondary',
          mb: 1.5,
          display: 'block',
        }}
      >
        Trường dữ liệu mở rộng
      </Typography>
      <Stack spacing={2}>
        {fields.map((field) => {
          if (field.type === 'BOOLEAN') {
            return (
              <FormControlLabel
                key={field.key}
                label={<Typography variant="body2" sx={{ fontWeight: 500 }}>{field.label}</Typography>}
                control={
                  <Checkbox
                    disabled={disabled}
                    checked={Boolean(values[field.key])}
                    onChange={(_, checked) => onChange({ ...values, [field.key]: checked })}
                  />
                }
              />
            );
          }

          const isCurrency = /(usd|budget|cost|price|chi_phi|ngan_sach)/i.test(field.key);
          const isNumber = field.type === 'NUMBER';

          return (
            <TextField
              key={field.key}
              label={field.label}
              required={field.required}
              disabled={disabled}
              type={isNumber ? 'number' : 'text'}
              size="small"
              inputProps={isNumber ? { step: 'any' } : { maxLength: 5000 }}
              helperText={
                isCurrency
                  ? 'Đơn vị: USD ($)'
                  : field.required
                    ? 'Bắt buộc'
                    : undefined
              }
              value={values[field.key] ?? ''}
              onChange={(e) => {
                const next = { ...values };
                if (e.target.value === '') {
                  delete next[field.key];
                } else {
                  next[field.key] = isNumber ? Number(e.target.value) : e.target.value;
                }
                onChange(next);
              }}
            />
          );
        })}
      </Stack>
    </Box>
  );
}
