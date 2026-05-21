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

// --- Helpers (same logic as StudentPromotion.tsx) ---
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

  const eligibleStudents = useMemo(
    () => students.filter((s) => s.academicYear === activeAcademicYear && ['admitted', 'active'].includes(s.status)),
    [students, activeAcademicYear]
  );

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
          fromAcademicYear: activeAcademicYear,
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
          fromAcademicYear: activeAcademicYear,
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

  const notPromoted = students.filter(
    (s) => s.academicYear === activeAcademicYear && !['admitted', 'active', 'inactive', 'graduated', 'transferred'].includes(s.status)
  );

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">ليس لديك صلاحية الوصول لهذه الصفحة</p>
      </div>
    );
  }

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
