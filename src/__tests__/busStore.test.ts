import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBusStore } from '@/stores/busStore';

const globalFetch = global.fetch;

const mockRoute = {
  id: 'route-1',
  name: 'Route A',
  busNumber: '123',
  driverName: 'Driver 1',
  driverPhone: '010',
  supervisorName: 'Super 1',
  supervisorPhone: '011',
  capacity: 20,
  currentOccupancy: 1,
  fees: { 'two_way': 1000 },
  status: 'active' as const,
};

const mockSubscription = {
  id: 'sub-1',
  studentId: 'std-1',
  studentName: 'Student 1',
  routeId: 'route-1',
  routeName: 'Route A',
  direction: 'two_way' as const,
  academicYear: '2024-2025',
  term: 'first' as const,
  totalFees: 1000,
  status: 'active' as const,
};

describe('Bus Store', () => {
  beforeEach(() => {
    useBusStore.setState({
      routes: [],
      subscriptions: [],
      isLoading: false,
      isSubLoading: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = globalFetch;
  });

  describe('fetchRoutes', () => {
    it('fetches routes successfully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockRoute]),
      });

      await useBusStore.getState().fetchRoutes();

      const state = useBusStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.routes).toHaveLength(1);
    });
  });

  describe('addRoute', () => {
    it('adds new route', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRoute),
      });

      await useBusStore.getState().addRoute({ ...mockRoute, id: undefined } as any);

      expect(useBusStore.getState().routes).toHaveLength(1);
    });
  });

  describe('updateRoute', () => {
    it('updates route data', async () => {
      useBusStore.setState({ routes: [mockRoute] });
      const updated = { ...mockRoute, capacity: 25 };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(updated),
      });

      await useBusStore.getState().updateRoute('route-1', { capacity: 25 });

      expect(useBusStore.getState().routes[0].capacity).toBe(25);
    });
  });

  describe('fetchSubscriptions', () => {
    it('fetches with filters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockSubscription]),
      });

      await useBusStore.getState().fetchSubscriptions({ routeId: 'route-1' });

      expect(useBusStore.getState().subscriptions).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledWith('/api/bus-subscriptions?routeId=route-1', expect.any(Object));
    });
  });

  describe('addSubscription', () => {
    it('returns subscription on success', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSubscription),
      });

      const res = await useBusStore.getState().addSubscription({
        studentId: 'std-1',
        routeId: 'route-1',
        direction: 'two_way',
        academicYear: '2024-2025',
        term: 'first',
      });

      expect(res).toEqual(mockSubscription);
      expect(useBusStore.getState().subscriptions).toHaveLength(1);
    });

    it('returns null on failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });
      const res = await useBusStore.getState().addSubscription({} as any);
      expect(res).toBeNull();
    });
  });

  describe('cancelSubscription', () => {
    it('marks subscription as cancelled', async () => {
      useBusStore.setState({ subscriptions: [mockSubscription] });

      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      await useBusStore.getState().cancelSubscription('sub-1');

      expect(useBusStore.getState().subscriptions[0].status).toBe('cancelled');
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      useBusStore.setState({
        subscriptions: [
          mockSubscription,
          { ...mockSubscription, id: 'sub-2', status: 'cancelled' },
          { ...mockSubscription, id: 'sub-3', studentId: 'std-2' },
        ]
      });
    });

    it('getRouteSubscribers returns only active', () => {
      const subs = useBusStore.getState().getRouteSubscribers('route-1');
      expect(subs).toHaveLength(2); // sub-1 and sub-3
    });

    it('getStudentSubscription finds active student sub', () => {
      const sub = useBusStore.getState().getStudentSubscription('std-1');
      expect(sub?.id).toBe('sub-1');
    });
  });
});
