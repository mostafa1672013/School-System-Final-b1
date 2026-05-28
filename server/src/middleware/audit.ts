import { Request } from 'express';

import { prisma } from '../lib/prisma';

export interface AuditContext {
  userId: string;
  userName: string;
  ip: string | undefined;
  userAgent: string | undefined;
}

export function getAuditContext(req: Request): AuditContext {
  return {
    userId: req.user?.userId ?? 'system',
    userName: (req.user as any)?.name ?? req.user?.email ?? 'unknown',
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

export async function audit(
  ctx: AuditContext,
  action: string,
  entityType: string,
  entityId: string | null,
  before: object | null,
  after: object | null,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: ctx.userId,
        userName: ctx.userName,
        action,
        entityType,
        entityId: entityId ?? undefined,
        before: before as any ?? undefined,
        after: after as any ?? undefined,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      },
    });
  } catch (err) {
    // Audit failures must never crash the main operation
    console.error('[AuditLog] Failed to write audit entry:', err);
  }
}
