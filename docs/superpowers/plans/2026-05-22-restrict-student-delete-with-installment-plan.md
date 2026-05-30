# Restrict Student Deletion When Installment Plan Exists - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** منع حذف طالب لديه خطة أقساط نشطة، مع إظهار رسالة خطأ واضحة بالعربي.

**Architecture:** تغييران متزامنان — (1) تغيير `InstallmentPlan.studentId` من `onDelete: Cascade` إلى `onDelete: Restrict` في Prisma schema + migration، (2) تحديث endpoint حذف الطالب في `index.ts` للتحقق من وجود خطة أقساط قبل الحذف وإرجاع خطأ 400 بالعربي بدلاً من السماح لقاعدة البيانات بإلقاء استثناء غير واضح.

**Tech Stack:** Prisma ORM, PostgreSQL, TypeScript, Express.js

---

### Task 1: Update Prisma Schema — Change InstallmentPlan to Restrict on Student Delete

**Files:**
- Modify: `server/prisma/schema.prisma` (line 355)

- [ ] **Step 1: Edit the InstallmentPlan model**

في `server/prisma/schema.prisma`، السطر 355، غيّر:

```prisma
// قبل
student      Student       @relation(fields: [studentId], references: [id], onDelete: Cascade)

// بعد
student      Student       @relation(fields: [studentId], references: [id], onDelete: Restrict)
```

النموذج الكامل بعد التعديل:
```prisma
model InstallmentPlan {
  id           String        @id @default(uuid())
  studentId    String        @unique
  totalAmount  Float
  academicYear String
  status       String        @default("active") // active, completed
  installments Installment[]
  student      Student       @relation(fields: [studentId], references: [id], onDelete: Restrict)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}
```

لاحظ: `Installment` لا يرتبط مباشرة بـ Student، بل بـ `InstallmentPlan` فقط — لذا لا حاجة لتغيير `Installment` model.

- [ ] **Step 2: Run the migration**

```bash
cd "/Users/me/Downloads/Project/untitled folder/server"
npx prisma migrate dev --name restrict_installment_plan_on_student_delete
```

Expected output:
```
✔ Generated Prisma Client
The following migration(s) have been applied:
  migrations/..._restrict_installment_plan_on_student_delete/migration.sql
```

- [ ] **Step 3: Verify the migration SQL**

```bash
cat "/Users/me/Downloads/Project/untitled folder/server/prisma/migrations/$(ls '/Users/me/Downloads/Project/untitled folder/server/prisma/migrations' | grep restrict_installment)/migration.sql"
```

Expected: يحتوي على `DROP CONSTRAINT` ثم `ADD CONSTRAINT ... ON DELETE RESTRICT` (أو `NO ACTION` وهو مكافئ في PostgreSQL).

- [ ] **Step 4: Commit**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "fix: change InstallmentPlan to onDelete: Restrict to prevent accidental student deletion"
```

---

### Task 2: Update Delete Student Endpoint — Pre-check for Installment Plan

**Files:**
- Modify: `server/src/index.ts` (lines 175–184)

نضيف فحصاً صريحاً قبل الحذف بدلاً من الاعتماد على خطأ قاعدة البيانات — هذا يعطي رسالة خطأ واضحة بالعربي للمستخدم.

- [ ] **Step 1: Replace the delete student endpoint**

في `server/src/index.ts`، ابحث عن:
```typescript
// Delete student
app.delete('/api/students/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    await prisma.student.delete({ where: { id } });
    res.json({ message: 'تم حذف الطالب بنجاح. المدفوعات المسجلة محفوظة في الخزينة.' });
  } catch (error) {
    res.status(400).json({ error: 'فشل حذف الطالب' });
  }
});
```

واستبدله بـ:
```typescript
// Delete student
app.delete('/api/students/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const existingPlan = await prisma.installmentPlan.findUnique({ where: { studentId: id } });
    if (existingPlan) {
      return res.status(400).json({ error: 'لا يمكن حذف الطالب — يوجد خطة أقساط نشطة، يرجى إنهاؤها أو حذفها أولاً.' });
    }
    await prisma.student.delete({ where: { id } });
    res.json({ message: 'تم حذف الطالب بنجاح. المدفوعات المسجلة محفوظة في الخزينة.' });
  } catch (error) {
    res.status(400).json({ error: 'فشل حذف الطالب' });
  }
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/me/Downloads/Project/untitled folder/server"
npx tsc --noEmit 2>&1
```

Expected: لا أخطاء.

- [ ] **Step 3: Commit**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
git add server/src/index.ts
git commit -m "fix: block student deletion when active installment plan exists, show Arabic error"
```

---

### Task 3: End-to-End Verification via Node.js Script

**Files:** لا تغييرات — فقط اختبار

- [ ] **Step 1: Run the verification script**

```bash
cd "/Users/me/Downloads/Project/untitled folder/server"
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  // إنشاء طالب تجريبي
  const student = await prisma.student.create({
    data: {
      name: 'طالب اختبار أقساط',
      grade: 'الأول',
      stage: 'ابتدائي',
      academicYear: '2025-2026',
      tuitionFees: 1000,
      booksFees: 0, uniformFees: 0, busFees: 0, otherFees: 0,
      totalFees: 1000,
      status: 'active'
    }
  });
  console.log('✅ طالب أُنشئ:', student.id);

  // إنشاء خطة أقساط
  const plan = await prisma.installmentPlan.create({
    data: {
      studentId: student.id,
      totalAmount: 1000,
      academicYear: '2025-2026',
      installments: {
        create: [{ amount: 500, dueDate: '2025-10-01' }, { amount: 500, dueDate: '2025-11-01' }]
      }
    }
  });
  console.log('✅ خطة أقساط أُنشئت:', plan.id);

  // محاولة حذف الطالب — يجب أن تفشل على مستوى DB (Restrict)
  try {
    await prisma.student.delete({ where: { id: student.id } });
    console.log('❌ الطالب حُذف — يجب ألا يحدث هذا!');
  } catch (e) {
    console.log('✅ حذف الطالب رُفض على مستوى DB كما هو متوقع');
  }

  // تنظيف: حذف الخطة ثم الطالب
  await prisma.installmentPlan.delete({ where: { id: plan.id } });
  await prisma.student.delete({ where: { id: student.id } });
  console.log('✅ تنظيف البيانات التجريبية اكتمل');

  // اختبار: طالب بدون خطة أقساط يُحذف بنجاح
  const student2 = await prisma.student.create({
    data: {
      name: 'طالب بدون أقساط',
      grade: 'الثاني',
      stage: 'ابتدائي',
      academicYear: '2025-2026',
      tuitionFees: 500,
      booksFees: 0, uniformFees: 0, busFees: 0, otherFees: 0,
      totalFees: 500,
      status: 'active'
    }
  });
  await prisma.student.delete({ where: { id: student2.id } });
  console.log('✅ طالب بدون أقساط حُذف بنجاح');

  await prisma.\$disconnect();
  console.log('\\n✅ جميع الاختبارات اجتازت بنجاح');
}

test().catch(e => { console.error('❌ خطأ:', e.message); process.exit(1); });
"
```

Expected output:
```
✅ طالب أُنشئ: ...
✅ خطة أقساط أُنشئت: ...
✅ حذف الطالب رُفض على مستوى DB كما هو متوقع
✅ تنظيف البيانات التجريبية اكتمل
✅ طالب بدون أقساط حُذف بنجاح
✅ جميع الاختبارات اجتازت بنجاح
```

- [ ] **Step 2: Commit verification result (empty commit)**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
git commit --allow-empty -m "test: verified student deletion blocked when installment plan exists"
```
