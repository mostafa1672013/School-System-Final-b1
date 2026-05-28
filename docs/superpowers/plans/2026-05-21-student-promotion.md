# Student Promotion (نقل الطالب) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** تنفيذ نظام نقل الطالب من مرحلة/صف إلى مرحلة/صف آخر، مع دعم النقل الفردي واليدوي والنقل الجماعي في بداية العام الدراسي، وتطبيق رسوم المرحلة الجديدة تلقائياً، مع تقييد الصلاحية على school_director و head_accountant.

**Architecture:** صفحة `/student-promotion` جديدة تحتوي على تبويبين: النقل الفردي (single) والنقل الجماعي (bulk). عند النقل، يُحدَّث `stage`، `grade`، `academicYear`، والرسوم الدراسية على الطالب استناداً إلى `StageFee` المطابق للمرحلة/الصف/المسار/السنة الجديدة. يُضاف `promoteStudent` و `bulkPromoteStudents` إلى `studentsStore`.

**Tech Stack:** React 18 + TypeScript, Zustand, TailwindCSS, shadcn/ui, Vite, React Router v6, Sonner (toasts)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types/index.ts` | Modify | إضافة `PromotionRecord` type |
| `src/stores/studentsStore.ts` | Modify | إضافة `promoteStudent` و `bulkPromoteStudents` |
| `src/pages/StudentPromotion.tsx` | Create | صفحة النقل بتبويبين |
| `src/components/layout/Sidebar.tsx` | Modify | إضافة رابط "نقل الطلاب" |
| `src/App.tsx` | Modify | إضافة route `/student-promotion` |

---

## Task 1: إضافة نوع PromotionRecord في types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: أضف النوع في نهاية الملف**

```typescript
export interface PromotionRecord {
  studentId: string;
  fromStage: Stage;
  fromGrade: string;
  fromAcademicYear: string;
  toStage: Stage;
  toGrade: string;
  toAcademicYear: string;
  promotedAt: string;
  promotedBy: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add PromotionRecord type"
```

---

## Task 2: إضافة promoteStudent و bulkPromoteStudents في studentsStore

**Files:**
- Modify: `src/stores/studentsStore.ts`

- [ ] **Step 1: أضف النوعين في interface `StudentsState`**

في `StudentsState` interface، أضف بعد `addPaymentToStudent`:

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
  totalFees: number;
}) => Promise<void>;
bulkPromoteStudents: (promotions: Array<{
  studentId: string;
  toStage: Stage;
  toGrade: string;
  toAcademicYear: string;
  tuitionFees: number;
  booksFees: number;
  uniformFees: number;
  busFees: number;
  otherFees: number;
  totalFees: number;
}>) => Promise<{ succeeded: number; failed: number }>;
```

- [ ] **Step 2: أضف التطبيق داخل `create(...)` بعد `addPaymentToStudent`**

```typescript
promoteStudent: async (id, data) => {
  const response = await fetch(`/api/students/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      stage: data.toStage,
      grade: data.toGrade,
      academicYear: data.toAcademicYear,
      tuitionFees: data.tuitionFees,
      booksFees: data.booksFees,
      uniformFees: data.uniformFees,
      busFees: data.busFees,
      otherFees: data.otherFees,
      totalFees: data.totalFees,
      paidAmount: 0,
    }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'فشل النقل');
  }
  const updated = await response.json();
  set((state) => ({
    students: state.students.map((s) => (s.id === id ? updated : s)),
  }));
},
bulkPromoteStudents: async (promotions) => {
  let succeeded = 0;
  let failed = 0;
  for (const p of promotions) {
    try {
      await get().promoteStudent(p.studentId, p);
      succeeded++;
    } catch {
      failed++;
    }
  }
  return { succeeded, failed };
},
```

- [ ] **Step 3: تأكد أن `import type { Student }` يتضمن `Stage` أيضاً**

في أعلى الملف:
```typescript
import type { Student, Stage } from '@/types';
```

- [ ] **Step 4: Commit**

```bash
git add src/stores/studentsStore.ts
git commit -m "feat: add promoteStudent and bulkPromoteStudents to studentsStore"
```

---

## Task 3: إنشاء صفحة StudentPromotion

**Files:**
- Create: `src/pages/StudentPromotion.tsx`

- [ ] **Step 1: أنشئ الملف بالكامل**

```tsx
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowRight, Users, GraduationCap, Search, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useStudentsStore } from '@/stores/studentsStore';
import { useAdmissionStore } from '@/stores/admissionStore';
import { useAuthStore } from '@/stores/authStore';
import { stageLabels, gradeOptions, academicYears, currentAcademicYear, formatCurrency } from '@/lib/utils';
import type { Stage, Student } from '@/types';

const ALLOWED_ROLES = ['school_director', 'head_accountant'];

const stageOrder: Stage[] = ['kg', 'primary', 'preparatory', 'secondary'];

function getNextStageAndGrade(stage: Stage, grade: string): { stage: Stage; grade: string } | null {
  const grades = gradeOptions[stage];
  const idx = grades.indexOf(grade);
  if (idx < grades.length - 1) {
    return { stage, grade: grades[idx + 1] };
  }
  const stageIdx = stageOrder.indexOf(stage);
  if (stageIdx < stageOrder.length - 1) {
    const nextStage = stageOrder[stageIdx + 1];
    return { stage: nextStage, grade: gradeOptions[nextStage][0] };
  }
  return null;
}

function getNextAcademicYear(year: string): string {
  const idx = academicYears.indexOf(year);
  if (idx !== -1 && idx < academicYears.length - 1) return academicYears[idx + 1];
  const [start] = year.split('-');
  const s = parseInt(start);
  return `${s + 1}-${s + 2}`;
}

export default function StudentPromotion() {
  const { students, fetchStudents, promoteStudent, bulkPromoteStudents } = useStudentsStore();
  const { stageFees, fetchStageFees } = useAdmissionStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchStudents();
    fetchStageFees();
  }, [fetchStudents, fetchStageFees]);

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 text-lg font-[Noto_Kufi_Arabic]">ليس لديك صلاحية للوصول لهذه الصفحة</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold font-[Noto_Kufi_Arabic] text-slate-800 tracking-tight">نقل الطلاب</h1>
          <p className="text-slate-500 mt-1">نقل الطلاب من مرحلة/صف إلى مرحلة/صف جديد مع تحديث الرسوم تلقائياً</p>
        </div>
      </div>

      <Tabs defaultValue="single" dir="rtl">
        <TabsList className="mb-4">
          <TabsTrigger value="single"><GraduationCap className="size-4 ml-2" />نقل فردي</TabsTrigger>
          <TabsTrigger value="bulk"><Users className="size-4 ml-2" />نقل جماعي</TabsTrigger>
        </TabsList>
        <TabsContent value="single">
          <SinglePromotion students={students} stageFees={stageFees} promoteStudent={promoteStudent} />
        </TabsContent>
        <TabsContent value="bulk">
          <BulkPromotion students={students} stageFees={stageFees} bulkPromoteStudents={bulkPromoteStudents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Single Promotion ────────────────────────────────────────────────────────

function SinglePromotion({ students, stageFees, promoteStudent }: {
  students: Student[];
  stageFees: any[];
  promoteStudent: any;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Student | null>(null);
  const [toStage, setToStage] = useState<Stage>('primary');
  const [toGrade, setToGrade] = useState('');
  const [toAcademicYear, setToAcademicYear] = useState(getNextAcademicYear(currentAcademicYear));
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const activeStudents = useMemo(() =>
    students.filter(s => s.status === 'active' || s.status === 'admitted'),
    [students]
  );

  const filtered = useMemo(() =>
    activeStudents.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.nationalId.includes(search)
    ).slice(0, 20),
    [activeStudents, search]
  );

  const matchedFee = useMemo(() => {
    if (!selected || !toGrade) return null;
    return stageFees.find(f =>
      f.stage === toStage &&
      f.grade === toGrade &&
      f.track === selected.track &&
      f.academicYear === toAcademicYear
    ) || null;
  }, [stageFees, selected, toStage, toGrade, toAcademicYear]);

  const handleSelectStudent = (s: Student) => {
    setSelected(s);
    const next = getNextStageAndGrade(s.stage, s.grade);
    if (next) {
      setToStage(next.stage);
      setToGrade(next.grade);
    } else {
      setToStage(s.stage);
      setToGrade(s.grade);
    }
    setToAcademicYear(getNextAcademicYear(s.academicYear));
    setSearch('');
  };

  const handlePromote = async () => {
    if (!selected || !toGrade) return;
    setLoading(true);
    try {
      await promoteStudent(selected.id, {
        toStage,
        toGrade,
        toAcademicYear,
        tuitionFees: matchedFee?.tuitionFees ?? selected.tuitionFees,
        booksFees: matchedFee?.booksFees ?? selected.booksFees,
        uniformFees: matchedFee?.uniformFees ?? selected.uniformFees,
        busFees: selected.busFees,
        otherFees: selected.otherFees,
        totalFees: matchedFee
          ? matchedFee.tuitionFees + matchedFee.booksFees + matchedFee.uniformFees + selected.busFees + selected.otherFees
          : selected.totalFees,
      });
      toast.success(`تم نقل ${selected.name} بنجاح إلى ${stageLabels[toStage]} - ${toGrade}`);
      setSelected(null);
      setConfirmOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'فشل النقل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-[Noto_Kufi_Arabic]">اختر الطالب</CardTitle>
          <CardDescription>ابحث عن الطالب بالاسم أو رقم الهوية</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
            <Input
              className="pr-9"
              placeholder="ابحث..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {filtered.length === 0 && <p className="p-3 text-sm text-slate-500 text-center">لا توجد نتائج</p>}
              {filtered.map(s => (
                <button
                  key={s.id}
                  className="w-full text-right px-4 py-3 hover:bg-slate-50 transition-colors"
                  onClick={() => handleSelectStudent(s)}
                >
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-xs text-slate-500">{stageLabels[s.stage]} - {s.grade} | {s.academicYear}</p>
                </button>
              ))}
            </div>
          )}
          {selected && (
            <div className="bg-primary/5 rounded-lg p-4 space-y-1">
              <p className="font-bold font-[Noto_Kufi_Arabic]">{selected.name}</p>
              <p className="text-sm text-slate-600">{stageLabels[selected.stage]} - {selected.grade}</p>
              <p className="text-sm text-slate-600">العام الدراسي: {selected.academicYear}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-[Noto_Kufi_Arabic]">بيانات النقل</CardTitle>
          <CardDescription>حدد المرحلة والصف والعام الجديد</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>المرحلة الجديدة</Label>
            <Select value={toStage} onValueChange={v => { setToStage(v as Stage); setToGrade(gradeOptions[v][0]); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {stageOrder.map(s => <SelectItem key={s} value={s}>{stageLabels[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الصف الجديد</Label>
            <Select value={toGrade} onValueChange={setToGrade}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {gradeOptions[toStage].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>العام الدراسي الجديد</Label>
            <Select value={toAcademicYear} onValueChange={setToAcademicYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {academicYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {matchedFee ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm space-y-1">
              <p className="font-semibold text-emerald-700">تم العثور على هيكل رسوم مطابق</p>
              <p>رسوم التعليم: {formatCurrency(matchedFee.tuitionFees)}</p>
              <p>رسوم الكتب: {formatCurrency(matchedFee.booksFees)}</p>
              <p>رسوم الزي: {formatCurrency(matchedFee.uniformFees)}</p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              لم يتم العثور على هيكل رسوم مطابق. ستُحتفظ بالرسوم الحالية.
            </div>
          )}
          <Button
            className="w-full"
            disabled={!selected || !toGrade || loading}
            onClick={() => setConfirmOpen(true)}
          >
            <ArrowRight className="size-4 ml-2" />
            نقل الطالب
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-[Noto_Kufi_Arabic]">تأكيد نقل الطالب</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold">الطالب:</span> {selected.name}</p>
              <p><span className="font-semibold">من:</span> {stageLabels[selected.stage]} - {selected.grade} ({selected.academicYear})</p>
              <p><span className="font-semibold">إلى:</span> {stageLabels[toStage]} - {toGrade} ({toAcademicYear})</p>
              {matchedFee && (
                <p><span className="font-semibold">إجمالي الرسوم الجديدة:</span> {formatCurrency(matchedFee.tuitionFees + matchedFee.booksFees + matchedFee.uniformFees + selected.busFees + selected.otherFees)}</p>
              )}
              <p className="text-amber-600">سيتم إعادة تعيين المبالغ المسددة إلى صفر.</p>
            </div>
          )}
          <DialogFooter className="gap-2 flex-row-reverse sm:flex-row-reverse">
            <Button onClick={handlePromote} disabled={loading}>
              {loading ? 'جارٍ النقل...' : 'تأكيد النقل'}
            </Button>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Bulk Promotion ───────────────────────────────────────────────────────────

function BulkPromotion({ students, stageFees, bulkPromoteStudents }: {
  students: Student[];
  stageFees: any[];
  bulkPromoteStudents: any;
}) {
  const [fromStage, setFromStage] = useState<Stage>('primary');
  const [fromGrade, setFromGrade] = useState(gradeOptions['primary'][0]);
  const [toAcademicYear, setToAcademicYear] = useState(getNextAcademicYear(currentAcademicYear));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ succeeded: number; failed: number } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const eligible = useMemo(() =>
    students.filter(s =>
      (s.status === 'active' || s.status === 'admitted') &&
      s.stage === fromStage &&
      s.grade === fromGrade
    ),
    [students, fromStage, fromGrade]
  );

  const nextStageGrade = useMemo(() => getNextStageAndGrade(fromStage, fromGrade), [fromStage, fromGrade]);

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(eligible.map(s => s.id)) : new Set());
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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
        totalFees: fee
          ? fee.tuitionFees + fee.booksFees + fee.uniformFees + student.busFees + student.otherFees
          : student.totalFees,
      };
    });
  };

  const handleBulkPromote = async () => {
    setLoading(true);
    try {
      const promotions = buildPromotions();
      const res = await bulkPromoteStudents(promotions);
      setResult(res);
      setSelected(new Set());
      setConfirmOpen(false);
      toast.success(`تم النقل الجماعي: ${res.succeeded} نجح، ${res.failed} فشل`);
    } catch {
      toast.error('حدث خطأ أثناء النقل الجماعي');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-[Noto_Kufi_Arabic]">فلترة الطلاب للنقل</CardTitle>
          <CardDescription>اختر المرحلة والصف الحالي والعام الدراسي الجديد</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>المرحلة الحالية</Label>
            <Select value={fromStage} onValueChange={v => { setFromStage(v as Stage); setFromGrade(gradeOptions[v][0]); setSelected(new Set()); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {stageOrder.map(s => <SelectItem key={s} value={s}>{stageLabels[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الصف الحالي</Label>
            <Select value={fromGrade} onValueChange={v => { setFromGrade(v); setSelected(new Set()); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {gradeOptions[fromStage].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>العام الدراسي الجديد</Label>
            <Select value={toAcademicYear} onValueChange={setToAcademicYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {academicYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {nextStageGrade && (
        <div className="flex items-center gap-2 text-sm text-slate-600 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <ArrowRight className="size-4 text-blue-500" />
          سيتم النقل إلى: <span className="font-semibold">{stageLabels[nextStageGrade.stage]} - {nextStageGrade.grade}</span>
        </div>
      )}

      {result && (
        <div className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${result.failed === 0 ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
          {result.failed === 0 ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
          نتيجة النقل: {result.succeeded} نجح، {result.failed} فشل
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-[Noto_Kufi_Arabic]">قائمة الطلاب ({eligible.length})</CardTitle>
            <CardDescription>الطلاب النشطون في الصف المختار</CardDescription>
          </div>
          <Button
            disabled={selected.size === 0 || loading}
            onClick={() => setConfirmOpen(true)}
          >
            <Users className="size-4 ml-2" />
            نقل المختارين ({selected.size})
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={eligible.length > 0 && selected.size === eligible.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead>رقم الهوية</TableHead>
                <TableHead>المسار</TableHead>
                <TableHead>الرسوم الحالية</TableHead>
                <TableHead>رسوم جديدة متوقعة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eligible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                    لا يوجد طلاب في هذا الصف
                  </TableCell>
                </TableRow>
              )}
              {eligible.map(s => {
                const ns = nextStageGrade ?? { stage: fromStage, grade: fromGrade };
                const fee = stageFees.find(f =>
                  f.stage === ns.stage &&
                  f.grade === ns.grade &&
                  f.track === s.track &&
                  f.academicYear === toAcademicYear
                );
                return (
                  <TableRow key={s.id} className={selected.has(s.id) ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(s.id)}
                        onCheckedChange={() => toggleOne(s.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-slate-500">{s.nationalId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.track === 'local' ? 'عربي' : 'دولي'}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(s.totalFees)}</TableCell>
                    <TableCell>
                      {fee ? (
                        <span className="text-emerald-600 font-medium">
                          {formatCurrency(fee.tuitionFees + fee.booksFees + fee.uniformFees + s.busFees + s.otherFees)}
                        </span>
                      ) : (
                        <span className="text-amber-500 text-xs">لا يوجد هيكل رسوم</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-[Noto_Kufi_Arabic]">تأكيد النقل الجماعي</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>سيتم نقل <span className="font-bold">{selected.size}</span> طالب</p>
            {nextStageGrade && (
              <p>إلى: <span className="font-semibold">{stageLabels[nextStageGrade.stage]} - {nextStageGrade.grade}</span> ({toAcademicYear})</p>
            )}
            <p className="text-amber-600">سيتم إعادة تعيين المبالغ المسددة إلى صفر لجميع الطلاب المنقولين.</p>
          </div>
          <DialogFooter className="gap-2 flex-row-reverse sm:flex-row-reverse">
            <Button onClick={handleBulkPromote} disabled={loading}>
              {loading ? 'جارٍ النقل...' : 'تأكيد النقل الجماعي'}
            </Button>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/StudentPromotion.tsx
git commit -m "feat: add StudentPromotion page with single and bulk promotion tabs"
```

---

## Task 4: إضافة route في App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: أضف import في أعلى الملف مع باقي الـ imports**

```typescript
import StudentPromotion from '@/pages/StudentPromotion';
```

- [ ] **Step 2: أضف الـ Route داخل الـ ProtectedRoute، بعد سطر Students**

```tsx
<Route path="/student-promotion" element={<StudentPromotion />} />
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add /student-promotion route"
```

---

## Task 5: إضافة رابط في الـ Sidebar

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: اقرأ الملف وحدد قسم الطلاب (Students)**

```bash
grep -n "students\|الطلاب\|GraduationCap\|Users" src/components/layout/Sidebar.tsx | head -20
```

- [ ] **Step 2: أضف import لأيقونة ArrowRightLeft إن لم تكن موجودة**

في سطر import من lucide-react، أضف `ArrowRightLeft` إلى القائمة.

- [ ] **Step 3: أضف عنصر القائمة بعد رابط الطلاب**

أضف الآتي في نفس مكان باقي عناصر القائمة، بعد رابط `/students`:

```tsx
{
  label: 'نقل الطلاب',
  path: '/student-promotion',
  icon: ArrowRightLeft,
  roles: ['school_director', 'head_accountant'],
}
```

ملاحظة: اتبع نفس نمط الملف الحالي بالضبط (سواء كان مصفوفة navItems أو JSX مباشر).

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: add student-promotion link to sidebar for director and head accountant"
```

---

## Self-Review

### Spec Coverage
| المتطلب | الـ Task |
|---------|---------|
| نقل فردي يدوي | Task 3 - SinglePromotion |
| نقل جماعي | Task 3 - BulkPromotion |
| تطبيق رسوم المرحلة الجديدة تلقائياً | Task 2 + Task 3 (matchedFee logic) |
| تقييد الصلاحية: school_director + head_accountant | Task 3 (ALLOWED_ROLES check) + Task 5 (sidebar roles) |
| إعادة paidAmount إلى 0 عند النقل | Task 2 (promoteStudent sets paidAmount: 0) |
| تأكيد قبل التنفيذ | Task 3 (Dialog تأكيد في كلا التبويبين) |

### Placeholder Scan
لا توجد placeholders - جميع الخطوات تحتوي على كود كامل.

### Type Consistency
- `Stage` مستورد في `studentsStore.ts` (Task 2)
- `promoteStudent` signature في interface وتطبيقه متطابقان
- `getNextStageAndGrade` يعيد `{ stage: Stage; grade: string } | null` وهو مستخدم بشكل صحيح
