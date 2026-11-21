import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Layers,
  Pause,
  Play,
  Sparkles,
  Tag,
  User,
} from 'lucide-react';

interface TaskCard {
  id: string;
  title: string;
  assignee: string;
  tag: string;
  budget?: string;
  priority: 'CAO' | 'TRUNG BÌNH';
}

const INITIAL_BACKLOG: TaskCard[] = [
  {
    id: 't-1',
    title: 'Thiết kế trang thanh toán mới',
    assignee: 'An',
    tag: 'Sản phẩm',
    budget: '15 triệu',
    priority: 'CAO',
  },
  {
    id: 't-2',
    title: 'Duyệt ngân sách chiến dịch Q4',
    assignee: 'Bình',
    tag: 'Tài chính',
    budget: '45 triệu',
    priority: 'CAO',
  },
  {
    id: 't-3',
    title: 'Khảo sát khách hàng',
    assignee: 'Chi',
    tag: 'Nghiên cứu',
    priority: 'TRUNG BÌNH',
  },
];

const INITIAL_IN_PROGRESS: TaskCard[] = [
  {
    id: 't-0',
    title: 'Báo cáo vận hành tuần',
    assignee: 'Dũng',
    tag: 'Vận hành',
    priority: 'TRUNG BÌNH',
  },
];

const INITIAL_DONE: TaskCard[] = [
  {
    id: 't-done',
    title: 'Nâng cấp trải nghiệm người dùng',
    assignee: 'Hương',
    tag: 'Tối ưu',
    priority: 'CAO',
  },
];

const BEATS = [
  {
    index: 0,
    title: 'Kéo thả mượt mà',
    desc: 'Thẻ việc tự động di chuyển từ "Cần làm" sang "Đang thực hiện". Bộ đếm nhảy từ 1/2 lên 2/2.',
  },
  {
    index: 1,
    title: 'Kiểm soát quá tải',
    desc: 'Cột đã đạt tối đa 2 việc cùng lúc: Thẻ kế tiếp bị từ chối và bật ngược lại để bảo vệ năng suất.',
  },
  {
    index: 2,
    title: 'Đổi bản sắc thương hiệu',
    desc: 'Toàn bộ giao diện chuyển mượt từ tông Xanh công nghệ sang Cam sáng tạo trong chớp mắt.',
  },
  {
    index: 3,
    title: 'Bố cục Thẻ linh hoạt',
    desc: 'Chuyển đổi tức thì giữa chế độ hiển thị Đầy đủ chi tiết và Thu gọn 1 dòng tối giản.',
  },
];

export const AutoProductShowcase: React.FC = () => {
  const [beat, setBeat] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setBeat((prev) => (prev + 1) % 4);
    }, 2600);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Derived states based on beat
  // Beat 0: Task 1 moved from Backlog to In Progress (Count: 2/2)
  // Beat 1: Task 2 attempts to move into In Progress, column turns red warning, card bounces back
  // Beat 2: Brand color changes from Blue to Orange
  // Beat 3: Display mode changes from FULL to COMPACT

  const isBrandOrange = beat >= 2;
  const brandColor = isBrandOrange ? '#EA580C' : '#2563EB';
  const brandBgSoft = isBrandOrange ? '#FFF7ED' : '#EFF6FF';
  const brandBorderSoft = isBrandOrange ? '#FED7AA' : '#BFDBFE';
  const brandText = isBrandOrange ? '#C2410C' : '#1D4ED8';
  const orgName = isBrandOrange ? 'Sáng tạo & Truyền thông' : 'Phát triển Sản phẩm';

  const isCompactMode = beat === 3;
  const isWipRejected = beat === 1;

  // Task distribution: INITIAL_BACKLOG[0] ("Thiết kế trang thanh toán mới") has moved to In Progress,
  // so it is permanently removed from Backlog to avoid duplication across columns.
  const backlogTasks = [INITIAL_BACKLOG[1], INITIAL_BACKLOG[2]];
  const inProgressTasks = [INITIAL_IN_PROGRESS[0], INITIAL_BACKLOG[0]];

  const inProgressCount = 2; // Maximum limit is 2

  return (
    <div
      className="bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden max-w-5xl mx-auto text-left transition-all duration-500"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 1. Window Browser Chrome */}
      <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="ml-3 px-3 py-1 bg-white border border-slate-200 rounded-lg font-mono text-[11px] text-slate-700 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: brandColor }} />
            <span className="font-semibold">nova.tenantflow.vn</span>
          </div>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-2">
          {isPaused ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium bg-slate-200/70 px-2 py-0.5 rounded-md">
              <Pause className="w-3 h-3 text-slate-600" /> Tạm dừng xem
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Tự động mô phỏng quy trình</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Top Header inside Board */}
      <div
        className="px-5 py-3.5 border-b border-slate-200/80 transition-colors duration-500 flex flex-wrap items-center justify-between gap-3"
        style={{ backgroundColor: brandBgSoft }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl text-white font-extrabold text-xs flex items-center justify-center shadow-xs transition-colors duration-500"
            style={{ backgroundColor: brandColor }}
          >
            {isBrandOrange ? 'ST' : 'SP'}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 transition-colors duration-500">
              Đội ngũ: {orgName}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <span>Bảng công việc tuần 4</span>
              <span>•</span>
              <span className="font-medium" style={{ color: brandText }}>
                {isCompactMode ? 'Chế độ Thu gọn' : 'Chế độ Đầy đủ'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider transition-colors duration-500"
            style={{
              backgroundColor: isBrandOrange ? '#ffedd5' : '#dbeafe',
              color: brandText,
              border: `1px solid ${brandBorderSoft}`,
            }}
          >
            {isBrandOrange ? 'Sắc cam thương hiệu' : 'Sắc xanh thương hiệu'}
          </span>
        </div>
      </div>

      {/* 3. The 3 Kanban Columns */}
      <div className="p-4 sm:p-5 bg-slate-50/60 min-h-[300px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: Cần làm (Backlog) */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Cần làm</span>
              </span>
              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                {backlogTasks.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {backlogTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border border-slate-200 bg-white shadow-2xs transition-all duration-300 ${
                    beat === 1 && task.id === 't-2'
                      ? 'ring-2 ring-rose-400 -translate-y-0.5 shadow-md'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 leading-snug">
                      {task.title}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono shrink-0">
                      {task.priority}
                    </span>
                  </div>

                  {!isCompactMode && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600">
                        {task.tag}
                      </span>
                      {task.budget && (
                        <span className="text-slate-600 font-medium">{task.budget}</span>
                      )}
                      <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[9px] text-slate-700">
                        {task.assignee[0]}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Đang thực hiện (In Progress) with WIP Limit = 2 */}
          <div
            className={`p-3.5 rounded-xl border transition-all duration-300 space-y-3 relative ${
              isWipRejected
                ? 'bg-rose-50/40 border-rose-400 ring-2 ring-rose-300'
                : 'bg-white border-slate-200/90 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Clock className="w-3.5 h-3.5" style={{ color: brandColor }} />
                <span>Đang thực hiện</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-colors ${
                  isWipRejected
                    ? 'bg-rose-100 text-rose-700 border border-rose-300 animate-pulse'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                Giới hạn: {inProgressCount}/2
              </span>
            </div>

            {/* Rejection Notification in Beat 1 */}
            {isWipRejected && (
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Đã đạt giới hạn 2 việc cùng lúc! Thẻ việc tự bật ngược.</span>
              </div>
            )}

            <div className="space-y-2.5">
              {inProgressTasks.map((task, idx) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border transition-all duration-500 bg-white ${
                    idx === 1 && beat === 0
                      ? 'border-blue-400 ring-2 ring-blue-300 -translate-y-0.5 shadow-md'
                      : 'border-slate-200 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 leading-snug">
                      {task.title}
                    </span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.2 rounded text-white font-mono shrink-0"
                      style={{ backgroundColor: brandColor }}
                    >
                      ĐANG LÀM
                    </span>
                  </div>

                  {!isCompactMode && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600">
                        {task.tag}
                      </span>
                      {task.budget && (
                        <span className="text-slate-600 font-medium">{task.budget}</span>
                      )}
                      <div
                        className="w-5 h-5 rounded-full text-white flex items-center justify-center font-bold text-[9px]"
                        style={{ backgroundColor: brandColor }}
                      >
                        {task.assignee[0]}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Hoàn thành (Done) */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Hoàn tất nghiệm thu</span>
              </span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[10px] font-mono">
                {INITIAL_DONE.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {INITIAL_DONE.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 opacity-90 space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500 line-through leading-snug">
                      {task.title}
                    </span>
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </div>

                  {!isCompactMode && (
                    <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-emerald-700 font-medium">
                      <span>Đã kiểm định</span>
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[9px]">
                        {task.assignee[0]}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Beat Indicators & Live Caption Footer */}
      <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-700">Diễn hoạt:</span>
          <span className="text-xs font-medium text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
            {BEATS[beat].title} — {BEATS[beat].desc}
          </span>
        </div>

        {/* 4 Interactive Dots */}
        <div className="flex items-center gap-1.5 shrink-0">
          {BEATS.map((b) => (
            <button
              key={b.index}
              type="button"
              onClick={() => setBeat(b.index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                beat === b.index ? 'w-6 bg-blue-600' : 'w-2 bg-slate-300 hover:bg-slate-400'
              }`}
              title={b.title}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
