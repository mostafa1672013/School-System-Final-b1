import { getAuthHeaders } from './authStore';
import { create } from 'zustand';
import type { TreasurySession, TreasuryStatus, TreasuryCloseResult } from '@/types';

interface TreasuryState {
  status: TreasuryStatus | null;
  sessions: TreasurySession[];
  loading: boolean;
  sessionDetails: { payments: any[]; expenses: any[] } | null;

  // Actions
  fetchStatus: () => Promise<void>;
  openTreasury: (openingBalance: number) => Promise<boolean>;
  requestClose: (actualBalance: number) => Promise<TreasuryCloseResult | null>;
  submitPendingClose: (actualBalance: number, expectedBalance: number, closureNote: string) => Promise<TreasuryCloseResult | null>;
  approveClose: (sessionId: string) => Promise<boolean>;
  fetchSessions: () => Promise<void>;
  fetchSessionDetails: (sessionId: string) => Promise<void>;
}

export const useTreasuryStore = create<TreasuryState>((set, get) => ({
  status: null,
  sessions: [],
  loading: false,
  sessionDetails: null,

  fetchStatus: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/treasury/status', { headers: getAuthHeaders() });
      const data = await res.json();
      set({ status: data });
    } catch (error) {
      console.error('Failed to fetch treasury status:', error);
    } finally {
      set({ loading: false });
    }
  },

  openTreasury: async (openingBalance) => {
    try {
      const res = await fetch('/api/treasury/open', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ openingBalance }),
      });
      if (res.ok) {
        await get().fetchStatus();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to open treasury:', error);
      return false;
    }
  },

  requestClose: async (actualBalance) => {
    try {
      const res = await fetch('/api/treasury/close-request', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ actualBalance }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.status === 'closed') {
        await get().fetchStatus();
      }
      return data;
    } catch (error) {
      console.error('Failed to request close:', error);
      return null;
    }
  },

  submitPendingClose: async (actualBalance, expectedBalance, closureNote) => {
    try {
      const res = await fetch('/api/treasury/pending-close', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ actualBalance, expectedBalance, closureNote }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      await get().fetchStatus();
      return data;
    } catch (error) {
      console.error('Failed to submit pending close:', error);
      return null;
    }
  },

  approveClose: async (sessionId) => {
    try {
      const res = await fetch('/api/treasury/close-approve', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        await get().fetchStatus();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to approve close:', error);
      return false;
    }
  },

  fetchSessions: async () => {
    try {
      const res = await fetch('/api/treasury/sessions', { headers: getAuthHeaders() });
      const data = await res.json();
      set({ sessions: data });
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  },

  fetchSessionDetails: async (sessionId) => {
    try {
      const res = await fetch(`/api/treasury/sessions/${sessionId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        set({ sessionDetails: { payments: data.session.payments || [], expenses: data.session.expenses || [] } });
      }
    } catch (error) {
      console.error('Failed to fetch session details:', error);
    }
  },
}));
