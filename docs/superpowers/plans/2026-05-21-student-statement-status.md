# Student Account Statement & Promotion Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full "كشف الحساب" tab to StudentDetail (financial summary + student journey timeline + transactions table + print/PDF export) and auto-set student status on promotion (graduated vs admitted for final secondary grade).

**Architecture:** A new `StudentStatement` component encapsulates all statement UI and is imported into `StudentDetail` as a new tab. Inventory data is fetched via an existing endpoint and stored in `paymentsStore`. Promotion status flows from a UI select (single + bulk) → store payload → server endpoint.

**Tech Stack:** React 18 + TypeScript, Zustand, shadcn/ui, TailwindCSS, `jspdf` (already installed), `html2canvas` (to install), Lucide icons, Express + Prisma backend.

---

## File Structure

| File | Role |
|------|------|
| `src/components/student/StudentStatement.tsx` | New component: financial summary + timeline + transactions + print/PDF |
| `src/pages/StudentDetail.tsx` | Add "كشف الحساب" tab trigger + content, fetch inventory on mount |
| `src/stores/paymentsStore.ts` | Add `inventoryTx` state + `fetchStudentInventory` action |
| `server/src/index.ts` | Accept `status` field in `POST /api/students/:id/promote` |
| `src/stores/studentsStore.ts` | Add `status: StudentStatus` to `promoteStudent` + `bulkPromoteStudents` types |
| `src/pages/StudentPromotion.tsx` | `isFinalGrade` helper, status `<Select>` in single + bulk confirmation dialogs |

---

### Task 1: Install html2canvas + add fetchStudentInventory to paymentsStore

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `src/stores/paymentsStore.ts`

- [ ] **Step 1: Install html2canvas**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npm install html2canvas
npm install --save-dev @types/html2canvas
```

Expected: `html2canvas` appears in `package.json` dependencies.

- [ ] **Step 2: Add InventoryTransaction import and inventoryTx state to paymentsStore**

Open `src/stores/paymentsStore.ts`. Change the type import at line 4:

```typescript
import type { Payment, InstallmentPlan, InventoryTransaction } from '@/types';
```

Then add `inventoryTx` to the `PaymentsState` interface (after `pendingPlanEdits`):

```typescript
  inventoryTx: Record<string, InventoryTransaction[]>; // studentId -> transactions
  fetchStudentInventory: (studentId: string) => Promise<void>;
```

- [ ] **Step 3: Add inventoryTx initial state and fetchStudentInventory implementation**

Inside the `create` call, after `pendingPlanEdits: [],`, add:

```typescript
      inventoryTx: {},

      fetchStudentInventory: async (studentId) => {
        try {
          const response = await fetch(`/api/students/${studentId}/inventory`, {
            headers: getAuthHeaders(),
          });
          const data = await response.json();
          set(state => ({
            inventoryTx: { ...state.inventoryTx, [studentId]: data },
          }));
        } catch (error) {
          console.error('Fetch student inventory error:', error);
        }
      },
```

- [ ] **Step 4: Verify build passes**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npm run build
```

Expected: `✓ built in` with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/stores/paymentsStore.ts
git commit -m "feat: add html2canvas dep and fetchStudentInventory to paymentsStore"
```

---

### Task 2: Create StudentStatement component

**Files:**
- Create: `src/components/student/StudentStatement.tsx`

- [ ] **Step 1: Create the directory if needed**

```bash
mkdir -p "/Users/me/Downloads/Project/untitled folder/src/components/student"
```

- [ ] **Step 2: Create StudentStatement.tsx**

Create `src/components/student/StudentStatement.tsx` with the full content:

```tsx
import { useState, useMemo, useRef } from 'react';
import {
  Printer, Download, BookOpen, CreditCard, ArrowRightLeft,
  Tag, ShoppingBag, AlertCircle, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  formatCurrency, formatDateShort, stageLabels,
  paymentTypeLabels, paymentMethodLabels,
} from '@/lib/utils';
import type { Student, Payment, InstallmentPlan, InventoryTransaction } from '@/types';

type TxFilter = 'all' | 'payments' | 'inventory' | 'installments';

type TimelineEventType =
  | 'enrollment' | 'promotion' | 'discount'
  | 'payment' | 'installment_plan' | 'installment_overdue' | 'inventory';

interface TimelineEvent {
  id: string;
  date: string;
  type: TimelineEventType;
  label: string;
  amount?: number;
  subLabel?: string;
}

interface Props {
  student: Student;
  payments: Payment[];
  installmentPlan: InstallmentPlan | null;
  inventoryTx: InventoryTransaction[];
}

const eventConfig: Record<TimelineEventType, { color: string; Icon: React.ElementType }> = {
  enrollment:          { color: 'text-blue-600 bg-blue-50 border-blue-200',     Icon: BookOpen },
  promotion:           { color: 'text-blue-600 bg-blue-50 border-blue-200',     Icon: ArrowRightLeft },
  discount:            { color: 'text-green-600 bg-green-50 border-green-200',  Icon: Tag },
  payment:             { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', Icon: CreditCard },
  installment_plan:    { color: 'text-amber-600 bg-amber-50 border-amber-200',  Icon: Clock },
  installment_overdue: { color: 'text-red-600 bg-red-50 border-red-200',        Icon: AlertCircle },
  inventory:           { color: 'text-purple-600 bg-purple-50 border-purple-200', Icon: ShoppingBag },
};

export default function StudentStatement({ student, payments, installmentPlan, inventoryTx }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [txFilter, setTxFilter] = useState<TxFilter>('all');

  const paidAmount = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const remaining = Math.max(0, student.totalFees - paidAmount);

  // ── Timeline ───────────────────────────────────────────────────────────────
  const events = useMemo((): TimelineEvent[] => {
    const list: TimelineEvent[] = [];

    if (student.enrollmentDate) {
      list.push({
        id: 'enroll',
        date: student.enrollmentDate,
        type: 'enrollment',
        label: `تم قبول الطالب — ${stageLabels[student.stage]} / ${student.grade}`,
      });
    }

    (student.yearlyFinance ?? []).forEach(yf => {
      list.push({
        id: `yf-${yf.id}`,
        date: `${yf.academicYear.slice(0, 4)}-09-01`,
        type: 'promotion',
        label: `نُقل للعام ${yf.academicYear} — ${stageLabels[yf.stage]} / ${yf.grade}`,
        subLabel: yf.arrearsFees > 0 ? `متأخرات مرحّلة: ${formatCurrency(yf.arrearsFees)}` : undefined,
        amount: yf.arrearsFees > 0 ? yf.arrearsFees : undefined,
      });
    });

    if (student.discountAmount > 0 && student.enrollmentDate) {
      list.push({
        id: 'discount',
        date: student.enrollmentDate,
        type: 'discount',
        label: `خصم معتمد ${student.discountPercentage}% — ${formatCurrency(student.discountAmount)}`,
      });
    }

    if (installmentPlan) {
      list.push({
        id: `plan-${installmentPlan.id}`,
        date: installmentPlan.createdDate,
        type: 'installment_plan',
        label: `إنشاء خطة أقساط — ${formatCurrency(installmentPlan.totalAmount)} / ${installmentPlan.numberOfInstallments} أقساط`,
      });
      const today = new Date().toISOString().split('T')[0];
      installmentPlan.installments.forEach(inst => {
        const overdue = (inst.status === 'pending' || inst.status === 'overdue') && inst.dueDate < today;
        if (overdue) {
          list.push({
            id: `overdue-${inst.id}`,
            date: inst.dueDate,
            type: 'installment_overdue',
            label: `قسط متأخر — استحق ${formatDateShort(inst.dueDate)}`,
            amount: inst.amount - (inst.paidAmount ?? 0),
          });
        }
      });
    }

    payments.forEach(p => {
      list.push({
        id: `pay-${p.id}`,
        date: p.date,
        type: 'payment',
        label: `دفعة ${paymentTypeLabels[p.type] ?? p.type} — ${paymentMethodLabels[p.method] ?? p.method}`,
        amount: p.amount,
      });
    });

    inventoryTx.forEach(tx => {
      list.push({
        id: `inv-${tx.id}`,
        date: tx.createdAt.slice(0, 10),
        type: 'inventory',
        label: `شراء ${tx.item?.name ?? tx.itemName ?? ''} × ${tx.quantity}`,
        amount: tx.totalAmount,
      });
    });

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [student, payments, installmentPlan, inventoryTx]);

  // ── Transactions table ─────────────────────────────────────────────────────
  const filteredTx = useMemo(() => {
    type TxRow = { id: string; date: string; type: string; label: string; amount: number; method?: string };
    const rows: TxRow[] = [];

    if (txFilter === 'all' || txFilter === 'payments') {
      payments.forEach(p => rows.push({
        id: p.id,
        date: p.date,
        type: paymentTypeLabels[p.type] ?? p.type,
        label: 'دفعة',
        amount: p.amount,
        method: paymentMethodLabels[p.method] ?? p.method,
      }));
    }
    if (txFilter === 'all' || txFilter === 'inventory') {
      inventoryTx.forEach(tx => rows.push({
        id: tx.id,
        date: tx.createdAt.slice(0, 10),
        type: 'مخزن',
        label: tx.item?.name ?? tx.itemName ?? '',
        amount: tx.totalAmount,
      }));
    }
    if (txFilter === 'all' || txFilter === 'installments') {
      installmentPlan?.installments.filter(i => i.status === 'paid').forEach(i => rows.push({
        id: i.id,
        date: i.paidDate ?? i.dueDate,
        type: 'قسط',
        label: 'تسديد قسط',
        amount: i.paidAmount ?? i.amount,
      }));
    }
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, [payments, inventoryTx, installmentPlan, txFilter]);

  // ── Print / PDF ────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const content = printRef.current?.innerHTML ?? '';
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html dir="rtl">
        <head>
          <title>كشف حساب — ${student.name}</title>
          <style>
            body { font-family: sans-serif; padding: 24px; direction: rtl; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; }
            td, th { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background: #f5f5f5; font-weight: 600; }
            .print-hidden { display: none; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.print();
    win.close();
  };

  const handleExportPdf = async () => {
    if (!printRef.current) return;
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);
    const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = (canvas.height * pdfW) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
    pdf.save(`كشف-حساب-${student.name}.pdf`);
  };

  const filterLabels: Record<TxFilter, string> = {
    all: 'الكل', payments: 'مدفوعات', inventory: 'مخزن', installments: 'أقساط',
  };

  return (
    <div>
      {/* Action buttons — hidden when printing via popup */}
      <div className="flex gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="size-4 ml-1" />طباعة
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPdf}>
          <Download className="size-4 ml-1" />تصدير PDF
        </Button>
      </div>

      <div ref={printRef} className="space-y-6">
        {/* 1. Financial Summary */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-bold font-[Noto_Kufi_Arabic] mb-3">الملخص المالي</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-muted/30 rounded p-3">
              <p className="text-muted-foreground text-xs mb-1">إجمالي الرسوم</p>
              <p className="font-bold tabular-nums">{formatCurrency(student.totalFees)}</p>
            </div>
            <div className="bg-emerald-50 rounded p-3">
              <p className="text-muted-foreground text-xs mb-1">المدفوع</p>
              <p className="font-bold text-emerald-600 tabular-nums">{formatCurrency(paidAmount)}</p>
            </div>
            <div className="bg-red-50 rounded p-3">
              <p className="text-muted-foreground text-xs mb-1">المتبقي</p>
              <p className="font-bold text-red-600 tabular-nums">{formatCurrency(remaining)}</p>
            </div>
            {student.discountAmount > 0 && (
              <div className="bg-green-50 rounded p-3">
                <p className="text-muted-foreground text-xs mb-1">الخصم المعتمد</p>
                <p className="font-bold text-green-600 tabular-nums">{formatCurrency(student.discountAmount)}</p>
              </div>
            )}
            {student.arrearsFees > 0 && (
              <div className="bg-amber-50 rounded p-3">
                <p className="text-muted-foreground text-xs mb-1">متأخرات سابقة</p>
                <p className="font-bold text-amber-600 tabular-nums">{formatCurrency(student.arrearsFees)}</p>
              </div>
            )}
          </div>
        </div>

        {/* 2. Student Journey Timeline */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-bold font-[Noto_Kufi_Arabic] mb-4">رحلة الطالب</h3>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">لا توجد أحداث مسجلة</p>
          ) : (
            <div className="relative">
              <div className="absolute right-[18px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-4">
                {events.map(ev => {
                  const { color, Icon } = eventConfig[ev.type];
                  return (
                    <div key={ev.id} className="flex items-start gap-3 relative">
                      <span className={`relative z-10 flex items-center justify-center size-9 rounded-full border-2 shrink-0 ${color}`}>
                        <Icon className="size-4" />
                      </span>
                      <div className="flex-1 pt-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{ev.label}</p>
                        {ev.subLabel && (
                          <p className="text-xs text-red-600 mt-0.5">{ev.subLabel}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDateShort(ev.date)}</p>
                      </div>
                      {ev.amount != null && (
                        <span className={`text-sm font-bold tabular-nums pt-1 shrink-0 ${
                          ev.type === 'installment_overdue' ? 'text-red-600'
                          : ev.type === 'payment' ? 'text-emerald-600'
                          : 'text-foreground'
                        }`}>
                          {formatCurrency(ev.amount)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. Transactions Table */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-bold font-[Noto_Kufi_Arabic]">سجل المعاملات</h3>
            <div className="flex gap-1">
              {(Object.keys(filterLabels) as TxFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setTxFilter(f)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    txFilter === f
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {filterLabels[f]}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-right">
                  <th className="p-3 font-semibold">التاريخ</th>
                  <th className="p-3 font-semibold">النوع</th>
                  <th className="p-3 font-semibold">البيان</th>
                  <th className="p-3 font-semibold">المبلغ</th>
                  <th className="p-3 font-semibold">طريقة الدفع</th>
                </tr>
              </thead>
              <tbody>
                {filteredTx.map(row => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 tabular-nums">{formatDateShort(row.date)}</td>
                    <td className="p-3">{row.type}</td>
                    <td className="p-3">{row.label}</td>
                    <td className="p-3 tabular-nums font-medium">{formatCurrency(row.amount)}</td>
                    <td className="p-3 text-muted-foreground">{row.method ?? '—'}</td>
                  </tr>
                ))}
                {filteredTx.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      لا توجد معاملات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build passes**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npm run build
```

Expected: `✓ built in` — no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/student/StudentStatement.tsx
git commit -m "feat: add StudentStatement component with timeline, transactions, print/PDF"
```

---

### Task 3: Wire "كشف الحساب" tab into StudentDetail

**Files:**
- Modify: `src/pages/StudentDetail.tsx`

The tab list is around line 477. The history tab content ends around line 635.

- [ ] **Step 1: Add inventory state and fetch to StudentDetail**

At the top of the `StudentDetail` function, add after the existing `useState` declarations (around line 70):

```typescript
const [inventoryTx, setInventoryTx] = useState<import('@/types').InventoryTransaction[]>([]);
```

Add to the `usePaymentsStore` destructuring (line ~34):

```typescript
const {
  payments,
  fetchPayments,
  addPayment,
  installmentPlans,
  fetchStudentInstallments,
  saveInstallmentPlan,
  payInstallment,
  updateInstallmentPlan,
  fetchStudentInventory,      // ← add this
  inventoryTx: inventoryTxMap, // ← add this
} = usePaymentsStore();
```

Then update the `useEffect` that fetches data (around line 50) to also fetch inventory:

```typescript
useEffect(() => {
  fetchStudents();
  fetchPayments();
  if (id) {
    fetchStudentInstallments(id);
    fetchStudentInventory(id);  // ← add this line
  }
}, [fetchStudents, fetchPayments, fetchStudentInstallments, fetchStudentInventory, id]);
```

And derive `inventoryTx` from the map:

```typescript
const inventoryTx = useMemo(() => (id ? (inventoryTxMap[id] ?? []) : []), [inventoryTxMap, id]);
```

- [ ] **Step 2: Add the import for StudentStatement**

At the top of `StudentDetail.tsx`, add after the last import:

```typescript
import StudentStatement from '@/components/student/StudentStatement';
```

- [ ] **Step 3: Add the tab trigger**

Find the `<TabsList>` block (around line 478). Add the new trigger after "السجل المالي للسنوات":

```tsx
<TabsTrigger value="statement">كشف الحساب</TabsTrigger>
```

- [ ] **Step 4: Add the tab content**

After the closing `</TabsContent>` of the "history" tab (after line ~635), add:

```tsx
<TabsContent value="statement" className="space-y-4">
  <StudentStatement
    student={student}
    payments={studentPayments}
    installmentPlan={studentInstallments[0] ?? null}
    inventoryTx={inventoryTx}
  />
</TabsContent>
```

- [ ] **Step 5: Verify build passes**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npm run build
```

Expected: `✓ built in` — no errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/StudentDetail.tsx
git commit -m "feat: add كشف الحساب tab to StudentDetail"
```

---

### Task 4: Server — accept status in promote endpoint

**Files:**
- Modify: `server/src/index.ts` (around line 174)

- [ ] **Step 1: Add status to destructuring in promote endpoint**

Find the promote endpoint `POST /api/students/:id/promote` (line ~174). The current destructuring is:

```typescript
const {
  stage, grade, academicYear,
  tuitionFees, booksFees, uniformFees, busFees, otherFees,
  arrearsFees, discountAmount, discountPercentage, totalFees,
} = req.body;
```

Change it to:

```typescript
const {
  stage, grade, academicYear,
  tuitionFees, booksFees, uniformFees, busFees, otherFees,
  arrearsFees, discountAmount, discountPercentage, totalFees,
  status,
} = req.body;
```

- [ ] **Step 2: Pass status to prisma.student.update**

In the `data` object of `prisma.student.update`, add `status` after `paidAmount: 0`:

```typescript
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
```

- [ ] **Step 3: Verify build passes**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npm run build
```

Expected: `✓ built in` — no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: accept status field in promote endpoint"
```

---

### Task 5: studentsStore — add status to promoteStudent payload

**Files:**
- Modify: `src/stores/studentsStore.ts`

- [ ] **Step 1: Add status to promoteStudent interface**

Find the `promoteStudent` method type definition (around line 17). Change:

```typescript
promoteStudent: (id: string, data: {
  toStage: Stage;
  toGrade: string;
  toAcademicYear: string;
  tuitionFees: number;
  booksFees: number;
  uniformFees: number;
  busFees: number;
  otherFees: number;
  arrearsFees: number;
  discountAmount: number;
  discountPercentage: number;
  totalFees: number;
}) => Promise<void>;
```

To:

```typescript
promoteStudent: (id: string, data: {
  toStage: Stage;
  toGrade: string;
  toAcademicYear: string;
  tuitionFees: number;
  booksFees: number;
  uniformFees: number;
  busFees: number;
  otherFees: number;
  arrearsFees: number;
  discountAmount: number;
  discountPercentage: number;
  totalFees: number;
  status: import('@/types').StudentStatus;
}) => Promise<void>;
```

- [ ] **Step 2: Add status to bulkPromoteStudents array item type**

Find `bulkPromoteStudents` definition (around line 31). Add `status: import('@/types').StudentStatus;` to the array item type in the same way.

- [ ] **Step 3: Pass status in the fetch body inside promoteStudent**

In the `promoteStudent` implementation (around line 113), the `body: JSON.stringify({...})` block needs `status: data.status`:

```typescript
body: JSON.stringify({
  stage: data.toStage,
  grade: data.toGrade,
  academicYear: data.toAcademicYear,
  tuitionFees: data.tuitionFees,
  booksFees: data.booksFees,
  uniformFees: data.uniformFees,
  busFees: data.busFees,
  otherFees: data.otherFees,
  arrearsFees: data.arrearsFees,
  discountAmount: data.discountAmount,
  discountPercentage: data.discountPercentage,
  totalFees: data.totalFees,
  status: data.status,
}),
```

- [ ] **Step 4: Verify build passes**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npm run build
```

Expected: TypeScript will now report errors in `StudentPromotion.tsx` because `status` is required but not yet passed — this is expected. We fix it in Task 6.

- [ ] **Step 5: Commit**

```bash
git add src/stores/studentsStore.ts
git commit -m "feat: add status field to promoteStudent store payload"
```

---

### Task 6: StudentPromotion — isFinalGrade helper + status selects

**Files:**
- Modify: `src/pages/StudentPromotion.tsx`

The final secondary grade is `'الصف الثالث الثانوي'` (last element of `gradeOptions['secondary']`).

- [ ] **Step 1: Add isFinalGrade helper**

After the `stageOrder` constant (around line 39), add:

```typescript
const FINAL_SECONDARY_GRADE = gradeOptions['secondary'][gradeOptions['secondary'].length - 1];

function isFinalGrade(stage: Stage, grade: string): boolean {
  return stage === 'secondary' && grade === FINAL_SECONDARY_GRADE;
}
```

- [ ] **Step 2: Add newStatus state to SinglePromotion**

Inside the `SinglePromotion` component, add state after the existing `useState` calls:

```typescript
const [newStatus, setNewStatus] = useState<'admitted' | 'graduated'>('admitted');
```

Also reset it when a student is selected — in `handleSelectStudent`, after `setSelected(s)`, add:

```typescript
setNewStatus('admitted');
```

- [ ] **Step 3: Add status select to SinglePromotion confirmation dialog**

In the confirmation dialog content (the `<DialogContent>` block for `confirmOpen`), after the fee breakdown table and before the warning text, add:

```tsx
{isFinalGrade(toStage, toGrade) && (
  <div className="space-y-2 pt-2">
    <Label className="font-semibold">الوضع بعد النقل</Label>
    <Select value={newStatus} onValueChange={v => setNewStatus(v as 'admitted' | 'graduated')}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admitted">لا زال طالباً (admitted)</SelectItem>
        <SelectItem value="graduated">تخرج (graduated)</SelectItem>
      </SelectContent>
    </Select>
  </div>
)}
```

- [ ] **Step 4: Pass status in handlePromote (SinglePromotion)**

In `handlePromote`, add `status: newStatus` to the `promoteStudent` call:

```typescript
await promoteStudent(selected.id, {
  toStage,
  toGrade,
  toAcademicYear,
  tuitionFees: matchedFee?.tuitionFees ?? selected.tuitionFees,
  booksFees: matchedFee?.booksFees ?? selected.booksFees,
  uniformFees: matchedFee?.uniformFees ?? selected.uniformFees,
  busFees: selected.busFees,
  otherFees: selected.otherFees,
  arrearsFees: promotionCalc.arrears,
  discountAmount: promotionCalc.badgeDiscount,
  discountPercentage: selected.badge?.discountPercentage ?? 0,
  totalFees: promotionCalc.totalFees,
  status: newStatus,
});
```

- [ ] **Step 5: Add statusMap state to BulkPromotion**

Inside the `BulkPromotion` component, add after existing state:

```typescript
const [statusMap, setStatusMap] = useState<Record<string, 'admitted' | 'graduated'>>({});
```

- [ ] **Step 6: Add status to buildPromotions in BulkPromotion**

In `buildPromotions`, add `status` to each promotion object:

```typescript
const buildPromotions = () => {
  return Array.from(selected).map(id => {
    const student = students.find(s => s.id === id)!;
    const ns = nextStageGrade ?? { stage: fromStage, grade: fromGrade };
    const fee = stageFees.find(f =>
      f.stage === ns.stage &&
      f.grade === ns.grade &&
      f.track === student.track &&
      f.academicYear === toAcademicYear
    );
    const { arrears, badgeDiscount, totalFees } = calcPromoFees(student, fee);
    return {
      studentId: id,
      toStage: ns.stage,
      toGrade: ns.grade,
      toAcademicYear,
      tuitionFees: fee?.tuitionFees ?? student.tuitionFees,
      booksFees: fee?.booksFees ?? student.booksFees,
      uniformFees: fee?.uniformFees ?? student.uniformFees,
      busFees: student.busFees,
      otherFees: student.otherFees,
      arrearsFees: arrears,
      discountAmount: badgeDiscount,
      discountPercentage: student.badge?.discountPercentage ?? 0,
      totalFees,
      status: (statusMap[id] ?? (isFinalGrade(ns.stage, ns.grade) ? 'admitted' : 'admitted')) as 'admitted' | 'graduated',
    };
  });
};
```

- [ ] **Step 7: Add status column to BulkPromotion confirmation dialog table**

In the confirmation dialog for bulk promotion, find the table header row and add a column:

```tsx
<th className="p-2 text-right font-semibold">الوضع</th>
```

And in the table body rows, add a cell that shows a Select only for final-grade students:

```tsx
<td className="p-2">
  {isFinalGrade(ns.stage, ns.grade) ? (
    <Select
      value={statusMap[p.studentId] ?? 'admitted'}
      onValueChange={v => setStatusMap(prev => ({ ...prev, [p.studentId]: v as 'admitted' | 'graduated' }))}
    >
      <SelectTrigger className="h-7 text-xs w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admitted">طالب</SelectItem>
        <SelectItem value="graduated">متخرج</SelectItem>
      </SelectContent>
    </Select>
  ) : (
    <span className="text-xs text-muted-foreground">طالب</span>
  )}
</td>
```

Note: `ns` and `p.studentId` — you need to look up each student's `ns` (next stage/grade) from `nextStageGrade` in the BulkPromotion context. Since `buildPromotions()` already returns the promotion objects, iterate over them in the confirmation table. The confirmation table should loop over `buildPromotions()` result (store it as a `const promotions = buildPromotions()` inside `handleBulkPromote` or as a `useMemo`).

To avoid calling `buildPromotions()` twice, extract it:

```typescript
const promotions = useMemo(buildPromotions, [selected, students, nextStageGrade, stageFees, toAcademicYear, statusMap]);
```

And use `promotions` in both the confirmation dialog table and `handleBulkPromote`:

```typescript
const handleBulkPromote = async () => {
  setLoading(true);
  try {
    const res = await bulkPromoteStudents(promotions);
    setResult(res);
    setSelected(new Set());
    setStatusMap({});
    setConfirmOpen(false);
    toast.success(`تم النقل الجماعي: ${res.succeeded} نجح، ${res.failed} فشل`);
  } catch {
    toast.error('حدث خطأ أثناء النقل الجماعي');
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 8: Verify build passes with no errors**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npm run build
```

Expected: `✓ built in` — no TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add src/pages/StudentPromotion.tsx
git commit -m "feat: add promotion status select (admitted/graduated) for final secondary grade"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| "كشف الحساب" tab in StudentDetail | Task 3 |
| Financial summary card | Task 2 (StudentStatement) |
| Student journey timeline with all event types | Task 2 |
| Timeline: enrollment, promotions, discount, installments, payments, inventory | Task 2 |
| Transactions table with filter | Task 2 |
| Print via window.print() | Task 2 |
| PDF via jsPDF + html2canvas | Task 1 + Task 2 |
| Fetch inventory from /api/students/:id/inventory | Task 1 + Task 3 |
| Auto status on promotion: admitted vs graduated | Tasks 4–6 |
| isFinalGrade = secondary + last grade | Task 6 |
| Status select in SinglePromotion dialog | Task 6 |
| Status per-student in BulkPromotion | Task 6 |
| Server accepts status field | Task 4 |
| Store passes status field | Task 5 |

All requirements covered. ✅

**Placeholder scan:** No TBD, no vague steps. All code blocks complete. ✅

**Type consistency:**
- `TimelineEvent.type` defined in Task 2 and only used in Task 2 ✅
- `status: 'admitted' | 'graduated'` consistent across Tasks 4, 5, 6 ✅
- `isFinalGrade(stage, grade)` defined in Task 6 Step 1, used in Steps 3 and 7 ✅
- `calcPromoFees` defined in previous work, reused in Task 6 Step 6 ✅
- `fetchStudentInventory` defined in Task 1, destructured in Task 3 ✅
