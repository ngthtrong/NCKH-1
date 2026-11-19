import React, { useState } from 'react';
import { ArrowRight, Building2, LogOut } from 'lucide-react';
import { api, ApiError } from '../api';
import type { AuthUser, WorkspaceSummary } from '../types';

interface Props {
  user: AuthUser;
  workspaces: WorkspaceSummary[];
  preAuthToken: string;
  onSwitchedSameOrigin: (accessToken: string) => void;
  onLogout: () => void;
}

export const WorkspaceSelector: React.FC<Props> = ({
  user,
  workspaces,
  preAuthToken,
  onSwitchedSameOrigin,
  onLogout,
}) => {
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (slug: string) => {
    setLoadingSlug(slug);
    setError(null);
    try {
      const res = await api.switchWorkspace(slug, preAuthToken);
      const { protocol, port, hostname } = window.location;
      const portPart = port ? `:${port}` : '';

      // Build subdomain URL (e.g., t-acme.localhost:8080)
      if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
        const targetHost = `${slug}.localhost${portPart}`;
        if (window.location.host !== targetHost) {
          window.location.href = `${protocol}//${targetHost}/#token=${encodeURIComponent(res.accessToken)}`;
          return;
        }
      }
      onSwitchedSameOrigin(res.accessToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể chuyển tổ chức');
    } finally {
      setLoadingSlug(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Chọn Tổ chức (Tenant)</h2>
            <p className="text-sm text-slate-500">
              {user.fullName} ({user.email}) — Chọn tổ chức để cấp JWT theo Subdomain
            </p>
          </div>
          <button
            onClick={onLogout}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200"
          >
            <LogOut className="w-3.5 h-3.5" /> Đăng xuất
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {workspaces.map((ws) => (
            <button
              key={ws.tenantId}
              disabled={ws.status !== 'ACTIVE' || loadingSlug === ws.slug}
              onClick={() => handleSelect(ws.slug)}
              className="w-full p-4 rounded-xl border border-slate-200 hover:border-primary hover:bg-slate-50 transition flex items-center justify-between text-left disabled:opacity-50"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    {ws.name}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                      {ws.slug}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>Gói: <strong>{ws.tier}</strong></span>
                    <span>•</span>
                    <span>Vai trò: <strong>{ws.role}</strong></span>
                    {ws.status !== 'ACTIVE' && (
                      <span className="text-red-600 font-semibold">• {ws.status}</span>
                    )}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
