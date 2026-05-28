import { getAuthHeaders } from './authStore';
import { create } from 'zustand';
import { toast } from 'sonner';
import type { BusRoute, BusSubscription, CreateSubscriptionInput } from '@/types';

interface BusState {
  routes: BusRoute[];
  subscriptions: BusSubscription[];
  isLoading: boolean;
  isSubLoading: boolean;
  fetchRoutes: () => Promise<void>;
  fetchSubscriptions: (filters?: { routeId?: string; academicYear?: string }) => Promise<void>;
  addRoute: (route: Omit<BusRoute, 'id'>) => Promise<void>;
  updateRoute: (id: string, data: Partial<BusRoute>) => Promise<void>;
  addSubscription: (data: CreateSubscriptionInput) => Promise<BusSubscription | null>;
  cancelSubscription: (id: string) => Promise<void>;
  getRouteSubscribers: (routeId: string) => BusSubscription[];
  getStudentSubscription: (studentId: string) => BusSubscription | undefined;
}

export const useBusStore = create<BusState>()((set, get) => ({
  routes: [],
  subscriptions: [],
  isLoading: false,
  isSubLoading: false,

  fetchRoutes: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/bus-routes', { headers: getAuthHeaders() });
      const data = await res.json();
      set({ routes: data, isLoading: false });
    } catch {
      set({ isLoading: false });
      toast.error('فشل تحميل خطوط الباصات');
    }
  },

  fetchSubscriptions: async (filters = {}) => {
    set({ isSubLoading: true });
    try {
      const params = new URLSearchParams();
      if (filters.routeId) params.set('routeId', filters.routeId);
      if (filters.academicYear) params.set('academicYear', filters.academicYear);
      const res = await fetch(`/api/bus-subscriptions?${params}`, { headers: getAuthHeaders() });
      const data = await res.json();
      set({ subscriptions: data, isSubLoading: false });
    } catch {
      set({ isSubLoading: false });
    }
  },

  addRoute: async (route) => {
    try {
      const res = await fetch('/api/bus-routes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(route),
      });
      if (!res.ok) throw new Error();
      const newRoute = await res.json();
      set((s) => ({ routes: [...s.routes, newRoute] }));
    } catch {
      toast.error('فشل إضافة الخط');
    }
  },

  updateRoute: async (id, data) => {
    try {
      const res = await fetch(`/api/bus-routes/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      set((s) => ({ routes: s.routes.map((r) => (r.id === id ? updated : r)) }));
    } catch {
      toast.error('فشل تحديث بيانات الخط');
    }
  },

  addSubscription: async (data) => {
    try {
      const res = await fetch('/api/bus-subscriptions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const sub = await res.json();
      set((s) => ({ subscriptions: [sub, ...s.subscriptions] }));
      return sub;
    } catch {
      toast.error('فشل إنشاء الاشتراك');
      return null;
    }
  },

  cancelSubscription: async (id) => {
    try {
      await fetch(`/api/bus-subscriptions/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      set((s) => ({
        subscriptions: s.subscriptions.map((sub) =>
          sub.id === id ? { ...sub, status: 'cancelled' as const } : sub
        ),
      }));
    } catch {
      toast.error('فشل إلغاء الاشتراك');
    }
  },

  getRouteSubscribers: (routeId) =>
    get().subscriptions.filter((s) => s.routeId === routeId && s.status === 'active'),

  getStudentSubscription: (studentId) =>
    get().subscriptions.find((s) => s.studentId === studentId && s.status === 'active'),
}));
