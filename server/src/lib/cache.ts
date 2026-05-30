/**
 * Redis-backed read-through cache for hot reads (reports, permissions, config).
 *
 * Design constraints (from specs/001-performance-optimization):
 *  - Cache is NEVER the source of truth. On ANY Redis error we fall back to
 *    calling the loader directly so correctness is preserved (FR-009).
 *  - Short TTLs + explicit prefix invalidation from the write path keep data
 *    fresh (reports ~60s, permissions ~300s, config ~600s).
 *  - Auth/permission checks MUST run BEFORE any cache read (caller's job).
 *
 * Cite: research Decision 1, contracts §2.
 */
import Redis from 'ioredis';

let client: Redis | null = null;
let warnedUnavailable = false;

/**
 * Lazily create (once) and return the shared ioredis client.
 * Uses lazyConnect so a missing Redis never crashes startup; the first
 * command triggers the connection and any failure is caught by callers.
 */
export function getRedis(): Redis {
  if (client) return client;

  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  client = new Redis(url, {
    lazyConnect: false,
    maxRetriesPerRequest: 1,
    // Cap reconnection backoff so a downed Redis doesn't spin hot.
    retryStrategy: (times) => Math.min(times * 200, 2000),
  });

  client.on('error', (err) => {
    // Don't spam logs — one line per error burst is enough.
    if (!warnedUnavailable) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          kind: 'redis_error',
          message: err?.message ?? String(err),
        }),
      );
      warnedUnavailable = true;
    }
  });

  client.on('ready', () => {
    warnedUnavailable = false;
    console.log('Redis connected');
  });

  return client;
}

/**
 * Read-through cache. Returns the cached value for `key` if present; otherwise
 * runs `loader`, stores the JSON result with `ttlSeconds`, and returns it.
 *
 * On any Redis failure (connection down, serialization error, etc.) this
 * transparently falls back to `loader()` — the cache must never break a request.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const redis = getRedis();

  // Attempt read.
  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }
  } catch {
    // Redis unavailable / parse error → skip cache, compute fresh.
    return loader();
  }

  // Miss → compute.
  const value = await loader();

  // Best-effort write; never let a cache write failure break the response.
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    /* swallow — value already computed and returned below */
  }

  return value;
}

/**
 * Evict every key beginning with `prefix` (e.g. "report:reconciliation").
 * Uses non-blocking SCAN so we don't stall Redis on large keyspaces.
 * Failures are logged and swallowed — invalidation is best-effort; the TTL
 * is the backstop for staleness.
 */
export async function invalidate(prefix: string): Promise<void> {
  const redis = getRedis();
  const pattern = `${prefix}*`;
  try {
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = next;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        kind: 'cache_invalidate_failed',
        prefix,
        message: (err as Error)?.message ?? String(err),
      }),
    );
  }
}
