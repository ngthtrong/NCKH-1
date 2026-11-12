#!/usr/bin/env bash
set -Eeuo pipefail
repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repository_root"
compose=(docker compose --project-name nckh-report --env-file infra/.env -f infra/compose.yaml -f infra/compose.report.yaml)
tenant_id="$("${compose[@]}" exec -T postgres sh -ec 'psql -U "$POSTGRES_USER" -d "$CONTROL_DB_NAME" -Atc "SELECT id FROM tenants WHERE slug='"'"'t-acme'"'"' AND status='"'"'ACTIVE'"'"'"')"
if [[ ! "$tenant_id" =~ ^[a-f0-9-]{36}$ ]]; then echo "Acme is not ACTIVE yet." >&2; exit 1; fi
result_directory="${REPORT_DATABASE_RESULTS:-experiments/results/development/report-database-$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$result_directory"
"${compose[@]}" exec -T postgres sh -ec \
  'exec psql -U "$POSTGRES_USER" -d "$POOL_DB_NAME" -v runtime_role="$POOL_DB_USER" -v tenant_a="$1"' sh "$tenant_id" \
  < experiments/report/kb2-database.sql > "$result_directory/rls-and-plans.txt"
echo "Measured database evidence: $result_directory/rls-and-plans.txt"
