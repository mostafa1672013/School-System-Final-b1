/**
 * Tests for server/src/lib/pagination.ts
 * Verifies: MAX_PAGE_SIZE clamp, LEGACY_CAP, buildPaginatedResult shape.
 * SC-001 / SC-002 regression guard.
 */
import type { Request } from 'express';
import {
  paginate,
  buildPaginatedResult,
  MAX_PAGE_SIZE,
  LEGACY_CAP,
} from '../lib/pagination';

/** Build a minimal Express Request mock with given query params. */
function mockReq(query: Record<string, string | undefined>): Request {
  return { query } as unknown as Request;
}

describe('pagination constants', () => {
  it('MAX_PAGE_SIZE is 100', () => {
    expect(MAX_PAGE_SIZE).toBe(100);
  });
  it('LEGACY_CAP is 500', () => {
    expect(LEGACY_CAP).toBe(500);
  });
});

describe('paginate(req) — legacy mode (no page param)', () => {
  it('is not paginated', () => {
    const p = paginate(mockReq({}));
    expect(p.isPaginated).toBe(false);
  });

  it('uses LEGACY_CAP for take', () => {
    const p = paginate(mockReq({}));
    expect(p.take).toBe(LEGACY_CAP);
  });

  it('page=1, skip=0', () => {
    const p = paginate(mockReq({}));
    expect(p.page).toBe(1);
    expect(p.skip).toBe(0);
  });
});

describe('paginate(req) — paginated mode (page param present)', () => {
  it('is paginated when page is present', () => {
    const p = paginate(mockReq({ page: '1' }));
    expect(p.isPaginated).toBe(true);
  });

  it('clamps pageSize to MAX_PAGE_SIZE (100) even when client sends 99999', () => {
    const p = paginate(mockReq({ page: '1', pageSize: '99999' }));
    expect(p.pageSize).toBeLessThanOrEqual(MAX_PAGE_SIZE);
    expect(p.take).toBeLessThanOrEqual(MAX_PAGE_SIZE);
  });

  it('clamps pageSize to MAX_PAGE_SIZE (100) even when client sends 500', () => {
    const p = paginate(mockReq({ page: '1', pageSize: '500' }));
    expect(p.pageSize).toBe(MAX_PAGE_SIZE);
    expect(p.take).toBe(MAX_PAGE_SIZE);
  });

  it('respects pageSize when within limit', () => {
    const p = paginate(mockReq({ page: '1', pageSize: '50' }));
    expect(p.pageSize).toBe(50);
    expect(p.take).toBe(50);
  });

  it('computes skip correctly for page 2', () => {
    const p = paginate(mockReq({ page: '2', pageSize: '50' }));
    expect(p.skip).toBe(50);
    expect(p.page).toBe(2);
  });

  it('treats garbage pageSize as MAX_PAGE_SIZE', () => {
    const p = paginate(mockReq({ page: '1', pageSize: 'abc' }));
    expect(p.pageSize).toBe(MAX_PAGE_SIZE);
  });

  it('treats page < 1 as 1', () => {
    const p = paginate(mockReq({ page: '-5' }));
    expect(p.page).toBe(1);
    expect(p.skip).toBe(0);
  });
});

describe('buildPaginatedResult()', () => {
  const p = paginate(mockReq({ page: '2', pageSize: '50' }));

  it('data.length <= pageSize always', () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ id: i }));
    const result = buildPaginatedResult(rows, 300, p);
    expect(result.data.length).toBeLessThanOrEqual(p.pageSize);
  });

  it('total reflects all matching rows not just the page', () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ id: i }));
    const result = buildPaginatedResult(rows, 300, p);
    expect(result.total).toBe(300);
  });

  it('totalPages is correct', () => {
    const result = buildPaginatedResult([], 300, p);
    expect(result.totalPages).toBe(6); // ceil(300/50)
  });

  it('envelope has { data, page, pageSize, total, totalPages }', () => {
    const result = buildPaginatedResult([{ id: 1 }], 1, paginate(mockReq({ page: '1', pageSize: '10' })));
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('pageSize');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('totalPages');
  });

  it('totalPages is at least 1 even when total = 0', () => {
    const result = buildPaginatedResult([], 0, p);
    expect(result.totalPages).toBeGreaterThanOrEqual(1);
  });
});
