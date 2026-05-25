# Preserve Payments on Student Deletion - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** عند حذف طالب، تبقى مدفوعاته محفوظة في الخزينة بدلاً من حذفها.

**Architecture:** المشكلة في `schema.prisma` — العلاقة بين `Payment` و`Student` مضبوطة على `onDelete: Cascade`، مما يحذف جميع المدفوعات عند حذف الطالب. الحل: تحويل `studentId` إلى nullable وتغيير السلوك إلى `SetNull`. بما أن `studentName` مخزن مباشرة على Payment، تبقى البيانات التاريخية سليمة. نحتاج أيضاً تحديث endpoint حذف الطالب في `index.ts` لتنظيف الـ installment plans يدوياً قبل الحذف (لأنها Cascade أيضاً وهذا مقبول).

**Tech Stack:** Prisma ORM, PostgreSQL, TypeScript, Express.js

---

### Task 1: Update Prisma Schema — Make Payment.studentId Nullable with SetNull

**Files:**
- Modify: `server/prisma/schema.prisma` (line 103 and 116)

- [ ] **Step 1: Edit the Payment model in schema.prisma**

في الملف `server/prisma/schema.prisma`، غيّر السطرين 103 و116:

```prisma
model Payment {
  id            String   @id @default(uuid())
  studentId     String?                          // ← غيّر من String إلى String?
  studentName   String
  amount        Float
  type          String
  method        String
  date          String
  receiptNumber String   @unique
  collectedBy   String
  userId        String?
  academicYear  String?
  notes         String?
  walletPhoneNumber String?
  sessionId     String?
  student       Student? @relation(fields: [studentId], references: [id], onDelete: SetNull)  // ← Student? و SetNull
  session       TreasurySession? @relation(fields: [sessionId], references: [id], onDelete: SetNull)
  createdAt     DateTime @default(now())
}
```

- [ ] **Step 2: Create and run the migration**

```bash
cd server
npx prisma migrate dev --name make_payment_student_id_nullable
```

Expected output:
```
✔ Generated Prisma Client
The following migration(s) have been applied:
  migrations/..._make_payment_student_id_nullable/migration.sql
```

- [ ] **Step 3: Verify the migration SQL makes sense**

```bash
cat server/prisma/migrations/$(ls server/prisma/migrations | grep make_payment_student_id_nullable)/migration.sql
```

Expected: يجب أن يحتوي على `ALTER COLUMN "studentId" DROP NOT NULL` وتغيير لـ foreign key constraint.

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "fix: make Payment.studentId nullable with SetNull to preserve payments on student deletion"
```

---

### Task 2: Fix TypeScript Build Errors from Nullable studentId

**Files:**
- Modify: `server/src/index.ts` (validation around studentId in POST /api/payments)

بعد تغيير `studentId` إلى nullable، قد يظهر خطأ TypeScript في أماكن تستخدم `studentId` كـ required. نتحقق ونصلح.

- [ ] **Step 1: Check for TypeScript errors**

```bash
cd server
npx tsc --noEmit 2>&1 | grep -i "studentId\|student" | head -30
```

- [ ] **Step 2: Fix validation in POST /api/payments (index.ts ~line 511)**

البحث عن:
```typescript
if (!studentId) {
```

هذا السطر يرفض الطلب إذا لم يُرسَل `studentId`. هذا السلوك **صحيح** ويجب إبقاؤه — لأن المدفوعات الجديدة تتطلب طالباً. لا حاجة لتغييره.

إذا ظهرت أخطاء TypeScript فقط بسبب `prisma.payment.create` حيث `studentId` أصبح optional في الـ type لكن نمرره دائماً، أضف type assertion أو تأكد أن القيمة موجودة:

في `server/src/index.ts` عند السطر الذي يحتوي `data: { studentId, ... }` داخل `prisma.payment.create`:

```typescript
// إذا أعطى TypeScript خطأ على studentId هنا فقط، أضف !
data: { studentId: studentId!, studentName, amount, type, method, date, receiptNumber, collectedBy, notes, academicYear, walletPhoneNumber, sessionId: session.id, userId }
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd server
npx tsc --noEmit 2>&1
```

Expected: لا أخطاء أو فقط تحذيرات غير متعلقة بالتغيير.

- [ ] **Step 4: Commit**

```bash
git add server/src/index.ts
git commit -m "fix: handle nullable studentId type in payment creation endpoint"
```

---

### Task 3: Manual Test — Verify Payments Survive Student Deletion

**Files:** لا تغييرات — فقط اختبار يدوي

- [ ] **Step 1: Start the server**

```bash
cd server
npm run dev
```

- [ ] **Step 2: Create a test student via API or UI, then record a payment**

إما من الواجهة أو:
```bash
# إنشاء طالب
curl -X POST http://localhost:3001/api/students \
  -H "Content-Type: application/json" \
  -d '{"name":"طالب تجريبي","grade":"الأول","stage":"ابتدائي","academicYear":"2025-2026","tuitionFees":1000,"booksFees":0,"uniformFees":0,"busFees":0,"otherFees":0,"totalFees":1000,"status":"active"}'
```

لاحظ الـ `id` في الاستجابة.

- [ ] **Step 3: Confirm payment exists in treasury**

```bash
curl http://localhost:3001/api/payments | python3 -m json.tool | grep -A5 "طالب تجريبي"
```

Expected: يظهر السجل.

- [ ] **Step 4: Delete the student**

```bash
curl -X DELETE http://localhost:3001/api/students/<ID_FROM_STEP_2>
```

Expected: `{"message":"تم حذف الطالب بنجاح"}` أو 200 OK.

- [ ] **Step 5: Verify payment still exists in treasury**

```bash
curl http://localhost:3001/api/payments | python3 -m json.tool | grep -A5 "طالب تجريبي"
```

Expected: **لا يزال يظهر السجل** مع `studentId: null` و `studentName: "طالب تجريبي"`.

- [ ] **Step 6: Commit if all looks good**

```bash
git commit --allow-empty -m "test: verified payments preserved after student deletion"
```

---

### Task 4: Update Student Delete Endpoint to Return Clear Response

**Files:**
- Modify: `server/src/index.ts` (lines 176–184)

تحديث رسالة النجاح لتكون واضحة.

- [ ] **Step 1: Read the current delete endpoint**

```typescript
// server/src/index.ts ~line 176
app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.student.delete({ where: { id } });
    res.json({ message: 'Student deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete student' });
  }
});
```

- [ ] **Step 2: Update the response message to Arabic and add context**

```typescript
app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.student.delete({ where: { id } });
    res.json({ message: 'تم حذف الطالب بنجاح. المدفوعات المسجلة محفوظة في الخزينة.' });
  } catch (error) {
    res.status(400).json({ error: 'فشل حذف الطالب' });
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "fix: update student delete response message (arabic, mentions payments preserved)"
```
