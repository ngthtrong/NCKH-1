package vn.tenantflow.domain.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "board_columns")
public class BoardColumn {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "board_id", nullable = false)
    private UUID boardId;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false)
    private int position;

    @Column(name = "wip_limit")
    private Integer wipLimit;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getBoardId() { return boardId; }
    public void setBoardId(UUID boardId) { this.boardId = boardId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    public Integer getWipLimit() { return wipLimit; }
    public void setWipLimit(Integer wipLimit) { this.wipLimit = wipLimit; }
}
