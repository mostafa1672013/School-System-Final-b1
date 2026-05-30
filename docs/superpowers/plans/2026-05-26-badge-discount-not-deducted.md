# Badge Discount Not Applied to totalFees — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a badge is assigned to a student, deduct the badge's discount percentage from the student's `totalFees` field.

**Architecture:** Single-file server-side fix in the `PATCH /:id/badge` route. Gross fees are recomputed from individual fee components (tuition, books, uniform, bus, other + additionalFees JSON) so the discount is never applied to an already-discounted total. `totalFees` is updated in the same Prisma call that sets `discountAmount` and `discountPercentage`.

**Tech Stack:** Node.js, Express, Prisma ORM, TypeScript

---

## Root Cause

File: `server/src/routes/students.ts` — `router.patch('/:id/badge', ...)` starting at line 342.

When assigning a badge the handler:
1. Reads `student.totalFees` (which is already the **net** amount after any prior discount).
2. Computes `discountAmount = totalFees * percentage / 100` and stores it.
3. **Never writes back an updated `totalFees`**, so the student's balance is unchanged.

When the badge is removed, `discountAmount` is zeroed but `totalFees` is also never restored.

---

## File Structure

| Action | File |
|--------|------|
| Modify | `server/src/routes/students.ts` (lines 342–383) |

No new files required.

---

### Task 1: Fix the badge-assignment route to update `totalFees`

**Files:**
- Modify: `server/src/routes/students.ts:342-383`

- [ ] **Step 1: Understand the current broken logic**

Read lines 342–383 of `server/src/routes/students.ts`. The handler:
- Fetches `student` from DB
- Computes `discountAmount = student.totalFees * badge.discountPercentage / 100`  
- Builds `discountData` object **without `totalFees`**
- Calls `prisma.student.update({ data: discountData })` — `totalFees` is untouched

- [ ] **Step 2: Replace the badge route handler with the corrected version**

Replace the entire `router.patch('/:id/badge', ...)` block (lines 342–384) with the following:

```typescript
// Assign badge to student (auto-apply discount)
router.patch('/:id/badge', async (req, res) => {
  const { id } = req.params;
  const { badgeId } = req.body; // null to remove badge
  try {
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Gross fees = sum of individual components (never use totalFees which may already be net)
    const additionalFeesArr = Array.isArray(student.additionalFees) ? student.additionalFees as any[] : [];
    const grossFees =
      Number(student.tuitionFees  || 0) +
      Number(student.booksFees    || 0) +
      Number(student.uniformFees  || 0) +
      Number(student.busFees      || 0) +
      Number(student.otherFees    || 0) +
      additionalFeesArr.reduce((s: number, f: any) => s + (f?.selected ? Number(f.amount || 0) : 0), 0);

    let discountData: Record<string, unknown>;

    if (badgeId) {
      const badge = await prisma.badge.findUnique({ where: { id: badgeId } });
      if (!badge) return res.status(404).json({ error: 'Badge not found' });

      const discountAmount = Math.round(grossFees * Number(badge.discountPercentage) / 100);
      discountData = {
        badgeId,
        discountPercentage: badge.discountPercentage,
        discountAmount,
        totalFees: grossFees - discountAmount,   // ← THE FIX: apply the deduction
        discountStatus: 'approved',
        discountApprovedBy: 'badge_system',
      };
    } else {
      // Remove badge → zero the discount and restore full gross fees
      discountData = {
        badgeId: null,
        discountPercentage: 0,
        discountAmount: 0,
        totalFees: grossFees,                    // ← THE FIX: restore gross when badge removed
        discountStatus: 'approved',
        discountApprovedBy: null,
      };
    }

    const updated = await prisma.student.update({
      where: { id },
      data: discountData,
      include: { yearlyFinance: { orderBy: { academicYear: 'asc' } }, badge: true }
    });
    res.json(updated);
  } catch (error) {
    console.error('Assign badge error:', error);
    res.status(400).json({ error: 'Failed to assign badge' });
  }
});
```

- [ ] **Step 3: Rebuild the server**

```bash
cd server && npm run build
```

Expected: Build completes with no TypeScript errors.

- [ ] **Step 4: Manually verify the fix**

Start the dev server and open a student's detail page. Assign a badge with a known discount percentage (e.g. 10%). Confirm:

1. The student card shows the badge.
2. The `totalFees` displayed decreases by the correct amount (`grossFees * 10% = discountAmount`).
3. Removing the badge restores `totalFees` to the gross value.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/students.ts
git commit -m "fix(students): deduct badge discount from totalFees on badge assign/remove

When assigning a badge, discountAmount was stored but totalFees was never
updated, so the student's balance was unchanged. Now grossFees is computed
from individual fee components and totalFees is updated atomically with
discountAmount. Removing a badge restores totalFees to the gross amount."
```

---

## Self-Review Checklist

- [x] **Spec coverage:** The single requirement (badge discount not deducted) is fully addressed in Task 1.
- [x] **No placeholders:** All code blocks are complete and runnable.
- [x] **Type consistency:** `discountData` shape matches the Prisma `Student` model fields (`discountAmount`, `discountPercentage`, `totalFees`, `badgeId`, `discountStatus`, `discountApprovedBy`).
- [x] **Double-discount prevention:** Gross fees are computed from individual components, not from the pre-existing `totalFees`, so re-assigning a different badge never compounds discounts.
- [x] **additionalFees handled:** JSON `additionalFees` array is parsed and its selected items are included in the gross, matching the logic in `setup-fees`.
