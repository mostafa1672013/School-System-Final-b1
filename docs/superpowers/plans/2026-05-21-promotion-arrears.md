# Promotion Arrears & Badge Discount Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** عند نقل الطالب، يُحسب المبلغ المستحق من السنة السابقة ويُرحَّل كـ `arrearsFees` في السنة الجديدة، مع تطبيق خصم الشارة على رسوم المرحلة الجديدة فقط دون المتأخرات.

**Architecture:** نضيف `arrearsFees` لكلٍّ من `Student` و `StudentYearlyFinance` في Prisma. نُنشئ endpoint جديد `POST /api/students/:id/promote` يُنفِّذ الحساب والتحديث والإنشاء في transaction واحدة. الـ frontend يحسب القيم ويعرضها في dialog واضح، ثم يرسلها للـ endpoint الجديد.

**Tech Stack:** Prisma (SQLite), Express, React 18, TypeScript, Zustand, shadcn/ui, TailwindCSS

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `server/prisma/schema.prisma` | Modify | إضافة `arrearsFees` لـ Student وStudentYearlyFinance |
| `server/src/index.ts` | Modify | إضافة endpoint `POST /api/students/:id/promote` |
| `src/types/index.ts` | Modify | إضافة `arrearsFees` للـ interfaces |
| `src/stores/studentsStore.ts` | Modify | تحديث `promoteStudent` لإرسال الحقول الجديدة عبر endpoint جديد |
| `src/pages/StudentPromotion.tsx` | Modify | حساب المتأخرات والخصم + تحديث dialog + تحديث عرض الجدول في Bulk |

---

## Task 1: إضافة arrearsFees للـ Schema وتشغيل Migration

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: أضف `arrearsFees` لـ `model Student` بعد سطر `otherFees`**

في `server/prisma/schema.prisma`، ابحث عن:
```prisma
  otherFees       Float     @default(0)
  totalFees       Float     @default(0)
```
غيّرها إلى:
```prisma
  otherFees       Float     @default(0)
  arrearsFees     Float     @default(0)
  totalFees       Float     @default(0)
```

- [ ] **Step 2: أضف `arrearsFees` لـ `model StudentYearlyFinance` بعد سطر `otherFees`**

ابحث عن:
```prisma
  otherFees       Float    @default(0)
  totalFees       Float    @default(0)
  paidAmount      Float    @default(0)
```
غيّرها إلى:
```prisma
  otherFees       Float    @default(0)
  arrearsFees     Float    @default(0)
  totalFees       Float    @default(0)
  paidAmount      Float    @default(0)
```

- [ ] **Step 3: شغّل migration**

```bash
cd server
npx prisma migrate dev --name add_arrears_fees
```

المخرج المتوقع: `✔  Your database is now in sync with your schema.`

- [ ] **Step 4: تحقق أن السيرفر يشتغل بعد الـ migration**

```bash
cd server && npx ts-node src/index.ts &
sleep 3
curl -s http://localhost:4000/api/stage-fees | head -20
kill %1
```

المخرج المتوقع: JSON (حتى لو array فاضية)

- [ ] **Step 5: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add arrearsFees field to Student and StudentYearlyFinance"
```

---

## Task 2: تحديث TypeScript Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: أضف `arrearsFees` لـ `StudentYearlyFinance` interface**

ابحث عن:
```typescript
export interface StudentYearlyFinance {
  id: string;
  studentId: string;
  academicYear: string;
  grade: string;
  stage: Stage;
  tuitionFees: number;
  booksFees: number;
  uniformFees: number;
  busFees: number;
  otherFees: number;
  totalFees: number;
  paidAmount: number;
}
```
غيّرها إلى:
```typescript
export interface StudentYearlyFinance {
  id: string;
  studentId: string;
  academicYear: string;
  grade: string;
  stage: Stage;
  tuitionFees: number;
  booksFees: number;
  uniformFees: number;
  busFees: number;
  otherFees: number;
  arrearsFees: number;
  totalFees: number;
  paidAmount: number;
}
```

- [ ] **Step 2: أضف `arrearsFees` لـ `Student` interface بعد `otherFees`**

ابحث عن:
```typescript
  busFees: number;
  otherFees: number;
  totalFees: number;
```
غيّرها إلى:
```typescript
  busFees: number;
  otherFees: number;
  arrearsFees: number;
  totalFees: number;
```

- [ ] **Step 3: تحقق من البناء**

```bash
cd "/Users/me/Downloads/Project/untitled folder" && npm run build 2>&1 | tail -5
```

المخرج المتوقع: `✓ built in X.XXs`

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add arrearsFees to TypeScript interfaces"
```

---

## Task 3: إضافة endpoint جديد `POST /api/students/:id/promote`

**Files:**
- Modify: `server/src/index.ts` — أضف الـ endpoint بعد سطر `app.delete('/api/students/:id'` (حوالي line 162)

- [ ] **Step 1: أضف الـ endpoint بعد `app.delete('/api/students/:id'` مباشرة**

```typescript
// Promote student to new stage/grade with arrears carryover
app.post('/api/students/:id/promote', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const {
    stage, grade, academicYear,
    tuitionFees, booksFees, uniformFees, busFees, otherFees,
    arrearsFees, discountAmount, discountPercentage, totalFees,
  } = req.body;

  try {
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
        },
        include: { yearlyFinance: { orderBy: { academicYear: 'asc' } } },
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
    res.json(student);
  } catch (error) {
    console.error('Promote student error:', error);
    res.status(400).json({ error: 'فشل نقل الطالب', details: String(error) });
  }
});
```

- [ ] **Step 2: تأكد أن السيرفر يُشغَّل بدون أخطاء TypeScript**

```bash
cd server && npx ts-node --transpile-only src/index.ts &
sleep 3
echo "Server started OK"
kill %1
```

المخرج المتوقع: `Server started OK` بدون أخطاء

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: add POST /api/students/:id/promote endpoint with arrears and yearly finance"
```

---

## Task 4: تحديث `studentsStore.ts`

**Files:**
- Modify: `src/stores/studentsStore.ts`

- [ ] **Step 1: أضف `arrearsFees`, `discountAmount`, `discountPercentage` لـ interface و implementation**

اقرأ الملف أولاً. ابحث عن `promoteStudent` في الـ interface (`StudentsState`) وغيّر signature الـ data parameter من:
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
```
إلى:
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

افعل نفس الشيء لـ `bulkPromoteStudents` — أضف `arrearsFees`, `discountAmount`, `discountPercentage` للـ Array item type.

- [ ] **Step 2: غيّر endpoint الـ fetch في implementation الـ `promoteStudent`**

ابحث عن implementation الـ `promoteStudent` (يبدأ بـ `promoteStudent: async (id, data) => {`). غيّر:
```typescript
  const response = await fetch(`/api/students/${id}`, {
    method: 'PATCH',
```
إلى:
```typescript
  const response = await fetch(`/api/students/${id}/promote`, {
    method: 'POST',
```

وعدّل الـ body ليشمل الحقول الجديدة — غيّر `JSON.stringify({...})` من:
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
      totalFees: data.totalFees,
      paidAmount: 0,
    }),
```
إلى:
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
    }),
```

- [ ] **Step 3: تحقق من البناء**

```bash
cd "/Users/me/Downloads/Project/untitled folder" && npm run build 2>&1 | tail -5
```

المخرج المتوقع: `✓ built in X.XXs`

- [ ] **Step 4: Commit**

```bash
git add src/stores/studentsStore.ts
git commit -m "feat: update promoteStudent to use new endpoint with arrears and discount fields"
```

---

## Task 5: تحديث `SinglePromotion` في StudentPromotion.tsx

**Files:**
- Modify: `src/pages/StudentPromotion.tsx` — قسم `SinglePromotion` فقط (lines 85–298)

**المنطق الجديد:**
```
arrears       = max(0, student.totalFees - student.paidAmount)
baseNewFees   = fee.(tuition+books+uniform+mandatory additionalFees) أو student.(tuition+books+uniform) إذا لا يوجد هيكل
badgeDiscount = student.badge ? round(baseNewFees × badge.discountPercentage / 100) : 0
netNewFees    = baseNewFees - badgeDiscount
totalFees     = netNewFees + student.busFees + student.otherFees + arrears
```

- [ ] **Step 1: أضف `useMemo` لحساب قيم النقل — أضفه بعد `matchedFee` useMemo**

اقرأ الملف لتعرف الـ line number الدقيق لـ `matchedFee` useMemo. بعده مباشرة أضف:

```typescript
  const promotionCalc = useMemo(() => {
    if (!selected) return null;
    const arrears = Math.max(0, selected.totalFees - selected.paidAmount);
    const baseNewFees = matchedFee
      ? matchedFee.tuitionFees + matchedFee.booksFees + matchedFee.uniformFees +
        (matchedFee.additionalFees?.filter((f: any) => f.isMandatory).reduce((sum: number, f: any) => sum + f.amount, 0) ?? 0)
      : selected.tuitionFees + selected.booksFees + selected.uniformFees;
    const badgeDiscount = selected.badge
      ? Math.round(baseNewFees * (selected.badge.discountPercentage / 100) * 100) / 100
      : 0;
    const netNewFees = baseNewFees - badgeDiscount;
    const totalFees = netNewFees + selected.busFees + selected.otherFees + arrears;
    return { arrears, baseNewFees, badgeDiscount, netNewFees, totalFees };
  }, [selected, matchedFee]);
```

- [ ] **Step 2: حدّث `handlePromote` ليستخدم `promotionCalc`**

ابحث عن `handlePromote` وغيّر الـ call لـ `promoteStudent`:
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
        totalFees: matchedFee
          ? matchedFee.tuitionFees + matchedFee.booksFees + matchedFee.uniformFees + selected.busFees + selected.otherFees +
            (matchedFee.additionalFees?.filter(f => f.isMandatory).reduce((sum, f) => sum + f.amount, 0) ?? 0)
          : selected.totalFees,
      });
```
إلى:
```typescript
      if (!promotionCalc) return;
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
      });
```

- [ ] **Step 3: حدّث dialog التأكيد ليعرض تفصيل الرسوم**

ابحث عن الـ `<Dialog open={confirmOpen}` في SinglePromotion وغيّر محتوى الـ dialog. استبدل الـ `{selected && (...)}` block كاملاً بـ:

```tsx
          {selected && promotionCalc && (
            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <p><span className="font-semibold">الطالب:</span> {selected.name}</p>
                <p><span className="font-semibold">من:</span> {stageLabels[selected.stage]} - {selected.grade} ({selected.academicYear})</p>
                <p><span className="font-semibold">إلى:</span> {stageLabels[toStage]} - {toGrade} ({toAcademicYear})</p>
              </div>
              <table className="w-full text-sm border-t border-slate-200 pt-2">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-1.5 text-slate-600">رسوم المرحلة الجديدة</td>
                    <td className="py-1.5 text-left font-medium">{formatCurrency(promotionCalc.baseNewFees)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-slate-600">
                      خصم الشارة
                      {selected.badge ? ` (${selected.badge.discountPercentage}%)` : ''}
                    </td>
                    <td className="py-1.5 text-left font-medium text-emerald-600">
                      {promotionCalc.badgeDiscount > 0 ? `− ${formatCurrency(promotionCalc.badgeDiscount)}` : formatCurrency(0)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-slate-600">رسوم بعد الخصم</td>
                    <td className="py-1.5 text-left font-medium">{formatCurrency(promotionCalc.netNewFees + selected.busFees + selected.otherFees)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-slate-600">متأخرات السنة السابقة</td>
                    <td className="py-1.5 text-left font-medium text-red-600">
                      {formatCurrency(promotionCalc.arrears)}
                    </td>
                  </tr>
                  <tr className="border-t-2 border-slate-300 font-bold">
                    <td className="py-2">الإجمالي</td>
                    <td className="py-2 text-left text-primary">{formatCurrency(promotionCalc.totalFees)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-amber-600 text-xs">سيتم إعادة تعيين المبالغ المسددة إلى صفر.</p>
            </div>
          )}
```

- [ ] **Step 4: تحقق من البناء**

```bash
cd "/Users/me/Downloads/Project/untitled folder" && npm run build 2>&1 | tail -5
```

المخرج المتوقع: `✓ built in X.XXs`

- [ ] **Step 5: Commit**

```bash
git add src/pages/StudentPromotion.tsx
git commit -m "feat: add arrears and badge discount calculation to SinglePromotion dialog"
```

---

## Task 6: تحديث `BulkPromotion` في StudentPromotion.tsx

**Files:**
- Modify: `src/pages/StudentPromotion.tsx` — قسم `BulkPromotion` فقط (lines 301–end)

- [ ] **Step 1: حدّث `buildPromotions` لتشمل المتأخرات والخصم**

ابحث عن `buildPromotions` function وغيّرها بالكامل إلى:

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
      const arrears = Math.max(0, student.totalFees - student.paidAmount);
      const baseNewFees = fee
        ? fee.tuitionFees + fee.booksFees + fee.uniformFees +
          (fee.additionalFees?.filter((f: any) => f.isMandatory).reduce((sum: number, f: any) => sum + f.amount, 0) ?? 0)
        : student.tuitionFees + student.booksFees + student.uniformFees;
      const badgeDiscount = student.badge
        ? Math.round(baseNewFees * (student.badge.discountPercentage / 100) * 100) / 100
        : 0;
      const netNewFees = baseNewFees - badgeDiscount;
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
        totalFees: netNewFees + student.busFees + student.otherFees + arrears,
      };
    });
  };
```

- [ ] **Step 2: حدّث عمود "رسوم جديدة متوقعة" في الجدول ليعرض المتأخرات والخصم**

ابحث عن:
```tsx
                    <TableCell>
                      {fee ? (
                        <span className="text-emerald-600 font-medium">
                          {formatCurrency(fee.tuitionFees + fee.booksFees + fee.uniformFees + s.busFees + s.otherFees +
                            (fee.additionalFees?.filter(f => f.isMandatory).reduce((sum, f) => sum + f.amount, 0) ?? 0))}
                        </span>
                      ) : (
                        <span className="text-amber-500 text-xs">لا يوجد هيكل رسوم</span>
                      )}
                    </TableCell>
```
غيّرها إلى:
```tsx
                    <TableCell>
                      {(() => {
                        const arrears = Math.max(0, s.totalFees - s.paidAmount);
                        const base = fee
                          ? fee.tuitionFees + fee.booksFees + fee.uniformFees +
                            (fee.additionalFees?.filter((f: any) => f.isMandatory).reduce((sum: number, f: any) => sum + f.amount, 0) ?? 0)
                          : null;
                        const discount = (base && s.badge)
                          ? Math.round(base * (s.badge.discountPercentage / 100) * 100) / 100
                          : 0;
                        const net = base !== null ? base - discount + s.busFees + s.otherFees + arrears : null;
                        return net !== null ? (
                          <div className="space-y-0.5">
                            <span className="text-emerald-600 font-medium block">{formatCurrency(net)}</span>
                            {arrears > 0 && <span className="text-red-500 text-xs block">متأخرات: {formatCurrency(arrears)}</span>}
                            {discount > 0 && <span className="text-slate-400 text-xs block">خصم: {formatCurrency(discount)}</span>}
                          </div>
                        ) : (
                          <span className="text-amber-500 text-xs">لا يوجد هيكل رسوم</span>
                        );
                      })()}
                    </TableCell>
```

- [ ] **Step 3: تحقق من البناء**

```bash
cd "/Users/me/Downloads/Project/untitled folder" && npm run build 2>&1 | tail -5
```

المخرج المتوقع: `✓ built in X.XXs`

- [ ] **Step 4: Commit**

```bash
git add src/pages/StudentPromotion.tsx
git commit -m "feat: update BulkPromotion to calculate arrears and badge discount per student"
```

---

## Self-Review

### Spec Coverage
| المتطلب | الـ Task |
|---------|---------|
| حقل `arrearsFees` في Schema (Student + StudentYearlyFinance) | Task 1 |
| حقل `arrearsFees` في TypeScript interfaces | Task 2 |
| Endpoint يُنشئ StudentYearlyFinance للسنة الجديدة في transaction | Task 3 |
| Store يرسل الحقول الجديدة عبر الـ endpoint الجديد | Task 4 |
| Dialog تأكيد يعرض: رسوم → خصم → بعد خصم → متأخرات → إجمالي | Task 5 |
| الخصم يُطبَّق على رسوم المرحلة الجديدة فقط (لا المتأخرات) | Task 5 + Task 6 |
| BulkPromotion: حساب المتأخرات والخصم لكل طالب + عرضهم في الجدول | Task 6 |

### Placeholder Scan
لا توجد placeholders — جميع الخطوات تحتوي على كود كامل.

### Type Consistency
- `arrearsFees: number` مُضاف لكلٍّ من `Student` و `StudentYearlyFinance` interfaces (Task 2)
- `promoteStudent` signature في interface و bulkPromoteStudents كلاهما يشملان `arrearsFees`, `discountAmount`, `discountPercentage` (Task 4)
- الـ endpoint يقبل نفس الحقول بالضبط (Task 3)
- `promotionCalc` في SinglePromotion يُستخدم في `handlePromote` وفي الـ dialog بنفس الأسماء (Task 5)
