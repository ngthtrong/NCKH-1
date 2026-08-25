#!/bin/sh
set -eu

for required_name in CONTROL_DB_NAME CONTROL_DB_USER CONTROL_DB_PASSWORD POOL_DB_NAME POOL_DB_USER POOL_DB_PASSWORD PROVISIONER_DB_USER PROVISIONER_DB_PASSWORD MIGRATION_DB_USER MIGRATION_DB_PASSWORD; do
  eval "required_value=\${$required_name:-}"
  if [ -z "$required_value" ]; then
    echo "Missing required environment variable: $required_name" >&2
    exit 1
  fi
done

for identifier_name in CONTROL_DB_NAME CONTROL_DB_USER POOL_DB_NAME POOL_DB_USER PROVISIONER_DB_USER MIGRATION_DB_USER; do
  eval "identifier_value=\${$identifier_name}"
  case "$identifier_value" in
    *[!A-Za-z0-9_]* | [0-9]* | "")
      echo "$identifier_name must be a PostgreSQL identifier containing only letters, digits, and underscores" >&2
      exit 1
      ;;
  esac
done

psql --set ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  --set control_db="$CONTROL_DB_NAME" \
  --set control_user="$CONTROL_DB_USER" \
  --set control_password="$CONTROL_DB_PASSWORD" \
  --set pool_db="$POOL_DB_NAME" \
  --set pool_user="$POOL_DB_USER" \
  --set pool_password="$POOL_DB_PASSWORD" \
  --set provisioner_user="$PROVISIONER_DB_USER" \
  --set provisioner_password="$PROVISIONER_DB_PASSWORD" \
  --set migration_user="$MIGRATION_DB_USER" \
  --set migration_password="$MIGRATION_DB_PASSWORD" <<'EOSQL'
SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS',
  :'control_user', :'control_password'
) WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'control_user') \gexec

SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS',
  :'pool_user', :'pool_password'
) WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'pool_user') \gexec

SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER CREATEDB CREATEROLE INHERIT NOBYPASSRLS',
  :'provisioner_user', :'provisioner_password'
) WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'provisioner_user') \gexec

SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS',
  :'migration_user', :'migration_password'
) WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'migration_user') \gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'control_db', :'provisioner_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'control_db') \gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'pool_db', :'provisioner_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'pool_db') \gexec

SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', :'control_db') \gexec
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', :'pool_db') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'control_db', :'control_user') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'control_db', :'migration_user') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'pool_db', :'pool_user') \gexec

\connect :control_db
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'control_user') \gexec
SELECT format('GRANT USAGE, CREATE ON SCHEMA public TO %I', :'migration_user') \gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
  :'migration_user', :'control_user'
) \gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO %I',
  :'migration_user', :'control_user'
) \gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
  :'provisioner_user', :'control_user'
) \gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO %I',
  :'provisioner_user', :'control_user'
) \gexec

\connect :pool_db
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'pool_user') \gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
  :'provisioner_user', :'pool_user'
) \gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO %I',
  :'provisioner_user', :'pool_user'
) \gexec
EOSQL
