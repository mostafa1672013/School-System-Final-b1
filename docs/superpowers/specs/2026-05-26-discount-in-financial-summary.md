# Discount Line in Student Financial Summary — Design Spec

**Goal:** Show the applied discount (percentage + amount) as an explicit line item in the student's financial summary card.

**Scope:** Single UI change in `src/pages/StudentDetail.tsx`.

---

## Behaviour

- A new row appears between the fee-breakdown block and the "إجمالي الرسوم المطلوبة" row.
- The row is **only rendered when `student.discountAmount > 0`** — students without a discount see no change.
- Label: `الخصم المطبق (X%)` where X = `student.discountPercentage` (integer display, e.g. 10 not 10.00).
- Value: `−{formatCurrency(student.discountAmount)}` — negative, formatted like all other currency values.
- Text colour: orange (`text-orange-600`) to visually distinguish it from regular fee rows.

## Data source

Both fields already exist on the student object returned by `GET /api/students`:
- `student.discountPercentage` — set by badge system or manual discount workflow.
- `student.discountAmount` — the monetary deduction already reflected in `totalFees`.

No backend changes required.

## Placement

Inside the `space-y-3` container in the "الملخص المالي" card, immediately **after** the `bg-muted/30` fee-breakdown block and **before** the "إجمالي الرسوم المطلوبة" row.

## Non-goals

- No changes to the fee breakdown block or any other summary row.
- No changes to backend or data model.
