import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Key,
  Layers,
  Lock,
  LogIn,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
} from 'lucide-react';
import { api, ApiError } from '../api';
import { buildRootUrl } from '../utils/domain';
import type { AuthUser, PublicBranding, TenantSettings } from '../types';

interface Props {
  subdomain: string;
  onLoginSuccess: (data: {
    accessToken: string;
    user: AuthUser;
    tenant?: { id: string; slug: string; name: string; tier: string; settings: TenantSettings };
  }) => void;
}

interface DemoAccount {
  label: string;
  role: 'TENANT_ADMIN' | 'MEMBER' | 'PLATFORM_ADMIN';
  email: string;
  note?: '403';
  desc: string;
}

const DEMO_BY_SUBDOMAIN: Record<string, DemoAccount[]> = {
  admin: [
    {
      label: 'Platform Admin',
      role: 'PLATFORM_ADMIN',
      email: 'admin@tenantflow.vn',
      desc: 'Quản trị viên toàn hệ thống SaaS (Control Plane)',
    },
  ],
  't-acme': [
    {
      label: 'Nguyễn Văn Hùng',
      role: 'TENANT_ADMIN',
      email: 'hung@acme.vn',
      desc: 'Quản trị viên tổ chức Acme (Toàn quyền quản trị)',
    },
    {
      label: 'Trần Thị Mai',
      role: 'MEMBER',
      email: 'member@acme.vn',
      desc: 'Thành viên dự án Acme (Kéo thả thẻ & lọc)',
    },
    {
      label: 'Thử đăng nhập chéo tài khoản Lotus',
      role: 'MEMBER',
      email: 'lan@lotus.vn',
      note: '403',
      desc: 'Minh họa bảo mật: Bị chặn HTTP 403 Forbidden',
    },
  ],
  't-lotus': [
    {
      label: 'Lê Ngọc Lan',
      role: 'TENANT_ADMIN',
      email: 'lan@lotus.vn',
      desc: 'Quản trị viên tổ chức Lotus (Toàn quyền quản trị)',
    },
    {
      label: 'Phạm Minh',
      role: 'MEMBER',
      email: 'minh@lotus.vn',
      desc: 'Thành viên truyền thông Lotus (Kéo thả thẻ & lọc)',
    },
    {
      label: 'Thử đăng nhập chéo tài khoản Acme',
      role: 'MEMBER',
      email: 'hung@acme.vn',
      note: '403',
      desc: 'Minh họa bảo mật: Bị chặn HTTP 403 Forbidden',
    },
  ],
  't-noisy': [
    {
      label: 'Ngô Bảo',
      role: 'TENANT_ADMIN',
      email: 'admin@noisy.vn',
      desc: 'Quản trị viên Noisy Corp (Hạn ngạch 30 rpm)',
    },
    {
      label: 'Load Test Bot',
      role: 'MEMBER',
      email: 'bot@noisy.vn',
      desc: 'Tài khoản bot dùng bắn tải kiểm thử 429',
    },
  ],
};

export const LoginView: React.FC<Props> = ({ subdomain, onLoginSuccess }) => {
  const isAdminPortal = subdomain === 'admin';
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [branding, setBranding] = useState<PublicBranding | null>(null);

  // Login form state
  const [email, setEmail] = useState(DEMO_BY_SUBDOMAIN[subdomain]?.[0]?.email ?? '');
  const [password, setPassword] = useState('Password123!');

  // Register Member form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('Password123!');
  const [regInviteCode, setRegInviteCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemoBox, setShowDemoBox] = useState(false);

  useEffect(() => {
    // Check URL parameters for invitation links and prefilled email
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'join' && !isAdminPortal) {
      setAuthMode('REGISTER');
    }
    const code = params.get('code');
    if (code) {
      setRegInviteCode(code.trim().toUpperCase());
    }
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam.trim());
      setRegEmail(emailParam.trim());
    }
  }, [isAdminPortal]);

  useEffect(() => {
    if (!isAdminPortal) {
      api
        .getPublicBranding()
        .then((b) => {
          setBranding(b);
          document.documentElement.style.setProperty('--color-primary', b.theme.primary);
          document.documentElement.style.setProperty('--color-accent', b.theme.accent);
        })
        .catch(() => setBranding(null));
    }
  }, [subdomain, isAdminPortal]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(email, password);
      onLoginSuccess(res);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `${err.status ? `Lỗi ${err.status} — ` : ''}${err.message}`
          : 'Đăng nhập thất bại'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.registerMember({
        email: regEmail,
        fullName: regFullName,
        password: regPassword,
        inviteCode: regInviteCode,
        tenantSlug: subdomain,
      });
      onLoginSuccess(res);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `${err.status ? `Lỗi ${err.status} — ` : ''}${err.message}`
          : 'Đăng ký thành viên thất bại'
      );
    } finally {
      setLoading(false);
    }
  };

  const primaryColor = isAdminPortal ? '#0f172a' : branding?.theme?.primary || '#0d6efd';
  const accentColor = isAdminPortal ? '#3b82f6' : branding?.theme?.accent || '#0ea5e9';
  const demoList = DEMO_BY_SUBDOMAIN[subdomain] ?? [];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* 2-Column Split-Screen Card */}
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-800/80 grid grid-cols-1 md:grid-cols-12 min-h-[590px]">
        {/* Left Column (5 cols): Dynamic Brand Showcase */}
        <div
          className="md:col-span-5 text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, #090d16 100%)`,
          }}
        >
          {/* Subtle Ambient Glow */}
          <div
            className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{ backgroundColor: accentColor }}
          />

          <div className="relative z-10 space-y-6">
            {/* Logo & Identity */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center font-black text-sm tracking-wider shrink-0 border border-white/20 shadow-md">
                {isAdminPortal ? <Layers className="w-6 h-6 text-white" /> : branding?.theme?.logoText || subdomain.toUpperCase()}
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white leading-tight">
                  {isAdminPortal ? 'TenantFlow Control Plane' : branding?.name || subdomain}
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[11px] text-white/80 font-medium">
                    {window.location.host}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
              </div>
            </div>

            {/* Tagline */}
            <p className="text-xs text-white/80 leading-relaxed font-medium">
              {isAdminPortal
                ? 'Hệ thống Quản trị Tập trung dành cho Platform Administrator — Vận hành cụm SaaS Multi-Tenant Cấp độ 3.'
                : branding?.theme?.tagline ||
                  'Nền tảng quản lý công việc và quy trình Kanban đa khách thuê tối ưu hóa hiệu năng.'}
            </p>

            {/* Value Props Bullet Points */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-2.5 text-xs text-white/90">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>Cô lập dữ liệu tuyệt đối qua chính sách phân quyền dữ liệu cấp hạt nhân</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-white/90">
                <Sparkles className="w-4 h-4 text-sky-300 mt-0.5 shrink-0" />
                <span>Bộ đệm 2 tầng bộ nhớ trong siêu tốc phản hồi dưới 2ms</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-white/90">
                <CheckCircle2 className="w-4 h-4 text-indigo-300 mt-0.5 shrink-0" />
                <span>Định danh và kiểm soát truy cập đa khách thuê tự động</span>
              </div>
            </div>
          </div>

          {/* Left Footer */}
          <div className="relative z-10 pt-8 border-t border-white/10 flex items-center justify-between text-[11px] text-white/60">
            <span>Phiên bản Enterprise SaaS</span>
            <span className="font-mono">Production Cloud</span>
          </div>
        </div>

        {/* Right Column (7 cols): Clean Modern Form */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-between bg-white">
          <div className="space-y-5">
            {/* Header with Segmented Control (if not Admin Portal) */}
            {!isAdminPortal ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                      {authMode === 'LOGIN' ? 'Đăng nhập tài khoản' : 'Tham gia Tổ chức'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {authMode === 'LOGIN'
                        ? 'Truy cập cổng làm việc của tổ chức'
                        : `Tạo tài khoản thành viên trong tổ chức ${branding?.name || subdomain}`}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200">
                    Gói {branding?.tier || 'PRO'}
                  </span>
                </div>

                {/* 2-Tab Segmented Switcher */}
                <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/90 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('LOGIN');
                      setError(null);
                    }}
                    className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                      authMode === 'LOGIN'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5 text-slate-500" />
                    <span>Đăng nhập</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('REGISTER');
                      setError(null);
                    }}
                    className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                      authMode === 'REGISTER'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Tham gia Tổ chức (Mã mời)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Cổng Quản trị Nền tảng</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Đăng nhập tài khoản Platform Administrator toàn hệ thống
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div className="leading-relaxed">{error}</div>
              </div>
            )}

            {/* TAB 1: LOGIN FORM */}
            {authMode === 'LOGIN' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email đăng nhập
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:opacity-95 disabled:opacity-60 transition shadow-xs flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang xác thực thông tin...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Đăng nhập hệ thống</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* TAB 2: REGISTER MEMBER FORM (LUỒNG 2) */
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ và tên *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="VD: Trần Hoàng Long"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email đăng nhập *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder={`member@${subdomain.replace(/^t-/, '')}.vn`}
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mật khẩu *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mã mời tổ chức *
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="VD: ACME-2026"
                        value={regInviteCode}
                        onChange={(e) => setRegInviteCode(e.target.value.toUpperCase())}
                        className="w-full pl-10 pr-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  * Nhận mã mời từ Quản trị viên của {branding?.name || subdomain} để tham gia.
                </p>

                <button
                  type="submit"
                  disabled={loading || !regEmail.trim() || !regFullName.trim() || !regInviteCode.trim()}
                  className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:opacity-95 disabled:opacity-60 transition shadow-xs flex items-center justify-center gap-2 mt-1"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang xác thực mã mời &amp; đăng ký...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Xác nhận &amp; Tham gia Tổ chức</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Self-service Registration Link or Home link */}
            <div className="mt-3 text-center text-xs text-slate-500 space-y-1">
              <div>
                <span>Doanh nghiệp chưa có hệ thống riêng? </span>
                <a
                  href={buildRootUrl()}
                  className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>Khởi tạo ngay</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Collapsible Demo Toolbox at bottom (only in Login mode) */}
          {authMode === 'LOGIN' && (
            <div className="pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDemoBox(!showDemoBox)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-900 transition p-2 rounded-xl hover:bg-slate-50"
              >
                <span className="flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Tài khoản trải nghiệm nhanh</span>
                </span>
                {showDemoBox ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showDemoBox && (
                <div className="mt-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 animate-in fade-in duration-200 max-h-48 overflow-y-auto">
                  <div className="text-[10px] text-slate-500 font-medium">
                    Bấm 1-click để tự động điền tài khoản:
                  </div>

                  <div className="space-y-1.5">
                    {demoList.map((item, idx) => {
                      const is403 = item.note === '403';

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setEmail(item.email);
                            setPassword('Password123!');
                            setError(null);
                          }}
                          className={`w-full text-left p-2 rounded-lg border transition flex items-center justify-between ${
                            is403
                              ? 'border-rose-300 bg-rose-50/70 hover:bg-rose-100/70 text-rose-900'
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[11px] truncate">{item.label}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                                  is403
                                    ? 'bg-rose-200 text-rose-800'
                                    : item.role === 'TENANT_ADMIN'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {item.role}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">{item.desc}</div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1 text-[10px] font-mono font-semibold text-primary">
                            <span>{item.email.split('@')[0]}</span>
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
