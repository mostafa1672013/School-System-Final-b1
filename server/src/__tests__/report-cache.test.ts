/**
 * Tests for cache.ts read-through + invalidation behaviour.
 * Uses a mock ioredis client — no real Redis needed in CI.
 * SC-003 regression guard.
 */

// ── Mock ioredis before any imports touch it ──────────────────────────────

const store: Map<string, string> = new Map();
const mockRedis = {
  get: jest.fn(async (key: string) => store.get(key) ?? null),
  set: jest.fn(async (key: string, value: string) => {
    store.set(key, value);
    return 'OK';
  }),
  scan: jest.fn(async (_cursor: string, _match: string, pattern: string, _count: string, n: number) => {
    const keys = [...store.keys()].filter(k => k.startsWith(pattern.replace('*', '')));
    return ['0', keys];
  }),
  del: jest.fn(async (...keys: string[]) => {
    for (const k of keys) store.delete(k);
    return keys.length;
  }),
  on: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

// ── Now import the module under test ─────────────────────────────────────

import { withCache, invalidate, getRedis } from '../lib/cache';

// ── Helpers ───────────────────────────────────────────────────────────────

function clearStore() {
  store.clear();
  jest.clearAllMocks();
  // Reset mock implementations after clearAllMocks
  mockRedis.get.mockImplementation(async (key: string) => store.get(key) ?? null);
  mockRedis.set.mockImplementation(async (key: string, value: string) => {
    store.set(key, value);
    return 'OK';
  });
  mockRedis.scan.mockImplementation(async (_cursor: string, _match: string, pattern: string) => {
    const keys = [...store.keys()].filter(k => k.startsWith(pattern.replace('*', '')));
    return ['0', keys];
  });
  mockRedis.del.mockImplementation(async (...keys: string[]) => {
    for (const k of keys) store.delete(k);
    return keys.length;
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('withCache()', () => {
  beforeEach(clearStore);

  it('calls loader on cache miss', async () => {
    const loader = jest.fn(async () => ({ value: 42 }));
    const result = await withCache('test:miss', 60, loader);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ value: 42 });
  });

  it('stores result in Redis on miss', async () => {
    const loader = jest.fn(async () => ({ value: 42 }));
    await withCache('test:store', 60, loader);
    expect(mockRedis.set).toHaveBeenCalledWith(
      'test:store',
      JSON.stringify({ value: 42 }),
      'EX',
      60,
    );
  });

  it('returns cached value on hit (loader not called)', async () => {
    store.set('test:hit', JSON.stringify({ value: 99 }));
    const loader = jest.fn();
    const result = await withCache('test:hit', 60, loader);
    expect(loader).not.toHaveBeenCalled();
    expect(result).toEqual({ value: 99 });
  });

  it('falls back to loader on Redis GET error', async () => {
    mockRedis.get.mockRejectedValueOnce(new Error('connection refused'));
    const loader = jest.fn(async () => ({ fallback: true }));
    const result = await withCache('test:error', 60, loader);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ fallback: true });
  });

  it('does NOT throw if Redis SET fails (swallows write errors)', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    mockRedis.set.mockRejectedValueOnce(new Error('write error'));
    const loader = jest.fn(async () => ({ safe: true }));
    await expect(withCache('test:set-fail', 60, loader)).resolves.toEqual({ safe: true });
  });
});

describe('invalidate()', () => {
  beforeEach(clearStore);

  it('deletes keys matching prefix', async () => {
    store.set('report:reconciliation:p1', 'v1');
    store.set('report:reconciliation:p2', 'v2');
    store.set('report:student360:abc', 'v3');

    await invalidate('report:reconciliation');

    expect(store.has('report:reconciliation:p1')).toBe(false);
    expect(store.has('report:reconciliation:p2')).toBe(false);
    // Unrelated key untouched
    expect(store.has('report:student360:abc')).toBe(true);
  });

  it('forces recompute (miss) after invalidation', async () => {
    const loader = jest.fn(async () => ({ computed: true }));

    // Populate cache
    await withCache('report:test:id1', 60, loader);
    expect(loader).toHaveBeenCalledTimes(1);

    // Hit — loader not called again
    await withCache('report:test:id1', 60, loader);
    expect(loader).toHaveBeenCalledTimes(1);

    // Invalidate
    await invalidate('report:test');

    // Next request is a miss → loader called again
    await withCache('report:test:id1', 60, loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('does NOT throw if Redis SCAN fails', async () => {
    mockRedis.scan.mockRejectedValueOnce(new Error('scan error'));
    await expect(invalidate('report:any')).resolves.toBeUndefined();
  });
});

describe('getRedis()', () => {
  it('returns the same instance on repeated calls (singleton)', () => {
    const a = getRedis();
    const b = getRedis();
    expect(a).toBe(b);
  });
});
