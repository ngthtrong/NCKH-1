#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname -- "${BASH_SOURCE[0]}")/.."
if [[ ! -f infra/.env ]]; then echo 'Run bash scripts/dev-up.sh first to create the private local environment.' >&2; exit 1; fi
node_binary="${NODE22_BIN:-$HOME/.nvm/versions/node/v22.23.4/bin}"
export PATH="$node_binary:$PATH"
node -e 'if(Number(process.versions.node.split(".")[0])<22)process.exit(1)'
exec 9>/tmp/nckh-controlled-experiment.lock
flock -n 9 || { echo 'An experiment is already running.' >&2; exit 1; }
if docker volume inspect nckh-experiment_postgres-data >/dev/null 2>&1; then
 if [[ "${1:-}" != "--fresh" ]]; then
  echo 'Existing disposable experiment database found. Re-run with --fresh to recreate only nckh-experiment volumes; raw result files are retained.' >&2
  exit 2
 fi
 docker compose -p nckh-experiment --env-file infra/.env \
  -f infra/compose.yaml -f infra/compose.report.yaml -f experiments/report/controlled/compose.yaml down --volumes
fi
docker build -f infra/docker/api.Dockerfile -t nckh-experiment-api:20261112 .
docker build -f infra/docker/web.Dockerfile -t saas-research-web:local .
RATE_LIMIT_ENABLED=false CACHE_ENABLED=true docker compose -p nckh-experiment --env-file infra/.env \
 -f infra/compose.yaml -f infra/compose.report.yaml -f experiments/report/controlled/compose.yaml \
 up -d --no-build api worker web caddy prometheus
python3 experiments/report/controlled/run.py
result_directory="$(python3 - <<'PY'
import json
from pathlib import Path
paths=[p.parent for p in Path('experiments/results/controlled').glob('*/manifest.json') if json.loads(p.read_text()).get('status')=='completed']
print(max(paths,key=lambda p:p.name).resolve())
PY
)"
bash scripts/finish-report-experiments.sh "$result_directory"
