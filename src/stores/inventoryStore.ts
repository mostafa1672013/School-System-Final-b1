import { getAuthHeaders } from './authStore';
import { create } from 'zustand';
import type { InventoryItem, InventoryTransaction, ItemCategory } from '@/types';

interface ReceiveStockPayload {
  itemId: string;
  quantity: number;
  supplierName?: string;
  unitCost?: number;
  notes?: string;
  performedBy: string;
  performedByUserId?: string;
}

interface IssueStockPayload {
  itemId: string;
  quantity: number;
  subType: 'sale' | 'consumption' | 'adjustment';
  departmentName?: string;
  studentId?: string;
  studentName?: string;
  notes?: string;
  performedBy: string;
  performedByUserId?: string;
}

interface InventoryState {
  items: InventoryItem[];
  transactions: InventoryTransaction[];
  categories: ItemCategory[];
  loading: boolean;
  categoriesLoading: boolean;

  fetchItems: () => Promise<void>;
  fetchTransactions: (itemId?: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  addItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateItem: (id: string, data: Partial<InventoryItem>) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
  addCategory: (data: { key: string; name: string }) => Promise<boolean>;
  updateCategory: (id: string, name: string) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<{ success: boolean; error?: string }>;

  receiveStock: (payload: ReceiveStockPayload) => Promise<boolean>;
  issueStock: (payload: IssueStockPayload) => Promise<boolean>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  transactions: [],
  categories: [],
  loading: false,
  categoriesLoading: false,

  fetchItems: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/inventory', { headers: getAuthHeaders() });
      const data = await res.json();
      set({ items: data });
    } catch (error) {
      console.error('Failed to fetch inventory items:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchTransactions: async (itemId?: string) => {
    set({ loading: true });
    try {
      const url = itemId
        ? `/api/inventory/transactions?itemId=${itemId}`
        : '/api/inventory/transactions';
      const res = await fetch(url, { headers: getAuthHeaders() });
      const data = await res.json();
      set({ transactions: data });
    } catch (error) {
      console.error('Failed to fetch inventory transactions:', error);
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (item) => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(item),
      });
      if (res.ok) {
        get().fetchItems();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add inventory item:', error);
      return false;
    }
  },

  updateItem: async (id, data) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        get().fetchItems();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update inventory item:', error);
      return false;
    }
  },

  deleteItem: async (id) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        get().fetchItems();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete inventory item:', error);
      return false;
    }
  },

  receiveStock: async (payload) => {
    try {
      const res = await fetch('/api/inventory/receive', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        get().fetchItems();
        get().fetchTransactions();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to receive stock:', error);
      return false;
    }
  },

  issueStock: async (payload) => {
    try {
      const res = await fetch('/api/inventory/issue', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        get().fetchItems();
        get().fetchTransactions();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to issue stock:', error);
      return false;
    }
  },

  fetchCategories: async () => {
    set({ categoriesLoading: true });
    try {
      const res = await fetch('/api/inventory/categories', { headers: getAuthHeaders() });
      const data = await res.json();
      set({ categories: data });
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      set({ categoriesLoading: false });
    }
  },

  addCategory: async (data) => {
    try {
      const res = await fetch('/api/inventory/categories', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        get().fetchCategories();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add category:', error);
      return false;
    }
  },

  updateCategory: async (id, name) => {
    try {
      const res = await fetch(`/api/inventory/categories/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        get().fetchCategories();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update category:', error);
      return false;
    }
  },

  deleteCategory: async (id) => {
    try {
      const res = await fetch(`/api/inventory/categories/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (res.ok) {
        get().fetchCategories();
        return { success: true };
      }
      const body = await res.json();
      return { success: false, error: body.error };
    } catch (error) {
      return { success: false, error: 'فشل الاتصال' };
    }
  },
}));
