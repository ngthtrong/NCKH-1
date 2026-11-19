package vn.tenantflow.domain.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.tenantflow.domain.entity.BoardColumn;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BoardColumnRepository extends JpaRepository<BoardColumn, UUID> {
    List<BoardColumn> findByBoardIdOrderByPositionAsc(UUID boardId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM BoardColumn c WHERE c.id = :id")
    Optional<BoardColumn> findByIdForUpdate(@Param("id") UUID id);
}
