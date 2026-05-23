import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRoles } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ===== BADGES =====
// Mounted at /api/badges

router.get('/badges', async (req, res) => {
  try {
    const badges = await prisma.badge.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { students: true } } }
    });
    res.json(badges);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

router.post('/badges', requireRoles('system_admin', 'school_director'), async (req, res) => {
  try {
    const { name, color, icon, discountPercentage, description } = req.body;
    const badge = await prisma.badge.create({
      data: { name, color, icon, discountPercentage: Number(discountPercentage), description }
    });
    res.status(201).json(badge);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create badge' });
  }
});

router.patch('/badges/:id', requireRoles('system_admin', 'school_director'), async (req, res) => {
  const { id } = req.params;
  try {
    const { name, color, icon, discountPercentage, description } = req.body;
    const badge = await prisma.badge.update({
      where: { id: String(id) },
      data: { name, color, icon, discountPercentage: Number(discountPercentage), description }
    });
    res.json(badge);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update badge' });
  }
});

router.delete('/badges/:id', requireRoles('system_admin', 'school_director'), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.badge.delete({ where: { id: String(id) } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete badge' });
  }
});

// ===== BUS ROUTES =====
// Mounted at /api/bus-routes

router.get('/bus-routes', async (req, res) => {
  try {
    const routes = await prisma.busRoute.findMany();
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bus routes' });
  }
});

router.post('/bus-routes', async (req, res) => {
  console.log('🚌 محاولة إنشاء خط باص جديد:', req.body.name);
  try {
    const route = await prisma.busRoute.create({
      data: req.body
    });
    console.log('✅ تم إنشاء الخط بنجاح:', route.id);
    res.json(route);
  } catch (error) {
    console.error('❌ فشل إنشاء الخط:', error);
    res.status(500).json({ error: 'Failed to create bus route' });
  }
});

router.patch('/bus-routes/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  console.log(`📝 محاولة تعديل الخط: ${id}`, req.body);
  try {
    const route = await prisma.busRoute.update({
      where: { id },
      data: req.body
    });
    console.log('✅ تم التعديل بنجاح');
    res.json(route);
  } catch (error) {
    console.error('❌ فشل التعديل:', error);
    res.status(500).json({ error: 'Failed to update bus route' });
  }
});

// ===== BUS SUBSCRIPTIONS =====
// Mounted at /api/bus-subscriptions

async function generateSubCode(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.busSubscription.count();
  return `SUB-${year}-${String(count + 1).padStart(4, '0')}`;
}

router.get('/bus-subscriptions', requireAuth, async (req, res) => {
  try {
    const { routeId, status, academicYear } = req.query as Record<string, string>;
    const where: any = {};
    if (routeId) where.routeId = routeId;
    if (status) where.status = status;
    if (academicYear) where.academicYear = academicYear;
    const subs = await prisma.busSubscription.findMany({
      where,
      include: { route: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(subs);
  } catch (error) {
    console.error('Fetch subscriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

router.post('/bus-subscriptions', requireAuth, async (req, res) => {
  try {
    const code = await generateSubCode();
    const sub = await prisma.busSubscription.create({
      data: { ...req.body, code },
      include: { route: true },
    });
    console.log('✅ اشتراك جديد:', sub.code);
    res.json(sub);
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

router.patch('/bus-subscriptions/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const sub = await prisma.busSubscription.update({
      where: { id },
      data: req.body,
      include: { route: true },
    });
    res.json(sub);
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

router.delete('/bus-subscriptions/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.busSubscription.update({
      where: { id },
      data: { status: 'cancelled' },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ===== SETTINGS =====
// Mounted at /api/settings

router.get('/settings/academic-year', requireAuth, async (req, res) => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'activeAcademicYear' },
    });
    res.json({ academicYear: setting?.value ?? '2024-2025' });
  } catch (error) {
    res.status(500).json({ error: 'فشل جلب السنة الدراسية' });
  }
});

router.put('/settings/academic-year', requireRoles('school_director', 'head_accountant'), async (req, res) => {
  const { academicYear } = req.body;
  if (!academicYear || typeof academicYear !== 'string') {
    return res.status(400).json({ error: 'السنة الدراسية مطلوبة' });
  }
  try {
    const setting = await prisma.systemSetting.upsert({
      where: { key: 'activeAcademicYear' },
      create: { key: 'activeAcademicYear', value: academicYear },
      update: { value: academicYear },
    });
    res.json({ academicYear: setting.value });
  } catch (error) {
    res.status(500).json({ error: 'فشل تحديث السنة الدراسية' });
  }
});

export default router;
