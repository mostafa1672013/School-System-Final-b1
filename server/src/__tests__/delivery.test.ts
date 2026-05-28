import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import deliveryOrdersRouter from '../routes/delivery-orders';
import { PrismaClient } from '@prisma/client';

// Mock authentication middleware
vi.mock('../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { userId: '1', role: 'system_admin' };
    next();
  },
  requireRoles: () => (req: any, res: any, next: any) => next(),
  managementRoles: (req: any, res: any, next: any) => next(),
  accountingAndWarehouse: (req: any, res: any, next: any) => next(),
  accountantRoles: (req: any, res: any, next: any) => next(),
  warehouseRoles: (req: any, res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api/delivery-orders', deliveryOrdersRouter);

vi.mock('@prisma/client', () => {
  const mockPrismaClient = vi.fn();
  mockPrismaClient.prototype.deliveryOrder = { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() };
  mockPrismaClient.prototype.deliveryOrderItem = { update: vi.fn(), findMany: vi.fn() };
  mockPrismaClient.prototype.inventoryItem = { findUnique: vi.fn(), update: vi.fn() };
  mockPrismaClient.prototype.inventoryTransaction = { create: vi.fn() };
  mockPrismaClient.prototype.journalEntry = { create: vi.fn(), findFirst: vi.fn(), count: vi.fn().mockResolvedValue(0) };
  mockPrismaClient.prototype.account = { findMany: vi.fn(), findUnique: vi.fn().mockResolvedValue({ id: 'acc-1' }) };
  mockPrismaClient.prototype.$transaction = vi.fn((callback: any) => {
    if (typeof callback === 'function') return callback(mockPrismaClient.prototype);
    return Promise.all(callback);
  });
  return { PrismaClient: mockPrismaClient };
});

describe('Delivery Orders API', () => {
  let prismaMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock = PrismaClient.prototype;
  });

  describe('PATCH /api/delivery-orders/:id/deliver', () => {
    it('delivers order and updates inventory quantities', async () => {
      // Mock the order to be delivered
      const mockOrder = {
        id: 'order-1',
        status: 'confirmed',
        chargeType: 'within_fees',
        studentId: 'std-1',
        student: { name: 'Test Student' },
        items: [
          { id: 'item-1', inventoryItemId: 'item-1', quantity: 2, itemName: 'Math Book' }
        ]
      };

      prismaMock.deliveryOrder.findUnique.mockResolvedValue(mockOrder);

      // Mock the inventory item checks
      prismaMock.inventoryItem.findUnique.mockResolvedValue({
        id: 'item-1',
        quantity: 10, // Enough quantity
        name: 'Math Book',
        unitCost: 50,
      });

      const res = await request(app).patch('/api/delivery-orders/order-1/deliver');

      expect(res.status).toBe(200);

      // Verify transaction executed
      expect(prismaMock.$transaction).toHaveBeenCalled();

      // Verify inventory was deducted
      expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: expect.objectContaining({ quantity: { decrement: 2 } }),
        })
      );

      // Verify order status updated to delivered
      expect(prismaMock.deliveryOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({ status: 'delivered' }),
        })
      );
    });

    it('fails if inventory quantity is insufficient', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'confirmed',
        items: [
          { inventoryItemId: 'item-1', quantity: 15, itemName: 'Math Book' } // Need 15
        ]
      };

      prismaMock.deliveryOrder.findUnique.mockResolvedValue(mockOrder);

      prismaMock.inventoryItem.findUnique.mockResolvedValue({
        id: 'item-1',
        quantity: 10, // Only 10 available
        name: 'Math Book',
      });

      const res = await request(app).patch('/api/delivery-orders/order-1/deliver');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('الكمية المتوفرة');
      expect(prismaMock.deliveryOrder.update).not.toHaveBeenCalled();
    });

    it('fails if order is already delivered', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'delivered', // Already delivered
        items: []
      };

      prismaMock.deliveryOrder.findUnique.mockResolvedValue(mockOrder);

      const res = await request(app).patch('/api/delivery-orders/order-1/deliver');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('يجب تأكيد الطلب قبل التسليم');
    });
  });
});
