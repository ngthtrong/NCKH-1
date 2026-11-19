import Add from '@mui/icons-material/Add';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import Close from '@mui/icons-material/Close';
import DoNotDisturbAltOutlined from '@mui/icons-material/DoNotDisturbAltOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { kanbanSettingsApi, type KanbanSettings } from '../api/kanbanSettings';

export function KanbanConfigurationPanel({ canManage, compact = false }: { canManage: boolean; compact?: boolean }) {
  const queryClient = useQueryClient();
  const config = useQuery({ queryKey: ['kanban-settings'], queryFn: kanbanSettingsApi.get });
  const [draft, setDraft] = useState<KanbanSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (config.data) setDraft(config.data.settings);
  }, [config.data]);

  const save = useMutation({
    mutationFn: () => kanbanSettingsApi.save({ settings: draft!, version: config.data!.version }),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ['kanban-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['board'] });
    },
  });

  if (config.isLoading) return <Typography role="status">Đang tải cấu hình bảng…</Typography>;
  if (config.error) {
    return (
      <Alert severity="error">
        Không tải được cấu hình. <Button onClick={() => void config.refetch()}>Thử lại</Button>
      </Alert>
    );
  }
  if (!draft) return null;

  const edit = (patch: Partial<KanbanSettings>) => {
    setSaved(false);
    setDraft({ ...draft, ...patch });
  };

  const cardStyleInput = (
    <TextField
      select
      label="Kiểu hiển thị thẻ Kanban"
      value={draft.cardStyle}
      onChange={(e) => edit({ cardStyle: e.target.value as KanbanSettings['cardStyle'] })}
      disabled={!canManage}
      fullWidth
    >
      <MenuItem value="FULL">Đầy đủ (Hiển thị mô tả và trường mở rộng)</MenuItem>
      <MenuItem value="COMPACT">Thu gọn (Tối ưu không gian làm việc)</MenuItem>
    </TextField>
  );

  const defaultColumnsInput = (
    <TextField
      label="Các cột mặc định cho bảng mới"
      helperText="Ngăn cách bằng dấu phẩy. Cột đầu tiên là danh sách chờ, cột cuối cùng là hoàn thành (không áp giới hạn WIP)."
      value={draft.defaultColumns.join(', ')}
      onChange={(e) =>
        edit({
          defaultColumns: e.target.value.split(',').map((v) => v.trim()).filter(Boolean),
        })
      }
      disabled={!canManage}
      fullWidth
    />
  );

  const wipModes = [
    {
      mode: 'OFF' as const,
      label: 'Không giới hạn (OFF)',
      desc: 'Cho phép kéo thả và nhận số lượng thẻ công việc tùy ý ở mọi cột.',
      icon: <DoNotDisturbAltOutlined sx={{ fontSize: 22, color: '#64748b' }} />,
      color: '#64748b',
      border: '#cbd5e1',
    },
    {
      mode: 'WARN' as const,
      label: 'Khuyến nghị (WARN)',
      desc: 'Cảnh báo màu hổ phách khi vượt ngưỡng nhưng không chặn kéo thả.',
      icon: <WarningAmberOutlined sx={{ fontSize: 22, color: '#b45309' }} />,
      color: '#b45309',
      border: '#fde68a',
    },
    {
      mode: 'STRICT' as const,
      label: 'Nghiêm ngặt (STRICT)',
      desc: 'Kiểm soát chặt: Chặn kéo thả và tạo mới khi cột đã đạt giới hạn.',
      icon: <InfoOutlined sx={{ fontSize: 22, color: '#dc2626' }} />,
      color: '#dc2626',
      border: '#fecaca',
    },
  ];

  if (compact) {
    return (
      <Box component="form" onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="workspace-configuration">
        <Box>
          <Typography variant="h6" component="h2">Quy trình làm việc</Typography>
          <Typography color="text.secondary" variant="body2">Thiết lập riêng cho workspace này.</Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
          <TextField
            select
            label="Khi vượt giới hạn công việc"
            value={draft.wipMode}
            onChange={(e) => edit({ wipMode: e.target.value as KanbanSettings['wipMode'] })}
            disabled={!canManage}
            fullWidth
          >
            <MenuItem value="STRICT">Chặn thao tác (STRICT)</MenuItem>
            <MenuItem value="WARN">Cho phép và cảnh báo (WARN)</MenuItem>
            <MenuItem value="OFF">Không giới hạn (OFF)</MenuItem>
          </TextField>
          <TextField
            label="Giới hạn WIP mỗi cột"
            type="number"
            value={draft.wipLimit}
            onChange={(e) => edit({ wipLimit: Number(e.target.value) })}
            disabled={!canManage || draft.wipMode === 'OFF'}
            inputProps={{ min: 1, max: 10000 }}
            fullWidth
          />
        </Stack>
        <Divider />
        <Box>
          <Typography variant="h6" component="h2">Trường công việc mở rộng</Typography>
          <Typography color="text.secondary" variant="body2">Mỗi workspace có bộ trường riêng.</Typography>
        </Box>
        {draft.fields.map((field, index) => (
          <Stack
            key={index}
            direction="column"
            gap={1.5}
            className="tenant-customization-field"
            sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) minmax(0, 1fr) 116px' } }}
          >
            <TextField
              label="Tên trường"
              value={field.label}
              onChange={(e) => edit({ fields: draft.fields.map((f, i) => (i === index ? { ...f, label: e.target.value } : f)) })}
              disabled={!canManage}
              required
              fullWidth
            />
            <TextField
              label="Mã trường"
              value={field.key}
              onChange={(e) => edit({ fields: draft.fields.map((f, i) => (i === index ? { ...f, key: e.target.value } : f)) })}
              disabled={!canManage}
              required
              fullWidth
            />
            <TextField
              select
              label="Kiểu dữ liệu"
              value={field.type}
              onChange={(e) => edit({ fields: draft.fields.map((f, i) => (i === index ? { ...f, type: e.target.value as typeof f.type } : f)) })}
              disabled={!canManage}
            >
              <MenuItem value="STRING">Văn bản</MenuItem>
              <MenuItem value="NUMBER">Số</MenuItem>
              <MenuItem value="BOOLEAN">Có / Không</MenuItem>
            </TextField>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ gridColumn: '1 / -1' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={field.required}
                    onChange={(_, checked) => edit({ fields: draft.fields.map((f, i) => (i === index ? { ...f, required: checked } : f)) })}
                    disabled={!canManage}
                  />
                }
                label="Bắt buộc"
              />
              {canManage && (
                <IconButton aria-label={`Xóa trường ${field.label || index + 1}`} onClick={() => edit({ fields: draft.fields.filter((_, i) => i !== index) })}>
                  <Close />
                </IconButton>
              )}
            </Stack>
          </Stack>
        ))}
        {canManage && (
          <Button
            startIcon={<Add />}
            onClick={() => edit({ fields: [...draft.fields, { key: '', label: '', type: 'STRING', required: false }] })}
            disabled={draft.fields.length >= 30}
          >
            Thêm trường
          </Button>
        )}
        <Box component="details" className="tenant-customization-advanced">
          <Typography component="summary" variant="body2" fontWeight={600}>Cấu hình cột và hiển thị thẻ</Typography>
          <Stack gap={2} mt={2}>{cardStyleInput}{defaultColumnsInput}</Stack>
        </Box>
        {save.error && <Alert severity="error">{save.error.message}</Alert>}
        {saved && <Alert severity="success">Đã lưu cấu hình workspace.</Alert>}
        {canManage && <Button type="submit" variant="contained" disabled={save.isPending}>{save.isPending ? 'Đang lưu…' : 'Lưu quy trình và trường mở rộng'}</Button>}
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
      <Stack spacing={3}>
        {/* WIP Mode Cards */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box mb={2}>
              <Typography variant="h6" fontWeight={700}>
                Kiểm soát công việc đang làm (WIP Limit)
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Thiết lập quy tắc giới hạn số lượng công việc cùng lúc tại các cột đang thực hiện để tránh quá tải nhóm.
              </Typography>
            </Box>

            <Grid container spacing={2} mb={2.5}>
              {wipModes.map((opt) => {
                const isSelected = draft.wipMode === opt.mode;
                return (
                  <Grid size={{ xs: 12, md: 4 }} key={opt.mode}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: 2.5,
                        borderColor: isSelected ? opt.color : '#e2e8f0',
                        bgcolor: isSelected ? alpha(opt.color, 0.04) : '#ffffff',
                        borderWidth: isSelected ? 2 : 1,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <CardActionArea
                        onClick={() => canManage && edit({ wipMode: opt.mode })}
                        disabled={!canManage}
                        sx={{ p: 2, height: '100%', alignItems: 'flex-start' }}
                      >
                        <Stack spacing={1}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            {opt.icon}
                            <Typography fontWeight={700} fontSize="0.9375rem" color={isSelected ? opt.color : 'text.primary'}>
                              {opt.label}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary" fontSize="0.8125rem">
                            {opt.desc}
                          </Typography>
                        </Stack>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Giới hạn số thẻ tối đa mỗi cột đang làm"
                  type="number"
                  value={draft.wipLimit}
                  onChange={(e) => edit({ wipLimit: Math.max(1, Number(e.target.value)) })}
                  disabled={!canManage || draft.wipMode === 'OFF'}
                  helperText={draft.wipMode === 'OFF' ? 'Đang tắt giới hạn WIP' : 'Áp dụng cho các cột nằm giữa cột chờ và hoàn thành'}
                  inputProps={{ min: 1, max: 1000 }}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                {cardStyleInput}
              </Grid>
              <Grid size={{ xs: 12 }}>
                {defaultColumnsInput}
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Dynamic Fields Section */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box mb={2}>
              <Typography variant="h6" fontWeight={700}>
                Trường dữ liệu mở rộng cho thẻ công việc
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Định nghĩa các trường dữ liệu đặc thù của tổ chức. Dữ liệu này sẽ xuất hiện trên mặt thẻ và biểu mẫu chi tiết công việc.
              </Typography>
            </Box>

            {draft.fields.length === 0 ? (
              <Box
                sx={{
                  p: 3,
                  textAlign: 'center',
                  borderRadius: 2,
                  bgcolor: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  mb: 2,
                }}
              >
                <Typography color="text.secondary" variant="body2">
                  Chưa có trường dữ liệu mở rộng nào được tạo.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2} mb={2.5}>
                {draft.fields.map((field, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <Grid container spacing={2} alignItems="center">
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          label="Tên hiển thị"
                          value={field.label}
                          size="small"
                          onChange={(e) =>
                            edit({
                              fields: draft.fields.map((f, i) => (i === index ? { ...f, label: e.target.value } : f)),
                            })
                          }
                          disabled={!canManage}
                          required
                          fullWidth
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField
                          label="Mã định danh (Key)"
                          value={field.key}
                          size="small"
                          helperText="Ví dụ: budget_usd, sprint"
                          onChange={(e) =>
                            edit({
                              fields: draft.fields.map((f, i) => (i === index ? { ...f, key: e.target.value } : f)),
                            })
                          }
                          disabled={!canManage}
                          required
                          fullWidth
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 2.5 }}>
                        <TextField
                          select
                          label="Kiểu dữ liệu"
                          value={field.type}
                          size="small"
                          onChange={(e) =>
                            edit({
                              fields: draft.fields.map((f, i) =>
                                i === index ? { ...f, type: e.target.value as typeof f.type } : f,
                              ),
                            })
                          }
                          disabled={!canManage}
                          fullWidth
                        >
                          <MenuItem value="STRING">Văn bản (String)</MenuItem>
                          <MenuItem value="NUMBER">Số / Tiền tệ (Number)</MenuItem>
                          <MenuItem value="BOOLEAN">Đúng / Sai (Boolean)</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 8, sm: 1.5 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={field.required}
                              onChange={(_, checked) =>
                                edit({
                                  fields: draft.fields.map((f, i) => (i === index ? { ...f, required: checked } : f)),
                                })
                              }
                              disabled={!canManage}
                            />
                          }
                          label="Bắt buộc"
                        />
                      </Grid>
                      <Grid size={{ xs: 4, sm: 1 }} textAlign="right">
                        {canManage && (
                          <IconButton
                            aria-label={`Xóa trường ${field.label || index + 1}`}
                            color="error"
                            size="small"
                            onClick={() => edit({ fields: draft.fields.filter((_, i) => i !== index) })}
                          >
                            <Close fontSize="small" />
                          </IconButton>
                        )}
                      </Grid>
                    </Grid>
                  </Box>
                ))}
              </Stack>
            )}

            {canManage && (
              <Button
                startIcon={<Add />}
                variant="outlined"
                size="small"
                onClick={() =>
                  edit({
                    fields: [...draft.fields, { key: '', label: '', type: 'STRING', required: false }],
                  })
                }
                disabled={draft.fields.length >= 30}
              >
                Thêm trường dữ liệu mới
              </Button>
            )}
          </CardContent>
        </Card>

        {save.error && <Alert severity="error">{save.error.message}</Alert>}
        {saved && (
          <Alert severity="success" icon={<CheckCircleOutline fontSize="inherit" />}>
            Đã lưu quy trình làm việc và trường dữ liệu mở rộng thành công.
          </Alert>
        )}

        {canManage && (
          <Box>
            <Button
              type="submit"
              variant="contained"
              disabled={save.isPending}
              sx={{ fontWeight: 600 }}
            >
              {save.isPending ? 'Đang lưu…' : 'Lưu quy trình và trường mở rộng'}
            </Button>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
