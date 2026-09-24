CREATE TABLE task_deadline_reminders (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    task_id uuid NOT NULL,
    reminder_type varchar(20) NOT NULL CHECK (reminder_type IN ('DUE_SOON','OVERDUE')),
    due_at timestamptz NOT NULL,
    recipient_user_id uuid NOT NULL,
    outbox_event_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, outbox_event_id),
    UNIQUE (tenant_id, task_id, reminder_type, due_at, recipient_user_id),
    FOREIGN KEY (tenant_id, task_id) REFERENCES tasks(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_task_deadline_reminders_task
    ON task_deadline_reminders(tenant_id, task_id, due_at DESC);

CREATE INDEX idx_tasks_deadline_due
    ON tasks(tenant_id, due_at)
    WHERE deleted_at IS NULL AND due_at IS NOT NULL AND assignee_user_id IS NOT NULL;

ALTER TABLE task_deadline_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_deadline_reminders FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON task_deadline_reminders
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
