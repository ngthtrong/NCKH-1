import { Alert, Box, Button, Checkbox, Divider, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import Close from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { kanbanSettingsApi, type KanbanSettings } from '../api/kanbanSettings';

export function KanbanConfigurationPanel({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const config = useQuery({ queryKey: ['kanban-settings'], queryFn: kanbanSettingsApi.get });
  const [draft, setDraft] = useState<KanbanSettings | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (config.data) setDraft(config.data.settings); }, [config.data]);
  const save = useMutation({
    mutationFn: () => kanbanSettingsApi.save({ settings: draft!, version: config.data!.version }),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ['kanban-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['board'] });
    },
  });
  if (config.isLoading) return <Typography role="status">Đang tải cấu hình bảng…</Typography>;
  if (config.error) return <Alert severity="error">Không tải được cấu hình. <Button onClick={() => void config.refetch()}>Thử lại</Button></Alert>;
  if (!draft) return null;
  const edit = (patch: Partial<KanbanSettings>) => { setSaved(false); setDraft({ ...draft, ...patch }); };
  return (
    <Box component="form" onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="workspace-configuration">
      <Box>
        <Typography variant="h6" component="h2">Quy trình làm việc</Typography>
        <Typography color="text.secondary" variant="body2">Thiết lập riêng cho workspace này. Cấu hình cột áp dụng cho các bảng được tạo mới.</Typography>
      </Box>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
        <TextField select label="Khi vượt giới hạn công việc" value={draft.wipMode} onChange={(e) => edit({ wipMode: e.target.value as KanbanSettings['wipMode'] })} disabled={!canManage} fullWidth>
          <MenuItem value="STRICT">Chặn thao tác (STRICT)</MenuItem><MenuItem value="WARN">Cho phép và cảnh báo (WARN)</MenuItem><MenuItem value="OFF">Không giới hạn (OFF)</MenuItem>
        </TextField>
        <TextField label="Giới hạn WIP mỗi cột đang làm" type="number" value={draft.wipLimit} onChange={(e) => edit({ wipLimit: Number(e.target.value) })} disabled={!canManage || draft.wipMode === 'OFF'} inputProps={{ min: 1, max: 10000 }} fullWidth />
        <TextField select label="Hiển thị thẻ" value={draft.cardStyle} onChange={(e) => edit({ cardStyle: e.target.value as KanbanSettings['cardStyle'] })} disabled={!canManage} fullWidth><MenuItem value="FULL">Đầy đủ</MenuItem><MenuItem value="COMPACT">Thu gọn</MenuItem></TextField>
      </Stack>
      <TextField label="Các cột mặc định" helperText="Ngăn cách bằng dấu phẩy. Cột đầu là danh sách chờ, cột cuối là hoàn thành; hai cột này không áp giới hạn WIP." value={draft.defaultColumns.join(', ')} onChange={(e) => edit({ defaultColumns: e.target.value.split(',').map(v => v.trim()) })} disabled={!canManage} fullWidth />
      <Divider />
      <Box><Typography variant="h6" component="h2">Trường công việc mở rộng</Typography><Typography color="text.secondary" variant="body2">Mỗi workspace có bộ trường riêng. Dữ liệu được kiểm tra tại máy chủ trước khi lưu.</Typography></Box>
      {draft.fields.length === 0 && <Typography color="text.secondary">Chưa có trường mở rộng. Thêm các thông tin nhóm của bạn cần theo dõi.</Typography>}
      {draft.fields.map((field, index) => (
        <Stack key={index} direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems={{ md: 'center' }}>
          <TextField label="Tên trường" value={field.label} onChange={(e) => edit({ fields: draft.fields.map((f, i) => i === index ? { ...f, label: e.target.value } : f) })} disabled={!canManage} required fullWidth />
          <TextField label="Mã trường" value={field.key} helperText="Chữ thường, số và dấu gạch dưới" onChange={(e) => edit({ fields: draft.fields.map((f, i) => i === index ? { ...f, key: e.target.value } : f) })} disabled={!canManage} required fullWidth />
          <TextField select label="Kiểu dữ liệu" value={field.type} onChange={(e) => edit({ fields: draft.fields.map((f, i) => i === index ? { ...f, type: e.target.value as typeof f.type } : f) })} disabled={!canManage} sx={{ minWidth: 140 }}><MenuItem value="STRING">Văn bản</MenuItem><MenuItem value="NUMBER">Số</MenuItem><MenuItem value="BOOLEAN">Có / Không</MenuItem></TextField>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
            <FormControlLabel control={<Checkbox checked={field.required} onChange={(_, checked) => edit({ fields: draft.fields.map((f, i) => i === index ? { ...f, required: checked } : f) })} disabled={!canManage} />} label="Bắt buộc" sx={{ whiteSpace: 'nowrap' }} />
            {canManage && <IconButton aria-label={`Xóa trường ${field.label || index + 1}`} onClick={() => edit({ fields: draft.fields.filter((_, i) => i !== index) })}><Close /></IconButton>}
          </Stack>
        </Stack>
      ))}
      {canManage && <Button startIcon={<Add />} onClick={() => edit({ fields: [...draft.fields, { key: '', label: '', type: 'STRING', required: false }] })} disabled={draft.fields.length >= 30} sx={{ alignSelf: 'flex-start' }}>Thêm trường</Button>}
      {save.error && <Alert severity="error">{save.error.message}</Alert>}
      {saved && <Alert severity="success">Đã lưu cấu hình workspace.</Alert>}
      {canManage && <Button type="submit" variant="contained" disabled={save.isPending} sx={{ alignSelf: 'flex-start' }}>{save.isPending ? 'Đang lưu…' : 'Lưu quy trình và trường mở rộng'}</Button>}
    </Box>
  );
}
