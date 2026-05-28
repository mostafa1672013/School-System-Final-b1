# Payment Academic Year Filter & Arrears Payment Design

## Goal

1. Filter the "سجل المدفوعات" tab to show only the **current academic year's payments** (books, uniform, bus, tuition, all types).
2. Ensure every payment is tagged with `academicYear` when recorded — fixing the gap in `PaymentApprovals.tsx` and `Treasury.tsx`.
3. At promotion time, save a snapshot of the **old year's** `yearlyFinance` (with actual `paidAmount` from payments) before resetting.
4. Add a new payment type `'arrears'` — displayed as a banner alert + payment dialog shortcut — that decrements `student.arrearsFees` when paid.

---

## Payment Flow (existing context)

Payments are NOT recorded directly in StudentDetail. The flow is:

```
StudentDetail → handlePay → updateStudent(pendingPayment* fields)
                                    ↓
              PaymentApprovals or Treasury → addPayment(newPayment)
                                                    ↓
                              POST /api/payments (server records Payment + updates yearlyFinance)
```

`academicYear` is missing from the `newPayment` object in both `PaymentApprovals.tsx` and `Treasury.tsx`. The server already accepts and stores `academicYear` — it just isn't being sent.

---

## Changes

### 1. Add `'arrears'` to PaymentType

**`src/types/index.ts`:**
```typescript
export type PaymentType = 'tuition' | 'books' | 'uniform' | 'bus' | 'activities' | 'other' | 'application_fee' | 'arrears';
```

**`src/lib/utils.ts`** — add to `paymentTypeLabels`:
```typescript
arrears: 'سداد متأخرات',
```

---

### 2. Filter studentPayments by current academic year (StudentDetail.tsx)

**Current:**
```typescript
const studentPayments = useMemo(
  () => payments.filter(p => p.studentId === id && p.type !== 'application_fee'),
  [payments, id]
);
```

**New:**
```typescript
const studentPayments = useMemo(
  () => payments.filter(p =>
    p.studentId === id &&
    p.type !== 'application_fee' &&
    (!p.academicYear || p.academicYear === student.academicYear)
  ),
  [payments, id, student.academicYear]
);
```

Note: `!p.academicYear` keeps legacy payments that were recorded without a year tag.

---

### 3. Arrears alert banner (StudentDetail.tsx)

Show at the top of the page (above the info card) when `student.arrearsFees > 0`:

```tsx
{student.arrearsFees > 0 && (
  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <AlertCircle className="size-5 text-amber-600 shrink-0" />
      <p className="text-sm font-medium text-amber-800">
        يوجد متأخرات من سنوات سابقة: <span className="font-bold tabular-nums">{formatCurrency(student.arrearsFees)}</span>
      </p>
    </div>
    <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0"
      onClick={() => {
        setPayForm(f => ({ ...f, type: 'arrears', amount: student.arrearsFees }));
        setPayDialogOpen(true);
      }}>
      تسجيل دفعة للمتأخرات
    </Button>
  </div>
)}
```

---

### 4. Tag payments with academicYear at approval time

**`src/pages/PaymentApprovals.tsx`** — add `academicYear: student.academicYear` to `newPayment`:

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
  academicYear: student.academicYear,   // ← add this
};
```

**`src/pages/Treasury.tsx`** — same fix: add `academicYear: student.academicYear` wherever `addPayment` is called with pending payment data.

---

### 5. Server: decrement arrearsFees for 'arrears' payment type

**`server/src/index.ts`** — inside `POST /api/payments`, in the `prisma.student.update` data block, add conditional arrears decrement:

```typescript
data: {
  ...(type !== 'application_fee' && { paidAmount: { increment: amount } }),
  ...(type === 'arrears' && { arrearsFees: { decrement: amount } }),
  // clear pending fields...
}
```

The Prisma `decrement` will not go below 0 if a DB-level check is in place, but to be safe the client should cap `amount` at `student.arrearsFees`. If the DB allows negative values, add a follow-up update or use a raw query — but in practice the UI dialog caps the amount so this shouldn't be an issue.

---

### 6. Promote endpoint: save old year snapshot (server/src/index.ts)

At promotion time, upsert the **old** academic year's `yearlyFinance` with the actual `paidAmount` from existing payments before resetting the student. This fixes the case where a student never had a `yearlyFinance` record for their first year.

Add to the `$transaction` array in `POST /api/students/:id/promote`:

```typescript
// Fetch current student to get old academicYear and fees
const currentStudent = await prisma.student.findUnique({
  where: { id },
  include: { payments: { where: { type: { not: 'application_fee' } } } }
});
const oldYear = currentStudent.academicYear;
const oldPaid = currentStudent.payments
  .filter(p => !p.academicYear || p.academicYear === oldYear)
  .reduce((sum, p) => sum + p.amount, 0);
```

Then add to `$transaction`:
```typescript
prisma.studentYearlyFinance.upsert({
  where: { studentId_academicYear: { studentId: id, academicYear: oldYear } },
  create: {
    studentId: id,
    academicYear: oldYear,
    stage: currentStudent.stage,
    grade: currentStudent.grade,
    tuitionFees: currentStudent.tuitionFees,
    booksFees: currentStudent.booksFees,
    uniformFees: currentStudent.uniformFees,
    busFees: currentStudent.busFees,
    otherFees: currentStudent.otherFees,
    arrearsFees: currentStudent.arrearsFees,
    totalFees: currentStudent.totalFees,
    paidAmount: oldPaid,
  },
  update: { paidAmount: oldPaid },
}),
```

This runs in the same `$transaction` as the student update and new-year upsert, so it's atomic.

---

## Files Changed

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `'arrears'` to `PaymentType` |
| `src/lib/utils.ts` | Add `arrears` label to `paymentTypeLabels` |
| `src/pages/StudentDetail.tsx` | Filter `studentPayments` by year + arrears banner |
| `src/pages/PaymentApprovals.tsx` | Add `academicYear` to `newPayment` |
| `src/pages/Treasury.tsx` | Add `academicYear` to `newPayment` |
| `server/src/index.ts` | `arrears` payment decrements `student.arrearsFees`; promote saves old-year snapshot |

---

## Out of Scope

- No migration for existing payments without `academicYear` (they show under current year via the `!p.academicYear` fallback)
- No UI to view previous years' payments (they're visible in "السجل المالي للسنوات")
- No partial arrears tracking per year — `student.arrearsFees` is a cumulative field
