import React, { useState } from 'react';
import { Layers, LogIn, ShieldCheck } from 'lucide-react';
import { api, ApiError } from '../api';
import type { AuthUser, WorkspaceSummary } from '../types';

interface Props {
  externalError?: string | null;
  onLoginSuccess: (data: {
    user: AuthUser;
    preAuthToken: string;
    accessToken?: string;
    workspaces: WorkspaceSummary[];
  }) => void;
}

const DEMO_ACCOUNTS = [
  { label: 'Hùng (Acme Admin + Lotus Member)', email: 'hung@acme.vn' },
  { label: 'Lan (Lotus Admin)', email: 'lan@lotus.vn' },
  { label: 'Mai (Acme Member)', email: 'member@acme.vn' },
  { label: 'System Admin (Control Plane)', email: 'admin@tenantflow.vn' },
];

export const LoginView: React.FC<Props> = ({ externalError, onLoginSuccess }) => {
  const [email, setEmail] = useState('hung@acme.vn');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const displayError = error || externalError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(email, password);
      onLoginSuccess(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-primary px-6 py-6 text-white flex items-center gap-3">
          <div className="p-2.5 bg-white/15 rounded-xl">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">TenantFlow</h1>
            <p className="text-xs text-white/80">Multi-Tenant Kanban SaaS (Pool Level 3)</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {displayError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {displayError}
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
            className="w-full py-2.5 px-4 bg-primary hover:opacity-95 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-60"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>

          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Tài khoản Demo (mật khẩu: <code className="bg-slate-100 px-1 rounded">Password123!</code>)
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword('Password123!');
                  }}
                  className="text-left text-xs px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex justify-between items-center"
                >
                  <span className="font-medium">{acc.label}</span>
                  <span className="text-slate-500">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
