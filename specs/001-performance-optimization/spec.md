# Feature Specification: Best Performance Optimization

**Feature Branch**: `001-performance-optimization`

**Created**: 2026-05-29

**Status**: Draft

**Input**: User description: "create plan for best performance"

## Clarifications

### Session 2026-05-29

- Q: Is a server-side cache (e.g., Redis) in scope, or rely on DB indexes + client cache only? → A: Add Redis server-side caching for hot reads (reports, permissions, config), in addition to DB indexing/tuning and the existing client-side cache.
- Q: How are heavy reports computed on a cache miss (first request / after invalidation)? → A: On-demand tuned/indexed queries cached in Redis; introduce a materialized view only for a specific report that still misses its target on the cache-miss path.
- Q: What concurrent-user count should size load tests and the connection pool? → A: ~20 concurrent users (pilot staff plus headroom).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fast list browsing for daily staff work (Priority: P1)

Accountants, cashiers, and warehouse keepers spend most of their day inside list screens (students, payments, inventory items, transactions). When a list holds thousands of rows, opening or paging through it must feel instant, not stall the browser.

**Why this priority**: These screens are the highest-traffic part of the system. Slowness here directly costs staff time every single day and is the most visible quality signal to the pilot school.

**Independent Test**: Load each major list (students, payments, inventory) seeded with 10,000+ rows, page forward/back and filter; verify results appear quickly and the UI stays responsive without freezing.

**Acceptance Scenarios**:

1. **Given** a students list with 10,000 records, **When** the user opens the page, **Then** the first page of results is visible quickly and only a bounded number of rows are fetched.
2. **Given** a payments list, **When** the user changes page or applies a filter, **Then** new results appear without re-downloading the entire dataset.
3. **Given** any paginated list, **When** the user navigates away and returns shortly after, **Then** previously loaded data is served from cache without an unnecessary refetch.

### User Story 2 - Responsive financial reports and student 360° (Priority: P2)

Managers open aggregated views — student 360°, treasury/daily reconciliation, profitability per category — that combine many records. These must return in a reasonable time even at full-year data volume.

**Why this priority**: Reports are used less frequently than lists but are decision-critical and currently the most likely to be slow because they join across many tables.

**Independent Test**: Generate each report against a full academic year of seeded data and confirm it returns within the target time and without timing out.

**Acceptance Scenarios**:

1. **Given** a full year of transactions, **When** a manager opens the student 360° view, **Then** the complete picture loads within the target time.
2. **Given** the daily reconciliation report, **When** it is requested, **Then** it computes from indexed queries rather than scanning whole tables.

### User Story 3 - System stays healthy under concurrent load (Priority: P3)

Multiple staff use the system simultaneously during peak periods (start of term, fee collection). The system must not exhaust database connections or degrade for everyone because of one heavy operation.

**Why this priority**: Protects availability during the busiest, most financially important windows; lower frequency than daily browsing but high impact when it occurs.

**Independent Test**: Simulate concurrent users hitting list and report endpoints; confirm stable response times and no connection-pool exhaustion.

**Acceptance Scenarios**:

1. **Given** many concurrent requests, **When** load is applied, **Then** response times stay within target and no requests fail due to connection limits.
2. **Given** a single expensive operation, **When** it runs, **Then** it is logged as slow and does not block unrelated requests from completing.

### Edge Cases

- What happens when a list is requested with no pagination parameters (legacy callers)? The system must cap the number of rows returned rather than fetch everything.
- How does the system handle a filter that matches zero rows versus the entire dataset?
- What happens when a report is requested for an empty period or a period with no data?
- How does the system behave when the same user rapidly re-issues identical queries (debounce/cache)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All high-volume list endpoints MUST return results in bounded pages, with a server-enforced maximum page size, and MUST avoid loading entire tables into memory.
- **FR-002**: Legacy (non-paginated) list requests MUST be capped at a safe upper bound so they cannot trigger full-table fetches.
- **FR-003**: Every column used for filtering, sorting, or joining on high-volume tables MUST be backed by a database index.
- **FR-004**: List and detail queries MUST avoid N+1 access patterns by fetching related data in a bounded number of queries.
- **FR-005**: The client MUST cache previously fetched data for a short window and avoid redundant refetches on navigation and window refocus.
- **FR-006**: Aggregated reports MUST compute on-demand from indexed queries on the cache-miss path and MUST return within the defined performance target at full-year data volume; a materialized view MAY be introduced only for a specific report that still misses its target.
- **FR-007**: The system MUST reuse a single shared database connection pool rather than creating new connections per request.
- **FR-011**: The system MUST provide a server-side cache (Redis) for hot reads — aggregated reports, permission lookups, and configuration — with short, bounded time-to-live and explicit invalidation on the underlying data changing, so cached financial data never goes stale beyond its TTL.
- **FR-008**: The system MUST log any request exceeding a configurable slow-request threshold, including route and duration, for monitoring.
- **FR-009**: Performance changes MUST NOT alter financial accuracy, audit logging, or access-control behavior.
- **FR-010**: Response payloads for list endpoints MUST be compressible to reduce transfer time over the network.

### Key Entities *(include if feature involves data)*

- **List dataset**: A large, frequently browsed collection (students, payments, inventory items, inventory transactions). Key attributes: total count, current page, page size, applied filters.
- **Report aggregate**: A computed view combining many records over a period (student 360°, reconciliation, profitability). Key attributes: period bounds, grouping dimension, computed totals.
- **Slow-request record**: An observability entry capturing route, duration, and timestamp for any request over the threshold.
- **Cache entry**: A server-side cached value for a hot read (report result, permission set, or configuration). Key attributes: cache key, time-to-live, invalidation trigger (the underlying entity whose change evicts it).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With 10,000+ rows seeded, any primary list screen shows its first page of results in under 1 second on a typical staff workstation.
- **SC-002**: Paginated list requests transfer at most one bounded page of records, never the full table, regardless of dataset size.
- **SC-003**: The student 360° view and the daily reconciliation report each return in under 3 seconds at full-academic-year data volume.
- **SC-004**: Under 20 concurrent users exercising list and report screens, 95% of requests complete within 2 seconds and zero requests fail due to database connection exhaustion.
- **SC-005**: Slow requests (over the configured threshold) are captured for 100% of occurrences and reviewable for monitoring.
- **SC-006**: No regression in financial totals, audit-log entries, or permission checks after optimization (verified by existing test suites passing).

## Assumptions

- The performance work targets the active Express + Prisma + PostgreSQL system at `/Users/me/Downloads/Project/untitled folder/`, not the separate Next.js codebase.
- Several baseline optimizations are already merged (≈60 indexes, single Prisma client, pagination on key endpoints, slow-request logging, client query caching); this spec consolidates targets and extends coverage to any remaining list/report endpoints.
- Target hardware is a single modest VPS; targets assume no horizontal scaling in the MVP.
- "Full academic year" is treated as the realistic upper bound of pilot-school data volume for sizing tests.
- Caching windows are short (≈60 seconds) so staff always see near-current financial data; correctness takes precedence over aggressive caching.
- A Redis instance is available (or will be provisioned) as part of the deployment; server-side caching of hot reads is in scope for this feature (see Clarifications Q1).
