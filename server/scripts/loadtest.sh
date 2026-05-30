#!/usr/bin/env bash
# Load test: verify SC-004 (p95 < 2s, 0 errors, ~20 concurrent users).
#
# Prerequisites:
#   - Server running on $BASE_URL (default http://127.0.0.1:4000)
#   - npm run seed:perf run at least once
#   - BEARER_TOKEN env set to a valid JWT
#
# Usage:
#   BEARER_TOKEN=<token> bash server/scripts/loadtest.sh
#   BASE_URL=http://staging:4000 BEARER_TOKEN=<token> bash server/scripts/loadtest.sh

set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
TOKEN="${BEARER_TOKEN:-}"
CONCURRENCY="${CONCURRENCY:-20}"
DURATION="${DURATION:-30}"

if [[ -z "$TOKEN" ]]; then
  echo "Error: BEARER_TOKEN is not set. Export a valid JWT before running."
  exit 1
fi

echo "=== Performance Load Test ==="
echo "Target:      $BASE_URL"
echo "Concurrency: $CONCURRENCY concurrent connections"
echo "Duration:    ${DURATION}s per scenario"
echo "Threshold:   p95 < 2000ms, 0 non-2xx errors"
echo ""

run() {
  local label="$1"
  local url="$2"
  echo "--- $label ---"
  npx --yes autocannon \
    -c "$CONCURRENCY" \
    -d "$DURATION" \
    -H "Authorization: Bearer $TOKEN" \
    --json \
    "$url" | node -e "
      const chunks = [];
      process.stdin.on('data', c => chunks.push(c));
      process.stdin.on('end', () => {
        const r = JSON.parse(Buffer.concat(chunks).toString());
        const p95 = r.latency.p97_5 ?? r.latency.p95;
        const errors = r.non2xx || 0;
        const rps = r.requests.average;
        console.log('  Requests/sec: ' + rps.toFixed(0));
        console.log('  p95 latency:  ' + p95 + 'ms  (target: <2000ms)');
        console.log('  Non-2xx:      ' + errors + '  (target: 0)');
        const pass = p95 < 2000 && errors === 0;
        console.log('  Result:       ' + (pass ? 'PASS ✓' : 'FAIL ✗'));
        if (!pass) process.exitCode = 1;
      });
    "
  echo ""
}

# SC-004: paginated payments list (hot path, typical staff query)
run "Payments list (paginated)" \
  "${BASE_URL}/api/payments?page=1&pageSize=50"

# SC-003: Student 360 report (cache miss on first, hit on second)
# Use a test student ID if STUDENT_ID env is set, otherwise skip
if [[ -n "${STUDENT_ID:-}" ]]; then
  run "Student 360 report" \
    "${BASE_URL}/api/reports/student-360/${STUDENT_ID}"
else
  echo "(Skipping student-360 — set STUDENT_ID env to enable)"
fi

echo "=== Load test complete ==="
