import React, { useEffect, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Database,
  Layers,
  Server,
  ShieldCheck,
  Timer,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { subscribeTelemetry } from '../api';
import type { InspectorTelemetry } from '../types';

export const InspectorDrawer: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<InspectorTelemetry[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  useEffect(() => {
    return subscribeTelemetry((entry) => {
      setLogs((prev) => [entry, ...prev].slice(0, 20));
      setSelectedIdx(0); // auto-select newest
    });
  }, []);

  const activeEntry = logs[selectedIdx] || logs[0];

  // Helper for Cache color
  const getCacheBadgeClass = (status: string) => {
    if (status.includes('L1_HIT')) {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
    if (status.includes('L2_HIT')) {
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    }
    if (status.includes('MISS')) {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  // Helper for HTTP Status color
  const getStatusBadgeClass = (status: number) => {
    if (status >= 200 && status < 300) {
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
    if (status === 422) {
      return 'bg-rose-500/25 text-rose-300 border-rose-500/50';
    }
    if (status === 429) {
      return 'bg-purple-500/25 text-purple-300 border-purple-500/50';
    }
    if (status === 403 || status === 401) {
      return 'bg-red-500/25 text-red-300 border-red-500/50';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <aside aria-label="Kiểm tra viễn trắc kiến trúc" className="fixed bottom-4 right-4 z-50">
      {!open ? (
        /* Floating Pill Button: Discreet Developer Inspector */
        <button
          onClick={() => setOpen(true)}
          className="group px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-semibold shadow-lg border border-slate-700/70 hover:border-slate-500 flex items-center gap-2 transition backdrop-blur-md cursor-pointer"
          title="Mở Developer Telemetry Inspector"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-sans font-semibold">Dev Inspector</span>
          {activeEntry && (
            <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
              {activeEntry.responseTimeMs}
            </span>
          )}
          <ChevronUp className="w-3 h-3 text-slate-400 group-hover:text-white transition" />
        </button>
      ) : (
        /* Full Inspector Panel */
        <div className="w-[490px] max-w-[94vw] bg-slate-950 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[88vh] backdrop-blur-xl">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white tracking-wide">Architecture Telemetry Inspector</div>
                <div className="text-[10px] text-slate-400">Báo cáo viễn trắc kỹ thuật: Định danh • Cô lập Dữ liệu • Bộ đệm &amp; Hạn ngạch</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {logs.length > 0 && (
                <button
                  onClick={() => setLogs([])}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md hover:bg-slate-800 transition"
                  title="Xóa nhật ký viễn trắc"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition"
                title="Thu gọn"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {activeEntry ? (
            <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Top Request Summary Bar */}
              <div className="flex items-center justify-between bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-800 font-mono text-[11px]">
                <div className="flex items-center gap-2 truncate">
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                    {activeEntry.method}
                  </span>
                  <span className="text-slate-200 truncate">{activeEntry.path}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded border text-[11px] font-bold ${getStatusBadgeClass(
                      activeEntry.status
                    )}`}
                  >
                    HTTP {activeEntry.status}
                  </span>
                  <span className="text-slate-400 text-[10px]">{activeEntry.timestamp}</span>
                </div>
              </div>

              {/* 4 Architecture Pillars with High-Contrast Badges */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Pillar 1: Identity & Subdomain */}
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/90 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-sky-400">
                      <Server className="w-3 h-3" /> Định danh: Tenant ID
                    </span>
                    <span className="font-mono text-emerald-400 text-[9px]">{activeEntry.subdomainMatch}</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-sky-300 truncate" title={activeEntry.tenantId}>
                    {activeEntry.tenantId}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">
                    Subdomain Match: {activeEntry.subdomainMatch}
                  </div>
                </div>

                {/* Pillar 2: Database RLS Isolation */}
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/90 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-amber-400">
                      <Database className="w-3 h-3" /> Bảo mật: PostgreSQL RLS
                    </span>
                    <span className="font-mono text-amber-300 text-[9px]">ISOLATED</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-amber-300 truncate" title={activeEntry.rlsContext}>
                    {activeEntry.rlsContext}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    SET LOCAL app.current_tenant_id
                  </div>
                </div>

                {/* Pillar 3: Two-Tier Cache */}
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/90 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-cyan-400">
                      <Layers className="w-3 h-3" /> Tối ưu: Two-Tier Cache
                    </span>
                    <span className="text-[9px] text-slate-500">L1/L2</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded border font-mono text-xs font-bold ${getCacheBadgeClass(
                        activeEntry.cacheStatus
                      )}`}
                    >
                      {activeEntry.cacheStatus}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Caffeine (L1) + Redis (L2)
                  </div>
                </div>

                {/* Pillar 4: Rate Limiting & Latency */}
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/90 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-purple-400">
                      <Timer className="w-3 h-3" /> Hạn ngạch: Rate Limit
                    </span>
                    <span className="text-white font-mono text-[10px] font-bold">{activeEntry.responseTimeMs}</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-purple-300">
                    {activeEntry.rateLimit} <span className="text-[10px] font-normal text-purple-400">rpm</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Token Bucket on Redis
                  </div>
                </div>
              </div>

              {/* Request Stream History */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">
                  <span>Nhật ký yêu cầu ({logs.length})</span>
                  <span>Nhấn để xem chi tiết viễn trắc</span>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                  {logs.map((l, idx) => {
                    const isSelected = idx === selectedIdx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedIdx(idx)}
                        className={`w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition ${
                          isSelected
                            ? 'bg-slate-800 border-slate-600 text-white ring-1 ring-emerald-500/50'
                            : 'bg-slate-900/40 border-slate-800/60 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[10px] text-slate-500">{l.timestamp}</span>
                          <span
                            className={`text-[10px] font-bold ${
                              l.method === 'GET'
                                ? 'text-blue-400'
                                : l.method === 'POST'
                                ? 'text-emerald-400'
                                : l.method === 'PATCH' || l.method === 'PUT'
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {l.method}
                          </span>
                          <span className="truncate text-slate-300">{l.path}</span>
                        </div>

                        <div className="flex items-center gap-1.5 ml-2 shrink-0">
                          {l.cacheStatus !== 'N/A' && (
                            <span
                              className={`px-1 rounded border text-[9px] font-bold ${getCacheBadgeClass(
                                l.cacheStatus
                              )}`}
                            >
                              {l.cacheStatus}
                            </span>
                          )}
                          <span
                            className={`px-1.5 py-0.2 rounded border text-[10px] font-bold ${getStatusBadgeClass(
                              l.status
                            )}`}
                          >
                            {l.status}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              <Activity className="w-8 h-8 text-slate-700 mx-auto mb-2 animate-pulse" />
              <div>Chưa có request API nào được ghi nhận.</div>
              <div className="text-[11px] text-slate-600 mt-1">
                Các thao tác tải bảng, kéo thả Kanban, thêm thành viên sẽ lập tức kích hoạt viễn trắc.
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
