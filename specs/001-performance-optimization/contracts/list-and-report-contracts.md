# API Contracts: Paginated Lists & Cached Reports

These contracts define the response/parameter shape that performance-affected endpoints MUST conform to. They constrain shape and behavior, not implementation.

## 1. Paginated list endpoints

Applies to: `GET /api/students`, `/api/payments`, `/api/inventory/items`, `/api/inventory/transactions`, `/api/delivery-orders`, and any remaining high-volume list route.

### Query parameters
| Param | Type | Rules |
|-------|------|-------|
| `page` | integer ≥ 1 | optional; presence enables paginated mode |
| `pageSize` | integer ≥ 1 | optional; clamped to `MAX_PAGE_SIZE` (100) |
| (filters) | varies | existing per-route filters preserved |

### Response (paginated mode — `page` present)
```json
{
  "data": [ /* ≤ pageSize items */ ],
  "page": 1,
  "pageSize": 50,
  "total": 12345,
  "totalPages": 247
}
```

### Response (legacy mode — no `page`)
- Returns an array (back-compat) but **capped** at `LEGACY_CAP` (500). MUST NOT return the full table.

### Behavioral contract
- Server enforces `pageSize ≤ MAX_PAGE_SIZE` regardless of client value.
- `data.length ≤ pageSize` always.
- `total` reflects all rows matching filters (not just the page).
- No N+1: related data fetched via `include`/`select` in a bounded query count.

## 2. Cached report endpoints

Applies to: student 360°, daily reconciliation, profitability reports.

### Behavioral contract
- First request (cache miss): computed on-demand from indexed queries, result stored in Redis with TTL.
- Subsequent requests within TTL: served from Redis.
- On relevant mutation (e.g., new payment): affected cache keys invalidated by prefix; next read recomputes.
- Cached data MUST NOT exceed its TTL in staleness (FR-011).
- Response body shape is identical whether served from cache or freshly computed (cache is transparent to the client).

### Headers (optional, advisory)
- MAY include `X-Cache: HIT|MISS` for observability/debugging.

## 3. Invariants across all affected endpoints

- Compression negotiated via `Accept-Encoding` (FR-010).
- Auth and permission checks run **before** any cache read (cache is per-authorized-scope; never serve another user's permission set).
- Financial figures byte-identical to the non-cached computation (FR-009).
- Requests over `SLOW_REQUEST_MS` logged (FR-008).
