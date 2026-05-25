import { getAuthHeaders } from './authStore';
import { create } from 'zustand';
import type { TreasurySession, TreasuryStatus, TreasuryCloseResult } from '@/types';

interface TreasuryState {
  status: TreasuryStatus | null;
  sessions: TreasurySession[];
  loading: boolean;
  sessionDetails: { payments: any[]; expenses: any[]; bankDeposits: any[] } | null;

  // Actions
  fetchStatus: () => Promise<void>;
  openTreasury: (openingBalance: number) => Promise<true | string>;
  requestClose: (actualBalance: number) => Promise<TreasuryCloseResult | null>;
  submitPendingClose: (actualBalance: number, expectedBalance: number, closureNote: string) => Promise<TreasuryCloseResult | null>;
  approveClose: (sessionId: string) => Promise<boolean>;
  requestReopen: () => Promise<true | string>;
  approveReopen: () => Promise<true | string>;
  fetchSessions: () => Promise<void>;
  fetchSessionDetails: (sessionId: string) => Promise<void>;
  addBankDeposit: (data: { amount: number; bankAccountId: string; reference?: string; notes?: string }) => Promise<true | string>;
  approveBankDeposit: (depositId: string) => Promise<true | string>;
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
      const errBody = await res.json().catch(() => ({}));
      await get().fetchStatus(); // sync UI with real DB state on failure
      return errBody.error || `خطأ ${res.status}`;
    } catch (error) {
      console.error('Failed to open treasury:', error);
      return 'فشل الاتصال بالسيرفر';
    }
  },

  requestClose: async (actualBalance) => {
    try {
      const res = await fetch('/api/treasury/close-request', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ actualBalance }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error('close-request failed:', res.status, errBody);
        return { status: 'error' as any, error: errBody.error || `خطأ ${res.status}`, code: errBody.code };
      }
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

  requestReopen: async () => {
    try {
      const res = await fetch('/api/treasury/reopen-request', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        await get().fetchStatus();
        return true;
      }
      const errBody = await res.json().catch(() => ({}));
      return errBody.error || `خطأ ${res.status}`;
    } catch (error) {
      return 'فشل الاتصال بالسيرفر';
    }
  },

  approveReopen: async () => {
    try {
      const res = await fetch('/api/treasury/reopen-approve', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        await get().fetchStatus();
        return true;
      }
      const errBody = await res.json().catch(() => ({}));
      return errBody.error || `خطأ ${res.status}`;
    } catch (error) {
      return 'فشل الاتصال بالسيرفر';
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
        set({ sessionDetails: { payments: data.session.payments || [], expenses: data.session.expenses || [], bankDeposits: data.session.bankDeposits || [] } });
      }
    } catch (error) {
      console.error('Failed to fetch session details:', error);
    }
  },

  addBankDeposit: async (depositData) => {
    try {
      const res = await fetch('/api/treasury/bank-deposit', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(depositData),
      });
      if (res.ok) {
        await get().fetchStatus();
        return true;
      }
      const errBody = await res.json().catch(() => ({}));
      return errBody.error || `خطأ ${res.status}`;
    } catch (error) {
      console.error('Failed to add bank deposit:', error);
      return 'فشل الاتصال بالسيرفر';
    }
  },

  approveBankDeposit: async (depositId) => {
    try {
      const res = await fetch(`/api/treasury/bank-deposit/${depositId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        await get().fetchStatus();
        if (get().status?.session?.id) {
          await get().fetchSessionDetails(get().status!.session!.id);
        }
        return true;
      }
      const errBody = await res.json().catch(() => ({}));
      return errBody.error || `خطأ ${res.status}`;
    } catch (error) {
      console.error('Failed to approve bank deposit:', error);
      return 'فشل الاتصال بالسيرفر';
    }
  },
}));
