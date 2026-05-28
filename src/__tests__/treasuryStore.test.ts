import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTreasuryStore } from '@/stores/treasuryStore';
import type { TreasuryStatus } from '@/types';

const globalFetch = global.fetch;

const mockStatus: TreasuryStatus = {
  status: 'open',
  session: {
    id: 'session-1',
    date: '2024-06-15',
    openingBalance: 1000,
    closingBalance: null,
    actualBalance: null,
    difference: null,
    status: 'open',
    openedBy: 'user-1',
    openedAt: '2024-06-15T08:00:00Z',
    closedBy: null,
    closureNote: null,
    closedAt: null,
    approvedBy: null,
  },
  currentBalance: 1500,
  totalIncome: 500,
  totalExpenses: 0,
};

describe('Treasury Store', () => {
  beforeEach(() => {
    useTreasuryStore.setState({
      status: null,
      sessions: [],
      loading: false,
      sessionDetails: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = globalFetch;
  });

  describe('fetchStatus', () => {
    it('fetches status and updates state', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      });

      await useTreasuryStore.getState().fetchStatus();

      const state = useTreasuryStore.getState();
      expect(state.loading).toBe(false);
      expect(state.status).toEqual(mockStatus);
    });

    it('handles fetch failure gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await useTreasuryStore.getState().fetchStatus();

      const state = useTreasuryStore.getState();
      expect(state.loading).toBe(false);
      expect(state.status).toBeNull();
    });
  });

  describe('openTreasury', () => {
    it('returns true on success and fetches new status', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true }) // openTreasury fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStatus) }); // fetchStatus

      const result = await useTreasuryStore.getState().openTreasury(1000);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(useTreasuryStore.getState().status).toEqual(mockStatus);
    });

    it('returns error message on failure', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 400, json: () => Promise.resolve({ error: 'Already open' }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStatus) });

      const result = await useTreasuryStore.getState().openTreasury(1000);

      expect(result).toBe('Already open');
    });
  });

  describe('requestClose', () => {
    it('returns closure result on success', async () => {
      const mockResult = { status: 'needs_approval', expectedBalance: 1500, actualBalance: 1400, difference: -100 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const result = await useTreasuryStore.getState().requestClose(1400);

      expect(result).toEqual(mockResult);
    });

    it('returns error object on failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Cannot close' }),
      });

      const result = await useTreasuryStore.getState().requestClose(1400);

      expect(result).toEqual({ status: 'error', error: 'Cannot close', code: undefined });
    });
  });

  describe('submitPendingClose', () => {
    it('returns data and fetches status on success', async () => {
      const mockResult = { status: 'pending_close' };
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockResult) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStatus) });

      const result = await useTreasuryStore.getState().submitPendingClose(1400, 1500, 'Shortage');

      expect(result).toEqual(mockResult);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('approveClose', () => {
    it('returns true on success', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStatus) });

      const result = await useTreasuryStore.getState().approveClose('session-1');

      expect(result).toBe(true);
    });
  });

  describe('requestReopen and approveReopen', () => {
    it('requestReopen returns true on success', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStatus) });

      const result = await useTreasuryStore.getState().requestReopen();
      expect(result).toBe(true);
    });

    it('approveReopen returns true on success', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStatus) });

      const result = await useTreasuryStore.getState().approveReopen();
      expect(result).toBe(true);
    });
  });

  describe('fetchSessions and Details', () => {
    it('fetches sessions list', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockStatus.session]),
      });

      await useTreasuryStore.getState().fetchSessions();

      expect(useTreasuryStore.getState().sessions).toHaveLength(1);
    });

    it('fetches session details', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ session: { payments: [{ id: 'p1' }], expenses: [], bankDeposits: [] } }),
      });

      await useTreasuryStore.getState().fetchSessionDetails('session-1');

      expect(useTreasuryStore.getState().sessionDetails?.payments).toHaveLength(1);
    });
  });
});
