# Phase 1 Data Model: Best Performance Optimization

This feature is primarily about access patterns, not new business entities. It introduces no new persisted business tables. The "entities" below are operational/runtime constructs plus indexing changes.

## Runtime constructs (not persisted in PostgreSQL)

### PaginatedResult<T>
Shape returned by all high-volume list endpoints.
- `data: T[]` — at most `pageSize` items
- `page: number` — 1-based current page
- `pageSize: number` — clamped to server-enforced `MAX_PAGE_SIZE` (e.g., 100)
- `total: number` — total matching rows (from count query)
- `totalPages: number`
- **Validation**: `pageSize <= MAX_PAGE_SIZE`; legacy (no page param) responses capped at `LEGACY_CAP` (e.g., 500) and flagged.

### CacheEntry (Redis)
- `key: string` — e.g., `report:reconciliation:2026-05-29`, `perm:<userId>`, `config:<code>`
- `value: serialized JSON`
- `ttlSeconds: number` — reports ~60, permissions ~300, config ~600
- `invalidationTrigger` — the mutation/entity whose change evicts this key prefix
- **Lifecycle**: created on cache miss (read-through); evicted on TTL expiry OR explicit `invalidate(prefix)` from the write path. Never the source of truth.

### SlowRequestLog (structured stdout line)
- `route`, `method`, `durationMs`, `status`, `timestamp`
- Emitted only when `durationMs > SLOW_REQUEST_MS` (existing threshold, default 1000)

## PostgreSQL changes

### Indexes
- Audit all high-volume tables for filter/sort/join columns lacking an index (FR-003). Most added at baseline (~60 `@@index`); add any remaining for newly-paginated endpoints.
- New migration under `server/prisma/migrations/` using `CREATE INDEX IF NOT EXISTS` (matches baseline migration style).

### Materialized view (CONDITIONAL — only if a report misses target)
- Candidate: a reconciliation or profitability rollup.
- Refreshed on a schedule or via `REFRESH MATERIALIZED VIEW CONCURRENTLY`.
- **Not created unless** Redis + indexed on-demand query fails the 3s target (per research Decision 2).

## Connection pool (Prisma datasource)
- Single client (`server/src/lib/prisma.ts`); `connection_limit` ~15, `pool_timeout` ~10s, sized for ~20 concurrent users.

## No changes to
- Money fields (`numeric(12,2)` / `decimal.js`), audit_logs structure, auth/RBAC tables, or any write-path business logic.
