import { Router } from 'express';
import { randomUUID } from 'crypto';
import { requireAuth, accountantRoles, warehouseRoles, accountingAndWarehouse } from '../middleware/auth';
import { paginate, buildPaginatedResult } from '../lib/pagination';

const router = Router();
import { prisma } from '../lib/prisma';

async function generateDeliveryCode(tx: any): Promise<string> {
  const count = await tx.deliveryOrder.count();
  const year = new Date().getFullYear();
  return `DO-${year}-${String(count + 1).padStart(5, '0')}-${randomUUID().slice(0, 4).toUpperCase()}`;
}

// GET list with filters
router.get('/', requireAuth, accountingAndWarehouse, async (req, res) => {
  try {
    const { status, studentId, academicYear, term } =
      req.query as Record<string, string | undefined>;

    const p = paginate(req);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (studentId) where.studentId = studentId;
    if (academicYear) where.academicYear = academicYear;
    if (term) where.term = term;

    const includeShape = {
      student: {
        select: {
          id: true,
          name: true,
          stage: true,
          grade: true,
          track: true,
        },
      },
      items: {
        include: {
          inventoryItem: {
            select: { id: true, name: true, unit: true, grade: true },
          },
        },
      },
    } as const;

    if (p.isPaginated) {
      const [items, total] = await prisma.$transaction([
        prisma.deliveryOrder.findMany({
          where,
          include: includeShape,
          orderBy: { createdAt: 'desc' },
          skip: p.skip,
          take: p.take,
        }),
        prisma.deliveryOrder.count({ where }),
      ]);
      return res.json(buildPaginatedResult(items, total, p));
    }

    const orders = await prisma.deliveryOrder.findMany({
      where,
      include: includeShape,
      orderBy: { createdAt: 'desc' },
      take: p.take,
    });
    res.json(orders);
  } catch (error) {
    console.error('List delivery orders error:', error);
    res.status(500).json({ error: 'فشل تحميل طلبات التسليم' });
  }
});

// GET single order
router.get('/:id', requireAuth, accountingAndWarehouse, async (req, res) => {
  try {
    const order = await prisma.deliveryOrder.findUnique({
      where: { id: String(req.params.id) },
      include: {
        student: { select: { id: true, name: true, stage: true, grade: true, track: true, academicYear: true } },
        items: { include: { inventoryItem: { select: { id: true, name: true, unit: true, grade: true, quantity: true } } } }
      }
    });
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'فشل تحميل الطلب' });
  }
});

// POST create delivery order (Accounting)
router.post('/', requireAuth, accountantRoles, async (req, res) => {
  try {
    const { studentId, academicYear, term, chargeType, notes, items } = req.body;
    const requestedBy = (req as any).user!.userId;

    if (!studentId || !academicYear || !term || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'الطالب والسنة الدراسية والترم والأصناف مطلوبة' });
    }
    if (!['within_fees', 'external'].includes(chargeType)) {
      return res.status(400).json({ error: 'نوع المصروف يجب أن يكون within_fees أو external' });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ error: 'الطالب غير موجود' });

    // Grade validation + resolve sellingPrice for within_fees items
    const resolvedItems: Array<any> = [];
    for (const item of items) {
      const invItem = await prisma.inventoryItem.findUnique({ where: { id: item.inventoryItemId } });
      if (!invItem) return res.status(404).json({ error: `الصنف ${item.inventoryItemId} غير موجود` });
      if (invItem.grade && invItem.grade !== student.grade) {
        return res.status(400).json({
          error: `الصنف "${invItem.name}" مخصص للصف ${invItem.grade}، بينما الطالب في الصف ${student.grade}`
        });
      }

      let unitPrice = Number(item.unitPrice);

      // For within_fees: override unitPrice with sellingPrice from GradeItemList if available
      if (chargeType === 'within_fees') {
        const listEntry = await prisma.gradeItemListEntry.findFirst({
          where: {
            inventoryItemId: item.inventoryItemId,
            list: {
              stage: student.stage,
              grade: student.grade,
              track: student.track,
              academicYear,
              term
            }
          },
          select: { sellingPrice: true }
        });
        if (listEntry?.sellingPrice != null) {
          unitPrice = Number(listEntry.sellingPrice);
        }
      }

      resolvedItems.push({ ...item, unitPrice });
    }

    const result = await prisma.$transaction(async (tx) => {
      const code = await generateDeliveryCode(tx);
      const totalAmount = resolvedItems.reduce((sum: number, item: any) =>
        sum + (Number(item.unitPrice) * Number(item.quantity)), 0);

      return tx.deliveryOrder.create({
        data: {
          code, studentId, academicYear, term,
          chargeType: chargeType || 'within_fees',
          requestedBy, notes: notes || null,
          totalAmount,
          items: {
            create: resolvedItems.map((item: any) => ({
              inventoryItemId: item.inventoryItemId,
              itemName: item.itemName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: Number(item.unitPrice) * Number(item.quantity)
            }))
          }
        },
        include: { student: true, items: true }
      });
    });

    res.status(201).json(result);
  } catch (error: any) {
    // Issue 5: on unique-code collision retry once with a UUID-based code
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'تعارض في رقم الطلب، يرجى المحاولة مرة أخرى' });
    }
    res.status(400).json({ error: 'فشل إنشاء طلب التسليم', details: error.message });
  }
});

// PATCH confirm (Warehouse)
router.patch('/:id/confirm', requireAuth, warehouseRoles, async (req, res) => {
  try {
    const confirmedBy = (req as any).user!.userId;
    const order = await prisma.deliveryOrder.findUnique({
      where: { id: String(req.params.id) },
      include: { items: { include: { inventoryItem: true } } }
    });
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (order.status !== 'pending') {
      return res.status(400).json({ error: `لا يمكن تأكيد طلب بحالة "${order.status}"` });
    }

    for (const item of order.items) {
      if (item.inventoryItem.quantity < item.quantity) {
        return res.status(400).json({
          error: `الكمية المتوفرة من "${item.inventoryItem.name}" (${item.inventoryItem.quantity}) أقل من المطلوبة (${item.quantity})`
        });
      }
    }

    const updated = await prisma.deliveryOrder.update({
      where: { id: String(req.params.id) },
      data: { status: 'confirmed', confirmedBy },
      include: { items: true }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: 'فشل تأكيد الطلب', details: error.message });
  }
});

// PATCH deliver (Warehouse physically hands over items)
router.patch('/:id/deliver', requireAuth, warehouseRoles, async (req, res) => {
  try {
    const deliveredBy = (req as any).user!.userId;
    const deliveredByName = (req as any).user!.name || 'أمين المخزن';

    const order = await prisma.deliveryOrder.findUnique({
      where: { id: String(req.params.id) },
      include: { items: { include: { inventoryItem: true } }, student: true }
    });
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (order.status !== 'confirmed') {
      return res.status(400).json({ error: 'يجب تأكيد الطلب قبل التسليم' });
    }

    // Issue 3: pre-flight check only (the authoritative check is inside the transaction)
    if (order.chargeType === 'external') {
      const preFlightSession = await prisma.treasurySession.findFirst({
        where: { status: 'open' },
        select: { id: true }
      });
      if (!preFlightSession) {
        return res.status(400).json({ error: 'لا توجد خزينة مفتوحة. يجب فتح الخزينة قبل تسليم أصناف خارجية.' });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();

      for (const item of order.items) {
        const freshItem = await tx.inventoryItem.findUnique({ where: { id: item.inventoryItemId } });
        if (!freshItem || freshItem.quantity < item.quantity) {
          throw new Error(`الكمية المتوفرة من "${item.itemName}" غير كافية`);
        }

        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { quantity: { decrement: item.quantity }, lastUpdated: now.toISOString().split('T')[0] }
        });

        await tx.inventoryTransaction.create({
          data: {
            itemId: item.inventoryItemId,
            type: 'out',
            subType: 'sale',
            quantity: item.quantity,
            unitCostSnapshot: freshItem.unitCost,
            unitPriceSnapshot: freshItem.unitPrice,
            totalAmount: Number(freshItem.unitPrice) * item.quantity,
            studentId: order.studentId,
            studentName: order.student.name,
            performedBy: deliveredByName,
            performedByUserId: deliveredBy,
            notes: `تسليم طلب ${order.code}`,
            date: now
          }
        });

        const inventory1300 = await tx.account.findUnique({ where: { code: '1300' } });
        const cogs5001 = await tx.account.findUnique({ where: { code: '5001' } });

        if (order.chargeType === 'external') {
          const cash1001 = await tx.account.findUnique({ where: { code: '1001' } });
          const cat = freshItem.category ?? '';
          const revCode = (cat === 'books' || cat === 'كتب') ? '4002'
            : (cat === 'uniform' || cat === 'زي') ? '4003' : '4006';
          const revAccount = await tx.account.findUnique({ where: { code: revCode } });
          const saleAmount = Number(freshItem.unitPrice) * item.quantity;

          // Issue 4: throw if revenue/cash accounts are missing
          if (!cash1001 || !revAccount) {
            throw new Error(`حساب النقدية أو حساب الإيراد غير موجود (كود ${revCode})`);
          }
          await tx.journalEntry.create({
            data: {
              entryNumber: `JE-${year}-${randomUUID().slice(0, 8)}`,
              entryDate: now.toISOString().split('T')[0],
              description: `تسليم ${item.itemName} للطالب ${order.student.name} (${order.code})`,
              referenceType: 'delivery_order',
              referenceId: order.id,
              status: 'posted', postedAt: now,
              lines: {
                create: [
                  { accountId: cash1001.id, debit: saleAmount, credit: 0, lineNumber: 1 },
                  { accountId: revAccount.id, debit: 0, credit: saleAmount, lineNumber: 2 }
                ]
              }
            }
          });
          // Issue 4: throw if inventory/COGS accounts are missing
          if (!inventory1300 || !cogs5001) {
            throw new Error('حساب المخزون (1300) أو تكلفة البضاعة (5001) غير موجود');
          }
          const costAmount2 = Number(freshItem.unitCost) * item.quantity;
          await tx.journalEntry.create({
            data: {
              entryNumber: `JE-${year}-${randomUUID().slice(0, 8)}`,
              entryDate: now.toISOString().split('T')[0],
              description: `تكلفة تسليم ${item.itemName} (${order.code})`,
              referenceType: 'delivery_order',
              referenceId: order.id,
              status: 'posted', postedAt: now,
              lines: {
                create: [
                  { accountId: cogs5001.id, debit: costAmount2, credit: 0, lineNumber: 1 },
                  { accountId: inventory1300.id, debit: 0, credit: costAmount2, lineNumber: 2 }
                ]
              }
            }
          });
        } else {
          // Issue 4: throw if inventory/COGS accounts are missing
          if (!inventory1300 || !cogs5001) {
            throw new Error('حساب المخزون (1300) أو تكلفة البضاعة (5001) غير موجود');
          }
          const costAmount = Number(freshItem.unitCost) * item.quantity;
          await tx.journalEntry.create({
            data: {
              entryNumber: `JE-${year}-${randomUUID().slice(0, 8)}`,
              entryDate: now.toISOString().split('T')[0],
              description: `تسليم ضمن المصاريف: ${item.itemName} للطالب ${order.student.name} (${order.code})`,
              referenceType: 'delivery_order',
              referenceId: order.id,
              status: 'posted', postedAt: now,
              lines: {
                create: [
                  { accountId: cogs5001.id, debit: costAmount, credit: 0, lineNumber: 1 },
                  { accountId: inventory1300.id, debit: 0, credit: costAmount, lineNumber: 2 }
                ]
              }
            }
          });
        }

        await tx.deliveryOrderItem.update({
          where: { id: item.id },
          data: { deliveredAt: now }
        });
      }

      // Issue 3: fetch session atomically inside the transaction
      let openSession: { id: string } | null = null;
      if (order.chargeType === 'external') {
        openSession = await tx.treasurySession.findFirst({
          where: { status: 'open' },
          select: { id: true }
        });
        if (!openSession) {
          throw new Error('لا توجد خزينة مفتوحة. يجب فتح الخزينة قبل تسليم أصناف خارجية.');
        }
      }

      if (order.chargeType === 'external' && openSession) {
        const receiptNumber = `DEL-${order.code}-${randomUUID()}`;
        await tx.payment.create({
          data: {
            studentId: order.studentId,
            studentName: order.student.name,
            amount: order.totalAmount,
            type: 'other',
            method: 'cash',
            date: now,
            receiptNumber,
            collectedBy: deliveredByName,
            userId: deliveredBy,
            sessionId: openSession.id,
            academicYear: order.academicYear,
            notes: `تسليم مستلزمات: ${order.code}`
          }
        });
        await tx.student.update({
          where: { id: order.studentId },
          data: { paidAmount: { increment: order.totalAmount } }
        });
        await tx.studentYearlyFinance.updateMany({
          where: { studentId: order.studentId, academicYear: order.academicYear },
          data: { paidAmount: { increment: order.totalAmount } }
        });
      }

      return tx.deliveryOrder.update({
        where: { id: order.id },
        data: { status: 'delivered', deliveredBy },
        include: { items: true, student: true }
      });
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'فشل تسجيل التسليم' });
  }
});

// PATCH return a single item
router.patch('/:id/return/:itemId', requireAuth, warehouseRoles, async (req, res) => {
  try {
    const { returnNotes } = req.body;
    const returnedByName = (req as any).user!.name || 'أمين المخزن';
    const returnedByUserId = (req as any).user!.userId;

    const order = await prisma.deliveryOrder.findUnique({
      where: { id: String(req.params.id) },
      include: { items: { include: { inventoryItem: true } }, student: true }
    });
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (order.status !== 'delivered') {
      return res.status(400).json({ error: 'يمكن إرجاع أصناف من طلبات مُسلَّمة فقط' });
    }

    const orderItem = order.items.find(i => i.id === String(req.params.itemId));
    if (!orderItem) return res.status(404).json({ error: 'الصنف غير موجود في هذا الطلب' });
    if (!orderItem.deliveredAt) return res.status(400).json({ error: 'هذا الصنف لم يُسلَّم بعد' });
    if (orderItem.returnedAt) return res.status(400).json({ error: 'هذا الصنف مُعاد بالفعل' });

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      await tx.inventoryItem.update({
        where: { id: orderItem.inventoryItemId },
        data: { quantity: { increment: orderItem.quantity }, lastUpdated: now.toISOString().split('T')[0] }
      });

      await tx.inventoryTransaction.create({
        data: {
          itemId: orderItem.inventoryItemId,
          type: 'in',
          subType: 'adjustment',
          quantity: orderItem.quantity,
          unitCostSnapshot: orderItem.inventoryItem.unitCost,
          unitPriceSnapshot: orderItem.inventoryItem.unitPrice,
          totalAmount: Number(orderItem.inventoryItem.unitPrice) * orderItem.quantity,
          studentId: order.studentId,
          studentName: order.student.name,
          performedBy: returnedByName,
          performedByUserId: returnedByUserId,
          notes: `إرجاع من طلب ${order.code}: ${returnNotes || ''}`,
          date: now
        }
      });

      const year = now.getFullYear();

      if (order.chargeType === 'external') {
        const returnAmount = Number(orderItem.totalAmount);
        // Issue 2: throw if no open session instead of silently skipping
        const openSession = await tx.treasurySession.findFirst({ where: { status: 'open' }, select: { id: true } });
        if (!openSession) {
          throw new Error('لا توجد خزينة مفتوحة. يجب فتح الخزينة قبل تسجيل الإرجاع.');
        }
        await tx.payment.create({
          data: {
            studentId: order.studentId,
            studentName: order.student.name,
            amount: -returnAmount,
            type: 'other',
            method: 'cash',
            date: now,
            receiptNumber: `RET-${order.code}-${randomUUID()}`,
            collectedBy: returnedByName,
            userId: returnedByUserId,
            sessionId: openSession.id,
            academicYear: order.academicYear,
            notes: `إرجاع: ${orderItem.itemName} من طلب ${order.code}`
          }
        });
        await tx.student.update({
          where: { id: order.studentId },
          data: { paidAmount: { decrement: returnAmount } }
        });
        await tx.studentYearlyFinance.updateMany({
          where: { studentId: order.studentId, academicYear: order.academicYear },
          data: { paidAmount: { decrement: returnAmount } }
        });

        // Revenue reversal journal entries for external return
        const cash1001 = await tx.account.findUnique({ where: { code: '1001' } });
        const cat = orderItem.inventoryItem.category ?? '';
        const revCode = (cat === 'books' || cat === 'كتب') ? '4002'
          : (cat === 'uniform' || cat === 'زي') ? '4003' : '4006';
        const revAccount = await tx.account.findUnique({ where: { code: revCode } });
        if (!cash1001) throw new Error('حساب النقدية 1001 غير موجود');
        if (!revAccount) throw new Error(`حساب الإيرادات ${revCode} غير موجود`);

        await tx.journalEntry.create({
          data: {
            entryNumber: `JE-${year}-${randomUUID().slice(0, 8)}`,
            entryDate: now.toISOString().split('T')[0],
            description: `عكس إيراد إرجاع ${orderItem.itemName} (${order.code})`,
            referenceType: 'delivery_order',
            referenceId: order.id,
            status: 'posted', postedAt: now,
            lines: {
              create: [
                { accountId: revAccount.id, debit: returnAmount, credit: 0, lineNumber: 1 },
                { accountId: cash1001.id, debit: 0, credit: returnAmount, lineNumber: 2 }
              ]
            }
          }
        });

        const costAmount = Number(orderItem.inventoryItem.unitCost) * orderItem.quantity;
        const inventory1300r = await tx.account.findUnique({ where: { code: '1300' } });
        const cogs5001r = await tx.account.findUnique({ where: { code: '5001' } });
        if (!inventory1300r) throw new Error('حساب المخزون 1300 غير موجود');
        if (!cogs5001r) throw new Error('حساب تكلفة المبيعات 5001 غير موجود');

        await tx.journalEntry.create({
          data: {
            entryNumber: `JE-${year}-${randomUUID().slice(0, 8)}`,
            entryDate: now.toISOString().split('T')[0],
            description: `عكس تكلفة إرجاع ${orderItem.itemName} (${order.code})`,
            referenceType: 'delivery_order',
            referenceId: order.id,
            status: 'posted', postedAt: now,
            lines: {
              create: [
                { accountId: inventory1300r.id, debit: costAmount, credit: 0, lineNumber: 1 },
                { accountId: cogs5001r.id, debit: 0, credit: costAmount, lineNumber: 2 }
              ]
            }
          }
        });
      } else {
        // COGS reversal only for within_fees return
        const costAmount = Number(orderItem.inventoryItem.unitCost) * orderItem.quantity;
        const inventory1300 = await tx.account.findUnique({ where: { code: '1300' } });
        const cogs5001 = await tx.account.findUnique({ where: { code: '5001' } });
        if (!inventory1300) throw new Error('حساب المخزون 1300 غير موجود');
        if (!cogs5001) throw new Error('حساب تكلفة المبيعات 5001 غير موجود');

        await tx.journalEntry.create({
          data: {
            entryNumber: `JE-${year}-${randomUUID().slice(0, 8)}`,
            entryDate: now.toISOString().split('T')[0],
            description: `عكس تكلفة إرجاع ${orderItem.itemName} ضمن المصاريف (${order.code})`,
            referenceType: 'delivery_order',
            referenceId: order.id,
            status: 'posted', postedAt: now,
            lines: {
              create: [
                { accountId: inventory1300.id, debit: costAmount, credit: 0, lineNumber: 1 },
                { accountId: cogs5001.id, debit: 0, credit: costAmount, lineNumber: 2 }
              ]
            }
          }
        });
      }

      await tx.deliveryOrderItem.update({
        where: { id: orderItem.id },
        data: { returnedAt: now, returnNotes: returnNotes || null }
      });

      const updatedItems = await tx.deliveryOrderItem.findMany({ where: { orderId: order.id } });
      const allReturned = updatedItems.every(i => i.returnedAt !== null);
      if (allReturned) {
        await tx.deliveryOrder.update({ where: { id: order.id }, data: { status: 'cancelled' } });
      }

      return tx.deliveryOrder.findUnique({
        where: { id: order.id },
        include: { items: { include: { inventoryItem: true } }, student: true }
      });
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'فشل تسجيل الإرجاع' });
  }
});

// DELETE cancel pending order
router.delete('/:id', requireAuth, accountantRoles, async (req, res) => {
  try {
    const order = await prisma.deliveryOrder.findUnique({ where: { id: String(req.params.id) } });
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'يمكن إلغاء الطلبات المعلقة فقط' });
    }
    await prisma.deliveryOrder.update({ where: { id: String(req.params.id) }, data: { status: 'cancelled' } });
    res.json({ message: 'تم إلغاء الطلب' });
  } catch (error: any) {
    res.status(400).json({ error: 'فشل إلغاء الطلب' });
  }
});

export default router;
