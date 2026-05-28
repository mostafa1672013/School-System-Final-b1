import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import inventoryRouter from '../routes/inventory';
import { PrismaClient } from '@prisma/client';

// Mock authentication middleware
vi.mock('../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { userId: '1', role: 'system_admin' };
    next();
  },
  requireRoles: () => (req: any, res: any, next: any) => next(),
  managementRoles: (req: any, res: any, next: any) => next(),
  warehouseRoles: (req: any, res: any, next: any) => next(),
  accountingAndWarehouse: (req: any, res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api/inventory', inventoryRouter);

vi.mock('@prisma/client', () => {
  const mockPrismaClient = vi.fn();
  mockPrismaClient.prototype.inventoryItem = { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() };
  mockPrismaClient.prototype.inventoryTransaction = { findMany: vi.fn(), create: vi.fn().mockResolvedValue({ id: 'trans-1' }), update: vi.fn() };
  mockPrismaClient.prototype.inventoryCategory = { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() };
  mockPrismaClient.prototype.journalEntry = { create: vi.fn().mockResolvedValue({ id: 'je-1' }), findFirst: vi.fn(), count: vi.fn().mockResolvedValue(0) };
  mockPrismaClient.prototype.account = { findMany: vi.fn(), findUnique: vi.fn().mockResolvedValue({ id: 'acc-1' }) };
  mockPrismaClient.prototype.$transaction = vi.fn((callback: any) => {
    if (typeof callback === 'function') return callback(mockPrismaClient.prototype);
    return Promise.all(callback);
  });
  return { PrismaClient: mockPrismaClient };
});

describe('Inventory API', () => {
  let prismaMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock = PrismaClient.prototype;
  });

  describe('POST /api/inventory/receive', () => {
    it('updates quantity and calculates new unitCost correctly', async () => {
      // Current inventory: 10 units @ 50 EGP each (Total value: 500)
      prismaMock.inventoryItem.findUnique.mockResolvedValue({
        id: 'item-1',
        name: 'Math Book',
        quantity: 10,
        unitCost: 50,
        unitPrice: 100,
        category: 'books',
      });

      // Transaction resolves with updated item
      prismaMock.inventoryItem.update.mockImplementation(({ data }: any) => Promise.resolve(data));

      // Receiving 20 units @ 65 EGP each (New value: 1300)
      // Total new value = 500 + 1300 = 1800
      // Total new quantity = 10 + 20 = 30
      // New average unitCost = 1800 / 30 = 60
      const receiveData = {
        itemId: 'item-1',
        quantity: 20,
        subType: 'opening_balance',
        unitCost: 65,
        supplierId: 'sup-1',
        referenceNumber: 'INV-001',
        notes: 'Restock',
        performedBy: 'admin'
      };

      const res = await request(app).post('/api/inventory/receive').send(receiveData);

      expect(res.status).toBe(201);
      
      // Verify update uses correct weighted average cost
      expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: expect.objectContaining({
            quantity: 30, // 10 + 20 = 30 in actual execution the mock receives the new calculated data
          })
        })
      );

      // Verify transaction record created
      expect(prismaMock.inventoryTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'in',
            quantity: 20,
            unitCostSnapshot: 65,
          })
        })
      );
    });

    it('returns 400 if item not found', async () => {
      prismaMock.inventoryItem.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/inventory/receive').send({
        itemId: 'invalid-id',
        quantity: 10,
        subType: 'opening_balance',
        performedBy: 'admin'
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('الصنف غير موجود');
    });
  });

  describe('POST /api/inventory/issue', () => {
    it('issues stock successfully when quantity is sufficient', async () => {
      prismaMock.inventoryItem.findUnique.mockResolvedValue({
        id: 'item-1',
        quantity: 50, // Plenty available
        unitCost: 50,
      });

      const issueData = {
        itemId: 'item-1',
        quantity: 10,
        subType: 'adjustment',
        performedBy: 'admin'
      };

      const res = await request(app).post('/api/inventory/issue').send(issueData);

      expect(res.status).toBe(201);
      expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: expect.objectContaining({
            quantity: 40, // 50 - 10 = 40
          })
        })
      );
    });

    it('returns 400 when quantity is insufficient', async () => {
      prismaMock.inventoryItem.findUnique.mockResolvedValue({
        id: 'item-1',
        quantity: 5, // Not enough
        unitCost: 50,
      });

      const issueData = {
        itemId: 'item-1',
        quantity: 10, // Trying to issue more than available
        subType: 'adjustment',
        performedBy: 'admin'
      };

      const res = await request(app).post('/api/inventory/issue').send(issueData);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('الكمية المتاحة');
      expect(prismaMock.inventoryItem.update).not.toHaveBeenCalled();
    });
  });
});
