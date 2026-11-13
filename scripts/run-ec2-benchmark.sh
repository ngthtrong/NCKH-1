#!/usr/bin/env bash
# ==============================================================================
# AUTOMATED BENCHMARK RUNNER FOR AWS EC2 (m7i-flex.large: 2 vCPU, 8 GiB RAM)
# Evaluates 3 to 5 Tenants with 10 to 20 Concurrent Users per Tenant (80 VUs total)
# Generates exact tables for Chapter 5 (Report (1).docx)
# ==============================================================================
set -Eeuo pipefail

REPOSITORY_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPOSITORY_ROOT"

DURATION="${1:-60s}"
ENV_FILE="$REPOSITORY_ROOT/infra/.env"
RESULTS_DIR="$REPOSITORY_ROOT/experiments/results/ec2"
mkdir -p "$RESULTS_DIR"

echo "======================================================================"
echo "    NCKH BENCHMARK ON AWS EC2 m7i-flex.large (2 vCPU, 8 GiB RAM)     "
echo "    Scale: 5 Tenants | 80 Concurrent Active Users | Duration: $DURATION"
echo "======================================================================"

# 1. Check prerequisites
if ! command -v docker >/dev/null 2>&1; then
  echo "[!] Docker is not installed. Please install Docker first." >&2
  exit 1
fi

if ! command -v k6 >/dev/null 2>&1; then
  echo "[!] k6 is not installed on the host. We will use the official grafana/k6 Docker container."
  USE_DOCKER_K6=true
else
  USE_DOCKER_K6=false
fi

# 2. Ensure environment file
if [[ ! -f "$ENV_FILE" ]]; then
  echo "[+] Generating $ENV_FILE from template..."
  umask 077
  cp "$REPOSITORY_ROOT/infra/.env.example" "$ENV_FILE"
fi

COMPOSE_CMD=(
  docker compose -p nckh-ec2 --env-file "$ENV_FILE"
  -f "$REPOSITORY_ROOT/infra/compose.yaml"
  -f "$REPOSITORY_ROOT/infra/compose.report.yaml"
  -f "$REPOSITORY_ROOT/infra/compose.ec2.yaml"
)

# 3. Start containers (include worker — needed for new tenant provisioning)
echo ""
echo "[1/5] Starting Docker Stack with EC2 m7i-flex.large resource profile..."
"${COMPOSE_CMD[@]}" up -d --build api redis postgres caddy worker

# 4. Wait for readiness
echo "[2/5] Waiting for Spring Boot 3 API readiness..."
READY=false
for i in $(seq 1 45); do
  if curl --fail --silent -H 'Host: accounts.localhost' "http://127.0.0.1:8080/actuator/health/readiness" >/dev/null 2>&1; then
    READY=true
    echo "    [✓] API is healthy and ready!"
    break
  fi
  sleep 2
done

if [[ "$READY" != "true" ]]; then
  echo "[!] API failed to become ready in 90 seconds. Checking container logs:" >&2
  "${COMPOSE_CMD[@]}" logs --tail 40 api
  exit 1
fi

# 5. Seed 5 Tenants and 10-20 Users each
echo ""
echo "[3/5] Seeding 5 Tenants & 80 Active User Accounts with JWT..."
export POSTGRES_CONTAINER="nckh-ec2-postgres-1"
export HTTP_PORT="8080"
python3 experiments/ec2/seed-tenants.py

# Function to run k6
run_k6() {
  local summary_file="$1"
  if [[ "$USE_DOCKER_K6" == "true" ]]; then
    docker run --rm -i \
      --network host \
      -v "$REPOSITORY_ROOT:/workspace" \
      -w /workspace \
      -e TARGET_HOST="127.0.0.1" \
      -e TARGET_PORT="8080" \
      -e BENCH_DURATION="$DURATION" \
      grafana/k6:0.57.0 run \
      --summary-export="/workspace/$summary_file" \
      experiments/k6/ec2-proposal-benchmark.js
  else
    TARGET_HOST="127.0.0.1" TARGET_PORT="8080" BENCH_DURATION="$DURATION" \
      k6 run --summary-export="$REPOSITORY_ROOT/$summary_file" experiments/k6/ec2-proposal-benchmark.js
  fi
}

# 6. Phase 1: Baseline (Unprotected / Before)
echo ""
echo "[4/5] Running Phase 1: Baseline (RateLimit=OFF, Cache=OFF)..."
RATE_LIMIT_ENABLED=false CACHE_ENABLED=false "${COMPOSE_CMD[@]}" up -d --no-build api
# Bug 5 fix: Spring Boot JVM takes 15-20s to fully warm up after restart.
# Wait 25s to allow GC, JIT compilation and connection pools to stabilise before k6.
sleep 25
run_k6 "experiments/results/ec2/baseline_summary.json"

# 7. Phase 2: Proposed (Protected / After)
echo ""
echo "[5/5] Running Phase 2: Proposed (RateLimit=ON, Cache=ON, FORCE RLS=ON)..."
RATE_LIMIT_ENABLED=true CACHE_ENABLED=true "${COMPOSE_CMD[@]}" up -d --no-build api
sleep 25
run_k6 "experiments/results/ec2/proposed_summary.json"

# 8. Process and format results
echo ""
echo "======================================================================"
echo "    AGGREGATING BENCHMARK RESULTS FOR CHAPTER 5                       "
echo "======================================================================"
python3 scripts/process-ec2-results.py

echo ""
echo "======================================================================"
echo " [✓] COMPLETED! Results are ready in:"
echo "     $RESULTS_DIR/CHAPTER_5_TABLES.md"
echo "======================================================================"
