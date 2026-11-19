import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullPageLoader } from '../components/AsyncState';
import { useAuth } from './AuthContext';

interface RequireAuthProps {
  tenant?: boolean;
  administrator?: boolean;
  systemAdministrator?: boolean;
}

export function RequireAuth({
  tenant = false,
  administrator = false,
  systemAdministrator = false,
}: RequireAuthProps) {
  const { status, session } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader label="Đang khôi phục phiên làm việc…" />;
  if (status === 'anonymous' || !session) {
    return (
      <Navigate
        to="/login"
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
        replace
      />
    );
  }
  const isSystemAdmin = Boolean(
    session.user.systemAdmin || session.user.platformRoles?.includes('SYSTEM_ADMIN'),
  );
  if (tenant && !session.activeTenant) return <Navigate to="/select-tenant" replace />;
  if (
    administrator &&
    !isSystemAdmin &&
    (!session.activeTenant || !['OWNER', 'ADMIN'].includes(session.activeTenant.role))
  ) {
    return <Navigate to="/dashboard" replace />;
  }
  if (systemAdministrator && !isSystemAdmin) {
    return <Navigate to={session.activeTenant ? '/dashboard' : '/select-tenant'} replace />;
  }
  return <Outlet />;
}
