import Clear from '@mui/icons-material/Clear';
import FilterAltOff from '@mui/icons-material/FilterAltOff';
import Search from '@mui/icons-material/Search';
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { TaskPriority } from '../../api/types';

export interface KanbanFilterState {
  search: string;
  priority: TaskPriority | 'ALL';
  assigneeId: string | 'ALL';
}

export interface KanbanFilterBarProps {
  filters: KanbanFilterState;
  onFilterChange: (filters: KanbanFilterState) => void;
  assignees: Array<{ userId: string; name: string }>;
  wipMode?: 'STRICT' | 'WARN' | 'OFF' | string;
  wipLimit?: number;
  customFields?: Array<{ key: string; label: string; type?: string }>;
}

const priorityOptions: Array<{ value: TaskPriority | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Tất cả mức độ' },
  { value: 'LOW', label: 'Thấp' },
  { value: 'MEDIUM', label: 'Vừa' },
  { value: 'HIGH', label: 'Cao' },
  { value: 'URGENT', label: 'Khẩn cấp' },
];

export function KanbanFilterBar({
  filters,
  onFilterChange,
  assignees,
  wipMode,
  wipLimit,
  customFields,
}: KanbanFilterBarProps) {
  const isFiltered = filters.search.trim() !== '' || filters.priority !== 'ALL' || filters.assigneeId !== 'ALL';
  const hasPolicy = Boolean(wipMode);
  const hasCustomFields = Boolean(customFields && customFields.length > 0);

  const handleReset = () => {
    onFilterChange({
      search: '',
      priority: 'ALL',
      assigneeId: 'ALL',
    });
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        mb: 2.5,
        borderRadius: 2.5,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
      }}
    >
      {(hasPolicy || hasCustomFields) && (
        <>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            gap={1}
            sx={{ width: '100%', mb: 1.25 }}
          >
            {/* WIP Policy badge */}
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              {wipMode === 'STRICT' && (
                <Chip
                  size="small"
                  label="Chính sách WIP: STRICT (Chặn cứng khi vượt trần)"
                  sx={{
                    bgcolor: '#fef2f2',
                    color: '#b91c1c',
                    border: '1px solid #fecaca',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    height: 26,
                    borderRadius: 1.5,
                  }}
                />
              )}
              {wipMode === 'WARN' && (
                <Chip
                  size="small"
                  label="Chính sách WIP: WARN (Cảnh báo mềm khi vượt trần)"
                  sx={{
                    bgcolor: '#fffbeb',
                    color: '#b45309',
                    border: '1px solid #fde68a',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    height: 26,
                    borderRadius: 1.5,
                  }}
                />
              )}
              {wipMode === 'OFF' && (
                <Chip
                  size="small"
                  label="Chính sách WIP: OFF (Không giới hạn)"
                  sx={{
                    bgcolor: '#f1f5f9',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    height: 26,
                    borderRadius: 1.5,
                  }}
                />
              )}
            </Stack>

            {/* Custom fields chips */}
            {hasCustomFields && (
              <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem' }}
                >
                  Trường mở rộng:
                </Typography>
                {customFields!.map((field) => (
                  <Chip
                    key={field.key}
                    size="small"
                    label={field.key}
                    variant="outlined"
                    sx={{
                      height: 22,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      borderRadius: 1,
                      bgcolor: '#f8fafc',
                      borderColor: '#e2e8f0',
                      color: '#475569',
                      fontFamily: 'monospace',
                    }}
                  />
                ))}
              </Stack>
            )}
          </Stack>
          <Divider sx={{ width: '100%', mb: 1.5, borderColor: '#f1f5f9' }} />
        </>
      )}

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1.5,
          width: '100%',
        }}
      >
      <TextField
        placeholder="Tìm kiếm thẻ công việc..."
        value={filters.search}
        onChange={(event) => onFilterChange({ ...filters, search: event.target.value })}
        size="small"
        sx={{
          minWidth: { xs: '100%', sm: 260 },
          flex: { sm: 1 },
          '& .MuiOutlinedInput-root': {
            borderRadius: 2.5,
            bgcolor: '#f8fafc',
            transition: 'all 0.2s ease',
            '& fieldset': {
              borderColor: '#e2e8f0',
            },
            '&:hover fieldset': {
              borderColor: '#cbd5e1',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'primary.main',
            },
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search fontSize="small" sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
          endAdornment: filters.search ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                aria-label="Xóa từ khóa tìm kiếm"
                onClick={() => onFilterChange({ ...filters, search: '' })}
                edge="end"
              >
                <Clear fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        }}
      />

      <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center">
        <FormControl
          size="small"
          sx={{
            minWidth: 160,
            '& .MuiOutlinedInput-root': {
              borderRadius: 5,
              bgcolor: '#f8fafc',
              '& fieldset': {
                borderColor: '#e2e8f0',
              },
              '&:hover fieldset': {
                borderColor: '#cbd5e1',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
              },
            },
          }}
        >
          <InputLabel id="filter-priority-label">Mức ưu tiên</InputLabel>
          <Select
            labelId="filter-priority-label"
            label="Mức ưu tiên"
            value={filters.priority}
            onChange={(event) =>
              onFilterChange({ ...filters, priority: event.target.value as TaskPriority | 'ALL' })
            }
            sx={{ borderRadius: 5 }}
          >
            {priorityOptions.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl
          size="small"
          sx={{
            minWidth: 200,
            '& .MuiOutlinedInput-root': {
              borderRadius: 5,
              bgcolor: '#f8fafc',
              '& fieldset': {
                borderColor: '#e2e8f0',
              },
              '&:hover fieldset': {
                borderColor: '#cbd5e1',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
              },
            },
          }}
        >
          <InputLabel id="filter-assignee-label">Người thực hiện</InputLabel>
          <Select
            labelId="filter-assignee-label"
            label="Người thực hiện"
            value={filters.assigneeId}
            onChange={(event) =>
              onFilterChange({ ...filters, assigneeId: event.target.value as string | 'ALL' })
            }
            sx={{ borderRadius: 5 }}
          >
            <MenuItem value="ALL">Tất cả thành viên</MenuItem>
            <MenuItem value="UNASSIGNED">Chưa giao</MenuItem>
            {assignees.map((member) => (
              <MenuItem key={member.userId} value={member.userId}>
                {member.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {isFiltered && (
          <Button
            size="small"
            variant="text"
            startIcon={<FilterAltOff fontSize="small" />}
            onClick={handleReset}
            sx={{
              textTransform: 'none',
              borderRadius: 5,
              px: 1.5,
              color: 'text.secondary',
              '&:hover': {
                bgcolor: 'action.hover',
                color: 'text.primary',
              },
            }}
          >
            Đặt lại bộ lọc
          </Button>
        )}
      </Stack>
      </Box>
    </Paper>
  );
}
