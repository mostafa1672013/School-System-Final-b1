import { Router } from 'express';
import { randomUUID } from 'crypto';
import { requireAuth, warehouseRoles, accountingAndWarehouse } from '../middleware/auth';
import { paginate, buildPaginatedResult } from '../lib/pagination';

const router = Router();
import { prisma } from '../lib/prisma';

// ===== INVENTORY CATEGORIES =====

// GET: All categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.itemCategory.findMany({
      orderBy: { createdAt: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'فشل تحميل التصنيفات' });
  }
});

// POST: Create new category
router.post('/categories', async (req, res) => {
  try {
    const { key, name } = req.body;
    if (!key || !name) {
      return res.status(400).json({ error: 'المفتاح والاسم مطلوبان' });
    }
    // Normalize key: lowercase, no spaces
    const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
    const category = await prisma.itemCategory.create({
      data: { key: normalizedKey, name: name.trim() }
    });
    res.status(201).json(category);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'هذا المفتاح مستخدم بالفعل' });
    }
    res.status(400).json({ error: 'فشل إنشاء التصنيف' });
  }
});

// PATCH: Update category name (key is immutable)
router.patch('/categories/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'الاسم مطلوب' });
    }
    const category = await prisma.itemCategory.update({
      where: { id },
      data: { name: name.trim() }
    });
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: 'فشل تحديث التصنيف' });
  }
});

// DELETE: Delete category (blocked if items use it)
router.delete('/categories/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const category = await prisma.itemCategory.findUnique({ where: { id } });
    if (!category) {
      return res.status(404).json({ error: 'التصنيف غير موجود' });
    }
    const itemCount = await prisma.inventoryItem.count({
      where: { category: category.key }
    });
    if (itemCount > 0) {
      return res.status(409).json({
        error: `لا يمكن حذف التصنيف، يوجد ${itemCount} صنف مرتبط به`,
        itemCount
      });
    }
    await prisma.itemCategory.delete({ where: { id } });
    res.json({ message: 'تم حذف التصنيف بنجاح' });
  } catch (error) {
    res.status(400).json({ error: 'فشل حذف التصنيف' });
  }
});

// ===== INVENTORY ITEMS =====

router.get('/', async (req, res) => {
  try {
    const { category, grade, itemType, search } =
      req.query as Record<string, string | undefined>;

    const p = paginate(req);

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (grade) where.grade = grade;
    if (itemType) where.itemType = itemType;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    if (p.isPaginated) {
      const [items, total] = await prisma.$transaction([
        prisma.inventoryItem.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: p.skip,
          take: p.take,
        }),
        prisma.inventoryItem.count({ where }),
      ]);
      return res.json(buildPaginatedResult(items, total, p));
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: p.take,
    });
    res.json(items);
  } catch (error) {
    console.error('List inventory error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// POST: Create new inventory item
router.post('/', async (req, res) => {
  try {
    const { name, category, itemType, quantity, minQuantity, maxQuantity, unit, unitCost, unitPrice, grade, description } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'اسم الصنف والفئة مطلوبة' });
    }

    const item = await prisma.inventoryItem.create({
      data: {
        name,
        category,
        itemType: itemType || 'consumable',
        quantity: quantity || 0,
        minQuantity: minQuantity || 5,
        maxQuantity: maxQuantity || null,
        unit: unit || 'قطعة',
        unitCost: unitCost || 0,
        unitPrice: unitPrice || 0,
        grade: grade || null,
        description: description || null,
        lastUpdated: new Date().toISOString().split('T')[0]
      }
    });

    res.status(201).json(item);
  } catch (error: any) {
    console.error('Inventory item creation error:', error);
    res.status(400).json({ error: 'فشل إنشاء الصنف', details: error.message });
  }
});

// PATCH: Update inventory item (metadata only, NOT quantity)
router.patch('/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const { name, category, itemType, minQuantity, maxQuantity, unit, unitCost, unitPrice, grade, description } = req.body;

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(itemType && { itemType }),
        ...(minQuantity !== undefined && { minQuantity }),
        ...(maxQuantity !== undefined && { maxQuantity }),
        ...(unit && { unit }),
        ...(unitCost !== undefined && { unitCost }),
        ...(unitPrice !== undefined && { unitPrice }),
        ...(grade && { grade }),
        ...(description !== undefined && { description }),
        lastUpdated: new Date().toISOString().split('T')[0]
      }
    });

    res.json(item);
  } catch (error: any) {
    console.error('Inventory item update error:', error);
    res.status(400).json({ error: 'فشل تحديث الصنف' });
  }
});

// DELETE: Delete inventory item
router.delete('/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    // Cascade delete will be handled by Prisma due to onDelete: Cascade
    const item = await prisma.inventoryItem.delete({
      where: { id }
    });

    res.json({ message: 'تم حذف الصنف بنجاح', item });
  } catch (error: any) {
    console.error('Inventory item deletion error:', error);
    res.status(400).json({ error: 'فشل حذف الصنف' });
  }
});

// GET: Low stock items (below minQuantity)
router.get('/low-stock', async (req, res) => {
  try {
    const lowStock = await prisma.inventoryItem.findMany({
      where: {
        quantity: {
          lt: prisma.inventoryItem.fields.minQuantity
        }
      },
      orderBy: { quantity: 'asc' }
    });

    res.json(lowStock);
  } catch (error: any) {
    console.error('Low stock query error:', error);
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
});

// GET: All inventory transactions
router.get('/transactions', async (req, res) => {
  try {
    const { itemId, type, subType, studentId, from, to } =
      req.query as Record<string, string | undefined>;

    const p = paginate(req);

    const where: Record<string, unknown> = {};
    if (itemId) where.itemId = itemId;
    if (type) where.type = type;
    if (subType) where.subType = subType;
    if (studentId) where.studentId = studentId;
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.gte = new Date(from);
      if (to) range.lte = new Date(to);
      where.date = range;
    }

    if (p.isPaginated) {
      const [items, total] = await prisma.$transaction([
        prisma.inventoryTransaction.findMany({
          where,
          include: { item: true },
          orderBy: { date: 'desc' },
          skip: p.skip,
          take: p.take,
        }),
        prisma.inventoryTransaction.count({ where }),
      ]);
      return res.json(buildPaginatedResult(items, total, p));
    }

    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      include: { item: true },
      orderBy: { date: 'desc' },
      take: p.take,
    });
    res.json(transactions);
  } catch (error: any) {
    console.error('Inventory transactions query error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST: Receive stock (stock-in)
router.post('/receive', requireAuth, warehouseRoles, async (req, res) => {
  try {
    const { itemId, quantity, supplierName, unitCost, notes, performedBy, performedByUserId, subType } = req.body;

    if (!itemId || !quantity || !performedBy) {
      return res.status(400).json({ error: 'الصنف والكمية والموظف مطلوبين' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ error: 'الكمية يجب أن تكون أكبر من صفر' });
    }
    
    // منع المشتريات المباشرة لتطبيق دورة المشتريات الجديدة
    const actualSubType = subType || 'purchase';
    if (actualSubType === 'purchase') {
      return res.status(403).json({ error: 'تم إيقاف الشراء المباشر. يرجى استخدام نظام المشتريات (طلب -> أمر شراء -> إذن استلام) لإضافة مخزون جديد.' });
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });

      if (!item) {
        throw new Error('الصنف غير موجود');
      }

      // Update item quantity
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          quantity: item.quantity + quantity,
          ...(unitCost !== undefined && { unitCost }),
          lastUpdated: new Date().toISOString().split('T')[0]
        }
      });

      // Create transaction record
      const transaction = await tx.inventoryTransaction.create({
        data: {
          itemId,
          type: 'in',
          subType: actualSubType,
          quantity,
          unitCostSnapshot: unitCost || item.unitCost,
          unitPriceSnapshot: item.unitPrice,
          totalAmount: (unitCost || item.unitCost) * quantity,
          supplierName: supplierName || null,
          notes: notes || null,
          performedBy,
          performedByUserId: performedByUserId || null,
          date: new Date()
        }
      });

      // Create journal entry with correct credit account based on subType:
      // adjustment → CR 5003 (Inventory Adjustment), opening_balance → CR 3001 (Retained Earnings)
      const asset1300 = await tx.account.findUnique({ where: { code: '1300' } });
      const creditCode = actualSubType === 'opening_balance' ? '3001' : '5003';
      const creditAccount = await tx.account.findUnique({ where: { code: creditCode } });
      if (!asset1300) throw new Error('حساب المخزون 1300 غير موجود');
      if (!creditAccount) throw new Error(`حساب ${creditCode} غير موجود`);

      const year = new Date().getFullYear();
      const totalCost = (unitCost ?? Number(item.unitCost)) * quantity;
      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber: `JE-${year}-${randomUUID().slice(0, 8)}`,
          entryDate: new Date().toISOString().split('T')[0],
          description: `${actualSubType === 'opening_balance' ? 'رصيد افتتاحي' : 'تسوية مخزون'}: ${item.name} (${quantity} ${item.unit})`,
          referenceType: actualSubType === 'opening_balance' ? 'inventory_opening_balance' : 'inventory_adjustment',
          referenceId: transaction.id,
          status: 'posted',
          postedAt: new Date(),
          lines: {
            create: [
              { accountId: asset1300.id, debit: totalCost, credit: 0, lineNumber: 1 },
              { accountId: creditAccount.id, debit: 0, credit: totalCost, lineNumber: 2 }
            ]
          }
        }
      });

      await tx.inventoryTransaction.update({
        where: { id: transaction.id },
        data: { journalEntryId: journalEntry.id }
      });

      return { item: updatedItem, transaction };
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Stock receive error:', error);
    res.status(400).json({ error: error.message || 'فشل استلام المخزون' });
  }
});

// POST: Issue stock (stock-out)
router.post('/issue', requireAuth, accountingAndWarehouse, async (req, res) => {
  try {
    const { itemId, quantity, subType, departmentName, studentId, studentName, notes, performedBy, performedByUserId } = req.body;

    if (!itemId || !quantity || !subType || !performedBy) {
      return res.status(400).json({ error: 'الصنف والكمية والنوع والموظف مطلوبين' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ error: 'الكمية يجب أن تكون أكبر من صفر' });
    }

    if (!['sale', 'consumption', 'adjustment'].includes(subType)) {
      return res.status(400).json({ error: 'نوع الصرف غير صحيح' });
    }

    if (subType === 'sale' && !studentId) {
      return res.status(400).json({ error: 'الطالب مطلوب عند بيع صنف من المخزن' });
    }

    // Use transaction for consistency
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });

      if (!item) {
        throw new Error('الصنف غير موجود');
      }

      if (item.quantity < quantity) {
        throw new Error(`الكمية المتاحة ${item.quantity} أقل من المطلوبة ${quantity}`);
      }

      let openSession: { id: string } | null = null;
      if (subType === 'sale') {
        openSession = await tx.treasurySession.findFirst({
          where: { status: 'open' },
          select: { id: true }
        });
        if (!openSession) {
          throw new Error('لا توجد خزينة مفتوحة. يجب فتح الخزينة قبل إتمام عمليات البيع.');
        }
      }

      // Update item quantity
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          quantity: item.quantity - quantity,
          lastUpdated: new Date().toISOString().split('T')[0]
        }
      });

      // Create transaction record
      const transaction = await tx.inventoryTransaction.create({
        data: {
          itemId,
          type: 'out',
          subType,
          quantity,
          unitCostSnapshot: item.unitCost,
          unitPriceSnapshot: item.unitPrice,
          totalAmount: Number(item.unitPrice) * quantity,
          departmentName: departmentName || null,
          studentId: studentId || null,
          studentName: studentName || null,
          notes: notes || null,
          performedBy,
          performedByUserId: performedByUserId || null,
          date: new Date()
        }
      });

      // Create journal entries based on subType
      const year = new Date().getFullYear();
      if (subType === 'sale') {
        // Double entry: Revenue + COGS
        const cash1001 = await tx.account.findUnique({ where: { code: '1001' } });
        const inventory1300 = await tx.account.findUnique({ where: { code: '1300' } });
        const cogs5001 = await tx.account.findUnique({ where: { code: '5001' } });

        const revenueCode = (item.category === 'books' || item.category === 'كتب') ? '4002'
          : (item.category === 'uniform' || item.category === 'زي') ? '4003' : '4006';
        const revenueAccount = await tx.account.findUnique({ where: { code: revenueCode } });

        if (!cash1001) throw new Error('حساب النقدية 1001 غير موجود');
        if (!revenueAccount) throw new Error(`حساب الإيرادات ${revenueCode} غير موجود`);
        if (!inventory1300) throw new Error('حساب المخزون 1300 غير موجود');
        if (!cogs5001) throw new Error('حساب تكلفة المبيعات 5001 غير موجود');

        // Entry 1: DR Cash | CR Revenue
        const journalEntry1 = await tx.journalEntry.create({
          data: {
            entryNumber: `JE-${year}-${randomUUID().slice(0, 8)}`,
            entryDate: new Date().toISOString().split('T')[0],
            description: `بيع مخزون: ${item.name} لطالب (${quantity} ${item.unit})`,
            referenceType: 'inventory_sale',
            referenceId: transaction.id,
            status: 'posted',
            postedAt: new Date(),
            lines: {
              create: [
                { accountId: cash1001.id, debit: Number(item.unitPrice) * quantity, credit: 0, lineNumber: 1 },
                { accountId: revenueAccount.id, debit: 0, credit: Number(item.unitPrice) * quantity, lineNumber: 2 }
              ]
            }
          }
        });

        // Entry 2: DR COGS | CR Inventory
        await tx.journalEntry.create({
          data: {
            entryNumber: `JE-${year}-${randomUUID().slice(0, 8)}`,
            entryDate: new Date().toISOString().split('T')[0],
            description: `تكلفة بضاعة مباعة: ${item.name} (${quantity} ${item.unit})`,
            referenceType: 'inventory_sale',
            referenceId: transaction.id,
            status: 'posted',
            postedAt: new Date(),
            lines: {
              create: [
                { accountId: cogs5001.id, debit: Number(item.unitCost) * quantity, credit: 0, lineNumber: 1 },
                { accountId: inventory1300.id, debit: 0, credit: Number(item.unitCost) * quantity, lineNumber: 2 }
              ]
            }
          }
        });

        await tx.inventoryTransaction.update({
          where: { id: transaction.id },
          data: { journalEntryId: journalEntry1.id }
        });
      } else if (subType === 'consumption') {
        // Single entry: DR Expense | CR Inventory
        const expense5002 = await tx.account.findUnique({ where: { code: '5002' } });
        const inventory1300 = await tx.account.findUnique({ where: { code: '1300' } });

        if (!expense5002) throw new Error('حساب مصروفات التشغيل 5002 غير موجود');
        if (!inventory1300) throw new Error('حساب المخزون 1300 غير موجود');

        const journalEntry = await tx.journalEntry.create({
          data: {
            entryNumber: `JE-${year}-${randomUUID().slice(0, 8)}`,
            entryDate: new Date().toISOString().split('T')[0],
            description: `صرف مستلزمات: ${item.name} للقسم ${departmentName || 'غير محدد'} (${quantity} ${item.unit})`,
            referenceType: 'inventory_consumption',
            referenceId: transaction.id,
            status: 'posted',
            postedAt: new Date(),
            lines: {
              create: [
                { accountId: expense5002.id, debit: Number(item.unitCost) * quantity, credit: 0, lineNumber: 1 },
                { accountId: inventory1300.id, debit: 0, credit: Number(item.unitCost) * quantity, lineNumber: 2 }
              ]
            }
          }
        });

        await tx.inventoryTransaction.update({
          where: { id: transaction.id },
          data: { journalEntryId: journalEntry.id }
        });
      }

      // Create Payment record for treasury tracking (sale only)
      if (subType === 'sale' && openSession && studentId) {
        const paymentTypeMap: Record<string, string> = {
          books: 'books', كتب: 'books',
          uniform: 'uniform', زي: 'uniform',
        };
        const paymentType = paymentTypeMap[item.category ?? ''] ?? 'other';
        const receiptNumber = `INV-${new Date().getFullYear()}-${randomUUID()}`;

        const student = await tx.student.findUnique({
          where: { id: studentId },
          select: { academicYear: true }
        });
        if (!student) throw new Error('الطالب غير موجود');
        if (!student.academicYear) throw new Error('الطالب لا ينتمي لسنة دراسية محددة');

        const saleAmount = Number(item.unitPrice) * quantity;
        await tx.payment.create({
          data: {
            studentId,
            studentName: studentName || 'غير محدد',
            amount: saleAmount,
            type: paymentType,
            method: 'cash',
            date: new Date(),
            receiptNumber,
            collectedBy: performedBy,
            userId: performedByUserId || null,
            sessionId: openSession.id,
            academicYear: student.academicYear,
            notes: `بيع مخزون: ${item.name} (${quantity} ${item.unit})`,
          }
        });

        await tx.student.update({
          where: { id: studentId },
          data: { paidAmount: { increment: saleAmount } }
        });

        await tx.studentYearlyFinance.updateMany({
          where: { studentId, academicYear: student.academicYear },
          data: { paidAmount: { increment: saleAmount } }
        });
      }

      return { item: updatedItem, transaction };
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Stock issue error:', error);
    res.status(400).json({ error: error.message || 'فشل صرف المخزون' });
  }
});

export default router;
