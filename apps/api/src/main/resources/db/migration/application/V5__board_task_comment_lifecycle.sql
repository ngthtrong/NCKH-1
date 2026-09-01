ALTER TABLE boards
    ADD COLUMN deleted_at timestamptz;

ALTER TABLE tasks
    ADD COLUMN deleted_at timestamptz;

ALTER TABLE comments
    ADD COLUMN deleted_at timestamptz;

CREATE INDEX idx_boards_project_active
    ON boards(tenant_id, project_id, created_at)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_tasks_board_active
    ON tasks(tenant_id, board_id, board_column_id, position)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_comments_task_active
    ON comments(tenant_id, task_id, created_at)
    WHERE deleted_at IS NULL;
