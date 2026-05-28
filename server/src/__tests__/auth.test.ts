import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, requireRoles, signToken } from '../middleware/auth';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const findUniqueMock = vi.fn();
const findManyMock = vi.fn();

// Mock dependencies
vi.mock('@prisma/client', () => {
  const mockPrismaClient = vi.fn();
  mockPrismaClient.prototype.user = { findUnique: vi.fn() };
  mockPrismaClient.prototype.userRole = { findMany: vi.fn() };
  return {
    PrismaClient: mockPrismaClient
  };
});

// Setup env variables for testing
process.env.JWT_SECRET = 'test-secret';

describe('Auth Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;
  let prismaMock: any;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();

    // Reset mocks on the prototype since the module instantiates it
    PrismaClient.prototype.user.findUnique = vi.fn();
    PrismaClient.prototype.userRole.findMany = vi.fn();
    prismaMock = PrismaClient.prototype;
    
    vi.clearAllMocks();
  });

  describe('signToken', () => {
    it('creates a valid JWT token', () => {
      const payload = { userId: '1', role: 'system_admin', email: 'test@example.com', tokenVersion: 1 };
      const token = signToken(payload);
      
      expect(token).toBeDefined();
      const decoded = jwt.verify(token, 'test-secret') as any;
      expect(decoded.userId).toBe('1');
      expect(decoded.role).toBe('system_admin');
    });
  });

  describe('requireAuth', () => {
    it('returns 401 if no authorization header', async () => {
      await requireAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 401 if invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';
      
      await requireAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 401 if user is not found or inactive', async () => {
      const token = signToken({ userId: '1', role: 'user', email: 'test@test.com', tokenVersion: 1 });
      mockReq.headers.authorization = `Bearer ${token}`;
      
      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      await requireAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Account inactive or deleted' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 401 if token version mismatch', async () => {
      const token = signToken({ userId: '1', role: 'user', email: 'test@test.com', tokenVersion: 1 });
      mockReq.headers.authorization = `Bearer ${token}`;
      
      prismaMock.user.findUnique.mockResolvedValueOnce({
        tokenVersion: 2, // Mismatch
        active: true,
        deletedAt: null
      });

      await requireAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Session invalidated. Please log in again.' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('calls next() and sets req.user on valid token', async () => {
      const payload = { userId: '1', role: 'system_admin', email: 'test@test.com', tokenVersion: 1 };
      const token = signToken(payload);
      mockReq.headers.authorization = `Bearer ${token}`;
      
      prismaMock.user.findUnique.mockResolvedValueOnce({
        tokenVersion: 1,
        active: true,
        deletedAt: null
      });

      await requireAuth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user.userId).toBe('1');
      expect(mockReq.user.role).toBe('system_admin');
    });
  });

  describe('requireRoles', () => {
    it('returns 401 if req.user is missing', async () => {
      const middleware = requireRoles('system_admin');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('returns 403 if user does not have required role', async () => {
      mockReq.user = { userId: '1', role: 'accountant' };
      prismaMock.userRole.findMany.mockResolvedValueOnce([]); // No extra roles

      const middleware = requireRoles('system_admin', 'school_director');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('calls next() if user has required role from JWT payload', async () => {
      mockReq.user = { userId: '1', role: 'system_admin' };
      prismaMock.userRole.findMany.mockResolvedValueOnce([]);

      const middleware = requireRoles('system_admin');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('calls next() if user has required role from UserRole table', async () => {
      mockReq.user = { userId: '1', role: 'user' }; // Base role
      prismaMock.userRole.findMany.mockResolvedValueOnce([
        { role: 'accountant' } // Additional role from DB
      ]);

      const middleware = requireRoles('accountant');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
