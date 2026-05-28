import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import miscRouter from '../routes/misc';
import { PrismaClient } from '@prisma/client';

// Mock authentication middleware
vi.mock('../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { userId: '1', role: 'system_admin' };
    next();
  },
  requireRoles: () => (req: any, res: any, next: any) => next(),
  managementRoles: (req: any, res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
// Mount the miscRouter on the root or on /api, we'll mount on root to simulate the main app
app.use('/api', miscRouter);

vi.mock('@prisma/client', () => {
  const mockPrismaClient = vi.fn();
  mockPrismaClient.prototype.busSubscription = { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findFirst: vi.fn() };
  mockPrismaClient.prototype.busRoute = { findUnique: vi.fn() };
  mockPrismaClient.prototype.student = { findUnique: vi.fn(), update: vi.fn() };
  mockPrismaClient.prototype.user = { findUnique: vi.fn() };
  mockPrismaClient.prototype.studentYearlyFinance = { findUnique: vi.fn(), update: vi.fn() };
  mockPrismaClient.prototype.$transaction = vi.fn((callback: any) => {
    if (typeof callback === 'function') return callback(mockPrismaClient.prototype);
    return Promise.all(callback);
  });
  return { PrismaClient: mockPrismaClient };
});

describe('Bus Subscriptions API', () => {
  let prismaMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock = PrismaClient.prototype;
  });

  describe('POST /api/bus-subscriptions', () => {
    it('creates subscription successfully', async () => {
      // Setup mock to return a count of 0 for code generation
      prismaMock.busSubscription.findFirst.mockResolvedValue(null);

      // Create returns the expected object
      const subData = { id: 'sub-1', code: 'SUB-2024-0001', routeId: 'route-1' };
      prismaMock.busSubscription.create.mockResolvedValue(subData);

      const reqData = {
        subscriberType: 'student',
        studentId: 'std-1',
        routeId: 'route-1',
        academicYear: '2024-2025',
        startDate: '2024-09-01',
        fullFeeAmount: 5000,
        actualAmount: 4500,
      };

      const res = await request(app).post('/api/bus-subscriptions').send(reqData);

      expect(res.status).toBe(201);
      
      // Verify subscription is created with sent data
      expect(prismaMock.busSubscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            studentId: 'std-1',
            routeId: 'route-1',
            fullFeeAmount: 5000,
            actualAmount: 4500,
            academicYear: '2024-2025',
            code: expect.stringMatching(/^SUB-\d{4}-\d{4}$/), // Checks code generator output
          })
        })
      );
    });

    it('generates sequential codes correctly', async () => {
      const year = new Date().getFullYear();
      // Setup mock to simulate an existing code
      prismaMock.busSubscription.findFirst.mockResolvedValue({
        code: `SUB-${year}-0005`
      });

      prismaMock.busSubscription.create.mockResolvedValue({ id: 'sub-2' });

      const reqData = {
        subscriberType: 'employee',
        subscriberName: 'John Doe',
        routeId: 'route-2',
        academicYear: '2024-2025',
        startDate: '2024-09-01',
      };

      const res = await request(app).post('/api/bus-subscriptions').send(reqData);

      expect(res.status).toBe(201);
      
      // The next code should be 0006
      expect(prismaMock.busSubscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: `SUB-${year}-0006`,
          })
        })
      );
    });
  });
});
