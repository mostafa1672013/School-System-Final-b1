import { create } from 'zustand';
import type { Account, Expense, FiscalYear, AccountingPeriod, CostCenter, JournalEntry } from '@/types';
import { getAuthHeaders } from './authStore';

interface AccountingState {
  accounts: Account[];
  expenses: Expense[];
  limits: { role: string; maxAmount: number }[];
  fiscalYears: FiscalYear[];
  periods: AccountingPeriod[];
  costCenters: CostCenter[];
  journalEntries: JournalEntry[];
  loading: boolean;

  // Accounts
  fetchAccounts: () => Promise<void>;
  addAccount: (account: Partial<Account>) => Promise<boolean>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<boolean>;
  deleteAccount: (id: string) => Promise<boolean>;

  // Expenses
  fetchExpenses: () => Promise<void>;
  addExpense: (expense: Partial<Expense> & { role: string }) => Promise<boolean>;
  approveExpense: (id: string, approvedBy: string) => Promise<boolean>;
  rejectExpense: (id: string) => Promise<boolean>;
  payExpense: (id: string, paidBy: string, userId?: string) => Promise<boolean>;

  // Limits
  fetchLimits: () => Promise<void>;
  updateLimit: (role: string, maxAmount: number) => Promise<boolean>;

  // Fiscal Years
  fetchFiscalYears: () => Promise<void>;
  addFiscalYear: (data: Partial<FiscalYear>) => Promise<boolean>;
  closeFiscalYear: (id: string, closedBy: string) => Promise<boolean>;

  // Accounting Periods
  fetchPeriods: () => Promise<void>;
  addPeriod: (data: Partial<AccountingPeriod>) => Promise<boolean>;
  closePeriod: (id: string, closedBy: string) => Promise<boolean>;
  reopenPeriod: (id: string) => Promise<boolean>;

  // Cost Centers
  fetchCostCenters: () => Promise<void>;
  addCostCenter: (data: Partial<CostCenter>) => Promise<boolean>;

  // Journal Entries
  fetchJournalEntries: (filters?: { status?: string; periodId?: string }) => Promise<void>;
  addJournalEntry: (data: {
    entryDate: string;
    description: string;
    notes?: string;
    referenceType?: string;
    referenceId?: string;
    periodId?: string;
    autoPost?: boolean;
    createdBy?: string;
    lines: Array<{ accountId: string; debit: number; credit: number; description?: string; costCenterId?: string }>;
  }) => Promise<{ success: boolean; error?: string; entry?: JournalEntry }>;
  approveJournalEntry: (id: string, approvedBy: string) => Promise<boolean>;
  postJournalEntry: (id: string, postedBy: string) => Promise<boolean>;
  reverseJournalEntry: (id: string, reversedBy: string, reason: string) => Promise<boolean>;

  // Reports
  fetchTrialBalance: (filters?: { periodId?: string; startDate?: string; endDate?: string }) => Promise<any>;
  fetchAccountLedger: (accountCode: string, startDate?: string, endDate?: string) => Promise<any>;
  fetchIncomeStatement: (startDate?: string, endDate?: string) => Promise<any>;
  fetchGeneralLedger: (startDate?: string, endDate?: string) => Promise<any>;
}

export const useAccountingStore = create<AccountingState>((set, get) => ({
  accounts: [],
  expenses: [],
  limits: [],
  fiscalYears: [],
  periods: [],
  costCenters: [],
  journalEntries: [],
  loading: false,

  fetchAccounts: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/accounts', { headers: getAuthHeaders() });
      const data = await res.json();
      set({ accounts: data });
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      set({ loading: false });
    }
  },

  addAccount: async (account) => {
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(account),
      });
      if (res.ok) { get().fetchAccounts(); return true; }
      return false;
    } catch { return false; }
  },

  updateAccount: async (id, updates) => {
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      if (res.ok) { get().fetchAccounts(); return true; }
      return false;
    } catch { return false; }
  },

  deleteAccount: async (id) => {
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (res.ok) { get().fetchAccounts(); return true; }
      return false;
    } catch { return false; }
  },

  fetchExpenses: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/expenses', { headers: getAuthHeaders() });
      const data = await res.json();
      set({ expenses: data });
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      set({ loading: false });
    }
  },

  addExpense: async (expense) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(expense),
      });
      if (res.ok) { get().fetchExpenses(); return true; }
      return false;
    } catch { return false; }
  },

  approveExpense: async (id, approvedBy) => {
    try {
      const res = await fetch(`/api/expenses/${id}/approve`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ approvedBy }),
      });
      if (res.ok) { get().fetchExpenses(); return true; }
      return false;
    } catch { return false; }
  },

  rejectExpense: async (id) => {
    try {
      const res = await fetch(`/api/expenses/${id}/reject`, { method: 'PATCH', headers: getAuthHeaders() });
      if (res.ok) { get().fetchExpenses(); return true; }
      return false;
    } catch { return false; }
  },

  payExpense: async (id, paidBy, userId) => {
    try {
      const res = await fetch(`/api/expenses/${id}/pay`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ paidBy, userId }),
      });
      if (res.ok) { get().fetchExpenses(); return true; }
      return false;
    } catch { return false; }
  },

  fetchLimits: async () => {
    try {
      const res = await fetch('/api/expense-limits', { headers: getAuthHeaders() });
      const data = await res.json();
      set({ limits: data });
    } catch (error) {
      console.error('Failed to fetch limits:', error);
    }
  },

  updateLimit: async (role, maxAmount) => {
    try {
      const res = await fetch(`/api/expense-limits/${role}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ maxAmount }),
      });
      if (res.ok) { get().fetchLimits(); return true; }
      return false;
    } catch { return false; }
  },

  fetchFiscalYears: async () => {
    try {
      const res = await fetch('/api/fiscal-years', { headers: getAuthHeaders() });
      const data = await res.json();
      set({ fiscalYears: data });
    } catch (error) {
      console.error('Failed to fetch fiscal years:', error);
    }
  },

  addFiscalYear: async (data) => {
    try {
      const res = await fetch('/api/fiscal-years', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) { get().fetchFiscalYears(); return true; }
      return false;
    } catch { return false; }
  },

  closeFiscalYear: async (id, closedBy) => {
    try {
      const res = await fetch(`/api/fiscal-years/${id}/close`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ closedBy }),
      });
      if (res.ok) { get().fetchFiscalYears(); return true; }
      return false;
    } catch { return false; }
  },

  fetchPeriods: async () => {
    try {
      const res = await fetch('/api/accounting-periods', { headers: getAuthHeaders() });
      const data = await res.json();
      set({ periods: data });
    } catch (error) {
      console.error('Failed to fetch periods:', error);
    }
  },

  addPeriod: async (data) => {
    try {
      const res = await fetch('/api/accounting-periods', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) { get().fetchPeriods(); return true; }
      return false;
    } catch { return false; }
  },

  closePeriod: async (id, closedBy) => {
    try {
      const res = await fetch(`/api/accounting-periods/${id}/close`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ closedBy }),
      });
      if (res.ok) { get().fetchPeriods(); return true; }
      return false;
    } catch { return false; }
  },

  reopenPeriod: async (id) => {
    try {
      const res = await fetch(`/api/accounting-periods/${id}/reopen`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });
      if (res.ok) { get().fetchPeriods(); return true; }
      return false;
    } catch { return false; }
  },

  fetchCostCenters: async () => {
    try {
      const res = await fetch('/api/cost-centers', { headers: getAuthHeaders() });
      const data = await res.json();
      set({ costCenters: data });
    } catch (error) {
      console.error('Failed to fetch cost centers:', error);
    }
  },

  addCostCenter: async (data) => {
    try {
      const res = await fetch('/api/cost-centers', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) { get().fetchCostCenters(); return true; }
      return false;
    } catch { return false; }
  },

  fetchJournalEntries: async (filters) => {
    set({ loading: true });
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.periodId) params.set('periodId', filters.periodId);
      const res = await fetch(`/api/journal-entries?${params}`, { headers: getAuthHeaders() });
      const data = await res.json();
      set({ journalEntries: data });
    } catch (error) {
      console.error('Failed to fetch journal entries:', error);
    } finally {
      set({ loading: false });
    }
  },

  addJournalEntry: async (data) => {
    try {
      const res = await fetch('/api/journal-entries', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok) {
        get().fetchJournalEntries();
        return { success: true, entry: json };
      }
      return { success: false, error: json.error || 'فشل إنشاء القيد' };
    } catch {
      return { success: false, error: 'فشل الاتصال بالخادم' };
    }
  },

  approveJournalEntry: async (id, approvedBy) => {
    try {
      const res = await fetch(`/api/journal-entries/${id}/approve`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ approvedBy }),
      });
      if (res.ok) { get().fetchJournalEntries(); return true; }
      return false;
    } catch { return false; }
  },

  postJournalEntry: async (id, postedBy) => {
    try {
      const res = await fetch(`/api/journal-entries/${id}/post`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ postedBy }),
      });
      if (res.ok) { get().fetchJournalEntries(); return true; }
      return false;
    } catch { return false; }
  },

  reverseJournalEntry: async (id, reversedBy, reason) => {
    try {
      const res = await fetch(`/api/journal-entries/${id}/reverse`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reversedBy, reason }),
      });
      if (res.ok) { get().fetchJournalEntries(); return true; }
      return false;
    } catch { return false; }
  },

  fetchTrialBalance: async (filters) => {
    const params = new URLSearchParams();
    if (filters?.periodId) params.set('periodId', filters.periodId);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    const res = await fetch(`/api/reports/trial-balance?${params}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  fetchAccountLedger: async (accountCode, startDate, endDate) => {
    const params = new URLSearchParams({ accountCode });
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const res = await fetch(`/api/reports/account-ledger?${params}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  fetchIncomeStatement: async (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const res = await fetch(`/api/reports/income-statement?${params}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  fetchGeneralLedger: async (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const res = await fetch(`/api/reports/general-ledger?${params}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
}));
