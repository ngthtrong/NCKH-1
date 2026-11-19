package vn.tenantflow.domain.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.tenantflow.domain.entity.Board;

import java.util.List;
import java.util.UUID;

public interface BoardRepository extends JpaRepository<Board, UUID> {
    List<Board> findAllByOrderByCreatedAtDesc();
}
