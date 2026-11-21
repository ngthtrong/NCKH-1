import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Filter,
  Layers,
  Plus,
  Search,
  Settings2,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { api, ApiError } from '../api';
import type { Board, BoardColumn, Card, TenantMember, TenantSettings } from '../types';

interface Props {
  isAdmin: boolean;
  settings: TenantSettings;
  selectedBoardId?: string;
  onSelectBoardId?: (id: string) => void;
}

export const KanbanView: React.FC<Props> = ({
  isAdmin,
  settings,
  selectedBoardId: propBoardId,
  onSelectBoardId,
}) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>(propBoardId || '');
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [members, setMembers] = useState<TenantMember[]>([]);

  // Filters (UC10)
  const [searchQ, setSearchQ] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterCfKey, setFilterCfKey] = useState('');
  const [filterCfValue, setFilterCfValue] = useState('');

  // Alerts & Notifications
  const [toast, setToast] = useState<{
    type: 'error' | 'warn' | 'ok';
    title: string;
    message: string;
  } | null>(null);
  const [warnColumns, setWarnColumns] = useState<Record<string, boolean>>({});

  // Drag & Drop State
  const [draggingCard, setDraggingCard] = useState<Card | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // Card Modal (2-column layout: Standard vs JSONB Extended Fields)
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [cardColId, setCardColId] = useState('');
  const [cardTitle, setCardTitle] = useState('');
  const [cardDesc, setCardDesc] = useState('');
  const [cardAssignee, setCardAssignee] = useState('');
  const [cardCustomFields, setCardCustomFields] = useState<Record<string, string>>({});
  const [cardError, setCardError] = useState<string | null>(null);

  // Board / Column Modals
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
    loadBoards().catch((err) =>
      setToast({ type: 'error', title: 'Lỗi tải dữ liệu', message: err.message })
    );
  }, []);

  useEffect(() => {
    if (propBoardId && propBoardId !== selectedBoardId) {
      setSelectedBoardId(propBoardId);
    }
  }, [propBoardId]);

  useEffect(() => {
    if (selectedBoardId) {
      loadBoardDetail(selectedBoardId).catch((err) =>
        setToast({ type: 'error', title: 'Lỗi tải bảng', message: err.message })
      );
    }
  }, [selectedBoardId]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBoardId) {
      loadBoardDetail(selectedBoardId).catch((err) =>
        setToast({ type: 'error', title: 'Lỗi lọc thẻ', message: err.message })
      );
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
      setCardError(err instanceof ApiError ? err.message : 'Lỗi khi lưu thẻ công việc');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thẻ công việc này?')) return;
    try {
      await api.deleteCard(cardId);
      await loadBoardDetail(selectedBoardId);
    } catch (err) {
      setToast({
        type: 'error',
        title: 'Lỗi xóa thẻ',
        message: err instanceof ApiError ? err.message : 'Không thể xóa thẻ',
      });
    }
  };

  const handleDropOnColumn = async (targetColumnId: string) => {
    if (!draggingCard) return;
    const card = draggingCard;
    setDraggingCard(null);
    setDragOverColId(null);

    if (card.columnId === targetColumnId) return;

    const targetCol = columns.find((c) => c.id === targetColumnId);
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
          title: 'Cảnh báo Quy tắc WIP (WARN Mode)',
          message: `Cột '${targetCol?.name}' đã vượt ngưỡng (${targetCards.length + 1}/${res.wipLimit}). Theo chính sách WARN, hành động vẫn được phê duyệt và ghi nhận.`,
        });
      } else {
        setToast(null);
      }
    } catch (err) {
      // Rollback UI on 422 STRICT or 409 Conflict
      setCards(previousCards);
      const isWipExceeded = err instanceof ApiError && err.code === 'WIP_LIMIT_EXCEEDED';
      setToast({
        type: 'error',
        title: isWipExceeded ? 'Chặn cưỡng chế WIP (STRICT Mode)' : 'Không thể di chuyển thẻ',
        message:
          err instanceof ApiError
            ? err.message
            : 'Đã hoàn trả thẻ về vị trí ban đầu do vi phạm quy tắc.',
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
      setToast({
        type: 'error',
        title: 'Lỗi tạo bảng',
        message: err instanceof ApiError ? err.message : 'Lỗi tạo bảng mới',
      });
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
      setToast({
        type: 'error',
        title: 'Lỗi cập nhật cột',
        message: err instanceof ApiError ? err.message : 'Lỗi cấu hình cột',
      });
    }
  };

  const handleDeleteColumn = async (colId: string) => {
    if (!confirm('Xóa cột này và toàn bộ thẻ bên trong?')) return;
    try {
      await api.deleteColumn(colId);
      await loadBoardDetail(selectedBoardId);
    } catch (err) {
      setToast({
        type: 'error',
        title: 'Lỗi xóa cột',
        message: err instanceof ApiError ? err.message : 'Lỗi xóa cột',
      });
    }
  };

  const memberName = (id: string | null) => members.find((m) => m.id === id)?.fullName ?? null;

  return (
    <div className="p-4 h-full flex flex-col gap-3 min-w-0">
      {/* Top Toolbar: Board Selector, New Actions & Universal Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedBoardId}
            onChange={(e) => {
              setSelectedBoardId(e.target.value);
              onSelectBoardId?.(e.target.value);
            }}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                📋 {b.name}
              </option>
            ))}
          </select>

          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowNewBoard(true)}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-2xs transition"
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
                className="px-2.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm cột
              </button>
            </div>
          )}
        </div>

        {/* Universal Search & Extended Filter (UC10) */}
        <form onSubmit={handleApplyFilter} className="flex flex-wrap items-center gap-1.5 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Tìm tiêu đề thẻ..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="pl-8 pr-2.5 py-1.5 border border-slate-300 rounded-lg text-xs w-36 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
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
                className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="">Thuộc tính mở rộng...</option>
                {settings.customFields.map((cf) => (
                  <option key={cf.key} value={cf.key}>
                    {cf.label}
                  </option>
                ))}
              </select>

              {filterCfKey && (
                <input
                  type="text"
                  placeholder="Giá trị lọc..."
                  value={filterCfValue}
                  onChange={(e) => setFilterCfValue(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs w-24"
                />
              )}
            </div>
          )}

          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1 transition"
          >
            <Filter className="w-3 h-3" /> Lọc
          </button>

          {(searchQ || filterAssignee || filterCfKey) && (
            <button
              type="button"
              onClick={handleClearFilter}
              className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              Xóa lọc
            </button>
          )}
        </form>
      </div>

      {/* Floating Professional Toast (Top Right) */}
      {toast && (
        <div className="fixed top-16 right-6 z-50 max-w-sm w-full animate-in slide-in-from-top-4 duration-300">
          <div
            className={`p-4 rounded-2xl border text-xs flex items-start justify-between gap-3 shadow-2xl backdrop-blur-md ${
              toast.type === 'error'
                ? 'bg-rose-950/95 border-rose-500/80 text-white shadow-rose-900/20'
                : toast.type === 'warn'
                ? 'bg-amber-950/95 border-amber-500/80 text-white shadow-amber-900/20'
                : 'bg-emerald-950/95 border-emerald-500/80 text-white shadow-emerald-900/20'
            }`}
          >
            <div className="flex items-start gap-3">
              {toast.type === 'error' ? (
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-400/40 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                </div>
              ) : toast.type === 'warn' ? (
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
              )}
              <div>
                <div className="font-bold text-xs uppercase tracking-wider">{toast.title}</div>
                <div className="text-[11px] text-slate-300 mt-1 leading-relaxed">{toast.message}</div>
              </div>
            </div>
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Kanban Columns: Horizontal smooth scrolling for Split-Screen viewports */}
      <div className="flex gap-3.5 overflow-x-auto pb-4 flex-1 items-start min-w-0">
        {columns.map((col) => {
          const colCards = cards.filter((c) => c.columnId === col.id);
          const hasLimit = col.wipLimit !== null;
          const atLimit = col.wipLimit !== null && colCards.length === col.wipLimit;
          const overLimit = col.wipLimit !== null && colCards.length > col.wipLimit;
          const isWarning = overLimit || warnColumns[col.id];
          const isDragTarget = dragOverColId === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColId(col.id);
              }}
              onDragLeave={() => {
                if (dragOverColId === col.id) setDragOverColId(null);
              }}
              onDrop={() => handleDropOnColumn(col.id)}
              className={`w-72 sm:w-80 shrink-0 rounded-2xl border p-3 flex flex-col gap-2.5 transition-all duration-200 ${
                isDragTarget
                  ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-400/30'
                  : isWarning
                  ? 'bg-amber-50/60 border-amber-300'
                  : 'bg-slate-100/70 border-slate-200/90'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/70">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-bold text-slate-800 text-xs truncate">{col.name}</h3>

                  {/* WIP Count Badge */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight ${
                      overLimit
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : atLimit
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {colCards.length}
                    {hasLimit ? `/${col.wipLimit}` : ''}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openCreateCard(col.id)}
                    className="p-1 rounded-md hover:bg-white text-slate-600 hover:text-slate-900 transition"
                    title="Thêm thẻ mới"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => {
                          setEditingCol(col);
                          setColNameInput(col.name);
                          setColWipInput(col.wipLimit !== null ? String(col.wipLimit) : '');
                        }}
                        className="p-1 rounded-md hover:bg-white text-slate-400 hover:text-slate-700 transition"
                        title="Cấu hình Cột & Giới hạn WIP"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteColumn(col.id)}
                        className="p-1 rounded-md hover:bg-white text-slate-400 hover:text-rose-600 transition"
                        title="Xóa cột"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Over WIP Indicator Alert */}
              {overLimit && (
                <div className="px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-[10px] flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>Vượt giới hạn WIP ({colCards.length}/{col.wipLimit})</span>
                </div>
              )}

              {/* Card List with Dnd Elevation */}
              <div className="space-y-2 min-h-[90px]">
                {colCards.map((card) => {
                  const assignee = memberName(card.assigneeId);
                  const isBeingDragged = draggingCard?.id === card.id;

                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={() => setDraggingCard(card)}
                      onDragEnd={() => {
                        setDraggingCard(null);
                        setDragOverColId(null);
                      }}
                      className={`bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-150 cursor-grab active:cursor-grabbing p-3 space-y-2 select-none ${
                        isBeingDragged ? 'opacity-40 scale-95 border-dashed border-indigo-400' : ''
                      }`}
                    >
                      {/* Card Header: Title & Actions */}
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className="font-bold text-slate-900 text-xs leading-snug break-words">
                          {card.title}
                        </h4>
                        <div className="flex items-center gap-0.5 shrink-0 opacity-70 hover:opacity-100">
                          <button
                            onClick={() => openEditCard(card)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded transition"
                            title="Chỉnh sửa thẻ"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteCard(card.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Xóa thẻ"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Display Mode FULL: Description */}
                      {settings.cardDisplayMode === 'FULL' && card.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {card.description}
                        </p>
                      )}

                      {/* Display Mode FULL: Extended JSONB Field Badges */}
                      {settings.cardDisplayMode === 'FULL' &&
                        card.customFields &&
                        Object.keys(card.customFields).length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {Object.entries(card.customFields).map(([k, v]) => {
                              const def = settings.customFields.find((f) => f.key === k);
                              const isNumber = def?.type === 'NUMBER';
                              const isSelect = def?.type === 'SELECT';

                              return (
                                <span
                                  key={k}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                    isNumber
                                      ? 'bg-blue-50 text-blue-700 border-blue-200 font-mono'
                                      : isSelect
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : 'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  <span className="opacity-70">{def ? def.label : k}:</span>
                                  <strong className="font-semibold">{String(v)}</strong>
                                </span>
                              );
                            })}
                          </div>
                        )}

                      {/* Card Footer: Assignee */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                        <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                          <div className="w-4 h-4 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-bold shrink-0">
                            {assignee ? assignee.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <span className="truncate text-slate-600 font-medium">{assignee || 'Chưa phân công'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: 2-Column Card Creator / Editor (Standard Fields vs JSONB Custom Fields) */}
      {cardModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveCard}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingCard ? 'Cập nhật Thẻ công việc' : 'Tạo Thẻ công việc mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCardModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cardError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {cardError}
              </div>
            )}

            {/* 2-Column Layout */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
              {/* Left Column: Standard Attributes */}
              <div className="space-y-3.5">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100">
                  Thông tin Chuẩn (Standard)
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tiêu đề thẻ công việc *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Triển khai kiểm tra RLS..."
                    value={cardTitle}
                    onChange={(e) => setCardTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả chi tiết</label>
                  <textarea
                    rows={3}
                    placeholder="Mô tả mục tiêu, yêu cầu nghiệm thu..."
                    value={cardDesc}
                    onChange={(e) => setCardDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cột trạng thái</label>
                  <select
                    value={cardColId}
                    onChange={(e) => setCardColId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    {columns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name} {col.wipLimit !== null ? `(Giới hạn WIP: ${col.wipLimit})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Người phụ trách</label>
                  <select
                    value={cardAssignee}
                    onChange={(e) => setCardAssignee(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="">-- Chưa giao ai --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right Column: Dynamic Extended Fields */}
              <div className="space-y-3.5">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100 flex items-center justify-between">
                  <span>Thuộc tính bổ sung của công ty</span>
                  <span className="text-[10px] text-slate-400 font-mono lowercase">
                    {settings.customFields.length} trường
                  </span>
                </div>

                {settings.customFields.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400 italic">
                    Tổ chức này chưa định nghĩa trường mở rộng nào.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {settings.customFields.map((cf) => (
                      <div key={cf.key}>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                          <span>
                            {cf.label} {cf.required && <span className="text-rose-500">*</span>}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1 py-0.2 rounded">
                            {cf.type}
                          </span>
                        </label>

                        {cf.type === 'SELECT' ? (
                          <select
                            value={cardCustomFields[cf.key] ?? ''}
                            onChange={(e) =>
                              setCardCustomFields((prev) => ({ ...prev, [cf.key]: e.target.value }))
                            }
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                          >
                            <option value="">-- Chọn giá trị --</option>
                            {(cf.options ?? []).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={cf.type === 'NUMBER' ? 'number' : cf.type === 'DATE' ? 'date' : 'text'}
                            value={cardCustomFields[cf.key] ?? ''}
                            onChange={(e) =>
                              setCardCustomFields((prev) => ({ ...prev, [cf.key]: e.target.value }))
                            }
                            placeholder={cf.type === 'NUMBER' ? 'Nhập số...' : 'Nhập giá trị...'}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCardModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                {editingCard ? 'Lưu cập nhật' : 'Tạo thẻ ngay'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: New Board */}
      {showNewBoard && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreateBoard}
            className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm space-y-3.5 border border-slate-200"
          >
            <h3 className="font-bold text-slate-900 text-sm">Tạo Bảng Kanban mới</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tên bảng công việc</label>
              <input
                type="text"
                required
                placeholder="VD: Dự án Sprint Q4..."
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNewBoard(false)}
                className="px-3 py-1.5 text-xs text-slate-600"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl"
              >
                Tạo Bảng
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add / Configure Column */}
      {(editingCol || showNewCol) && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSaveColumn}
            className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm space-y-3.5 border border-slate-200"
          >
            <h3 className="font-bold text-slate-900 text-sm">
              {editingCol ? 'Cấu hình Cột & Giới hạn WIP' : 'Thêm Cột mới vào Bảng'}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tên cột trạng thái</label>
              <input
                type="text"
                required
                value={colNameInput}
                onChange={(e) => setColNameInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Giới hạn WIP (Số thẻ tối đa cho phép)
              </label>
              <input
                type="number"
                min={1}
                placeholder="Để trống = Không giới hạn"
                value={colWipInput}
                onChange={(e) => setColWipInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Lưu ý: Cột đầu và cột cuối của quy trình mặc định được miễn trừ giới hạn WIP.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setEditingCol(null);
                  setShowNewCol(false);
                }}
                className="px-3 py-1.5 text-xs text-slate-600"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl"
              >
                Lưu Cột
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
