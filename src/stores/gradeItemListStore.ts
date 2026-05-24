import { create } from 'zustand';
import { getAuthHeaders } from './authStore';
import type { GradeItemList } from '@/types';

interface GradeItemListState {
  lists: GradeItemList[];
  loading: boolean;
  fetchLists: (params?: { academicYear?: string; term?: string; stage?: string; grade?: string }) => Promise<void>;
  createList: (data: {
    stage: string; grade: string; track: string;
    academicYear: string; term: string;
    entries: Array<{ inventoryItemId: string; quantity: number; preferredSupplierId?: string; notes?: string }>;
  }) => Promise<GradeItemList | null>;
  updateEntries: (listId: string, entries: Array<{ inventoryItemId: string; quantity: number; preferredSupplierId?: string; notes?: string }>) => Promise<boolean>;
  deleteList: (listId: string) => Promise<boolean>;
}

export const useGradeItemListStore = create<GradeItemListState>((set) => ({
  lists: [],
  loading: false,

  fetchLists: async (params = {}) => {
    set({ loading: true });
    try {
      const query = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<string, string>
      ).toString();
      const res = await fetch(`/api/grade-item-lists${query ? `?${query}` : ''}`, { headers: getAuthHeaders() });
      const data = await res.json();
      set({ lists: Array.isArray(data) ? data : [] });
    } catch (err) {
      console.error('fetchLists error', err);
    } finally {
      set({ loading: false });
    }
  },

  createList: async (data) => {
    try {
      const res = await fetch('/api/grade-item-lists', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل الإنشاء');
      }
      const created: GradeItemList = await res.json();
      set((state) => ({ lists: [created, ...state.lists] }));
      return created;
    } catch (err: any) {
      throw err;
    }
  },

  updateEntries: async (listId, entries) => {
    try {
      const res = await fetch(`/api/grade-item-lists/${listId}/entries`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ entries })
      });
      if (!res.ok) return false;
      const updated: GradeItemList = await res.json();
      set((state) => ({ lists: state.lists.map(l => l.id === listId ? updated : l) }));
      return true;
    } catch {
      return false;
    }
  },

  deleteList: async (listId) => {
    try {
      const res = await fetch(`/api/grade-item-lists/${listId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) return false;
      set((state) => ({ lists: state.lists.filter(l => l.id !== listId) }));
      return true;
    } catch {
      return false;
    }
  }
}));
