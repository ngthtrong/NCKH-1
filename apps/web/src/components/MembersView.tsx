import React, { useEffect, useState } from 'react';
import { Trash2, UserPlus, Users } from 'lucide-react';
import { api, ApiError } from '../api';
import type { TenantMember } from '../types';

interface Props {
  isAdmin: boolean;
  currentUserId: string | null;
}

export const MembersView: React.FC<Props> = ({ isAdmin, currentUserId }) => {
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [role, setRole] = useState<'MEMBER' | 'TENANT_ADMIN'>('MEMBER');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setMembers(await api.listMembers());
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
    try {
      await api.addMember({ email, fullName, password, role });
      setEmail('');
      setFullName('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể thêm thành viên');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      await api.updateMemberRole(id, newRole);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Lỗi cập nhật vai trò');
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Xóa thành viên này khỏi tổ chức?')) return;
    try {
      await api.removeMember(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể xóa thành viên');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2.5">
        <Users className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold text-slate-900">Thành viên Tổ chức</h2>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {isAdmin && (
        <form onSubmit={handleAdd} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
            <UserPlus className="w-4 h-4 text-primary" /> Thêm thành viên mới
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <input
              type="text"
              required
              placeholder="Họ và tên"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <input
              type="password"
              required
              placeholder="Mật khẩu khởi tạo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <div className="flex gap-2">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'MEMBER' | 'TENANT_ADMIN')}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm flex-1"
              >
                <option value="MEMBER">MEMBER</option>
                <option value="TENANT_ADMIN">TENANT_ADMIN</option>
              </select>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-60"
              >
                Thêm
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-slate-500 text-sm">Đang tải...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Họ tên</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Vai trò</th>
                {isAdmin && <th className="px-4 py-3 font-medium text-right">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{m.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">{m.email}</td>
                  <td className="px-4 py-3">
                    {isAdmin && m.id !== currentUserId ? (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                        className="px-2 py-1 border border-slate-300 rounded text-xs font-medium"
                      >
                        <option value="MEMBER">MEMBER</option>
                        <option value="TENANT_ADMIN">TENANT_ADMIN</option>
                      </select>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {m.role}
                      </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      {m.id !== currentUserId && (
                        <button
                          onClick={() => handleRemove(m.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Xóa thành viên"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
