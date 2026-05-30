# Payment Academic Year Filter & Arrears Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Filter the payments tab to show only the current academic year, add an `'arrears'` payment type that decrements `student.arrearsFees`, tag all payments with `academicYear` at approval time, and save an old-year snapshot at promotion time.

**Architecture:** Four independent layers of change: (1) shared types/labels, (2) StudentDetail display filter + arrears banner, (3) `academicYear` tagging in PaymentApprovals and Payments pages, (4) server-side arrears decrement + promote old-year snapshot. Each task builds on the previous type definitions but is otherwise self-contained.

**Tech Stack:** React 18 + TypeScript, Zustand, shadcn/ui, TailwindCSS, Express + Prisma (SQLite).

---

## File Structure

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `'arrears'` to `PaymentType` |
| `src/lib/utils.ts` | Add `arrears` to `paymentTypeLabels` |
| `src/pages/StudentDetail.tsx` | Filter `studentPayments` by year; add arrears alert banner |
| `src/pages/PaymentApprovals.tsx` | Add `academicYear: student.academicYear` to `newPayment` |
| `src/pages/Payments.tsx` | Add `academicYear: student.academicYear` to `newPayment` |
| `server/src/index.ts` | Decrement `arrearsFees` for `'arrears'` payments; save old-year snapshot at promote |

---

### Task 1: Add 'arrears' to PaymentType and paymentTypeLabels

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/utils.ts`

- [ ] **Step 1: Add 'arrears' to PaymentType in src/types/index.ts**

Find line 119:
```typescript
export type PaymentType = 'tuition' | 'books' | 'uniform' | 'bus' | 'activities' | 'other' | 'application_fee';
```

Change to:
```typescript
export type PaymentType = 'tuition' | 'books' | 'uniform' | 'bus' | 'activities' | 'other' | 'application_fee' | 'arrears';
```

- [ ] **Step 2: Add arrears label in src/lib/utils.ts**

Find `paymentTypeLabels` (around line 58):
```typescript
export const paymentTypeLabels: Record<string, string> = {
  tuition: 'رسوم دراسية',
  books: 'كتب',
  uniform: 'زي مدرسي',
  bus: 'باص',
  activities: 'أنشطة',
  other: 'أخرى',
};
```

Change to:
```typescript
export const paymentTypeLabels: Record<string, string> = {
  tuition: 'رسوم دراسية',
  books: 'كتب',
  uniform: 'زي مدرسي',
  bus: 'باص',
  activities: 'أنشطة',
  other: 'أخرى',
  arrears: 'سداد متأخرات',
};
```

- [ ] **Step 3: Verify build passes**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/lib/utils.ts
git commit -m "feat: add arrears payment type and label"
```

---

### Task 2: Filter studentPayments by year + arrears alert banner in StudentDetail

**Files:**
- Modify: `src/pages/StudentDetail.tsx`

Context: `studentPayments` is defined around line 59. The component renders a page with a student info card at the top, then a financial summary section, then tabs. The `AlertCircle` icon is already imported.

- [ ] **Step 1: Update studentPayments filter**

Find (around line 59):
```typescript
const studentPayments = useMemo(() => payments.filter((p) => p.studentId === id && p.type !== 'application_fee'), [payments, id]);
```

Replace with:
```typescript
const studentPayments = useMemo(
  () => payments.filter(p =>
    p.studentId === id &&
    p.type !== 'application_fee' &&
    (!p.academicYear || p.academicYear === student?.academicYear)
  ),
  [payments, id, student?.academicYear]
);
```

Note: `!p.academicYear` keeps legacy payments that were recorded before this field was required.

- [ ] **Step 2: Add arrears alert banner**

Find the `{/* Financial Summary */}` section (around line 291). Add the banner ABOVE it, right after the closing `</div>` of the student info card block and before `{/* Financial Summary */}`:

```tsx
{/* Arrears Alert Banner */}
{student.arrearsFees > 0 && (
  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <AlertCircle className="size-5 text-amber-600 shrink-0" />
      <p className="text-sm font-medium text-amber-800">
        يوجد متأخرات من سنوات سابقة:{' '}
        <span className="font-bold tabular-nums">{formatCurrency(student.arrearsFees)}</span>
      </p>
    </div>
    <Button
      size="sm"
      variant="outline"
      className="border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0"
      onClick={() => {
        setPayForm(f => ({ ...f, type: 'arrears' as PaymentType, amount: student.arrearsFees }));
        setPayDialogOpen(true);
      }}
    >
      تسجيل دفعة للمتأخرات
    </Button>
  </div>
)}
```

- [ ] **Step 3: Verify build passes**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npm run build
```

Expected: `✓ built in` — no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/StudentDetail.tsx
git commit -m "feat: filter payments by academic year and add arrears alert banner"
```

---

### Task 3: Tag payments with academicYear in PaymentApprovals and Payments

**Files:**
- Modify: `src/pages/PaymentApprovals.tsx`
- Modify: `src/pages/Payments.tsx`

- [ ] **Step 1: Add academicYear to newPayment in PaymentApprovals.tsx**

Find the `newPayment` object (around line 28–38):
```typescript
const newPayment = {
    studentId: student.id,
    studentName: student.name,
    amount: student.pendingPaymentAmount,
    type: student.pendingPaymentType,
    method: student.pendingPaymentMethod || 'bank_transfer',
    date,
    receiptNumber,
    collectedBy: 'مدير المدرسة',
    notes: 'تم الاعتماد من قبل الإدارة',
    walletPhoneNumber: student.pendingWalletPhoneNumber || undefined,
};
```

Add `academicYear: student.academicYear,` after `walletPhoneNumber`:
```typescript
const newPayment = {
    studentId: student.id,
    studentName: student.name,
    amount: student.pendingPaymentAmount,
    type: student.pendingPaymentType,
    method: student.pendingPaymentMethod || 'bank_transfer',
    date,
    receiptNumber,
    collectedBy: 'مدير المدرسة',
    notes: 'تم الاعتماد من قبل الإدارة',
    walletPhoneNumber: student.pendingWalletPhoneNumber || undefined,
    academicYear: student.academicYear,
};
```

- [ ] **Step 2: Add academicYear to newPayment in Payments.tsx**

Find the `newPayment` object in the payment form submit handler (around line 168–178):
```typescript
const newPayment = {
    studentId: form.studentId,
    studentName: student.name,
    amount: form.amount,
    type: form.type,
    method: form.method,
    date,
    receiptNumber,
    collectedBy: user?.name || 'موظف الخزينة',
    notes: form.notes || undefined,
    walletPhoneNumber: form.method === 'wallet' ? form.walletPhoneNumber : undefined,
    userId: user?.id,
};
```

Add `academicYear: student.academicYear,` after `userId`:
```typescript
const newPayment = {
    studentId: form.studentId,
    studentName: student.name,
    amount: form.amount,
    type: form.type,
    method: form.method,
    date,
    receiptNumber,
    collectedBy: user?.name || 'موظف الخزينة',
    notes: form.notes || undefined,
    walletPhoneNumber: form.method === 'wallet' ? form.walletPhoneNumber : undefined,
    userId: user?.id,
    academicYear: student.academicYear,
};
```

- [ ] **Step 3: Verify build passes**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npm run build
```

Expected: `✓ built in` — no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/PaymentApprovals.tsx src/pages/Payments.tsx
git commit -m "feat: tag payments with academicYear at approval and collection time"
```

---

### Task 4: Server — arrears decrement + promote old-year snapshot

**Files:**
- Modify: `server/src/index.ts`

This task has two independent server-side changes in the same file.

#### Part A: Decrement arrearsFees for 'arrears' payment type

Find the `prisma.student.update` inside the `POST /api/payments` `$transaction` (around line 528–542):

```typescript
prisma.student.update({
  where: { id: studentId },
  data: { 
    ...(type !== 'application_fee' && { paidAmount: { increment: amount } }),
    // If all remaining is used, clear any pending request
    pendingPaymentAmount: null,
    pendingPaymentType: null,
    pendingPaymentMethod: null,
    pendingWalletPhoneNumber: null,
    pendingPaymentNotes: null,
    pendingInstallmentPlanId: null,
    pendingInstallmentId: null,
    paymentRequestStatus: null
  }
})
```

- [ ] **Step 1: Add arrears decrement to the student update**

Change the `data` block to add the arrears decrement line:

```typescript
prisma.student.update({
  where: { id: studentId },
  data: { 
    ...(type !== 'application_fee' && { paidAmount: { increment: amount } }),
    ...(type === 'arrears' && { arrearsFees: { decrement: amount } }),
    pendingPaymentAmount: null,
    pendingPaymentType: null,
    pendingPaymentMethod: null,
    pendingWalletPhoneNumber: null,
    pendingPaymentNotes: null,
    pendingInstallmentPlanId: null,
    pendingInstallmentId: null,
    paymentRequestStatus: null
  }
})
```

#### Part B: Save old-year snapshot at promotion time

The promote endpoint is `POST /api/students/:id/promote` (around line 174). Currently it runs a `$transaction` with 2 items: `[prisma.student.update(...), prisma.studentYearlyFinance.upsert(...)]` and destructures as `const [student] = ...`.

- [ ] **Step 2: Fetch current student before the transaction**

Add a database read BEFORE the `try` block's `$transaction` call. Insert this code after `const { stage, grade, ... } = req.body;` and before the `try {` block (or at the very start of the `try` block, before `prisma.$transaction`):

```typescript
  try {
    // Fetch current student to save old-year snapshot
    const currentStudent = await prisma.student.findUnique({
      where: { id },
      include: {
        payments: {
          where: { NOT: { type: 'application_fee' } },
        },
      },
    });

    if (!currentStudent) {
      return res.status(404).json({ error: 'الطالب غير موجود' });
    }

    const oldAcademicYear = currentStudent.academicYear;
    const oldPaidAmount = currentStudent.payments
      .filter(p => !p.academicYear || p.academicYear === oldAcademicYear)
      .reduce((sum, p) => sum + p.amount, 0);
```

- [ ] **Step 3: Add old-year upsert to the $transaction array**

Find the existing `$transaction` call and add a third item — the old-year upsert. Change:

```typescript
    const [student] = await prisma.$transaction([
      prisma.student.update({
        where: { id },
        data: { ... },
        include: { yearlyFinance: { orderBy: { academicYear: 'asc' } } },
      }),
      prisma.studentYearlyFinance.upsert({
        where: { studentId_academicYear: { studentId: id, academicYear } },
        create: { ... },
        update: { ... },
      }),
    ]);
```

To:

```typescript
    const [student] = await prisma.$transaction([
      prisma.student.update({
        where: { id },
        data: {
          stage, grade, academicYear,
          tuitionFees, booksFees, uniformFees, busFees, otherFees,
          arrearsFees: arrearsFees ?? 0,
          discountAmount: discountAmount ?? 0,
          discountPercentage: discountPercentage ?? 0,
          totalFees,
          paidAmount: 0,
          status: status ?? 'admitted',
        },
        include: { yearlyFinance: { orderBy: { academicYear: 'asc' } } },
      }),
      prisma.studentYearlyFinance.upsert({
        where: { studentId_academicYear: { studentId: id, academicYear: oldAcademicYear } },
        create: {
          studentId: id,
          academicYear: oldAcademicYear,
          stage: currentStudent.stage,
          grade: currentStudent.grade,
          tuitionFees: currentStudent.tuitionFees,
          booksFees: currentStudent.booksFees,
          uniformFees: currentStudent.uniformFees,
          busFees: currentStudent.busFees,
          otherFees: currentStudent.otherFees,
          arrearsFees: currentStudent.arrearsFees,
          totalFees: currentStudent.totalFees,
          paidAmount: oldPaidAmount,
        },
        update: { paidAmount: oldPaidAmount },
      }),
      prisma.studentYearlyFinance.upsert({
        where: { studentId_academicYear: { studentId: id, academicYear } },
        create: {
          studentId: id,
          academicYear,
          stage,
          grade,
          tuitionFees,
          booksFees,
          uniformFees,
          busFees,
          otherFees,
          arrearsFees: arrearsFees ?? 0,
          totalFees,
          paidAmount: 0,
        },
        update: {
          stage,
          grade,
          tuitionFees,
          booksFees,
          uniformFees,
          busFees,
          otherFees,
          arrearsFees: arrearsFees ?? 0,
          totalFees,
          paidAmount: 0,
        },
      }),
    ]);
```

Note: The `$transaction` now returns `[studentUpdate, oldYearUpsert, newYearUpsert]`. Only `student` (index 0) is used — the destructuring `const [student] = ...` stays correct.

- [ ] **Step 4: Verify build passes**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npm run build
```

Expected: `✓ built in` — no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: decrement arrearsFees on arrears payment, save old-year snapshot at promotion"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|-----------------|------|
| Add `'arrears'` to `PaymentType` | Task 1 |
| Add `arrears: 'سداد متأخرات'` to `paymentTypeLabels` | Task 1 |
| Filter `studentPayments` by `student.academicYear` | Task 2 |
| Legacy payments (`!p.academicYear`) still shown | Task 2 |
| Arrears alert banner with amount + quick-pay button | Task 2 |
| Button presets payment dialog to type `arrears` + amount | Task 2 |
| `academicYear` tagged in `PaymentApprovals.tsx` | Task 3 |
| `academicYear` tagged in `Payments.tsx` | Task 3 |
| Server decrements `arrearsFees` for `type === 'arrears'` | Task 4 |
| Promote saves old-year snapshot to `yearlyFinance` | Task 4 |
| Old-year `paidAmount` = sum of payments filtered by year | Task 4 |

All requirements covered. ✅

**Placeholder scan:** No TBD, no vague steps. All code blocks complete. ✅

**Type consistency:**
- `'arrears'` defined in Task 1, used in Task 2 (`'arrears' as PaymentType`) and Task 4 (`type === 'arrears'`) ✅
- `student.academicYear` used in Tasks 2, 3 — same field name throughout ✅
- `oldAcademicYear`, `oldPaidAmount` defined in Task 4 Step 2, used in Step 3 ✅
- `$transaction` destructuring `const [student] = ...` unchanged — still correct with 3-item array ✅
