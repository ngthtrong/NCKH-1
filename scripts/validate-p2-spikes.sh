#!/usr/bin/env bash
set -Eeuo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
arguments=(--plan-root "$repository_root/experiments/spikes/plans")

if [[ $# -gt 0 ]]; then
  arguments+=(--evidence-root "$1")
fi
if [[ "${2:-}" == "--require-complete" ]]; then
  arguments+=(--require-complete)
elif [[ $# -gt 1 ]]; then
  echo "Usage: $0 [evidence-root [--require-complete]]" >&2
  exit 2
fi

python3 "$repository_root/experiments/analysis/validate_spike_evidence.py" "${arguments[@]}"
