import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BusRoute, BusSubscription } from '@/types';
import { mockBusRoutes, mockBusSubscriptions } from '@/constants/mockData';
import { generateId } from '@/lib/utils';

interface BusState {
  routes: BusRoute[];
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
      routes: mockBusRoutes,
      subscriptions: mockBusSubscriptions,
      addRoute: (route) => set((state) => ({
        routes: [...state.routes, { ...route, id: generateId() }],
      })),
      updateRoute: (id, data) => set((state) => ({
        routes: state.routes.map((r) => r.id === id ? { ...r, ...data } : r),
      })),
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
