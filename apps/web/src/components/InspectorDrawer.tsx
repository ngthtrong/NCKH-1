import React, { useEffect, useState } from 'react';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { subscribeTelemetry } from '../api';
import type { InspectorTelemetry } from '../types';

export const InspectorDrawer: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<InspectorTelemetry[]>([]);

  useEffect(() => {
    return subscribeTelemetry((entry) => {
      setLogs((prev) => [entry, ...prev].slice(0, 12));
    });
  }, []);

  const latest = logs[0];

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="px-3.5 py-2 rounded-full bg-slate-900 text-white text-xs font-medium shadow-lg border border-slate-700 flex items-center gap-2 hover:bg-slate-800 transition"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Architecture Inspector</span>
          {latest && (
            <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-sky-300">
              {latest.responseTimeMs}
            </span>
          )}
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ) : (
        <div className="w-[460px] max-w-[92vw] bg-slate-950 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Architecture Inspector (K1–K4 Telemetry)</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {latest ? (
            <div className="p-3.5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-400">Tenant ID (K1)</div>
                  <div className="font-mono text-[11px] text-sky-300 truncate">{latest.tenantId}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Subdomain Match (K1)</div>
                  <div className="font-mono text-[11px] text-emerald-300">{latest.subdomainMatch}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">PostgreSQL RLS (K2)</div>
                  <div className="font-mono text-[11px] text-amber-300 truncate">{latest.rlsContext}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Rate Limit Remaining (K3)</div>
                  <div className="font-mono text-[11px] text-purple-300">{latest.rateLimit}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Cache Status (L1/L2)</div>
                  <div className="font-mono text-[11px] text-cyan-300">{latest.cacheStatus}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Response Time</div>
                  <div className="font-mono text-[11px] text-white">{latest.responseTimeMs}</div>
                </div>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1">
                {logs.map((l, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-2.5 py-1 rounded bg-slate-900/50 font-mono text-[11px]"
                  >
                    <span className="truncate text-slate-300">
                      <span className="text-slate-500 mr-1.5">{l.timestamp}</span>
                      <span className="text-sky-400 mr-1.5">{l.method}</span>
                      {l.path}
                    </span>
                    <span
                      className={`ml-2 shrink-0 px-1.5 rounded ${
                        l.status >= 400 ? 'bg-red-900/60 text-red-300' : 'bg-emerald-900/60 text-emerald-300'
                      }`}
                    >
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 text-xs text-slate-400">Chưa có request API nào được ghi nhận.</div>
          )}
        </div>
      )}
    </div>
  );
};
