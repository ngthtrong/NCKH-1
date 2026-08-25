#!/usr/bin/env bash
set -Eeuo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
compose_file="$repository_root/infra/compose.yaml"
environment_file="${ENV_FILE:-$repository_root/infra/.env}"
example_file="$repository_root/infra/.env.example"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required." >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required." >&2
  exit 1
fi

if [[ ! -f "$environment_file" ]]; then
  umask 077
  cp "$example_file" "$environment_file"
  echo "Created $environment_file from the development-only example."
  echo "Replace all change-me values before using this environment outside an isolated local machine." >&2
fi

docker compose --env-file "$environment_file" -f "$compose_file" config --quiet
docker compose --env-file "$environment_file" -f "$compose_file" up --build --detach

http_port="$(sed -n 's/^HTTP_PORT=//p' "$environment_file" | tail -n 1)"
http_port="${http_port:-8080}"
health_url="http://127.0.0.1:${http_port}/actuator/health"

echo "Waiting for the API readiness endpoint..."
for _ in $(seq 1 60); do
  if curl --fail --silent --show-error -H "Host: accounts.localhost" "$health_url" >/dev/null 2>&1; then
    echo "Local stack is ready: http://accounts.localhost:${http_port}"
    echo "Mailpit: http://127.0.0.1:$(sed -n 's/^MAILPIT_UI_PORT=//p' "$environment_file" | tail -n 1)"
    echo "Grafana: http://127.0.0.1:$(sed -n 's/^GRAFANA_PORT=//p' "$environment_file" | tail -n 1)"
    exit 0
  fi
  sleep 2
done

echo "The stack started but did not become ready within 120 seconds." >&2
docker compose --env-file "$environment_file" -f "$compose_file" ps >&2
exit 1
