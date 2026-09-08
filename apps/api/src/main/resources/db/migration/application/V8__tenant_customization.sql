CREATE TABLE custom_definitions (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    kind varchar(20) NOT NULL CHECK (kind IN ('TASK','ENTITY')),
    display_name varchar(120) NOT NULL,
    physical_table varchar(63) NOT NULL,
    status varchar(20) NOT NULL CHECK (status IN ('PENDING','ACTIVE','FAILED')),
    version bigint NOT NULL DEFAULT 0,
    last_error varchar(500),
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, id),
    FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id),
    UNIQUE (tenant_id, physical_table)
);

CREATE UNIQUE INDEX uq_custom_task_definition
    ON custom_definitions(tenant_id, project_id) WHERE kind='TASK' AND deleted_at IS NULL;

CREATE TABLE custom_fields (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    definition_id uuid NOT NULL,
    display_name varchar(120) NOT NULL,
    physical_column varchar(63) NOT NULL,
    data_type varchar(20) NOT NULL CHECK (data_type IN ('TEXT','NUMBER','BOOLEAN','DATE','SINGLE_SELECT')),
    options_json jsonb NOT NULL DEFAULT '[]'::jsonb,
    required boolean NOT NULL DEFAULT false,
    position integer NOT NULL DEFAULT 0,
    status varchar(20) NOT NULL CHECK (status IN ('PENDING','ACTIVE','FAILED')),
    version bigint NOT NULL DEFAULT 0,
    last_error varchar(500),
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, id),
    FOREIGN KEY (tenant_id, definition_id) REFERENCES custom_definitions(tenant_id, id),
    UNIQUE (tenant_id, definition_id, physical_column)
);

CREATE TABLE customization_schema_jobs (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    definition_id uuid NOT NULL,
    field_id uuid,
    operation varchar(30) NOT NULL CHECK (operation IN ('CREATE_DEFINITION','ADD_FIELD')),
    target_version bigint NOT NULL,
    status varchar(20) NOT NULL CHECK (status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED')),
    attempts integer NOT NULL DEFAULT 0,
    available_at timestamptz NOT NULL DEFAULT now(),
    last_error varchar(500),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, id),
    FOREIGN KEY (tenant_id, definition_id) REFERENCES custom_definitions(tenant_id, id),
    FOREIGN KEY (tenant_id, field_id) REFERENCES custom_fields(tenant_id, id)
);

CREATE UNIQUE INDEX uq_custom_schema_job_version
    ON customization_schema_jobs(tenant_id, definition_id, operation, target_version, coalesce(field_id,'00000000-0000-0000-0000-000000000000'::uuid));

CREATE TABLE approval_workflows (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    board_id uuid NOT NULL,
    completion_column_id uuid NOT NULL,
    name varchar(120) NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    version bigint NOT NULL DEFAULT 0,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, id),
    FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id),
    FOREIGN KEY (tenant_id, board_id) REFERENCES boards(tenant_id, id),
    FOREIGN KEY (tenant_id, completion_column_id) REFERENCES board_columns(tenant_id, id),
    UNIQUE (tenant_id, board_id)
);

CREATE TABLE approval_workflow_steps (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    workflow_id uuid NOT NULL,
    name varchar(120) NOT NULL,
    position integer NOT NULL,
    approval_mode varchar(10) NOT NULL CHECK (approval_mode IN ('ANY','ALL')),
    PRIMARY KEY (tenant_id, id),
    FOREIGN KEY (tenant_id, workflow_id) REFERENCES approval_workflows(tenant_id, id) ON DELETE CASCADE,
    UNIQUE (tenant_id, workflow_id, position)
);

CREATE TABLE approval_step_approvers (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    step_id uuid NOT NULL,
    user_id uuid NOT NULL,
    PRIMARY KEY (tenant_id, id),
    FOREIGN KEY (tenant_id, step_id) REFERENCES approval_workflow_steps(tenant_id, id) ON DELETE CASCADE,
    UNIQUE (tenant_id, step_id, user_id)
);

CREATE TABLE approval_runs (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    workflow_id uuid NOT NULL,
    workflow_version bigint NOT NULL,
    project_id uuid NOT NULL,
    completion_column_id uuid NOT NULL,
    task_id uuid NOT NULL,
    submitted_by uuid NOT NULL,
    status varchar(20) NOT NULL CHECK (status IN ('PENDING','APPROVED','REJECTED','WITHDRAWN','INVALIDATED')),
    current_step integer NOT NULL DEFAULT 1,
    version bigint NOT NULL DEFAULT 0,
    task_snapshot_json jsonb NOT NULL,
    completed_at timestamptz,
    invalidated_at timestamptz,
    invalidation_reason varchar(120),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, id),
    FOREIGN KEY (tenant_id, workflow_id) REFERENCES approval_workflows(tenant_id, id),
    FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id),
    FOREIGN KEY (tenant_id, completion_column_id) REFERENCES board_columns(tenant_id, id),
    FOREIGN KEY (tenant_id, task_id) REFERENCES tasks(tenant_id, id)
);

CREATE UNIQUE INDEX uq_pending_approval_task
    ON approval_runs(tenant_id, task_id) WHERE status='PENDING';

CREATE TABLE approval_run_steps (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    run_id uuid NOT NULL,
    position integer NOT NULL,
    name varchar(120) NOT NULL,
    approval_mode varchar(10) NOT NULL CHECK (approval_mode IN ('ANY','ALL')),
    status varchar(20) NOT NULL CHECK (status IN ('WAITING','PENDING','APPROVED','REJECTED')),
    PRIMARY KEY (tenant_id, id),
    FOREIGN KEY (tenant_id, run_id) REFERENCES approval_runs(tenant_id, id) ON DELETE CASCADE,
    UNIQUE (tenant_id, run_id, position)
);

CREATE TABLE approval_run_approvers (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    run_step_id uuid NOT NULL,
    user_id uuid NOT NULL,
    active boolean NOT NULL DEFAULT true,
    replaced_by_user_id uuid,
    replaced_at timestamptz,
    decision varchar(20) CHECK (decision IN ('APPROVED','REJECTED')),
    decided_at timestamptz,
    PRIMARY KEY (tenant_id, id),
    FOREIGN KEY (tenant_id, run_step_id) REFERENCES approval_run_steps(tenant_id, id) ON DELETE CASCADE,
    UNIQUE (tenant_id, run_step_id, user_id)
);

CREATE TABLE automation_rules (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    name varchar(120) NOT NULL,
    trigger_type varchar(30) NOT NULL CHECK (trigger_type IN ('TASK_CREATED','TASK_MOVED','APPROVAL_APPROVED','APPROVAL_REJECTED')),
    trigger_board_id uuid,
    trigger_column_id uuid,
    action_type varchar(30) NOT NULL CHECK (action_type IN ('ASSIGN_USER','NOTIFY_USERS')),
    action_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
    enabled boolean NOT NULL DEFAULT true,
    version bigint NOT NULL DEFAULT 0,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, id),
    FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id)
);

CREATE TABLE automation_executions (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    rule_id uuid NOT NULL,
    source_event_id uuid NOT NULL,
    rule_version bigint NOT NULL,
    status varchar(20) NOT NULL CHECK (status IN ('RUNNING','SUCCEEDED','FAILED','SKIPPED')),
    attempts integer NOT NULL DEFAULT 0,
    error_code varchar(80),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, id),
    FOREIGN KEY (tenant_id, rule_id) REFERENCES automation_rules(tenant_id, id),
    UNIQUE (tenant_id, rule_id, source_event_id)
);

CREATE INDEX idx_custom_definitions_project ON custom_definitions(tenant_id, project_id, deleted_at);
CREATE INDEX idx_custom_jobs_ready ON customization_schema_jobs(tenant_id, status, available_at);
CREATE INDEX idx_approval_runs_task ON approval_runs(tenant_id, task_id, created_at DESC);
CREATE INDEX idx_automation_rules_trigger ON automation_rules(tenant_id, project_id, trigger_type, enabled);

DO $rls$
DECLARE
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'custom_definitions','custom_fields','customization_schema_jobs',
        'approval_workflows','approval_workflow_steps','approval_step_approvers',
        'approval_runs','approval_run_steps','approval_run_approvers',
        'automation_rules','automation_executions'
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
