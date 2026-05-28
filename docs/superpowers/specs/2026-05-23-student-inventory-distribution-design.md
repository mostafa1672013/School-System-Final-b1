# Student Inventory Distribution System — Design Spec

**Date:** 2026-05-23
**Status:** Approved

---

## Goal

Track the full lifecycle of distributing school supplies (books, uniforms) to students:
from defining what each grade needs per term → checking inventory vs need → purchasing via the existing P2P cycle if stock is short → accounting approves a delivery order → warehouse delivers to student and records receipt → reports show who received what and where deficits remain.

---

## Core Concepts

| Concept | Description |
|---------|-------------|
| **GradeItemList** | A list of required inventory items for a specific stage + grade + track + academic year + term. Each entry links to an `InventoryItem` with a required quantity and optional preferred supplier. |
| **DeliveryOrder** | A request created by Accounting for a specific student to receive items. Has a charge type (within_fees / external). Goes through statuses: `pending → confirmed → delivered`. Cancelled on rejection or stock issue. |
| **DeliveryOrderItem** | One line in a delivery order — a specific item + quantity. Tracks `deliveredAt` (physical handover) and `returnedAt` (if returned for exchange). |
| **Deficit** | Calculated server-side: (GradeItemList.quantity × number of students in that grade) − current InventoryItem.quantity. A positive deficit triggers a purchase recommendation. |

---

## Data Models (New)

### GradeItemList
```
id, stage, grade, track, academicYear, term (1|2|3|summer)
createdBy, createdAt, updatedAt
→ items: GradeItemListEntry[]
```

### GradeItemListEntry
```
id, listId → GradeItemList
inventoryItemId → InventoryItem
quantity (required per student)
preferredSupplierId? → Supplier   ← links to existing P2P supplier registry
notes?
```

### DeliveryOrder
```
id, code (unique, auto-generated)
studentId → Student
academicYear, term
status: pending | confirmed | delivered | cancelled
chargeType: within_fees | external
requestedBy (Accounting user id)
confirmedBy? (Warehouse user id)
deliveredBy? (Warehouse user id)
totalAmount
notes?
createdAt, updatedAt
→ items: DeliveryOrderItem[]
```

### DeliveryOrderItem
```
id, orderId → DeliveryOrder
inventoryItemId → InventoryItem
itemName (snapshot)
quantity
unitPrice (snapshot)
totalAmount
deliveredAt?   ← set when physically handed to student
returnedAt?    ← set on return; clears the receipt for re-issue
returnNotes?
```

---

## Workflow

### 1. Setup — Grade Item Lists
- Admin opens **Settings → قوائم المستلزمات**
- Selects stage + grade + track + year + term
- Adds items from inventory with required quantity per student and optional preferred supplier
- Can clone a previous term's list as starting point

### 2. Delivery Request — Accounting Side
- Accounting opens student record or a new "طلبات التسليم" screen
- Creates a `DeliveryOrder` for a student:
  - Selects term → system pre-fills items from GradeItemList for student's grade
  - Sets `chargeType` (within_fees / external)
  - Submits → status = `pending`
- If `chargeType = external` → amount added to student debt on delivery

### 3. Fulfillment — Warehouse Side
- Warehouse sees pending delivery orders queue
- Confirms availability → status = `confirmed`
- Physically delivers items to student:
  - Marks each `DeliveryOrderItem.deliveredAt`
  - Status → `delivered`
  - Triggers: `InventoryTransaction` (out, subType: delivery) + `Payment` record linked to treasury session (if chargeType = external) + student `paidAmount` update

### 4. Returns / Exchanges
- Warehouse opens the delivered order
- Marks `DeliveryOrderItem.returnedAt` + reason
- System creates `InventoryTransaction` (in, subType: return)
- If `chargeType = external`: reversal `Payment` record created (negative amount) + `student.paidAmount` decremented
- Student receipt for that item is cleared → can receive again
- If full order returned → status → `cancelled`

### 5. Purchasing Integration — When Stock is Short
- Reports screen calculates deficit per grade per term
- "إنشاء طلب شراء" button creates a `PurchaseRequest` in the **existing P2P cycle**
  - Pre-fills items from the deficit
  - Pre-selects `preferredSupplierId` from GradeItemListEntry if set
- PurchaseRequest → PurchaseOrder → GoodsReceipt → PurchaseInvoice → SupplierPayment
  (all via existing purchasing module — no changes needed there)
- After GoodsReceipt, inventory updates and pending delivery orders can proceed

---

## Grade-Student Validation

When a DeliveryOrder is created or when the warehouse delivers:
- Verify `InventoryItem.grade` matches `Student.grade` (if item has a grade set)
- If mismatch → block with error: "هذا الصنف مخصص لصف [X]، الطالب في صف [Y]"

---

## Reports Screen — توزيع المستلزمات

### Tab 1: توزيع المراحل
Table grouped by stage → grade → term:
| الصنف | المطلوب (× طلاب) | المتوفر | تم توزيعه | العجز / الزيادة | إجراء |
|-------|-----------------|---------|-----------|-----------------|-------|
| كتاب الرياضيات ص5 | 120 | 95 | 80 | -25 ⚠️ | إنشاء طلب شراء |

### Tab 2: متابعة الطلاب
Table of all students in a grade:
| الطالب | الترم | الكتب | الزي | الحالة | آخر تحديث |
|--------|-------|-------|------|--------|-----------|
Shows per student: ✅ received, ⏳ pending order, ❌ not started

### Tab 3: المرتجعات
Log of all returns with reason and replacement status.

---

## Screens / UI Components

| Screen | Location | Purpose |
|--------|----------|---------|
| قوائم المستلزمات (Grade Item Lists) | Settings or new page under Inventory | Admin defines items per grade per term |
| طلبات التسليم (Delivery Orders) | New page, accessible to Accounting + Warehouse | Create, confirm, deliver orders |
| تقرير التوزيع (Distribution Report) | Sub-tab under Inventory or new Reports sub-page | Deficit analysis + purchase trigger |
| Student Detail: ما تم استلامه | Existing StudentDetail page — new tab | Show delivery history per student |

---

## Charge Type Logic

| chargeType | Effect on delivery |
|------------|-------------------|
| `within_fees` | Books/uniform already in `totalFees` — delivery just records physical handover, no new Payment created |
| `external` | New item outside original fees — on delivery: creates `Payment` record + increments `student.paidAmount` |

---

## Accounting / Journal Entries

| Event | Journal Entry |
|-------|--------------|
| Delivery (external charge, cash) | DR 1001 Cash \| CR 4002/4003 Revenue + DR 5001 COGS \| CR 1300 Inventory |
| Delivery (within_fees) | DR 5001 COGS \| CR 1300 Inventory (no cash entry — fees already collected) |
| Return to inventory | Reverse of above |

---

## Out of Scope (separate features)

- Digital signature / student sign-off on delivery
- Barcode scanning per item
- Multi-branch inventory
