import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Check,
  Copy,
  FolderKanban,
  Key,
  Layers,
  Lock,
  Mail,
  Palette,
  Rocket,
  Search,
  Shield,
  Sparkles,
  Ticket,
  User,
  Users,
  Zap,
  X,
  ChevronRight,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { api, ApiError } from '../api';
import { AutoProductShowcase } from './AutoProductShowcase';
import { getTenantHost } from '../utils/domain';
import type { DiscoveredTenant } from '../types';

interface RecentTenant {
  slug: string;
  name: string;
  tier: string;
  primaryColor?: string;
  lastAccessed: number;
}

const RECENT_KEY = 'tenantflow_recent_tenants';

function getStoredRecentTenants(): RecentTenant[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentTenant(tenant: { slug: string; name: string; tier: string; primaryColor?: string }) {
  try {
    const list = getStoredRecentTenants().filter((t) => t.slug !== tenant.slug);
    const updated: RecentTenant[] = [
      {
        slug: tenant.slug,
        name: tenant.name,
        tier: tenant.tier,
        primaryColor: tenant.primaryColor,
        lastAccessed: Date.now(),
      },
      ...list,
    ].slice(0, 4);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

export const LandingOnboardingView: React.FC = () => {
  // Modal states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);

  // Discover tenant by email state
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [discoveredTenants, setDiscoveredTenants] = useState<DiscoveredTenant[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentTenants, setRecentTenants] = useState<RecentTenant[]>([]);

  // Onboarding form state
  const [selectedTier, setSelectedTier] = useState<'FREE' | 'PRO' | 'ENTERPRISE'>('PRO');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('Password123!');
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [createdTenantData, setCreatedTenantData] = useState<{
    slug: string;
    name: string;
    inviteCode: string;
  } | null>(null);

  // Copy states
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const port = window.location.port ? `:${window.location.port}` : '';
  const proto = window.location.protocol;

  useEffect(() => {
    setRecentTenants(getStoredRecentTenants());
  }, [isLoginModalOpen]);

  const handleOpenLoginModal = () => {
    setSearchError(null);
    setDiscoveredTenants(null);
    setHasSearched(false);
    setIsLoginModalOpen(true);
  };

  const handleOpenOnboardingModal = (tier: 'FREE' | 'PRO' | 'ENTERPRISE' = 'PRO') => {
    setSelectedTier(tier);
    setOnboardingStep(1);
    setOnboardingError(null);
    setCreatedTenantData(null);
    setIsOnboardingModalOpen(true);
  };

  // Discover tenant
  const handleDiscover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);
    try {
      const results = await api.discoverTenant(searchEmail.trim());
      setDiscoveredTenants(results);
    } catch (err) {
      setSearchError(err instanceof ApiError ? err.message : 'Lỗi kết nối khi tìm tổ chức');
      setDiscoveredTenants([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleNavigateToTenant = (t: { slug: string; name: string; tier: string; primaryColor?: string }) => {
    saveRecentTenant(t);
    const targetHost = getTenantHost(t.slug);
    const emailParam = searchEmail.trim() ? `email=${encodeURIComponent(searchEmail.trim())}&` : '';
    // Security: forceLogin=1 ensures any existing stale session is purged and password entry is required
    window.location.href = `${proto}//${targetHost}/?${emailParam}forceLogin=1`;
  };

  // Submit onboarding
  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setOnboardingError(null);
    try {
      const created = await api.createTenant({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        tier: selectedTier,
        industryTemplate: 'GENERAL',
        adminEmail: adminEmail.trim(),
        adminName: adminName.trim(),
        adminPassword,
      });

      const effectiveInvite =
        (slug.trim().toLowerCase().replace(/^t-/, '') + '-2026').toUpperCase();

      saveRecentTenant({
        slug: created.slug,
        name: created.name,
        tier: created.tier,
      });

      setCreatedTenantData({
        slug: created.slug,
        name: created.name,
        inviteCode: effectiveInvite,
      });
      setOnboardingStep(2); // Step 2 is Handover Screen
    } catch (err) {
      setOnboardingError(err instanceof ApiError ? err.message : 'Không thể khởi tạo tổ chức mới');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-600 selection:text-white flex flex-col">
      {/* 1. Clean Sticky Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-sm shadow-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                TenantFlow
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 font-mono">
                  SaaS
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#tinh-nang" className="hover:text-blue-600 transition">
              Tính năng
            </a>
            <a href="#bang-gia" className="hover:text-blue-600 transition">
              Bảng gói dịch vụ
            </a>
            <a href="#cach-hoat-dong" className="hover:text-blue-600 transition">
              Cách hoạt động
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenLoginModal}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Đăng nhập</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenOnboardingModal('PRO')}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <span>Đăng ký miễn phí</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* 2. Hero Section */}
        <section className="pt-12 pb-16 px-4 sm:px-6 max-w-6xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Nền tảng Vận hành Đa Doanh nghiệp Chuẩn Thương mại</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight max-w-3xl mx-auto">
            Vận hành công việc theo bản sắc riêng của doanh nghiệp bạn
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Mỗi doanh nghiệp sở hữu một hệ thống độc lập với địa chỉ truy cập riêng biệt, tự do tùy biến giao diện, quy tắc làm việc và đảm bảo dữ liệu được cô lập an toàn tuyệt đối.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleOpenOnboardingModal('PRO')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              <span>Khởi tạo cho Doanh nghiệp</span>
            </button>

            <button
              type="button"
              onClick={handleOpenLoginModal}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-sm shadow-2xs transition flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4 text-slate-400" />
              <span>Đăng nhập vào Tổ chức</span>
            </button>
          </div>

          {/* 3 Business Benefit Cards (Ngôn ngữ kinh doanh) */}
          <div id="tinh-nang" className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto text-left">
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5 hover:border-blue-300 transition">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                <FolderKanban className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Quản lý tiến độ trực quan</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Bảng Kanban kéo – thả mượt mà, tự kiểm soát giới hạn đầu việc chống quá tải.
              </p>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5 hover:border-blue-300 transition">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                <Palette className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">May đo theo bản sắc riêng</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Tên miền truy cập riêng, tự đổi màu thương hiệu, bố cục thẻ và thêm trường thông tin đặc thù.
              </p>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5 hover:border-blue-300 transition">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1">
                <Shield className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Bảo mật & Phân quyền độc lập</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Dữ liệu mỗi doanh nghiệp tách biệt hoàn toàn, mời nhân sự gia nhập nhanh bằng mã mời.
              </p>
            </div>
          </div>

          {/* Automatic Animated Product Showcase (10-second Cycle) */}
          <div className="pt-6">
            <AutoProductShowcase />
          </div>
        </section>

        {/* 3. Interactive 3-Column Pricing Grid (Ngang hàng, Chuẩn Pool Level 3) */}
        <section id="bang-gia" className="py-16 px-4 sm:px-6 bg-white border-y border-slate-200/80">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Bảng gói dịch vụ minh bạch &amp; linh hoạt
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Lựa chọn gói cước tối ưu theo quy mô tổ chức của bạn. Hệ thống tự động áp đặt giới hạn tài nguyên và lưu lượng theo thời gian thực.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto">
              {/* Plan 1: FREE */}
              <div
                onClick={() => handleOpenOnboardingModal('FREE')}
                className="group cursor-pointer transition-all duration-200 border border-slate-200 bg-white hover:-translate-y-1.5 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 p-6 rounded-2xl flex flex-col justify-between space-y-6 h-full"
              >
                <div className="space-y-4">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold font-mono">
                      FREE TIER
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-2">Gói Miễn phí</h3>
                    <p className="text-xs text-slate-500 mt-1">Trải nghiệm toàn diện nền tảng không giới hạn thời gian.</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Tối đa <strong>10 thành viên</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Hạn mức <strong>30 req/phút</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Tên miền phụ Subdomain riêng</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Cô lập dữ liệu độc lập</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Đầy đủ tùy biến 3 lớp (giao diện, quy trình, trường mở rộng)</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white text-xs font-bold transition-colors shadow-2xs"
                >
                  Chọn gói Miễn phí
                </button>
              </div>

              {/* Plan 2: PRO (Khuyên dùng) */}
              <div
                onClick={() => handleOpenOnboardingModal('PRO')}
                className="group cursor-pointer transition-all duration-200 border-2 border-blue-600 bg-blue-50/20 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-blue-500/15 p-6 rounded-2xl flex flex-col justify-between space-y-6 h-full relative"
              >
                <div className="absolute -top-3 right-5">
                  <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                    Khuyên dùng
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold font-mono">
                      PROFESSIONAL
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-2">Gói Chuyên nghiệp</h3>
                    <p className="text-xs text-slate-500 mt-1">Chịu tải cao cho doanh nghiệp vận hành nhiều dự án đồng thời.</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Tối đa <strong>50 thành viên</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Hạn mức <strong>120 req/phút</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Tên miền phụ Subdomain riêng</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Cô lập dữ liệu độc lập</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Đầy đủ tùy biến 3 lớp (giao diện, quy trình, trường mở rộng)</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl bg-blue-600 text-white group-hover:bg-blue-700 text-xs font-bold transition-colors shadow-xs"
                >
                  Chọn gói Chuyên nghiệp
                </button>
              </div>

              {/* Plan 3: ENTERPRISE */}
              <div
                onClick={() => handleOpenOnboardingModal('ENTERPRISE')}
                className="group cursor-pointer transition-all duration-200 border border-slate-200 bg-white hover:-translate-y-1.5 hover:border-purple-500 hover:shadow-xl hover:shadow-purple-500/10 p-6 rounded-2xl flex flex-col justify-between space-y-6 h-full"
              >
                <div className="space-y-4">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold font-mono">
                      ENTERPRISE
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-2">Gói Doanh nghiệp lớn</h3>
                    <p className="text-xs text-slate-500 mt-1">Quy mô tổ chức lớn, lưu lượng cao, ưu tiên thông lượng tối đa khi cao điểm.</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Tối đa <strong>500 thành viên</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Băng thông <strong>600 req/phút</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Ưu tiên thông lượng tối đa khi cao điểm</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Tên miền phụ Subdomain riêng</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Cô lập dữ liệu độc lập</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Đầy đủ tùy biến 3 lớp (giao diện, quy trình, trường mở rộng)</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 group-hover:bg-purple-600 group-hover:border-purple-600 group-hover:text-white text-xs font-bold transition-colors shadow-2xs"
                >
                  Chọn gói Enterprise
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Cách hoạt động (How it works) */}
        <section id="cach-hoat-dong" className="py-16 px-4 sm:px-6 max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Khởi đầu nhanh chóng chỉ với 3 bước
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Không cần cài đặt phức tạp. Mọi hệ thống được cấp phát tức thì trong vòng 30 giây.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm">
                1
              </div>
              <h3 className="font-bold text-sm text-slate-900">Đăng ký Tên miền phụ riêng</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Đăng ký tên tổ chức để nhận ngay subdomain định danh độc lập và bảng Kanban chuẩn hóa sẵn sàng vận hành.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm">
                2
              </div>
              <h3 className="font-bold text-sm text-slate-900">Chia sẻ Mã mời cho Nhân sự</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cung cấp mã mời hoặc đường dẫn một chạm để các thành viên tự đăng ký tài khoản tham gia mà không mất thời gian cấp thủ công.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm">
                3
              </div>
              <h3 className="font-bold text-sm text-slate-900">Tùy biến & Vận hành Hiệu quả</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cá nhân hóa màu sắc thương hiệu, thiết lập giới hạn đầu việc và thêm các trường thông tin mở rộng theo nhu cầu thực tế.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* 5. Minimal Clean Footer (Xóa sạch link quản trị & demo lộ liễu) */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 sm:px-6 mt-auto">
        <div className="max-w-6xl mx-auto flex items-center justify-center text-xs text-slate-500 text-center">
          <span>TenantFlow SaaS Platform © 2026. Bảo lưu mọi quyền.</span>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* MODAL 1: Đăng nhập vào Tổ chức (Discover Tenant by Email) */}
      {/* ========================================================================= */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 relative">
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                <span>Đăng nhập vào Tổ chức</span>
              </h3>
              <p className="text-xs text-slate-500">
                Nhập email của bạn để tìm tổ chức hoặc chọn mục đã truy cập gần đây.
              </p>
            </div>

            {/* Recent Tenants Section (if any in localStorage) */}
            {recentTenants.length > 0 && !hasSearched && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Truy cập gần đây
                </span>
                <div className="space-y-1.5">
                  {recentTenants.map((t) => (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => handleNavigateToTenant(t)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0"
                          style={{ backgroundColor: t.primaryColor || '#2563eb' }}
                        >
                          {t.slug.replace(/^t-/, '').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600">{t.name}</div>
                          <div className="text-[11px] font-mono text-slate-500">{getTenantHost(t.slug)}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Email Search Form */}
            <form onSubmit={handleDiscover} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email công việc</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="vd: tenban@congty.vn"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSearching || !searchEmail.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2"
              >
                {isSearching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang tìm kiếm...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Tìm tổ chức của tôi</span>
                  </>
                )}
              </button>
            </form>

            {/* Search Results Display */}
            {hasSearched && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                {searchError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {searchError}
                  </div>
                )}

                {discoveredTenants && discoveredTenants.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Tìm thấy {discoveredTenants.length} tổ chức liên kết:
                    </span>
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {discoveredTenants.map((t) => (
                        <div
                          key={t.slug}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400 transition flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-8 h-8 rounded-lg text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs"
                              style={{ backgroundColor: t.primaryColor || '#2563eb' }}
                            >
                              {t.logoText || t.slug.replace(/^t-/, '').slice(0, 3).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">{t.name}</div>
                              <div className="text-[11px] font-mono text-slate-500 truncate">
                                {getTenantHost(t.slug)}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleNavigateToTenant(t)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 transition shrink-0 shadow-2xs"
                          >
                            <span>Tiếp tục đăng nhập →</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  hasSearched && !isSearching && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-3">
                      <div className="flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          Email <strong>{searchEmail}</strong> chưa gắn với tổ chức nào trên hệ thống.
                          Bạn có thể đăng ký mở tổ chức mới hoặc liên hệ quản trị viên để nhận Mã mời gia nhập.
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsLoginModalOpen(false);
                            handleOpenOnboardingModal('PRO');
                          }}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition"
                        >
                          Đăng ký mở tổ chức mới →
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setHasSearched(false);
                            setSearchEmail('');
                          }}
                          className="w-full py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
                        >
                          Nhập email khác
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Đăng ký Hệ thống cho Doanh nghiệp (Tinh gọn + Màn hình Bàn giao) */}
      {/* ========================================================================= */}
      {isOnboardingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 relative">
            <button
              type="button"
              onClick={() => setIsOnboardingModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-blue-600" />
                <span>Đăng ký Hệ thống cho Doanh nghiệp</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {onboardingStep === 1
                  ? 'Cấp phát tên miền riêng và khởi tạo tài khoản quản trị'
                  : 'Hệ thống đã được khởi tạo thành công và sẵn sàng vận hành'}
              </p>
            </div>

            {onboardingError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {onboardingError}
              </div>
            )}

            {/* Step 1: Company Info & Admin Credentials */}
            {onboardingStep === 1 && (
              <form onSubmit={handleOnboardingSubmit} className="space-y-4">
                {/* 3 Selectable Tier Pills */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Gói cước dịch vụ</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['FREE', 'PRO', 'ENTERPRISE'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTier(t)}
                        className={`p-2 rounded-xl border text-center transition ${
                          selectedTier === t
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-2xs ring-1 ring-blue-600'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs">{t}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {t === 'FREE' ? '10 user' : t === 'PRO' ? '50 user' : '500 user'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tên Doanh nghiệp / Tổ chức *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Nova Solution"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!slug) {
                          setSlug('t-' + e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8));
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tên miền Subdomain riêng *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: nova"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                {/* Subdomain Preview */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Địa chỉ truy cập dự kiến:</span>
                  <span className="font-mono text-blue-600 font-semibold text-[11px]">
                    {slug ? getTenantHost(slug) : getTenantHost('t-yourbrand')}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200/80">
                  <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Thông tin Quản trị viên Tổ chức</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Họ và tên Quản trị viên *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Nguyễn Tuấn Anh"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Đăng nhập *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="admin@yourcompany.vn"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mật khẩu Khởi tạo *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Mật khẩu ít nhất 8 ký tự"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div className="text-[11px] text-slate-500">
                    Bảng Kanban chuẩn hóa sẽ được tự động kích hoạt
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !name.trim() || !slug.trim() || !adminEmail.trim()}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang khởi tạo hệ thống...</span>
                      </>
                    ) : (
                      <>
                        <span>Hoàn tất & Khởi tạo Hệ thống</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Handover Screen */}
            {onboardingStep === 2 && createdTenantData && (
              <div className="space-y-5 text-center py-2 animate-in fade-in duration-300">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    Hệ thống của {createdTenantData.name} đã sẵn sàng!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Toàn bộ cấu trúc bảo mật và phân quyền quản trị đã được thiết lập thành công.
                  </p>
                </div>

                {/* Tenant Access Link Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Đường dẫn riêng của doanh nghiệp:</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${proto}//${getTenantHost(createdTenantData.slug)}`);
                        setCopiedSlug(true);
                        setTimeout(() => setCopiedSlug(false), 2000);
                      }}
                      className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      {copiedSlug ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSlug ? 'Đã sao chép' : 'Sao chép link'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-xs text-blue-600 font-semibold truncate">
                    {proto}//{getTenantHost(createdTenantData.slug)}
                  </div>
                </div>

                {/* Employee Onboarding Invite Code Card */}
                <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 text-left space-y-3">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-blue-950">Mã mời nhân sự tham gia tự phục vụ</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-white p-2.5 rounded-lg border border-blue-200 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Mã mời</div>
                        <div className="text-sm font-black font-mono text-blue-700">
                          {createdTenantData.inviteCode}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(createdTenantData.inviteCode);
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition"
                      >
                        {copiedCode ? 'Đã chép' : 'Chép mã'}
                      </button>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-blue-200 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Liên kết một chạm</div>
                        <div className="text-xs font-mono text-slate-600 truncate max-w-[130px]">
                          ?action=join&code=...
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const fullLink = `${proto}//${getTenantHost(createdTenantData.slug)}?action=join&code=${createdTenantData.inviteCode}`;
                          navigator.clipboard.writeText(fullLink);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition"
                      >
                        {copiedLink ? 'Đã chép' : 'Chép link gửi'}
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-blue-800/80">
                    Gửi thông tin này cho nhân viên trong công ty để họ tự tạo tài khoản tham gia với vai trò MEMBER.
                  </p>
                </div>

                {/* Primary Action Button to Enter App */}
                <div className="pt-2">
                  <a
                    href={`${proto}//${getTenantHost(createdTenantData.slug)}/?forceLogin=1`}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2"
                  >
                    <span>Vào hệ thống ngay</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
