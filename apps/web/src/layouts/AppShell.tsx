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
  Alert,
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
  Snackbar,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { addRateLimitListener } from '../api/client';
import { notificationsApi, tenantSettingsApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import { TenantCustomizationDrawer } from '../components/TenantCustomizationDrawer';
import { formatTenantHost } from '../utils/tenantHost';

const drawerWidth = 240;

const primaryNavigation = [
  { label: 'Tổng quan', to: '/dashboard', icon: <DashboardOutlined /> },
  { label: 'Dự án', to: '/projects', icon: <WorkspacesOutlined /> },
  { label: 'Kanban', to: '/kanban', icon: <SpaceDashboardOutlined /> },
  { label: 'Thành viên', to: '/members', icon: <GroupsOutlined /> },
  { label: 'Tài nguyên', to: '/resources', icon: <FolderOutlined /> },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Tổng quan',
  '/projects': 'Dự án',
  '/kanban': 'Bảng Kanban',
  '/members': 'Thành viên',
  '/resources': 'Tài nguyên',
  '/notifications': 'Thông báo',
  '/settings': 'Cài đặt workspace',
  '/admin': 'Quản trị hệ thống',
  '/customization': 'Tùy biến dự án',
};

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
  const [rateLimited, setRateLimited] = useState(false);
  const { session, logout, tenants, currentTenant, selectTenant } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const customizationOpen = searchParams.get('customize') === 'tenant';
  const setCustomizationOpen = (open: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (open) next.set('customize', 'tenant');
    else next.delete('customize');
    setSearchParams(next, { replace: true });
  };
  const tenant = currentTenant ?? session?.activeTenant;
  const canAdministerTenant = tenant && ['OWNER', 'ADMIN'].includes(tenant.role);
  const canAdministerSystem = session?.user.platformRoles.includes('SYSTEM_ADMIN');

  useEffect(() => {
    return addRateLimitListener(() => {
      setRateLimited(true);
    });
  }, []);

  const matchedPath = Object.keys(PAGE_TITLES).find(
    (path) => location.pathname === path || (path !== '/' && location.pathname.startsWith(`${path}/`)),
  );
  const currentPageTitle = matchedPath ? PAGE_TITLES[matchedPath] : 'Không gian làm việc';

  useEffect(() => {
    document.title = `${currentPageTitle} · ${tenant?.name ?? 'TenantFlow'}`;
  }, [currentPageTitle, tenant?.name]);
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
      {/* Workspace Switcher Header */}
      <Box
        sx={{
          height: 64,
          minHeight: 64,
          px: 1.5,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Button
          fullWidth
          className="tenant-switcher tenant-pill"
          data-testid="tenant-switcher"
          aria-label="Đổi không gian làm việc"
          onClick={(event) => setTenantAnchor(event.currentTarget)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 1.2,
            px: 1,
            py: 0.75,
            borderRadius: '9px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            color: '#0f172a',
            textTransform: 'none',
            textAlign: 'left',
            transition: 'all 150ms ease',
            '&:hover': {
              backgroundColor: '#f1f5f9',
              borderColor: '#cbd5e1',
            },
          }}
        >
          <Box
            className="brand__symbol"
            component={activeBranding?.logoUrl ? 'img' : 'div'}
            src={activeBranding?.logoUrl ?? undefined}
            alt={activeBranding?.logoUrl ? `${tenant?.name ?? 'Tenant'} logo` : undefined}
            sx={{
              width: 32,
              height: 32,
              minWidth: 32,
              borderRadius: '8px',
              backgroundColor: activeBranding?.primaryColor ?? '#246bfd',
              display: 'grid',
              placeItems: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.875rem',
              boxShadow: '0 2px 5px rgba(15, 23, 42, 0.08)',
              objectFit: 'contain',
            }}
          >
            {activeBranding?.logoUrl ? null : tenant?.name ? initials(tenant.name) : 'T'}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="body2"
              fontWeight={750}
              noWrap
              sx={{
                fontSize: 13,
                color: '#0f172a',
                lineHeight: 1.25,
              }}
            >
              {tenant?.name ?? 'Chọn không gian'}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              display="block"
              sx={{ fontSize: 10.5, color: '#64748b' }}
            >
              {tenant?.slug ? formatTenantHost(tenant.slug) : 'workspace'}
            </Typography>
          </Box>
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
              fontSize: 10,
              fontWeight: 650,
              borderRadius: '5px',
              backgroundColor: activeBranding?.primaryColor ? `${activeBranding.primaryColor}15` : '#eef2ff',
              color: activeBranding?.primaryColor ?? '#246bfd',
              border: `1px solid ${activeBranding?.primaryColor ? `${activeBranding.primaryColor}30` : '#c7d7fe'}`,
              cursor: 'inherit',
              px: 0.25,
            }}
          />
          <KeyboardArrowDown
            fontSize="small"
            sx={{
              color: '#64748b',
              transform: Boolean(tenantAnchor) ? 'rotate(180deg)' : 'none',
              transition: 'transform 200ms ease',
              fontSize: 16,
              ml: -0.5,
            }}
          />
        </Button>
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
          {primaryNavigation.map((item) => {
            const isActive =
              location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            const primaryColor = activeBranding?.primaryColor ?? '#246bfd';
            const primaryLight = activeBranding?.primaryColor ? `${activeBranding.primaryColor}14` : '#eef2ff';
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
                  color: isActive ? primaryColor : '#64748b',
                  backgroundColor: isActive ? primaryLight : 'transparent',
                  borderLeft: isActive ? `3px solid ${primaryColor}` : '3px solid transparent',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 120ms ease',
                  '&:hover': {
                    backgroundColor: isActive ? primaryLight : '#f1f5f9',
                    color: isActive ? primaryColor : '#0f172a',
                    '& .MuiListItemIcon-root': {
                      color: isActive ? primaryColor : '#0f172a',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 32,
                    color: isActive ? primaryColor : '#64748b',
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
                    color: isActive ? primaryColor : 'inherit',
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
              color: location.pathname.startsWith('/notifications') ? (activeBranding?.primaryColor ?? '#246bfd') : '#64748b',
              backgroundColor: location.pathname.startsWith('/notifications')
                ? (activeBranding?.primaryColor ? `${activeBranding.primaryColor}14` : '#eef2ff')
                : 'transparent',
              borderLeft: location.pathname.startsWith('/notifications')
                ? `3px solid ${activeBranding?.primaryColor ?? '#246bfd'}`
                : '3px solid transparent',
              fontWeight: location.pathname.startsWith('/notifications') ? 600 : 500,
              transition: 'all 120ms ease',
              '&:hover': {
                backgroundColor: location.pathname.startsWith('/notifications')
                  ? (activeBranding?.primaryColor ? `${activeBranding.primaryColor}14` : '#eef2ff')
                  : '#f1f5f9',
                color: location.pathname.startsWith('/notifications') ? (activeBranding?.primaryColor ?? '#246bfd') : '#0f172a',
                '& .MuiListItemIcon-root': {
                  color: location.pathname.startsWith('/notifications') ? (activeBranding?.primaryColor ?? '#246bfd') : '#0f172a',
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 32,
                color: location.pathname.startsWith('/notifications') ? (activeBranding?.primaryColor ?? '#246bfd') : '#64748b',
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
                color: location.pathname.startsWith('/notifications') ? (activeBranding?.primaryColor ?? '#246bfd') : 'inherit',
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
                      color: location.pathname.startsWith('/settings') ? (activeBranding?.primaryColor ?? '#246bfd') : '#64748b',
                      backgroundColor: location.pathname.startsWith('/settings')
                        ? (activeBranding?.primaryColor ? `${activeBranding.primaryColor}14` : '#eef2ff')
                        : 'transparent',
                      borderLeft: location.pathname.startsWith('/settings')
                        ? `3px solid ${activeBranding?.primaryColor ?? '#246bfd'}`
                        : '3px solid transparent',
                      fontWeight: location.pathname.startsWith('/settings') ? 600 : 500,
                      transition: 'all 120ms ease',
                      '&:hover': {
                        backgroundColor: location.pathname.startsWith('/settings')
                          ? (activeBranding?.primaryColor ? `${activeBranding.primaryColor}14` : '#eef2ff')
                          : '#f1f5f9',
                        color: location.pathname.startsWith('/settings') ? (activeBranding?.primaryColor ?? '#246bfd') : '#0f172a',
                        '& .MuiListItemIcon-root': {
                          color: location.pathname.startsWith('/settings') ? (activeBranding?.primaryColor ?? '#246bfd') : '#0f172a',
                        },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 32,
                        color: location.pathname.startsWith('/settings') ? (activeBranding?.primaryColor ?? '#246bfd') : '#64748b',
                      }}
                    >
                      <TuneOutlined fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Cài đặt workspace"
                      primaryTypographyProps={{
                        fontSize: 13.5,
                        fontWeight: location.pathname.startsWith('/settings') ? 600 : 500,
                        color: location.pathname.startsWith('/settings') ? (activeBranding?.primaryColor ?? '#246bfd') : 'inherit',
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

            {/* Breadcrumb / Page Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body2"
                sx={{ color: '#64748b', fontWeight: 500, fontSize: 13 }}
              >
                Không gian
              </Typography>
              <Typography sx={{ color: '#cbd5e1', fontSize: 13 }}>/</Typography>
              <Typography
                variant="body1"
                sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}
              >
                {currentPageTitle}
              </Typography>
            </Box>

            <Box flex={1} />

            {canAdministerTenant && (
              <Tooltip title="Cấu hình tenant">
                <IconButton
                  aria-label="Cấu hình tenant"
                  onClick={() => setCustomizationOpen(true)}
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
                  <TuneOutlined sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            )}

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

            {/* User Profile Pill */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                pl: 1,
                borderLeft: '1px solid #e2e8f0',
              }}
            >
              <Avatar
                src={session?.user.avatarUrl}
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: 12,
                  fontWeight: 700,
                  bgcolor: '#e0e7ff',
                  color: '#3730a3',
                  borderRadius: '8px',
                }}
              >
                {session?.user.displayName ? initials(session.user.displayName) : 'U'}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  fontWeight={650}
                  noWrap
                  sx={{ fontSize: 13, color: '#0f172a', lineHeight: 1.2 }}
                >
                  {session?.user.displayName ?? 'Người dùng'}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  display="block"
                  sx={{ fontSize: 11, color: '#64748b' }}
                >
                  {userRoleLabel}
                </Typography>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>

        <TenantCustomizationDrawer open={customizationOpen} onClose={() => setCustomizationOpen(false)} />

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

        {/* Natural Rate Limit Snackbar (K3) */}
        <Snackbar
          open={rateLimited}
          autoHideDuration={6000}
          onClose={() => setRateLimited(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            severity="warning"
            variant="filled"
            onClose={() => setRateLimited(false)}
            sx={{
              borderRadius: '10px',
              fontWeight: 500,
              fontSize: '0.85rem',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
              backgroundColor: '#d97706',
              color: '#ffffff',
            }}
          >
            Không gian làm việc <strong>{tenant?.name ?? ''}</strong> đang có lưu lượng thao tác cao vượt mức gói dịch vụ. Hệ thống tự động tạm giãn nhịp xử lý, vui lòng thử lại sau giây lát.
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
