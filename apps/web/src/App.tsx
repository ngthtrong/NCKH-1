import React, { useEffect, useState } from 'react';
import {
  Kanban,
  Layers,
  LogOut,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import { api, getStoredToken, setStoredToken } from './api';
import { AdminView } from './components/AdminView';
import { KanbanView } from './components/KanbanView';
import { LoginView } from './components/LoginView';
import { MembersView } from './components/MembersView';
import { SettingsView } from './components/SettingsView';
import { WorkspaceSelector } from './components/WorkspaceSelector';
import type { AuthUser, TenantInfo, TenantSettings, WorkspaceSummary } from './types';

type Tab = 'kanban' | 'members' | 'settings' | 'admin';

function applyThemeCss(settings: TenantSettings | null) {
  const primary = settings?.theme?.primary || '#1D4ED8';
  const accent = settings?.theme?.accent || '#0EA5E9';
  document.documentElement.style.setProperty('--color-primary', primary);
  document.documentElement.style.setProperty('--color-accent', accent);
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [me, setMe] = useState<TenantInfo | null>(null);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('kanban');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Pre-auth workspace selection state
  const [preAuth, setPreAuth] = useState<{
    user: AuthUser;
    preAuthToken: string;
    workspaces: WorkspaceSummary[];
  } | null>(null);

  const loadWorkspaceSession = async () => {
    const token = getStoredToken();
    if (!token) {
      setBooting(false);
      return;
    }
    try {
      const info = await api.me();
      setMe(info);
      if (info.systemAdmin) {
        setActiveTab('admin');
        applyThemeCss(null);
      } else {
        const s = await api.getSettings();
        setSettings(s);
        applyThemeCss(s);
        setActiveTab('kanban');
      }
    } catch {
      setStoredToken(null);
      setMe(null);
      setSettings(null);
    } finally {
      setBooting(false);
    }
  };

  useEffect(() => {
    // Check for cross-subdomain token passed in URL hash (#token=...)
    const hash = window.location.hash;
    if (hash.startsWith('#token=')) {
      const token = decodeURIComponent(hash.slice('#token='.length));
      setStoredToken(token);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    loadWorkspaceSession();
  }, []);

  const handleLoginSuccess = async (data: {
    user: AuthUser;
    preAuthToken: string;
    accessToken?: string;
    workspaces: WorkspaceSummary[];
  }) => {
    if (data.user.systemAdmin && data.accessToken) {
      setStoredToken(data.accessToken);
      setPreAuth(null);
      loadWorkspaceSession();
      return;
    }

    setLoginError(null);
    const hostSub = window.location.hostname.endsWith('.localhost')
      ? window.location.hostname.replace('.localhost', '')
      : null;

    // If user is on a specific tenant subdomain (e.g. t-acme.localhost), reject accounts not belonging to that tenant
    if (hostSub) {
      const matched = data.workspaces.find((w) => w.slug === hostSub);
      if (!matched) {
        const allowed = data.workspaces.map((w) => w.slug).join(', ') || 'không có';
        setLoginError(
          `Lỗi 403 — Tài khoản ${data.user.email} không thuộc tổ chức "${hostSub}" (tổ chức hợp lệ: ${allowed}).`
        );
        return;
      }
      if (matched.status !== 'ACTIVE') {
        setLoginError(`Tổ chức "${hostSub}" đang bị tạm khóa (SUSPENDED).`);
        return;
      }
      const res = await api.switchWorkspace(matched.slug, data.preAuthToken);
      setStoredToken(res.accessToken);
      setPreAuth(null);
      loadWorkspaceSession();
      return;
    }

    // On root localhost: auto-enter if user belongs to only 1 Tenant
    if (data.workspaces.length === 1) {
      const target = data.workspaces[0];
      if (target.status !== 'ACTIVE') {
        setLoginError(`Tổ chức "${target.slug}" đang bị tạm khóa (SUSPENDED).`);
        return;
      }
      const res = await api.switchWorkspace(target.slug, data.preAuthToken);
      const { protocol, port } = window.location;
      const portPart = port ? `:${port}` : '';
      window.location.href = `${protocol}//${target.slug}.localhost${portPart}/#token=${encodeURIComponent(res.accessToken)}`;
      return;
    }

    setPreAuth({
      user: data.user,
      preAuthToken: data.preAuthToken,
      workspaces: data.workspaces,
    });
  };

  const handleLogout = () => {
    setStoredToken(null);
    setMe(null);
    setSettings(null);
    setPreAuth(null);
    applyThemeCss(null);
  };

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Đang khởi tạo phiên làm việc TenantFlow...
      </div>
    );
  }

  if (!me) {
    if (preAuth) {
      return (
        <WorkspaceSelector
          user={preAuth.user}
          workspaces={preAuth.workspaces}
          preAuthToken={preAuth.preAuthToken}
          onSwitchedSameOrigin={(accessToken) => {
            setStoredToken(accessToken);
            setPreAuth(null);
            loadWorkspaceSession();
          }}
          onLogout={handleLogout}
        />
      );
    }
    return <LoginView externalError={loginError} onLoginSuccess={handleLoginSuccess} />;
  }

  const isTenantAdmin = me.role === 'TENANT_ADMIN';

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 text-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary text-white">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-white text-sm truncate">TenantFlow</div>
            <div className="text-[11px] text-slate-400 font-mono truncate">
              {me.systemAdmin ? 'SYSTEM ADMIN' : `${me.slug} • ${me.tier}`}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {!me.systemAdmin && (
            <>
              <button
                onClick={() => setActiveTab('kanban')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === 'kanban'
                    ? 'bg-primary text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Kanban className="w-4 h-4" /> Kanban
              </button>

              <button
                onClick={() => setActiveTab('members')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === 'members'
                    ? 'bg-primary text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4" /> Thành viên
              </button>

              {isTenantAdmin && (
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === 'settings'
                      ? 'bg-primary text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Settings className="w-4 h-4" /> Cài đặt Tổ chức
                </button>
              )}
            </>
          )}

          {me.systemAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'admin'
                  ? 'bg-primary text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Shield className="w-4 h-4" /> Quản trị Hệ thống
            </button>
          )}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-2">
          <div className="px-2">
            <div className="text-xs font-semibold text-white truncate">{me.fullName}</div>
            <div className="text-[11px] text-slate-400 truncate">{me.email}</div>
            <div className="mt-1 inline-block px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-accent">
              {me.role}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Đăng xuất / Đổi tổ chức
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 border-t-[3px]" style={{ borderTopColor: 'var(--color-primary)' }}>
        <header className="h-14 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">{me.systemAdmin ? 'Bảng điều khiển Hệ thống' : me.slug}</span>
            <code className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/70">
              {window.location.host}
            </code>
            {!me.systemAdmin && settings && (
              <>
                <span className="px-2 py-0.5 rounded-md text-xs font-medium border" style={{
                  borderColor: settings.wipMode === 'STRICT' ? '#FECACA' : '#FDE68A',
                  backgroundColor: settings.wipMode === 'STRICT' ? '#FEF2F2' : '#FFFBEB',
                  color: settings.wipMode === 'STRICT' ? '#B91C1C' : '#B45309',
                }}>
                  WIP: {settings.wipMode}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                  Thẻ: {settings.cardDisplayMode}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Nhận diện</span>
            <span
              className="w-3.5 h-3.5 rounded-full inline-block ring-2 ring-slate-200"
              style={{ backgroundColor: 'var(--color-primary)' }}
              title="Màu chủ đạo"
            />
            <span
              className="w-3.5 h-3.5 rounded-full inline-block ring-2 ring-slate-200"
              style={{ backgroundColor: 'var(--color-accent)' }}
              title="Màu nhấn"
            />
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {activeTab === 'kanban' && settings && <KanbanView isAdmin={isTenantAdmin} settings={settings} />}
          {activeTab === 'members' && <MembersView isAdmin={isTenantAdmin} currentUserId={me.userId} />}
          {activeTab === 'settings' && settings && isTenantAdmin && (
            <SettingsView
              settings={settings}
              onSettingsUpdated={(updated) => {
                setSettings(updated);
                applyThemeCss(updated);
              }}
            />
          )}
          {activeTab === 'admin' && me.systemAdmin && <AdminView />}
        </main>
      </div>
    </div>
  );
}
