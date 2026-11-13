import Add from '@mui/icons-material/Add';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import Check from '@mui/icons-material/Check';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import Logout from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsNone from '@mui/icons-material/NotificationsNone';
import SpaceDashboardOutlined from '@mui/icons-material/SpaceDashboardOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import WorkspacesOutlined from '@mui/icons-material/WorkspacesOutlined';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
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
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, type MouseEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { notificationsApi, tenantSettingsApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';

const drawerWidth = 232;

const primaryNavigation = [
  { label: 'Tổng quan', to: '/dashboard', icon: <DashboardOutlined /> },
  { label: 'Dự án', to: '/projects', icon: <WorkspacesOutlined /> },
  { label: 'Kanban', to: '/kanban', icon: <SpaceDashboardOutlined /> },
  { label: 'Thành viên', to: '/members', icon: <GroupsOutlined /> },
  { label: 'Tài nguyên', to: '/resources', icon: <FolderOutlined /> },
  { label: 'Tùy biến dự án', to: '/customization', icon: <TuneOutlined /> },
];

const tierLabels: Record<string, string> = {
  STARTER: 'Khởi đầu',
  PROFESSIONAL: 'Chuyên nghiệp',
  ENTERPRISE: 'Doanh nghiệp',
};

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
  const [tenantAnchor, setTenantAnchor] = useState<HTMLElement | null>(null);
  const [switchingTenantId, setSwitchingTenantId] = useState<string | null>(null);
  const { session, logout, tenants, currentTenant, selectTenant } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const tenant = currentTenant ?? session?.activeTenant;
  const canAdministerTenant = tenant && ['OWNER', 'ADMIN'].includes(tenant.role);
  const canAdministerSystem = session?.user.platformRoles.includes('SYSTEM_ADMIN');
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const { data: tenantSettings } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: tenantSettingsApi.get,
  });
  const brandingEnabled = tenantSettings?.capabilities.some(
    (item) => item.capability === 'BRANDING' && item.supported && item.granted && item.enabled,
  );
  const activeBranding = brandingEnabled ? tenantSettings?.branding : undefined;
  const tenantTheme = useMemo(() => {
    if (!activeBranding) return theme;
    return createTheme({
      ...theme,
      palette: {
        ...theme.palette,
        primary: { ...theme.palette.primary, main: activeBranding.primaryColor },
        secondary: { ...theme.palette.secondary, main: activeBranding.accentColor },
      },
    });
  }, [activeBranding, theme]);
  const hasBusinessExtensions = tenantSettings?.capabilities.some(
    (item) => item.capability !== 'BRANDING' && item.supported,
  ) ?? false;
  const unread = useMemo(
    () => notifications.reduce((count, item) => count + (item.readAt ? 0 : 1), 0),
    [notifications],
  );

  const closeDrawer = () => setDrawerOpen(false);
  const handleAccount = (event: MouseEvent<HTMLElement>) => setAccountAnchor(event.currentTarget);

  const drawer = (
    <Box className="app-drawer">
      <Box className="brand brand--drawer">
        <Box
          className="brand__symbol"
          component={activeBranding?.logoUrl ? 'img' : 'div'}
          src={activeBranding?.logoUrl ?? undefined}
          alt={activeBranding?.logoUrl ? `${tenant?.name ?? 'Tenant'} logo` : undefined}
          sx={{ backgroundColor: activeBranding?.primaryColor }}
        >{activeBranding?.logoUrl ? null : 'T'}</Box>
        <Box>
          <Typography className="brand__name">TenantFlow</Typography>
          <Typography className="brand__caption">Không gian làm việc</Typography>
        </Box>
      </Box>
      <Box
        className="tenant-switcher"
        data-testid="tenant-switcher"
        onClick={(event) => setTenantAnchor(event.currentTarget)}
        sx={{
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background-color 150ms ease, border-color 150ms ease',
          '&:hover': {
            backgroundColor: '#f0f4fa',
            borderColor: '#c6d2e5',
          },
        }}
      >
        <Avatar variant="rounded" className="tenant-switcher__avatar">
          {tenant ? initials(tenant.name) : '—'}
        </Avatar>
        <Box minWidth={0} flex={1}>
          <Typography fontWeight={600} sx={{ fontSize: 13, overflowWrap: 'anywhere' }} noWrap>
            {tenant?.name ?? 'Chọn không gian'}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" noWrap>
            {tenant?.tier
              ? (tierLabels[tenant.tier] ?? tenant.tier)
              : (tenant?.role === 'OWNER' ? 'Chủ sở hữu' : tenant?.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên')}
          </Typography>
        </Box>
        <Tooltip title="Đổi không gian làm việc">
          <IconButton
            size="small"
            aria-label="Đổi không gian làm việc"
            onClick={(event) => {
              event.stopPropagation();
              setTenantAnchor((event.currentTarget.closest('.tenant-switcher') as HTMLElement | null) ?? event.currentTarget);
            }}
          >
            <KeyboardArrowDown
              fontSize="small"
              sx={{
                transform: Boolean(tenantAnchor) ? 'rotate(180deg)' : 'none',
                transition: 'transform 200ms ease',
              }}
            />
          </IconButton>
        </Tooltip>
      </Box>
      <Menu
        anchorEl={tenantAnchor}
        open={Boolean(tenantAnchor)}
        onClose={() => setTenantAnchor(null)}
        PaperProps={{
          sx: {
            minWidth: drawerWidth - 24,
            maxWidth: 320,
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            py: 0.5,
          },
        }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.secondary"
            sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Không gian làm việc
          </Typography>
        </Box>
        {tenants.map((t) => {
          const isSelected = t.id === tenant?.id;
          const isSwitching = switchingTenantId === t.id;
          return (
            <MenuItem
              key={t.id}
              selected={isSelected}
              disabled={isSwitching}
              onClick={async () => {
                if (isSelected) {
                  setTenantAnchor(null);
                  return;
                }
                try {
                  setSwitchingTenantId(t.id);
                  await selectTenant(t);
                  setTenantAnchor(null);
                } catch (err) {
                  console.error('Failed to switch workspace', err);
                } finally {
                  setSwitchingTenantId(null);
                }
              }}
              sx={{
                py: 1,
                px: 2,
                gap: 1.5,
                alignItems: 'center',
              }}
            >
              <Avatar
                variant="rounded"
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: 12,
                  fontWeight: 700,
                  bgcolor: isSelected ? 'primary.main' : '#eef1f5',
                  color: isSelected ? 'primary.contrastText' : '#475569',
                }}
              >
                {initials(t.name)}
              </Avatar>
              <Box flex={1} minWidth={0}>
                <Typography variant="body2" fontWeight={isSelected ? 700 : 500} noWrap>
                  {t.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {tierLabels[t.tier] ?? t.tier}
                </Typography>
              </Box>
              {isSwitching ? (
                <CircularProgress size={16} />
              ) : isSelected ? (
                <Check fontSize="small" color="primary" />
              ) : null}
            </MenuItem>
          );
        })}
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => {
            setTenantAnchor(null);
            closeDrawer();
            navigate('/onboarding');
          }}
          sx={{ py: 1, px: 2, color: 'primary.main', fontWeight: 600, fontSize: 13 }}
        >
          <ListItemIcon sx={{ color: 'primary.main', minWidth: 28 }}>
            <Add fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="+ Tạo không gian làm việc mới"
            primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
          />
        </MenuItem>
      </Menu>
      <Typography className="nav-label">Không gian làm việc</Typography>
      <List className="app-nav">
        {primaryNavigation
          .filter((item) => item.to !== '/customization' || hasBusinessExtensions)
          .map((item) => (
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
      {(canAdministerTenant || canAdministerSystem) && (
        <>
          <Typography className="nav-label">Quản trị</Typography>
          <List className="app-nav">
            {canAdministerTenant && tenant && (
              <>
                <ListItemButton
                  component={NavLink}
                  to="/settings"
                  onClick={closeDrawer}
                  className={location.pathname.startsWith('/settings') ? 'active' : ''}
                >
                  <ListItemIcon><TuneOutlined /></ListItemIcon>
                  <ListItemText primary="Cài đặt workspace" />
                </ListItemButton>
                <ListItemButton
                  component={NavLink}
                  to={`/onboarding?tenant=${tenant.id}`}
                  onClick={closeDrawer}
                >
                  <ListItemIcon><AdminPanelSettingsOutlined /></ListItemIcon>
                  <ListItemText primary="Trạng thái workspace" />
                </ListItemButton>
              </>
            )}
            {canAdministerSystem && (
              <ListItemButton
                component={NavLink}
                to="/admin"
                onClick={closeDrawer}
                className={location.pathname.startsWith('/admin') ? 'active' : ''}
              >
                <ListItemIcon><AdminPanelSettingsOutlined /></ListItemIcon>
                <ListItemText primary="System Admin" />
              </ListItemButton>
            )}
          </List>
        </>
      )}
      <Box className="drawer-footnote"><Typography variant="caption" color="text.secondary">Dữ liệu chỉ hiển thị trong tổ chức này.</Typography></Box>
    </Box>
  );

  return (
    <ThemeProvider theme={tenantTheme}>
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
      <Box
        component="main"
        className="app-content"
        sx={{
          ml: { md: `${drawerWidth}px` },
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          minWidth: 0,
        }}
      >
        <Outlet />
      </Box>
    </Box>
    </ThemeProvider>
  );
}
