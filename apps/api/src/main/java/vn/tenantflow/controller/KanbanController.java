package vn.tenantflow.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.tenantflow.domain.entity.Board;
import vn.tenantflow.domain.entity.BoardColumn;
import vn.tenantflow.domain.entity.Card;
import vn.tenantflow.service.KanbanService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class KanbanController {

    private final KanbanService kanbanService;

    public KanbanController(KanbanService kanbanService) {
        this.kanbanService = kanbanService;
    }

    public record BoardRequest(@NotBlank String name) {}
    public record ColumnRequest(String name, Integer position, Integer wipLimit) {}
    public record CreateCardRequest(
            @NotNull UUID columnId,
            @NotBlank String title,
            String description,
            UUID assigneeId,
            Map<String, Object> customFields
    ) {}
    public record UpdateCardRequest(
            String title,
            String description,
            UUID assigneeId,
            Map<String, Object> customFields
    ) {}
    public record MoveCardRequest(
            @NotNull UUID targetColumnId,
            int targetPosition,
            int expectedVersion
    ) {}

    @GetMapping("/boards")
    public List<Board> listBoards() {
        return kanbanService.listBoards();
    }

    @PostMapping("/boards")
    public ResponseEntity<Board> createBoard(@Valid @RequestBody BoardRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(kanbanService.createBoard(req.name()));
    }

    @PatchMapping("/boards/{id}")
    public Board renameBoard(@PathVariable UUID id, @Valid @RequestBody BoardRequest req) {
        return kanbanService.renameBoard(id, req.name());
    }

    @DeleteMapping("/boards/{id}")
    public ResponseEntity<Void> deleteBoard(@PathVariable UUID id) {
        kanbanService.deleteBoard(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/boards/{id}")
    public Map<String, Object> getBoardDetail(
            @PathVariable UUID id,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID columnId,
            @RequestParam(required = false) UUID assigneeId,
            @RequestParam(required = false) String cfKey,
            @RequestParam(required = false) String cfValue
    ) {
        return kanbanService.getBoardDetail(id, q, columnId, assigneeId, cfKey, cfValue);
    }

    @PostMapping("/boards/{id}/columns")
    public ResponseEntity<BoardColumn> addColumn(@PathVariable UUID id, @RequestBody ColumnRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(kanbanService.addColumn(id, req.name(), req.position(), req.wipLimit()));
    }

    @PatchMapping("/columns/{id}")
    public BoardColumn updateColumn(@PathVariable UUID id, @RequestBody ColumnRequest req) {
        return kanbanService.updateColumn(id, req.name(), req.position(), req.wipLimit());
    }

    @DeleteMapping("/columns/{id}")
    public ResponseEntity<Void> deleteColumn(@PathVariable UUID id) {
        kanbanService.deleteColumn(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/boards/{id}/tasks")
    public ResponseEntity<Card> createCard(@PathVariable UUID id, @Valid @RequestBody CreateCardRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(kanbanService.createCard(id, req.columnId(), req.title(), req.description(), req.assigneeId(), req.customFields()));
    }

    @PatchMapping("/cards/{id}")
    public Card updateCard(@PathVariable UUID id, @RequestBody UpdateCardRequest req) {
        return kanbanService.updateCard(id, req.title(), req.description(), req.assigneeId(), req.customFields());
    }

    @DeleteMapping("/cards/{id}")
    public ResponseEntity<Void> deleteCard(@PathVariable UUID id) {
        kanbanService.deleteCard(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/cards/{id}/move")
    public Map<String, Object> moveCard(@PathVariable UUID id, @Valid @RequestBody MoveCardRequest req) {
        return kanbanService.moveCard(id, req.targetColumnId(), req.targetPosition(), req.expectedVersion());
    }
}
