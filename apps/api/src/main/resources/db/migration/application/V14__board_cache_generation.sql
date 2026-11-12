ALTER TABLE boards ADD COLUMN content_version bigint NOT NULL DEFAULT 0;

CREATE FUNCTION bump_task_board_generation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE boards SET content_version=content_version+1 WHERE tenant_id=OLD.tenant_id AND id=OLD.board_id;
        RETURN OLD;
    END IF;
    UPDATE boards SET content_version=content_version+1 WHERE tenant_id=NEW.tenant_id AND id=NEW.board_id;
    RETURN NEW;
END $$;
CREATE TRIGGER tasks_board_generation AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW EXECUTE FUNCTION bump_task_board_generation();

CREATE FUNCTION bump_comment_board_generation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE changed_tenant uuid; changed_task uuid;
BEGIN
    IF TG_OP = 'DELETE' THEN changed_tenant=OLD.tenant_id; changed_task=OLD.task_id;
    ELSE changed_tenant=NEW.tenant_id; changed_task=NEW.task_id;
    END IF;
    UPDATE boards SET content_version=content_version+1
    WHERE tenant_id=changed_tenant AND id IN
        (SELECT board_id FROM tasks WHERE tenant_id=changed_tenant AND id=changed_task);
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER comments_board_generation AFTER INSERT OR UPDATE OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION bump_comment_board_generation();
