package vn.tenantflow.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.tenantflow.cache.TenantConfigCacheService;
import vn.tenantflow.domain.entity.Board;
import vn.tenantflow.domain.entity.BoardColumn;
import vn.tenantflow.domain.entity.Card;
import vn.tenantflow.domain.model.ApiException;
import vn.tenantflow.domain.model.TenantSettings;
import vn.tenantflow.domain.repository.BoardColumnRepository;
import vn.tenantflow.domain.repository.BoardRepository;
import vn.tenantflow.domain.repository.CardRepository;
import vn.tenantflow.security.TenantContext;
import vn.tenantflow.security.TenantInfo;

import java.util.*;

@Service
public class KanbanService {

    private final BoardRepository boardRepository;
    private final BoardColumnRepository columnRepository;
    private final CardRepository cardRepository;
    private final TenantConfigCacheService cacheService;
    private final ObjectMapper objectMapper;

    public KanbanService(BoardRepository boardRepository,
                         BoardColumnRepository columnRepository,
                         CardRepository cardRepository,
                         TenantConfigCacheService cacheService,
                         ObjectMapper objectMapper) {
        this.boardRepository = boardRepository;
        this.columnRepository = columnRepository;
        this.cardRepository = cardRepository;
        this.cacheService = cacheService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<Board> listBoards() {
        return boardRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public Board createBoard(String name) {
        TenantInfo info = TenantContext.get();
        if (!info.isTenantAdmin()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Chỉ TENANT_ADMIN mới có quyền tạo bảng Kanban");
        }
        TenantSettings settings = cacheService.getTenantSettings(info.tenantId());

        Board board = new Board();
        board.setTenantId(info.tenantId());
        board.setName(name.trim());
        board = boardRepository.save(board);

        List<String> cols = (settings.defaultColumns() != null && !settings.defaultColumns().isEmpty())
                ? settings.defaultColumns()
                : List.of("Chờ xử lý", "Đang làm", "Hoàn thành");

        for (int i = 0; i < cols.size(); i++) {
            BoardColumn col = new BoardColumn();
            col.setTenantId(info.tenantId());
            col.setBoardId(board.getId());
            col.setName(cols.get(i));
            col.setPosition(i);
            boolean isFirstOrLast = (i == 0 || i == cols.size() - 1);
            col.setWipLimit(isFirstOrLast ? null : settings.defaultWipLimit());
            columnRepository.save(col);
        }
        return board;
    }

    @Transactional
    public Board renameBoard(UUID boardId, String name) {
        TenantInfo info = TenantContext.get();
        if (!info.isTenantAdmin()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Chỉ TENANT_ADMIN mới có quyền sửa tên bảng");
        }
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BOARD_NOT_FOUND", "Không tìm thấy bảng"));
        board.setName(name.trim());
        board = boardRepository.save(board);
        cacheService.evictBoardCache(info.tenantId(), boardId);
        return board;
    }

    @Transactional
    public void deleteBoard(UUID boardId) {
        TenantInfo info = TenantContext.get();
        if (!info.isTenantAdmin()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Chỉ TENANT_ADMIN mới có quyền xóa bảng");
        }
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BOARD_NOT_FOUND", "Không tìm thấy bảng"));
        boardRepository.delete(board);
        cacheService.evictBoardCache(info.tenantId(), boardId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getBoardDetail(UUID boardId, String q, UUID columnId, UUID assigneeId, String cfKey, String cfValue) {
        TenantInfo info = TenantContext.get();
        boolean hasFilter = (q != null && !q.isBlank()) || columnId != null || assigneeId != null
                || (cfKey != null && !cfKey.isBlank() && cfValue != null && !cfValue.isBlank());

        if (!hasFilter) {
            String cached = cacheService.getCachedBoardJson(info.tenantId(), boardId);
            if (cached != null) {
                try {
                    return objectMapper.readValue(cached, new TypeReference<>() {});
                } catch (Exception ignored) {}
            }
        }

        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BOARD_NOT_FOUND", "Không tìm thấy bảng"));

        List<BoardColumn> columns = columnRepository.findByBoardIdOrderByPositionAsc(boardId);
        List<Card> cards;
        if (hasFilter) {
            String cfJson = null;
            if (cfKey != null && !cfKey.isBlank() && cfValue != null && !cfValue.isBlank()) {
                TenantSettings settings = cacheService.getTenantSettings(info.tenantId());
                Object typedVal = parseCustomFieldFilterValue(settings, cfKey, cfValue);
                try {
                    cfJson = objectMapper.writeValueAsString(Map.of(cfKey, typedVal));
                } catch (Exception ignored) {}
            }
            String queryParam = (q != null && !q.isBlank()) ? q.trim() : null;
            cards = cardRepository.searchCards(boardId, queryParam, columnId, assigneeId, cfJson);
        } else {
            List<UUID> colIds = columns.stream().map(BoardColumn::getId).toList();
            cards = colIds.isEmpty() ? List.of() : cardRepository.findByColumnIdInOrderByPositionAsc(colIds);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("board", board);
        result.put("columns", columns);
        result.put("cards", cards);

        if (!hasFilter) {
            cacheService.putCachedBoardJson(info.tenantId(), boardId, result);
        }
        return result;
    }

    @Transactional
    public BoardColumn addColumn(UUID boardId, String name, Integer position, Integer wipLimit) {
        TenantInfo info = TenantContext.get();
        if (!info.isTenantAdmin()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Chỉ TENANT_ADMIN mới có quyền thêm cột");
        }
        boardRepository.findById(boardId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BOARD_NOT_FOUND", "Không tìm thấy bảng"));

        List<BoardColumn> existing = columnRepository.findByBoardIdOrderByPositionAsc(boardId);
        int pos = position != null ? position : existing.size();

        BoardColumn col = new BoardColumn();
        col.setTenantId(info.tenantId());
        col.setBoardId(boardId);
        col.setName(name.trim());
        col.setPosition(pos);
        col.setWipLimit(wipLimit);
        col = columnRepository.save(col);
        cacheService.evictBoardCache(info.tenantId(), boardId);
        return col;
    }

    @Transactional
    public BoardColumn updateColumn(UUID columnId, String name, Integer position, Integer wipLimit) {
        TenantInfo info = TenantContext.get();
        if (!info.isTenantAdmin()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Chỉ TENANT_ADMIN mới có quyền sửa cột");
        }
        BoardColumn col = columnRepository.findById(columnId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "COLUMN_NOT_FOUND", "Không tìm thấy cột"));
        if (name != null && !name.isBlank()) {
            col.setName(name.trim());
        }
        if (position != null) {
            col.setPosition(position);
        }
        col.setWipLimit(wipLimit);
        col = columnRepository.save(col);
        cacheService.evictBoardCache(info.tenantId(), col.getBoardId());
        return col;
    }

    @Transactional
    public void deleteColumn(UUID columnId) {
        TenantInfo info = TenantContext.get();
        if (!info.isTenantAdmin()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Chỉ TENANT_ADMIN mới có quyền xóa cột");
        }
        BoardColumn col = columnRepository.findById(columnId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "COLUMN_NOT_FOUND", "Không tìm thấy cột"));
        UUID boardId = col.getBoardId();
        columnRepository.delete(col);
        cacheService.evictBoardCache(info.tenantId(), boardId);
    }

    @Transactional
    public Card createCard(UUID boardId, UUID columnId, String title, String description, UUID assigneeId, Map<String, Object> customFields) {
        TenantInfo info = TenantContext.get();
        BoardColumn col = columnRepository.findById(columnId)
                .filter(c -> c.getBoardId().equals(boardId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "COLUMN_NOT_FOUND", "Không tìm thấy cột thuộc bảng này"));

        TenantSettings settings = cacheService.getTenantSettings(info.tenantId());
        Map<String, Object> validatedFields = validateAndNormalizeCustomFields(settings, customFields);

        long currentCount = cardRepository.countByColumnId(columnId);

        Card card = new Card();
        card.setTenantId(info.tenantId());
        card.setColumnId(col.getId());
        card.setAssigneeId(assigneeId);
        card.setTitle(title.trim());
        card.setDescription(description);
        card.setPosition((int) currentCount);
        card.setVersion(1);
        card.setCustomFields(validatedFields);
        card = cardRepository.save(card);

        cacheService.evictBoardCache(info.tenantId(), boardId);
        return card;
    }

    @Transactional
    public Card updateCard(UUID cardId, String title, String description, UUID assigneeId, Map<String, Object> customFields) {
        TenantInfo info = TenantContext.get();
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CARD_NOT_FOUND", "Không tìm thấy thẻ"));

        BoardColumn col = columnRepository.findById(card.getColumnId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "COLUMN_NOT_FOUND", "Không tìm thấy cột"));

        TenantSettings settings = cacheService.getTenantSettings(info.tenantId());
        Map<String, Object> validatedFields = validateAndNormalizeCustomFields(settings, customFields);

        if (title != null && !title.isBlank()) {
            card.setTitle(title.trim());
        }
        card.setDescription(description);
        card.setAssigneeId(assigneeId);
        card.setCustomFields(validatedFields);
        card.setVersion(card.getVersion() + 1);
        card = cardRepository.save(card);

        cacheService.evictBoardCache(info.tenantId(), col.getBoardId());
        return card;
    }

    @Transactional
    public void deleteCard(UUID cardId) {
        TenantInfo info = TenantContext.get();
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CARD_NOT_FOUND", "Không tìm thấy thẻ"));
        BoardColumn col = columnRepository.findById(card.getColumnId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "COLUMN_NOT_FOUND", "Không tìm thấy cột"));
        cardRepository.delete(card);
        cacheService.evictBoardCache(info.tenantId(), col.getBoardId());
    }

    @Transactional
    public Map<String, Object> moveCard(UUID cardId, UUID targetColumnId, int targetPosition, int expectedVersion) {
        TenantInfo info = TenantContext.get();

        // 1. Pessimistic lock on target column (SELECT ... FOR UPDATE) to prevent Race Condition
        BoardColumn targetCol = columnRepository.findByIdForUpdate(targetColumnId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "COLUMN_NOT_FOUND", "Không tìm thấy cột đích"));

        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CARD_NOT_FOUND", "Không tìm thấy thẻ"));

        // 2. Optimistic lock check on card.version
        if (card.getVersion() != expectedVersion) {
            throw new ApiException(HttpStatus.CONFLICT, "VERSION_CONFLICT",
                    "Thẻ đã được cập nhật bởi người khác (expected v" + expectedVersion + ", actual v" + card.getVersion() + ")");
        }

        UUID sourceColumnId = card.getColumnId();
        boolean movingAcrossColumns = !sourceColumnId.equals(targetColumnId);
        boolean wipWarning = false;

        // 3. WIP Limit Enforcement (K4: STRICT | WARN | OFF)
        if (movingAcrossColumns && targetCol.getWipLimit() != null) {
            TenantSettings settings = cacheService.getTenantSettings(info.tenantId());
            if (!"OFF".equalsIgnoreCase(settings.wipMode())) {
                long countInTarget = cardRepository.countByColumnId(targetColumnId);
                if (countInTarget >= targetCol.getWipLimit()) {
                    if ("STRICT".equalsIgnoreCase(settings.wipMode())) {
                        throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "WIP_LIMIT_EXCEEDED",
                                "Cột '" + targetCol.getName() + "' đã đạt giới hạn WIP (" + countInTarget + "/" + targetCol.getWipLimit() + ") ở chế độ STRICT");
                    } else if ("WARN".equalsIgnoreCase(settings.wipMode())) {
                        wipWarning = true;
                    }
                }
            }
        }

        card.setColumnId(targetColumnId);
        card.setPosition(targetPosition);
        card.setVersion(card.getVersion() + 1);
        card = cardRepository.save(card);

        cacheService.evictBoardCache(info.tenantId(), targetCol.getBoardId());

        return Map.of(
                "card", card,
                "wipWarning", wipWarning,
                "targetColumnId", targetColumnId,
                "wipLimit", targetCol.getWipLimit() != null ? targetCol.getWipLimit() : 0
        );
    }

    private Map<String, Object> validateAndNormalizeCustomFields(TenantSettings settings, Map<String, Object> input) {
        Map<String, Object> safeInput = input != null ? input : Map.of();
        Map<String, Object> normalized = new HashMap<>(safeInput);

        if (settings.customFields() == null) {
            return normalized;
        }

        for (TenantSettings.CustomFieldDef def : settings.customFields()) {
            Object rawVal = safeInput.get(def.key());
            boolean isEmpty = (rawVal == null) || (rawVal instanceof String s && s.isBlank());

            if (def.required() && isEmpty) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "CUSTOM_FIELD_REQUIRED",
                        "Trường bắt buộc '" + def.label() + "' (" + def.key() + ") không được để trống");
            }

            if (!isEmpty && "SELECT".equalsIgnoreCase(def.type()) && def.options() != null && !def.options().isEmpty()) {
                String valStr = String.valueOf(rawVal);
                if (!def.options().contains(valStr)) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "CUSTOM_FIELD_INVALID_OPTION",
                            "Giá trị '" + valStr + "' của trường '" + def.label() + "' không nằm trong danh sách hợp lệ");
                }
            }

            if (!isEmpty && "NUMBER".equalsIgnoreCase(def.type())) {
                if (rawVal instanceof Number) {
                    continue;
                }
                if (rawVal instanceof String s) {
                    try {
                        double num = Double.parseDouble(s.trim());
                        if (num == Math.floor(num) && !s.contains(".")) {
                            normalized.put(def.key(), (long) num);
                        } else {
                            normalized.put(def.key(), num);
                        }
                    } catch (NumberFormatException ex) {
                        throw new ApiException(HttpStatus.BAD_REQUEST, "CUSTOM_FIELD_TYPE_MISMATCH",
                                "Trường '" + def.label() + "' (" + def.key() + ") phải là kiểu số (NUMBER)");
                    }
                } else {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "CUSTOM_FIELD_TYPE_MISMATCH",
                            "Trường '" + def.label() + "' (" + def.key() + ") phải là kiểu số (NUMBER)");
                }
            }
        }
        return normalized;
    }

    private Object parseCustomFieldFilterValue(TenantSettings settings, String cfKey, String cfValue) {
        if (settings.customFields() != null) {
            for (TenantSettings.CustomFieldDef def : settings.customFields()) {
                if (def.key().equals(cfKey) && "NUMBER".equalsIgnoreCase(def.type())) {
                    try {
                        double num = Double.parseDouble(cfValue.trim());
                        if (num == Math.floor(num) && !cfValue.contains(".")) {
                            return (long) num;
                        }
                        return num;
                    } catch (NumberFormatException ignored) {}
                }
            }
        }
        return cfValue;
    }
}
