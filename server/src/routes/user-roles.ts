import { Router } from 'express';
import { requireAuth, adminOnly } from '../middleware/auth';

const router = Router();
import { prisma } from '../lib/prisma';

// GET /api/user-roles/:userId — list all roles for a user
router.get('/:userId', requireAuth, adminOnly, async (req, res) => {
  const userId = req.params.userId as string;
  const roles = await prisma.userRole.findMany({
    where: { userId },
    orderBy: { assignedAt: 'desc' },
  });
  res.json(roles);
});

// POST /api/user-roles — assign a role to a user
router.post('/', requireAuth, adminOnly, async (req, res) => {
  const { userId, role, expiresAt, notes } = req.body;
  if (!userId || !role) {
    return res.status(400).json({ error: 'userId and role are required' });
  }
  try {
    const userRole = await prisma.userRole.upsert({
      where: { userId_role: { userId, role } },
      update: { expiresAt: expiresAt ? new Date(expiresAt) : null, notes },
      create: {
        userId,
        role,
        assignedBy: req.user!.userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        notes,
      },
    });
    res.status(201).json(userRole);
  } catch {
    res.status(400).json({ error: 'Failed to assign role' });
  }
});

// DELETE /api/user-roles/:userId/:role — remove a role from a user
router.delete('/:userId/:role', requireAuth, adminOnly, async (req, res) => {
  const userId = req.params.userId as string;
  const role = req.params.role as string;
  try {
    await prisma.userRole.delete({
      where: { userId_role: { userId, role } },
    });
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Role assignment not found' });
  }
});

export default router;
