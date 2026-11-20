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
import { InspectorDrawer } from './components/InspectorDrawer';
import { KanbanView } from './components/KanbanView';
import { LandingOnboardingView } from './components/LandingOnboardingView';
import { LoginView } from './components/LoginView';
import { MembersView } from './components/MembersView';
import { SettingsView } from './components/SettingsView';
import type { TenantInfo, TenantSettings } from './types';

type Tab = 'kanban' | 'members' | 'settings' | 'admin';

function getHostSubdomain(): string | null {
  const host = window.location.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') {
    return null;
  }
  if (host.endsWith('.localhost')) {
    const sub = host.slice(0, -'.localhost'.length);
    return sub || null;
  }
  const parts = host.split('.');
  return parts.length >= 3 ? parts[0] : null;
}

function applyThemeCss(settings: TenantSettings | null) {
  const primary = settings?.theme?.primary || '#0d6efd';
  const accent = settings?.theme?.accent || '#0ea5e9';
  document.documentElement.style.setProperty('--color-primary', primary);
  document.documentElement.style.setProperty('--color-accent', accent);
}

export default function App() {
  const subdomain = getHostSubdomain();
  const [booting, setBooting] = useState(Boolean(subdomain));
  const [me, setMe] = useState<TenantInfo | null>(null);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('kanban');

  const loadSession = async () => {
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
    if (subdomain) {
      loadSession();
    }
  }, [subdomain]);

  const handleLogout = () => {
    setStoredToken(null);
    setMe(null);
    setSettings(null);
    applyThemeCss(null);
  };

  // Door 1A: Root SaaS Landing & Self-Service Onboarding (bare localhost)
  if (!subdomain) {
    return <LandingOnboardingView />;
  }

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Đang khởi tạo phiên làm việc TenantFlow...
      </div>
    );
  }

  // Door 1B (admin.localhost) or Door 2 ({tenant}.localhost) Login
  if (!me) {
    return (
      <LoginView
        subdomain={subdomain}
        onLoginSuccess={(data) => {
          setStoredToken(data.accessToken);
          loadSession();
        }}
      />
    );
  }

  const isTenantAdmin = me.role === 'TENANT_ADMIN';

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 text-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary text-white font-bold text-xs">
            {me.systemAdmin ? <Layers className="w-5 h-5" /> : settings?.theme?.logoText || me.slug.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-white text-sm truncate">
              {me.systemAdmin ? 'TenantFlow' : me.slug}
            </div>
            <div className="text-[11px] text-slate-400 font-mono truncate">
              {me.systemAdmin ? 'PLATFORM_ADMIN' : `${me.tier} • ${me.role}`}
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
                <Kanban className="w-4 h-4" /> Bảng Kanban
              </button>

              <button
                onClick={() => setActiveTab('members')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === 'members'
                    ? 'bg-primary text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4" /> Nhân sự
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
            <LogOut className="w-3.5 h-3.5" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 border-t-[3px]" style={{ borderTopColor: 'var(--color-primary)' }}>
        <header className="h-14 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span
              className="px-2.5 py-1 rounded-md text-white font-semibold"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {me.systemAdmin ? 'Platform Admin' : settings?.theme?.logoText || me.slug}
            </span>
            <code className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/70">
              {window.location.host}
            </code>
            {!me.systemAdmin && settings && (
              <>
                <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">
                  Gói {me.tier}
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-semibold ${
                    settings.wipMode === 'STRICT'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : settings.wipMode === 'WARN'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  WIP: {settings.wipMode}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  Thẻ: {settings.cardDisplayMode}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="hidden sm:inline">{settings?.theme?.tagline}</span>
            <span
              className="w-3.5 h-3.5 rounded-full inline-block border border-slate-200"
              style={{ backgroundColor: 'var(--color-primary)' }}
              title="Primary Color"
            />
            <span
              className="w-3.5 h-3.5 rounded-full inline-block border border-slate-200"
              style={{ backgroundColor: 'var(--color-accent)' }}
              title="Accent Color"
            />
          </div>
        </header>

        <main className="flex-1 overflow-auto pb-16">
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

      {/* Live Architecture Inspector Drawer */}
      <InspectorDrawer />
    </div>
  );
}
