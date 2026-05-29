# Quickstart: Verifying Performance Optimization

Prerequisites: PostgreSQL 16 running, Redis running, dependencies installed (`npm ci` in repo root and `server/`).

## 1. Bring up Redis
```bash
docker run -d --name school-redis -p 6379:6379 redis:7-alpine
# set REDIS_URL=redis://127.0.0.1:6379 in server/.env
```

## 2. Seed a large dataset
```bash
cd server
# Seed 10k+ students, 12k payments, 10k inventory items, 12k transactions.
# Configurable via PERF_SEED_STUDENTS / PERF_SEED_PAYMENTS / PERF_SEED_ITEMS / PERF_SEED_TX env vars.
npm run seed:perf
```

## 3. Verify pagination (SC-001, SC-002)
```bash
# Paginated mode: bounded payload regardless of dataset size
curl -s "http://127.0.0.1:4000/api/students?page=1&pageSize=50" -H "Authorization: Bearer <token>" | jq '{count: (.data|length), total, totalPages}'
# Expect: count <= 50, total reflects all rows

# Oversize pageSize is clamped
curl -s "http://127.0.0.1:4000/api/students?page=1&pageSize=99999" -H "Authorization: Bearer <token>" | jq '.data|length'
# Expect: <= MAX_PAGE_SIZE (100)

# Legacy mode is capped
curl -s "http://127.0.0.1:4000/api/students" -H "Authorization: Bearer <token>" | jq 'length'
# Expect: <= 500, never full table
```

## 4. Verify report caching (SC-003)
```bash
# Student 360: first call MISS (computed), second HIT (Redis), both < 3s
time curl -s "http://127.0.0.1:4000/api/reports/student-360/<studentId>" \
  -H "Authorization: Bearer <token>" -D - -o /dev/null | grep -i x-cache
# Expect: X-Cache: MISS

time curl -s "http://127.0.0.1:4000/api/reports/student-360/<studentId>" \
  -H "Authorization: Bearer <token>" -D - -o /dev/null | grep -i x-cache
# Expect: X-Cache: HIT

# Profitability report:
time curl -s "http://127.0.0.1:4000/api/distribution/profitability?academicYear=2025-2026" \
  -H "Authorization: Bearer <token>" -D - -o /dev/null | grep -i x-cache

# Grade summary:
time curl -s "http://127.0.0.1:4000/api/distribution/grade-summary?academicYear=2025-2026&term=1" \
  -H "Authorization: Bearer <token>" -D - -o /dev/null | grep -i x-cache

# Invalidation: create a payment for that student, re-request -> MISS again, figures updated
curl -s -X POST "http://127.0.0.1:4000/api/payments" -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" -d '{"studentId":"<id>","amount":1000,...}'
curl -s "http://127.0.0.1:4000/api/reports/student-360/<studentId>" \
  -H "Authorization: Bearer <token>" -D - -o /dev/null | grep -i x-cache
# Expect: X-Cache: MISS (invalidated by payment write)
```

## 5. Load test (SC-004)
```bash
# Quick one-liner:
npx autocannon -c 20 -d 30 "http://127.0.0.1:4000/api/payments?page=1&pageSize=50" -H "Authorization: Bearer <token>"
# Expect: p95 < 2000ms, 0 non-2xx errors, no "too many connections" in server logs

# Full multi-scenario script (also tests student-360):
BEARER_TOKEN=<token> bash server/scripts/loadtest.sh
# Optional: STUDENT_ID=<uuid> to include student-360 scenario
```

## 6. Observability (SC-005)
```bash
# Trigger a slow path and confirm a structured slow-request line is emitted to stdout
grep -i 'slow' <server log>   # JSON line with route + durationMs
```

## 7. No regression (SC-006)
```bash
cd server && npm test          # Jest backend suite green
cd .. && npm test              # Vitest frontend suite green
# Financial totals, audit entries, permission checks unchanged
```
