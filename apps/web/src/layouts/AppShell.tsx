import {
  AdminPanelSettingsOutlined,
  DashboardOutlined,
  FolderOutlined,
  GroupsOutlined,
  KeyboardArrowDown,
  Logout,
  Menu as MenuIcon,
  NotificationsNone,
  SpaceDashboardOutlined,
} from '@mui/icons-material';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, type MouseEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';

const drawerWidth = 252;

const primaryNavigation = [
  { label: 'Tổng quan', to: '/dashboard', icon: <DashboardOutlined /> },
  { label: 'Bảng công việc', to: '/kanban', icon: <SpaceDashboardOutlined /> },
  { label: 'Thành viên', to: '/members', icon: <GroupsOutlined /> },
  { label: 'Tài nguyên', to: '/resources', icon: <FolderOutlined /> },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function AppShell() {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const tenant = session?.activeTenant;
  const canAdminister =
    session?.user.platformRoles?.includes('PLATFORM_ADMIN') ||
    (tenant && ['OWNER', 'ADMIN'].includes(tenant.role));
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const unread = useMemo(
    () => notifications.reduce((count, item) => count + (item.readAt ? 0 : 1), 0),
    [notifications],
  );

  const closeDrawer = () => setDrawerOpen(false);
  const handleAccount = (event: MouseEvent<HTMLElement>) => setAccountAnchor(event.currentTarget);

  const drawer = (
    <Box className="app-drawer">
      <Box className="brand brand--drawer">
        <Box className="brand__symbol">T</Box>
        <Box>
          <Typography className="brand__name">TenantFlow</Typography>
          <Typography className="brand__caption">Project workspace</Typography>
        </Box>
      </Box>
      <Box className="tenant-switcher">
        <Avatar variant="rounded" className="tenant-switcher__avatar">
          {tenant ? initials(tenant.name) : '—'}
        </Avatar>
        <Box minWidth={0} flex={1}>
          <Typography fontWeight={700} noWrap>
            {tenant?.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {tenant?.placement} · {tenant?.tier}
          </Typography>
        </Box>
        <Tooltip title="Đổi không gian">
          <IconButton size="small" onClick={() => navigate('/select-tenant')}>
            <KeyboardArrowDown fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Typography className="nav-label">Không gian làm việc</Typography>
      <List className="app-nav">
        {primaryNavigation.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            onClick={closeDrawer}
            className={
              location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
                ? 'active'
                : ''
            }
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
        <ListItemButton
          component={NavLink}
          to="/notifications"
          onClick={closeDrawer}
          className={location.pathname.startsWith('/notifications') ? 'active' : ''}
        >
          <ListItemIcon>
            <Badge badgeContent={unread} color="error" max={99}>
              <NotificationsNone />
            </Badge>
          </ListItemIcon>
          <ListItemText primary="Thông báo" />
        </ListItemButton>
      </List>
      {canAdminister && (
        <>
          <Typography className="nav-label">Quản trị</Typography>
          <List className="app-nav">
            <ListItemButton
              component={NavLink}
              to="/admin"
              onClick={closeDrawer}
              className={location.pathname.startsWith('/admin') ? 'active' : ''}
            >
              <ListItemIcon>
                <AdminPanelSettingsOutlined />
              </ListItemIcon>
              <ListItemText primary="Quản trị tenant" />
            </ListItemButton>
          </List>
        </>
      )}
      <Box className="drawer-footnote">
        <Typography variant="caption" color="text.secondary">
          Dữ liệu được cô lập theo tenant
        </Typography>
        <Box className="isolation-indicator">
          <span /> {tenant?.placement === 'SILO_DATABASE' ? 'Cơ sở dữ liệu riêng' : 'Cơ sở dữ liệu dùng chung'}
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box className="app-frame">
      <AppBar position="fixed" color="inherit" elevation={0} className="app-topbar">
        <Toolbar>
          {!desktop && (
            <IconButton edge="start" onClick={() => setDrawerOpen(true)} aria-label="Mở trình đơn">
              <MenuIcon />
            </IconButton>
          )}
          <Box flex={1} />
          <Tooltip title="Thông báo">
            <IconButton onClick={() => navigate('/notifications')} aria-label={`${unread} thông báo chưa đọc`}>
              <Badge badgeContent={unread} color="error" max={99}>
                <NotificationsNone />
              </Badge>
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ mx: 1.5, my: 1.2 }} />
          <Button className="account-button" onClick={handleAccount} color="inherit">
            <Avatar src={session?.user.avatarUrl} sx={{ width: 34, height: 34 }}>
              {session?.user.displayName ? initials(session.user.displayName) : 'U'}
            </Avatar>
            <Box textAlign="left" display={{ xs: 'none', sm: 'block' }}>
              <Typography variant="body2" fontWeight={700} lineHeight={1.2}>
                {session?.user.displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {tenant?.role}
              </Typography>
            </Box>
            <KeyboardArrowDown fontSize="small" />
          </Button>
          <Menu
            anchorEl={accountAnchor}
            open={Boolean(accountAnchor)}
            onClose={() => setAccountAnchor(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => navigate('/select-tenant')}>Đổi không gian</MenuItem>
            <MenuItem
              onClick={() => {
                setAccountAnchor(null);
                void logout();
              }}
            >
              <Logout fontSize="small" sx={{ mr: 1 }} /> Đăng xuất
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={desktop ? 'permanent' : 'temporary'}
          open={desktop || drawerOpen}
          onClose={closeDrawer}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: drawerWidth } }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" className="app-content" sx={{ ml: { md: `${drawerWidth}px` } }}>
        <Outlet />
      </Box>
    </Box>
  );
}
