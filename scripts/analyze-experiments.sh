#!/usr/bin/env bash
set -Eeuo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
input_directory="${EXPERIMENT_INPUT:-$repository_root/experiments/results}"
output_directory="${EXPERIMENT_OUTPUT:-$repository_root/experiments/derived}"
minimum_replicates="${MINIMUM_REPLICATES:-3}"

python3 "$repository_root/experiments/analysis/analyze_results.py" \
  --input "$input_directory" \
  --output "$output_directory" \
  --minimum-replicates "$minimum_replicates"
