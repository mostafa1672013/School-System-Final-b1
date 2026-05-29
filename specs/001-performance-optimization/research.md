# Phase 0 Research: Best Performance Optimization

All clarification-level unknowns were resolved during `/speckit-clarify` (see spec Clarifications, Session 2026-05-29). This document records the technical decisions and the patterns to follow.

## Decision 1 — Caching strategy

- **Decision**: Add a Redis server-side cache for hot reads (aggregated reports, permission lookups, configuration). Keep DB indexing/tuning and the existing client-side TanStack Query cache.
- **Rationale**: Reports and permission/config lookups recompute on every request; Redis absorbs repeat hits cheaply. Chosen explicitly by user (Q1).
- **Pattern**: `ioredis` client in `server/src/lib/cache.ts` exposing `withCache(key, ttl, loader)`, `invalidate(prefix)`. Read-through only — writes never go to cache; the write path emits invalidation. TTLs: reports ~60s, permissions ~300s, config ~600s (align with CLAUDE.md guidance).
- **Alternatives considered**: Query-only (rejected by user); in-process LRU (rejected — doesn't survive restarts or share across workers).

## Decision 2 — Heavy report computation

- **Decision**: Compute reports on-demand from indexed queries on the cache-miss path; cache the result in Redis. Introduce a PostgreSQL materialized view only for a specific report that still misses its 3s target.
- **Rationale**: Avoids materialized-view refresh/staleness complexity until profiling proves it necessary (Q2). Financial views stay current within TTL.
- **Pattern**: Each report service: `withCache('report:<name>:<params>', ttl, () => prisma...)`. Invalidate by prefix on relevant mutations (e.g., a new payment invalidates `report:reconciliation:*` and the affected `report:student360:<id>`).
- **Alternatives considered**: All-reports materialized views (rejected — refresh cost + staleness); incremental summary tables via triggers (rejected — write-path complexity, audit risk).

## Decision 3 — Scale & connection-pool sizing

- **Decision**: Size load tests and the Prisma connection pool for ~20 concurrent users.
- **Rationale**: Single pilot school; ~20 active staff is realistic with headroom (Q3). Over-provisioning the pool on a modest VPS wastes DB memory.
- **Pattern**: Set Prisma `connection_limit` in the datasource URL (e.g., `?connection_limit=15&pool_timeout=10`) on the single `prisma.ts` client. Load test with `autocannon`/`k6` at 20 concurrent.
- **Alternatives considered**: 50 users (rejected — unrealistic for MVP, over-sizes pool); 10 users (rejected — no headroom).

## Decision 4 — Pagination coverage (remaining gaps)

- **Decision**: Apply the existing pagination pattern to any high-volume list endpoint not yet covered; enforce a server-side max page size and cap legacy (non-paginated) calls.
- **Rationale**: FR-001/FR-002. Baseline added pagination to students/payments/inventory/delivery-orders; audit remaining list routes (e.g., accounting, suppliers, journal lines) and close gaps.
- **Pattern**: Extract the repeated inline pattern into `server/src/lib/pagination.ts`: `paginate(req, { maxPageSize, legacyCap })` returning `{ skip, take, isPaginated }`, used with `prisma.$transaction([findMany, count])`.
- **Alternatives considered**: Cursor pagination (deferred — offset is adequate at this scale and matches existing pages).

## Decision 5 — Observability of slow requests

- **Decision**: Keep the existing `perf.ts` slow-request JSON logger; emit structured lines (route, method, duration, status) to stdout for the VPS log collector. No new infra.
- **Rationale**: SC-005 requires 100% capture and reviewability; structured stdout is sufficient at single-VPS scale and avoids adding APM dependencies now. (This was the one Deferred item from clarify.)
- **Alternatives considered**: Sentry/APM (deferred — separate from this performance feature); DB table of slow requests (rejected — adds write load to the thing we're optimizing).

## Decision 6 — Payload compression

- **Decision**: Keep/confirm `compression` middleware enabled for API responses (already added at baseline); verify list endpoints benefit.
- **Rationale**: FR-010 / reduces transfer time for large list pages.
- **Alternatives considered**: None needed.

## Open items carried to implementation

- Confirm exact set of still-unpaginated list endpoints (audit during Task phase).
- Decide final TTL constants in code review.
- Materialized view is conditional — only if a report misses target after Redis + indexing.
