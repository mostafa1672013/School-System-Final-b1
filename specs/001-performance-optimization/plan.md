# Implementation Plan: Best Performance Optimization

**Branch**: `001-performance-optimization` | **Date**: 2026-05-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-performance-optimization/spec.md`

## Summary

Make the school ERP feel instant for daily staff work and stay healthy under realistic load. Primary requirements: bounded/paginated list endpoints with server-enforced page caps and supporting indexes (P1), responsive aggregated reports under target at full-year volume (P2), and stability under ~20 concurrent users with no connection-pool exhaustion (P3). Approach (per clarifications): keep the existing Express + Prisma + PostgreSQL stack; add a **Redis** cache layer for hot reads (reports, permission lookups, configuration) with short TTL + explicit invalidation; compute heavy reports on-demand from indexed queries on cache miss, introducing a materialized view only if a specific report still misses target. Baseline work (≈60 indexes, single Prisma client, pagination on key endpoints, slow-request logging, TanStack Query client cache) is already merged; this feature consolidates targets and closes remaining gaps (cache layer, remaining unpaginated endpoints, pool sizing, compression, load testing).

## Technical Context

**Language/Version**: TypeScript 5 (Node.js, ESM/CommonJS as per current server build)

**Primary Dependencies**: Express, Prisma ORM, `ioredis` (new — Redis client), `compression`, existing JWT auth + Zod validation; frontend React 18 + Vite + TanStack Query

**Storage**: PostgreSQL 16 (primary), Redis (new — hot-read cache only, not a system of record)

**Testing**: Jest (backend), Vitest (frontend), plus a lightweight load-test harness (`autocannon` or `k6`) for SC-004

**Target Platform**: Single Linux VPS (modest resources; no horizontal scaling in MVP)

**Project Type**: Web application — Express API backend (`server/`) + React SPA frontend (`src/`)

**Performance Goals**: First page of any primary list < 1s at 10k+ rows (SC-001); student 360° and daily reconciliation < 3s at full-year volume (SC-003); 95% of requests < 2s under 20 concurrent users (SC-004)

**Constraints**: No regression in financial accuracy, audit logging, or access control (FR-009); cached financial data must never be stale beyond its TTL with explicit invalidation (FR-011); single connection pool reused (FR-007); list payloads compressible (FR-010)

**Scale/Scope**: Single pilot school; full-academic-year data volume (10k+ rows per high-volume table); ~20 concurrent active staff users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution at `.specify/memory/constitution.md` is an **unpopulated template** (placeholder principles only, no ratified version). No enforceable gates are defined. **Gate status: PASS (vacuously)** — no constitutional constraints to violate.

Project-level guardrails from `CLAUDE.md` are nonetheless honored as de facto gates:
- Financial precision via `decimal.js` and `numeric(12,2)` is untouched by this feature. ✅
- Audit logging must continue to fire on all sensitive mutations; caching must not bypass it. ✅ (cache covers reads only)
- Repository/module boundaries preserved; no new cross-module direct DB access introduced. ✅

**Post-Phase 1 re-check**: PASS — design adds a read-through cache and indexes only; no change to write paths, money math, or audit.

## Project Structure

### Documentation (this feature)

```text
specs/001-performance-optimization/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (paginated list + report response contracts)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
server/
├── src/
│   ├── lib/
│   │   ├── prisma.ts          # existing singleton client (pool sizing tuned here)
│   │   ├── cache.ts           # NEW — Redis client + get/set/withCache/invalidate helpers
│   │   └── pagination.ts      # NEW — shared paginate() helper (extract existing inline pattern)
│   ├── middleware/
│   │   └── perf.ts            # existing slow-request logger (extend: structured destination)
│   ├── routes/                # students.ts, payments.ts, inventory.ts, delivery-orders.ts,
│   │                          #   reports/*, accounting-api.ts — apply pagination + cache here
│   └── index.ts               # compression already added; register cache init + pool config
└── prisma/
    ├── schema.prisma          # add any missing @@index found in audit
    └── migrations/            # new migration if indexes/materialized view added

src/                           # frontend (React + Vite)
├── lib/query-client.ts        # existing QueryClient (staleTimes presets) — extend coverage
└── pages/                     # ensure list pages consume paginated API shape
```

**Structure Decision**: Existing two-part web app (Express `server/` + React `src/`). No new top-level structure; this feature adds two backend lib modules (`cache.ts`, `pagination.ts`), tunes the Prisma pool, extends the perf middleware, and finishes pagination/cache coverage across remaining list and report endpoints.

## Complexity Tracking

> No constitution violations to justify. The single notable addition — Redis — is justified by clarification Q1 (chosen over query-only) and is scoped to hot reads with TTL + invalidation, not a system of record.

| Decision | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|--------------------------------------|
| Add Redis cache layer | Reports/permissions/config recompute on every request; per Q1 caching them is in scope | Query-only (rejected by user in Q1); indexes alone leave repeat-hit compute cost |
| Materialized view (conditional) | Fallback if a specific report misses 3s on cache miss | Always-on materialized views add refresh/staleness complexity not yet justified |
