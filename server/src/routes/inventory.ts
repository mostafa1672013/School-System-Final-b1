import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

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
    const items = await prisma.inventoryItem.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(items);
  } catch (error) {
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
    const { itemId } = req.query;

    const transactions = await prisma.inventoryTransaction.findMany({
      where: itemId ? { itemId: String(itemId) } : undefined,
      include: { item: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json(transactions);
  } catch (error: any) {
    console.error('Inventory transactions query error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST: Receive stock (stock-in)
router.post('/receive', async (req, res) => {
  try {
    const { itemId, quantity, supplierName, unitCost, notes, performedBy, performedByUserId } = req.body;

    if (!itemId || !quantity || !performedBy) {
      return res.status(400).json({ error: 'الصنف والكمية والموظف مطلوبين' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ error: 'الكمية يجب أن تكون أكبر من صفر' });
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
          subType: 'purchase',
          quantity,
          unitCostSnapshot: unitCost || item.unitCost,
          unitPriceSnapshot: item.unitPrice,
          totalAmount: (unitCost || item.unitCost) * quantity,
          supplierName: supplierName || null,
          notes: notes || null,
          performedBy,
          performedByUserId: performedByUserId || null,
          date: new Date().toISOString().split('T')[0]
        }
      });

      // Create journal entry: DR 1300 (Inventory) | CR 2001 (Accounts Payable)
      try {
        const asset1300 = await tx.account.findUnique({ where: { code: '1300' } });
        const liability2001 = await tx.account.findUnique({ where: { code: '2001' } });

        if (asset1300 && liability2001) {
          const journalEntry = await tx.journalEntry.create({
            data: {
              date: new Date(),
              description: `استلام مخزون: ${item.name} (${quantity} ${item.unit})`,
              referenceId: transaction.id,
              lines: {
                create: [
                  {
                    accountId: asset1300.id,
                    debit: (unitCost || item.unitCost) * quantity,
                    credit: 0
                  },
                  {
                    accountId: liability2001.id,
                    debit: 0,
                    credit: (unitCost || item.unitCost) * quantity
                  }
                ]
              }
            }
          });

          // Update transaction with journal entry ID
          await tx.inventoryTransaction.update({
            where: { id: transaction.id },
            data: { journalEntryId: journalEntry.id }
          });
        } else {
          console.warn('⚠️ Accounting codes 1300 or 2001 not found. Stock transaction created without journal entry.');
        }
      } catch (journalError) {
        console.warn('⚠️ Journal entry creation failed:', journalError);
        // Continue anyway - graceful degradation
      }

      return { item: updatedItem, transaction };
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Stock receive error:', error);
    res.status(400).json({ error: error.message || 'فشل استلام المخزون' });
  }
});

// POST: Issue stock (stock-out)
router.post('/issue', async (req, res) => {
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

    // Use transaction for consistency
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });

      if (!item) {
        throw new Error('الصنف غير موجود');
      }

      if (item.quantity < quantity) {
        throw new Error(`الكمية المتاحة ${item.quantity} أقل من المطلوبة ${quantity}`);
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
          date: new Date().toISOString().split('T')[0]
        }
      });

      // Create journal entries based on subType
      try {
        if (subType === 'sale') {
          // Double entry: Revenue + COGS
          const cash1001 = await tx.account.findUnique({ where: { code: '1001' } });
          const inventory1300 = await tx.account.findUnique({ where: { code: '1300' } });
          const cogs5001 = await tx.account.findUnique({ where: { code: '5001' } });

          // Map category to revenue account
          let revenueAccount;
          if (item.category === 'books' || item.category === 'كتب') {
            revenueAccount = await tx.account.findUnique({ where: { code: '4002' } });
          } else if (item.category === 'uniform' || item.category === 'زي') {
            revenueAccount = await tx.account.findUnique({ where: { code: '4003' } });
          } else {
            revenueAccount = await tx.account.findUnique({ where: { code: '4006' } });
          }

          if (cash1001 && revenueAccount && inventory1300 && cogs5001) {
            // Entry 1: DR Cash | CR Revenue
            const journalEntry1 = await tx.journalEntry.create({
              data: {
                date: new Date(),
                description: `بيع مخزون: ${item.name} لطالب (${quantity} ${item.unit})`,
                referenceId: transaction.id,
                lines: {
                  create: [
                    {
                      accountId: cash1001.id,
                      debit: Number(item.unitPrice) * quantity,
                      credit: 0
                    },
                    {
                      accountId: revenueAccount.id,
                      debit: 0,
                      credit: Number(item.unitPrice) * quantity
                    }
                  ]
                }
              }
            });

            // Entry 2: DR COGS | CR Inventory
            const journalEntry2 = await tx.journalEntry.create({
              data: {
                date: new Date(),
                description: `تكلفة بضاعة مباعة: ${item.name} (${quantity} ${item.unit})`,
                referenceId: transaction.id,
                lines: {
                  create: [
                    {
                      accountId: cogs5001.id,
                      debit: Number(item.unitCost) * quantity,
                      credit: 0
                    },
                    {
                      accountId: inventory1300.id,
                      debit: 0,
                      credit: Number(item.unitCost) * quantity
                    }
                  ]
                }
              }
            });

            await tx.inventoryTransaction.update({
              where: { id: transaction.id },
              data: { journalEntryId: journalEntry1.id }
            });
          } else {
            console.warn('⚠️ Required accounts not found for sale entry.');
          }
        } else if (subType === 'consumption') {
          // Single entry: DR Expense | CR Inventory
          const expense5002 = await tx.account.findUnique({ where: { code: '5002' } });
          const inventory1300 = await tx.account.findUnique({ where: { code: '1300' } });

          if (expense5002 && inventory1300) {
            const journalEntry = await tx.journalEntry.create({
              data: {
                date: new Date(),
                description: `صرف مستلزمات: ${item.name} للقسم ${departmentName || 'غير محدد'} (${quantity} ${item.unit})`,
                referenceId: transaction.id,
                lines: {
                  create: [
                    {
                      accountId: expense5002.id,
                      debit: Number(item.unitCost) * quantity,
                      credit: 0
                    },
                    {
                      accountId: inventory1300.id,
                      debit: 0,
                      credit: Number(item.unitCost) * quantity
                    }
                  ]
                }
              }
            });

            await tx.inventoryTransaction.update({
              where: { id: transaction.id },
              data: { journalEntryId: journalEntry.id }
            });
          } else {
            console.warn('⚠️ Required accounts not found for consumption entry.');
          }
        }
      } catch (journalError) {
        console.warn('⚠️ Journal entry creation failed:', journalError);
        // Continue anyway
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
