import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useInventoryStore } from '@/stores/inventoryStore';

const globalFetch = global.fetch;

const mockItem = {
  id: 'item-1',
  name: 'Test Item',
  category: 'books',
  itemType: 'sale' as const,
  quantity: 100,
  minQuantity: 10,
  unit: 'book',
  unitCost: 50,
  unitPrice: 100,
  lastUpdated: '2024-06-01',
};

const mockCategory = {
  id: 'cat-1',
  key: 'books',
  name: 'Books',
  createdAt: '2024-06-01',
  updatedAt: '2024-06-01',
};

describe('Inventory Store', () => {
  beforeEach(() => {
    useInventoryStore.setState({
      items: [],
      transactions: [],
      categories: [],
      loading: false,
      categoriesLoading: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = globalFetch;
  });

  describe('fetchItems', () => {
    it('fetches items and updates state', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockItem]),
      });

      await useInventoryStore.getState().fetchItems();

      expect(useInventoryStore.getState().loading).toBe(false);
      expect(useInventoryStore.getState().items).toHaveLength(1);
    });
  });

  describe('addItem', () => {
    it('returns true on success and refetches items', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true }) // addItem
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockItem]) }); // fetchItems

      const success = await useInventoryStore.getState().addItem({ ...mockItem } as any);

      expect(success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('returns false on failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });
      const success = await useInventoryStore.getState().addItem({} as any);
      expect(success).toBe(false);
    });
  });

  describe('updateItem', () => {
    it('returns true on success and refetches', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockItem]) });

      const success = await useInventoryStore.getState().updateItem('item-1', { name: 'Updated' });

      expect(success).toBe(true);
    });
  });

  describe('deleteItem', () => {
    it('returns true on success and refetches', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      const success = await useInventoryStore.getState().deleteItem('item-1');

      expect(success).toBe(true);
    });
  });

  describe('receiveStock and issueStock', () => {
    it('receiveStock returns true on success', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true }) // receive
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // fetchItems
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // fetchTransactions

      const success = await useInventoryStore.getState().receiveStock({
        itemId: 'item-1',
        quantity: 50,
        subType: 'adjustment',
        performedBy: 'admin'
      });

      expect(success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('issueStock returns true on success', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true }) // issue
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // fetchItems
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // fetchTransactions

      const success = await useInventoryStore.getState().issueStock({
        itemId: 'item-1',
        quantity: 5,
        subType: 'sale',
        performedBy: 'admin'
      });

      expect(success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('issueStock returns false on failure (e.g. insufficient quantity)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Insufficient quantity' })
      });

      const success = await useInventoryStore.getState().issueStock({
        itemId: 'item-1',
        quantity: 500, // greater than available
        subType: 'sale',
        performedBy: 'admin'
      });

      expect(success).toBe(false);
    });
  });

  describe('Categories Management', () => {
    it('fetchCategories updates state', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockCategory]),
      });

      await useInventoryStore.getState().fetchCategories();

      expect(useInventoryStore.getState().categories).toHaveLength(1);
    });

    it('addCategory returns true', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockCategory]) });

      const success = await useInventoryStore.getState().addCategory({ key: 'books', name: 'Books' });
      expect(success).toBe(true);
    });

    it('updateCategory returns true', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockCategory]) });

      const success = await useInventoryStore.getState().updateCategory('cat-1', 'New Name');
      expect(success).toBe(true);
    });

    it('deleteCategory returns success object', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      const result = await useInventoryStore.getState().deleteCategory('cat-1');
      expect(result.success).toBe(true);
    });

    it('deleteCategory returns error message on failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Category in use' })
      });

      const result = await useInventoryStore.getState().deleteCategory('cat-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Category in use');
    });
  });
});
