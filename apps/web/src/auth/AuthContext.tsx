import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { authApi, tenantsApi } from '../api/endpoints';
import { ApiError, setApiAccessToken, setApiSessionRefreshHandler } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import type { LoginRequest, RegisterRequest, Session, TenantSummary } from '../api/types';

type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  tenants: TenantSummary[];
  login: (credentials: LoginRequest) => Promise<TenantSummary[]>;
  register: (details: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  selectTenant: (tenant: TenantSummary) => Promise<void>;
  exchangeTenantCode: (code: string) => Promise<void>;
  reloadTenants: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const sessionEpoch = useRef(0);

  const commitSession = useCallback((next: Session | null) => {
    setSession(next);
    setApiAccessToken(next?.accessToken ?? null);
    setStatus(next ? 'authenticated' : 'anonymous');
  }, []);

  useEffect(() => {
    setApiSessionRefreshHandler(async () => {
      const epoch = sessionEpoch.current;
      try {
        const next = await authApi.refresh();
        if (epoch !== sessionEpoch.current) return null;
        commitSession(next);
        return next.accessToken;
      } catch (error) {
        if (epoch === sessionEpoch.current) {
          setTenants([]);
          queryClient.clear();
          commitSession(null);
        }
        throw error;
      }
    });
    return () => setApiSessionRefreshHandler(null);
  }, [commitSession, queryClient]);

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
      sessionEpoch.current += 1;
      const response = await authApi.login(credentials);
      const { tenants: availableTenants, ...nextSession } = response;
      commitSession(nextSession);
      setTenants(availableTenants);
      return availableTenants;
    },
    [commitSession],
  );

  const register = useCallback(
    async (details: RegisterRequest) => {
      sessionEpoch.current += 1;
      const response = await authApi.register(details);
      const { tenants: availableTenants, ...nextSession } = response;
      commitSession(nextSession);
      setTenants(availableTenants);
    },
    [commitSession],
  );

  const logout = useCallback(async () => {
    sessionEpoch.current += 1;
    try {
      await authApi.logout();
    } finally {
      setTenants([]);
      queryClient.clear();
      commitSession(null);
    }
  }, [commitSession, queryClient]);

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
      sessionEpoch.current += 1;
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
      register,
      logout,
      selectTenant,
      exchangeTenantCode,
      reloadTenants,
    }),
    [status, session, tenants, login, register, logout, selectTenant, exchangeTenantCode, reloadTenants],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
