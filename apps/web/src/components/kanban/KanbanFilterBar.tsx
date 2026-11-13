import Clear from '@mui/icons-material/Clear';
import FilterAltOff from '@mui/icons-material/FilterAltOff';
import Search from '@mui/icons-material/Search';
import {
  Box,
  Button,
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
}

const priorityOptions: Array<{ value: TaskPriority | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Tất cả mức độ' },
  { value: 'LOW', label: 'Thấp' },
  { value: 'MEDIUM', label: 'Vừa' },
  { value: 'HIGH', label: 'Cao' },
  { value: 'URGENT', label: 'Khẩn cấp' },
];

export function KanbanFilterBar({ filters, onFilterChange, assignees }: KanbanFilterBarProps) {
  const isFiltered = filters.search.trim() !== '' || filters.priority !== 'ALL' || filters.assigneeId !== 'ALL';

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
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1.5,
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
    </Paper>
  );
}
