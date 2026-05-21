# Promotion Arrears & Badge Discount Design

## Goal

When promoting a student, carry over any unpaid balance from the previous year as `arrearsFees` in the new year's financial record. Apply the student's badge discount only to the new year's base fees — not to arrears.

## Data Model Changes

### `StudentYearlyFinance` (Prisma + TypeScript)
Add one field:
```prisma
arrearsFees Float @default(0)
```

### `Student` (Prisma + TypeScript)
Add one field:
```prisma
arrearsFees Float @default(0)
```

This mirrors the active year's arrears for quick access without querying `yearlyFinance`.

## Fee Calculation at Promotion Time

```
arrears        = max(0, student.totalFees - student.paidAmount)
baseNewFees    = stageFee.tuitionFees + stageFee.booksFees + stageFee.uniformFees
                 + sum(stageFee.additionalFees where isMandatory)
discountAmt    = baseNewFees × (student.badge.discountPercentage / 100)   // 0 if no badge
netNewFees     = baseNewFees - discountAmt
totalFees      = netNewFees + student.busFees + student.otherFees + arrears
```

**Key rule:** `discountAmt` is applied to `baseNewFees` only. `arrears` and `busFees`/`otherFees` are never discounted.

## API: `PATCH /api/students/:id` (promote payload)

The existing endpoint is reused. The client sends:

```json
{
  "stage": "primary",
  "grade": "الصف الثاني الابتدائي",
  "academicYear": "2025-2026",
  "tuitionFees": 9000,
  "booksFees": 500,
  "uniformFees": 300,
  "busFees": 600,
  "otherFees": 0,
  "arrearsFees": 2000,
  "totalFees": 12400,
  "paidAmount": 0,
  "discountAmount": 1000,
  "discountPercentage": 10
}
```

The server stores all fields as-is (no server-side recalculation needed — client is trusted for fee math since it has full context).

## Frontend: Confirmation Dialog

Always show a fee breakdown table regardless of whether discount/arrears exist:

| البند | المبلغ |
|-------|--------|
| رسوم المرحلة الجديدة | X ج.م |
| خصم الشارة (N%) | − Y ج.م |
| رسوم بعد الخصم | Z ج.م |
| متأخرات السنة السابقة | A ج.م |
| **الإجمالي** | **T ج.م** |

- If no badge: show "خصم الشارة" row as "0 ج.م"
- If no arrears: show "متأخرات" row as "0 ج.م"
- Warning line: "سيتم إعادة تعيين المبالغ المسددة إلى صفر"

## Files to Change

| File | Change |
|------|--------|
| `server/prisma/schema.prisma` | Add `arrearsFees` to `Student` and `StudentYearlyFinance` |
| `server/src/index.ts` | No logic change needed — PATCH already passes through all fields |
| `src/types/index.ts` | Add `arrearsFees: number` to `Student` and `StudentYearlyFinance` interfaces |
| `src/pages/StudentPromotion.tsx` | Update fee calculation + confirmation dialog breakdown |
| `src/stores/studentsStore.ts` | Pass `arrearsFees` and updated `discountAmount`/`discountPercentage` in promote payload |

## Migration

```prisma
// New migration: add arrearsFees with default 0
// Existing students: arrearsFees = 0 (no retroactive calculation)
```

Run: `npx prisma migrate dev --name add_arrears_fees`

## Out of Scope

- No UI to manually edit arrears after promotion
- No retroactive arrears calculation for existing students
- Arrears from multiple previous years are not tracked separately (cumulative only)
