import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { authApi, tenantsApi } from '../api/endpoints';
import { ApiError, setApiAccessToken } from '../api/client';
import type { LoginRequest, Session, TenantSummary } from '../api/types';

type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  tenants: TenantSummary[];
  login: (credentials: LoginRequest) => Promise<TenantSummary[]>;
  logout: () => Promise<void>;
  selectTenant: (tenant: TenantSummary) => Promise<void>;
  exchangeTenantCode: (code: string) => Promise<void>;
  reloadTenants: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);

  const commitSession = useCallback((next: Session | null) => {
    setSession(next);
    setApiAccessToken(next?.accessToken ?? null);
    setStatus(next ? 'authenticated' : 'anonymous');
  }, []);

  useEffect(() => {
    let active = true;
    if (
      window.location.pathname === '/auth/exchange' &&
      new URLSearchParams(window.location.search).has('code')
    ) {
      setStatus('anonymous');
      return () => {
        active = false;
      };
    }
    authApi
      .refresh()
      .then((next) => {
        if (!active) return;
        commitSession(next);
        return tenantsApi.list().then((items) => active && setTenants(items));
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (!(error instanceof ApiError) || ![401, 403].includes(error.status)) {
          // A refresh network failure must not leave the application in a loading loop.
          console.warn('Unable to restore the browser session.', error);
        }
        commitSession(null);
      });
    return () => {
      active = false;
    };
  }, [commitSession]);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const response = await authApi.login(credentials);
      const { tenants: availableTenants, ...nextSession } = response;
      commitSession(nextSession);
      setTenants(availableTenants);
      return availableTenants;
    },
    [commitSession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setTenants([]);
      commitSession(null);
    }
  }, [commitSession]);

  const selectTenant = useCallback(async (tenant: TenantSummary) => {
    const transfer = await authApi.createTenantTransfer(tenant.slug);
    const target = new URL(transfer.redirectUrl, window.location.origin);
    const currentHost = window.location.hostname;
    const hostSuffix = currentHost.includes('.')
      ? currentHost.slice(currentHost.indexOf('.'))
      : `.${currentHost}`;
    const expectedHost = `${tenant.slug}${hostSuffix}`;
    const configuredHost = tenant.host
      ? new URL(
          tenant.host.includes('://') ? tenant.host : `${window.location.protocol}//${tenant.host}`,
        ).hostname
      : expectedHost;
    if (
      !['http:', 'https:'].includes(target.protocol) ||
      target.username ||
      target.password ||
      ![expectedHost, configuredHost].includes(target.hostname)
    ) {
      throw new Error('Backend trả về địa chỉ tenant không hợp lệ.');
    }
    window.location.assign(target.toString());
  }, []);

  const exchangeTenantCode = useCallback(
    async (code: string) => {
      const next = await authApi.exchange(code);
      commitSession(next);
      const availableTenants = await tenantsApi.list();
      setTenants(availableTenants);
    },
    [commitSession],
  );

  const reloadTenants = useCallback(async () => {
    setTenants(await tenantsApi.list());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      tenants,
      login,
      logout,
      selectTenant,
      exchangeTenantCode,
      reloadTenants,
    }),
    [status, session, tenants, login, logout, selectTenant, exchangeTenantCode, reloadTenants],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
