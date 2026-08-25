import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullPageLoader } from '../components/AsyncState';
import { useAuth } from './AuthContext';

interface RequireAuthProps {
  tenant?: boolean;
  administrator?: boolean;
}

export function RequireAuth({ tenant = false, administrator = false }: RequireAuthProps) {
  const { status, session } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader label="Đang khôi phục phiên làm việc…" />;
  if (status === 'anonymous' || !session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (tenant && !session.activeTenant) return <Navigate to="/select-tenant" replace />;
  if (
    administrator &&
    !session.user.platformRoles?.includes('PLATFORM_ADMIN') &&
    (!session.activeTenant || !['OWNER', 'ADMIN'].includes(session.activeTenant.role))
  ) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
