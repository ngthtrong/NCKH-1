ALTER TABLE tasks
    ADD COLUMN priority varchar(20) NOT NULL DEFAULT 'MEDIUM',
    ADD CONSTRAINT chk_tasks_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'));

CREATE INDEX idx_tasks_parent_active
    ON tasks(tenant_id, parent_task_id, board_column_id)
    WHERE deleted_at IS NULL AND parent_task_id IS NOT NULL;
