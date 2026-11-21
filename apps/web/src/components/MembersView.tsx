import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  User,
  Mail,
  Key,
  CheckCircle2,
  AlertCircle,
  Building2,
  Copy,
  Check,
  Link2,
  Sparkles,
} from 'lucide-react';
import { api, ApiError } from '../api';
import { getTenantHost } from '../utils/domain';
import type { TenantMember, TenantSettings } from '../types';

interface Props {
  isAdmin: boolean;
  currentUserId: string | null;
  tier?: string;
  settings?: TenantSettings;
  tenantSlug?: string;
}

const TIER_MEMBER_LIMITS: Record<string, number> = {
  FREE: 10,
  PRO: 50,
  ENTERPRISE: 500,
};

const TIER_RPM_LIMITS: Record<string, number> = {
  FREE: 30,
  PRO: 120,
  ENTERPRISE: 600,
};

export const MembersView: React.FC<Props> = ({
  isAdmin,
  currentUserId,
  tier = 'PRO',
  settings,
  tenantSlug,
}) => {
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [role, setRole] = useState<'MEMBER' | 'TENANT_ADMIN'>('MEMBER');
  const [submitting, setSubmitting] = useState(false);

  // Copy feedback states
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.listMembers();
      setMembers(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được danh sách thành viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.addMember({ email, fullName, password, role });
      setEmail('');
      setFullName('');
      setPassword('Password123!');
      setSuccessMsg(`Đã thêm thành viên "${fullName}" vào tổ chức thành công!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể thêm thành viên');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    setError(null);
    try {
      await api.updateMemberRole(id, newRole);
      setSuccessMsg('Đã cập nhật vai trò thành công!');
      setTimeout(() => setSuccessMsg(null), 3000);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Lỗi cập nhật vai trò');
    }
  };

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`Xác nhận xóa thành viên "${name}" khỏi tổ chức?`)) return;
    setError(null);
    try {
      await api.removeMember(id);
      setSuccessMsg(`Đã xóa thành viên "${name}" thành công.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể xóa thành viên');
    }
  };

  // Quota calculation
  const normalizedTier = tier.toUpperCase();
  const maxQuota = TIER_MEMBER_LIMITS[normalizedTier] || 50;
  const currentCount = members.length;
  const usagePercent = Math.min(100, Math.round((currentCount / maxQuota) * 100));
  const isQuotaFull = currentCount >= maxQuota;

  // Invite code derivation
  const effectiveInviteCode =
    settings?.inviteCode ||
    (tenantSlug ? `${tenantSlug.replace(/^t-/i, '')}-2026`.toUpperCase() : 'INVITE-2026');

  const port = window.location.port ? `:${window.location.port}` : '';
  const proto = window.location.protocol;
  const currentHost = window.location.host;
  const tenantHost =
    tenantSlug && !currentHost.toLowerCase().startsWith(tenantSlug.toLowerCase())
      ? getTenantHost(tenantSlug)
      : currentHost;
  const inviteLink = `${proto}//${tenantHost}?action=join&code=${encodeURIComponent(effectiveInviteCode)}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(effectiveInviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Page Header & Quota Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Thành viên Tổ chức</h2>
            <p className="text-xs text-slate-500">
              Quản lý danh sách nhân sự, phân quyền vai trò và hạn ngạch tài khoản theo gói thuê bao
            </p>
          </div>
        </div>

        {/* Quota & Subscription Indicator */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 sm:min-w-[280px] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" /> Gói thuê bao
            </span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10px]">
                {normalizedTier}
              </span>
              <span className="text-slate-400 text-[10px]">•</span>
              <span className="text-slate-600 font-semibold text-[11px]">
                {TIER_RPM_LIMITS[normalizedTier] || 120} req/phút
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500 text-[11px]">Hạn ngạch nhân sự</span>
              <span className="font-semibold text-slate-900 font-mono text-[11px]">
                {currentCount} / {maxQuota} ({usagePercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  usagePercent >= 100
                    ? 'bg-rose-500'
                    : usagePercent >= 80
                    ? 'bg-amber-500'
                    : 'bg-primary'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Invite Code & Link Card for TENANT_ADMIN */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 p-5 rounded-2xl border border-indigo-500/20 text-white shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  Mã mời Tổ chức & Liên kết Đăng ký Tự phục vụ
                  <span className="px-2 py-0.2 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-[10px] font-mono text-indigo-300 font-semibold">
                    ROLE: MEMBER
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300">
                  Cung cấp mã mời hoặc gửi liên kết trực tiếp để nhân sự tự tạo tài khoản tham gia tổ chức.
                </p>
              </div>
            </div>

            {isQuotaFull && (
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-semibold shrink-0">
                Đã đạt hạn ngạch tối đa
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-1">
            {/* Left: Invite Code */}
            <div className="md:col-span-5 bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Mã mời (Invite Code)
                </div>
                <div className="text-base font-black font-mono tracking-widest text-sky-400 mt-0.5">
                  {effectiveInviteCode}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                title="Sao chép mã mời vào bộ nhớ tạm"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép Mã</span>
                  </>
                )}
              </button>
            </div>

            {/* Right: Direct Invite Link */}
            <div className="md:col-span-7 bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Link2 className="w-3 h-3 text-indigo-400" /> Liên kết Đăng ký Nhanh
                </div>
                <div className="text-xs font-mono text-slate-300 truncate mt-0.5">
                  {inviteLink}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm shrink-0"
                title="Sao chép đường dẫn đăng ký kèm mã mời"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Đã chép link</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Chép Liên kết Mời</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {isQuotaFull && (
            <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-[11px] text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>
                Tổ chức đã sử dụng hết <strong>{maxQuota}/{maxQuota}</strong> tài khoản theo gói <strong>{normalizedTier}</strong>. 
                Thành viên mới đăng ký qua mã mời sẽ bị từ chối tiếp nhận (Lỗi hạn ngạch) cho đến khi nâng gói cước.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Add Member Card (Administrative Fallback for TENANT_ADMIN) */}
      {isAdmin && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
              <UserPlus className="w-4 h-4 text-primary" /> Thêm thành viên trực tiếp (Dành cho Quản trị viên)
            </h3>
            <span className="text-[11px] text-slate-500">Mật khẩu mặc định: Password123!</span>
          </div>

          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Họ và tên</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Tuấn Anh"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Email đăng nhập</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="user@congty.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Mật khẩu khởi tạo</label>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Vai trò</label>
                <div className="flex gap-2">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'MEMBER' | 'TENANT_ADMIN')}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  >
                    <option value="MEMBER">MEMBER (Thành viên)</option>
                    <option value="TENANT_ADMIN">TENANT_ADMIN (Quản trị)</option>
                  </select>
                  <button
                    type="submit"
                    disabled={submitting || isQuotaFull}
                    className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:opacity-95 disabled:opacity-60 transition shadow-xs shrink-0"
                  >
                    {submitting ? 'Đang thêm...' : 'Thêm'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Members List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Danh sách nhân sự ({members.length})
          </span>
          <span className="text-[11px] text-slate-500">
            Dữ liệu nhân sự được cô lập bảo mật tuyệt đối theo từng tổ chức
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Đang tải danh sách thành viên...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-3">Thành viên</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Ngày tham gia</th>
                  {isAdmin && <th className="px-4 py-3 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => {
                  const isCurrent = m.id === currentUserId;
                  const initials = m.fullName
                    ? m.fullName
                        .split(' ')
                        .filter(Boolean)
                        .slice(-2)
                        .map((w) => w[0].toUpperCase())
                        .join('')
                    : 'U';

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-[11px] shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {m.fullName}
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] text-slate-600 font-normal">
                                  (Bạn)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono sm:hidden">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600 hidden sm:table-cell">
                        {m.email}
                      </td>
                      <td className="px-4 py-3.5">
                        {isAdmin && !isCurrent ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.id, e.target.value)}
                            className="px-2 py-1 border border-slate-300 rounded text-xs font-semibold bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="MEMBER">MEMBER</option>
                            <option value="TENANT_ADMIN">TENANT_ADMIN</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              m.role === 'TENANT_ADMIN'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-sky-50 text-sky-700 border border-sky-200'
                            }`}
                          >
                            {m.role === 'TENANT_ADMIN' ? (
                              <Shield className="w-3 h-3 text-indigo-600" />
                            ) : (
                              <User className="w-3 h-3 text-sky-600" />
                            )}
                            {m.role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3.5 text-right">
                          {!isCurrent && (
                            <button
                              onClick={() => handleRemove(m.id, m.fullName)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                              title="Xóa thành viên khỏi tổ chức"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
