import Add from '@mui/icons-material/Add';
import Close from '@mui/icons-material/Close';
import OpenInNew from '@mui/icons-material/OpenInNew';
import { Box, Button, IconButton, Stack, TextField, Tooltip } from '@mui/material';
import { useState, type KeyboardEvent } from 'react';
import type { UUID } from '../../api/types';

export interface QuickAddTaskInlineProps {
  columnId: UUID;
  onAddTask: (columnId: UUID, title: string) => Promise<unknown> | unknown;
  disabled?: boolean;
  onOpenFullDialog?: () => void;
}

export function QuickAddTaskInline({
  columnId,
  onAddTask,
  disabled = false,
  onOpenFullDialog,
}: QuickAddTaskInlineProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpen = () => {
    if (disabled) return;
    setTitle('');
    setIsOpen(true);
  };

  const handleCancel = () => {
    setTitle('');
    setIsOpen(false);
  };

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onAddTask(columnId, trimmed);
      setTitle('');
      setIsOpen(false);
    } catch {
      // Error is handled upstream (e.g. snackbar)
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  };

  if (!isOpen) {
    return (
      <Button
        fullWidth
        startIcon={<Add />}
        color="inherit"
        size="small"
        disabled={disabled}
        onClick={handleOpen}
        sx={{
          justifyContent: 'flex-start',
          textTransform: 'none',
          color: 'text.secondary',
          py: 0.75,
          px: 1.25,
          borderRadius: 1.5,
          '&:hover': {
            bgcolor: 'action.hover',
            color: 'text.primary',
          },
        }}
      >
        + Thêm thẻ...
      </Button>
    );
  }

  return (
    <Box
      sx={{
        p: 1,
        borderRadius: 1.5,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'primary.main',
        boxShadow: (theme) => `0 2px 8px ${theme.palette.action.focus}`,
      }}
    >
      <TextField
        fullWidth
        autoFocus
        size="small"
        placeholder="Nhập tiêu đề thẻ..."
        value={title}
        disabled={isSubmitting}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={handleKeyDown}
        inputProps={{ maxLength: 200 }}
        sx={{
          '& .MuiOutlinedInput-root': {
            fontSize: '0.875rem',
            bgcolor: 'background.paper',
          },
        }}
      />
      <Stack direction="row" alignItems="center" spacing={1} mt={1}>
        <Button
          variant="contained"
          size="small"
          disabled={!title.trim() || isSubmitting}
          onClick={() => void handleSave()}
          sx={{ minWidth: 80, height: 32 }}
        >
          {isSubmitting ? 'Đang thêm…' : 'Thêm thẻ'}
        </Button>
        <Tooltip title="Hủy (Esc)">
          <IconButton
            size="small"
            aria-label="Hủy tạo thẻ"
            disabled={isSubmitting}
            onClick={handleCancel}
            sx={{ width: 32, height: 32 }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Tooltip>
        {onOpenFullDialog && (
          <Tooltip title="Mở bảng nhập chi tiết">
            <IconButton
              size="small"
              aria-label="Mở chi tiết công việc"
              onClick={() => {
                handleCancel();
                onOpenFullDialog();
              }}
              sx={{ ml: 'auto !important', width: 32, height: 32, color: 'text.secondary' }}
            >
              <OpenInNew fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
}
