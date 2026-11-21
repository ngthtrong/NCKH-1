import React, { useEffect, useState } from 'react';
import {
  FolderKanban,
  CheckSquare,
  Clock,
  Users,
  Plus,
  ArrowRight,
  Building2,
  Calendar,
  Sparkles,
  Layers,
  ChevronRight,
  TrendingUp,
  X,
  Shield,
} from 'lucide-react';
import { api, ApiError } from '../api';
import type { Board, TenantInfo, TenantMember, TenantSettings } from '../types';

interface Props {
  tenantInfo: TenantInfo;
  settings: TenantSettings;
  isAdmin: boolean;
  onSelectBoard: (boardId: string) => void;
  onNavigateToTab: (tab: 'kanban' | 'members' | 'settings') => void;
}

interface BoardMeta {
  board: Board;
  columnCount: number;
  cardCount: number;
  inProgressCount: number;
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

export const OverviewView: React.FC<Props> = ({
  tenantInfo,
  settings,
  isAdmin,
  onSelectBoard,
  onNavigateToTab,
}) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardMetas, setBoardMetas] = useState<BoardMeta[]>([]);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [boardList, memberList] = await Promise.all([
        api.listBoards(),
        api.listMembers(),
      ]);
      setBoards(boardList);
      setMembers(memberList);

      // Load details for each board to get card and column counts
      const metas = await Promise.all(
        boardList.map(async (b) => {
          try {
            const detail = await api.getBoardDetail(b.id);
            const inProgress = detail.cards.filter((c) => {
              const col = detail.columns.find((col) => col.id === c.columnId);
              const colName = col?.name.toLowerCase() || '';
              return (
                colName.includes('progress') ||
                colName.includes('đang') ||
                colName.includes('sản xuất') ||
                colName.includes('doing') ||
                colName.includes('dev')
              );
            }).length;

            return {
              board: b,
              columnCount: detail.columns.length,
              cardCount: detail.cards.length,
              inProgressCount: inProgress,
            };
          } catch {
            return {
              board: b,
              columnCount: 4,
              cardCount: 0,
              inProgressCount: 0,
            };
          }
        })
      );
      setBoardMetas(metas);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được dữ liệu tổng quan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    setCreating(true);
    try {
      const created = await api.createBoard(newBoardName.trim());
      setNewBoardName('');
      setCreateModalOpen(false);
      await loadData();
      onSelectBoard(created.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tạo bảng mới');
    } finally {
      setCreating(false);
    }
  };

  // Aggregated totals
  const totalCards = boardMetas.reduce((acc, m) => acc + m.cardCount, 0);
  const totalInProgress = boardMetas.reduce((acc, m) => acc + m.inProgressCount, 0);
  const maxQuota = TIER_MEMBER_LIMITS[tenantInfo.tier?.toUpperCase()] || 50;
  const currentMembers = members.length;
  const memberUsagePercent = Math.min(100, Math.round((currentMembers / maxQuota) * 100));
  const rpmLimit = TIER_RPM_LIMITS[tenantInfo.tier?.toUpperCase()] || 120;

  // Date formatting
  const todayStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* 1. Brand Welcome Banner */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-xl transition-all"
        style={{
          background: `linear-gradient(135deg, var(--color-primary, #0d6efd) 0%, #0f172a 100%)`,
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-white/80">
              <Calendar className="w-4 h-4 text-white/90" />
              <span className="capitalize">{todayStr}</span>
              <span className="text-white/40">•</span>
              <span className="px-2 py-0.5 rounded-full bg-white/15 text-white text-[11px] font-bold">
                Gói {tenantInfo.tier}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Xin chào, {tenantInfo.fullName}!
            </h1>

            <p className="text-sm text-white/85 leading-relaxed font-medium">
              {settings.theme?.tagline ||
                'Chào mừng bạn đến với trung tâm điều hành công việc của tổ chức.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isAdmin && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-md hover:bg-slate-50 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>+ Tạo bảng dự án</span>
              </button>
            )}
            <button
              onClick={() => onNavigateToTab('kanban')}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs border border-white/20 transition flex items-center gap-2"
            >
              <span>Vào bảng công việc</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Subtle Decorative Glow */}
        <div
          className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: 'var(--color-accent, #0ea5e9)' }}
        />
      </div>

      {/* 2. 4 Internal KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Boards */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Bảng dự án</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
              {boards.length}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
            <span>Phân nhóm theo dự án</span>
          </div>
        </div>

        {/* Metric 2: Total Tasks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tổng số công việc</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-blue-600 font-mono tracking-tight tabular-nums">
              {totalCards}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Thẻ trên tất cả các bảng
          </div>
        </div>

        {/* Metric 3: In Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Đang thực hiện</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-amber-600 font-mono tracking-tight tabular-nums">
              {totalInProgress}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Đầu việc đang được tiến hành
          </div>
        </div>

        {/* Metric 4: Team Members */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Thành viên đội ngũ</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-emerald-600 font-mono tracking-tight tabular-nums">
              {currentMembers}
            </span>
            <span className="text-xs text-slate-500 font-mono">/ {maxQuota}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Tài khoản nhân sự trong tổ chức
          </div>
        </div>
      </div>

      {/* 3. Main Content: Projects Grid & Subscription Quota */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Board Projects Grid */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-primary" /> Bảng dự án &amp; Quy trình
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Lựa chọn bảng công việc để điều hành và kéo thả tiến độ nhiệm vụ
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:opacity-90 transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm bảng</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/80">
              Đang tải danh sách bảng...
            </div>
          ) : boardMetas.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 space-y-3">
              <FolderKanban className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">Chưa có bảng dự án nào</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tổ chức của bạn chưa tạo bảng quy trình làm việc. Nhấn nút bên dưới để khởi tạo bảng đầu tiên.
              </p>
              {isAdmin && (
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs transition"
                >
                  + Khởi tạo bảng ngay
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {boardMetas.map((m) => (
                <div
                  key={m.board.id}
                  className="group bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        <FolderKanban className="w-4 h-4" />
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(m.board.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-primary transition line-clamp-1">
                      {m.board.name}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span>{m.columnCount} cột quy trình</span>
                      <span className="font-bold text-slate-900">{m.cardCount} công việc</span>
                    </div>

                    <button
                      onClick={() => onSelectBoard(m.board.id)}
                      className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-primary hover:text-white text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <span>Mở bảng công việc</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Subscription & Quota Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> Gói thuê bao &amp; Hạn mức
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10px] font-mono">
                {tenantInfo.tier}
              </span>
            </div>

            {/* Quota Gauge 1: Personnel */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Hạn ngạch nhân sự</span>
                <span className="font-mono font-bold text-slate-900">
                  {currentMembers} / {maxQuota} ({memberUsagePercent}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    memberUsagePercent >= 90
                      ? 'bg-rose-500'
                      : memberUsagePercent >= 70
                      ? 'bg-amber-500'
                      : 'bg-primary'
                  }`}
                  style={{ width: `${memberUsagePercent}%` }}
                />
              </div>
            </div>

            {/* Quota Gauge 2: API Throughput */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Băng thông API</span>
                <span className="font-mono font-bold text-indigo-600">{rpmLimit} req/phút</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Hệ thống tự động điều tiết lưu lượng bằng thuật toán Token Bucket chống quá tải.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                onClick={() => onNavigateToTab('members')}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition text-left flex items-center justify-between"
              >
                <span>Quản lý thành viên đội ngũ</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isAdmin && (
                <button
                  onClick={() => onNavigateToTab('settings')}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition text-left flex items-center justify-between"
                >
                  <span>Tùy chỉnh thương hiệu &amp; Quy tắc</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Create New Board */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Tạo bảng dự án mới</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBoard} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tên bảng dự án <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="vd: Kế hoạch Sản phẩm Quý 1"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-60 transition shadow-xs"
                >
                  {creating ? 'Đang tạo...' : 'Tạo bảng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
