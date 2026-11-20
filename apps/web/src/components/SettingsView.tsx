import React, { useState } from 'react';
import { Palette, Plus, Save, Sliders, Trash2 } from 'lucide-react';
import { api, ApiError } from '../api';
import type { CustomFieldDef, TenantSettings } from '../types';

interface Props {
  settings: TenantSettings;
  onSettingsUpdated: (updated: TenantSettings) => void;
}

export const SettingsView: React.FC<Props> = ({ settings, onSettingsUpdated }) => {
  const [form, setForm] = useState<TenantSettings>(() => structuredClone(settings));
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
        text: 'Đã lưu cấu hình 3 lớp, xóa Redis L2 & phát Pub/Sub đồng bộ L1 Caffeine!',
      });
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof ApiError ? err.message : 'Lỗi khi lưu cấu hình',
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
    <form onSubmit={handleSave} className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">Cài đặt Tùy biến 3 Lớp (K4)</h2>
            <p className="text-xs text-slate-500">
              Áp dụng toàn cục cho tổ chức (UC03 & UC04) — lưu vào <code>tenants.settings</code> (JSONB)
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg flex items-center gap-2 hover:opacity-90 disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm border ${
            message.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Layer 1: Branding & Display */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
          <Palette className="w-4 h-4 text-primary" /> Lớp 1: Nhận diện Thương hiệu & Hiển thị
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Chữ viết tắt Logo (Logo Text)</label>
            <input
              type="text"
              value={form.theme.logoText ?? ''}
              onChange={(e) => setForm({ ...form, theme: { ...form.theme, logoText: e.target.value } })}
              placeholder="VD: ACME"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Khẩu hiệu (Tagline)</label>
            <input
              type="text"
              value={form.theme.tagline ?? ''}
              onChange={(e) => setForm({ ...form, theme: { ...form.theme, tagline: e.target.value } })}
              placeholder="VD: Phát triển phần mềm chuẩn mực"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Màu chủ đạo (Primary)</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.theme.primary}
                onChange={(e) => setForm({ ...form, theme: { ...form.theme, primary: e.target.value } })}
                className="h-9 w-12 rounded border border-slate-300 cursor-pointer"
              />
              <input
                type="text"
                value={form.theme.primary}
                onChange={(e) => setForm({ ...form, theme: { ...form.theme, primary: e.target.value } })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-mono flex-1"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Màu nhấn (Accent)</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.theme.accent}
                onChange={(e) => setForm({ ...form, theme: { ...form.theme, accent: e.target.value } })}
                className="h-9 w-12 rounded border border-slate-300 cursor-pointer"
              />
              <input
                type="text"
                value={form.theme.accent}
                onChange={(e) => setForm({ ...form, theme: { ...form.theme, accent: e.target.value } })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-mono flex-1"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Chế độ hiển thị thẻ</label>
            <select
              value={form.cardDisplayMode}
              onChange={(e) => setForm({ ...form, cardDisplayMode: e.target.value as 'FULL' | 'COMPACT' })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="FULL">FULL (Đầy đủ mô tả & trường mở rộng)</option>
              <option value="COMPACT">COMPACT (Thu gọn)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Layer 2: Workflow & WIP Policy */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-semibold text-slate-800 text-sm">Lớp 2: Quy trình Cột mặc định & Luật WIP</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Chế độ cưỡng chế WIP</label>
            <select
              value={form.wipMode}
              onChange={(e) => setForm({ ...form, wipMode: e.target.value as 'STRICT' | 'WARN' | 'OFF' })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="STRICT">STRICT (Chặn cứng HTTP 422 khi vượt ngưỡng)</option>
              <option value="WARN">WARN (Cho phép lưu, bật cảnh báo vàng)</option>
              <option value="OFF">OFF (Tắt kiểm soát WIP)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ngưỡng WIP mặc định khi tạo bảng mới</label>
            <input
              type="number"
              min={1}
              value={form.defaultWipLimit ?? ''}
              onChange={(e) =>
                setForm({ ...form, defaultWipLimit: e.target.value ? Number(e.target.value) : null })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="Để trống = không giới hạn"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Danh sách cột mặc định</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.defaultColumns.map((col, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium"
              >
                {col}
                <button
                  type="button"
                  onClick={() => removeDefaultColumn(idx)}
                  className="text-slate-400 hover:text-red-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 max-w-sm">
            <input
              type="text"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="Tên cột mới..."
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm flex-1"
            />
            <button
              type="button"
              onClick={addDefaultColumn}
              className="px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-700"
            >
              Thêm cột
            </button>
          </div>
        </div>
      </div>

      {/* Layer 3: Custom Fields Schema */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm">Lớp 3: Trường Dữ liệu Mở rộng (JSONB Schema)</h3>
          <button
            type="button"
            onClick={addCustomField}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium hover:bg-slate-50 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm trường
          </button>
        </div>

        <div className="space-y-2.5">
          {form.customFields.map((cf, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-lg">
              <input
                type="text"
                placeholder="key (vd: story_points)"
                value={cf.key}
                onChange={(e) => updateCustomField(idx, { key: e.target.value })}
                className="md:col-span-3 px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono bg-white"
              />
              <input
                type="text"
                placeholder="Tên hiển thị"
                value={cf.label}
                onChange={(e) => updateCustomField(idx, { label: e.target.value })}
                className="md:col-span-4 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
              />
              <select
                value={cf.type}
                onChange={(e) =>
                  updateCustomField(idx, { type: e.target.value as 'TEXT' | 'NUMBER' | 'SELECT' | 'DATE' })
                }
                className="md:col-span-2 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
              >
                <option value="TEXT">TEXT</option>
                <option value="NUMBER">NUMBER</option>
                <option value="SELECT">SELECT</option>
                <option value="DATE">DATE</option>
              </select>
              {cf.type === 'SELECT' && (
                <input
                  type="text"
                  placeholder="Options cách nhau dấu phẩy (Low,Medium,High)"
                  value={(cf.options ?? []).join(',')}
                  onChange={(e) =>
                    updateCustomField(idx, {
                      options: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="md:col-span-12 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
              )}
              <label className="md:col-span-2 flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cf.required}
                  onChange={(e) => updateCustomField(idx, { required: e.target.checked })}
                />
                Bắt buộc
              </label>
              <button
                type="button"
                onClick={() => removeCustomField(idx)}
                className="md:col-span-1 text-red-500 hover:text-red-700 flex justify-end"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {form.customFields.length === 0 && (
            <p className="text-xs text-slate-400 italic">Chưa có trường mở rộng nào.</p>
          )}
        </div>
      </div>
    </form>
  );
};
