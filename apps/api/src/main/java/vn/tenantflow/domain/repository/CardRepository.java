package vn.tenantflow.domain.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.tenantflow.domain.entity.Card;

import java.util.List;
import java.util.UUID;

public interface CardRepository extends JpaRepository<Card, UUID> {
    List<Card> findByColumnIdInOrderByPositionAsc(List<UUID> columnIds);

    long countByColumnId(UUID columnId);

    @Query(value = """
            SELECT c.* FROM cards c
            JOIN board_columns bc ON bc.id = c.column_id
            WHERE bc.board_id = :boardId
              AND (:q IS NULL OR LOWER(c.title) LIKE LOWER(CONCAT('%', :q, '%')))
              AND (:columnId IS NULL OR c.column_id = :columnId)
              AND (:assigneeId IS NULL OR c.assignee_id = :assigneeId)
              AND (:cfJson IS NULL OR c.custom_fields @> CAST(:cfJson AS jsonb))
            ORDER BY c.position ASC, c.created_at ASC
            """, nativeQuery = true)
    List<Card> searchCards(
            @Param("boardId") UUID boardId,
            @Param("q") String q,
            @Param("columnId") UUID columnId,
            @Param("assigneeId") UUID assigneeId,
            @Param("cfJson") String cfJson
    );
}
