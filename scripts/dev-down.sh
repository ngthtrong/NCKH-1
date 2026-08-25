#!/usr/bin/env bash
set -Eeuo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
compose_file="$repository_root/infra/compose.yaml"
environment_file="${ENV_FILE:-$repository_root/infra/.env}"

if [[ ! -f "$environment_file" ]]; then
  echo "Environment file not found: $environment_file" >&2
  exit 1
fi

# Volumes are deliberately preserved. Follow infra/runbooks/local-development.md
# for the explicit destructive reset command.
docker compose --env-file "$environment_file" -f "$compose_file" down --remove-orphans
