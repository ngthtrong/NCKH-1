import { Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import type { KanbanField } from '../api/kanbanSettings';

export function PooledTaskFields({ fields, values, onChange, disabled = false }: {
  fields: KanbanField[]; values: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void; disabled?: boolean;
}) {
  if (!fields.length) return null;
  return <Stack gap={1.5}>
    <Typography fontWeight={650}>Thông tin riêng của workspace</Typography>
    {fields.map(field => field.type === 'BOOLEAN'
      ? <FormControlLabel key={field.key} label={field.label} control={<Checkbox disabled={disabled} checked={Boolean(values[field.key])} onChange={(_, checked) => onChange({ ...values, [field.key]: checked })} />} />
      : <TextField key={field.key} label={field.label} required={field.required} disabled={disabled} type={field.type === 'NUMBER' ? 'number' : 'text'} inputProps={field.type === 'NUMBER' ? { step: 'any' } : { maxLength: 5000 }} value={values[field.key] ?? ''} onChange={e => {
        const next = { ...values };
        if (e.target.value === '') delete next[field.key];
        else next[field.key] = field.type === 'NUMBER' ? Number(e.target.value) : e.target.value;
        onChange(next);
      }} />)}
  </Stack>;
}
