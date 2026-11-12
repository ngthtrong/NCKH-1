#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname -- "${BASH_SOURCE[0]}")/.."
result_directory="$(realpath "${1:?Pass the controlled result directory}")"
python3 - "$result_directory" <<'PYVERIFY'
import json,sys
from pathlib import Path
m=json.loads((Path(sys.argv[1])/'manifest.json').read_text())
assert m['status']=='completed' and sum(r['kind']=='load' for r in m['runs'])==10,'Core load series is incomplete; do not alter its fixtures yet.'
PYVERIFY
export PATH="${NODE22_BIN:-$HOME/.nvm/versions/node/v22.23.4/bin}:$PATH"
export FIXTURE_FILE="$result_directory/fixtures.json"
export CONTROLLED_BROWSER_OUTPUT="$result_directory/browser"
export EXPERIMENT_PORT=18081
docker inspect --format '{{.Name}} {{.Config.Image}} {{.Image}}' nckh-experiment-api-1 nckh-experiment-web-1 > "$result_directory/browser-environment.txt"
node experiments/report/controlled/cache-probe.mjs "$result_directory/cache-probe.json"
python3 experiments/report/controlled/security-sql.py "$result_directory"
python3 experiments/report/controlled/application-plans.py "$result_directory"
node experiments/report/controlled/browser-prepare.mjs "$result_directory/browser-preparation.json"
(
 cd apps/web
 E2E_ENV_FILE=../../infra/.env E2E_ACCOUNTS_URL=http://accounts.localhost:18081 \
 PLAYWRIGHT_CHROMIUM_EXECUTABLE="${PLAYWRIGHT_CHROMIUM_EXECUTABLE:-$HOME/.cache/ms-playwright/chromium-1194/chrome-linux/chrome}" \
 npm run test:e2e -- controlled-report.e2e.ts
)
python3 experiments/report/controlled/analyze.py "$result_directory"
python3 experiments/report/controlled/analyze-resources.py "$result_directory"
python3 experiments/report/controlled/package-results.py "$result_directory"
echo "Reviewable results: $result_directory/RESULTS.md"
