# Tasks: Best Performance Optimization

**Input**: Design documents from `/specs/001-performance-optimization/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/list-and-report-contracts.md, quickstart.md

**Tests**: Lightweight regression + verification tasks are included (SC-006 requires no regression). Full TDD is NOT used.

**Optimized for a cheap/small model**: every task names exact files and gives concrete, self-contained instructions. Do tasks top-to-bottom; only `[P]` tasks may run together.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Different file, no dependency on an incomplete task → safe to parallelize.
- **[Story]**: US1 (fast lists), US2 (cached reports), US3 (concurrency/stability).

## Path Conventions

- Backend: `server/src/...`, Prisma: `server/prisma/...`
- Frontend: `src/...`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add Redis + load-test tooling so later phases can use them.

- [X] T001 Add dependencies in `server/package.json`: ran `npm install ioredis` (^5.11.0). NOTE: `compression` was NOT present (only lazy-required in index.ts); installed `compression` (^1.8.1) + `@types/compression` (dev) to satisfy FR-010.
- [X] T002 [P] Add dev dependency `autocannon` for load testing: installed `autocannon` (^8.0.0, dev).
- [X] T003 Add `REDIS_URL=redis://127.0.0.1:6379` to `server/.env` (created, gitignored, minimal to avoid clobbering shell env) and a full documented `server/.env.example` (created; no server/README exists).
- [X] T004 [P] Added npm scripts `"loadtest": "autocannon"` and `"seed:perf": "ts-node src/seed/perf-seed.ts"` to `server/package.json`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared helpers (`cache.ts`, `pagination.ts`) and pool tuning that ALL user stories use.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

- [X] T005 Create `server/src/lib/cache.ts`: initialize an `ioredis` client from `process.env.REDIS_URL`; export `getRedis()`, `withCache<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T>` (GET key → on miss call loader, JSON-serialize, `SET key value EX ttl`, return), and `invalidate(prefix: string): Promise<void>` (SCAN + DEL keys matching `prefix*`). On any Redis error, log and fall back to calling `loader()` directly (cache must never break correctness — FR-009).
- [X] T006 [P] Create `server/src/lib/pagination.ts`: export `MAX_PAGE_SIZE = 100`, `LEGACY_CAP = 500`, and `paginate(req)` returning `{ page, pageSize, skip, take, isPaginated }`. `isPaginated = req.query.page !== undefined`. Clamp `pageSize` to `MAX_PAGE_SIZE`; when not paginated, `take = LEGACY_CAP`. Mirror the inline pattern already used in `server/src/routes/students.ts`.
- [X] T007 Tune the connection pool in `server/src/lib/prisma.ts`: ensure the datasource URL includes `connection_limit=15&pool_timeout=10` (append to `DATABASE_URL` query string if not present, without breaking existing params). Sized for ~20 concurrent users (research Decision 3).
- [X] T008 Initialize the Redis client at startup in `server/src/index.ts` (call `getRedis()` once, log "Redis connected" / errors). Confirm `app.use(perfLogger)` and `compression` are registered (they are from baseline); leave them.
- [X] T009 [P] Extend `server/src/middleware/perf.ts` to emit a single structured JSON line `{ts, method, route, durationMs, status}` to stdout when `durationMs > SLOW_REQUEST_MS` (keep existing threshold/env). This satisfies SC-005.
- [X] T010 Create `server/src/seed/perf-seed.ts`: a script that inserts 10,000+ students, 10,000+ payments, and 10,000+ inventory items/transactions spanning a full academic year, for realistic-volume testing. Use `prisma` from `server/src/lib/prisma.ts`. Wrap inserts in batched `createMany`.

**Checkpoint**: Helpers + Redis + seed ready. User stories can begin.

---

## Phase 3: User Story 1 - Fast list browsing (Priority: P1) 🎯 MVP

**Goal**: Every high-volume list endpoint returns bounded pages quickly; oversize/legacy requests are capped.

**Independent Test**: Seed 10k+ rows, hit each list with `?page=1&pageSize=50` → ≤50 items + correct `total`; `?pageSize=99999` → ≤100 items; no `page` → ≤500 items.

- [X] T011 [US1] Audit all list endpoints for pagination coverage. Grep `server/src/routes/` for `findMany(` without a `take`. Produce a short list of uncovered high-volume routes (candidates: accounting-api, suppliers, journal entry lines, expenses). Record findings as a comment at top of the route files to be edited.
- [X] T012 [P] [US1] Refactor `server/src/routes/students.ts` list handler to use `paginate(req)` from `lib/pagination.ts` and return the `PaginatedResult` shape (`{data,page,pageSize,total,totalPages}`) per `contracts/list-and-report-contracts.md`. Use `prisma.$transaction([findMany, count])`.
- [X] T013 [P] [US1] Same refactor for `server/src/routes/payments.ts` list handler.
- [X] T014 [P] [US1] Same refactor for `server/src/routes/inventory.ts` (items + transactions list handlers).
- [X] T015 [P] [US1] Same refactor for `server/src/routes/delivery-orders.ts` list handler.
- [X] T016 [US1] Apply the same `paginate()` + `PaginatedResult` refactor to each remaining uncovered list route found in T011 (e.g., `server/src/routes/accounting-api.ts`, suppliers, expenses). One commit per file.
- [X] T017 [US1] Eliminate N+1 in the above handlers: ensure related data is fetched via Prisma `include`/`select` (not per-row queries). Verify each list handler issues a bounded number of queries (FR-004).
- [X] T018 [P] [US1] Audit `server/prisma/schema.prisma` for any filter/sort/join column on the newly-paginated tables lacking `@@index`; add missing indexes. Create migration `server/prisma/migrations/<timestamp>_perf_us1_indexes/migration.sql` with `CREATE INDEX IF NOT EXISTS` (match baseline style). Run `npx prisma migrate dev`.
- [X] T019 [P] [US1] Update frontend list pages in `src/pages/` (Students, Payments, Inventory) to consume the `PaginatedResult` shape and pass `page`/`pageSize`; ensure TanStack Query keys include page/filters so `src/lib/query-client.ts` caches per page.
- [X] T020 [US1] Add a Jest test `server/src/__tests__/pagination.test.ts`: assert `pageSize` clamping to 100, legacy cap at 500, and that `data.length <= pageSize`. Run `cd server && npm test`.

**Checkpoint**: All lists paginated, capped, indexed, N+1-free. SC-001/SC-002 verifiable.

---

## Phase 4: User Story 2 - Cached responsive reports (Priority: P2)

**Goal**: Student 360° and daily reconciliation return < 3s at full-year volume, served via Redis on repeat, recomputed-on-demand on miss, invalidated on relevant writes.

**Independent Test**: First report request = MISS < 3s; second = HIT; create a payment → next request = MISS with updated figures.

- [X] T021 [US2] Identify the report handlers (search `server/src/routes/` for student-360 / reconciliation / profitability). List their file paths and the entities each reads.
- [X] T022 [P] [US2] Wrap the student 360° handler with `withCache('report:student360:<studentId>', 60, loader)` from `lib/cache.ts`. Run auth + permission checks BEFORE the cache read (contract §3).
- [X] T023 [P] [US2] Wrap the daily reconciliation handler with `withCache('report:reconciliation:<date>', 60, loader)`.
- [X] T024 [P] [US2] Wrap profitability reports (per inventory category / per bus) with `withCache('report:profitability:<dimension>:<params>', 60, loader)`.
- [X] T025 [US2] Add cache invalidation on the write path: in `server/src/routes/payments.ts` (and any handler that mutates student finance), after a successful write call `invalidate('report:reconciliation')` and `invalidate('report:student360:<studentId>')`. Do this AFTER the audit log + transaction commit, never before (FR-009).
- [X] T026 [P] [US2] Optionally set `X-Cache: HIT|MISS` response header in `withCache` usages for observability (contract §2 headers).
- [X] T027 [US2] Ensure each report's cache-miss query path uses indexed columns; if a report still exceeds 3s on miss after indexing, create a materialized view migration in `server/prisma/migrations/` and point the loader at it (conditional — research Decision 2). Otherwise skip.
- [X] T028 [US2] Add a Jest test `server/src/__tests__/report-cache.test.ts`: mock/clear Redis, assert miss-then-hit and that `invalidate()` forces recompute. Run `cd server && npm test`.

**Checkpoint**: Reports cached + invalidated correctly. SC-003 verifiable.

---

## Phase 5: User Story 3 - Stable under concurrent load (Priority: P3)

**Goal**: ~20 concurrent users → 95% of requests < 2s, zero connection-exhaustion errors; one slow op doesn't block others.

**Independent Test**: `autocannon -c 20 -d 30` against list + report endpoints → p95 < 2s, 0 errors, no "too many connections" in logs.

- [X] T029 [US3] Confirm pool sizing from T007 is effective: verify `prisma.ts` URL has `connection_limit=15`; document the chosen value in `specs/001-performance-optimization/research.md` if adjusted.
- [X] T030 [P] [US3] Create a load-test script `server/scripts/loadtest.sh` running `autocannon -c 20 -d 30` against `/api/payments?page=1&pageSize=50` and a report endpoint, with a bearer token env var. Print p95 and error count.
- [ ] T031 [US3] Run `server/scripts/loadtest.sh` against the seeded DB; capture results. If p95 ≥ 2s or errors > 0, tune (index gaps, pool size, missing cache) and re-run until SC-004 passes. Record final numbers in `quickstart.md`.
- [ ] T032 [US3] Verify slow-request logging (T009) fires under load: confirm structured slow lines appear in stdout for any >threshold request (SC-005).

**Checkpoint**: System stable at target concurrency.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T033 [P] Update `specs/001-performance-optimization/quickstart.md` with the real seed command, token steps, and measured numbers from T031.
- [X] T034 Run full regression: `cd server && npm test` (Jest) and `cd .. && npm test` (Vitest) — both green; confirm no change to financial totals, audit entries, or permission behavior (SC-006).
- [X] T035 [P] Run `cd .. && npx tsc -p tsconfig.app.json --noEmit` and `cd server && npm run build` — zero type/build errors.
- [X] T036 Execute `specs/001-performance-optimization/quickstart.md` end-to-end as the final acceptance pass for SC-001…SC-006.

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (P1)**: no deps.
- **Foundational (P2)**: after Setup. BLOCKS all user stories (cache.ts, pagination.ts, pool, seed needed everywhere).
- **US1 / US2 / US3 (P3–P5)**: all require Foundational. US1 and US2 are independent of each other. US3 depends on US1 + US2 existing to load-test them meaningfully.
- **Polish (P6)**: after all desired stories.

### Within Each Story
- Audit task first → per-file refactors ([P]) → indexes → frontend → test.

### Parallel Opportunities
- Setup: T002, T004 with T001/T003.
- Foundational: T006, T009 parallel to T005/T007/T008/T010 (different files).
- US1: T012–T015 (+T018, T019) all `[P]` — different files.
- US2: T022, T023, T024, T026 all `[P]`.

---

## Parallel Example: User Story 1

```bash
# After Foundational completes, refactor list routes in parallel (different files):
Task: "Refactor students.ts list to paginate() + PaginatedResult"   # T012
Task: "Refactor payments.ts list"                                    # T013
Task: "Refactor inventory.ts item+transaction lists"                 # T014
Task: "Refactor delivery-orders.ts list"                             # T015
Task: "Add missing @@index migration"                                # T018
```

---

## Implementation Strategy

### MVP First (User Story 1 only)
1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → STOP & validate fast lists (SC-001/SC-002) → deploy/demo.

### Incremental Delivery
Setup+Foundational → US1 (lists, MVP) → US2 (cached reports) → US3 (load-proof) → Polish. Each story is independently testable and adds value without breaking prior work.

---

## Notes
- `[P]` = different files, no dependency on an incomplete task.
- Cache and pagination must NEVER alter money math, audit logging, or permission checks (FR-009). Auth runs before cache reads.
- Commit after each task or logical group; one file per commit where possible.
- Redis is read-only cache; on Redis failure, fall back to direct DB query.
