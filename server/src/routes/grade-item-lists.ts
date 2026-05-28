import { Router } from 'express';
import { requireAuth, accountantRoles, accountingAndWarehouse } from '../middleware/auth';

const router = Router();
import { prisma } from '../lib/prisma';

// GET all lists (filterable by academicYear, term, stage, grade, track)
router.get('/', requireAuth, accountingAndWarehouse, async (req, res) => {
  try {
    const { academicYear, term, stage, grade, track } = req.query;
    const where: any = {};
    if (academicYear) where.academicYear = String(academicYear);
    if (term) where.term = String(term);
    if (stage) where.stage = String(stage);
    if (grade) where.grade = String(grade);
    if (track) where.track = String(track);

    const lists = await prisma.gradeItemList.findMany({
      where,
      include: {
        entries: {
          include: {
            inventoryItem: { select: { id: true, name: true, unit: true, category: true, quantity: true, unitPrice: true } },
            preferredSupplier: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: [{ academicYear: 'desc' }, { stage: 'asc' }, { grade: 'asc' }, { term: 'asc' }]
    });
    res.json(lists);
  } catch (error) {
    res.status(500).json({ error: 'فشل تحميل قوائم المستلزمات' });
  }
});

// GET single list by id
router.get('/:id', requireAuth, accountingAndWarehouse, async (req, res) => {
  try {
    const list = await prisma.gradeItemList.findUnique({
      where: { id: String(req.params.id) },
      include: {
        entries: {
          include: {
            inventoryItem: { select: { id: true, name: true, unit: true, category: true, quantity: true, grade: true, unitPrice: true } },
            preferredSupplier: { select: { id: true, name: true } }
          }
        }
      }
    });
    if (!list) return res.status(404).json({ error: 'القائمة غير موجودة' });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'فشل تحميل القائمة' });
  }
});

// POST create new list
router.post('/', requireAuth, accountantRoles, async (req, res) => {
  try {
    const { stage, grade, track, academicYear, term, entries } = req.body;
    const createdBy = (req as any).user!.userId;

    if (!stage || !grade || !academicYear || !term) {
      return res.status(400).json({ error: 'المرحلة والصف والسنة الدراسية والترم مطلوبة' });
    }
    if (!['1', '2', '3', 'summer'].includes(term)) {
      return res.status(400).json({ error: 'الترم يجب أن يكون 1 أو 2 أو 3 أو summer' });
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'يجب إضافة صنف واحد على الأقل' });
    }

    const list = await prisma.gradeItemList.create({
      data: {
        stage, grade,
        track: track || 'local',
        academicYear, term, createdBy,
        entries: {
          create: entries.map((e: any) => ({
            inventoryItemId: e.inventoryItemId,
            quantity: e.quantity || 1,
            sellingPrice: e.sellingPrice != null ? e.sellingPrice : null,
            preferredSupplierId: e.preferredSupplierId || null,
            notes: e.notes || null
          }))
        }
      },
      include: { entries: { include: { inventoryItem: true, preferredSupplier: true } } }
    });
    res.status(201).json(list);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'توجد قائمة مستلزمات لهذا الصف والترم بالفعل' });
    }
    res.status(400).json({ error: 'فشل إنشاء القائمة', details: error.message });
  }
});

// PATCH update entries (replace all entries for a list)
router.patch('/:id/entries', requireAuth, accountantRoles, async (req, res) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'يجب إضافة صنف واحد على الأقل' });
    }

    const list = await prisma.$transaction(async (tx) => {
      await tx.gradeItemListEntry.deleteMany({ where: { listId: String(req.params.id) } });
      return tx.gradeItemList.update({
        where: { id: String(req.params.id) },
        data: {
          updatedAt: new Date(),
          entries: {
            create: entries.map((e: any) => ({
              inventoryItemId: e.inventoryItemId,
              quantity: e.quantity || 1,
              sellingPrice: e.sellingPrice != null ? e.sellingPrice : null,
              preferredSupplierId: e.preferredSupplierId || null,
              notes: e.notes || null
            }))
          }
        },
        include: { entries: { include: { inventoryItem: true, preferredSupplier: true } } }
      });
    });
    res.json(list);
  } catch (error: any) {
    res.status(400).json({ error: 'فشل تحديث القائمة', details: error.message });
  }
});

// DELETE a list
router.delete('/:id', requireAuth, accountantRoles, async (req, res) => {
  try {
    const list = await prisma.gradeItemList.findUnique({ where: { id: String(req.params.id) } });
    if (!list) return res.status(404).json({ error: 'القائمة غير موجودة' });
    await prisma.gradeItemList.delete({ where: { id: String(req.params.id) } });
    res.json({ message: 'تم حذف القائمة بنجاح' });
  } catch (error: any) {
    res.status(400).json({ error: 'فشل حذف القائمة', details: error.message });
  }
});

export default router;
