CREATE TABLE projects (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    name varchar(160) NOT NULL,
    description text,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, name)
);

CREATE TABLE project_memberships (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role varchar(30) NOT NULL CHECK (role IN ('MANAGER','MEMBER','VIEWER')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, project_id, user_id),
    FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE boards (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    name varchar(160) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE board_columns (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    board_id uuid NOT NULL,
    name varchar(120) NOT NULL,
    position numeric(14,4) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    FOREIGN KEY (tenant_id, board_id) REFERENCES boards(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE tasks (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    board_id uuid NOT NULL,
    board_column_id uuid NOT NULL,
    parent_task_id uuid,
    title varchar(240) NOT NULL,
    description text,
    assignee_user_id uuid,
    due_at timestamptz,
    position numeric(14,4) NOT NULL,
    version bigint NOT NULL DEFAULT 0,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    CHECK (parent_task_id IS NULL OR parent_task_id <> id),
    FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, board_id) REFERENCES boards(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, board_column_id) REFERENCES board_columns(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, parent_task_id) REFERENCES tasks(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE comments (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    task_id uuid NOT NULL,
    author_user_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    FOREIGN KEY (tenant_id, task_id) REFERENCES tasks(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE resources (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    original_name varchar(255) NOT NULL,
    storage_key varchar(1000) NOT NULL,
    content_type varchar(200) NOT NULL,
    size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
    uploaded_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, storage_key)
);

CREATE TABLE task_resources (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    task_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, task_id, resource_id),
    FOREIGN KEY (tenant_id, task_id) REFERENCES tasks(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, resource_id) REFERENCES resources(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE notifications (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    source_event_id uuid,
    recipient_user_id uuid NOT NULL,
    event_type varchar(100) NOT NULL,
    title varchar(240) NOT NULL,
    body text NOT NULL,
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, source_event_id, recipient_user_id)
);

CREATE TABLE notification_preferences (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    in_app_enabled boolean NOT NULL DEFAULT true,
    email_enabled boolean NOT NULL DEFAULT true,
    web_push_enabled boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, user_id)
);

CREATE TABLE push_subscriptions (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh varchar(255) NOT NULL,
    auth_secret varchar(255) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notification_delivery_attempts (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    notification_id uuid NOT NULL,
    channel varchar(20) NOT NULL CHECK (channel IN ('IN_APP','EMAIL','WEB_PUSH')),
    status varchar(20) NOT NULL CHECK (status IN ('PENDING','SENT','FAILED','SKIPPED')),
    provider_reference varchar(255),
    error_code varchar(120),
    attempted_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, notification_id) REFERENCES notifications(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE audit_events (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    actor_user_id uuid,
    event_type varchar(120) NOT NULL,
    aggregate_type varchar(80) NOT NULL,
    aggregate_id uuid,
    correlation_id varchar(120),
    details_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE outbox_events (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    actor_user_id uuid,
    event_type varchar(120) NOT NULL,
    aggregate_type varchar(80) NOT NULL,
    aggregate_id uuid,
    event_version integer NOT NULL DEFAULT 1,
    correlation_id varchar(120),
    payload_json jsonb NOT NULL,
    attempts integer NOT NULL DEFAULT 0,
    available_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    last_error varchar(500),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_tasks_board_position ON tasks(tenant_id, board_id, board_column_id, position);
CREATE INDEX idx_tasks_due ON tasks(tenant_id, due_at);
CREATE INDEX idx_notifications_recipient ON notifications(tenant_id, recipient_user_id, created_at DESC);
CREATE INDEX idx_delivery_attempts_notification ON notification_delivery_attempts(tenant_id, notification_id, attempted_at DESC);
CREATE INDEX idx_outbox_available ON outbox_events(tenant_id, processed_at, available_at);

DO $rls$
DECLARE
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'projects', 'project_memberships', 'boards', 'board_columns', 'tasks', 'comments',
        'resources', 'task_resources', 'notifications', 'notification_preferences',
        'push_subscriptions', 'notification_delivery_attempts', 'audit_events', 'outbox_events'
    ]
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I USING (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)',
            table_name
        );
    END LOOP;
END
$rls$;
