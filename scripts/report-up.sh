#!/usr/bin/env bash
set -Eeuo pipefail
repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
environment_file="${ENV_FILE:-$repository_root/infra/.env}"
if [[ ! -f "$environment_file" ]]; then
  (umask 077; cp "$repository_root/infra/.env.example" "$environment_file")
fi
compose=(docker compose --project-name nckh-report --env-file "$environment_file"
  -f "$repository_root/infra/compose.yaml" -f "$repository_root/infra/compose.report.yaml")
"${compose[@]}" config --quiet
"${compose[@]}" up --build --detach api worker web caddy prometheus
http_port="$(sed -n 's/^HTTP_PORT=//p' "$environment_file" | tail -n 1)"
base_domain="$(sed -n 's/^BASE_DOMAIN=//p' "$environment_file" | tail -n 1)"
base_domain="${base_domain:-localhost}"
for _ in $(seq 1 60); do
  if curl --fail --silent -H "Host: accounts.${base_domain}" "http://127.0.0.1:${http_port:-8080}/actuator/health/readiness" >/dev/null; then
    echo "Report demo ready: http://accounts.${base_domain}:${http_port:-8080}"
    echo "Shared-table tenants: t-acme.${base_domain} and t-lotus.${base_domain}"
    exit 0
  fi
  sleep 2
done
"${compose[@]}" ps
echo "The report demo did not become ready; inspect API/worker logs." >&2
exit 1
