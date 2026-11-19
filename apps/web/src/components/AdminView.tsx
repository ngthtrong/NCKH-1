import React, { useEffect, useState } from 'react';
import { Building2, Plus, Shield } from 'lucide-react';
import { api, ApiError } from '../api';
import type { AdminTenant } from '../types';

export const AdminView: React.FC = () => {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [tier, setTier] = useState<'FREE' | 'PRO' | 'ENTERPRISE'>('PRO');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setTenants(await api.listTenants());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được danh sách Tenant');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api.createTenant({ slug, name, tier, adminEmail, adminName, adminPassword: 'Password123!' });
      setSlug('');
      setName('');
      setAdminEmail('');
      setAdminName('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tạo Tenant');
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (t: AdminTenant) => {
    const next = t.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.updateTenantStatus(t.id, next);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể cập nhật trạng thái');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2.5">
        <Shield className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-slate-900">Quản trị Hệ thống (Control Plane)</h2>
          <p className="text-xs text-slate-500">UC01 — Khởi tạo thuê bao, gán gói Rate Limit & khóa/mở Tenant</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleCreate} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4 text-primary" /> Khởi tạo Tổ chức (Tenant) mới
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            required
            placeholder="Slug (vd: t-nova)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <input
            type="text"
            required
            placeholder="Tên tổ chức"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as 'FREE' | 'PRO' | 'ENTERPRISE')}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="FREE">FREE (30 req/m)</option>
            <option value="PRO">PRO (120 req/m)</option>
            <option value="ENTERPRISE">ENTERPRISE (600 req/m)</option>
          </select>
          <input
            type="email"
            placeholder="Email Admin (tùy chọn)"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-60"
          >
            {creating ? 'Đang tạo...' : 'Tạo Tenant'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-slate-500 text-sm">Đang tải...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Tổ chức</th>
                <th className="px-4 py-3 font-medium">Slug / Subdomain</th>
                <th className="px-4 py-3 font-medium">Gói (Tier)</th>
                <th className="px-4 py-3 font-medium">WIP Mode</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    {t.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{t.slug}.localhost:8080</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
                      {t.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{t.settings?.wipMode ?? 'STRICT'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        t.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleStatus(t)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                        t.status === 'ACTIVE'
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {t.status === 'ACTIVE' ? 'Tạm khóa' : 'Kích hoạt'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
