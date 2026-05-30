/**
 * Shared pagination helper for high-volume list endpoints.
 *
 * Contract (specs/001-performance-optimization/contracts):
 *  - `page` present  → paginated mode; `pageSize` clamped to MAX_PAGE_SIZE.
 *  - `page` absent    → legacy mode; result capped at LEGACY_CAP (never the
 *                       full table).
 *  - `data.length <= pageSize` always; `total` reflects all matching rows.
 *
 * Mirrors the inline pattern previously used in routes/students.ts.
 */
import type { Request } from 'express';

export const MAX_PAGE_SIZE = 100;
export const LEGACY_CAP = 500;

export interface Pagination {
  /** 1-based current page (1 in legacy mode). */
  page: number;
  /** Effective page size (clamped). In legacy mode this is LEGACY_CAP. */
  pageSize: number;
  /** Prisma `skip`. */
  skip: number;
  /** Prisma `take`. */
  take: number;
  /** True when the client supplied a `page` query param. */
  isPaginated: boolean;
}

function toPositiveInt(value: unknown, fallback: number): number {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Derive pagination parameters from the request query.
 * Safe against missing/garbage input — always returns sane bounded values.
 */
export function paginate(req: Request): Pagination {
  const q = req.query as Record<string, unknown>;
  const isPaginated = q.page !== undefined;

  if (!isPaginated) {
    // Legacy array responses: hard cap to avoid accidental full-table loads.
    return {
      page: 1,
      pageSize: LEGACY_CAP,
      skip: 0,
      take: LEGACY_CAP,
      isPaginated: false,
    };
  }

  const page = toPositiveInt(q.page, 1);
  const requested = toPositiveInt(q.pageSize, MAX_PAGE_SIZE);
  const pageSize = Math.min(requested, MAX_PAGE_SIZE);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    isPaginated: true,
  };
}

/**
 * Standard paginated response envelope (contract §1).
 */
export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Build the `PaginatedResult` envelope from rows + total count. */
export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  p: Pagination,
): PaginatedResult<T> {
  return {
    data,
    page: p.page,
    pageSize: p.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
  };
}
