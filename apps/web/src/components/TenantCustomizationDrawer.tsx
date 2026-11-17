import Close from '@mui/icons-material/Close';
import ArrowForward from '@mui/icons-material/ArrowForward';
import { Box, Button, Chip, Divider, Drawer, IconButton, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { KanbanConfigurationPanel } from './KanbanConfigurationPanel';
import { TenantBrandingPanel } from './TenantBrandingPanel';

export function TenantCustomizationDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentTenant, session } = useAuth();
  const tenant = currentTenant ?? session?.activeTenant;
  const navigate = useNavigate();
  if (!tenant || !['OWNER', 'ADMIN'].includes(tenant.role)) return null;

  return <Drawer anchor="right" open={open} onClose={onClose}
    slotProps={{ paper: {
      role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'tenant-customization-title',
      className: 'tenant-customization-drawer',
      sx: { width: { xs: '100%', sm: 640, lg: 720 }, maxWidth: '100%', backgroundColor: '#f7f9fc' },
    } }}>
    <Box className="tenant-customization-header">
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="overline" color="text.secondary">Tenant customization</Typography>
          <Typography variant="h5" component="h1" id="tenant-customization-title">Cấu hình tenant</Typography>
        </Box>
        <IconButton aria-label="Đóng cấu hình tenant" onClick={onClose} autoFocus><Close /></IconButton>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center" mt={1.5}>
        <Typography fontWeight={600}>{tenant.name}</Typography>
        <Chip size="small" label={tenant.role === 'OWNER' ? 'Chủ sở hữu' : 'Tenant Admin'} />
      </Stack>
      <Typography variant="body2" color="text.secondary" mt={1}>Tùy chỉnh giao diện, giới hạn công việc và trường dữ liệu của tổ chức trước khi vào Kanban.</Typography>
    </Box>
    <Box className="tenant-customization-content">
      <TenantBrandingPanel canManage compact />
      <KanbanConfigurationPanel canManage compact />
    </Box>
    <Divider />
    <Stack className="tenant-customization-footer" direction="row" justifyContent="space-between" gap={2}>
      <Button onClick={onClose}>Đóng</Button>
      <Button variant="outlined" endIcon={<ArrowForward />} onClick={() => { onClose(); navigate('/kanban'); }}>Đi đến Kanban</Button>
    </Stack>
  </Drawer>;
}
