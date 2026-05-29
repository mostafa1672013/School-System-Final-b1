import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { InventoryItem, InventoryTransaction } from '@/types';
import { mockInventory, mockInventoryTransactions } from '@/constants/mockData';
import { generateId } from '@/lib/utils';

interface InventoryState {
  items: InventoryItem[];
  transactions: InventoryTransaction[];
  addItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateItem: (id: string, data: Partial<InventoryItem>) => void;
  addTransaction: (tx: Omit<InventoryTransaction, 'id'>) => void;
  receiveStock: (itemId: string, quantity: number, performedBy: string, notes?: string) => void;
  issueStock: (itemId: string, quantity: number, performedBy: string, studentId?: string, studentName?: string, notes?: string) => void;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      items: mockInventory,
      transactions: mockInventoryTransactions,
      addItem: (item) => set((state) => ({
        items: [...state.items, { ...item, id: generateId() }],
      })),
      updateItem: (id, data) => set((state) => ({
        items: state.items.map((i) => i.id === id ? { ...i, ...data } : i),
      })),
      addTransaction: (tx) => set((state) => ({
        transactions: [{ ...tx, id: generateId() }, ...state.transactions],
      })),
      receiveStock: (itemId, quantity, performedBy, notes) => {
        const item = get().items.find((i) => i.id === itemId);
        if (!item) return;
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, quantity: i.quantity + quantity, lastUpdated: new Date().toISOString().split('T')[0] } : i
          ),
          transactions: [
            { id: generateId(), itemId, itemName: item.name, type: 'in', quantity, date: new Date().toISOString().split('T')[0], notes, performedBy },
            ...state.transactions,
          ],
        }));
      },
      issueStock: (itemId, quantity, performedBy, studentId, studentName, notes) => {
        const item = get().items.find((i) => i.id === itemId);
        if (!item || item.quantity < quantity) return;
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, quantity: i.quantity - quantity, lastUpdated: new Date().toISOString().split('T')[0] } : i
          ),
          transactions: [
            { id: generateId(), itemId, itemName: item.name, type: 'out', quantity, date: new Date().toISOString().split('T')[0], studentId, studentName, notes, performedBy },
            ...state.transactions,
          ],
        }));
      },
    }),
    { name: 'school-inventory' }
  )
);
