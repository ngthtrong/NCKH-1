import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Globe,
  LayoutDashboard,
  Layers,
  LogOut,
  Palette,
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
import { OverviewView } from './components/OverviewView';
import { SettingsView } from './components/SettingsView';
import { buildRootUrl } from './utils/domain';
import type { TenantInfo, TenantSettings } from './types';

type Tab = 'overview' | 'kanban' | 'members' | 'settings' | 'admin';

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
  const isIp = parts.every((p) => !isNaN(Number(p)));
  if (isIp) {
    return null;
  }
  return parts.length >= 3 ? parts[0] : null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }
  return null;
}

function applyThemeCss(settings: TenantSettings | null) {
  const primary = settings?.theme?.primary || '#0d6efd';
  const accent = settings?.theme?.accent || '#0ea5e9';
  const rgb = hexToRgb(primary) || { r: 13, g: 110, b: 253 };

  // Subtle dark background with adaptive brand tint
  const bgR = Math.min(26, Math.round(8 + rgb.r * 0.06));
  const bgG = Math.min(26, Math.round(10 + rgb.g * 0.06));
  const bgB = Math.min(36, Math.round(16 + rgb.b * 0.08));

  document.documentElement.style.setProperty('--color-primary', primary);
  document.documentElement.style.setProperty('--color-accent', accent);
  document.documentElement.style.setProperty('--color-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  document.documentElement.style.setProperty('--brand-primary', primary);
  document.documentElement.style.setProperty('--brand-accent', accent);
  document.documentElement.style.setProperty('--brand-sidebar-bg', `rgb(${bgR}, ${bgG}, ${bgB})`);
  document.documentElement.style.setProperty('--brand-sidebar-border', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)`);
  document.documentElement.style.setProperty('--brand-active-bg', `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`);
  document.documentElement.style.setProperty('--brand-active-glow', `0 0 16px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`);
  document.documentElement.style.setProperty('--brand-header-strip', `linear-gradient(90deg, ${primary} 0%, ${accent} 60%, transparent 100%)`);
}

function parseJwt(token: string): {
  sub?: string;
  email?: string;
  role?: string;
  system_admin?: boolean;
  slug?: string;
  exp?: number;
} | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export default function App() {
  const subdomain = getHostSubdomain();
  const [booting, setBooting] = useState(Boolean(subdomain));
  const [me, setMe] = useState<TenantInfo | null>(null);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const loadSession = async () => {
    // 1. Check URL parameters for explicit force-login or join action
    const urlParams = new URLSearchParams(window.location.search);
    const forceLogin = urlParams.get('forceLogin') === '1';
    const actionJoin = urlParams.get('action') === 'join';
    const emailParam = urlParams.get('email')?.trim().toLowerCase();

    // If forceLogin is present, clean it from URL and purge any existing session
    if (forceLogin) {
      setStoredToken(null);
      setMe(null);
      setSettings(null);
      urlParams.delete('forceLogin');
      const cleanSearch = urlParams.toString();
      const cleanUrl = window.location.pathname + (cleanSearch ? `?${cleanSearch}` : '') + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
      setBooting(false);
      return;
    }

    if (actionJoin) {
      setStoredToken(null);
      setMe(null);
      setSettings(null);
      setBooting(false);
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setBooting(false);
      return;
    }

    // 2. Validate token structure, expiration, and domain/role match
    const payload = parseJwt(token);
    if (!payload || !payload.exp || payload.exp * 1000 <= Date.now()) {
      setStoredToken(null);
      setMe(null);
      setSettings(null);
      setBooting(false);
      return;
    }

    // If URL specified an email and it differs from token, force re-login
    if (emailParam && payload.email && payload.email.toLowerCase() !== emailParam) {
      setStoredToken(null);
      setMe(null);
      setSettings(null);
      setBooting(false);
      return;
    }

    // Subdomain & role matching
    if (subdomain === 'admin') {
      if (!payload.system_admin && payload.role !== 'PLATFORM_ADMIN') {
        setStoredToken(null);
        setMe(null);
        setSettings(null);
        setBooting(false);
        return;
      }
    } else if (subdomain) {
      if (payload.slug && payload.slug.toLowerCase() !== subdomain.toLowerCase()) {
        setStoredToken(null);
        setMe(null);
        setSettings(null);
        setBooting(false);
        return;
      }
    }

    // 3. Verify session with backend /api/auth/me
    try {
      const info = await api.me();
      if (subdomain === 'admin' && !info.systemAdmin) {
        throw new Error('Not platform admin');
      }
      if (subdomain && subdomain !== 'admin' && info.slug.toLowerCase() !== subdomain.toLowerCase()) {
        throw new Error('Tenant subdomain mismatch');
      }

      setMe(info);
      if (info.systemAdmin) {
        setActiveTab('admin');
        applyThemeCss(null);
      } else {
        const s = await api.getSettings();
        setSettings(s);
        applyThemeCss(s);
        setActiveTab('overview');
      }
    } catch {
      setStoredToken(null);
      setMe(null);
      setSettings(null);
      applyThemeCss(null);
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
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-300 text-sm font-medium">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang khởi tạo phiên làm việc TenantFlow...</span>
        </div>
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
  const logoText = me.systemAdmin
    ? 'TF'
    : settings?.theme?.logoText || (me.slug ? me.slug.slice(0, 4).toUpperCase() : 'TENANT');

  return (
    <div className="min-h-screen flex bg-slate-100/70 text-slate-900 antialiased overflow-hidden">
      {/* Sidebar: Adaptive Brand Luminescence */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-16' : 'w-56'
        } text-slate-200 flex flex-col shrink-0 transition-all duration-200 border-r z-20`}
        style={{
          backgroundColor: me.systemAdmin ? '#090d16' : 'var(--brand-sidebar-bg, #090e17)',
          borderColor: me.systemAdmin ? 'rgba(99, 102, 241, 0.2)' : 'var(--brand-sidebar-border, rgba(255, 255, 255, 0.08))',
        }}
      >
        {/* Brand Header */}
        <div className="h-13 px-3.5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0 shadow-sm"
              style={{ backgroundColor: 'var(--color-primary, #0d6efd)' }}
            >
              {me.systemAdmin ? <Layers className="w-4 h-4" /> : logoText}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="font-bold text-white text-xs truncate tracking-tight">
                  {me.systemAdmin ? 'Platform Admin' : me.slug}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {me.systemAdmin ? 'TENANTFLOW CORE' : `Gói ${me.tier}`}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation: 4 Core Enterprise Sections */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {!me.systemAdmin && (
            <>
              {/* 1. Tổng quan */}
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'overview'
                    ? 'text-white shadow-sm ring-1 ring-white/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
                style={
                  activeTab === 'overview'
                    ? { background: 'var(--brand-active-bg)', boxShadow: 'var(--brand-active-glow)' }
                    : undefined
                }
                title="Tổng quan Doanh nghiệp"
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span>Tổng quan</span>}
              </button>

              {/* 2. Bảng công việc */}
              <button
                onClick={() => setActiveTab('kanban')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'kanban'
                    ? 'text-white shadow-sm ring-1 ring-white/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
                style={
                  activeTab === 'kanban'
                    ? { background: 'var(--brand-active-bg)', boxShadow: 'var(--brand-active-glow)' }
                    : undefined
                }
                title="Bảng công việc"
              >
                <FolderKanban className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span>Bảng công việc</span>}
              </button>

              {/* 3. Nhân sự */}
              <button
                onClick={() => setActiveTab('members')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'members'
                    ? 'text-white shadow-sm ring-1 ring-white/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
                style={
                  activeTab === 'members'
                    ? { background: 'var(--brand-active-bg)', boxShadow: 'var(--brand-active-glow)' }
                    : undefined
                }
                title="Nhân sự"
              >
                <Users className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span>Nhân sự</span>}
              </button>

              {/* 4. Cài đặt Doanh nghiệp (TENANT_ADMIN only) */}
              {isTenantAdmin && (
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'settings'
                      ? 'text-white shadow-sm ring-1 ring-white/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                  style={
                    activeTab === 'settings'
                      ? { background: 'var(--brand-active-bg)', boxShadow: 'var(--brand-active-glow)' }
                      : undefined
                  }
                  title="Cài đặt Doanh nghiệp"
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Cài đặt Doanh nghiệp</span>}
                </button>
              )}
            </>
          )}

          {me.systemAdmin && (
            <>
              <button
                onClick={() => setActiveTab('admin')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'admin'
                    ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-white/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title="Giám sát & Quản trị Hệ thống"
              >
                <Shield className="w-4 h-4 shrink-0 text-indigo-300" />
                {!sidebarCollapsed && <span>Giám sát Hệ thống</span>}
              </button>

              <a
                href={buildRootUrl()}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition"
                title="Mở Trang chủ & Đăng ký Dịch vụ"
              >
                <Globe className="w-4 h-4 shrink-0 text-slate-400" />
                {!sidebarCollapsed && <span>Trang chủ Dịch vụ</span>}
              </a>
            </>
          )}
        </nav>

        {/* User Card & Logout */}
        <div className="p-2 border-t border-slate-800/80 bg-slate-950/60">
          {!sidebarCollapsed ? (
            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 mb-2">
              <div className="text-xs font-semibold text-white truncate">{me.fullName}</div>
              <div className="text-[10px] text-slate-400 truncate font-mono">{me.email}</div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-800 text-[9px] font-mono font-semibold text-slate-300">
                  {me.role}
                </span>
                {!me.systemAdmin && (
                  <>
                    <span className="text-[10px] text-slate-500">•</span>
                    <span className="text-[10px] text-slate-400 font-medium">Gói {me.tier}</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-2">
              <div
                className="w-7 h-7 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center"
                title={`${me.fullName} (${me.email})`}
              >
                {me.fullName ? me.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition"
            title="Đăng xuất"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!sidebarCollapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Brand Accent Line */}
        <div
          className="h-0.5 w-full shrink-0"
          style={{
            background: me.systemAdmin
              ? 'linear-gradient(90deg, #6366f1, #3b82f6, transparent)'
              : 'var(--brand-header-strip, #0d6efd)',
          }}
        />

        {/* Top Navbar: Clean SaaS Header */}
        <header className="h-13 bg-white border-b border-slate-200/90 px-4 flex items-center justify-between gap-3 shrink-0 shadow-xs z-10">
          {/* Left: Organization context & Tier */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-lg text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs"
              style={{ backgroundColor: 'var(--color-primary, #0d6efd)' }}
            >
              {me.systemAdmin ? <Layers className="w-4 h-4" /> : logoText}
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-sm text-slate-800 truncate">
                {me.systemAdmin ? 'TenantFlow Platform Core' : (settings?.theme?.tagline || me.slug)}
              </span>
              {!me.systemAdmin && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold shrink-0">
                  Gói {me.tier}
                </span>
              )}
            </div>
          </div>

          {/* Right: Theme Swatches & User Profile */}
          <div className="flex items-center gap-3 text-xs shrink-0">
            {!me.systemAdmin && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200/80"
                title="Màu thương hiệu doanh nghiệp"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full inline-block border border-slate-300 shadow-2xs"
                  style={{ backgroundColor: 'var(--color-primary, #0d6efd)' }}
                  title="Màu chủ đạo doanh nghiệp (Primary)"
                />
                <span
                  className="w-3.5 h-3.5 rounded-full inline-block border border-slate-300 shadow-2xs"
                  style={{ backgroundColor: 'var(--color-accent, #0ea5e9)' }}
                  title="Màu nhấn doanh nghiệp (Accent)"
                />
              </div>
            )}

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div
                className="w-7 h-7 rounded-full text-white text-[11px] font-bold flex items-center justify-center shadow-xs shrink-0"
                style={{ backgroundColor: 'var(--color-primary, #0d6efd)' }}
                title={`${me.fullName} (${me.email})`}
              >
                {me.fullName ? me.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-slate-800 leading-tight whitespace-nowrap">
                  {me.fullName}
                </div>
                <div className="text-[10px] text-slate-500 leading-tight font-medium">
                  {me.role}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto bg-slate-50/50">
          {activeTab === 'overview' && settings && (
            <OverviewView
              tenantInfo={me}
              settings={settings}
              isAdmin={isTenantAdmin}
              onSelectBoard={(boardId) => {
                setSelectedBoardId(boardId);
                setActiveTab('kanban');
              }}
              onNavigateToTab={(tab) => {
                setActiveTab(tab);
              }}
            />
          )}
          {activeTab === 'kanban' && settings && (
            <KanbanView
              isAdmin={isTenantAdmin}
              settings={settings}
              selectedBoardId={selectedBoardId}
              onSelectBoardId={setSelectedBoardId}
              tenantSlug={me.slug}
              tier={me.tier}
            />
          )}
          {activeTab === 'members' && (
            <MembersView
              isAdmin={isTenantAdmin}
              currentUserId={me.userId}
              tier={me.tier}
              settings={settings || undefined}
              tenantSlug={me.slug}
            />
          )}
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

      {/* Modern Architecture Telemetry Bar / Drawer */}
      <InspectorDrawer currentTenant={me} />
    </div>
  );
}
