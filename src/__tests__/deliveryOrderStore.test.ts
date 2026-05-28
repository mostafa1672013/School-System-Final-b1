import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDeliveryOrderStore } from '@/stores/deliveryOrderStore';

const globalFetch = global.fetch;

const mockOrder = {
  id: 'order-1',
  code: 'DEL-001',
  studentId: 'std-1',
  academicYear: '2024-2025',
  term: 'first',
  status: 'pending' as const,
  chargeType: 'within_fees' as const,
  requestedBy: 'admin',
  totalAmount: 500,
  items: [
    {
      id: 'item-1',
      orderId: 'order-1',
      inventoryItemId: 'inv-1',
      itemName: 'Math Book',
      quantity: 1,
      unitPrice: 500,
      totalAmount: 500,
      createdAt: '2024-06-01'
    }
  ],
  createdAt: '2024-06-01',
  updatedAt: '2024-06-01'
};

describe('DeliveryOrder Store', () => {
  beforeEach(() => {
    useDeliveryOrderStore.setState({
      orders: [],
      loading: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = globalFetch;
  });

  describe('fetchOrders', () => {
    it('fetches orders and updates state', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockOrder]),
      });

      await useDeliveryOrderStore.getState().fetchOrders();

      const state = useDeliveryOrderStore.getState();
      expect(state.loading).toBe(false);
      expect(state.orders).toHaveLength(1);
      expect(state.orders[0]).toEqual(mockOrder);
    });

    it('builds query parameters correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await useDeliveryOrderStore.getState().fetchOrders({ status: 'pending', studentId: 'std-1' });

      expect(global.fetch).toHaveBeenCalledWith('/api/delivery-orders?status=pending&studentId=std-1', expect.any(Object));
    });

    it('handles fetch failure gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await useDeliveryOrderStore.getState().fetchOrders();

      const state = useDeliveryOrderStore.getState();
      expect(state.loading).toBe(false);
      expect(state.orders).toHaveLength(0);
    });
  });

  describe('createOrder', () => {
    it('creates order successfully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOrder),
      });

      const result = await useDeliveryOrderStore.getState().createOrder({
        studentId: 'std-1',
        academicYear: '2024-2025',
        term: 'first',
        chargeType: 'within_fees',
        items: [{ inventoryItemId: 'inv-1', itemName: 'Math Book', quantity: 1, unitPrice: 500 }]
      });

      expect(result).toEqual(mockOrder);
      expect(useDeliveryOrderStore.getState().orders).toHaveLength(1);
    });

    it('throws error on failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Insufficient quantity' }),
      });

      await expect(useDeliveryOrderStore.getState().createOrder({} as any)).rejects.toThrow('Insufficient quantity');
    });
  });

  describe('confirmOrder', () => {
    it('returns true on success and refetches', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true }) // confirm
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockOrder]) }); // fetchOrders

      const result = await useDeliveryOrderStore.getState().confirmOrder('order-1');
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('throws on failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Order not found' })
      });

      await expect(useDeliveryOrderStore.getState().confirmOrder('order-1')).rejects.toThrow('Order not found');
    });
  });

  describe('deliverOrder', () => {
    it('returns true on success and refetches', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true }) // deliver
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockOrder]) }); // fetchOrders

      const result = await useDeliveryOrderStore.getState().deliverOrder('order-1');
      expect(result).toBe(true);
    });
  });

  describe('returnItem', () => {
    it('returns true on success and refetches', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true }) // return
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockOrder]) }); // fetchOrders

      const result = await useDeliveryOrderStore.getState().returnItem('order-1', 'item-1', 'Damaged');
      expect(result).toBe(true);
    });
  });

  describe('cancelOrder', () => {
    it('returns true and removes order from state', async () => {
      useDeliveryOrderStore.setState({ orders: [mockOrder] });

      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      const result = await useDeliveryOrderStore.getState().cancelOrder('order-1');
      expect(result).toBe(true);
      expect(useDeliveryOrderStore.getState().orders).toHaveLength(0);
    });

    it('returns false on failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });
      const result = await useDeliveryOrderStore.getState().cancelOrder('order-1');
      expect(result).toBe(false);
    });
  });
});
