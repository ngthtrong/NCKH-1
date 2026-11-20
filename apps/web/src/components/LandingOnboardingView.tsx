import React, { useState } from 'react';
import { ArrowRight, Building2, CheckCircle2, Layers, Rocket, Shield } from 'lucide-react';
import { api, ApiError } from '../api';

export const LandingOnboardingView: React.FC = () => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState<'STANDARD' | 'PRO' | 'ENTERPRISE'>('PRO');
  const [industryTemplate, setIndustryTemplate] = useState<'SOFTWARE' | 'MEDIA'>('SOFTWARE');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('Password123!');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  const port = window.location.port ? `:${window.location.port}` : '';
  const proto = window.location.protocol;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createTenant({
        name,
        slug,
        tier,
        industryTemplate,
        adminEmail,
        adminName,
        adminPassword,
      });
      setCreatedSlug(created.slug);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể khởi tạo tổ chức');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600 text-white">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 leading-tight">TenantFlow SaaS</div>
            <div className="text-[11px] text-slate-500">Pool Level 3 Multi-Tenant Kanban</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <a
            href={`${proto}//admin.localhost${port}`}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            Cổng Platform Admin
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Value Prop & Demo Portals */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Một bộ mã nguồn — Hàng trăm tổ chức vận hành độc lập
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Mỗi công ty đăng ký được cấp ngay 1 Subdomain riêng, dữ liệu cô lập cưỡng bức bằng PostgreSQL{' '}
              <code>FORCE RLS</code>, chống quá tải bằng Redis Token Bucket và tùy biến động 3 lớp lúc chạy.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { name: 'STANDARD', rpm: '30 req/phút', members: '10 thành viên', desc: 'Phù hợp kiểm thử Rate Limit' },
              { name: 'PRO', rpm: '120 req/phút', members: '50 thành viên', desc: 'Phù hợp team Dev / Media' },
              { name: 'ENTERPRISE', rpm: '600 req/phút', members: '500 thành viên', desc: 'Tải cao doanh nghiệp' },
            ].map((p) => (
              <div key={p.name} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-xs text-blue-700">{p.name}</div>
                <div className="text-sm font-bold text-slate-900">{p.rpm}</div>
                <div className="text-[11px] text-slate-500">{p.members}</div>
                <div className="text-[11px] text-slate-400">{p.desc}</div>
              </div>
            ))}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-700">Cổng Tổ chức Mẫu sẵn có (Seed Data)</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <a
                href={`${proto}//t-acme.localhost${port}`}
                className="p-3 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-50 transition block"
              >
                <div className="font-bold text-xs text-blue-700">Acme Software</div>
                <div className="font-mono text-[11px] text-slate-600 mt-0.5">t-acme.localhost</div>
                <div className="text-[11px] text-slate-500 mt-1">WIP STRICT • Dev</div>
              </a>
              <a
                href={`${proto}//t-lotus.localhost${port}`}
                className="p-3 rounded-xl border border-orange-200 bg-orange-50/60 hover:bg-orange-50 transition block"
              >
                <div className="font-bold text-xs text-orange-700">Lotus Media</div>
                <div className="font-mono text-[11px] text-slate-600 mt-0.5">t-lotus.localhost</div>
                <div className="text-[11px] text-slate-500 mt-1">WIP WARN • Media</div>
              </a>
              <a
                href={`${proto}//t-noisy.localhost${port}`}
                className="p-3 rounded-xl border border-slate-300 bg-slate-100/70 hover:bg-slate-100 transition block"
              >
                <div className="font-bold text-xs text-slate-800">Noisy Corp</div>
                <div className="font-mono text-[11px] text-slate-600 mt-0.5">t-noisy.localhost</div>
                <div className="text-[11px] text-slate-500 mt-1">30 rpm • Test 429</div>
              </a>
            </div>
          </div>
        </div>

        {/* Right: Self-Service Onboarding Form */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          {createdSlug ? (
            <div className="py-6 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h2 className="text-xl font-bold text-slate-900">Khởi tạo Tổ chức Thành công!</h2>
              <p className="text-sm text-slate-600">
                Subdomain <code>{createdSlug}.localhost{port}</code> đã sẵn sàng với bảng Kanban mẫu và tài khoản{' '}
                <code>TENANT_ADMIN</code>.
              </p>
              <a
                href={`${proto}//${createdSlug}.localhost${port}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700"
              >
                Truy cập cổng {createdSlug} <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">Đăng ký Thuê dịch vụ (Onboarding)</h2>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tên công ty / Tổ chức *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nova Tech"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Subdomain mong muốn *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: t-nova"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Mẫu ngành nghề</label>
                  <select
                    value={industryTemplate}
                    onChange={(e) => setIndustryTemplate(e.target.value as 'SOFTWARE' | 'MEDIA')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="SOFTWARE">Phần mềm (STRICT WIP, Story Points)</option>
                    <option value="MEDIA">Truyền thông (WARN WIP, Kênh & Ngân sách)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Gói dịch vụ</label>
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value as 'STANDARD' | 'PRO' | 'ENTERPRISE')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="STANDARD">STANDARD (30 req/m)</option>
                    <option value="PRO">PRO (120 req/m)</option>
                    <option value="ENTERPRISE">ENTERPRISE (600 req/m)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Tài khoản Quản trị Tổ chức (TENANT_ADMIN)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="email"
                    required
                    placeholder="Email quản trị viên *"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Họ và tên *"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <input
                  type="password"
                  required
                  placeholder="Mật khẩu *"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition disabled:opacity-60"
              >
                {submitting ? 'Đang khởi tạo...' : 'Khởi tạo Tổ chức ngay'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
