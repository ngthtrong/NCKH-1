import React, { useEffect, useState } from 'react';
import { Layers, LogIn, ShieldCheck } from 'lucide-react';
import { api, ApiError } from '../api';
import type { AuthUser, PublicBranding, TenantSettings } from '../types';

interface Props {
  subdomain: string;
  onLoginSuccess: (data: {
    accessToken: string;
    user: AuthUser;
    tenant?: { id: string; slug: string; name: string; tier: string; settings: TenantSettings };
  }) => void;
}

const DEMO_BY_SUBDOMAIN: Record<string, Array<{ label: string; email: string; note?: string }>> = {
  admin: [{ label: 'Platform Admin (Chủ nền tảng)', email: 'admin@tenantflow.vn' }],
  't-acme': [
    { label: 'Hùng (TENANT_ADMIN — Acme)', email: 'hung@acme.vn' },
    { label: 'Mai (MEMBER — Acme)', email: 'member@acme.vn' },
    { label: 'Thử đăng nhập chéo tài khoản Lotus (Test 403)', email: 'lan@lotus.vn', note: '403' },
  ],
  't-lotus': [
    { label: 'Lan (TENANT_ADMIN — Lotus)', email: 'lan@lotus.vn' },
    { label: 'Minh (MEMBER — Lotus)', email: 'minh@lotus.vn' },
    { label: 'Thử đăng nhập chéo tài khoản Acme (Test 403)', email: 'hung@acme.vn', note: '403' },
  ],
  't-noisy': [
    { label: 'Bảo (TENANT_ADMIN — Noisy)', email: 'admin@noisy.vn' },
    { label: 'Bot (MEMBER — Noisy)', email: 'bot@noisy.vn' },
  ],
};

export const LoginView: React.FC<Props> = ({ subdomain, onLoginSuccess }) => {
  const isAdminPortal = subdomain === 'admin';
  const [branding, setBranding] = useState<PublicBranding | null>(null);
  const [email, setEmail] = useState(
    DEMO_BY_SUBDOMAIN[subdomain]?.[0]?.email ?? ''
  );
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(email, password);
      onLoginSuccess(res);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.status ? `Lỗi ${err.status} — ` : ''}${err.message}` : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const primaryColor = isAdminPortal ? '#0f172a' : branding?.theme?.primary || '#0d6efd';
  const demoList = DEMO_BY_SUBDOMAIN[subdomain] ?? [];

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="px-6 py-6 text-white flex items-center gap-3.5" style={{ backgroundColor: primaryColor }}>
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center font-extrabold text-sm tracking-wider shrink-0">
            {isAdminPortal ? <Layers className="w-6 h-6" /> : branding?.theme?.logoText || subdomain.toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight truncate">
              {isAdminPortal ? 'TenantFlow Platform Admin' : branding?.name || subdomain}
            </h1>
            <p className="text-xs text-white/85 truncate">
              {isAdminPortal
                ? 'Cổng Quản trị Hạ tầng & Thuê bao SaaS'
                : branding?.theme?.tagline || `Cổng nội bộ ${subdomain}`}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="name@company.vn"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: primaryColor }}
            className="w-full py-2.5 px-4 hover:opacity-95 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-60"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>

          {demoList.length > 0 && (
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Tài khoản Demo (mật khẩu: <code className="bg-slate-100 px-1 rounded">Password123!</code>)
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {demoList.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword('Password123!');
                    }}
                    className={`text-left text-xs px-3 py-1.5 rounded-md transition flex justify-between items-center ${
                      acc.note === '403'
                        ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="font-medium">{acc.label}</span>
                    <span className="opacity-70 font-mono">{acc.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
