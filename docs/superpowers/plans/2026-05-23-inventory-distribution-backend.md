# Inventory Distribution System — Backend Plan (B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Prisma models, server routes, and auth roles for the student inventory distribution system — all data persisted in PostgreSQL, zero frontend state as source of truth.

**Architecture:** 4 new Prisma models (GradeItemList, GradeItemListEntry, DeliveryOrder, DeliveryOrderItem) + 3 new route files + auth middleware update. Every mutation uses `prisma.$transaction` for atomicity. The frontend is a display layer only.

**Tech Stack:** Node/Express/TypeScript, Prisma (PostgreSQL), existing middleware in `server/src/middleware/auth.ts`

**Prerequisite:** Plan A (`2026-05-23-inventory-integration-audit.md`) should be completed first (fixes inventory.ts bugs). Plan C (frontend) depends on this plan.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `server/src/middleware/auth.ts` | Modify | Add `warehouseRoles` export |
| `server/prisma/schema.prisma` | Modify | Add 4 new models + relations on existing models |
| `server/src/routes/grade-item-lists.ts` | Create | CRUD for GradeItemList |
| `server/src/routes/delivery-orders.ts` | Create | Full delivery workflow |
| `server/src/routes/distribution-report.ts` | Create | Deficit calculation + report |
| `server/src/index.ts` | Modify | Register 3 new routers |

---

## Task 1: Add `warehouseRoles` to Auth Middleware

**Files:**
- Modify: `server/src/middleware/auth.ts`

The `warehouse_keeper` role exists in the User model but has no auth guard helper. Need to add one alongside the existing `accountantRoles`.

- [ ] **Step 1: Read current exports at bottom of auth.ts**

```bash
tail -10 server/src/middleware/auth.ts
```
Expected output shows `accountantRoles` and `managementRoles` exports.

- [ ] **Step 2: Add warehouseRoles export**

Open `server/src/middleware/auth.ts`. At the end of the file after `accountantRoles`, add:

```typescript
export const warehouseRoles = requireRoles('system_admin', 'school_director', 'warehouse_keeper');
export const accountingAndWarehouse = requireRoles('system_admin', 'school_director', 'head_accountant', 'accountant', 'warehouse_keeper');
```

- [ ] **Step 3: Verify no syntax errors**

```bash
cd server && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/middleware/auth.ts
git commit -m "feat(auth): add warehouseRoles and accountingAndWarehouse middleware guards"
```

---

## Task 2: Add Prisma Models

**Files:**
- Modify: `server/prisma/schema.prisma`

Add 4 new models. Also add back-relations to `InventoryItem`, `Student`, and `Supplier`.

- [ ] **Step 1: Add the 4 new models at the end of schema.prisma**

Open `server/prisma/schema.prisma` and append after the last model:

```prisma
// =======================================================
// Student Inventory Distribution Models
// =======================================================

model GradeItemList {
  id           String               @id @default(uuid())
  stage        String
  grade        String
  track        String               @default("local")
  academicYear String
  term         String               // "1" | "2" | "3" | "summer"
  createdBy    String
  createdAt    DateTime             @default(now())
  updatedAt    DateTime             @updatedAt
  entries      GradeItemListEntry[]

  @@unique([stage, grade, track, academicYear, term])
  @@index([academicYear, term])
}

model GradeItemListEntry {
  id                  String         @id @default(uuid())
  listId              String
  list                GradeItemList  @relation(fields: [listId], references: [id], onDelete: Cascade)
  inventoryItemId     String
  inventoryItem       InventoryItem  @relation(fields: [inventoryItemId], references: [id], onDelete: Restrict)
  quantity            Int            @default(1)
  preferredSupplierId String?
  preferredSupplier   Supplier?      @relation(fields: [preferredSupplierId], references: [id], onDelete: SetNull)
  notes               String?
  createdAt           DateTime       @default(now())

  @@unique([listId, inventoryItemId])
}

model DeliveryOrder {
  id           String              @id @default(uuid())
  code         String              @unique
  studentId    String
  student      Student             @relation(fields: [studentId], references: [id], onDelete: Restrict)
  academicYear String
  term         String
  status       String              @default("pending") // pending | confirmed | delivered | cancelled
  chargeType   String              @default("within_fees") // within_fees | external
  requestedBy  String
  confirmedBy  String?
  deliveredBy  String?
  totalAmount  Decimal             @default(0) @db.Decimal(12, 2)
  notes        String?
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
  items        DeliveryOrderItem[]

  @@index([studentId])
  @@index([status])
  @@index([academicYear, term])
}

model DeliveryOrderItem {
  id              String        @id @default(uuid())
  orderId         String
  order           DeliveryOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  inventoryItemId String
  inventoryItem   InventoryItem @relation(fields: [inventoryItemId], references: [id], onDelete: Restrict)
  itemName        String
  quantity        Int
  unitPrice       Decimal       @db.Decimal(12, 2)
  totalAmount     Decimal       @db.Decimal(12, 2)
  deliveredAt     DateTime?
  returnedAt      DateTime?
  returnNotes     String?
  createdAt       DateTime      @default(now())
}
```

- [ ] **Step 2: Add back-relations on existing models**

In `schema.prisma`, find `model InventoryItem` and add inside it (after the last existing field):

```prisma
  gradeListEntries GradeItemListEntry[]
  deliveryItems    DeliveryOrderItem[]
```

Find `model Student` and add:

```prisma
  deliveryOrders DeliveryOrder[]
```

Find `model Supplier` and add:

```prisma
  gradeListEntries GradeItemListEntry[]
```

- [ ] **Step 3: Validate schema**

```bash
cd server && npx prisma validate
```
Expected: `The schema at prisma/schema.prisma is valid`

- [ ] **Step 4: Generate migration**

```bash
cd server && npx prisma migrate dev --name add_inventory_distribution_models
```
Expected: Migration created and applied. No errors. Client regenerated.

- [ ] **Step 5: Verify tables exist**

```bash
cd server && npx prisma studio &
# Or use psql:
# Check via: npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%delivery%' OR table_name LIKE '%grade_item%';"
echo "Check Prisma Studio or DB for: GradeItemList, GradeItemListEntry, DeliveryOrder, DeliveryOrderItem"
```

- [ ] **Step 6: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat(schema): add GradeItemList, DeliveryOrder models for inventory distribution"
```

---

## Task 3: Grade Item Lists API (`/api/grade-item-lists`)

**Files:**
- Create: `server/src/routes/grade-item-lists.ts`

CRUD endpoints for managing which items belong to each grade/term. Only accounting/admin can write; warehouse can read.

- [ ] **Step 1: Create the file**

Create `server/src/routes/grade-item-lists.ts`:

```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, accountantRoles, accountingAndWarehouse } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET all lists (filterable by academicYear, term, stage, grade)
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
      where: { id: req.params.id },
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
    const createdBy = req.user!.userId;

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
            preferredSupplierId: e.preferredSupplierId || null,
            notes: e.notes || null
          }))
        }
      },
      include: { entries: { include: { inventoryItem: true } } }
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
      await tx.gradeItemListEntry.deleteMany({ where: { listId: req.params.id } });
      return tx.gradeItemList.update({
        where: { id: req.params.id },
        data: {
          updatedAt: new Date(),
          entries: {
            create: entries.map((e: any) => ({
              inventoryItemId: e.inventoryItemId,
              quantity: e.quantity || 1,
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

// DELETE a list (only if no delivery orders reference its items)
router.delete('/:id', requireAuth, accountantRoles, async (req, res) => {
  try {
    const list = await prisma.gradeItemList.findUnique({
      where: { id: req.params.id },
      include: { entries: true }
    });
    if (!list) return res.status(404).json({ error: 'القائمة غير موجودة' });

    await prisma.gradeItemList.delete({ where: { id: req.params.id } });
    res.json({ message: 'تم حذف القائمة بنجاح' });
  } catch (error: any) {
    res.status(400).json({ error: 'فشل حذف القائمة', details: error.message });
  }
});

export default router;
```

- [ ] **Step 2: Register route in `server/src/index.ts`**

Open `server/src/index.ts`. After the existing imports at the top, add:

```typescript
import gradeItemListsRouter from './routes/grade-item-lists';
```

After `app.use('/api/purchasing', purchasingRouter);`, add:

```typescript
app.use('/api/grade-item-lists', gradeItemListsRouter);
```

- [ ] **Step 3: Build and test**

```bash
cd server && npx tsc --noEmit
```
Expected: no errors.

```bash
# Start server and test
curl -s -X POST http://localhost:3001/api/grade-item-lists \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "stage": "ابتدائي", "grade": "5", "track": "local",
    "academicYear": "2025-2026", "term": "1",
    "entries": [{"inventoryItemId": "<id>", "quantity": 1}]
  }' | jq '.id'
```
Expected: UUID string.

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/grade-item-lists.ts server/src/index.ts
git commit -m "feat(api): add /api/grade-item-lists CRUD endpoints"
```

---

## Task 4: Delivery Orders API (`/api/delivery-orders`)

**Files:**
- Create: `server/src/routes/delivery-orders.ts`

This is the most complex route. It handles the full workflow:
`pending → confirmed → delivered` with treasury/accounting integration on delivery.

- [ ] **Step 1: Create code-generation helper at top of file**

Create `server/src/routes/delivery-orders.ts`:

```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, accountantRoles, warehouseRoles, accountingAndWarehouse } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

async function generateDeliveryCode(tx: any): Promise<string> {
  const count = await tx.deliveryOrder.count();
  const year = new Date().getFullYear();
  return `DO-${year}-${String(count + 1).padStart(5, '0')}`;
}
```

- [ ] **Step 2: Add GET list endpoint**

Append to the file:

```typescript
// GET list with filters
router.get('/', requireAuth, accountingAndWarehouse, async (req, res) => {
  try {
    const { status, studentId, academicYear, term } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (studentId) where.studentId = String(studentId);
    if (academicYear) where.academicYear = String(academicYear);
    if (term) where.term = String(term);

    const orders = await prisma.deliveryOrder.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, stage: true, grade: true, track: true } },
        items: { include: { inventoryItem: { select: { id: true, name: true, unit: true, grade: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'فشل تحميل طلبات التسليم' });
  }
});

// GET single order
router.get('/:id', requireAuth, accountingAndWarehouse, async (req, res) => {
  try {
    const order = await prisma.deliveryOrder.findUnique({
      where: { id: req.params.id },
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
```

- [ ] **Step 3: Add POST create endpoint (Accounting creates order)**

Append to the file:

```typescript
// POST create delivery order (Accounting)
router.post('/', requireAuth, accountantRoles, async (req, res) => {
  try {
    const { studentId, academicYear, term, chargeType, notes, items } = req.body;
    const requestedBy = req.user!.userId;

    if (!studentId || !academicYear || !term || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'الطالب والسنة الدراسية والترم والأصناف مطلوبة' });
    }
    if (!['within_fees', 'external'].includes(chargeType)) {
      return res.status(400).json({ error: 'نوع المصروف يجب أن يكون within_fees أو external' });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ error: 'الطالب غير موجود' });

    // Validate each item grade matches student grade
    for (const item of items) {
      const invItem = await prisma.inventoryItem.findUnique({ where: { id: item.inventoryItemId } });
      if (!invItem) return res.status(404).json({ error: `الصنف ${item.inventoryItemId} غير موجود` });
      if (invItem.grade && invItem.grade !== student.grade) {
        return res.status(400).json({
          error: `الصنف "${invItem.name}" مخصص للصف ${invItem.grade}، بينما الطالب في الصف ${student.grade}`
        });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const code = await generateDeliveryCode(tx);
      const totalAmount = items.reduce((sum: number, item: any) => sum + (Number(item.unitPrice) * Number(item.quantity)), 0);

      return tx.deliveryOrder.create({
        data: {
          code, studentId, academicYear, term,
          chargeType: chargeType || 'within_fees',
          requestedBy, notes: notes || null,
          totalAmount,
          items: {
            create: items.map((item: any) => ({
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
    res.status(400).json({ error: 'فشل إنشاء طلب التسليم', details: error.message });
  }
});
```

- [ ] **Step 4: Add PATCH confirm endpoint (Warehouse confirms)**

Append to the file:

```typescript
// PATCH confirm (Warehouse)
router.patch('/:id/confirm', requireAuth, warehouseRoles, async (req, res) => {
  try {
    const confirmedBy = req.user!.userId;
    const order = await prisma.deliveryOrder.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { inventoryItem: true } } }
    });
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (order.status !== 'pending') {
      return res.status(400).json({ error: `لا يمكن تأكيد طلب بحالة "${order.status}"` });
    }

    // Verify sufficient stock for all items
    for (const item of order.items) {
      if (item.inventoryItem.quantity < item.quantity) {
        return res.status(400).json({
          error: `الكمية المتوفرة من "${item.inventoryItem.name}" (${item.inventoryItem.quantity}) أقل من المطلوبة (${item.quantity})`
        });
      }
    }

    const updated = await prisma.deliveryOrder.update({
      where: { id: req.params.id },
      data: { status: 'confirmed', confirmedBy },
      include: { items: true }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: 'فشل تأكيد الطلب', details: error.message });
  }
});
```

- [ ] **Step 5: Add PATCH deliver endpoint (Warehouse delivers — most complex)**

Append to the file:

```typescript
// PATCH deliver (Warehouse physically hands over items)
router.patch('/:id/deliver', requireAuth, warehouseRoles, async (req, res) => {
  try {
    const deliveredBy = req.user!.userId;
    const deliveredByName = req.user!.name || 'أمين المخزن';

    const order = await prisma.deliveryOrder.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { inventoryItem: true } },
        student: true
      }
    });
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (order.status !== 'confirmed') {
      return res.status(400).json({ error: 'يجب تأكيد الطلب قبل التسليم' });
    }

    // If external charge: require open treasury session
    let openSession: { id: string } | null = null;
    if (order.chargeType === 'external') {
      openSession = await prisma.treasurySession.findFirst({
        where: { status: 'open' },
        select: { id: true }
      });
      if (!openSession) {
        return res.status(400).json({ error: 'لا توجد خزينة مفتوحة. يجب فتح الخزينة قبل تسليم أصناف خارجية.' });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      for (const item of order.items) {
        // Re-check stock inside transaction
        const freshItem = await tx.inventoryItem.findUnique({ where: { id: item.inventoryItemId } });
        if (!freshItem || freshItem.quantity < item.quantity) {
          throw new Error(`الكمية المتوفرة من "${item.itemName}" غير كافية`);
        }

        // Decrement inventory
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { quantity: { decrement: item.quantity }, lastUpdated: now.toISOString().split('T')[0] }
        });

        // Create InventoryTransaction
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

        // Journal entries
        const inventory1300 = await tx.account.findUnique({ where: { code: '1300' } });
        const cogs5001 = await tx.account.findUnique({ where: { code: '5001' } });

        if (order.chargeType === 'external') {
          // DR Cash (1001) | CR Revenue (4002/4003/4006) + DR COGS | CR Inventory
          const cash1001 = await tx.account.findUnique({ where: { code: '1001' } });
          const revCode = freshItem.category === 'books' || freshItem.category === 'كتب' ? '4002'
            : freshItem.category === 'uniform' || freshItem.category === 'زي' ? '4003' : '4006';
          const revAccount = await tx.account.findUnique({ where: { code: revCode } });
          const saleAmount = Number(freshItem.unitPrice) * item.quantity;
          const costAmount = Number(freshItem.unitCost) * item.quantity;

          if (cash1001 && revAccount) {
            await tx.journalEntry.create({
              data: {
                entryNumber: `JE-DEL-${Date.now()}-1`,
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
          }
          if (inventory1300 && cogs5001) {
            await tx.journalEntry.create({
              data: {
                entryNumber: `JE-DEL-${Date.now()}-2`,
                entryDate: now.toISOString().split('T')[0],
                description: `تكلفة تسليم ${item.itemName} (${order.code})`,
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
        } else {
          // within_fees: DR COGS only (no cash entry — fees already collected)
          if (inventory1300 && cogs5001) {
            const costAmount = Number(freshItem.unitCost) * item.quantity;
            await tx.journalEntry.create({
              data: {
                entryNumber: `JE-DEL-${Date.now()}`,
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
        }

        // Mark item as delivered
        await tx.deliveryOrderItem.update({
          where: { id: item.id },
          data: { deliveredAt: now }
        });
      }

      // If external: create Payment record + update student paidAmount
      if (order.chargeType === 'external' && openSession) {
        const receiptNumber = `DEL-${order.code}-${Date.now()}`;
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
```

- [ ] **Step 6: Add PATCH return/:itemId endpoint (return one item)**

Append to the file:

```typescript
// PATCH return a single item
router.patch('/:id/return/:itemId', requireAuth, warehouseRoles, async (req, res) => {
  try {
    const { returnNotes } = req.body;
    const returnedByName = req.user!.name || 'أمين المخزن';
    const returnedByUserId = req.user!.userId;

    const order = await prisma.deliveryOrder.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { inventoryItem: true } }, student: true }
    });
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (order.status !== 'delivered') {
      return res.status(400).json({ error: 'يمكن إرجاع أصناف من طلبات مُسلَّمة فقط' });
    }

    const orderItem = order.items.find(i => i.id === req.params.itemId);
    if (!orderItem) return res.status(404).json({ error: 'الصنف غير موجود في هذا الطلب' });
    if (!orderItem.deliveredAt) return res.status(400).json({ error: 'هذا الصنف لم يُسلَّم بعد' });
    if (orderItem.returnedAt) return res.status(400).json({ error: 'هذا الصنف مُعاد بالفعل' });

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // Return item to inventory
      await tx.inventoryItem.update({
        where: { id: orderItem.inventoryItemId },
        data: { quantity: { increment: orderItem.quantity }, lastUpdated: now.toISOString().split('T')[0] }
      });

      // Create return InventoryTransaction
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

      // If external: reverse the payment portion for this item
      if (order.chargeType === 'external') {
        const returnAmount = Number(orderItem.totalAmount);
        const openSession = await tx.treasurySession.findFirst({ where: { status: 'open' }, select: { id: true } });
        if (openSession) {
          await tx.payment.create({
            data: {
              studentId: order.studentId,
              studentName: order.student.name,
              amount: -returnAmount,
              type: 'other',
              method: 'cash',
              date: now,
              receiptNumber: `RET-${order.code}-${orderItem.id}-${Date.now()}`,
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
        }
      }

      // Mark item as returned
      await tx.deliveryOrderItem.update({
        where: { id: orderItem.id },
        data: { returnedAt: now, returnNotes: returnNotes || null }
      });

      // Check if ALL items returned → cancel order
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
    const order = await prisma.deliveryOrder.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'يمكن إلغاء الطلبات المعلقة فقط' });
    }
    await prisma.deliveryOrder.update({ where: { id: req.params.id }, data: { status: 'cancelled' } });
    res.json({ message: 'تم إلغاء الطلب' });
  } catch (error: any) {
    res.status(400).json({ error: 'فشل إلغاء الطلب' });
  }
});

export default router;
```

- [ ] **Step 7: Register route in `server/src/index.ts`**

Add import:
```typescript
import deliveryOrdersRouter from './routes/delivery-orders';
```

Add route registration after `gradeItemListsRouter`:
```typescript
app.use('/api/delivery-orders', deliveryOrdersRouter);
```

- [ ] **Step 8: Build check**

```bash
cd server && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 9: Test confirm + deliver flow**

```bash
# 1. Create order
ORDER=$(curl -s -X POST http://localhost:3001/api/delivery-orders \
  -H "Content-Type: application/json" -H "Authorization: Bearer <accounting_token>" \
  -d '{"studentId":"<sid>","academicYear":"2025-2026","term":"1","chargeType":"within_fees","items":[{"inventoryItemId":"<iid>","itemName":"كتاب رياضيات","quantity":1,"unitPrice":50}]}')
ORDER_ID=$(echo $ORDER | jq -r '.id')
echo "Created: $ORDER_ID"

# 2. Confirm (warehouse token)
curl -s -X PATCH http://localhost:3001/api/delivery-orders/$ORDER_ID/confirm \
  -H "Authorization: Bearer <warehouse_token>" | jq '.status'
# Expected: "confirmed"

# 3. Deliver
curl -s -X PATCH http://localhost:3001/api/delivery-orders/$ORDER_ID/deliver \
  -H "Authorization: Bearer <warehouse_token>" | jq '.status'
# Expected: "delivered"

# 4. Verify InventoryTransaction created
curl -s "http://localhost:3001/api/inventory/transactions" | jq '[.[] | select(.notes | contains("DO-"))] | length'
# Expected: >= 1
```

- [ ] **Step 10: Commit**

```bash
git add server/src/routes/delivery-orders.ts server/src/index.ts
git commit -m "feat(api): add /api/delivery-orders full workflow — create, confirm, deliver, return"
```

---

## Task 5: Distribution Report API

**Files:**
- Create: `server/src/routes/distribution-report.ts`

Calculates for each grade: required items × student count, current stock, already delivered, deficit/surplus. Also provides per-student receipt status.

- [ ] **Step 1: Create the file**

Create `server/src/routes/distribution-report.ts`:

```typescript
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

    // Get all grade item lists for this year/term
    const lists = await prisma.gradeItemList.findMany({
      where: { academicYear: String(academicYear), term: String(term) },
      include: {
        entries: { include: { inventoryItem: true } }
      }
    });

    // For each list, calculate student count + delivery stats
    const result = await Promise.all(lists.map(async (list) => {
      // Count students in this grade/stage/track/year
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

        // Count delivered (not returned)
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
          deficit,               // positive = need to buy; negative = surplus
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

    // Get the grade item list for context
    const list = await prisma.gradeItemList.findFirst({
      where: {
        academicYear: String(academicYear), term: String(term),
        stage: String(stage), grade: String(grade), track: String(track || 'local')
      },
      include: { entries: { include: { inventoryItem: true } } }
    });

    // Get all students in this grade
    const students = await prisma.student.findMany({
      where: {
        stage: String(stage), grade: String(grade),
        track: String(track || 'local'),
        academicYear: String(academicYear),
        deletedAt: null
      },
      select: { id: true, name: true, grade: true, stage: true }
    });

    // For each student, get their delivery orders
    const studentStatuses = await Promise.all(students.map(async (student) => {
      const orders = await prisma.deliveryOrder.findMany({
        where: {
          studentId: student.id,
          academicYear: String(academicYear),
          term: String(term)
        },
        include: { items: { include: { inventoryItem: true } } }
      });

      // Flatten all received items (delivered, not returned)
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
```

- [ ] **Step 2: Register route in `server/src/index.ts`**

Add import:
```typescript
import distributionReportRouter from './routes/distribution-report';
```

Add route registration:
```typescript
app.use('/api/distribution', distributionReportRouter);
```

- [ ] **Step 3: Test report endpoint**

```bash
curl -s "http://localhost:3001/api/distribution/grade-summary?academicYear=2025-2026&term=1" \
  -H "Authorization: Bearer <token>" | jq '.[0]'
```
Expected: object with `stage`, `grade`, `studentCount`, `items` array with `deficit` values.

```bash
curl -s "http://localhost:3001/api/distribution/student-status?academicYear=2025-2026&term=1&stage=ابتدائي&grade=5&track=local" \
  -H "Authorization: Bearer <token>" | jq '.summary'
```
Expected: `{ total, delivered, inProgress, notStarted }` object.

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/distribution-report.ts server/src/index.ts
git commit -m "feat(api): add /api/distribution report endpoints — grade summary + per-student status"
```

---

## Self-Review

| Spec Requirement | Task |
|-----------------|------|
| GradeItemList model with stage/grade/track/year/term | Task 2 |
| GradeItemListEntry with preferred supplier link | Task 2 |
| DeliveryOrder with pending→confirmed→delivered | Task 2 + 4 |
| DeliveryOrderItem with deliveredAt + returnedAt | Task 2 + 4 |
| Grade-student validation on create | Task 4 Step 3 |
| Treasury session validation for external charges | Task 4 Step 5 |
| InventoryTransaction on delivery | Task 4 Step 5 |
| Journal entries (external vs within_fees) | Task 4 Step 5 |
| Payment record for external delivery | Task 4 Step 5 |
| student.paidAmount update | Task 4 Step 5 |
| Return: reverse inventory + payment | Task 4 Step 6 |
| Deficit calculation | Task 5 |
| Per-student status report | Task 5 |
| warehouseRoles auth guard | Task 1 |
| No localStorage persist | N/A — server-only plan |
| All mutations in $transaction | Tasks 3, 4, 5 |
