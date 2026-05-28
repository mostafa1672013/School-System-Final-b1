/**
 * TanStack Query client configuration.
 *
 * Defaults tuned for an internal school ERP:
 *  - We do NOT refetch on window focus — staff alt-tabs constantly.
 *  - 1 minute stale time eliminates most duplicate fetches during a single
 *    workflow without making the data feel stale.
 *  - Single retry on failure — Express errors here are deterministic; more
 *    retries just delay the error message.
 *
 * Cite: performance plan section 3.3
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 min
      gcTime: 5 * 60_000, // 5 min
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Stale-time presets for common data shapes. Use these when calling
 * useQuery so the intent of each cache window is explicit.
 */
export const staleTimes = {
  /** Reference data that almost never changes during a session. */
  reference: Infinity,
  /** Lists that may change but not urgently (e.g. students). */
  list: 2 * 60_000,
  /** Live financial data — always fetch fresh. */
  live: 0,
} as const;
