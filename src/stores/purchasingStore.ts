import { create } from 'zustand';
import { getAuthHeaders } from './authStore';

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  address?: string;
  isActive: boolean;
}

export interface PurchaseItem {
  id: string;
  itemId?: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  receivedQty?: number;
}

export interface PurchaseRequest {
  id: string;
  requestNumber: string;
  date: string;
  requestedBy: string;
  department?: string;
  status: string;
  notes?: string;
  supplierId?: string;
  supplier?: Supplier;
  items: PurchaseItem[];
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  date: string;
  supplierId: string;
  supplier?: Supplier;
  requestId?: string;
  status: string;
  totalAmount: number;
  notes?: string;
  createdBy: string;
  items: PurchaseItem[];
}

interface PurchasingState {
  suppliers: Supplier[];
  requests: PurchaseRequest[];
  orders: PurchaseOrder[];
  receipts: any[];
  invoices: any[];
  payments: any[];
  loading: boolean;
  error: string | null;

  fetchSuppliers: () => Promise<void>;
  addSupplier: (data: Partial<Supplier>) => Promise<boolean>;

  fetchRequests: () => Promise<void>;
  addRequest: (data: any) => Promise<boolean>;

  fetchOrders: () => Promise<void>;
  addOrder: (data: any) => Promise<boolean>;

  fetchReceipts: () => Promise<void>;
  addReceipt: (data: any) => Promise<boolean>;

  fetchInvoices: () => Promise<void>;
  addInvoice: (data: any) => Promise<boolean>;

  fetchPayments: () => Promise<void>;
  addPayment: (data: any) => Promise<boolean>;
}

export const usePurchasingStore = create<PurchasingState>((set, get) => ({
  suppliers: [],
  requests: [],
  orders: [],
  receipts: [],
  invoices: [],
  payments: [],
  loading: false,
  error: null,

  fetchSuppliers: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/purchasing/suppliers', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch suppliers');
      set({ suppliers: await res.json() });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  addSupplier: async (data) => {
    try {
      const res = await fetch('/api/purchasing/suppliers', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) { get().fetchSuppliers(); return true; }
      return false;
    } catch { return false; }
  },

  fetchRequests: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/purchasing/requests', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch requests');
      set({ requests: await res.json() });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  addRequest: async (data) => {
    try {
      const res = await fetch('/api/purchasing/requests', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) { get().fetchRequests(); return true; }
      return false;
    } catch { return false; }
  },

  fetchOrders: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/purchasing/orders', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch orders');
      set({ orders: await res.json() });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  addOrder: async (data) => {
    try {
      const res = await fetch('/api/purchasing/orders', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) { get().fetchOrders(); return true; }
      return false;
    } catch { return false; }
  },

  fetchReceipts: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/purchasing/receipts', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch receipts');
      set({ receipts: await res.json() });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  addReceipt: async (data) => {
    try {
      const res = await fetch('/api/purchasing/receipts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) { get().fetchReceipts(); return true; }
      return false;
    } catch { return false; }
  },

  fetchInvoices: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/purchasing/invoices', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch invoices');
      set({ invoices: await res.json() });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  addInvoice: async (data) => {
    try {
      const res = await fetch('/api/purchasing/invoices', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) { get().fetchInvoices(); return true; }
      return false;
    } catch { return false; }
  },

  fetchPayments: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/purchasing/payments', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch payments');
      set({ payments: await res.json() });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  addPayment: async (data) => {
    try {
      const res = await fetch('/api/purchasing/payments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) { get().fetchPayments(); return true; }
      return false;
    } catch { return false; }
  },
}));
