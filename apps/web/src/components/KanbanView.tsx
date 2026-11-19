import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Edit3,
  Filter,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { api, ApiError } from '../api';
import type { Board, BoardColumn, Card, TenantMember, TenantSettings } from '../types';

interface Props {
  isAdmin: boolean;
  settings: TenantSettings;
}

export const KanbanView: React.FC<Props> = ({ isAdmin, settings }) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [members, setMembers] = useState<TenantMember[]>([]);

  // Filters (UC10)
  const [searchQ, setSearchQ] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterCfKey, setFilterCfKey] = useState('');
  const [filterCfValue, setFilterCfValue] = useState('');

  // Alerts
  const [toast, setToast] = useState<{ type: 'error' | 'warn' | 'ok'; text: string } | null>(null);
  const [warnColumns, setWarnColumns] = useState<Record<string, boolean>>({});

  // Drag & Drop state
  const [draggingCard, setDraggingCard] = useState<Card | null>(null);

  // Card Modal (UC08)
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [cardColId, setCardColId] = useState('');
  const [cardTitle, setCardTitle] = useState('');
  const [cardDesc, setCardDesc] = useState('');
  const [cardAssignee, setCardAssignee] = useState('');
  const [cardCustomFields, setCardCustomFields] = useState<Record<string, string>>({});
  const [cardError, setCardError] = useState<string | null>(null);

  // Board / Column modals
  const [newBoardName, setNewBoardName] = useState('');
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [editingCol, setEditingCol] = useState<BoardColumn | null>(null);
  const [colNameInput, setColNameInput] = useState('');
  const [colWipInput, setColWipInput] = useState('');
  const [showNewCol, setShowNewCol] = useState(false);

  const loadBoards = async () => {
    const [bList, mList] = await Promise.all([api.listBoards(), api.listMembers()]);
    setBoards(bList);
    setMembers(mList);
    if (bList.length > 0 && !selectedBoardId) {
      setSelectedBoardId(bList[0].id);
    } else if (bList.length === 0) {
      setSelectedBoardId('');
      setColumns([]);
      setCards([]);
    }
  };

  const loadBoardDetail = async (boardId: string) => {
    if (!boardId) return;
    const data = await api.getBoardDetail(boardId, {
      q: searchQ || undefined,
      assigneeId: filterAssignee || undefined,
      cfKey: filterCfKey || undefined,
      cfValue: filterCfValue || undefined,
    });
    setColumns(data.columns);
    setCards(data.cards);
  };

  useEffect(() => {
    loadBoards().catch((err) => setToast({ type: 'error', text: err.message }));
  }, []);

  useEffect(() => {
    if (selectedBoardId) {
      loadBoardDetail(selectedBoardId).catch((err) => setToast({ type: 'error', text: err.message }));
    }
  }, [selectedBoardId]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBoardId) {
      loadBoardDetail(selectedBoardId).catch((err) => setToast({ type: 'error', text: err.message }));
    }
  };

  const handleClearFilter = () => {
    setSearchQ('');
    setFilterAssignee('');
    setFilterCfKey('');
    setFilterCfValue('');
    if (selectedBoardId) {
      api.getBoardDetail(selectedBoardId).then((data) => {
        setColumns(data.columns);
        setCards(data.cards);
      });
    }
  };

  const openCreateCard = (columnId: string) => {
    setEditingCard(null);
    setCardColId(columnId);
    setCardTitle('');
    setCardDesc('');
    setCardAssignee('');
    const initCf: Record<string, string> = {};
    settings.customFields.forEach((cf) => {
      initCf[cf.key] = '';
    });
    setCardCustomFields(initCf);
    setCardError(null);
    setCardModalOpen(true);
  };

  const openEditCard = (card: Card) => {
    setEditingCard(card);
    setCardColId(card.columnId);
    setCardTitle(card.title);
    setCardDesc(card.description ?? '');
    setCardAssignee(card.assigneeId ?? '');
    const initCf: Record<string, string> = {};
    settings.customFields.forEach((cf) => {
      const val = card.customFields?.[cf.key];
      initCf[cf.key] = val !== undefined && val !== null ? String(val) : '';
    });
    setCardCustomFields(initCf);
    setCardError(null);
    setCardModalOpen(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardError(null);
    const cfPayload: Record<string, unknown> = {};
    Object.entries(cardCustomFields).forEach(([k, v]) => {
      if (v !== '') cfPayload[k] = v;
    });

    try {
      if (editingCard) {
        await api.updateCard(editingCard.id, {
          title: cardTitle,
          description: cardDesc,
          assigneeId: cardAssignee || null,
          customFields: cfPayload,
        });
      } else {
        await api.createCard(selectedBoardId, {
          columnId: cardColId,
          title: cardTitle,
          description: cardDesc,
          assigneeId: cardAssignee || null,
          customFields: cfPayload,
        });
      }
      setCardModalOpen(false);
      await loadBoardDetail(selectedBoardId);
    } catch (err) {
      setCardError(err instanceof ApiError ? err.message : 'Lỗi khi lưu thẻ');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Xóa thẻ công việc này?')) return;
    try {
      await api.deleteCard(cardId);
      await loadBoardDetail(selectedBoardId);
    } catch (err) {
      setToast({ type: 'error', text: err instanceof ApiError ? err.message : 'Lỗi xóa thẻ' });
    }
  };

  const handleDropOnColumn = async (targetColumnId: string) => {
    if (!draggingCard) return;
    const card = draggingCard;
    setDraggingCard(null);

    if (card.columnId === targetColumnId) return;

    const targetCards = cards.filter((c) => c.columnId === targetColumnId);
    const previousCards = [...cards];

    // Optimistic UI move
    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, columnId: targetColumnId, position: targetCards.length } : c))
    );

    try {
      const res = await api.moveCard(card.id, {
        targetColumnId,
        targetPosition: targetCards.length,
        expectedVersion: card.version,
      });

      setCards((prev) => prev.map((c) => (c.id === card.id ? res.card : c)));

      if (res.wipWarning) {
        setWarnColumns((prev) => ({ ...prev, [targetColumnId]: true }));
        setToast({
          type: 'warn',
          text: `Cảnh báo WIP (WARN): Cột đã vượt ngưỡng (${targetCards.length + 1}/${res.wipLimit}) nhưng vẫn cho phép lưu.`,
        });
      } else {
        setToast(null);
      }
    } catch (err) {
      // Rollback UI on 422 STRICT or 409 Conflict
      setCards(previousCards);
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Không thể di chuyển thẻ',
      });
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    try {
      const created = await api.createBoard(newBoardName.trim());
      setNewBoardName('');
      setShowNewBoard(false);
      await loadBoards();
      setSelectedBoardId(created.id);
    } catch (err) {
      setToast({ type: 'error', text: err instanceof ApiError ? err.message : 'Lỗi tạo bảng' });
    }
  };

  const handleSaveColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    const wip = colWipInput.trim() ? Number(colWipInput) : null;
    try {
      if (editingCol) {
        await api.updateColumn(editingCol.id, { name: colNameInput, wipLimit: wip });
        setEditingCol(null);
      } else if (showNewCol) {
        await api.addColumn(selectedBoardId, { name: colNameInput, wipLimit: wip });
        setShowNewCol(false);
      }
      setColNameInput('');
      setColWipInput('');
      await loadBoardDetail(selectedBoardId);
    } catch (err) {
      setToast({ type: 'error', text: err instanceof ApiError ? err.message : 'Lỗi cập nhật cột' });
    }
  };

  const handleDeleteColumn = async (colId: string) => {
    if (!confirm('Xóa cột này và toàn bộ thẻ bên trong?')) return;
    try {
      await api.deleteColumn(colId);
      await loadBoardDetail(selectedBoardId);
    } catch (err) {
      setToast({ type: 'error', text: err instanceof ApiError ? err.message : 'Lỗi xóa cột' });
    }
  };

  const memberName = (id: string | null) => members.find((m) => m.id === id)?.fullName ?? null;

  return (
    <div className="p-5 h-full flex flex-col gap-4">
      {/* Top Toolbar: Board selector & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <select
            value={selectedBoardId}
            onChange={(e) => setSelectedBoardId(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 bg-white"
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {isAdmin && (
            <>
              <button
                onClick={() => setShowNewBoard(true)}
                className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:opacity-90 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Bảng mới
              </button>
              <button
                onClick={() => {
                  setEditingCol(null);
                  setColNameInput('');
                  setColWipInput('');
                  setShowNewCol(true);
                }}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm cột
              </button>
            </>
          )}
        </div>

        {/* Search & Filter (UC10) */}
        <form onSubmit={handleApplyFilter} className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Tìm tiêu đề..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs w-40"
            />
          </div>
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
          >
            <option value="">Tất cả thành viên</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </select>
          {settings.customFields.length > 0 && (
            <div className="flex items-center gap-1">
              <select
                value={filterCfKey}
                onChange={(e) => setFilterCfKey(e.target.value)}
                className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
              >
                <option value="">Trường mở rộng...</option>
                {settings.customFields.map((cf) => (
                  <option key={cf.key} value={cf.key}>
                    {cf.label}
                  </option>
                ))}
              </select>
              {filterCfKey && (
                <input
                  type="text"
                  placeholder="Giá trị..."
                  value={filterCfValue}
                  onChange={(e) => setFilterCfValue(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs w-24"
                />
              )}
            </div>
          )}
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg flex items-center gap-1"
          >
            <Filter className="w-3 h-3" /> Lọc
          </button>
          {(searchQ || filterAssignee || filterCfKey) && (
            <button
              type="button"
              onClick={handleClearFilter}
              className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800"
            >
              Xóa lọc
            </button>
          )}
        </form>
      </div>

      {/* Toast Notification (422 STRICT Red / WARN Yellow) */}
      {toast && (
        <div
          className={`px-4 py-3 rounded-xl border text-sm flex items-center justify-between ${
            toast.type === 'error'
              ? 'bg-red-50 border-red-300 text-red-800'
              : toast.type === 'warn'
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}
        >
          <span className="font-medium">{toast.text}</span>
          <button onClick={() => setToast(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
        {columns.map((col) => {
          const colCards = cards.filter((c) => c.columnId === col.id);
          const overWip = col.wipLimit !== null && colCards.length > col.wipLimit;
          const atWip = col.wipLimit !== null && colCards.length === col.wipLimit;
          const showWarn = overWip || warnColumns[col.id];

          return (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDropOnColumn(col.id)}
              className={`w-80 shrink-0 rounded-xl border p-3 flex flex-col gap-3 transition ${
                showWarn
                  ? 'bg-amber-50/70 border-amber-300'
                  : 'bg-slate-100/80 border-slate-200'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-bold text-slate-800 text-sm truncate">{col.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      overWip
                        ? 'bg-amber-200 text-amber-900'
                        : atWip
                        ? 'bg-primary/15 text-primary'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {colCards.length}
                    {col.wipLimit !== null ? `/${col.wipLimit}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openCreateCard(col.id)}
                    className="p-1 rounded hover:bg-white text-slate-600"
                    title="Thêm thẻ mới"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => {
                          setEditingCol(col);
                          setColNameInput(col.name);
                          setColWipInput(col.wipLimit !== null ? String(col.wipLimit) : '');
                        }}
                        className="p-1 rounded hover:bg-white text-slate-500"
                        title="Cấu hình cột / WIP"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteColumn(col.id)}
                        className="p-1 rounded hover:bg-white text-red-500"
                        title="Xóa cột"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {overWip && (
                <div className="px-2.5 py-1.5 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-xs flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Vượt ngưỡng WIP ({colCards.length}/{col.wipLimit})
                </div>
              )}

              {/* Cards */}
              <div className="space-y-2.5 min-h-[80px]">
                {colCards.map((card) => {
                  const assignee = memberName(card.assigneeId);
                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={() => setDraggingCard(card)}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:border-primary/50 cursor-grab active:cursor-grabbing space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-slate-900 text-sm leading-snug">{card.title}</h4>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => openEditCard(card)}
                            className="p-1 text-slate-400 hover:text-primary"
                            title="Sửa thẻ"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCard(card.id)}
                            className="p-1 text-slate-400 hover:text-red-600"
                            title="Xóa thẻ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {settings.cardDisplayMode === 'FULL' && card.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">{card.description}</p>
                      )}

                      {/* Custom fields badges */}
                      {settings.cardDisplayMode === 'FULL' &&
                        card.customFields &&
                        Object.keys(card.customFields).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(card.customFields).map(([k, v]) => {
                              const def = settings.customFields.find((f) => f.key === k);
                              return (
                                <span
                                  key={k}
                                  className="px-2 py-0.5 rounded bg-accent/15 text-slate-800 text-[11px] font-medium"
                                >
                                  {def ? def.label : k}: <strong>{String(v)}</strong>
                                </span>
                              );
                            })}
                          </div>
                        )}

                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                        <span>{assignee ? `👤 ${assignee}` : 'Chưa giao'}</span>
                        <span>v{card.version}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create / Edit Card (UC08) */}
      {cardModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSaveCard}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                {editingCard ? 'Cập nhật thẻ công việc' : 'Tạo thẻ công việc mới'}
              </h3>
              <button type="button" onClick={() => setCardModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {cardError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {cardError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tiêu đề *</label>
              <input
                type="text"
                required
                value={cardTitle}
                onChange={(e) => setCardTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mô tả</label>
              <textarea
                rows={2}
                value={cardDesc}
                onChange={(e) => setCardDesc(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Người thực hiện</label>
              <select
                value={cardAssignee}
                onChange={(e) => setCardAssignee(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">-- Chưa giao --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Custom Fields from Tenant Settings (K4) */}
            {settings.customFields.length > 0 && (
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <p className="text-xs font-semibold text-slate-600">Trường dữ liệu mở rộng ({settings.customFields.length})</p>
                {settings.customFields.map((cf) => (
                  <div key={cf.key}>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {cf.label} {cf.required && <span className="text-red-500">*</span>}
                      <span className="ml-1 text-[10px] text-slate-400">({cf.type})</span>
                    </label>
                    <input
                      type={cf.type === 'NUMBER' ? 'number' : 'text'}
                      value={cardCustomFields[cf.key] ?? ''}
                      onChange={(e) =>
                        setCardCustomFields((prev) => ({ ...prev, [cf.key]: e.target.value }))
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCardModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:opacity-90"
              >
                Lưu thẻ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: New Board */}
      {showNewBoard && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateBoard} className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-slate-900">Tạo Bảng Kanban mới</h3>
            <input
              type="text"
              required
              placeholder="Tên bảng..."
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewBoard(false)}
                className="px-3 py-1.5 text-sm text-slate-600"
              >
                Hủy
              </button>
              <button type="submit" className="px-4 py-1.5 bg-primary text-white text-sm rounded-lg">
                Tạo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add/Edit Column */}
      {(editingCol || showNewCol) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveColumn} className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-slate-900">{editingCol ? 'Cấu hình Cột' : 'Thêm Cột mới'}</h3>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tên cột</label>
              <input
                type="text"
                required
                value={colNameInput}
                onChange={(e) => setColNameInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Giới hạn WIP (để trống = không giới hạn)
              </label>
              <input
                type="number"
                min={1}
                value={colWipInput}
                onChange={(e) => setColWipInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingCol(null);
                  setShowNewCol(false);
                }}
                className="px-3 py-1.5 text-sm text-slate-600"
              >
                Hủy
              </button>
              <button type="submit" className="px-4 py-1.5 bg-primary text-white text-sm rounded-lg">
                Lưu
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
