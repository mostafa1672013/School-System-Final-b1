import { create } from 'zustand';
import { getAuthHeaders } from './authStore';
import type { DeliveryOrder } from '@/types';

interface DeliveryOrderState {
  orders: DeliveryOrder[];
  loading: boolean;
  fetchOrders: (params?: { status?: string; studentId?: string; academicYear?: string; term?: string }) => Promise<void>;
  createOrder: (data: {
    studentId: string; academicYear: string; term: string;
    chargeType: 'within_fees' | 'external'; notes?: string;
    items: Array<{ inventoryItemId: string; itemName: string; quantity: number; unitPrice: number }>;
  }) => Promise<DeliveryOrder | null>;
  confirmOrder: (orderId: string) => Promise<boolean>;
  deliverOrder: (orderId: string) => Promise<boolean>;
  returnItem: (orderId: string, itemId: string, returnNotes?: string) => Promise<boolean>;
  cancelOrder: (orderId: string) => Promise<boolean>;
}

export const useDeliveryOrderStore = create<DeliveryOrderState>((set, get) => ({
  orders: [],
  loading: false,

  fetchOrders: async (params = {}) => {
    set({ loading: true });
    try {
      const query = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<string, string>
      ).toString();
      const res = await fetch(`/api/delivery-orders${query ? `?${query}` : ''}`, { headers: getAuthHeaders() });
      const data = await res.json();
      set({ orders: Array.isArray(data) ? data : [] });
    } catch (err) {
      console.error('fetchOrders error', err);
    } finally {
      set({ loading: false });
    }
  },

  createOrder: async (data) => {
    try {
      const res = await fetch('/api/delivery-orders', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل الإنشاء');
      }
      const created: DeliveryOrder = await res.json();
      set((state) => ({ orders: [created, ...state.orders] }));
      return created;
    } catch (err: any) {
      throw err;
    }
  },

  confirmOrder: async (orderId) => {
    try {
      const res = await fetch(`/api/delivery-orders/${orderId}/confirm`, {
        method: 'PATCH', headers: getAuthHeaders()
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      await get().fetchOrders();
      return true;
    } catch (err: any) {
      throw err;
    }
  },

  deliverOrder: async (orderId) => {
    try {
      const res = await fetch(`/api/delivery-orders/${orderId}/deliver`, {
        method: 'PATCH', headers: getAuthHeaders()
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      await get().fetchOrders();
      return true;
    } catch (err: any) {
      throw err;
    }
  },

  returnItem: async (orderId, itemId, returnNotes) => {
    try {
      const res = await fetch(`/api/delivery-orders/${orderId}/return/${itemId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ returnNotes })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      await get().fetchOrders();
      return true;
    } catch (err: any) {
      throw err;
    }
  },

  cancelOrder: async (orderId) => {
    try {
      const res = await fetch(`/api/delivery-orders/${orderId}`, {
        method: 'DELETE', headers: getAuthHeaders()
      });
      if (!res.ok) return false;
      set((state) => ({ orders: state.orders.filter(o => o.id !== orderId) }));
      return true;
    } catch {
      return false;
    }
  }
}));
