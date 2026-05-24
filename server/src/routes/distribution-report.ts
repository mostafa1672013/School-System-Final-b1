import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, accountingAndWarehouse } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET grade-level distribution summary
// Query: academicYear (required), term (required)
router.get('/grade-summary', requireAuth, accountingAndWarehouse, async (req, res) => {
  try {
    const { academicYear, term } = req.query;
    if (!academicYear || !term) {
      return res.status(400).json({ error: 'السنة الدراسية والترم مطلوبان' });
    }

    const lists = await prisma.gradeItemList.findMany({
      where: { academicYear: String(academicYear), term: String(term) },
      include: {
        entries: { include: { inventoryItem: true } }
      }
    });

    const result = await Promise.all(lists.map(async (list) => {
      const studentCount = await prisma.student.count({
        where: {
          stage: list.stage,
          grade: list.grade,
          track: list.track,
          academicYear: String(academicYear),
          deletedAt: null
        }
      });

      const entryStats = await Promise.all(list.entries.map(async (entry) => {
        const required = entry.quantity * studentCount;
        const currentStock = Number(entry.inventoryItem.quantity);

        const deliveredItems = await prisma.deliveryOrderItem.aggregate({
          where: {
            inventoryItemId: entry.inventoryItemId,
            deliveredAt: { not: null },
            returnedAt: null,
            order: { academicYear: String(academicYear), term: String(term), status: 'delivered' }
          },
          _sum: { quantity: true }
        });
        const delivered = deliveredItems._sum.quantity || 0;
        const deficit = required - (currentStock + delivered);

        return {
          inventoryItemId: entry.inventoryItemId,
          itemName: entry.inventoryItem.name,
          unit: entry.inventoryItem.unit,
          quantityPerStudent: entry.quantity,
          preferredSupplierId: entry.preferredSupplierId,
          required,
          currentStock,
          delivered,
          deficit,
          needsPurchase: deficit > 0
        };
      }));

      return {
        listId: list.id,
        stage: list.stage,
        grade: list.grade,
        track: list.track,
        term: list.term,
        studentCount,
        items: entryStats
      };
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'فشل تحميل تقرير التوزيع' });
  }
});

// GET per-student receipt status for a grade
// Query: academicYear, term, stage, grade, track
router.get('/student-status', requireAuth, accountingAndWarehouse, async (req, res) => {
  try {
    const { academicYear, term, stage, grade, track } = req.query;
    if (!academicYear || !term || !stage || !grade) {
      return res.status(400).json({ error: 'السنة الدراسية والترم والمرحلة والصف مطلوبة' });
    }

    const list = await prisma.gradeItemList.findFirst({
      where: {
        academicYear: String(academicYear), term: String(term),
        stage: String(stage), grade: String(grade), track: String(track || 'local')
      },
      include: { entries: { include: { inventoryItem: true } } }
    });

    const students = await prisma.student.findMany({
      where: {
        stage: String(stage), grade: String(grade),
        track: String(track || 'local'),
        academicYear: String(academicYear),
        deletedAt: null
      },
      select: { id: true, name: true, grade: true, stage: true }
    });

    const studentStatuses = await Promise.all(students.map(async (student) => {
      const orders = await prisma.deliveryOrder.findMany({
        where: {
          studentId: student.id,
          academicYear: String(academicYear),
          term: String(term)
        },
        include: { items: { include: { inventoryItem: true } } }
      });

      const receivedItems = orders.flatMap(o =>
        o.items.filter(i => i.deliveredAt && !i.returnedAt)
          .map(i => ({
            itemName: i.itemName,
            inventoryItemId: i.inventoryItemId,
            quantity: i.quantity,
            deliveredAt: i.deliveredAt,
            orderCode: o.code
          }))
      );

      const hasActiveOrder = orders.some(o => ['pending', 'confirmed'].includes(o.status));
      const hasDelivery = receivedItems.length > 0;

      return {
        studentId: student.id,
        studentName: student.name,
        status: hasDelivery ? 'delivered' : hasActiveOrder ? 'in_progress' : 'not_started',
        receivedItems,
        pendingOrdersCount: orders.filter(o => o.status === 'pending').length,
        confirmedOrdersCount: orders.filter(o => o.status === 'confirmed').length
      };
    }));

    res.json({
      gradeItemList: list,
      students: studentStatuses,
      summary: {
        total: students.length,
        delivered: studentStatuses.filter(s => s.status === 'delivered').length,
        inProgress: studentStatuses.filter(s => s.status === 'in_progress').length,
        notStarted: studentStatuses.filter(s => s.status === 'not_started').length
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'فشل تحميل حالة الطلاب' });
  }
});

export default router;
