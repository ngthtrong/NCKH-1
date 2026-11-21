import React, { useEffect, useState, useRef } from 'react';
import {
  Building2,
  ExternalLink,
  Plus,
  Shield,
  ShieldAlert,
  CheckCircle2,
  Search,
  Code2,
  Film,
  Zap,
  Lock,
  Unlock,
  AlertCircle,
  Activity,
  Layers,
  Database,
  Server,
  Play,
  Pause,
  ArrowRight,
  TrendingUp,
  X,
  Sliders,
  RefreshCw,
  Globe,
  Sparkles,
  User,
  Mail,
  Key,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { api, ApiError } from '../api';
import { buildTenantUrl, getTenantHost } from '../utils/domain';
import type { AdminTenant, MetricsOverview } from '../types';

export const AdminView: React.FC = () => {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [metrics, setMetrics] = useState<MetricsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Live polling state (every 3 seconds)
  const [isLive, setIsLive] = useState(true);
  const [rightChartTab, setRightChartTab] = useState<'CACHE' | 'LATENCY'>('CACHE');

  // Modal / Drawer states
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [selectedTenantForEdit, setSelectedTenantForEdit] = useState<AdminTenant | null>(null);

  // Edit Drawer State
  const [editTier, setEditTier] = useState<'FREE' | 'PRO' | 'ENTERPRISE'>('PRO');
  const [editRpm, setEditRpm] = useState<number>(120);
  const [editMaxMembers, setEditMaxMembers] = useState<number>(50);
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Form State for Create
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [tier, setTier] = useState<'FREE' | 'PRO' | 'ENTERPRISE'>('PRO');
  const [industryTemplate, setIndustryTemplate] = useState<'SOFTWARE' | 'MEDIA'>('SOFTWARE');
  const [rateLimitRpm, setRateLimitRpm] = useState<number>(120);
  const [maxMembers, setMaxMembers] = useState<number>(50);
  const [adminName, setAdminName] = useState('Quản trị viên');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('Password123!');
  const [submitting, setSubmitting] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetricsAndTenants = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tenantsData, metricsData] = await Promise.all([
        api.listTenants(),
        api.getMetricsOverview().catch(() => null),
      ]);
      setTenants(tenantsData);
      if (metricsData) {
        setMetrics(metricsData);
      }
    } catch (err) {
      if (!silent) {
        setError(err instanceof ApiError ? err.message : 'Không tải được dữ liệu quản trị');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricsAndTenants(false);
  }, []);

  // 3-second live polling loop
  useEffect(() => {
    if (!isLive) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      fetchMetricsAndTenants(true);
    }, 3000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLive]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.createTenant({
        slug: slug.trim().toLowerCase(),
        name: name.trim(),
        tier,
        industryTemplate,
        rateLimitRpm,
        maxMembers,
        adminName: adminName.trim() || undefined,
        adminEmail: adminEmail.trim() || undefined,
        adminPassword: adminPassword.trim() || 'Password123!',
      });
      setSuccessMsg(`Đã cấp phát thành công tổ chức "${name}" (${getTenantHost(slug)})!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setSlug('');
      setName('');
      setAdminName('Quản trị viên');
      setAdminEmail('');
      setAdminPassword('Password123!');
      setIsSlideOverOpen(false);
      await fetchMetricsAndTenants(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tạo Tổ chức mới');
    } finally {
      setSubmitting(false);
    }
  };

  const openConfigDrawer = (t: AdminTenant) => {
    setSelectedTenantForEdit(t);
    const effectiveTier = (t.tier as 'FREE' | 'PRO' | 'ENTERPRISE') || 'PRO';
    setEditTier(effectiveTier);
    setEditRpm(t.rateLimitRpm || (effectiveTier === 'FREE' ? 30 : effectiveTier === 'ENTERPRISE' ? 600 : 120));
    setEditMaxMembers(t.maxMembers || (effectiveTier === 'FREE' ? 10 : effectiveTier === 'ENTERPRISE' ? 500 : 50));
    setEditStatus(t.status);
    setIsSlideOverOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTenantForEdit) return;
    setSavingEdit(true);
    setError(null);
    try {
      await api.updateTenant(selectedTenantForEdit.id, {
        tier: editTier,
        rateLimitRpm: editRpm,
        maxMembers: editMaxMembers,
        status: editStatus,
      });
      setSuccessMsg(`Đã cập nhật cấu hình tổ chức "${selectedTenantForEdit.name}" thành công!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      setIsSlideOverOpen(false);
      await fetchMetricsAndTenants(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể cập nhật cấu hình Tổ chức');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleStatus = async (t: AdminTenant, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = t.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.updateTenant(t.id, { status: newStatus });
      setSuccessMsg(`Đã ${newStatus === 'ACTIVE' ? 'mở khóa' : 'tạm khóa'} tổ chức "${t.name}"!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchMetricsAndTenants(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể cập nhật trạng thái Tổ chức');
    }
  };

  // Filtered tenants for search
  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Derived KPI Stats
  const summary = metrics?.summary || {
    totalTenants: tenants.length,
    activeTenants: tenants.filter((t) => t.status === 'ACTIVE').length,
    totalRpm: 0,
    p50LatencyMs: 4,
    p95LatencyMs: 12,
    totalBlocked429: tenants.reduce((acc, t) => acc + (t.blocked429Count || 0), 0),
    cacheHitRatio: 92.4,
  };

  const tierDistribution = {
    FREE: tenants.filter((t) => t.tier === 'FREE').length,
    PRO: tenants.filter((t) => t.tier === 'PRO').length,
    ENTERPRISE: tenants.filter((t) => t.tier === 'ENTERPRISE').length,
  };

  // Color mapping for tenant lines in chart
  const tenantColors: Record<string, string> = {
    't-acme': '#0d6efd',
    't-lotus': '#fd7e14',
    't-noisy': '#6366f1',
  };

  // Fallback palette for dynamically created tenants
  const fallbackColors = ['#06b6d4', '#10b981', '#ec4899', '#8b5cf6', '#f59e0b'];
  tenants.forEach((t, i) => {
    if (!tenantColors[t.slug]) {
      const color =
        t.settings?.theme?.primary ||
        metrics?.byTenant?.find((m) => m.slug === t.slug)?.primaryColor ||
        fallbackColors[i % fallbackColors.length];
      tenantColors[t.slug] = color;
    }
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-16 max-w-[1440px] mx-auto space-y-5 text-slate-900 font-sans">
      {/* ============================================================== */}
      {/* TẦNG 1: Header Toolbar (1 Hàng gọn gàng, sắc nét)              */}
      {/* ============================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-950">
                Trung tâm Điều hành &amp; Giám sát Nền tảng
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Pool Cluster • Online
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Giám sát hiệu năng hệ thống, lưu lượng truy cập và hạn mức sử dụng của các doanh nghiệp thuê dịch vụ
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Live Telemetry Toggle */}
          <button
            onClick={() => setIsLive(!isLive)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              isLive
                ? 'bg-slate-900 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Tự động cập nhật số liệu viễn trắc mỗi 3 giây"
          >
            {isLive ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span>Live (3s)</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-0.5" />
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-slate-400" />
                <span>Tạm dừng</span>
              </>
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchMetricsAndTenants(false)}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 border border-slate-200 transition"
            title="Làm mới dữ liệu ngay"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Architecture Pipeline Button */}
          <button
            onClick={() => setIsPipelineModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition"
            title="Xem 5 tầng luồng kiến trúc SaaS Multi-Tenant"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Luồng kiến trúc K1–K4</span>
          </button>

          {/* Provision Tenant Button */}
          <button
            onClick={() => {
              setSelectedTenantForEdit(null);
              setIsSlideOverOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Khởi tạo Tổ chức mới</span>
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* TẦNG 2: 4 Thẻ KPI Sức khỏe Cụm (Tabular Nums, Số liệu thật)    */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* KPI 1: Active Tenants */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Tổ chức Hoạt động</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-950 font-mono tracking-tight tabular-nums">
              {summary.activeTenants}
            </span>
            <span className="text-xs text-slate-500 font-mono">/ {summary.totalTenants} tổ chức</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono flex-wrap">
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">FREE: {tierDistribution.FREE}</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">PRO: {tierDistribution.PRO}</span>
            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold">ENT: {tierDistribution.ENTERPRISE}</span>
          </div>
        </div>

        {/* KPI 2: Cluster Throughput */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Thông lượng Cụm</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 font-mono tracking-tight tabular-nums">
              {summary.totalRpm}
            </span>
            <span className="text-xs text-slate-500 font-mono">req/phút</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>Tải thực tế trên Pool CSDL</span>
          </div>
        </div>

        {/* KPI 3: Latency p50 / p95 */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Độ trễ Xử lý (p50 / p95)</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono tracking-tight tabular-nums">
              {summary.p50LatencyMs}
            </span>
            <span className="text-xs text-slate-400 font-mono">/</span>
            <span className="text-lg sm:text-xl font-bold text-slate-700 font-mono tracking-tight tabular-nums">
              {summary.p95LatencyMs}
            </span>
            <span className="text-xs text-slate-500 font-mono">ms</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Thời gian phản hồi trung bình của hệ thống
          </div>
        </div>

        {/* KPI 4: Throttled & Cache Hit */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Chặn 429 &amp; Cache Hit</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-mono tracking-tight tabular-nums">
              {summary.totalBlocked429}
            </span>
            <span className="text-xs text-slate-400 font-mono">chặn</span>
            <span className="text-slate-300">•</span>
            <span className="text-lg sm:text-xl font-bold text-indigo-600 font-mono tabular-nums">
              {summary.cacheHitRatio}%
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Kiểm soát giới hạn lưu lượng tự động
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TẦNG 3: Lưới Đồ thị Viễn trắc (Tỷ lệ 7/12 & 5/12, Cao h-64)   */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Chart (7 cols): Timeseries Throughput & 429 Blocks */}
        <div className="lg:col-span-7 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" /> Lưu lượng Thời gian thực &amp; Chặn 429
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Biểu đồ chuỗi thời gian phân theo từng Tổ chức (15 mốc gần nhất • cửa sổ trượt)
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200">
              Live 3s
            </span>
          </div>

          <div className="h-64 w-full">
            {metrics?.timeseries && metrics.timeseries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={metrics.timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} iconType="circle" />
                  {tenants.map((t) => (
                    <Area
                      key={t.slug}
                      type="monotone"
                      dataKey={t.slug}
                      name={t.name}
                      stroke={tenantColors[t.slug] || '#6366f1'}
                      fill={tenantColors[t.slug] || '#6366f1'}
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  ))}
                  <Area
                    type="stepAfter"
                    dataKey="blocked429"
                    name="Chặn 429"
                    stroke="#e11d48"
                    fill="#e11d48"
                    fillOpacity={0.3}
                    strokeWidth={1.5}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Đang nạp số liệu viễn trắc...
              </div>
            )}
          </div>
        </div>

        {/* Right Chart (5 cols): Cache Efficiency & Latency Comparison */}
        <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-600" />
                {rightChartTab === 'CACHE' ? 'Phân tầng Bộ đệm (Cache)' : 'Độ trễ Theo Khách thuê'}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {rightChartTab === 'CACHE'
                  ? 'Phân bổ L1 Caffeine (RAM) / L2 Redis / DB Miss'
                  : 'Độ trễ p50 và p95 (ms) đo đạc theo từng Tenant'}
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
              <button
                onClick={() => setRightChartTab('CACHE')}
                className={`px-2 py-0.5 rounded-md font-semibold transition ${
                  rightChartTab === 'CACHE'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Bộ đệm
              </button>
              <button
                onClick={() => setRightChartTab('LATENCY')}
                className={`px-2 py-0.5 rounded-md font-semibold transition ${
                  rightChartTab === 'LATENCY'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Độ trễ
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            {metrics?.byTenant && metrics.byTenant.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {rightChartTab === 'CACHE' ? (
                  <BarChart data={metrics.byTenant} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="slug"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: '0.75rem',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} iconType="circle" />
                    <Bar dataKey="l1Hits" name="L1 Caffeine (RAM)" fill="#10b981" stackId="a" />
                    <Bar dataKey="l2Hits" name="L2 Redis" fill="#06b6d4" stackId="a" />
                    <Bar dataKey="dbMisses" name="DB Miss (Postgres)" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <BarChart data={metrics.byTenant} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="slug"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: '0.75rem',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} iconType="circle" />
                    <Bar dataKey="p50Ms" name="p50 Latency (ms)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="p95Ms" name="p95 Latency (ms)" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Đang nạp số liệu so sánh...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TẦNG 4: Bảng Quản lý Khách thuê (Tích hợp Thanh Tiến độ Hạn ngạch) */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Danh sách Khách thuê Đăng ký ({tenants.length})
            </h2>
            <p className="text-[11px] text-slate-500">
              Quản lý gói dịch vụ, tiêu thụ hạn mức thời gian thực và trạng thái vận hành tức thời
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo tên, subdomain..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span>Đang tải thông tin khách thuê từ Control Plane...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[960px]">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-3.5 min-w-[190px]">Tổ chức</th>
                  <th className="px-4 py-3.5 min-w-[180px]">Tên miền Subdomain</th>
                  <th className="px-4 py-3.5 w-24">Gói cước</th>
                  <th className="px-4 py-3.5 min-w-[160px]">Lưu lượng (RPM)</th>
                  <th className="px-4 py-3.5 min-w-[150px]">Nhân sự</th>
                  <th className="px-4 py-3.5 w-24 text-center">Chặn 429</th>
                  <th className="px-4 py-3.5 w-32">Trạng thái</th>
                  <th className="px-4 py-3.5 w-40 text-right whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTenants.map((t) => {
                  const isActive = t.status === 'ACTIVE';
                  const metric = metrics?.byTenant?.find((m) => m.slug === t.slug);
                  const color = tenantColors[t.slug] || '#6366f1';

                  // Calculate RPM usage & percentage
                  const currentRpm = metric?.currentRpm || 0;
                  const rpmLimit = t.rateLimitRpm || 120;
                  const rpmPercent = Math.min(100, Math.round((currentRpm / rpmLimit) * 100));

                  // Calculate Members usage & percentage
                  const memberCount = t.memberCount || 0;
                  const maxMem = t.maxMembers || 50;
                  const memberPercent = Math.min(100, Math.round((memberCount / maxMem) * 100));

                  const blocked429 = metric?.blocked429 ?? t.blocked429Count ?? 0;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => openConfigDrawer(t)}
                      className="hover:bg-slate-50/90 transition cursor-pointer group"
                    >
                      {/* 1. Tổ chức */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs"
                            style={{ backgroundColor: color }}
                          >
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                              {t.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {t.slug}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Subdomain Link */}
                      <td className="px-4 py-3.5">
                        <a
                          href={buildTenantUrl(t.slug)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 font-mono text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-semibold"
                          title="Mở cổng làm việc của tổ chức này"
                        >
                          <span>{getTenantHost(t.slug)}</span>
                          <ExternalLink className="w-3 h-3 text-indigo-500" />
                        </a>
                      </td>

                      {/* 3. Gói cước */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            t.tier === 'ENTERPRISE'
                              ? 'bg-purple-100 text-purple-700'
                              : t.tier === 'PRO'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {t.tier}
                        </span>
                      </td>

                      {/* 4. Lưu lượng (RPM) với Mini Progress Bar */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-bold text-slate-900">{currentRpm} <span className="font-normal text-slate-400">/ {rpmLimit}</span></span>
                            <span className="text-[10px] font-bold text-slate-500">{rpmPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                rpmPercent >= 90
                                  ? 'bg-rose-500'
                                  : rpmPercent >= 75
                                  ? 'bg-amber-500'
                                  : 'bg-purple-600'
                              }`}
                              style={{ width: `${rpmPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 5. Nhân sự với Mini Progress Bar */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-bold text-slate-900">{memberCount} <span className="font-normal text-slate-400">/ {maxMem}</span></span>
                            <span className="text-[10px] font-bold text-slate-500">{memberPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all duration-500"
                              style={{ width: `${memberPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 6. Chặn 429 */}
                      <td className="px-4 py-3.5 text-center">
                        {blocked429 > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded font-mono text-xs font-bold bg-rose-100 text-rose-700 animate-pulse">
                            {blocked429}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-400">0</span>
                        )}
                      </td>

                      {/* 7. Trạng thái */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {isActive ? 'HOẠT ĐỘNG' : 'TẠM KHÓA'}
                        </span>
                      </td>

                      {/* 8. Thao tác */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openConfigDrawer(t);
                            }}
                            className="px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition text-[11px] font-semibold border border-slate-200 whitespace-nowrap shrink-0"
                            title="Chỉnh sửa cấu hình gói cước và hạn mức"
                          >
                            Cấu hình
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(t, e)}
                            className={`p-1 rounded-lg border transition shrink-0 ${
                              isActive
                                ? 'text-rose-600 hover:bg-rose-50 border-rose-200'
                                : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                            }`}
                            title={isActive ? 'Khóa tạm thời tổ chức' : 'Kích hoạt lại tổ chức'}
                          >
                            {isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: Luồng Kiến trúc K1–K4 (Hiển thị Trực quan 5 Tầng)      */}
      {/* ============================================================== */}
      {isPipelineModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-slate-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Lưu đồ Kiến trúc Vận hành Cụm SaaS Multi-Tenant</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hành trình xử lý request từ Caddy Gateway qua các chốt kiểm định K1, K3, Cache đến PostgreSQL RLS (K2)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPipelineModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: 5 Architecture Stages */}
            <div className="p-6 space-y-3 font-sans text-xs bg-slate-50/50">
              {/* Stage 1: Edge Reverse Proxy */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                    01
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                      <span>Caddy Edge Reverse Proxy</span>
                      <span className="px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono text-[10px]">
                        Port 80 / 443
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Tiếp nhận Wildcard Subdomain (*.tenantflow.tech), quản lý TLS tự động và chuyển tiếp nguyên vẹn Host header
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono text-xs font-bold text-cyan-400 shrink-0 ml-2">
                  PASS
                </div>
              </div>

              <div className="flex justify-center -my-1 text-slate-300">
                <ArrowRight className="w-4 h-4 rotate-90" />
              </div>

              {/* Stage 2: K1 Identity Filter */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-[11px] border border-blue-200">
                    K1
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>JWT &amp; Subdomain Matching Filter</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px]">
                        EXACT_MATCH
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Đối chiếu định danh Host Subdomain với Claim slug trong JWT token. Ngăn chặn tuyệt đối giả mạo phiên chéo (HTTP 403 Forbidden)
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-600 shrink-0 ml-2">
                  100% SECURE
                </span>
              </div>

              <div className="flex justify-center -my-1 text-slate-300">
                <ArrowRight className="w-4 h-4 rotate-90" />
              </div>

              {/* Stage 3: Rate Limiting K3 */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-[11px] border border-purple-200">
                    K3
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>Token Bucket Rate Limit Filter (Redis 7.2)</span>
                      <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 font-mono text-[10px]">
                        SLIDING_BUCKET
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Giới hạn thông lượng động theo gói cước (FREE 30 / PRO 120 / ENT 600 RPM). Cắt tải bảo vệ hệ thống bằng HTTP 429 Too Many Requests
                    </div>
                  </div>
                </div>
                <div className="font-mono text-xs font-bold text-rose-600 shrink-0 ml-2">
                  {summary.totalBlocked429} <span className="text-[10px] font-normal text-slate-400">chặn</span>
                </div>
              </div>

              <div className="flex justify-center -my-1 text-slate-300">
                <ArrowRight className="w-4 h-4 rotate-90" />
              </div>

              {/* Stage 4: Multi-Tier Cache */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold text-[11px] border border-cyan-200">
                    Đệm
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>Multi-Tier Configuration Cache</span>
                      <span className="px-1.5 py-0.2 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 font-mono text-[10px]">
                        L1 + L2
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      L1 Caffeine bộ nhớ trong (&lt;0.5ms) kết hợp L2 Redis Pub/Sub đồng bộ tức thời khi quản trị viên cập nhật cấu hình
                    </div>
                  </div>
                </div>
                <div className="font-mono text-xs font-bold text-emerald-600 shrink-0 ml-2">
                  {summary.cacheHitRatio}% <span className="text-[10px] font-normal text-slate-400">hit</span>
                </div>
              </div>

              <div className="flex justify-center -my-1 text-slate-300">
                <ArrowRight className="w-4 h-4 rotate-90" />
              </div>

              {/* Stage 5: Database RLS (K2) */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-[11px] border border-amber-200">
                    K2
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>Bảo mật Cấp dòng (PostgreSQL FORCE RLS)</span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px]">
                        ROW_LEVEL_SECURITY
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Thiết lập biến session <code className="text-amber-800 bg-amber-50 px-1 py-0.2 rounded">app.current_tenant_id</code> trước mỗi truy vấn. Cách ly dữ liệu tuyệt đối ở tầng nhân CSDL
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold shrink-0 ml-2">
                  FAIL-CLOSED
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPipelineModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition"
              >
                Đóng lưu đồ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SLIDE-OVER DRAWER: Cấp phát hoặc Cấu hình Khách thuê           */}
      {/* ============================================================== */}
      {isSlideOverOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsSlideOverOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col">
              {/* Panel Header */}
              <div className="p-5 sm:p-6 bg-slate-950 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold">
                    {selectedTenantForEdit ? 'Cấu hình Tổ chức' : 'Cấp phát Tổ chức Mới'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedTenantForEdit
                      ? `Điều chỉnh thông số hoạt động của ${selectedTenantForEdit.name}`
                      : 'Khởi tạo tenant mới trên CSDL Pool Level 3'}
                  </p>
                </div>
                <button
                  onClick={() => setIsSlideOverOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Panel Body */}
              <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-5 text-xs">
                {selectedTenantForEdit ? (
                  /* ====================================================== */
                  /* EDIT EXISTING TENANT MODE                              */
                  /* ====================================================== */
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="text-xs font-bold text-slate-900">{selectedTenantForEdit.name}</div>
                      <div className="text-[11px] font-mono text-indigo-600 font-semibold flex items-center gap-1">
                        <span>{getTenantHost(selectedTenantForEdit.slug)}</span>
                        <ExternalLink className="w-3 h-3 text-indigo-500" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1.5">Gói cước Dịch vụ (SaaS Tier)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['FREE', 'PRO', 'ENTERPRISE'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setEditTier(t);
                              setEditRpm(t === 'FREE' ? 30 : t === 'PRO' ? 120 : 600);
                              setEditMaxMembers(t === 'FREE' ? 10 : t === 'PRO' ? 50 : 500);
                            }}
                            className={`p-2 rounded-xl border text-center transition ${
                              editTier === t
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold shadow-2xs ring-1 ring-indigo-600'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div className="text-xs font-bold">{t}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {t === 'FREE' ? '30 rpm • 10 u' : t === 'PRO' ? '120 rpm • 50 u' : '600 rpm • 500 u'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Hạn ngạch RPM</label>
                        <input
                          type="number"
                          min={1}
                          value={editRpm}
                          onChange={(e) => setEditRpm(Math.max(1, Number(e.target.value)))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-0.5">Token Bucket (req/phút)</p>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Giới hạn nhân sự</label>
                        <input
                          type="number"
                          min={1}
                          value={editMaxMembers}
                          onChange={(e) => setEditMaxMembers(Math.max(1, Number(e.target.value)))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-0.5">Số tài khoản tối đa</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1.5">Trạng thái Hoạt động</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditStatus('ACTIVE')}
                          className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition font-semibold text-xs ${
                            editStatus === 'ACTIVE'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>HOẠT ĐỘNG</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditStatus('SUSPENDED')}
                          className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition font-semibold text-xs ${
                            editStatus === 'SUSPENDED'
                              ? 'border-rose-500 bg-rose-50 text-rose-700 ring-1 ring-rose-500'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span>TẠM KHÓA</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                        <span>Đồng bộ Tức thời qua Redis Pub/Sub</span>
                      </div>
                      <p className="text-amber-700">
                        Mọi thay đổi hạn mức hoặc trạng thái sẽ được gửi qua kênh Redis Pub/Sub để xóa cache L1 Caffeine và áp dụng trên toàn bộ các node API trong vòng &lt;5ms.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsSlideOverOpen(false)}
                        className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={savingEdit}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs transition disabled:opacity-60 flex items-center justify-center gap-1.5"
                      >
                        {savingEdit ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Đang lưu...</span>
                          </>
                        ) : (
                          <span>Lưu thay đổi</span>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ====================================================== */
                  /* PROVISION NEW TENANT MODE                              */
                  /* ====================================================== */
                  <form onSubmit={handleCreate} className="space-y-4">
                    {/* Nhóm 1: Định danh Tổ chức (K1) */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>1. Định danh Tổ chức &amp; Subdomain (K1)</span>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Tên Doanh nghiệp / Tổ chức <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="vd: Nova Innovation Corp"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Subdomain định danh <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="vd: t-nova"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                        {slug ? (
                          <p className="text-[11px] text-slate-500 font-mono mt-1">
                            Truy cập tại: <span className="text-indigo-600 font-semibold">{getTenantHost(slug)}</span>
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Chỉ gồm chữ cái viết thường, số và dấu gạch ngang
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Nhóm 2: Gói cước & Hạn mức (K3) */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-purple-600" />
                        <span>2. Gói cước &amp; Hạn mức Tài nguyên (K3)</span>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Gói cước Dịch vụ (SaaS Tier)</label>
                        <select
                          value={tier}
                          onChange={(e) => {
                            const val = e.target.value as 'FREE' | 'PRO' | 'ENTERPRISE';
                            setTier(val);
                            setRateLimitRpm(val === 'FREE' ? 30 : val === 'PRO' ? 120 : 600);
                            setMaxMembers(val === 'FREE' ? 10 : val === 'PRO' ? 50 : 500);
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="FREE">FREE (30 req/phút • 10 thành viên)</option>
                          <option value="PRO">PRO (120 req/phút • 50 thành viên)</option>
                          <option value="ENTERPRISE">ENTERPRISE (600 req/phút • 500 thành viên)</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Hạn mức RPM</label>
                          <input
                            type="number"
                            min={1}
                            value={rateLimitRpm}
                            onChange={(e) => setRateLimitRpm(Math.max(1, Number(e.target.value)))}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Số thành viên</label>
                          <input
                            type="number"
                            min={1}
                            value={maxMembers}
                            onChange={(e) => setMaxMembers(Math.max(1, Number(e.target.value)))}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Mẫu Ngành nghề Khởi tạo
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setIndustryTemplate('SOFTWARE')}
                            className={`p-2 rounded-xl border text-left transition flex items-start gap-2 ${
                              industryTemplate === 'SOFTWARE'
                                ? 'border-indigo-600 bg-white ring-1 ring-indigo-600'
                                : 'border-slate-200 bg-white/70'
                            }`}
                          >
                            <Code2 className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                            <div>
                              <div className="font-bold text-slate-900">Phần mềm</div>
                              <div className="text-[10px] text-slate-500">Agile 4 cột</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIndustryTemplate('MEDIA')}
                            className={`p-2 rounded-xl border text-left transition flex items-start gap-2 ${
                              industryTemplate === 'MEDIA'
                                ? 'border-amber-600 bg-white ring-1 ring-amber-600'
                                : 'border-slate-200 bg-white/70'
                            }`}
                          >
                            <Film className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                            <div>
                              <div className="font-bold text-slate-900">Truyền thông</div>
                              <div className="text-[10px] text-slate-500">Nội dung 4 cột</div>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Nhóm 3: Tài khoản Quản trị viên Khởi tạo */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-emerald-600" />
                        <span>3. Tài khoản Quản trị viên Khởi tạo (Tenant Admin)</span>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Họ và tên Quản trị viên
                        </label>
                        <input
                          type="text"
                          placeholder="vd: Nguyễn Văn Quản Trị"
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Email Quản trị viên <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="admin@doanhnghiep.com"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Mật khẩu Khởi tạo
                        </label>
                        <input
                          type="password"
                          placeholder="Password123!"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Mặc định: <code className="font-mono text-slate-600">Password123!</code> (có thể đổi sau khi đăng nhập)
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsSlideOverOpen(false)}
                        className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs transition disabled:opacity-60 flex items-center justify-center gap-1.5"
                      >
                        {submitting ? 'Đang cấp phát...' : 'Cấp phát ngay'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
