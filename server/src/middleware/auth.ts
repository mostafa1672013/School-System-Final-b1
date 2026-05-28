import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

// ---- Types ----
export interface JwtPayload {
  userId: string;
  role: string;
  email: string;
  tokenVersion: number;
}

// Extend Express Request so downstream handlers can read req.user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '8h';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// ---- Token helpers ----
export function signToken(payload: JwtPayload): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as any };
  return jwt.sign(payload, JWT_SECRET as string, options);
}

// ---- requireAuth: verifies Bearer token, checks tokenVersion against DB, populates req.user ----
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET as string) as JwtPayload;

    // Verify tokenVersion and account status against DB
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { tokenVersion: true, active: true, deletedAt: true },
    });

    if (!user || user.deletedAt || !user.active) {
      return res.status(401).json({ error: 'Account inactive or deleted' });
    }
    if (user.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ error: 'Session invalidated. Please log in again.' });
    }

    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ---- requireRoles: factory for role-based guards (multi-role aware) ----
export function requireRoles(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    // Check UserRole table for multi-role support
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId: req.user.userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { role: true },
    });

    // Build role set: from UserRole table + fallback to JWT role
    const roleSet = new Set([
      ...userRoles.map(r => r.role),
      req.user.role, // backward compat fallback
    ]);

    if (!allowedRoles.some(r => roleSet.has(r))) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Convenience aliases used throughout the routes
export const adminOnly = requireRoles('system_admin');
export const managementRoles = requireRoles('system_admin', 'school_director', 'head_accountant');
export const accountantRoles = requireRoles('system_admin', 'school_director', 'head_accountant', 'accountant', 'treasury_accountant');
export const warehouseRoles = requireRoles('system_admin', 'school_director', 'warehouse_keeper');
export const accountingAndWarehouse = requireRoles('system_admin', 'school_director', 'head_accountant', 'accountant', 'warehouse_keeper');

// ---- Socket.IO auth: call inside io.use() ----
export function socketAuth(socket: any, next: (err?: Error) => void) {
  const token: string | undefined = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const payload = jwt.verify(token, JWT_SECRET as string) as any as JwtPayload;
    socket.data.user = payload;   // stored, not trusted from events
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}
