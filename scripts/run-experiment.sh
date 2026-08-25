#!/usr/bin/env bash
set -Eeuo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
scenario="${1:-}"
variant="${2:-not-applicable}"

case "$scenario" in
  smoke | baseline | load | stress)
    if [[ "$variant" != "not-applicable" ]]; then
      echo "Variant must be 'not-applicable' for $scenario." >&2
      exit 2
    fi
    ;;
  noisy-neighbor)
    if [[ "$variant" != "before" && "$variant" != "after" ]]; then
      echo "Usage: $0 noisy-neighbor <before|after>" >&2
      exit 2
    fi
    ;;
  *)
    echo "Usage: $0 <smoke|baseline|load|stress|noisy-neighbor> [before|after]" >&2
    exit 2
    ;;
esac

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 is required. Install it from the official Grafana k6 distribution." >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required to capture the run manifest." >&2
  exit 1
fi

run_id="${RUN_ID:-${scenario}-$(date -u +%Y%m%dT%H%M%S)-$$}"
run_directory="$repository_root/experiments/results/$run_id"
script_relative="experiments/k6/${scenario}.js"
script_path="$repository_root/$script_relative"
manifest_path="$run_directory/manifest.json"
summary_path="$run_directory/summary.json"
raw_path="$run_directory/raw-metrics.json"
resource_path="$run_directory/resource-metrics.json"

mkdir -p "$run_directory"
export RUN_ID="$run_id"
export RATE_LIMIT_VARIANT="$variant"

python3 "$repository_root/experiments/analysis/capture_manifest.py" start \
  --output "$manifest_path" \
  --run-id "$run_id" \
  --scenario "$scenario" \
  --variant "$variant" \
  --script "$script_relative" \
  --summary-file "summary.json" \
  --raw-file "raw-metrics.json" \
  --resource-file "resource-metrics.json"

manifest_finalized=false
finalize_manifest() {
  exit_code=$?
  trap - EXIT
  if [[ "$manifest_finalized" == "false" ]]; then
    status=failed
    if [[ $exit_code -eq 130 || $exit_code -eq 143 ]]; then
      status=aborted
    fi
    python3 "$repository_root/experiments/analysis/capture_manifest.py" finish \
      --output "$manifest_path" --status "$status" || true
  fi
  exit "$exit_code"
}
trap finalize_manifest EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

k6 run \
  --summary-export "$summary_path" \
  --out "json=$raw_path" \
  "$script_path"

python3 "$repository_root/experiments/analysis/capture_manifest.py" finish \
  --output "$manifest_path" --status succeeded
manifest_finalized=true

if ! python3 "$repository_root/experiments/analysis/export_prometheus.py" \
  --manifest "$manifest_path" \
  --output "$resource_path"; then
  echo "Prometheus resource metrics were unavailable; the k6 run remains valid but is incomplete for CPU/RAM/connection comparisons." >&2
fi

echo "Measured run saved to $run_directory"
echo "Analyze completed runs with: scripts/analyze-experiments.sh"
