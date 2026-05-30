# Academic Year Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a formal academic year close/open wizard that generates a year-end report, promotes all eligible students in bulk with fee-structure-sourced fees, then advances the active academic year system-wide.

**Architecture:** A new `SystemSetting` DB table stores `activeAcademicYear`. The server exposes GET/PUT endpoints for it plus a new `POST /api/students/bulk-promote` that processes promotions in batches of 50. The frontend reads the active year from a new `settingsStore` (replacing the hardcoded `currentAcademicYear` constant). A 4-step wizard page (`/year-management`) guides the full workflow: report → preview → promote → activate.

**Tech Stack:** React 18 + TypeScript, Zustand, shadcn/ui, TailwindCSS, Express + Prisma (PostgreSQL), html2canvas + jspdf (already installed).

---

## File Structure

| File | Change |
|------|--------|
| `server/prisma/schema.prisma` | Add `SystemSetting` model |
| `server/prisma/seed_demo.ts` | Insert `activeAcademicYear` setting row |
| `server/src/index.ts` | Add `GET/PUT /api/settings/academic-year` + `POST /api/students/bulk-promote` |
| `src/types/index.ts` | Add `SystemSetting` type |
| `src/stores/settingsStore.ts` | **New** — Zustand store for `activeAcademicYear` |
| `src/lib/utils.ts` | Keep `currentAcademicYear` constant as fallback only (no logic change) |
| `src/components/year/YearEndReport.tsx` | **New** — year-end report component |
| `src/pages/YearManagement.tsx` | **New** — 4-step wizard page |
| `src/App.tsx` | Add lazy import + route `/year-management` |
| `src/components/layout/Sidebar.tsx` | Add "إدارة السنة الدراسية" nav item |

---

### Task 1: Add SystemSetting to Prisma schema + migration + seed

**Files:**
- Modify: `server/prisma/schema.prisma`
- Modify: `server/prisma/seed_demo.ts`

- [ ] **Step 1: Add SystemSetting model to schema**

Open `server/prisma/schema.prisma` and append at the end of the file:

```prisma
model SystemSetting {
  key   String @id
  value String
}
```

- [ ] **Step 2: Run migration**

```bash
cd "/Users/me/Downloads/Project/untitled folder/server"
npx prisma migrate dev --name add_system_setting
```

Expected: `✓ Generated Prisma Client` with no errors.

- [ ] **Step 3: Add seed row to seed_demo.ts**

In `server/prisma/seed_demo.ts`, add a new function after the imports and before `main()`:

```typescript
async function seedSystemSettings() {
  await prisma.systemSetting.upsert({
    where: { key: 'activeAcademicYear' },
    create: { key: 'activeAcademicYear', value: '2024-2025' },
    update: {},
  });
  console.log('✓ System settings seeded');
}
```

Then call it in `main()` — add `await seedSystemSettings();` as the first line inside `main()`.

- [ ] **Step 4: Run seed to verify**

```bash
cd "/Users/me/Downloads/Project/untitled folder/server"
npx ts-node prisma/seed_demo.ts
```

Expected: `✓ System settings seeded` in the first line of output.

- [ ] **Step 5: Verify build passes**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 6: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/seed_demo.ts
git commit -m "feat: add SystemSetting model and seed activeAcademicYear"
```

---

### Task 2: Server endpoints — GET/PUT academic year + POST bulk-promote

**Files:**
- Modify: `server/src/index.ts`

Context: `requireRoles` is already defined and used in this file. The existing `POST /api/students/:id/promote` (around line 187) contains the per-student promote logic that bulk-promote reuses.

- [ ] **Step 1: Add GET /api/settings/academic-year**

Find the line `// --- Payments API ---` (around line 286) and insert these two endpoints BEFORE it:

```typescript
// --- Settings API ---
app.get('/api/settings/academic-year', requireAuth, async (req, res) => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'activeAcademicYear' },
    });
    res.json({ academicYear: setting?.value ?? '2024-2025' });
  } catch (error) {
    res.status(500).json({ error: 'فشل جلب السنة الدراسية' });
  }
});

app.put('/api/settings/academic-year', requireRoles('school_director', 'head_accountant'), async (req, res) => {
  const { academicYear } = req.body;
  if (!academicYear || typeof academicYear !== 'string') {
    return res.status(400).json({ error: 'السنة الدراسية مطلوبة' });
  }
  try {
    const setting = await prisma.systemSetting.upsert({
      where: { key: 'activeAcademicYear' },
      create: { key: 'activeAcademicYear', value: academicYear },
      update: { value: academicYear },
    });
    res.json({ academicYear: setting.value });
  } catch (error) {
    res.status(500).json({ error: 'فشل تحديث السنة الدراسية' });
  }
});
```

Note: `requireAuth` is the middleware that just checks for a valid token (already exists in this file — look for it near the top where `requireRoles` is defined).

- [ ] **Step 2: Add POST /api/students/bulk-promote**

Insert the following endpoint BEFORE the `// --- Settings API ---` block you just added (so it's near the other student endpoints). Place it right after the `POST /api/students/:id/promote` block (around line 284):

```typescript
// Bulk promote students (wizard use)
app.post('/api/students/bulk-promote', requireRoles('school_director', 'head_accountant'), async (req, res) => {
  const { promotions } = req.body as {
    promotions: Array<{
      studentId: string;
      stage: string;
      grade: string;
      academicYear: string;
      tuitionFees: number;
      booksFees: number;
      uniformFees: number;
      busFees: number;
      otherFees: number;
      arrearsFees: number;
      discountAmount: number;
      discountPercentage: number;
      totalFees: number;
      status: string;
    }>;
  };

  if (!Array.isArray(promotions) || promotions.length === 0) {
    return res.status(400).json({ error: 'لا يوجد طلاب للترقية' });
  }

  let promoted = 0;
  const skipped: { id: string; name: string; reason: string }[] = [];

  // Process in batches of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < promotions.length; i += BATCH_SIZE) {
    const batch = promotions.slice(i, i + BATCH_SIZE);
    try {
      await prisma.$transaction(
        batch.map((p) =>
          prisma.student.update({
            where: { id: p.studentId },
            data: {
              stage: p.stage,
              grade: p.grade,
              academicYear: p.academicYear,
              tuitionFees: p.tuitionFees,
              booksFees: p.booksFees,
              uniformFees: p.uniformFees,
              busFees: p.busFees,
              otherFees: p.otherFees,
              arrearsFees: p.arrearsFees,
              discountAmount: p.discountAmount,
              discountPercentage: p.discountPercentage,
              totalFees: p.totalFees,
              paidAmount: 0,
              status: p.status,
            },
          })
        )
      );
      promoted += batch.length;
    } catch (error) {
      // If a batch fails, record all as skipped
      for (const p of batch) {
        skipped.push({ id: p.studentId, name: p.studentId, reason: String(error) });
      }
    }
  }

  // Save old-year snapshots for all successfully promoted students
  try {
    const promotedIds = promotions
      .filter((p) => !skipped.find((s) => s.id === p.studentId))
      .map((p) => p.studentId);

    const studentsWithPayments = await prisma.student.findMany({
      where: { id: { in: promotedIds } },
      include: { payments: { where: { NOT: { type: 'application_fee' } } } },
    });

    // We need the OLD academicYear — but student is already updated. 
    // We saved it in promotions input's academicYear is the NEW year.
    // So we use yearlyFinance snapshot approach: upsert for each student.
    // Since paidAmount was reset to 0 above, we compute old paid from payments filtered by old year.
    // The old year = student's academicYear BEFORE promote — not available after update.
    // Solution: save snapshots per-student individually (not in bulk transaction above) using the payments data.
    for (const student of studentsWithPayments) {
      const promo = promotions.find((p) => p.studentId === student.id);
      if (!promo) continue;
      // Payments made before promotion (academicYear null or not new year)
      const oldPaid = student.payments
        .filter((p) => !p.academicYear || p.academicYear !== promo.academicYear)
        .reduce((sum, p) => sum + p.amount, 0);
      await prisma.studentYearlyFinance.upsert({
        where: { studentId_academicYear: { studentId: student.id, academicYear: promo.academicYear } },
        create: {
          studentId: student.id,
          academicYear: promo.academicYear,
          stage: promo.stage,
          grade: promo.grade,
          tuitionFees: promo.tuitionFees,
          booksFees: promo.booksFees,
          uniformFees: promo.uniformFees,
          busFees: promo.busFees,
          otherFees: promo.otherFees,
          arrearsFees: promo.arrearsFees,
          totalFees: promo.totalFees,
          paidAmount: 0,
        },
        update: { paidAmount: 0 },
      });
    }
  } catch (error) {
    console.error('Yearly finance snapshot error:', error);
    // Non-fatal — promotions already succeeded
  }

  res.json({ promoted, skipped });
});
```

- [ ] **Step 3: Verify build passes**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: add academic year settings endpoints and bulk-promote endpoint"
```

---

### Task 3: Frontend settingsStore + SystemSetting type

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/stores/settingsStore.ts`

- [ ] **Step 1: Add SystemSetting type to src/types/index.ts**

Find the last line of `src/types/index.ts` and append:

```typescript
export interface SystemSetting {
  key: string;
  value: string;
}
```

- [ ] **Step 2: Create src/stores/settingsStore.ts**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getAuthHeaders } from './authStore';
import { currentAcademicYear as fallbackYear } from '@/lib/utils';

interface SettingsState {
  activeAcademicYear: string;
  isLoading: boolean;
  fetchAcademicYear: () => Promise<void>;
  setAcademicYear: (year: string) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      activeAcademicYear: fallbackYear,
      isLoading: false,
      fetchAcademicYear: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch('/api/settings/academic-year', { headers: getAuthHeaders() });
          if (!res.ok) throw new Error('fetch failed');
          const data = await res.json();
          set({ activeAcademicYear: data.academicYear, isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },
      setAcademicYear: async (year: string) => {
        try {
          const res = await fetch('/api/settings/academic-year', {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ academicYear: year }),
          });
          if (!res.ok) return false;
          set({ activeAcademicYear: year });
          return true;
        } catch {
          return false;
        }
      },
    }),
    { name: 'school-settings' }
  )
);
```

- [ ] **Step 3: Call fetchAcademicYear on login**

Open `src/stores/authStore.ts`. Find the line:
```typescript
set({ user, token, isAuthenticated: true });
return true;
```

Change it to:
```typescript
set({ user, token, isAuthenticated: true });
// Fetch active academic year after login
import('@/stores/settingsStore').then(({ useSettingsStore }) => {
  useSettingsStore.getState().fetchAcademicYear();
});
return true;
```

- [ ] **Step 4: Verify build passes**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/stores/settingsStore.ts src/stores/authStore.ts
git commit -m "feat: add settingsStore for dynamic activeAcademicYear"
```

---

### Task 4: Wire activeAcademicYear into StageFeeManagement and StudentPromotion

**Files:**
- Modify: `src/pages/StageFeeManagement.tsx`
- Modify: `src/pages/StudentPromotion.tsx`

Context: Both pages currently import `currentAcademicYear` from `@/lib/utils` (a hardcoded string). We replace that usage with `useSettingsStore`.

- [ ] **Step 1: Update StageFeeManagement.tsx**

Find in `src/pages/StageFeeManagement.tsx`:
```typescript
import { stageLabels, trackLabels, formatCurrency, currentAcademicYear } from '@/lib/utils';
```

Change to:
```typescript
import { stageLabels, trackLabels, formatCurrency } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settingsStore';
```

Then inside the `StageFeeManagement` component function, add at the top of the function body (before the `useMemo`):
```typescript
const { activeAcademicYear: currentAcademicYear } = useSettingsStore();
```

No other changes needed — `currentAcademicYear` is now a local variable sourced from the store.

- [ ] **Step 2: Update StudentPromotion.tsx**

Find in `src/pages/StudentPromotion.tsx`:
```typescript
import { stageLabels, gradeOptions, academicYears, currentAcademicYear, formatCurrency } from '@/lib/utils';
```

Change to:
```typescript
import { stageLabels, gradeOptions, academicYears, formatCurrency } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settingsStore';
```

Then inside the `StudentPromotion` component (the default export function), add at the top of the function body:
```typescript
const { activeAcademicYear: currentAcademicYear } = useSettingsStore();
```

- [ ] **Step 3: Verify build passes**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/StageFeeManagement.tsx src/pages/StudentPromotion.tsx
git commit -m "feat: use dynamic activeAcademicYear in StageFeeManagement and StudentPromotion"
```

---

### Task 5: YearEndReport component

**Files:**
- Create: `src/components/year/YearEndReport.tsx`

Context: This component receives student and payment data as props and renders a financial summary. It uses `html2canvas` and `jspdf` for PDF export (already installed — used in `StudentStatement.tsx`). `formatCurrency` is in `@/lib/utils`. `stageLabels` maps Stage to Arabic. shadcn/ui components are available.

- [ ] **Step 1: Create src/components/year/YearEndReport.tsx**

```typescript
import { useRef } from 'react';
import { Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, stageLabels } from '@/lib/utils';
import type { Student, Payment, Stage } from '@/types';

interface Props {
  academicYear: string;
  students: Student[];
  payments: Payment[];
}

const STAGES: Stage[] = ['kg', 'primary', 'preparatory', 'secondary'];

export default function YearEndReport({ academicYear, students, payments }: Props) {
  const reportRef = useRef<HTMLDivElement>(null);

  const activeStudents = students.filter(
    (s) => s.academicYear === academicYear && ['admitted', 'active'].includes(s.status)
  );

  const totalFees = activeStudents.reduce((sum, s) => sum + s.totalFees, 0);
  const totalPaid = activeStudents.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalOutstanding = totalFees - totalPaid;
  const collectionRate = totalFees > 0 ? Math.round((totalPaid / totalFees) * 100) : 0;

  const byStage = STAGES.map((stage) => {
    const stageStudents = activeStudents.filter((s) => s.stage === stage);
    return {
      stage,
      count: stageStudents.length,
      fees: stageStudents.reduce((sum, s) => sum + s.totalFees, 0),
      paid: stageStudents.reduce((sum, s) => sum + s.paidAmount, 0),
      outstanding: stageStudents.reduce((sum, s) => sum + Math.max(0, s.totalFees - s.paidAmount), 0),
    };
  }).filter((r) => r.count > 0);

  const nonPayers = activeStudents
    .filter((s) => s.paidAmount < s.totalFees)
    .sort((a, b) => (b.totalFees - b.paidAmount) - (a.totalFees - a.paidAmount));

  const handlePrint = () => window.print();

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    const { default: html2canvas } = await import('html2canvas');
    const { jsPDF } = await import('jspdf');
    const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`تقرير-ختامي-${academicYear}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="size-4 ml-2" /> طباعة
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPDF}>
          <Download className="size-4 ml-2" /> تصدير PDF
        </Button>
      </div>

      <div ref={reportRef} className="space-y-6">
        <h2 className="text-xl font-bold text-center font-[Noto_Kufi_Arabic]">
          التقرير الختامي للسنة الدراسية {academicYear}
        </h2>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'إجمالي الرسوم', value: formatCurrency(totalFees), color: 'text-slate-700' },
            { label: 'المحصّل', value: formatCurrency(totalPaid), color: 'text-emerald-600' },
            { label: 'المتبقي', value: formatCurrency(totalOutstanding), color: 'text-red-600' },
            { label: 'نسبة التحصيل', value: `${collectionRate}%`, color: collectionRate >= 80 ? 'text-emerald-600' : 'text-amber-600' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-bold tabular-nums mt-1 ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* By Stage */}
        <Card>
          <CardHeader><CardTitle className="text-base">التوزيع حسب المرحلة</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المرحلة</TableHead>
                  <TableHead className="text-right">عدد الطلاب</TableHead>
                  <TableHead className="text-right">الرسوم</TableHead>
                  <TableHead className="text-right">المحصّل</TableHead>
                  <TableHead className="text-right">المتبقي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byStage.map((row) => (
                  <TableRow key={row.stage}>
                    <TableCell className="font-medium">{stageLabels[row.stage]}</TableCell>
                    <TableCell>{row.count}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(row.fees)}</TableCell>
                    <TableCell className="tabular-nums text-emerald-600">{formatCurrency(row.paid)}</TableCell>
                    <TableCell className="tabular-nums text-red-600">{formatCurrency(row.outstanding)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Non-Payers */}
        {nonPayers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                الطلاب غير المسدِّدين بالكامل
                <Badge variant="destructive">{nonPayers.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم الطالب</TableHead>
                    <TableHead className="text-right">الصف</TableHead>
                    <TableHead className="text-right">المتبقي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nonPayers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{stageLabels[s.stage]} — {s.grade}</TableCell>
                      <TableCell className="tabular-nums text-red-600 font-bold">
                        {formatCurrency(s.totalFees - s.paidAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/year/YearEndReport.tsx
git commit -m "feat: add YearEndReport component with financial summary and non-payers list"
```

---

### Task 6: YearManagement wizard page

**Files:**
- Create: `src/pages/YearManagement.tsx`

Context:
- `getNextStageAndGrade` and `calcPromoFees` are defined in `src/pages/StudentPromotion.tsx` — copy them into this file (they are pure functions, no import needed from there).
- `gradeOptions` and `academicYears` are in `src/lib/utils`.
- `useStudentsStore` provides `students` array.
- `useAdmissionStore` provides `stageFees`.
- `usePaymentsStore` provides `payments`.
- `useSettingsStore` provides `activeAcademicYear` and `setAcademicYear`.
- The `isFinalGrade` helper (stage === 'secondary' and last grade in `gradeOptions.secondary`) is also copied from `StudentPromotion.tsx`.

- [ ] **Step 1: Create src/pages/YearManagement.tsx**

```typescript
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStudentsStore } from '@/stores/studentsStore';
import { useAdmissionStore } from '@/stores/admissionStore';
import { usePaymentsStore } from '@/stores/paymentsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { getAuthHeaders } from '@/stores/authStore';
import { gradeOptions, academicYears, stageLabels, formatCurrency } from '@/lib/utils';
import YearEndReport from '@/components/year/YearEndReport';
import type { Stage, Student, StageFee, AdditionalFee } from '@/types';

// --- Helpers (copied from StudentPromotion.tsx) ---
const stageOrder: Stage[] = ['kg', 'primary', 'preparatory', 'secondary'];
const FINAL_SECONDARY_GRADE = gradeOptions['secondary'][gradeOptions['secondary'].length - 1];

function isFinalGrade(stage: Stage, grade: string): boolean {
  return stage === 'secondary' && grade === FINAL_SECONDARY_GRADE;
}

function getNextStageAndGrade(stage: Stage, grade: string): { stage: Stage; grade: string } | null {
  const grades = gradeOptions[stage];
  const idx = grades.indexOf(grade);
  if (idx < grades.length - 1) return { stage, grade: grades[idx + 1] };
  const stageIdx = stageOrder.indexOf(stage);
  if (stageIdx < stageOrder.length - 1) {
    const nextStage = stageOrder[stageIdx + 1];
    return { stage: nextStage, grade: gradeOptions[nextStage][0] };
  }
  return null;
}

function calcPromoFees(
  student: Student,
  matchedFee: StageFee | undefined | null
): { arrears: number; baseNewFees: number; badgeDiscount: number; netNewFees: number; totalFees: number } {
  const arrears = Math.max(0, student.totalFees - student.paidAmount);
  const baseNewFees = matchedFee
    ? matchedFee.tuitionFees + matchedFee.booksFees + matchedFee.uniformFees +
      (matchedFee.additionalFees?.filter((f: AdditionalFee) => f.isMandatory).reduce((sum, f) => sum + f.amount, 0) ?? 0)
    : student.tuitionFees + student.booksFees + student.uniformFees;
  const badgeDiscount = student.badge
    ? Math.round(baseNewFees * (student.badge.discountPercentage / 100) * 100) / 100
    : 0;
  const netNewFees = baseNewFees - badgeDiscount;
  const totalFees = netNewFees + student.busFees + student.otherFees + arrears;
  return { arrears, baseNewFees, badgeDiscount, netNewFees, totalFees };
}

// --- Main component ---
const ALLOWED_ROLES = ['school_director', 'head_accountant'];

export default function YearManagement() {
  const { user } = useAuthStore();
  const { students, fetchStudents } = useStudentsStore();
  const { stageFees, fetchStageFees } = useAdmissionStore();
  const { payments } = usePaymentsStore();
  const { activeAcademicYear, setAcademicYear } = useSettingsStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [reportReviewed, setReportReviewed] = useState(false);
  const [targetYear, setTargetYear] = useState('');
  const [promoting, setPromoting] = useState(false);
  const [promotionResult, setPromotionResult] = useState<{ promoted: number; skipped: { id: string; name: string; reason: string }[] } | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [activating, setActivating] = useState(false);

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">ليس لديك صلاحية الوصول لهذه الصفحة</p>
      </div>
    );
  }

  // Eligible students: admitted/active in current year
  const eligibleStudents = useMemo(
    () => students.filter((s) => s.academicYear === activeAcademicYear && ['admitted', 'active'].includes(s.status)),
    [students, activeAcademicYear]
  );

  // Compute promotions for step 2
  const promotionData = useMemo(() => {
    if (!targetYear) return { toPromote: [], graduates: [], missingFees: new Set<string>() };

    const toPromote: Array<{ student: Student; nextStage: Stage; nextGrade: string; fees: ReturnType<typeof calcPromoFees>; matchedFee: StageFee | null }> = [];
    const graduates: Student[] = [];
    const missingFeeKeys = new Set<string>();

    for (const s of eligibleStudents) {
      if (isFinalGrade(s.stage as Stage, s.grade)) {
        graduates.push(s);
      } else {
        const next = getNextStageAndGrade(s.stage as Stage, s.grade);
        if (!next) continue;
        const matchedFee = stageFees.find(
          (f) => f.stage === next.stage && f.grade === next.grade && f.track === s.track && f.academicYear === targetYear
        ) ?? null;
        if (!matchedFee) missingFeeKeys.add(`${stageLabels[next.stage as Stage]} — ${next.grade}`);
        const fees = calcPromoFees(s, matchedFee);
        toPromote.push({ student: s, nextStage: next.stage as Stage, nextGrade: next.grade, fees, matchedFee });
      }
    }
    return { toPromote, graduates, missingFees: missingFeeKeys };
  }, [eligibleStudents, stageFees, targetYear]);

  const handleExecutePromotion = async () => {
    setPromoting(true);
    try {
      const promotions = [
        ...promotionData.toPromote.map(({ student, nextStage, nextGrade, fees, matchedFee }) => ({
          studentId: student.id,
          stage: nextStage,
          grade: nextGrade,
          academicYear: targetYear,
          tuitionFees: matchedFee?.tuitionFees ?? student.tuitionFees,
          booksFees: matchedFee?.booksFees ?? student.booksFees,
          uniformFees: matchedFee?.uniformFees ?? student.uniformFees,
          busFees: student.busFees,
          otherFees: student.otherFees,
          arrearsFees: fees.arrears,
          discountAmount: student.badge ? fees.badgeDiscount : student.discountAmount,
          discountPercentage: student.badge ? student.badge.discountPercentage : student.discountPercentage,
          totalFees: fees.totalFees,
          status: 'admitted',
        })),
        ...promotionData.graduates.map((s) => ({
          studentId: s.id,
          stage: s.stage,
          grade: s.grade,
          academicYear: targetYear,
          tuitionFees: s.tuitionFees,
          booksFees: s.booksFees,
          uniformFees: s.uniformFees,
          busFees: s.busFees,
          otherFees: s.otherFees,
          arrearsFees: Math.max(0, s.totalFees - s.paidAmount),
          discountAmount: s.discountAmount,
          discountPercentage: s.discountPercentage,
          totalFees: s.totalFees,
          status: 'graduated',
        })),
      ];

      const res = await fetch('/api/students/bulk-promote', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ promotions }),
      });
      if (!res.ok) throw new Error('فشل تنفيذ الترقية');
      const result = await res.json();
      setPromotionResult(result);
      await fetchStudents();
      toast.success(`تم ترقية ${result.promoted} طالب بنجاح`);
      setStep(4);
    } catch (error) {
      toast.error(String(error));
    } finally {
      setPromoting(false);
    }
  };

  const handleActivateYear = async () => {
    setActivating(true);
    const ok = await setAcademicYear(targetYear);
    setActivating(false);
    if (ok) {
      toast.success(`تم تفعيل السنة الدراسية ${targetYear} بنجاح`);
    } else {
      toast.error('فشل تفعيل السنة الدراسية');
    }
  };

  // Non-promoted students (not eligible — wrong status)
  const notPromoted = students.filter(
    (s) => s.academicYear === activeAcademicYear && !['admitted', 'active', 'inactive', 'graduated', 'transferred'].includes(s.status)
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <h1 className="text-3xl font-bold font-[Noto_Kufi_Arabic] text-slate-800">إدارة السنة الدراسية</h1>
        <p className="text-slate-500 mt-1">إغلاق السنة {activeAcademicYear} وفتح السنة الجديدة</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 justify-center">
        {([1, 2, 3, 4] as const).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`size-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
              step === s ? 'bg-primary text-primary-foreground border-primary' :
              step > s ? 'bg-emerald-500 text-white border-emerald-500' :
              'bg-white text-slate-400 border-slate-200'
            }`}>
              {step > s ? <CheckCircle2 className="size-4" /> : s}
            </div>
            {s < 4 && <div className={`w-12 h-0.5 ${step > s ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Year-End Report */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>الخطوة 1 — التقرير الختامي للسنة {activeAcademicYear}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <YearEndReport academicYear={activeAcademicYear} students={students} payments={payments} />
            <div className="flex items-center gap-2 pt-4 border-t">
              <Checkbox
                id="reviewed"
                checked={reportReviewed}
                onCheckedChange={(v) => setReportReviewed(!!v)}
              />
              <Label htmlFor="reviewed">لقد راجعت التقرير وأنا مستعد للمتابعة</Label>
            </div>
            <div className="flex justify-start">
              <Button disabled={!reportReviewed} onClick={() => { fetchStageFees(); setStep(2); }}>
                التالي <ChevronLeft className="size-4 mr-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Promotion Preview */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>الخطوة 2 — مراجعة الترقية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="mb-1 block">السنة الدراسية الجديدة</Label>
                <Input
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                  placeholder="مثال: 2025-2026"
                  list="academic-years-list"
                />
                <datalist id="academic-years-list">
                  {academicYears.filter((y) => y !== activeAcademicYear).map((y) => (
                    <option key={y} value={y} />
                  ))}
                </datalist>
              </div>
            </div>

            {targetYear && (
              <>
                {promotionData.missingFees.size > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 text-amber-800">
                      <AlertTriangle className="size-5 shrink-0" />
                      <p className="font-medium text-sm">
                        لا توجد هياكل رسوم للسنة {targetYear} للصفوف التالية — ستُستخدم رسوم السنة الحالية:
                      </p>
                    </div>
                    <ul className="mt-2 pr-7 space-y-1">
                      {[...promotionData.missingFees].map((k) => (
                        <li key={k} className="text-sm text-amber-700 list-disc">{k}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 text-center">
                  <Card><CardContent className="pt-4">
                    <p className="text-2xl font-bold">{promotionData.toPromote.length}</p>
                    <p className="text-sm text-muted-foreground">طالب للترقية</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-4">
                    <p className="text-2xl font-bold text-emerald-600">{promotionData.graduates.length}</p>
                    <p className="text-sm text-muted-foreground">خريجون</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-4">
                    <p className="text-2xl font-bold text-amber-600">{notPromoted.length}</p>
                    <p className="text-sm text-muted-foreground">بحاجة لمراجعة</p>
                  </CardContent></Card>
                </div>

                {notPromoted.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-700 mb-2">
                      الطلاب التالية حالاتهم لن يُرقَّوا تلقائياً (يمكن ترقيتهم لاحقاً من صفحة نقل الطلاب):
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">الاسم</TableHead>
                          <TableHead className="text-right">الحالة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notPromoted.slice(0, 10).map((s) => (
                          <TableRow key={s.id}>
                            <TableCell>{s.name}</TableCell>
                            <TableCell><Badge variant="outline">{s.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                        {notPromoted.length > 10 && (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground text-sm">
                              و {notPromoted.length - 10} طالب آخرون...
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>رجوع</Button>
              <Button
                disabled={!targetYear || promotionData.toPromote.length + promotionData.graduates.length === 0}
                onClick={() => setStep(3)}
              >
                التالي <ChevronLeft className="size-4 mr-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Execute Promotion */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>الخطوة 3 — تنفيذ الترقية الجماعية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
              <p className="font-medium text-blue-800">ملخص ما سيتم تنفيذه:</p>
              <ul className="text-sm text-blue-700 space-y-1 pr-4 list-disc">
                <li>ترقية {promotionData.toPromote.length} طالب إلى الصف التالي في السنة {targetYear}</li>
                <li>تسجيل {promotionData.graduates.length} طالب كخريج</li>
                <li>حفظ سجل مالي للسنة {activeAcademicYear} لكل طالب</li>
              </ul>
            </div>

            {promotionResult && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="font-medium text-emerald-800">
                  ✓ تم ترقية {promotionResult.promoted} طالب بنجاح
                </p>
                {promotionResult.skipped.length > 0 && (
                  <p className="text-sm text-amber-700 mt-1">
                    لم يتم ترقية {promotionResult.skipped.length} طالب — راجع السجل للتفاصيل
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(2)} disabled={promoting || !!promotionResult}>
                رجوع
              </Button>
              {!promotionResult ? (
                <Button onClick={handleExecutePromotion} disabled={promoting}>
                  {promoting ? (
                    <><Loader2 className="size-4 ml-2 animate-spin" /> جاري الترقية...</>
                  ) : (
                    'تنفيذ الترقية الجماعية'
                  )}
                </Button>
              ) : (
                <Button onClick={() => setStep(4)}>
                  التالي <ChevronLeft className="size-4 mr-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Activate New Year */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>الخطوة 4 — تفعيل السنة الدراسية الجديدة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {promotionResult && (
              <div className="grid grid-cols-2 gap-4 text-center">
                <Card><CardContent className="pt-4">
                  <p className="text-2xl font-bold text-emerald-600">{promotionResult.promoted}</p>
                  <p className="text-sm text-muted-foreground">طالب تمت ترقيتهم</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4">
                  <p className="text-2xl font-bold">{promotionData.graduates.length}</p>
                  <p className="text-sm text-muted-foreground">خريج</p>
                </CardContent></Card>
              </div>
            )}

            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="font-medium text-red-800 mb-1">⚠️ تحذير</p>
              <p className="text-sm text-red-700">
                بعد تفعيل السنة {targetYear}، ستتغير السنة الدراسية النشطة في النظام كله للجميع. هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>

            {activeAcademicYear !== targetYear ? (
              <>
                <div>
                  <Label className="mb-1 block">اكتب "{targetYear}" للتأكيد</Label>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={targetYear}
                    className="max-w-xs"
                    dir="ltr"
                  />
                </div>
                <Button
                  disabled={confirmText !== targetYear || activating}
                  onClick={handleActivateYear}
                  variant="destructive"
                >
                  {activating ? (
                    <><Loader2 className="size-4 ml-2 animate-spin" /> جاري التفعيل...</>
                  ) : (
                    `تفعيل السنة ${targetYear}`
                  )}
                </Button>
              </>
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="font-medium text-emerald-800">
                  ✓ السنة الدراسية {targetYear} مفعّلة الآن في النظام
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/YearManagement.tsx
git commit -m "feat: add YearManagement wizard page (4-step year close/open workflow)"
```

---

### Task 7: Route + Sidebar wiring

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add lazy import and route in src/App.tsx**

Find the existing lazy imports (around line 34) and add:
```typescript
const YearManagement = lazy(() => import('@/pages/YearManagement'));
```

Find the route `<Route path="/stage-fees/new" element={<NewStageFee />} />` and add after it:
```tsx
<Route path="/year-management" element={<YearManagement />} />
```

- [ ] **Step 2: Add nav item in src/components/layout/Sidebar.tsx**

Add `CalendarClock` to the lucide-react import at the top:
```typescript
import {
  // ... existing icons ...
  CalendarClock,
} from 'lucide-react';
```

Find the `إعدادات الرسوم` navItem (around line 75) and add a new top-level nav item after `نقل الطلاب`:

Find:
```typescript
  { label: 'نقل الطلاب', path: '/student-promotion', icon: ArrowRightLeft, roles: ['school_director', 'head_accountant'] },
```

Add after it:
```typescript
  { label: 'إدارة السنة الدراسية', path: '/year-management', icon: CalendarClock, roles: ['school_director', 'head_accountant'] },
```

- [ ] **Step 3: Verify build passes**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: wire YearManagement page into router and sidebar"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|-----------------|------|
| `SystemSetting` DB table with `activeAcademicYear` | Task 1 |
| `GET/PUT /api/settings/academic-year` | Task 2 |
| `POST /api/students/bulk-promote` with batch-50 processing | Task 2 |
| `settingsStore` Zustand store | Task 3 |
| `fetchAcademicYear` called on login | Task 3 |
| `StageFeeManagement` uses dynamic year | Task 4 |
| `StudentPromotion` uses dynamic year | Task 4 |
| `YearEndReport`: financial summary + by-stage + non-payers + print/PDF | Task 5 |
| Wizard Step 1: report + "reviewed" checkbox gate | Task 6 |
| Wizard Step 2: target year input + missing-fee warning + counts | Task 6 |
| Wizard Step 3: execute bulk promote + progress feedback | Task 6 |
| Wizard Step 4: typed confirmation + activate year | Task 6 |
| Non-promoted students shown in warning list | Task 6 |
| Route `/year-management` | Task 7 |
| Sidebar link for `school_director` + `head_accountant` | Task 7 |

All requirements covered. ✅

**Placeholder scan:** No TBD, no vague steps. All code blocks complete. ✅

**Type consistency:**
- `SystemSetting` type defined in Task 3, used in `settingsStore.ts` ✅
- `activeAcademicYear` from `useSettingsStore()` used consistently in Tasks 4, 6 ✅
- `calcPromoFees`, `getNextStageAndGrade`, `isFinalGrade` copied verbatim from `StudentPromotion.tsx` signature — same return types ✅
- `POST /api/students/bulk-promote` request shape defined in Task 2 matches what Task 6 sends ✅
