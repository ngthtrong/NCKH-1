#!/usr/bin/env bash
set -Eeuo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

python3 -m json.tool "$repository_root/infra/grafana/dashboards/saas-overview.json" >/dev/null
python3 -m json.tool "$repository_root/experiments/schemas/run-manifest.schema.json" >/dev/null
python3 -m json.tool "$repository_root/experiments/schemas/observation.schema.json" >/dev/null
python3 -m json.tool "$repository_root/experiments/schemas/resource-metrics.schema.json" >/dev/null
python3 -m json.tool "$repository_root/experiments/schemas/spike-plan.schema.json" >/dev/null
python3 -m json.tool "$repository_root/experiments/schemas/spike-evidence.schema.json" >/dev/null
python3 -m py_compile \
  "$repository_root/experiments/analysis/analyze_results.py" \
  "$repository_root/experiments/analysis/capture_manifest.py" \
  "$repository_root/experiments/analysis/export_prometheus.py" \
  "$repository_root/experiments/analysis/validate_spike_evidence.py"
python3 -m unittest discover -s "$repository_root/experiments/tests" -v
python3 "$repository_root/experiments/analysis/validate_spike_evidence.py" \
  --plan-root "$repository_root/experiments/spikes/plans"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  docker compose \
    --env-file "$repository_root/infra/.env.example" \
    -f "$repository_root/infra/compose.yaml" \
    config --quiet
else
  echo "Docker Compose is unavailable; skipped Compose interpolation validation." >&2
fi

echo "Infrastructure and experiment static checks passed."
