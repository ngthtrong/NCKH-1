-- Role 1: kanban_migrator (used by Flyway to create tables, indexes, and RLS policies)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'kanban_migrator') THEN
        CREATE ROLE kanban_migrator WITH LOGIN PASSWORD 'tenantflow-migrator-pass' NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
END
$$;

-- Role 2: kanban_app_user (used by Spring Boot runtime; MUST NOT bypass RLS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'kanban_app_user') THEN
        CREATE ROLE kanban_app_user WITH LOGIN PASSWORD 'tenantflow-app-user-pass' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE kanban_saas_db TO kanban_migrator;
GRANT ALL ON SCHEMA public TO kanban_migrator;
GRANT USAGE ON SCHEMA public TO kanban_app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE kanban_migrator IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kanban_app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE kanban_migrator IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO kanban_app_user;
