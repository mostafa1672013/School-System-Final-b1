import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import studentsRouter from '../routes/students';
import { encryptNationalId, decryptNationalId } from '../lib/crypto';
import { PrismaClient } from '@prisma/client';

// Mock crypto module
vi.mock('../lib/crypto', () => ({
  encryptNationalId: vi.fn((id: string) => `encrypted_${id}`),
  decryptNationalId: vi.fn((id: string) => id.replace('encrypted_', '')),
  hashNationalId: vi.fn((id: string) => `hashed_${id}`),
}));

// Mock authentication middleware to pass through
vi.mock('../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => next(),
  requireRoles: () => (req: any, res: any, next: any) => next(),
  managementRoles: (req: any, res: any, next: any) => next(),
}));

// Setup express app with the router
const app = express();
app.use(express.json());
app.use('/api/students', studentsRouter);

vi.mock('@prisma/client', () => {
  const mockPrismaClient = vi.fn();
  mockPrismaClient.prototype.student = { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() };
  mockPrismaClient.prototype.studentYearlyFinance = { upsert: vi.fn() };
  mockPrismaClient.prototype.payment = { count: vi.fn() };
  mockPrismaClient.prototype.$transaction = vi.fn((callback: any) => {
    if (Array.isArray(callback)) return Promise.all(callback);
    if (typeof callback === 'function') return callback(mockPrismaClient.prototype);
    return callback;
  });
  mockPrismaClient.prototype.account = { findUnique: vi.fn(), findMany: vi.fn() };
  mockPrismaClient.prototype.journalEntry = { findFirst: vi.fn(), count: vi.fn().mockResolvedValue(10), create: vi.fn() };
  mockPrismaClient.prototype.badge = { findUnique: vi.fn() };
  return { PrismaClient: mockPrismaClient };
});

describe('Students Routes', () => {
  let prismaMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock = PrismaClient.prototype;
  });

  describe('GET /api/students', () => {
    it('returns decrypted national IDs', async () => {
      const mockStudents = [
        { id: '1', nationalId: 'encrypted_123456', name: 'Test' }
      ];
      prismaMock.student.findMany.mockResolvedValue(mockStudents);

      const res = await request(app).get('/api/students');

      expect(res.status).toBe(200);
      expect(res.body[0].nationalId).toBe('123456');
      expect(decryptNationalId).toHaveBeenCalledWith('encrypted_123456');
    });
  });

  describe('POST /api/students', () => {
    it('encrypts national ID before saving', async () => {
      const studentData = { name: 'Test', nationalId: '123456' };
      prismaMock.student.create.mockImplementation(({ data }: any) => {
        return Promise.resolve({ ...data, id: '1' });
      });

      const res = await request(app).post('/api/students').send(studentData);

      expect(res.status).toBe(201);
      expect(encryptNationalId).toHaveBeenCalledWith('123456');
      expect(prismaMock.student.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nationalId: 'encrypted_123456',
            nationalIdHash: 'hashed_123456'
          })
        })
      );
    });
  });

  describe('PATCH /api/students/:id/promote', () => {
    it('updates student and creates yearly finance snapshots', async () => {
      const currentStudent = {
        id: '1',
        academicYear: '2023-2024',
        stage: 'primary',
        grade: 'G1',
        tuitionFees: 5000,
        booksFees: 0,
        uniformFees: 0,
        busFees: 0,
        otherFees: 0,
        arrearsFees: 0,
        totalFees: 5000,
        payments: [{ amount: 2000, type: 'tuition', academicYear: '2023-2024' }]
      };

      prismaMock.student.findUnique.mockResolvedValue(currentStudent);
      prismaMock.student.update.mockResolvedValue({ ...currentStudent, academicYear: '2024-2025' });
      prismaMock.studentYearlyFinance.upsert.mockResolvedValue({});

      const promotionData = {
        stage: 'primary',
        grade: 'G2',
        academicYear: '2024-2025',
        tuitionFees: 6000,
        booksFees: 0,
        uniformFees: 0,
        busFees: 0,
        otherFees: 0,
        arrearsFees: 3000,
        totalFees: 9000,
        status: 'active'
      };

      const res = await request(app).post('/api/students/1/promote').send(promotionData);

      expect(res.status).toBe(200);
      expect(prismaMock.$transaction).toHaveBeenCalled();
      
      // Verify the old year snapshot had the correct paidAmount (2000)
      expect(prismaMock.studentYearlyFinance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId_academicYear: { studentId: '1', academicYear: '2023-2024' } },
          create: expect.objectContaining({ paidAmount: 2000 }),
          update: expect.objectContaining({ paidAmount: 2000 }),
        })
      );

      // Verify the new year snapshot resets paidAmount to 0
      expect(prismaMock.studentYearlyFinance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId_academicYear: { studentId: '1', academicYear: '2024-2025' } },
          create: expect.objectContaining({ paidAmount: 0, arrearsFees: 3000 }),
          update: expect.objectContaining({ paidAmount: 0, arrearsFees: 3000 }),
        })
      );
    });
  });

  describe('PATCH /api/students/:id/badge', () => {
    it('applies badge discount correctly', async () => {
      // Gross fee = 10000, no existing discount -> totalFees = 10000, discountAmount = 0
      prismaMock.student.findUnique.mockResolvedValue({
        id: '1',
        totalFees: 10000,
        discountAmount: 0,
      });

      // Badge gives 20% discount
      prismaMock.badge.findUnique.mockResolvedValue({
        id: 'badge-1',
        discountPercentage: 20
      });

      prismaMock.student.update.mockResolvedValue({});

      const res = await request(app).patch('/api/students/1/badge').send({ badgeId: 'badge-1' });

      expect(res.status).toBe(200);
      expect(prismaMock.student.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({
            badgeId: 'badge-1',
            discountPercentage: 20,
            discountAmount: 2000, // 20% of 10000
            totalFees: 8000,      // 10000 - 2000
            discountStatus: 'approved',
            discountApprovedBy: 'badge_system'
          })
        })
      );
    });

    it('removes badge and restores gross fees', async () => {
      // Gross fee = 10000 (8000 net + 2000 discount)
      prismaMock.student.findUnique.mockResolvedValue({
        id: '1',
        totalFees: 8000,
        discountAmount: 2000,
      });

      prismaMock.student.update.mockResolvedValue({});

      const res = await request(app).patch('/api/students/1/badge').send({ badgeId: null });

      expect(res.status).toBe(200);
      expect(prismaMock.student.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({
            badgeId: null,
            discountPercentage: 0,
            discountAmount: 0,
            totalFees: 10000, // Restored back to gross
          })
        })
      );
    });
  });
});
