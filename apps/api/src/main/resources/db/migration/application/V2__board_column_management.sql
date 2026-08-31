ALTER TABLE boards
    ADD COLUMN version bigint NOT NULL DEFAULT 0;

CREATE INDEX idx_board_columns_board_position
    ON board_columns(tenant_id, board_id, position);

CREATE UNIQUE INDEX uq_board_columns_board_name_ci
    ON board_columns(tenant_id, board_id, lower(name));
