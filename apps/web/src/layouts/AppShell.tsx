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
  Chip,
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
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { notificationsApi, tenantSettingsApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';

const drawerWidth = 240;

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

  const userRoleLabel = session?.user.platformRoles.includes('SYSTEM_ADMIN')
    ? 'System Admin'
    : tenant?.role === 'OWNER'
    ? 'Chủ sở hữu'
    : tenant?.role === 'ADMIN'
    ? 'Quản trị viên'
    : 'Thành viên';

  const drawer = (
    <Box
      className="app-drawer"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Brand Header */}
      <Box
        className="brand brand--drawer"
        sx={{
          height: 64,
          minHeight: 64,
          px: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Box
          className="brand__symbol"
          component={activeBranding?.logoUrl ? 'img' : 'div'}
          src={activeBranding?.logoUrl ?? undefined}
          alt={activeBranding?.logoUrl ? `${tenant?.name ?? 'Tenant'} logo` : undefined}
          sx={{
            width: 34,
            height: 34,
            borderRadius: '9px',
            backgroundColor: activeBranding?.primaryColor ?? '#246bfd',
            display: 'grid',
            placeItems: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '1rem',
            boxShadow: '0 2px 6px rgba(36, 107, 253, 0.25)',
          }}
        >
          {activeBranding?.logoUrl ? null : 'T'}
        </Box>
        <Box>
          <Typography
            className="brand__name"
            sx={{
              fontWeight: 800,
              fontSize: '1.05rem',
              lineHeight: 1.2,
              color: '#0f172a',
              letterSpacing: '-0.02em',
            }}
          >
            TenantFlow
          </Typography>
          <Typography
            className="brand__caption"
            variant="caption"
            sx={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}
          >
            Không gian làm việc
          </Typography>
        </Box>
      </Box>

      {/* Main Navigation */}
      <Box sx={{ flex: 1, py: 1.5, overflowY: 'auto' }}>
        <Typography
          className="nav-label"
          sx={{
            px: 2.5,
            py: 0.75,
            color: '#94a3b8',
            fontSize: '0.68rem',
            fontWeight: 750,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Không gian làm việc
        </Typography>
        <List className="app-nav" sx={{ px: 1, py: 0 }}>
          {primaryNavigation
            .filter((item) => item.to !== '/customization' || hasBusinessExtensions)
            .map((item) => {
              const isActive =
                location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
              return (
                <ListItemButton
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  onClick={closeDrawer}
                  className={isActive ? 'active' : ''}
                  sx={{
                    minHeight: 40,
                    mx: 0.5,
                    my: 0.25,
                    px: 1.5,
                    borderRadius: '8px',
                    color: isActive ? '#246bfd' : '#64748b',
                    backgroundColor: isActive ? '#eef2ff' : 'transparent',
                    borderLeft: isActive ? '3px solid #246bfd' : '3px solid transparent',
                    fontWeight: isActive ? 600 : 500,
                    transition: 'all 120ms ease',
                    '&:hover': {
                      backgroundColor: isActive ? '#eef2ff' : '#f1f5f9',
                      color: isActive ? '#246bfd' : '#0f172a',
                      '& .MuiListItemIcon-root': {
                        color: isActive ? '#246bfd' : '#0f172a',
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 32,
                      color: isActive ? '#246bfd' : '#64748b',
                      fontSize: '1.2rem',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: 13.5,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#1e3a8a' : 'inherit',
                    }}
                  />
                </ListItemButton>
              );
            })}
          <ListItemButton
            component={NavLink}
            to="/notifications"
            onClick={closeDrawer}
            className={location.pathname.startsWith('/notifications') ? 'active' : ''}
            sx={{
              minHeight: 40,
              mx: 0.5,
              my: 0.25,
              px: 1.5,
              borderRadius: '8px',
              color: location.pathname.startsWith('/notifications') ? '#246bfd' : '#64748b',
              backgroundColor: location.pathname.startsWith('/notifications')
                ? '#eef2ff'
                : 'transparent',
              borderLeft: location.pathname.startsWith('/notifications')
                ? '3px solid #246bfd'
                : '3px solid transparent',
              fontWeight: location.pathname.startsWith('/notifications') ? 600 : 500,
              transition: 'all 120ms ease',
              '&:hover': {
                backgroundColor: location.pathname.startsWith('/notifications')
                  ? '#eef2ff'
                  : '#f1f5f9',
                color: location.pathname.startsWith('/notifications') ? '#246bfd' : '#0f172a',
                '& .MuiListItemIcon-root': {
                  color: location.pathname.startsWith('/notifications') ? '#246bfd' : '#0f172a',
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 32,
                color: location.pathname.startsWith('/notifications') ? '#246bfd' : '#64748b',
              }}
            >
              <Badge
                badgeContent={unread}
                color="error"
                max={99}
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: 10,
                    height: 16,
                    minWidth: 16,
                    fontWeight: 700,
                  },
                }}
              >
                <NotificationsNone fontSize="small" />
              </Badge>
            </ListItemIcon>
            <ListItemText
              primary="Thông báo"
              primaryTypographyProps={{
                fontSize: 13.5,
                fontWeight: location.pathname.startsWith('/notifications') ? 600 : 500,
                color: location.pathname.startsWith('/notifications') ? '#1e3a8a' : 'inherit',
              }}
            />
          </ListItemButton>
        </List>

        {(canAdministerTenant || canAdministerSystem) && (
          <>
            <Typography
              className="nav-label"
              sx={{
                px: 2.5,
                pt: 2.5,
                pb: 0.75,
                color: '#94a3b8',
                fontSize: '0.68rem',
                fontWeight: 750,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Quản trị
            </Typography>
            <List className="app-nav" sx={{ px: 1, py: 0 }}>
              {canAdministerTenant && tenant && (
                <>
                  <ListItemButton
                    component={NavLink}
                    to="/settings"
                    onClick={closeDrawer}
                    className={location.pathname.startsWith('/settings') ? 'active' : ''}
                    sx={{
                      minHeight: 40,
                      mx: 0.5,
                      my: 0.25,
                      px: 1.5,
                      borderRadius: '8px',
                      color: location.pathname.startsWith('/settings') ? '#246bfd' : '#64748b',
                      backgroundColor: location.pathname.startsWith('/settings')
                        ? '#eef2ff'
                        : 'transparent',
                      borderLeft: location.pathname.startsWith('/settings')
                        ? '3px solid #246bfd'
                        : '3px solid transparent',
                      fontWeight: location.pathname.startsWith('/settings') ? 600 : 500,
                      transition: 'all 120ms ease',
                      '&:hover': {
                        backgroundColor: location.pathname.startsWith('/settings')
                          ? '#eef2ff'
                          : '#f1f5f9',
                        color: location.pathname.startsWith('/settings') ? '#246bfd' : '#0f172a',
                        '& .MuiListItemIcon-root': {
                          color: location.pathname.startsWith('/settings') ? '#246bfd' : '#0f172a',
                        },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 32,
                        color: location.pathname.startsWith('/settings') ? '#246bfd' : '#64748b',
                      }}
                    >
                      <TuneOutlined fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Cài đặt workspace"
                      primaryTypographyProps={{
                        fontSize: 13.5,
                        fontWeight: location.pathname.startsWith('/settings') ? 600 : 500,
                        color: location.pathname.startsWith('/settings') ? '#1e3a8a' : 'inherit',
                      }}
                    />
                  </ListItemButton>
                  <ListItemButton
                    component={NavLink}
                    to={`/onboarding?tenant=${tenant.id}`}
                    onClick={closeDrawer}
                    sx={{
                      minHeight: 40,
                      mx: 0.5,
                      my: 0.25,
                      px: 1.5,
                      borderRadius: '8px',
                      color: '#64748b',
                      borderLeft: '3px solid transparent',
                      fontWeight: 500,
                      transition: 'all 120ms ease',
                      '&:hover': {
                        backgroundColor: '#f1f5f9',
                        color: '#0f172a',
                        '& .MuiListItemIcon-root': { color: '#0f172a' },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: '#64748b' }}>
                      <AdminPanelSettingsOutlined fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Trạng thái workspace"
                      primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }}
                    />
                  </ListItemButton>
                </>
              )}
              {canAdministerSystem && (
                <ListItemButton
                  component={NavLink}
                  to="/admin"
                  onClick={closeDrawer}
                  className={location.pathname.startsWith('/admin') ? 'active' : ''}
                  sx={{
                    minHeight: 40,
                    mx: 0.5,
                    my: 0.25,
                    px: 1.5,
                    borderRadius: '8px',
                    color: location.pathname.startsWith('/admin') ? '#246bfd' : '#64748b',
                    backgroundColor: location.pathname.startsWith('/admin')
                      ? '#eef2ff'
                      : 'transparent',
                    borderLeft: location.pathname.startsWith('/admin')
                      ? '3px solid #246bfd'
                      : '3px solid transparent',
                    fontWeight: location.pathname.startsWith('/admin') ? 600 : 500,
                    transition: 'all 120ms ease',
                    '&:hover': {
                      backgroundColor: location.pathname.startsWith('/admin')
                        ? '#eef2ff'
                        : '#f1f5f9',
                      color: location.pathname.startsWith('/admin') ? '#246bfd' : '#0f172a',
                      '& .MuiListItemIcon-root': {
                        color: location.pathname.startsWith('/admin') ? '#246bfd' : '#0f172a',
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 32,
                      color: location.pathname.startsWith('/admin') ? '#246bfd' : '#64748b',
                    }}
                  >
                    <AdminPanelSettingsOutlined fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="System Admin"
                    primaryTypographyProps={{
                      fontSize: 13.5,
                      fontWeight: location.pathname.startsWith('/admin') ? 600 : 500,
                      color: location.pathname.startsWith('/admin') ? '#1e3a8a' : 'inherit',
                    }}
                  />
                </ListItemButton>
              )}
            </List>
          </>
        )}
      </Box>

      {/* Bottom Profile Card */}
      <Box
        sx={{
          mt: 'auto',
          p: 1.5,
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            p: 1,
            borderRadius: '10px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            transition: 'all 150ms ease',
          }}
        >
          <Avatar
            src={session?.user.avatarUrl}
            sx={{
              width: 36,
              height: 36,
              fontSize: 13,
              fontWeight: 700,
              bgcolor: '#e0e7ff',
              color: '#3730a3',
              borderRadius: '8px',
            }}
          >
            {session?.user.displayName ? initials(session.user.displayName) : 'U'}
          </Avatar>
          <Box minWidth={0} flex={1}>
            <Typography
              variant="body2"
              fontWeight={650}
              noWrap
              sx={{ fontSize: 13, color: '#0f172a', lineHeight: 1.25 }}
            >
              {session?.user.displayName ?? 'Người dùng'}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              display="block"
              sx={{ fontSize: 11, mt: 0.2, color: '#64748b' }}
            >
              {userRoleLabel}
            </Typography>
          </Box>
          <Tooltip title="Đăng xuất">
            <IconButton
              size="small"
              aria-label="Đăng xuất"
              onClick={() => void logout()}
              sx={{
                color: '#64748b',
                borderRadius: '8px',
                p: 0.75,
                transition: 'all 150ms ease',
                '&:hover': {
                  backgroundColor: '#fee2e2',
                  color: '#ef4444',
                },
              }}
            >
              <Logout fontSize="small" sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            textAlign: 'center',
            mt: 1,
            fontSize: 10.5,
            color: '#94a3b8',
          }}
        >
          Dữ liệu chỉ hiển thị trong tổ chức này.
        </Typography>
      </Box>
    </Box>
  );

  return (
    <ThemeProvider theme={tenantTheme}>
      <Box className="app-frame" sx={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        {/* Top Header (AppBar) */}
        <AppBar
          position="fixed"
          color="inherit"
          elevation={0}
          className="app-topbar"
          sx={{
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            boxShadow: 'none',
            width: { md: `calc(100% - ${drawerWidth}px)` },
            ml: { md: `${drawerWidth}px` },
            zIndex: (t) => t.zIndex.drawer - 1,
          }}
        >
          <Toolbar sx={{ minHeight: '64px !important', px: { xs: 2, sm: 3 }, gap: 2 }}>
            {!desktop && (
              <IconButton
                edge="start"
                onClick={() => setDrawerOpen(true)}
                aria-label="Mở trình đơn"
                sx={{
                  color: '#64748b',
                  borderRadius: '8px',
                  '&:hover': { backgroundColor: '#f1f5f9', color: '#0f172a' },
                }}
              >
                <MenuIcon />
              </IconButton>
            )}

            {/* Tenant Switcher Button: Sleek Tenant Pill */}
            <Button
              className="tenant-switcher tenant-pill"
              data-testid="tenant-switcher"
              aria-label="Đổi không gian làm việc"
              onClick={(event) => setTenantAnchor(event.currentTarget)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 1.5,
                py: 0.6,
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                textTransform: 'none',
                transition: 'all 150ms ease',
                '&:hover': {
                  backgroundColor: '#f1f5f9',
                  borderColor: '#cbd5e1',
                },
              }}
            >
              <Avatar
                variant="rounded"
                className="tenant-switcher__avatar"
                sx={{
                  width: 24,
                  height: 24,
                  fontSize: 11,
                  fontWeight: 700,
                  bgcolor: '#e0e7ff',
                  color: '#3730a3',
                  borderRadius: '6px',
                }}
              >
                {tenant ? initials(tenant.name) : '—'}
              </Avatar>
              <Typography
                variant="body2"
                fontWeight={650}
                sx={{
                  fontSize: 13.5,
                  color: '#0f172a',
                  maxWidth: { xs: 120, sm: 220 },
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {tenant?.name ?? 'Chọn không gian'}
              </Typography>
              <Chip
                label={
                  tenant?.tier
                    ? (tierLabels[tenant.tier] ?? tenant.tier)
                    : tenant?.role === 'OWNER'
                    ? 'Chủ sở hữu'
                    : tenant?.role === 'ADMIN'
                    ? 'Quản trị viên'
                    : 'Thành viên'
                }
                size="small"
                sx={{
                  height: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: '6px',
                  backgroundColor: '#eef2ff',
                  color: '#246bfd',
                  border: '1px solid #c7d7fe',
                  cursor: 'inherit',
                }}
              />
              <KeyboardArrowDown
                fontSize="small"
                sx={{
                  color: '#64748b',
                  transform: Boolean(tenantAnchor) ? 'rotate(180deg)' : 'none',
                  transition: 'transform 200ms ease',
                  fontSize: 18,
                }}
              />
            </Button>

            <Box flex={1} />

            {/* Notification Bell */}
            <Tooltip title="Thông báo">
              <IconButton
                onClick={() => navigate('/notifications')}
                aria-label={`${unread} thông báo chưa đọc`}
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#64748b',
                  transition: 'all 150ms ease',
                  '&:hover': {
                    backgroundColor: '#f8fafc',
                    borderColor: '#cbd5e1',
                    color: '#0f172a',
                  },
                }}
              >
                <Badge
                  badgeContent={unread}
                  color="error"
                  max={99}
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: 10,
                      height: 16,
                      minWidth: 16,
                      fontWeight: 700,
                      backgroundColor: '#ef4444',
                    },
                  }}
                >
                  <NotificationsNone sx={{ fontSize: 20 }} />
                </Badge>
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        {/* Tenant Switcher Dropdown Menu */}
        <Menu
          anchorEl={tenantAnchor}
          open={Boolean(tenantAnchor)}
          onClose={() => setTenantAnchor(null)}
          PaperProps={{
            sx: {
              minWidth: 260,
              maxWidth: 340,
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.1)',
              border: '1px solid #e2e8f0',
              py: 0.5,
              mt: 1,
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
              sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}
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
                    borderRadius: '8px',
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

        {/* Sidebar Drawer */}
        <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
          <Drawer
            variant={desktop ? 'permanent' : 'temporary'}
            open={desktop || drawerOpen}
            onClose={closeDrawer}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                borderRight: '1px solid #e2e8f0',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                boxShadow: 'none',
              },
            }}
          >
            {drawer}
          </Drawer>
        </Box>

        {/* Main Content Viewport */}
        <Box
          component="main"
          className="app-content"
          sx={{
            ml: { md: `${drawerWidth}px` },
            width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
            minWidth: 0,
            pt: '64px',
            backgroundColor: '#f8fafc',
            minHeight: '100vh',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </ThemeProvider>
  );
}
