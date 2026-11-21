import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Layers,
  Palette,
  Plus,
  Save,
  ShieldAlert,
  Sliders,
  Sparkles,
  Trash2,
  User,
  Zap,
} from 'lucide-react';
import { api, ApiError } from '../api';
import type { CustomFieldDef, TenantSettings } from '../types';

interface Props {
  settings: TenantSettings;
  onSettingsUpdated: (updated: TenantSettings) => void;
}

type SettingsTab = 'branding' | 'workflow' | 'fields';

export const SettingsView: React.FC<Props> = ({ settings, onSettingsUpdated }) => {
  const [form, setForm] = useState<TenantSettings>(() => structuredClone(settings));
  const [activeTab, setActiveTab] = useState<SettingsTab>('branding');
  const [newColName, setNewColName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.updateSettings(form);
      onSettingsUpdated(updated);
      setMessage({
        type: 'ok',
        text: 'Đã lưu cấu hình doanh nghiệp thành công! Toàn bộ thay đổi đã được áp dụng tức thì trên toàn hệ thống.',
      });
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof ApiError ? err.message : 'Lỗi khi lưu cấu hình doanh nghiệp',
      });
    } finally {
      setSaving(false);
    }
  };

  const addDefaultColumn = () => {
    if (!newColName.trim()) return;
    setForm({ ...form, defaultColumns: [...form.defaultColumns, newColName.trim()] });
    setNewColName('');
  };

  const removeDefaultColumn = (idx: number) => {
    setForm({ ...form, defaultColumns: form.defaultColumns.filter((_, i) => i !== idx) });
  };

  const addCustomField = () => {
    const next: CustomFieldDef = {
      key: `field_${form.customFields.length + 1}`,
      label: 'Trường mới',
      type: 'TEXT',
      required: false,
      options: [],
    };
    setForm({ ...form, customFields: [...form.customFields, next] });
  };

  const updateCustomField = (idx: number, patch: Partial<CustomFieldDef>) => {
    const copy = [...form.customFields];
    copy[idx] = { ...copy[idx], ...patch };
    setForm({ ...form, customFields: copy });
  };

  const removeCustomField = (idx: number) => {
    setForm({ ...form, customFields: form.customFields.filter((_, i) => i !== idx) });
  };

  return (
    <form onSubmit={handleSave} className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 font-sans">
      {/* Page Title & Save Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <Sliders className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Cài đặt Doanh nghiệp
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tùy chỉnh nhận diện thương hiệu, quy tắc giới hạn công việc và các trường dữ liệu đặc thù
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition hover:opacity-95 disabled:opacity-60 cursor-pointer"
        >
          <Save className="w-4 h-4 text-white" />
          <span>{saving ? 'Đang lưu thay đổi...' : 'Lưu Thay đổi'}</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border flex items-center gap-2.5 shadow-2xs ${
            message.type === 'ok'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {message.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* 3 Tabs Header: Commercial SaaS Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'branding'
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
          }`}
        >
          <Palette className="w-4 h-4 text-indigo-500" />
          <span>Thương hiệu &amp; Hiển thị</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('workflow')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'workflow'
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-500" />
          <span>Quy tắc Bảng công việc</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fields')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'fields'
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-500" />
          <span>Trường dữ liệu Tùy chỉnh</span>
        </button>
      </div>

      {/* Tab 1: Brand Identity & Card Display Mode + Live Preview */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Palette className="w-4 h-4 text-indigo-600" /> Nhận diện Thương hiệu Doanh nghiệp
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên viết tắt / Chữ hiển thị Logo
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={form.theme.logoText ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, theme: { ...form.theme, logoText: e.target.value } })
                  }
                  placeholder="vd: ACME, LOTUS"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Khẩu hiệu Doanh nghiệp (Tagline)
                </label>
                <input
                  type="text"
                  value={form.theme.tagline ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, theme: { ...form.theme, tagline: e.target.value } })
                  }
                  placeholder="vd: Phát triển phần mềm chuẩn mực"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Màu chủ đạo thương hiệu
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.theme.primary}
                    onChange={(e) =>
                      setForm({ ...form, theme: { ...form.theme, primary: e.target.value } })
                    }
                    className="h-9 w-12 rounded-lg border border-slate-300 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={form.theme.primary}
                    onChange={(e) =>
                      setForm({ ...form, theme: { ...form.theme, primary: e.target.value } })
                    }
                    className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono flex-1 uppercase font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Màu sắc nhấn mạnh
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.theme.accent}
                    onChange={(e) =>
                      setForm({ ...form, theme: { ...form.theme, accent: e.target.value } })
                    }
                    className="h-9 w-12 rounded-lg border border-slate-300 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={form.theme.accent}
                    onChange={(e) =>
                      setForm({ ...form, theme: { ...form.theme, accent: e.target.value } })
                    }
                    className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono flex-1 uppercase font-semibold"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kiểu hiển thị thẻ trên Bảng công việc
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, cardDisplayMode: 'FULL' })}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    form.cardDisplayMode === 'FULL'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">Hiển thị Đầy đủ</div>
                  <div className="text-[11px] text-slate-500 font-normal mt-0.5 leading-relaxed">
                    Hiện mô tả ngắn 2 dòng, người phụ trách và toàn bộ thuộc tính mở rộng.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setForm({ ...form, cardDisplayMode: 'COMPACT' })}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    form.cardDisplayMode === 'COMPACT'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">Hiển thị Thu gọn</div>
                  <div className="text-[11px] text-slate-500 font-normal mt-0.5 leading-relaxed">
                    Chỉ hiển thị tiêu đề và người phụ trách, tối ưu mật độ nhiều đầu việc cùng lúc.
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Live Preview Box with Realistic Business Data */}
          <div className="lg:col-span-5 bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Xem trước Trực tiếp
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                LIVE DEMO
              </span>
            </div>

            {/* Simulated Header Brand Badge */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg text-white font-black text-xs flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: form.theme.primary }}
                >
                  {form.theme.logoText || 'LOGO'}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    {form.theme.logoText || 'DOANH NGHIỆP'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {form.theme.tagline || 'Nền tảng vận hành quy trình'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/20"
                  style={{ backgroundColor: form.theme.primary }}
                  title="Màu chủ đạo"
                />
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/20"
                  style={{ backgroundColor: form.theme.accent }}
                  title="Màu nhấn"
                />
              </div>
            </div>

            {/* Simulated Realistic Kanban Card */}
            <div className="bg-white text-slate-900 p-4 rounded-xl border border-slate-200 shadow-md space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-xs text-slate-900 leading-snug">
                  Thiết kế kiến trúc thanh toán và phân quyền đa khách thuê
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                  style={{ backgroundColor: form.theme.primary }}
                >
                  Đang làm
                </span>
              </div>

              {form.cardDisplayMode === 'FULL' && (
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  Tối ưu hóa quy trình xử lý giao dịch tự động thời gian thực và đảm bảo cách ly dữ liệu độc lập.
                </p>
              )}

              {form.cardDisplayMode === 'FULL' && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    8 điểm
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    Ưu tiên cao
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    PR #142
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                    TM
                  </div>
                  <span className="font-medium text-slate-700">Trần Mai</span>
                </div>
                <span className="text-slate-400 font-mono">Hôm nay</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed text-center">
              Nhận diện thương hiệu và kiểu hiển thị sẽ lập tức áp dụng cho toàn bộ thành viên trong tổ chức sau khi bấm "Lưu Thay đổi".
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Workflow Rules & WIP Limits */}
      {activeTab === 'workflow' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" /> Quy tắc Giới hạn Công việc Trên Cột (WIP)
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Kiểm soát số lượng công việc đang xử lý đồng thời để tránh tắc nghẽn quy trình
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              Chế độ áp dụng giới hạn
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  mode: 'STRICT',
                  title: 'Chặn khi vượt mức (STRICT)',
                  desc: 'Hệ thống từ chối cho phép kéo thêm công việc khi cột đã đạt hạn mức tối đa. Thẻ tự động hoàn trả về vị trí cũ.',
                  icon: ShieldAlert,
                  border: 'border-rose-400 bg-rose-50/50 text-rose-950',
                },
                {
                  mode: 'WARN',
                  title: 'Chỉ cảnh báo (WARN)',
                  desc: 'Cho phép di chuyển thẻ thành công nhưng hiển thị viền cảnh báo màu hổ phách để nhắc nhở người dùng.',
                  icon: AlertTriangle,
                  border: 'border-amber-400 bg-amber-50/50 text-amber-950',
                },
                {
                  mode: 'OFF',
                  title: 'Không giới hạn (OFF)',
                  desc: 'Bỏ qua kiểm tra số lượng công việc trên cột. Phù hợp giai đoạn tự do hoặc khi không áp dụng chuẩn Kanban.',
                  icon: Sliders,
                  border: 'border-slate-300 bg-slate-50 text-slate-900',
                },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = form.wipMode === item.mode;
                return (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => setForm({ ...form, wipMode: item.mode as 'STRICT' | 'WARN' | 'OFF' })}
                    className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? `${item.border} ring-2 ring-indigo-500/40 shadow-xs`
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs">{item.title}</span>
                      <Icon className="w-4 h-4 opacity-75" />
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{item.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số lượng công việc tối đa mặc định trên mỗi cột
              </label>
              <input
                type="number"
                min={1}
                placeholder="Để trống = Không giới hạn"
                value={form.defaultWipLimit ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    defaultWipLimit: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Tự động áp dụng cho các cột trung gian khi khởi tạo một bảng công việc mới.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Danh sách cột quy trình mặc định
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.defaultColumns.map((col, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200"
                  >
                    <span>{col}</span>
                    <button
                      type="button"
                      onClick={() => removeDefaultColumn(idx)}
                      className="text-slate-400 hover:text-rose-600 font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập tên cột mới..."
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs flex-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={addDefaultColumn}
                  className="px-3.5 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition cursor-pointer"
                >
                  Thêm cột
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Custom Fields */}
      {activeTab === 'fields' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" /> Trường dữ liệu Tùy chỉnh cho Thẻ công việc
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Định nghĩa các trường thông tin bổ sung trên mỗi thẻ công việc phù hợp với đặc thù vận hành của công ty
              </p>
            </div>
            <button
              type="button"
              onClick={addCustomField}
              className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm trường mới
            </button>
          </div>

          <div className="space-y-3">
            {form.customFields.map((cf, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 grid grid-cols-1 md:grid-cols-12 gap-3 items-center transition"
              >
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Tên hiển thị (Nhãn trường)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="vd: Điểm nỗ lực, Kênh phát hành"
                    value={cf.label}
                    onChange={(e) => updateCustomField(idx, { label: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Mã thuộc tính (Key)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="vd: story_points"
                    value={cf.key}
                    onChange={(e) => updateCustomField(idx, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white font-semibold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Kiểu dữ liệu
                  </label>
                  <select
                    value={cf.type}
                    onChange={(e) =>
                      updateCustomField(idx, {
                        type: e.target.value as 'TEXT' | 'NUMBER' | 'SELECT' | 'DATE',
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-semibold"
                  >
                    <option value="TEXT">Văn bản (TEXT)</option>
                    <option value="NUMBER">Số liệu (NUMBER)</option>
                    <option value="SELECT">Danh sách chọn (SELECT)</option>
                    <option value="DATE">Ngày tháng (DATE)</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex items-center gap-1.5 pt-2 md:pt-4">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cf.required}
                      onChange={(e) => updateCustomField(idx, { required: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Bắt buộc nhập</span>
                  </label>
                </div>

                <div className="md:col-span-1 flex justify-end pt-2 md:pt-4">
                  <button
                    type="button"
                    onClick={() => removeCustomField(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                    title="Xóa trường này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {cf.type === 'SELECT' && (
                  <div className="md:col-span-12 pt-2 border-t border-slate-200">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      Các tùy chọn danh sách (nhập cách nhau bằng dấu phẩy)
                    </label>
                    <input
                      type="text"
                      placeholder="vd: Thấp, Trung bình, Cao, Khẩn cấp"
                      value={(cf.options ?? []).join(', ')}
                      onChange={(e) =>
                        updateCustomField(idx, {
                          options: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                    />
                  </div>
                )}
              </div>
            ))}

            {form.customFields.length === 0 && (
              <div className="p-8 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400 italic">
                Chưa có trường dữ liệu tùy chỉnh nào. Bấm "Thêm trường mới" để mở rộng thông tin trên thẻ công việc.
              </div>
            )}
          </div>
        </div>
      )}
    </form>
  );
};
