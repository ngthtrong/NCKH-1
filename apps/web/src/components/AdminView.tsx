import React, { useEffect, useState } from 'react';
import { Building2, ExternalLink, Plus, Shield } from 'lucide-react';
import { api, ApiError } from '../api';
import type { AdminTenant } from '../types';

export const AdminView: React.FC = () => {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [tier, setTier] = useState<'STANDARD' | 'PRO' | 'ENTERPRISE'>('PRO');
  const [industryTemplate, setIndustryTemplate] = useState<'SOFTWARE' | 'MEDIA'>('SOFTWARE');
  const [adminEmail, setAdminEmail] = useState('');
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
      await api.createTenant({
        slug,
        name,
        tier,
        industryTemplate,
        adminEmail: adminEmail || undefined,
        adminPassword: 'Password123!',
      });
      setSlug('');
      setName('');
      setAdminEmail('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tạo Tenant');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateTenant = async (
    id: string,
    payload: { status?: 'ACTIVE' | 'SUSPENDED'; tier?: string; rateLimitRpm?: number }
  ) => {
    try {
      await api.updateTenant(id, payload);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể cập nhật Tenant');
    }
  };

  const port = window.location.port ? `:${window.location.port}` : '';
  const proto = window.location.protocol;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2.5">
        <Shield className="w-6 h-6 text-slate-900" />
        <div>
          <h2 className="text-xl font-bold text-slate-900">Quản trị Nền tảng SaaS (PLATFORM_ADMIN)</h2>
          <p className="text-xs text-slate-500">
            Cổng tổng quản lý vòng đời Tenant, gói cước, ngưỡng Rate Limit & giám sát chặn HTTP 429
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleCreate} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4 text-blue-600" /> Cấp phát Tổ chức (Tenant) mới
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            type="text"
            required
            placeholder="Subdomain (vd: t-nova)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
          />
          <input
            type="text"
            required
            placeholder="Tên công ty"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <select
            value={industryTemplate}
            onChange={(e) => setIndustryTemplate(e.target.value as 'SOFTWARE' | 'MEDIA')}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="SOFTWARE">Mẫu Phần mềm</option>
            <option value="MEDIA">Mẫu Truyền thông</option>
          </select>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as 'STANDARD' | 'PRO' | 'ENTERPRISE')}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="STANDARD">STANDARD (30 rpm)</option>
            <option value="PRO">PRO (120 rpm)</option>
            <option value="ENTERPRISE">ENTERPRISE (600 rpm)</option>
          </select>
          <input
            type="email"
            placeholder="Email TENANT_ADMIN"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-60"
          >
            {creating ? 'Đang tạo...' : 'Tạo Tenant'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-6 text-center text-slate-500 text-sm">Đang tải...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
              <tr>
                <th className="px-4 py-3 font-semibold">Tổ chức</th>
                <th className="px-4 py-3 font-semibold">Subdomain</th>
                <th className="px-4 py-3 font-semibold">Gói cước</th>
                <th className="px-4 py-3 font-semibold">Rate Limit (rpm)</th>
                <th className="px-4 py-3 font-semibold">Nhân sự</th>
                <th className="px-4 py-3 font-semibold">Chặn 429</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    {t.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">
                    <a
                      href={`${proto}//${t.slug}.localhost${port}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      {t.slug}.localhost{port}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={t.tier}
                      onChange={(e) => handleUpdateTenant(t.id, { tier: e.target.value })}
                      className="px-2 py-1 border border-slate-300 rounded text-xs font-semibold bg-white"
                    >
                      <option value="STANDARD">STANDARD</option>
                      <option value="PRO">PRO</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={1}
                      defaultValue={t.rateLimitRpm}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (val > 0 && val !== t.rateLimitRpm) {
                          handleUpdateTenant(t.id, { rateLimitRpm: val });
                        }
                      }}
                      className="w-20 px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {t.memberCount ?? 0}/{t.maxMembers}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-mono text-xs font-semibold">
                      {t.blocked429Count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        t.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() =>
                        handleUpdateTenant(t.id, { status: t.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })
                      }
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
