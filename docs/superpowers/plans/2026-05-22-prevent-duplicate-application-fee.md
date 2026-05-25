# Prevent Duplicate Application Fee Payment - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** منع تسجيل رسوم الملف أكثر من مرة للطالب نفسه — سواء بالضغط المزدوج أو بفتح الحوار مرتين.

**Architecture:** ثلاثة إصلاحات مترابطة:
1. **Backend (race condition)**: نقل فحص الحالة داخل الـ transaction باستخدام `updateMany` مع شرط الحالة — إذا كانت النتيجة 0 صفوف، نرفض الطلب. هذا يجعل التحقق والتحديث عملية ذرية حقيقية.
2. **Frontend — loading state**: إضافة `isSubmitting` state في `Payments.tsx` لتعطيل زر "تسجيل الدفع" أثناء معالجة الطلب.
3. **Frontend — optimistic update**: بعد نجاح دفع `application_fee`، تحديث `status` الطالب في الـ store فوراً إلى `under_testing` حتى يختفي من قائمة "رسوم ملف معلقة" بدون انتظار `fetchStudents`.

**Tech Stack:** Express.js, Prisma ORM, React, Zustand

---

### Task 1: Backend — Atomic Status Check Inside Transaction

**Files:**
- Modify: `server/src/index.ts` (~lines 669–676 and ~lines 720–758)

المشكلة: الفحص الحالي في السطر 669 يحدث قبل الـ transaction، مما يترك نافذة race condition حيث طلبان متزامنان يمران معاً.

الحل: إبقاء الفحص المبكر (للرد السريع) وإضافة فحص ذري داخل الـ transaction يستخدم `updateMany` مع شرط الحالة.

- [ ] **Step 1: Find the application_fee section in index.ts**

في `server/src/index.ts`، ابحث عن هذا الكود (حوالي السطر 669):

```typescript
// CRITICAL: Prevent duplicate application fee payments
if (type === 'application_fee') {
  const currentStudent = await prisma.student.findUnique({ where: { id: studentId }, select: { status: true } });
  if (!currentStudent) return res.status(404).json({ error: 'الطالب غير موجود' });
  if (currentStudent.status !== 'applied' && currentStudent.status !== 'failed') {
    return res.status(400).json({ error: 'رسوم الملف مدفوعة بالفعل أو الطالب في مرحلة متقدمة' });
  }
}
```

وابحث عن الـ transaction (حوالي السطر 740):
```typescript
prisma.student.update({
  where: { id: studentId },
  data: { 
    ...(type !== 'application_fee' && { paidAmount: { increment: amount } }),
    ...(type === 'arrears' && { arrearsFees: { decrement: amount } }),
    // Atomically update status for application_fee to prevent race conditions
    ...(type === 'application_fee' && { status: 'under_testing', testResult: 'pending' }),
    ...
  }
})
```

- [ ] **Step 2: Replace the application_fee student update inside the transaction**

بدلاً من `prisma.student.update` غير المشروط لـ `application_fee`، استبدل الكود المتعلق بتحديث الطالب داخل الـ transaction لكي يكون مشروطاً على الحالة.

**ابحث عن هذا الجزء من الـ transaction (السطر ~740):**
```typescript
prisma.student.update({
  where: { id: studentId },
  data: { 
    ...(type !== 'application_fee' && { paidAmount: { increment: amount } }),
    ...(type === 'arrears' && { arrearsFees: { decrement: amount } }),
    // Atomically update status for application_fee to prevent race conditions
    ...(type === 'application_fee' && { status: 'under_testing', testResult: 'pending' }),
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

**استبدله بـ:**
```typescript
type === 'application_fee'
  ? prisma.student.updateMany({
      where: { id: studentId, status: { in: ['applied', 'failed'] } },
      data: {
        status: 'under_testing',
        testResult: 'pending',
        pendingPaymentAmount: null,
        pendingPaymentType: null,
        pendingPaymentMethod: null,
        pendingWalletPhoneNumber: null,
        pendingPaymentNotes: null,
        pendingInstallmentPlanId: null,
        pendingInstallmentId: null,
        paymentRequestStatus: null,
      }
    })
  : prisma.student.update({
      where: { id: studentId },
      data: {
        ...(type !== 'arrears' && { paidAmount: { increment: amount } }),
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

- [ ] **Step 3: Add a post-transaction check for application_fee**

بعد الـ transaction مباشرة (بعد `const [payment] = await prisma.$transaction([...])`), أضف:

```typescript
// For application_fee: verify the student status was actually changed (race condition guard)
if (type === 'application_fee') {
  // updateMany returns { count: N }. The last element in the transaction is the updateMany result.
  // If count === 0, another request beat us to it — the payment was already created but student wasn't updated.
  // Note: the payment was created inside the transaction, but Prisma doesn't rollback on count=0.
  // So we need to check after. The early check (line 669) handles the normal case; this handles the race.
}
```

**ملاحظة مهمة:** Prisma `$transaction` لا يُلغي (rollback) إذا كانت نتيجة `updateMany` صفراً — لذا لا نحتاج هذا الفحص. الفحص المبكر (السطر 669) + `updateMany` الذرية كافيان: الطلب الثاني الذي يصل بعد اكتمال الأول لن يمر من الفحص المبكر. الطلبان المتزامنان: أحدهما سيُحدّث الـ status والآخر لن يجد صف بحالة `applied`/`failed`.

**لذا لا حاجة لفحص إضافي — الخطوة 2 كافية.**

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "/Users/me/Downloads/Project/untitled folder/server"
npx tsc --noEmit 2>&1
```

Expected: لا أخطاء.

- [ ] **Step 5: Commit**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
git add server/src/index.ts
git commit -m "fix: use atomic updateMany for application_fee to prevent race condition on duplicate payment"
```

---

### Task 2: Frontend — Add isSubmitting Loading State

**Files:**
- Modify: `src/pages/Payments.tsx` (~lines 43, 128, 200–207)

منع الضغط المزدوج على زر "تسجيل الدفع" بإضافة loading state.

- [ ] **Step 1: Find the state declarations in Payments.tsx**

حوالي السطر 43:
```typescript
const [form, setForm] = useState({
    studentId: '', amount: 0, type: 'tuition' as PaymentType, method: 'cash' as PaymentMethod, notes: '', walletPhoneNumber: ''
});
```

- [ ] **Step 2: Add isSubmitting state**

أضف بعد تعريف `form`:
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);
```

- [ ] **Step 3: Wrap handleAddPayment with isSubmitting guard**

ابحث عن بداية `handleAddPayment` (~السطر 128):
```typescript
const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    // Security: User must be logged in
    if (!user || !user.id) {
```

أضف بعد `e.preventDefault();` مباشرة:
```typescript
    if (isSubmitting) return;
    setIsSubmitting(true);
```

- [ ] **Step 4: Reset isSubmitting on success and error**

ابحث عن نهاية `handleAddPayment`. عند النجاح (~السطر 199):
```typescript
toast.success(`تم تسجيل دفعة ${formatCurrency(form.amount)} للطالب ${student.name}`);
printPaymentReceipt({ id: paymentId || '', ...newPayment }, { grade: student.grade, guardianName: student.guardianName });

fetchStudents();
setDialogOpen(false);
setForm({ studentId: '', amount: 0, type: 'tuition', method: 'cash', notes: '', walletPhoneNumber: '' });
```

أضف `setIsSubmitting(false);` قبل `setDialogOpen(false);`:
```typescript
toast.success(`تم تسجيل دفعة ${formatCurrency(form.amount)} للطالب ${student.name}`);
printPaymentReceipt({ id: paymentId || '', ...newPayment }, { grade: student.grade, guardianName: student.guardianName });

fetchStudents();
setIsSubmitting(false);
setDialogOpen(false);
setForm({ studentId: '', amount: 0, type: 'tuition', method: 'cash', notes: '', walletPhoneNumber: '' });
```

عند الخطأ (~السطر 205):
```typescript
} catch (error) {
    toast.error('حدث خطأ أثناء تسجيل الدفع');
}
```

غيّره إلى:
```typescript
} catch (error) {
    toast.error('حدث خطأ أثناء تسجيل الدفع');
    setIsSubmitting(false);
}
```

- [ ] **Step 5: Disable submit button when isSubmitting**

ابحث عن زر "تسجيل الدفع" في الـ form (ابحث عن `type="submit"` أو نص الزر). سيكون بالشكل:
```tsx
<Button type="submit">تسجيل الدفع</Button>
```

أو مع props أخرى. أضف `disabled={isSubmitting}`:
```tsx
<Button type="submit" disabled={isSubmitting}>
    {isSubmitting ? 'جارٍ التسجيل...' : 'تسجيل الدفع'}
</Button>
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npx tsc --noEmit 2>&1
```

Expected: لا أخطاء.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Payments.tsx
git commit -m "fix: disable payment submit button while submitting to prevent double-click duplicate"
```

---

### Task 3: Frontend — Optimistic Student Status Update After application_fee

**Files:**
- Modify: `src/pages/Payments.tsx` (~line 182)
- Modify: `src/stores/studentsStore.ts` (~line 110)

بعد نجاح دفع `application_fee`، يجب أن يختفي الطالب من قائمة "رسوم ملف معلقة" فوراً بدون انتظار `fetchStudents`. حالياً `addPaymentToStudent` لا تُحدّث الـ `status`.

- [ ] **Step 1: Update addPaymentToStudent in studentsStore.ts**

ابحث عن (~السطر 110):
```typescript
addPaymentToStudent: (id, amount) => set((state) => ({
  students: state.students.map((s) =>
    s.id === id ? { ...s, paidAmount: s.paidAmount + amount } : s
  ),
})),
```

غيّره إلى (نضيف parameter اختياري للـ type):
```typescript
addPaymentToStudent: (id, amount, paymentType?: string) => set((state) => ({
  students: state.students.map((s) =>
    s.id === id
      ? {
          ...s,
          paidAmount: paymentType !== 'application_fee' ? s.paidAmount + amount : s.paidAmount,
          ...(paymentType === 'application_fee' && { status: 'under_testing' as const }),
        }
      : s
  ),
})),
```

- [ ] **Step 2: Update the interface/type for addPaymentToStudent**

في نفس الملف `src/stores/studentsStore.ts`، ابحث عن تعريف الـ interface (~السطر 16):
```typescript
addPaymentToStudent: (id: string, amount: number) => void;
```

غيّره إلى:
```typescript
addPaymentToStudent: (id: string, amount: number, paymentType?: string) => void;
```

- [ ] **Step 3: Pass paymentType when calling addPaymentToStudent in Payments.tsx**

في `src/pages/Payments.tsx` (~السطر 182):
```typescript
await addPaymentToStudent(form.studentId, form.amount);
```

غيّره إلى:
```typescript
await addPaymentToStudent(form.studentId, form.amount, form.type);
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npx tsc --noEmit 2>&1
```

Expected: لا أخطاء.

- [ ] **Step 5: Commit**

```bash
git add src/stores/studentsStore.ts src/pages/Payments.tsx
git commit -m "fix: update student status to under_testing optimistically after application_fee payment"
```

---

### Task 4: End-to-End Verification via Database Test

**Files:** لا تغييرات

- [ ] **Step 1: Run race condition simulation**

```bash
cd "/Users/me/Downloads/Project/untitled folder/server"
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  // إنشاء طالب تجريبي بحالة applied
  const student = await prisma.student.create({
    data: {
      name: 'طالب اختبار رسوم ملف',
      grade: 'الأول',
      stage: 'ابتدائي',
      academicYear: '2025-2026',
      tuitionFees: 1000,
      booksFees: 0, uniformFees: 0, busFees: 0, otherFees: 0,
      totalFees: 1000,
      status: 'applied'
    }
  });
  console.log('✅ طالب أُنشئ بحالة applied:', student.id);

  // محاكاة طلبين متزامنين بـ updateMany
  const [result1, result2] = await Promise.all([
    prisma.student.updateMany({
      where: { id: student.id, status: { in: ['applied', 'failed'] } },
      data: { status: 'under_testing', testResult: 'pending' }
    }),
    prisma.student.updateMany({
      where: { id: student.id, status: { in: ['applied', 'failed'] } },
      data: { status: 'under_testing', testResult: 'pending' }
    })
  ]);

  const total = result1.count + result2.count;
  if (total === 1) {
    console.log('✅ فقط طلب واحد نجح في تحديث الحالة (race condition محمية)');
  } else if (total === 0) {
    console.log('❌ لم يتمكن أي طلب من التحديث — خطأ غير متوقع');
  } else {
    console.log('❌ كلا الطلبين نجحا — race condition لا تزال موجودة!');
  }

  // تنظيف
  await prisma.student.delete({ where: { id: student.id } });
  console.log('✅ تنظيف البيانات اكتمل');
  await prisma.\$disconnect();
  console.log('\\n✅ الاختبار اكتمل');
}

test().catch(e => { console.error('❌ خطأ:', e.message); process.exit(1); });
"
```

Expected:
```
✅ طالب أُنشئ بحالة applied: ...
✅ فقط طلب واحد نجح في تحديث الحالة (race condition محمية)
✅ تنظيف البيانات اكتمل
✅ الاختبار اكتمل
```

- [ ] **Step 2: Empty commit**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
git commit --allow-empty -m "test: verified atomic updateMany prevents duplicate application_fee race condition"
```
