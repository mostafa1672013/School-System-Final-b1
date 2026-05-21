# Student Account Statement & Promotion Status Design

## Goal

**Part A:** Add a "كشف الحساب" tab to `StudentDetail` showing a complete financial statement: fee summary, student journey timeline, and transactions table — with print and PDF export.

**Part B:** Auto-set student `status` on promotion. Final-grade secondary students get a `admitted`/`graduated` choice; all others default to `admitted`.

---

## Part A: Student Account Statement

### Tab Structure

New tab **"كشف الحساب"** added to the existing Tabs in `StudentDetail.tsx` (alongside "سجل المدفوعات", "خطط الأقساط", "السجل المالي للسنوات").

Three sections inside the tab:

#### 1. Financial Summary Card
| Field | Source |
|-------|--------|
| إجمالي الرسوم | `student.totalFees` |
| المدفوع (السنة الحالية) | sum of `studentPayments` |
| المتبقي | `student.totalFees - paidFromPayments` |
| الخصم المعتمد | `student.discountAmount` |
| متأخرات من سنوات سابقة | `student.arrearsFees` |

#### 2. رحلة الطالب (Timeline)

Events reconstructed from existing data, sorted chronologically:

| Event | Source | Label |
|-------|--------|-------|
| القبول | `student.enrollmentDate` | "تم قبول الطالب في [stage] - [grade]" |
| نقل لسنة جديدة | each `yearlyFinance` record (sorted by `academicYear`) | "نُقل للعام [year] — [grade]" + "متأخرات: [amount]" if `arrearsFees > 0` |
| خصم معتمد | `student.discountAmount > 0` (once) | "خصم [amount] ([percentage]%) معتمد" |
| خطة أقساط | each `InstallmentPlan` in `installmentPlans[id]` | "إنشاء خطة أقساط [total] — [n] أقساط" |
| قسط متأخر | `InstallmentItem` where `status === 'overdue'` or `status === 'pending' && dueDate < today` | "قسط متأخر — [amount] — استحق [dueDate]" |
| دفعة | each `Payment` in `studentPayments` | "دفعة [amount] — [type] — [method]" |
| مشتريات مخزن | `InventoryTransaction[]` from `/api/students/:id/inventory` | "شراء [itemName] × [quantity] — [amount]" |

Timeline is rendered as a vertical list with icons and color coding:
- القبول/النقل: blue
- الدفعات: green
- المتأخرات: red
- الأقساط: amber
- المخزن: purple

#### 3. جدول المعاملات

Flat table of all financial events (payments + inventory purchases) with columns:
`التاريخ | النوع | البيان | المبلغ | طريقة الدفع`

Filter by type: الكل / مدفوعات / مخزن / أقساط

#### Print & PDF

Two buttons in the tab header:
- **طباعة** → `window.print()`. A `@media print` CSS block (in a `<style>` tag injected on mount) hides sidebar, header, other tabs, and action buttons. Only the statement section is printed.
- **تصدير PDF** → `jsPDF` + `html2canvas`: captures the statement div and saves as `كشف-حساب-[studentName].pdf`.

### Data Flow

```
StudentDetail mounts
  └─ existing: fetchStudents(), fetchPayments(), fetchStudentInstallments(id)
  └─ NEW: fetch /api/students/:id/inventory → local state inventoryTx[]
```

No new server endpoints needed.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/StudentDetail.tsx` | Add "كشف الحساب" tab, fetch inventory on mount, timeline + table + print logic |
| `package.json` | Add `jspdf` and `html2canvas` dependencies |

---

## Part B: Status Update on Promotion

### Logic

The final grade of secondary is `gradeOptions['secondary']` last element = `"الصف الثالث الثانوي"`.

```
isFinalGrade(stage, grade) = stage === 'secondary' && grade === 'الصف الثالث الثانوي'
```

**In `StudentPromotion.tsx` (SinglePromotion):**
- After user selects `toStage` / `toGrade`, compute `isFinal = isFinalGrade(toStage, toGrade)`
- If `isFinal`: show a `<Select>` in the confirmation dialog:
  ```
  الوضع بعد النقل: [ admitted (لا زال طالباً) | graduated (تخرج) ]
  ```
  Default: `admitted`
- If `!isFinal`: `status = 'admitted'` silently, no UI shown

**In `StudentPromotion.tsx` (BulkPromotion):**
- For each student in `buildPromotions()`, compute `isFinal` per student
- Students where `isFinal === true`: add a "الوضع" column to the confirmation table showing a per-row `<Select>`
- Students where `isFinal === false`: `status = 'admitted'` automatically

### Payload Changes

`promoteStudent` store call gains one field:
```typescript
status: StudentStatus  // 'admitted' | 'graduated'
```

Server `POST /api/students/:id/promote` gains:
```typescript
data: { ..., status: status ?? 'admitted' }
```

### Files Changed

| File | Change |
|------|--------|
| `server/src/index.ts` | Accept `status` in promote endpoint body, pass to `prisma.student.update` |
| `src/stores/studentsStore.ts` | Add `status: StudentStatus` to `promoteStudent` and `bulkPromoteStudents` payload types |
| `src/pages/StudentPromotion.tsx` | `isFinalGrade` helper, status select in single + bulk confirmation |

---

## Out of Scope

- No backend audit log table — timeline is reconstructed from existing records
- No date-range filter on the statement (show full history)
- No email/share of the statement
- No retroactive status fix for already-promoted students
- Spec 2 (fee editing approval workflow + installment improvements) is a separate cycle
