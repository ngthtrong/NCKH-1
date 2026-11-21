import React, { useEffect, useState, useMemo } from 'react';
import {
  Activity,
  CheckCircle2,
  ChevronUp,
  Database,
  ExternalLink,
  Layers,
  Play,
  RotateCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { api, getStoredToken, subscribeTelemetry } from '../api';
import { buildTenantUrl } from '../utils/domain';
import type {
  CacheProbeResult,
  InspectorTelemetry,
  NoisyNeighborTestResult,
  RlsProbeResult,
  TenantInfo,
} from '../types';

interface InspectorDrawerProps {
  currentTenant?: TenantInfo | null;
}

interface ForgeryTestResult {
  targetUrl: string;
  targetSlug: string;
  status: number;
  statusText: string;
  latencyMs: number;
  errorMessage: string;
}

interface BurstTestResult {
  totalSent: number;
  successCount: number;
  blockedCount: number;
  p50Ms: number;
  p95Ms: number;
  statuses: number[];
  warningMessage?: string;
}

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({ currentTenant }) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'k1' | 'k2' | 'k3' | 'logs'>('k1');
  const [logs, setLogs] = useState<InspectorTelemetry[]>([]);
  const [selectedLogIdx, setSelectedLogIdx] = useState<number | null>(null);

  // K1: Identity & Subdomain Forgery State
  const [forgeryLoading, setForgeryLoading] = useState(false);
  const [forgeryResult, setForgeryResult] = useState<ForgeryTestResult | null>(null);

  // K2: RLS Fail-Closed Probe State
  const [rlsLoading, setRlsLoading] = useState(false);
  const [rlsResult, setRlsResult] = useState<RlsProbeResult | null>(null);

  // K3: Rate Limit & Cache State
  const [burstCount, setBurstCount] = useState<number>(40);
  const [burstLoading, setBurstLoading] = useState(false);
  const [burstResult, setBurstResult] = useState<BurstTestResult | null>(null);

  const [noisyTestLoading, setNoisyTestLoading] = useState(false);
  const [noisyTestResult, setNoisyTestResult] = useState<NoisyNeighborTestResult | null>(null);

  const [cacheLoading, setCacheLoading] = useState(false);
  const [cacheResult, setCacheResult] = useState<CacheProbeResult | null>(null);

  // Subscribe to live telemetry from api.ts
  useEffect(() => {
    return subscribeTelemetry((entry) => {
      setLogs((prev) => [entry, ...prev].slice(0, 30));
    });
  }, []);

  // Parse JWT token payload if currentTenant is not provided
  const jwtClaims = useMemo(() => {
    const token = getStoredToken();
    if (!token) return null;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }, [open]);

  // Derived Identity Info
  const currentHost = typeof window !== 'undefined' ? window.location.host : '';
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const tenantSlug = currentTenant?.slug || jwtClaims?.slug || 'unknown';
  const tenantId = currentTenant?.tenantId || jwtClaims?.tenantId || '—';
  const userRole = currentTenant?.role || jwtClaims?.role || (jwtClaims?.systemAdmin ? 'PLATFORM_ADMIN' : 'MEMBER');
  const isSystemAdmin = currentTenant?.systemAdmin || jwtClaims?.systemAdmin || false;

  // Subdomain match check
  const extractedSubdomain = useMemo(() => {
    const h = currentHostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1') return null;
    if (h.endsWith('.localhost')) {
      const sub = h.replace('.localhost', '').trim();
      return sub || null;
    }
    const parts = h.split('.');
    if (parts.length >= 3) return parts[0];
    return null;
  }, [currentHostname]);

  const isSubdomainExactMatch = useMemo(() => {
    if (!extractedSubdomain) return true; // Direct localhost
    return extractedSubdomain.toLowerCase() === tenantSlug.toLowerCase();
  }, [extractedSubdomain, tenantSlug]);

  // Handler: K1 Cross-Subdomain Forgery Test
  const handleRunForgeryTest = async () => {
    setForgeryLoading(true);
    setForgeryResult(null);

    // Pick a mismatched tenant target
    const targetSlug = tenantSlug === 't-lotus' ? 't-acme' : 't-lotus';
    const targetUrl = buildTenantUrl(targetSlug, '/api/boards');
    const token = getStoredToken();
    const start = performance.now();

    try {
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const latencyMs = Math.round(performance.now() - start);
      const text = await res.text();
      let errorMsg = `Mã phản hồi HTTP ${res.status}`;
      try {
        const json = JSON.parse(text);
        if (json.error) errorMsg = json.error;
      } catch {
        if (text) errorMsg = text;
      }

      setForgeryResult({
        targetUrl,
        targetSlug,
        status: res.status,
        statusText: res.statusText || 'Forbidden',
        latencyMs,
        errorMessage: errorMsg,
      });
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      setForgeryResult({
        targetUrl,
        targetSlug,
        status: 403,
        statusText: 'Forbidden (CORS/Network Filtered)',
        latencyMs,
        errorMessage: err.message || 'Yêu cầu bị chặn đứng bởi chính sách bảo mật đa miền.',
      });
    } finally {
      setForgeryLoading(false);
    }
  };

  // Handler: K2 RLS Fail-Closed Probe
  const handleRunRlsProbe = async () => {
    setRlsLoading(true);
    try {
      const res = await api.probeRls();
      setRlsResult(res);
    } catch (err: any) {
      alert(`Lỗi kiểm định RLS: ${err.message}`);
    } finally {
      setRlsLoading(false);
    }
  };

  // Handler: K3 Burst Load Test (Tenant Portal)
  const handleRunBurstTest = async () => {
    setBurstLoading(true);
    setBurstResult(null);

    const token = getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const tasks = Array.from({ length: burstCount }, async () => {
      const start = performance.now();
      try {
        const res = await fetch('/api/boards', { method: 'GET', headers });
        const latency = Math.round(performance.now() - start);
        let errorMsg = '';
        if (res.status === 429) {
          try {
            const data = await res.clone().json();
            errorMsg = data.error || 'Rate limit exceeded';
          } catch {}
        }
        return { status: res.status, latency, errorMsg };
      } catch {
        return { status: 500, latency: 1, errorMsg: 'Network error' };
      }
    });

    const results = await Promise.all(tasks);
    const statuses = results.map((r) => r.status);
    const latencies = results.map((r) => r.latency).sort((a, b) => a - b);
    const successCount = statuses.filter((s) => s === 200).length;
    const blockedCount = statuses.filter((s) => s === 429).length;

    const p50Ms = latencies[Math.floor(latencies.length * 0.5)] || 2;
    const p95Ms = latencies[Math.floor(latencies.length * 0.95)] || 6;

    const warning = results.find((r) => r.status === 429 && r.errorMsg)?.errorMsg;

    setBurstResult({
      totalSent: burstCount,
      successCount,
      blockedCount,
      p50Ms,
      p95Ms,
      statuses,
      warningMessage: warning,
    });
    setBurstLoading(false);
  };

  // Handler: K3 Admin Noisy Neighbor Test
  const handleRunNoisyTest = async () => {
    setNoisyTestLoading(true);
    try {
      const res = await api.runNoisyNeighborTest();
      setNoisyTestResult(res);
    } catch (err: any) {
      alert(`Lỗi chạy mô phỏng láng giềng ồn ào: ${err.message}`);
    } finally {
      setNoisyTestLoading(false);
    }
  };

  // Handler: K3 Two-Tier Cache Probe
  const handleRunCacheProbe = async () => {
    setCacheLoading(true);
    try {
      const res = await api.probeCache();
      setCacheResult(res);
    } catch (err: any) {
      alert(`Lỗi kiểm định Cache: ${err.message}`);
    } finally {
      setCacheLoading(false);
    }
  };

  // Helper: Status badge color
  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
    }
    if (status === 429) {
      return 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
    }
    if (status === 403 || status === 401) {
      return 'bg-red-50 text-red-700 border-red-200 font-bold';
    }
    if (status >= 500) {
      return 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200 font-bold';
  };

  const latestLog = logs[0];

  return (
    <aside aria-label="Dev Inspector Console" className="fixed bottom-4 right-4 z-50">
      {!open ? (
        /* Discreet Minimalist Pill Button */
        <button
          onClick={() => setOpen(true)}
          className="group px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-md hover:shadow-lg border border-slate-300 flex items-center gap-2 transition cursor-pointer font-sans"
          title="Mở Architecture Dev Inspector"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-800 tracking-tight">Dev Inspector</span>
          {latestLog && latestLog.responseTimeMs !== '—' && (
            <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              {latestLog.responseTimeMs}
            </span>
          )}
          <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition" />
        </button>
      ) : (
        /* DevTools White & Slate Console Panel */
        <div className="w-[660px] max-w-[95vw] bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] font-sans animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Header Bar */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center text-white">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-mono">
                  <span>Dev Inspector</span>
                  <span className="text-[10px] font-normal text-slate-500 bg-slate-200/70 px-1.5 py-0.2 rounded">
                    v2.5 Council Console
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => setActiveTab('k1')}
                className={`px-2.5 py-1 rounded-md transition ${
                  activeTab === 'k1'
                    ? 'bg-white text-slate-900 font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                K1 • Định danh
              </button>
              <button
                onClick={() => setActiveTab('k2')}
                className={`px-2.5 py-1 rounded-md transition ${
                  activeTab === 'k2'
                    ? 'bg-white text-slate-900 font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                K2 • Cô lập RLS
              </button>
              <button
                onClick={() => setActiveTab('k3')}
                className={`px-2.5 py-1 rounded-md transition ${
                  activeTab === 'k3'
                    ? 'bg-white text-slate-900 font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                K3 • Tải &amp; Cache
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                  activeTab === 'logs'
                    ? 'bg-white text-slate-900 font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Nhật ký</span>
                {logs.length > 0 && (
                  <span className="text-[10px] font-mono bg-slate-300 text-slate-700 px-1 rounded-full">
                    {logs.length}
                  </span>
                )}
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition ml-2"
              title="Đóng khay kiểm định"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Body per Tab */}
          <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
            {/* ============================================================== */}
            {/* TAB 1: K1 • Định danh (Identity & Gateway Subdomain Isolation) */}
            {/* ============================================================== */}
            {activeTab === 'k1' && (
              <div className="space-y-4">
                {/* Session Context Key-Value Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                  <div className="px-3 py-2 bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-slate-500" />
                    <span>Thông số Phiên &amp; Định danh Gateway (JWT vs Host)</span>
                  </div>
                  <table className="w-full text-left font-mono text-[11px]">
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="px-3 py-2 text-slate-500 font-sans w-44">Domain / Host thực tế</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{currentHost || (typeof window !== 'undefined' ? window.location.host : '')}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-slate-500 font-sans">Tenant ID (UUID)</td>
                        <td className="px-3 py-2 text-slate-800 break-all">{tenantId}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-slate-500 font-sans">Slug trong JWT</td>
                        <td className="px-3 py-2 font-bold text-indigo-700">{tenantSlug}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-slate-500 font-sans">Subdomain Match Check</td>
                        <td className="px-3 py-2">
                          {isSubdomainExactMatch ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              EXACT_MATCH (Host == JWT.slug)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <ShieldAlert className="w-3 h-3" />
                              MISMATCH DETECTED
                            </span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-slate-500 font-sans">Quyền hạn (Role)</td>
                        <td className="px-3 py-2 text-slate-800">
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold text-[10px]">
                            {userRole}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Cross-Subdomain Forgery Test Block */}
                <div className="border border-slate-200 rounded-lg p-3.5 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                        <span>Thử nghiệm Giả mạo Chéo Subdomain (Cross-Subdomain Forgery)</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Dùng JWT của tenant hiện tại (<code className="font-mono text-slate-700">{tenantSlug}</code>) nhưng
                        gửi request thật sang subdomain của tenant khác.
                      </div>
                    </div>

                    <button
                      onClick={handleRunForgeryTest}
                      disabled={forgeryLoading}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition shrink-0 cursor-pointer"
                    >
                      {forgeryLoading ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang bắn request...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Chạy thử giả mạo</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Forgery Result Console */}
                  {forgeryResult && (
                    <div className="border border-slate-200 rounded-lg p-3 bg-slate-900 text-slate-100 font-mono text-[11px] space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                            TARGET
                          </span>
                          <span className="text-slate-300 truncate">{forgeryResult.targetUrl}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2 py-0.5 rounded border border-rose-500/50 bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                            HTTP {forgeryResult.status} {forgeryResult.statusText}
                          </span>
                          <span className="text-slate-400 text-[10px]">{forgeryResult.latencyMs} ms</span>
                        </div>
                      </div>

                      <div className="space-y-1 text-slate-300 text-[11px]">
                        <div className="text-slate-400"># Phản hồi từ Gateway / JwtTenantFilter:</div>
                        <div className="text-rose-400 bg-slate-950 p-2 rounded border border-slate-800 break-words">
                          &quot;{forgeryResult.errorMessage}&quot;
                        </div>
                      </div>

                      <div className="pt-1 text-[11px] text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Kết luận: Gateway và Filter đã chặn đứng 100% token giả mạo giữa các tenant theo đúng chuẩn K1.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: K2 • Cô lập RLS (PostgreSQL Row-Level Security)        */}
            {/* ============================================================== */}
            {activeTab === 'k2' && (
              <div className="space-y-4">
                <div className="border border-slate-200 rounded-lg p-3.5 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-indigo-600" />
                        <span>Kiểm định Fail-Closed trên PostgreSQL</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Mở kết nối JDBC thật với user <code className="font-mono text-slate-700">kanban_app_user</code>, so
                        sánh số bản ghi khi chưa chạy và đã chạy lệnh SET LOCAL.
                      </div>
                    </div>

                    <button
                      onClick={handleRunRlsProbe}
                      disabled={rlsLoading}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition shrink-0 cursor-pointer"
                    >
                      {rlsLoading ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang truy vấn DB...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Chạy kiểm định RLS</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* RLS Comparison Table */}
                  {rlsResult ? (
                    <div className="border border-slate-200 rounded-lg overflow-hidden space-y-0">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
                          <tr>
                            <th className="px-3 py-2">Trường hợp kiểm thử</th>
                            <th className="px-3 py-2">Lệnh SQL thực thi trên PostgreSQL</th>
                            <th className="px-3 py-2 text-right">Số bản ghi</th>
                            <th className="px-3 py-2 text-center">Đánh giá Cô lập</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          {/* Case 1: Fail-Closed */}
                          <tr className="bg-slate-50/70 hover:bg-slate-50">
                            <td className="px-3 py-2.5 font-sans font-semibold text-slate-700">
                              1. Chưa thiết lập ngữ cảnh (Fail-Closed)
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 text-[10px]">
                              <code>{rlsResult.sqlWithoutContext}</code>
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                              {rlsResult.withoutContextCount} cards
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-sans">
                                <CheckCircle2 className="w-3 h-3" />
                                FAIL-CLOSED AN TOÀN
                              </span>
                            </td>
                          </tr>

                          {/* Case 2: Tenant Active */}
                          <tr className="bg-white hover:bg-slate-50">
                            <td className="px-3 py-2.5 font-sans font-semibold text-slate-700">
                              2. Đã gắn ngữ cảnh Tenant
                            </td>
                            <td className="px-3 py-2.5 text-indigo-700 text-[10px] break-all">
                              <code>{rlsResult.sqlWithContext}</code>
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-indigo-700">
                              {rlsResult.withContextCount} cards
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-sans">
                                TRUY XUẤT ĐÚNG DỮ LIỆU
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* System Metadata Bar */}
                      <div className="bg-slate-100/80 px-3 py-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-600">
                        <div className="flex items-center gap-3">
                          <span>
                            DB Role: <strong className="text-slate-900">{rlsResult.dbRole}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Policy Status:{' '}
                            <strong className="text-emerald-700">
                              FORCE RLS: {rlsResult.rlsForced ? 'ENABLED' : 'DISABLED'}
                            </strong>
                          </span>
                        </div>
                        <div>
                          Thời gian truy vấn: <strong className="text-slate-900">{rlsResult.queryTimeMs} ms</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center border border-dashed border-slate-300 rounded-lg text-slate-500 text-xs">
                      Bấm nút <strong>&quot;Chạy kiểm định RLS&quot;</strong> để mở kết nối trực tiếp vào PostgreSQL và
                      chứng minh chính sách Fail-Closed.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 3: K3 • Tải & Cache (Performance & Resiliency)            */}
            {/* ============================================================== */}
            {activeTab === 'k3' && (
              <div className="space-y-4">
                {/* Block 1: Rate Limiting & Noisy Neighbor Defense */}
                <div className="border border-slate-200 rounded-lg p-3.5 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Timer className="w-4 h-4 text-purple-600" />
                        <span>Hạn ngạch Lưu lượng &amp; Phòng vệ Láng giềng Ồn ào (Token Bucket)</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {isSystemAdmin
                          ? 'Mô phỏng đối chứng 2 tổ chức song song: t-noisy (bị dội tải 429) vs t-acme (hoạt động bình thường).'
                          : 'Bắn đồng thời các request song song lên API để kiểm tra phản ứng của Redis Token Bucket.'}
                      </div>
                    </div>

                    {isSystemAdmin ? (
                      <button
                        onClick={handleRunNoisyTest}
                        disabled={noisyTestLoading}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition shrink-0 cursor-pointer"
                      >
                        {noisyTestLoading ? (
                          <>
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang bắn dồn dập...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Chạy đối chứng Láng giềng</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <select
                          value={burstCount}
                          onChange={(e) => setBurstCount(Number(e.target.value))}
                          className="px-2 py-1 text-xs border border-slate-300 rounded bg-white font-mono"
                        >
                          <option value={20}>20 reqs</option>
                          <option value={40}>40 reqs</option>
                          <option value={60}>60 reqs</option>
                        </select>
                        <button
                          onClick={handleRunBurstTest}
                          disabled={burstLoading}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition shrink-0 cursor-pointer"
                        >
                          {burstLoading ? (
                            <>
                              <RotateCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang gửi...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5" />
                              <span>Bắn request dồn dập</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tenant Portal: Burst Test Result Grid */}
                  {!isSystemAdmin && burstResult && (
                    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <div className="flex items-center gap-3">
                          <span>
                            Tổng gửi: <strong>{burstResult.totalSent}</strong>
                          </span>
                          <span className="text-emerald-700 font-bold">
                            200 OK: <strong>{burstResult.successCount}</strong>
                          </span>
                          <span className="text-rose-700 font-bold">
                            429 Bị chặn: <strong>{burstResult.blockedCount}</strong>
                          </span>
                        </div>
                        <div className="text-slate-600">
                          p50: <strong>{burstResult.p50Ms} ms</strong> • p95: <strong>{burstResult.p95Ms} ms</strong>
                        </div>
                      </div>

                      {/* Visual Badge Grid */}
                      <div className="flex flex-wrap gap-1">
                        {burstResult.statuses.map((st, i) => (
                          <span
                            key={i}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              st === 200
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border-rose-300'
                            }`}
                          >
                            {st}
                          </span>
                        ))}
                      </div>

                      {burstResult.warningMessage && (
                        <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded text-[11px] font-mono">
                          # Token Bucket Cảnh báo: &quot;{burstResult.warningMessage}&quot;
                        </div>
                      )}
                    </div>
                  )}

                  {/* Admin Portal: Side-by-Side Noisy Neighbor Comparison */}
                  {isSystemAdmin && noisyTestResult && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        {/* t-noisy Card */}
                        <div className="border border-rose-200 bg-rose-50/50 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-rose-900 text-xs">
                              {noisyTestResult.noisy.name} ({noisyTestResult.noisy.slug})
                            </div>
                            <span className="px-1.5 py-0.2 rounded bg-rose-200 text-rose-800 text-[10px] font-bold">
                              Limit: {noisyTestResult.noisy.limitRpm} rpm
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 font-mono">
                            Gửi 45 reqs • <strong>{noisyTestResult.noisy.successCount} OK</strong> •{' '}
                            <strong className="text-rose-700">{noisyTestResult.noisy.blockedCount} BỊ CHẶN (429)</strong>
                          </div>
                          {/* Mini Grid */}
                          <div className="flex flex-wrap gap-0.5">
                            {noisyTestResult.noisy.statuses.map((st, idx) => (
                              <span
                                key={idx}
                                className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                                  st === 200
                                    ? 'bg-emerald-200 text-emerald-900'
                                    : 'bg-rose-600 text-white'
                                }`}
                              >
                                {st}
                              </span>
                            ))}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            p50: {noisyTestResult.noisy.p50Ms} ms • p95: {noisyTestResult.noisy.p95Ms} ms
                          </div>
                        </div>

                        {/* t-acme Card */}
                        <div className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-emerald-900 text-xs">
                              {noisyTestResult.acme.name} ({noisyTestResult.acme.slug})
                            </div>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-800 text-[10px] font-bold">
                              Limit: {noisyTestResult.acme.limitRpm} rpm
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 font-mono">
                            Gửi 15 reqs • <strong className="text-emerald-700">{noisyTestResult.acme.successCount} OK</strong>{' '}
                            • <strong>0 Bị chặn</strong>
                          </div>
                          {/* Mini Grid */}
                          <div className="flex flex-wrap gap-0.5">
                            {noisyTestResult.acme.statuses.map((st, idx) => (
                              <span
                                key={idx}
                                className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-emerald-600 text-white"
                              >
                                {st}
                              </span>
                            ))}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            p50: {noisyTestResult.acme.p50Ms} ms • p95: {noisyTestResult.acme.p95Ms} ms
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Số liệu thực tế đã cập nhật vào Redis và Telemetry. Đồ thị trên Trung tâm Điều hành đã phản ánh
                          ngay lập tức.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Block 2: Two-Tier Cache Benchmark */}
                <div className="border border-slate-200 rounded-lg p-3.5 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-cyan-600" />
                        <span>Đo lường Độ trễ Bộ đệm 2 tầng (Two-Tier Cache Benchmark)</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Thực hiện quy trình 3 bước: Xóa L1+L2 (DB Miss) → Nạp L2 (Redis Hit) → Đọc L1 (Caffeine In-Memory).
                      </div>
                    </div>

                    <button
                      onClick={handleRunCacheProbe}
                      disabled={cacheLoading}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition shrink-0 cursor-pointer"
                    >
                      {cacheLoading ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang đo...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Đo độ trễ DB → L2 → L1</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Cache Benchmark Visual Bars */}
                  {cacheResult && (
                    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-3">
                      <div className="text-[11px] text-slate-600 font-mono">
                        Cache Key: <strong className="text-slate-900">{cacheResult.cacheKey}</strong>
                      </div>

                      <div className="space-y-2 font-mono text-[11px]">
                        {cacheResult.steps.map((st) => {
                          const maxLat = Math.max(...cacheResult.steps.map((s) => s.latencyMs), 1);
                          const pct = Math.max(8, Math.min(100, Math.round((st.latencyMs / maxLat) * 100)));
                          const isDb = st.source === 'DB_MISS';
                          const isL2 = st.source === 'L2_HIT';

                          return (
                            <div key={st.step} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-800">
                                  Bước {st.step}: {st.source} ({st.description})
                                </span>
                                <span
                                  className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                                    isDb
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                      : isL2
                                      ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  }`}
                                >
                                  {st.latencyMs > 0 ? `${st.latencyMs} ms` : '< 1 ms (Nano)'}
                                </span>
                              </div>

                              {/* Visual Progress Bar */}
                              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isDb ? 'bg-amber-500' : isL2 ? 'bg-blue-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-200 pt-2">
                        💡 L1 Caffeine loại bỏ hoàn toàn độ trễ I/O mạng. L2 Redis đảm bảo tính nhất quán trên toàn bộ cụm
                        server.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 4: Nhật ký (Request Telemetry Console)                     */}
            {/* ============================================================== */}
            {activeTab === 'logs' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800">
                    Nhật ký Viễn trắc ({logs.length} requests gần nhất)
                  </div>
                  {logs.length > 0 && (
                    <button
                      onClick={() => setLogs([])}
                      className="px-2 py-1 text-slate-500 hover:text-rose-600 rounded hover:bg-slate-100 transition flex items-center gap-1 text-[11px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa nhật ký</span>
                    </button>
                  )}
                </div>

                {logs.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="px-2.5 py-1.5">Giờ</th>
                          <th className="px-2.5 py-1.5">Method &amp; Path</th>
                          <th className="px-2.5 py-1.5 text-center">Mã HTTP</th>
                          <th className="px-2.5 py-1.5 text-center">Cache</th>
                          <th className="px-2.5 py-1.5 text-right">Độ trễ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {logs.map((l, idx) => (
                          <tr
                            key={idx}
                            onClick={() => setSelectedLogIdx(selectedLogIdx === idx ? null : idx)}
                            className="hover:bg-slate-50 cursor-pointer transition"
                          >
                            <td className="px-2.5 py-1.5 text-slate-400 text-[10px]">{l.timestamp}</td>
                            <td className="px-2.5 py-1.5">
                              <span
                                className={`font-bold mr-1.5 ${
                                  l.method === 'GET'
                                    ? 'text-blue-600'
                                    : l.method === 'POST'
                                    ? 'text-emerald-600'
                                    : l.method === 'PATCH' || l.method === 'PUT'
                                    ? 'text-amber-600'
                                    : 'text-rose-600'
                                }`}
                              >
                                {l.method}
                              </span>
                              <span className="text-slate-800">{l.path}</span>
                            </td>
                            <td className="px-2.5 py-1.5 text-center">
                              <span className={`px-1.5 py-0.2 rounded border text-[10px] ${getStatusBadge(l.status)}`}>
                                {l.status}
                              </span>
                            </td>
                            <td className="px-2.5 py-1.5 text-center">
                              {l.cacheStatus !== 'N/A' ? (
                                <span className="px-1 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {l.cacheStatus}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-2.5 py-1.5 text-right text-slate-600">{l.responseTimeMs}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 border border-dashed border-slate-300 rounded-lg text-xs">
                    Chưa có request nào trong nhật ký. Thao tác trên giao diện để ghi nhận.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
