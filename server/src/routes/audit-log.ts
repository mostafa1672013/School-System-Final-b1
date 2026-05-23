import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, managementRoles } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/audit?entityType=Payment&entityId=xxx&userId=yyy&page=1
router.get('/', requireAuth, managementRoles, async (req, res) => {
  const { entityType, entityId, userId, page = '1' } = req.query as Record<string, string>;
  const PAGE_SIZE = 50;
  const skip = (Math.max(1, parseInt(page)) - 1) * PAGE_SIZE;

  const where = {
    ...(entityType && { entityType }),
    ...(entityId && { entityId }),
    ...(userId && { userId }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({
    logs,
    total,
    page: parseInt(page),
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
});

// GET /api/audit/entity/:entityType/:entityId — full history for a specific entity
router.get('/entity/:entityType/:entityId', requireAuth, managementRoles, async (req, res) => {
  const entityType = req.params.entityType as string;
  const entityId = req.params.entityId as string;
  const logs = await prisma.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'asc' },
  });
  res.json(logs);
});

export default router;
