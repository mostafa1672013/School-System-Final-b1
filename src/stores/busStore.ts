import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import type { BusRoute, BusSubscription } from '@/types';
import { mockBusRoutes, mockBusSubscriptions } from '@/constants/mockData';
import { generateId } from '@/lib/utils';

interface BusState {
  routes: BusRoute[];
  isLoading: boolean;
  fetchRoutes: () => Promise<void>;
  subscriptions: BusSubscription[];
  addRoute: (route: Omit<BusRoute, 'id'>) => void;
  updateRoute: (id: string, data: Partial<BusRoute>) => void;
  addSubscription: (sub: Omit<BusSubscription, 'id'>) => void;
  cancelSubscription: (id: string) => void;
  getRouteSubscribers: (routeId: string) => BusSubscription[];
  getStudentSubscription: (studentId: string) => BusSubscription | undefined;
}

export const useBusStore = create<BusState>()(
  persist(
    (set, get) => ({
      routes: [],
      isLoading: false,
      subscriptions: mockBusSubscriptions,
      fetchRoutes: async () => {
        set({ isLoading: true });
        try {
          const response = await fetch('http://localhost:4000/api/bus-routes');
          const data = await response.json();
          set({ routes: data, isLoading: false });
        } catch (error) {
          console.error('Fetch bus routes error:', error);
          set({ isLoading: false });
        }
      },
      addRoute: async (route) => {
        try {
          const response = await fetch('http://localhost:4000/api/bus-routes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(route),
          });
          if (!response.ok) throw new Error('Failed to create route');
          const newRoute = await response.json();
          set((state) => ({ routes: [...state.routes, newRoute] }));
        } catch (error) {
          console.error('Add route error:', error);
          toast.error('فشل في إضافة الخط، تأكد من اتصال السيرفر');
        }
      },
      updateRoute: async (id, data) => {
        try {
          const response = await fetch(`http://localhost:4000/api/bus-routes/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (!response.ok) throw new Error('Failed to update route');
          const updatedRoute = await response.json();
          set((state) => ({
            routes: state.routes.map((r) => r.id === id ? updatedRoute : r),
          }));
        } catch (error) {
          console.error('Update route error:', error);
          toast.error('فشل في تحديث بيانات الخط');
        }
      },
      addSubscription: (sub) => set((state) => ({
        subscriptions: [...state.subscriptions, { ...sub, id: generateId() }],
      })),
      cancelSubscription: (id) => set((state) => ({
        subscriptions: state.subscriptions.map((s) =>
          s.id === id ? { ...s, status: 'cancelled' as const } : s
        ),
      })),
      getRouteSubscribers: (routeId) => get().subscriptions.filter((s) => s.routeId === routeId && s.status === 'active'),
      getStudentSubscription: (studentId) => get().subscriptions.find((s) => s.studentId === studentId && s.status === 'active'),
    }),
    { name: 'school-bus' }
  )
);
