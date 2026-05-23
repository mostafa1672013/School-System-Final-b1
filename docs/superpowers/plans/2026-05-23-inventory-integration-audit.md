# Inventory Cycle Integration Audit & Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four critical gaps in the inventory cycle's integration with students, the accounting system, the treasury, and payments — ensuring every inventory movement produces the correct double-entry journal, every cash sale is captured in the open treasury session as a Payment record, and student balances are updated accordingly.

**Architecture:** All changes are surgical server-side fixes in `server/src/routes/inventory.ts` and the Prisma schema (adding one account seed). No new models or frontend pages are required; the frontend already sends the correct data.

**Tech Stack:** Node/Express, Prisma (PostgreSQL), TypeScript, Zustand (frontend store for any UI changes)

---

## Findings Summary (What's Broken)

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | `JournalEntry` created with `date:` field — model has `entryDate:` | **Bug** | `inventory.ts` lines 264, 276, 373, 399, 422, 457 |
| 2 | Inventory *adjustment* creates DR Inventory \| CR AP 2001 — wrong account | **Bug** | `inventory.ts:268–307` (`/receive` endpoint) |
| 3 | Inventory *sale to student* creates a cash journal entry but **no `Payment` record** — treasury session blind to it | **Critical** | `inventory.ts:378–445` (`/issue` endpoint) |
| 4 | `/issue` with `subType: sale` doesn't validate an open treasury session exists | **Bug** | `inventory.ts:320` |
| 5 | Selling items to student doesn't update `student.paidAmount` or the relevant fee component (books/uniform) | **Design gap** | `inventory.ts` + students route |

---

## File Map

| File | Change |
|------|--------|
| `server/src/routes/inventory.ts` | Fix `entryDate`, fix adjustment account, add session validation & Payment creation for sales |
| `server/src/seed-accounts.ts` | Ensure account `5003` (تسوية المخزون) exists for adjustments |
| `server/prisma/schema.prisma` | No model changes needed — all FK relations already exist |

---

## Task 1: Fix `entryDate` Field Bug in `inventory.ts`

**Files:**
- Modify: `server/src/routes/inventory.ts` — all 6 `date: new Date()` occurrences inside `journalEntry.create` blocks

The `JournalEntry` Prisma model defines `entryDate: String @default("")`. Every `journalEntry.create` in `inventory.ts` passes `date: new Date()` — Prisma silently ignores unknown fields, so every journal entry gets `entryDate: ""` and is invisible to date-range reports.

- [ ] **Step 1: Write failing test**

```bash
# Start server, then:
curl -s -X POST http://localhost:3001/api/inventory/issue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"itemId":"<id>","quantity":1,"subType":"consumption","departmentName":"test","performedBy":"test"}' \
| jq '.transaction.journalEntryId'
# Returns an ID — then:
curl -s http://localhost:3001/api/accounting/journal-entries/<id> | jq '.entryDate'
# Expected: a real date string like "2026-05-23"
# Actual: ""
```

- [ ] **Step 2: Replace all 6 `date: new Date()` occurrences in journal entry `data` blocks**

In `server/src/routes/inventory.ts`, find every `journalEntry.create({ data: { date: new Date(), ...` and replace with the pattern below. There are 4 distinct blocks (receive, sale-entry1, sale-entry2, consumption):

```typescript
// BEFORE (wrong — 6 places):
date: new Date(),

// AFTER (correct):
entryDate: new Date().toISOString().split('T')[0],
```

Also add `entryNumber` to each create since `accounting-api.ts` sets it explicitly:

```typescript
// Add before `description:` in each journalEntry.create:
entryNumber: `JE-${new Date().getFullYear()}-${Date.now()}`,
entryDate: new Date().toISOString().split('T')[0],
```

The full corrected `/receive` journal block (lines ~268–308):

```typescript
const asset1300 = await tx.account.findUnique({ where: { code: '1300' } });
const liability2001 = await tx.account.findUnique({ where: { code: '2001' } });

if (asset1300 && liability2001) {
  const journalEntry = await tx.journalEntry.create({
    data: {
      entryNumber: `JE-INV-${Date.now()}`,
      entryDate: new Date().toISOString().split('T')[0],
      description: `استلام مخزون: ${item.name} (${quantity} ${item.unit})`,
      referenceType: 'inventory_receive',
      referenceId: transaction.id,
      status: 'posted',
      postedAt: new Date(),
      lines: {
        create: [
          { accountId: asset1300.id, debit: (unitCost || item.unitCost) * quantity, credit: 0, lineNumber: 1 },
          { accountId: liability2001.id, debit: 0, credit: (unitCost || item.unitCost) * quantity, lineNumber: 2 }
        ]
      }
    }
  });
  await tx.inventoryTransaction.update({
    where: { id: transaction.id },
    data: { journalEntryId: journalEntry.id }
  });
}
```

- [ ] **Step 3: Verify fix**

```bash
# Re-run the test from Step 1
curl -s http://localhost:3001/api/accounting/journal-entries/<new-id> | jq '.entryDate'
# Expected: "2026-05-23"
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/inventory.ts
git commit -m "fix(inventory): use entryDate field on JournalEntry (was silently using empty string)"
```

---

## Task 2: Fix Adjustment Journal Entry — Wrong Credit Account (CR AP 2001)

**Files:**
- Modify: `server/src/routes/inventory.ts` — `/receive` endpoint journal entry
- Modify: `server/src/seed-accounts.ts` — ensure account `5003` exists

When `subType` is `adjustment` or `opening_balance`, the current code posts DR 1300 (Inventory) | CR 2001 (Accounts Payable). This incorrectly creates a supplier liability for an internal adjustment. The correct entry is:
- `adjustment`: DR/CR 1300 | CR/DR 5003 (تسوية المخزون — Inventory Adjustment Expense/Income)
- `opening_balance`: DR 1300 | CR 3001 (Retained Earnings / حقوق الملكية)

- [ ] **Step 1: Verify account 5003 exists in seed**

```bash
grep -n "5003\|تسوية" server/src/seed-accounts.ts
```

If missing, open `server/src/seed-accounts.ts` and add:

```typescript
{ code: '5003', name: 'تسوية المخزون', nameEn: 'Inventory Adjustment', type: 'expense', normalBalance: 'debit', level: 4, parentId: null },
```

- [ ] **Step 2: Run seed to create account if missing**

```bash
cd server && npx ts-node src/seed-accounts.ts
```

Expected: new account 5003 created, or "already exists" — no error.

- [ ] **Step 3: Update the `/receive` journal entry block to use correct accounts**

Replace the journal entry block inside the `/receive` handler (after the `actualSubType !== 'purchase'` check) with:

```typescript
try {
  const asset1300 = await tx.account.findUnique({ where: { code: '1300' } });
  // For adjustment: DR Inventory | CR Inventory Adjustment (5003)
  // For opening_balance: DR Inventory | CR Retained Earnings (3001)
  const creditCode = subType === 'opening_balance' ? '3001' : '5003';
  const creditAccount = await tx.account.findUnique({ where: { code: creditCode } });

  if (asset1300 && creditAccount) {
    const totalCost = (unitCost ?? Number(item.unitCost)) * quantity;
    const journalEntry = await tx.journalEntry.create({
      data: {
        entryNumber: `JE-INV-${Date.now()}`,
        entryDate: new Date().toISOString().split('T')[0],
        description: `${subType === 'opening_balance' ? 'رصيد افتتاحي' : 'تسوية مخزون'}: ${item.name} (${quantity} ${item.unit})`,
        referenceType: 'inventory_adjustment',
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
  } else {
    console.warn(`⚠️ Account 1300 or ${creditCode} not found. Adjustment without journal entry.`);
  }
} catch (journalError) {
  console.warn('⚠️ Journal entry creation failed:', journalError);
}
```

- [ ] **Step 4: Test adjustment and opening_balance entries**

```bash
# Test adjustment
curl -s -X POST http://localhost:3001/api/inventory/receive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"itemId":"<id>","quantity":5,"subType":"adjustment","performedBy":"test"}' | jq '.transaction.journalEntryId'

# Then verify the entry has correct accounts:
curl -s "http://localhost:3001/api/accounting/journal-entries?referenceId=<txId>" \
  | jq '.[0].lines[] | {account: .account.code, debit, credit}'
# Expected: [{account:"1300", debit:>0, credit:0}, {account:"5003", debit:0, credit:>0}]
```

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/inventory.ts server/src/seed-accounts.ts
git commit -m "fix(inventory): use correct accounts for adjustment/opening_balance journal entries (was wrongly crediting AP 2001)"
```

---

## Task 3: Validate Open Treasury Session Before Inventory Sales

**Files:**
- Modify: `server/src/routes/inventory.ts` — `/issue` endpoint, `sale` subtype path

A sale to a student is a cash transaction. If the treasury is closed, there's nowhere to record the cash. The endpoint currently has no session validation.

- [ ] **Step 1: Add session lookup at the start of the `/issue` handler, inside the `$transaction` block, for `sale` subtype**

Find the `prisma.$transaction` block in `/issue` (around line 337) and add session validation after the item lookup:

```typescript
// After: if (item.quantity < quantity) { throw new Error(...) }
// Add:
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
```

- [ ] **Step 2: Test that sales fail gracefully when treasury is closed**

```bash
# Close treasury first (or test on an env where it's closed), then:
curl -s -X POST http://localhost:3001/api/inventory/issue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"itemId":"<id>","quantity":1,"subType":"sale","studentId":"<sid>","studentName":"Test","performedBy":"test"}' \
  | jq '.error'
# Expected: "لا توجد خزينة مفتوحة..."
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/inventory.ts
git commit -m "fix(inventory): require open treasury session for inventory sales"
```

---

## Task 4: Create Payment Record When Selling Inventory Items to Students

**Files:**
- Modify: `server/src/routes/inventory.ts` — `/issue` endpoint, after sale journal entry

This is the main integration gap. When a book/uniform is sold to a student from inventory:
- Cash enters the treasury but no `Payment` record is created
- The treasury session's payment list doesn't show it
- The student's `paidAmount` is not updated
- The treasury closing balance calculation is off

The fix: after creating the inventory transaction and journal entries for a sale, create a `Payment` record linked to `openSession.id`, then increment `student.paidAmount`.

The `Payment` model requires: `studentId?`, `studentName`, `amount`, `type`, `method`, `date`, `receiptNumber` (unique), `collectedBy`, `userId?`, `academicYear?`, `sessionId?`.

- [ ] **Step 1: Write the test expectation**

```bash
# Before the fix, after a successful sale:
curl -s "http://localhost:3001/api/payments?studentId=<sid>" | jq '. | length'
# Expected after fix: count increases by 1 and the new payment has type matching the item category
```

- [ ] **Step 2: Add Payment creation inside the `$transaction` block, after the journal entry section**

In `server/src/routes/inventory.ts`, inside the `/issue` handler `$transaction` block, after the journal entry `try/catch`, add:

```typescript
// Create Payment record for treasury tracking (sale only)
if (subType === 'sale' && openSession && studentId) {
  // Map inventory category to payment type
  const paymentTypeMap: Record<string, string> = {
    books: 'books',
    كتب: 'books',
    uniform: 'uniform',
    زي: 'uniform',
  };
  const paymentType = paymentTypeMap[item.category] ?? 'other';
  const receiptNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  await tx.payment.create({
    data: {
      studentId: studentId || null,
      studentName: studentName || 'غير محدد',
      amount: Number(item.unitPrice) * quantity,
      type: paymentType,
      method: 'cash',
      date: new Date(),
      receiptNumber,
      collectedBy: performedBy,
      userId: performedByUserId || null,
      sessionId: openSession.id,
      notes: `بيع مخزون: ${item.name} (${quantity} ${item.unit})`,
    }
  });

  // Update student paidAmount
  if (studentId) {
    await tx.student.update({
      where: { id: studentId },
      data: { paidAmount: { increment: Number(item.unitPrice) * quantity } }
    });
  }
}
```

- [ ] **Step 3: Destructure `studentId`, `studentName`, `performedBy`, `performedByUserId` properly at the start of the handler**

Verify these are destructured from `req.body` at line ~321. They already are — confirm:

```typescript
const { itemId, quantity, subType, departmentName, studentId, studentName, notes, performedBy, performedByUserId } = req.body;
```

- [ ] **Step 4: Test end-to-end sale flow**

```bash
# 1. Open treasury
# 2. Sell 1 book to student
RESPONSE=$(curl -s -X POST http://localhost:3001/api/inventory/issue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"itemId":"<bookId>","quantity":1,"subType":"sale","studentId":"<sid>","studentName":"أحمد محمد","performedBy":"أمين الصندوق","performedByUserId":"<uid>"}')
echo $RESPONSE | jq '.transaction.id'

# 3. Verify Payment was created
curl -s "http://localhost:3001/api/payments" \
  | jq '[.[] | select(.notes | contains("بيع مخزون"))] | length'
# Expected: 1

# 4. Verify student paidAmount updated
curl -s "http://localhost:3001/api/students/<sid>" | jq '.paidAmount'
# Expected: previous value + unitPrice

# 5. Verify treasury session includes the payment
curl -s "http://localhost:3001/api/treasury/sessions/<sessionId>" \
  | jq '.session.payments | length'
# Expected: increased by 1
```

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/inventory.ts
git commit -m "feat(inventory): create Payment record and update student balance when selling inventory items"
```

---

## Task 5: Fix Sale Journal Entry — Cash Goes Through Session Not Generic Cash Account

**Files:**
- Modify: `server/src/routes/inventory.ts` — sale journal entry (DR Cash 1001)

Currently the sale entry always uses account `1001` (Cash). The treasury system tracks multiple cash instruments (1001 = Cash, 1002 = Wallet, 1003 = Bank). Since inventory sales at the counter are always cash, `1001` is correct. However the `entryDate` bug (Task 1) means these were never visible in reports. After Task 1 is complete, verify the sale entries are correct.

- [ ] **Step 1: Verify journal entry correctness after Tasks 1–4**

```bash
# Fetch the journal entry for a recent sale transaction
TX_ID=$(curl -s "http://localhost:3001/api/inventory/transactions" \
  | jq -r '[.[] | select(.subType=="sale")][0].journalEntryId')
curl -s "http://localhost:3001/api/accounting/journal-entries/$TX_ID" \
  | jq '{date: .entryDate, lines: [.lines[] | {account: .account.code, debit, credit}]}'
```

Expected output:
```json
{
  "date": "2026-05-23",
  "lines": [
    {"account": "1001", "debit": "250.00", "credit": "0"},
    {"account": "4002", "debit": "0", "credit": "250.00"}
  ]
}
```

- [ ] **Step 2: Verify COGS journal entry also has correct date**

```bash
# The second journal entry (COGS) for the same transaction
# It's not stored in transaction.journalEntryId (only entry1 is)
# Search by referenceId
curl -s "http://localhost:3001/api/accounting/journal-entries?referenceId=$TX_ID" \
  | jq '[.[] | {entryDate, lines: [.lines[] | {account: .account.code, debit, credit}]}]'
```

Expected: both entries have today's date and correct accounts (5001 COGS + 1300 Inventory).

- [ ] **Step 3: If entryDate is still wrong on COGS entry, fix it inline (same pattern as Task 1)**

The COGS entry in `inventory.ts` at around line 419–441:

```typescript
// BEFORE:
const journalEntry2 = await tx.journalEntry.create({
  data: {
    date: new Date(),
    description: `تكلفة بضاعة مباعة: ...`,
// AFTER:
const journalEntry2 = await tx.journalEntry.create({
  data: {
    entryNumber: `JE-COGS-${Date.now()}`,
    entryDate: new Date().toISOString().split('T')[0],
    description: `تكلفة بضاعة مباعة: ...`,
```

- [ ] **Step 4: Commit if changes were needed**

```bash
git add server/src/routes/inventory.ts
git commit -m "fix(inventory): ensure COGS journal entry uses entryDate field"
```

---

## Task 6: Smoke Test — Full Inventory Cycle End-to-End

**Files:** None — verification only

Confirm the complete cycle works without regression:

- [ ] **Step 1: Test P2P purchase cycle still works**

```bash
# Create supplier, purchase request, PO, goods receipt, invoice, supplier payment
# Verify:
# - InventoryItem.quantity increases after goods receipt
# - PurchaseInvoice creates JE: DR 1300 | CR 2001
# - SupplierPayment creates JE: DR 2001 | CR 1001
curl -s "http://localhost:3001/api/purchasing/invoices" | jq '.[0].journalEntryId'
# Expected: non-null UUID
```

- [ ] **Step 2: Test consumption still works**

```bash
curl -s -X POST http://localhost:3001/api/inventory/issue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"itemId":"<id>","quantity":2,"subType":"consumption","departmentName":"المكتبة","performedBy":"test"}' \
  | jq '.transaction.journalEntryId'
# Expected: non-null UUID

# Verify journal entry: DR 5002 | CR 1300
```

- [ ] **Step 3: Test adjustment (Task 2 fix)**

```bash
curl -s -X POST http://localhost:3001/api/inventory/receive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"itemId":"<id>","quantity":3,"subType":"adjustment","performedBy":"test"}' \
  | jq '.transaction.journalEntryId'
# Verify: DR 1300 | CR 5003 (NOT 2001)
```

- [ ] **Step 4: Test full sale cycle (Tasks 3–5 combined)**

```bash
# 1. Open treasury
# 2. Sell uniform to student
# 3. Verify: Payment record created, student paidAmount updated, JE: DR 1001 | CR 4003
# 4. Close treasury — verify closing balance includes the sale amount
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "test(inventory): verify full cycle — P2P, adjustment, consumption, student sale"
```

---

## Self-Review Checklist

| Requirement | Covered |
|-------------|---------|
| `entryDate` bug fixed across all 6 occurrences | Task 1 |
| Adjustment uses account 5003, opening_balance uses 3001 | Task 2 |
| Sale requires open treasury session | Task 3 |
| Sale creates `Payment` record linked to session | Task 4 |
| Student `paidAmount` updated on sale | Task 4 |
| COGS entry uses correct `entryDate` | Task 5 |
| P2P cycle not broken | Task 6 |
| Consumption not broken | Task 6 |

**Not in scope (separate plans if needed):**
- The `purchasing.ts/receipts` route creates `InventoryTransaction` records without journal entries (the JE is deferred to invoice creation) — this is by design but means there's a period between receipt and invoice where the accounting doesn't reflect the inventory increase. This is a separate design decision.
- Receipt number generation for inventory sales could use a dedicated sequence — current approach uses `Date.now()` which is sufficient for now.
