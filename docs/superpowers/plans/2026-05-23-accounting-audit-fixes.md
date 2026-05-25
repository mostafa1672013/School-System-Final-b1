# إصلاح الأخطاء المحاسبية — نظام المدرسة

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** تصحيح 8 أخطاء محاسبية مكتشفة في النظام تؤدي إلى قائمة دخل خاطئة، وميزان مراجعة مشوَّه، وسجلات تدقيق ناقصة.

**Architecture:** كل خطأ يُعالَج في Task مستقل بترتيب الأولوية. Task 1 هو الأهم لأنه يُصحِّح قائمة الدخل بالكامل. كل Task يُنتج commit مستقل قابل للمراجعة.

**Tech Stack:** Node.js · Express · Prisma ORM · PostgreSQL · TypeScript

---

## الملفات المتأثرة

| الملف | التغييرات |
|---|---|
| `server/src/routes/payments.ts` | Task 1، 3، 4، 5 |
| `server/src/accounting-api.ts` | Task 2، 6 |
| `server/src/routes/purchasing.ts` | Task 2، 7 |
| `server/src/lib/accounting-helpers.ts` | Task 3 — ملف جديد |
| `server/prisma/schema.prisma` | Task 4 — إضافة نموذج |
| `server/prisma/migrations/` | Task 4 — migration جديدة |

---

## Task 1: إصلاح الجانب الدائن في قيد تحصيل رسوم الطلاب 🔴

> **الخطأ المُصحَّح:** الخطأ #1 + #4 من تقرير التدقيق
>
> **الوضع الحالي:** كل دفعة طالب (بخلاف رسوم القبول) تُقيَّد دائناً في حساب الذمم `1201` مما يُخرج قائمة الدخل بصفر إيرادات.
>
> **الوضع المطلوب:** كل دفعة تُقيَّد دائناً في حساب الإيراد المناسب حسب نوعها مع رقم قيد تسلسلي.

**Files:**
- Modify: `server/src/routes/payments.ts:104-155`

---

- [ ] **Step 1: إضافة دالة `getRevenueCreditCode` فوق `router.post('/payments')`**

في `server/src/routes/payments.ts`، أضف هذه الدالة مباشرة قبل السطر الذي يبدأ بـ `router.post('/payments', requireOpenTreasury`:

```typescript
function getRevenueCreditCode(type: string): string {
  const map: Record<string, string> = {
    tuition:         '4001', // إيرادات رسوم دراسية
    books:           '4002', // إيرادات كتب مدرسية
    uniform:         '4003', // إيرادات زي مدرسي
    bus:             '4004', // إيرادات نقل مدرسي
    application_fee: '4005', // رسوم قبول وتسجيل
    arrears:         '4001', // متأخرات = رسوم دراسية متأخرة
  };
  return map[type] ?? '4006'; // أي نوع آخر → إيرادات أخرى
}
```

- [ ] **Step 2: استبدال منطق `creditCode` الخاطئ**

ابحث في الملف عن هذين السطرين (حوالي السطر 112):
```typescript
const isAppFee = type === 'application_fee';
const creditCode = isAppFee ? '4005' : '1201';
```

استبدلهما بسطر واحد:
```typescript
const creditCode = getRevenueCreditCode(type);
```

- [ ] **Step 3: إضافة `entryNumber` تسلسلي داخل transaction الدفع**

داخل `prisma.$transaction([...])` (حوالي السطر 138)، أضف هذين السطرين **قبل** `prisma.journalEntry.create`:

```typescript
const jeCount = await prisma.journalEntry.count();
const jeNumber = `JE-${new Date().getFullYear()}-${String(jeCount + 1).padStart(6, '0')}`;
```

ثم حدّث `prisma.journalEntry.create` ليكون:
```typescript
prisma.journalEntry.create({
  data: {
    entryNumber: jeNumber,
    description: `تحصيل رسوم (${receiptNumber}) - الطالب: ${studentName}`,
    referenceType: 'payment',
    referenceId: receiptNumber,
    status: 'posted',
    postedAt: new Date(),
    lines: {
      create: [
        { accountId: debitAccount.id,  debit: amount, credit: 0,      lineNumber: 1 },
        { accountId: creditAccount.id, debit: 0,      credit: amount, lineNumber: 2 }
      ]
    }
  }
})
```

> **ملاحظة:** `prisma.$transaction([...])` هو array transaction وليس callback — الـ `jeCount` يجب أن يكون خارج المصفوفة لكن داخل نفس block الـ `try`. أضف السطرين قبل `const [payment] = await prisma.$transaction([`.

- [ ] **Step 4: التحقق يدوياً — تشغيل السيرفر وإنشاء دفعة تجريبية**

```bash
cd "server" && npm run dev
```

في متصفح أو Postman، سجِّل دفعة من نوع `tuition` لأي طالب، ثم افحص قاعدة البيانات:

```sql
SELECT je.entry_number, jel.line_number, jel.debit, jel.credit, a.code, a.name
FROM journal_entries je
JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
JOIN accounts a ON a.id = jel.account_id
WHERE je.reference_type = 'payment'
ORDER BY je.created_at DESC
LIMIT 4;
```

**النتيجة المتوقعة:**
```
entry_number   | line | debit  | credit | code | name
JE-2026-000XXX |  1   | 500.00 | 0.00   | 1001 | خزينة نقدية
JE-2026-000XXX |  2   | 0.00   | 500.00 | 4001 | إيرادات رسوم دراسية  ← ليس 1201
```

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/payments.ts
git commit -m "fix(accounting): credit revenue accounts on payment collection, not AR 1201"
```

---

## Task 2: ترقيم القيود Atomic في accounting-api و purchasing 🔴

> **الخطأ المُصحَّح:** الخطأ #3 من تقرير التدقيق
>
> **الوضع الحالي:** `count()` ثم `create()` في خطوتين = تكرار محتمل لأرقام القيود عند التزامن.
>
> **الوضع المطلوب:** حساب `entryNumber` داخل نفس الـ `$transaction` لضمان Atomicity.

**Files:**
- Modify: `server/src/accounting-api.ts:82-84` (قيد المصروفات)
- Modify: `server/src/accounting-api.ts:273-274` (القيود اليدوية)
- Modify: `server/src/accounting-api.ts:349-350` (قيود العكس)
- Modify: `server/src/routes/payments.ts:290-306` (قيد صرف المصروفات)
- Modify: `server/src/routes/purchasing.ts:284-286` (فاتورة المشتريات)
- Modify: `server/src/routes/purchasing.ts:385-387` (سداد الموردين)

---

- [ ] **Step 1: إصلاح `accounting-api.ts` — قيد صرف المصروف (expenses pay)**

في `server/src/accounting-api.ts`، داخل `router.patch('/expenses/:id/pay')` ابحث عن:
```typescript
const count = await tx.journalEntry.count();
const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
```
هذا الكود **داخل** `prisma.$transaction(async (tx) => {...})` لذا `tx.journalEntry.count()` آمن بالفعل — لا تغيير مطلوب هنا ✓

- [ ] **Step 2: إصلاح `accounting-api.ts` — القيود اليدوية (السطر 273)**

في `router.post('/journal-entries')` ابحث عن:
```typescript
const count = await prisma.journalEntry.count();
const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
```

هذا **خارج** transaction — ضعه داخل transaction أو استخدم `SELECT COUNT(*) FOR UPDATE` عبر raw query:
```typescript
// استبدل السطرين بـ:
const [{ count }] = await prisma.$queryRaw<[{ count: bigint }]>`
  SELECT COUNT(*)::bigint as count FROM journal_entries
`;
const entryNumber = `JE-${new Date().getFullYear()}-${String(Number(count) + 1).padStart(6, '0')}`;
```

- [ ] **Step 3: إصلاح `accounting-api.ts` — قيود العكس (السطر 349)**

في `router.patch('/journal-entries/:id/reverse')` داخل `prisma.$transaction(async (tx) => {...})` ابحث عن:
```typescript
const count = await tx.journalEntry.count();
const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
```
داخل callback transaction مع `tx` → آمن بالفعل ✓

- [ ] **Step 4: إصلاح `payments.ts` — قيد صرف المصروف**

في `server/src/routes/payments.ts`، في `router.patch('/expenses/:id/pay')` الموجود في هذا الملف (وليس `accounting-api.ts`)، داخل `prisma.$transaction(async (tx) => {...})` أضف:

```typescript
const result = await prisma.$transaction(async (tx) => {
  const exp = await tx.expense.update({
    where: { id: req.params.id as string },
    data: { status: 'paid', paidBy, paidByUserId: userId, sessionId: session.id },
    include: { account: true }
  });

  const creditCode = exp.paymentMethod === 'cash' ? '1001' : '1002';
  const creditAccount = await tx.account.findUnique({ where: { code: creditCode } });

  if (creditAccount) {
    // احسب entryNumber داخل transaction لضمان Atomicity
    const jeCount = await tx.journalEntry.count();
    const entryNumber = `JE-${new Date().getFullYear()}-${String(jeCount + 1).padStart(6, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    await tx.journalEntry.create({
      data: {
        entryNumber,
        entryDate: today,
        description: `صرف مصروف (${exp.id.slice(0, 8)}) - ${exp.description}`,
        referenceType: 'expense',
        referenceId: exp.id,
        status: 'posted',
        postedAt: new Date(),
        lines: {
          create: [
            { accountId: exp.accountId,   debit: exp.amount, credit: 0,          lineNumber: 1 },
            { accountId: creditAccount.id, debit: 0,          credit: exp.amount, lineNumber: 2 }
          ]
        }
      }
    });
  }
  return [exp];
});
```

- [ ] **Step 5: إصلاح `purchasing.ts` — فاتورة المشتريات (السطر 284)**

في `server/src/routes/purchasing.ts`، في `router.post('/invoices')` داخل transaction، الكود الحالي:
```typescript
const count = await tx.journalEntry.count();
const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
```
داخل `tx` callback → آمن ✓، لكن غيّر حساب المخزون من `1300` إلى `1303` (Task 7 سيُفصَّل لاحقاً):
```typescript
const invAccount = await tx.account.findUnique({ where: { code: '1303' } }); // مخزون أدوات مكتبية
```

- [ ] **Step 6: التحقق — أنشئ قيدَين متزامنَين**

```bash
# في terminal واحد:
curl -X POST http://localhost:3001/api/accounting/journal-entries \
  -H "Content-Type: application/json" \
  -d '{"entryDate":"2026-05-23","description":"اختبار 1","lines":[{"accountId":"ID1","debit":100,"credit":0},{"accountId":"ID2","debit":0,"credit":100}],"autoPost":true}' &

# في نفس الوقت:
curl -X POST http://localhost:3001/api/accounting/journal-entries \
  -H "Content-Type: application/json" \
  -d '{"entryDate":"2026-05-23","description":"اختبار 2","lines":[{"accountId":"ID1","debit":200,"credit":0},{"accountId":"ID2","debit":0,"credit":200}],"autoPost":true}' &
wait
```

تحقق أن الرقمين مختلفان:
```sql
SELECT entry_number FROM journal_entries ORDER BY created_at DESC LIMIT 2;
```

- [ ] **Step 7: Commit**

```bash
git add server/src/accounting-api.ts server/src/routes/payments.ts server/src/routes/purchasing.ts
git commit -m "fix(accounting): ensure journal entry numbering is atomic inside transactions"
```

---

## Task 3: ربط القيود التلقائية بالفترة المحاسبية 🟠

> **الخطأ المُصحَّح:** الخطأ #7 من تقرير التدقيق
>
> **الوضع الحالي:** قيود التحصيل والمشتريات والمصروفات تُنشأ بدون `periodId` → ميزان المراجعة الدوري خاطئ.
>
> **الوضع المطلوب:** كل قيد تلقائي يرتبط بالفترة المحاسبية المفتوحة ليوم القيد.

**Files:**
- Create: `server/src/lib/accounting-helpers.ts`
- Modify: `server/src/routes/payments.ts` (موضعان)
- Modify: `server/src/routes/purchasing.ts` (موضعان)

---

- [ ] **Step 1: إنشاء ملف `accounting-helpers.ts`**

أنشئ ملفاً جديداً `server/src/lib/accounting-helpers.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

/**
 * تجلب الفترة المحاسبية المفتوحة التي تقع فيها التاريخ المُعطى.
 * تعيد null إذا لم توجد فترة مفتوحة (لا تُوقف العملية — القيد يُسجَّل بدون فترة).
 */
export async function getActivePeriodId(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  date: string // YYYY-MM-DD
): Promise<string | null> {
  const period = await tx.accountingPeriod.findFirst({
    where: {
      startDate: { lte: date },
      endDate:   { gte: date },
      status: 'open'
    }
  });
  return period?.id ?? null;
}
```

- [ ] **Step 2: استيراد الدالة في `payments.ts`**

في أعلى `server/src/routes/payments.ts` أضف:
```typescript
import { getActivePeriodId } from '../lib/accounting-helpers';
```

- [ ] **Step 3: إضافة `periodId` لقيد تحصيل الطالب**

في `router.post('/payments')` داخل transaction، قبل `prisma.journalEntry.create`، أضف:
```typescript
const today = new Date().toISOString().split('T')[0];
const periodId = await getActivePeriodId(prisma, today);
```

ثم أضف `periodId: periodId ?? undefined` لـ `journalEntry.create`:
```typescript
prisma.journalEntry.create({
  data: {
    entryNumber: jeNumber,
    periodId: periodId ?? undefined,
    description: `تحصيل رسوم (${receiptNumber}) - الطالب: ${studentName}`,
    // ... باقي الحقول
  }
})
```

- [ ] **Step 4: إضافة `periodId` لقيد صرف المصروفات في `payments.ts`**

في `router.patch('/expenses/:id/pay')` داخل transaction، أضف نفس السطرين:
```typescript
const today = new Date().toISOString().split('T')[0];
const periodId = await getActivePeriodId(tx as any, today);
```

ثم أضف `periodId: periodId ?? undefined` لـ `tx.journalEntry.create`.

- [ ] **Step 5: استيراد الدالة في `purchasing.ts` وإضافة `periodId`**

في أعلى `server/src/routes/purchasing.ts` أضف:
```typescript
import { getActivePeriodId } from '../lib/accounting-helpers';
```

في `router.post('/invoices')` و `router.post('/payments')` داخل كل transaction، أضف:
```typescript
const entryDate = new Date(date).toISOString().split('T')[0];
const periodId = await getActivePeriodId(tx as any, entryDate);
```

ثم أضف `periodId: periodId ?? undefined` لكل `tx.journalEntry.create`.

- [ ] **Step 6: التحقق**

بعد تسجيل دفعة طالب، تحقق:
```sql
SELECT je.entry_number, je.period_id, ap.name_ar
FROM journal_entries je
LEFT JOIN accounting_periods ap ON ap.id = je.period_id
WHERE je.reference_type = 'payment'
ORDER BY je.created_at DESC LIMIT 2;
```

**المتوقع:** `period_id` غير null، و`name_ar` = الشهر الحالي.

- [ ] **Step 7: Commit**

```bash
git add server/src/lib/accounting-helpers.ts server/src/routes/payments.ts server/src/routes/purchasing.ts
git commit -m "feat(accounting): link auto-generated journal entries to active accounting period"
```

---

## Task 4: حماية سجل إغلاق الخزينة عند إعادة الفتح 🟠

> **الخطأ المُصحَّح:** الخطأ #6 من تقرير التدقيق
>
> **الوضع الحالي:** إعادة فتح الخزينة تمسح `closingBalance, actualBalance, difference, closedBy` — تلاعب بالسجلات.
>
> **الوضع المطلوب:** حفظ كل عمليات الإغلاق في جدول منفصل قبل أي مسح.

**Files:**
- Modify: `server/prisma/schema.prisma`
- Modify: `server/src/routes/payments.ts:720-755`

---

- [ ] **Step 1: إضافة نموذج `TreasurySessionAudit` في `schema.prisma`**

في `server/prisma/schema.prisma`، أضف بعد نموذج `TreasurySession`:

```prisma
model TreasurySessionAudit {
  id              String   @id @default(uuid())
  sessionId       String
  eventType       String   // "closed" | "reopened" | "close_approved"
  closingBalance  Decimal? @db.Decimal(12, 2)
  actualBalance   Decimal? @db.Decimal(12, 2)
  difference      Decimal? @db.Decimal(12, 2)
  closedBy        String?
  approvedBy      String?
  closureNote     String?
  performedBy     String
  createdAt       DateTime @default(now())

  @@index([sessionId])
  @@map("treasury_session_audits")
}
```

- [ ] **Step 2: تشغيل Migration**

```bash
cd server && npx prisma migrate dev --name add_treasury_session_audit
```

**المتوقع:** `✔ Your database is now in sync with your schema.`

- [ ] **Step 3: تسجيل أحداث الإغلاق في `close-approve`**

في `server/src/routes/payments.ts`، في handler `POST /treasury/close-approve`، بعد التحقق من الصلاحية وقبل تحديث الجلسة:

```typescript
// سجّل حدث الإغلاق في audit log
await prisma.treasurySessionAudit.create({
  data: {
    sessionId: session.id,
    eventType: 'close_approved',
    closingBalance: session.closingBalance,
    actualBalance:  session.actualBalance,
    difference:     session.difference,
    closedBy:       session.closedBy,
    approvedBy:     approver.name,
    closureNote:    session.closureNote,
    performedBy:    approvedByUserId
  }
});
```

- [ ] **Step 4: تسجيل حدث إعادة الفتح قبل المسح**

في handler `POST /treasury/reopen-approve`، قبل `prisma.treasurySession.update(...)`:

```typescript
// احفظ بيانات الإغلاق قبل مسحها
await prisma.treasurySessionAudit.create({
  data: {
    sessionId:     session.id,
    eventType:     'reopened',
    closingBalance: session.closingBalance,
    actualBalance:  session.actualBalance,
    difference:     session.difference,
    closedBy:       session.closedBy,
    approvedBy:     session.approvedBy,
    closureNote:    session.closureNote,
    performedBy:    approverId
  }
});
```

- [ ] **Step 5: التحقق**

أغلق الخزينة بفرق، وافق على الإغلاق، ثم اطلب إعادة الفتح ووافق عليها:
```sql
SELECT event_type, closing_balance, actual_balance, difference, closed_by, created_at
FROM treasury_session_audits
ORDER BY created_at DESC;
```

**المتوقع:** صفّان — واحد `close_approved` وواحد `reopened` مع كامل البيانات.

- [ ] **Step 6: Commit**

```bash
git add server/prisma/schema.prisma server/src/routes/payments.ts
git commit -m "feat(accounting): preserve treasury closure audit trail before reopen"
```

---

## Task 5: إضافة قيد فرق الخزينة عند الإغلاق 🔴

> **الخطأ المُصحَّح:** الخطأ #5 من تقرير التدقيق
>
> **الوضع الحالي:** فرق الخزينة يُحفظ كرقم في الجلسة لكن لا يُعالَج محاسبياً.
>
> **الوضع المطلوب:** قيد تلقائي يُثبِّت الفرق في الدفاتر عند الموافقة على الإغلاق.

**Files:**
- Modify: `server/src/routes/payments.ts` — handler `POST /treasury/close-approve`

---

- [ ] **Step 1: إضافة قيد الفرق في `close-approve`**

في `server/src/routes/payments.ts`، في handler `POST /treasury/close-approve`، داخل كتلة `try`، بعد تحديث الجلسة إلى `closed`، أضف:

```typescript
// إنشاء قيد فرق الخزينة إن وُجد فرق
const diff = Number(session.difference ?? 0);
if (Math.abs(diff) >= 0.01) {
  const today = new Date().toISOString().split('T')[0];
  const cashAccount = await prisma.account.findUnique({ where: { code: '1001' } });

  // عجز → Dr. مصروف طوارئ (5902)  Cr. خزينة (1001)
  // زيادة → Dr. خزينة (1001)  Cr. إيرادات أخرى (4006)
  const isShortage = diff < 0;
  const counterCode = isShortage ? '5902' : '4006';
  const counterAccount = await prisma.account.findUnique({ where: { code: counterCode } });

  if (cashAccount && counterAccount) {
    const jeCount = await prisma.journalEntry.count();
    const entryNumber = `JE-${new Date().getFullYear()}-${String(jeCount + 1).padStart(6, '0')}`;
    const absDiff = Math.abs(diff);
    const { getActivePeriodId } = await import('../lib/accounting-helpers');
    const periodId = await getActivePeriodId(prisma, today);

    await prisma.journalEntry.create({
      data: {
        entryNumber,
        entryDate:     today,
        periodId:      periodId ?? undefined,
        description:   `فرق جرد الخزينة — جلسة ${sessionId.slice(0, 8)} — ${isShortage ? 'عجز' : 'زيادة'}`,
        referenceType: 'treasury_difference',
        referenceId:   sessionId,
        status:        'posted',
        postedAt:      new Date(),
        postedBy:      approvedByUserId,
        createdBy:     approvedByUserId,
        lines: {
          create: isShortage
            ? [
                { accountId: counterAccount.id, debit: absDiff, credit: 0,       lineNumber: 1, description: 'عجز خزينة' },
                { accountId: cashAccount.id,    debit: 0,       credit: absDiff, lineNumber: 2, description: 'نقص رصيد نقدي' }
              ]
            : [
                { accountId: cashAccount.id,    debit: absDiff, credit: 0,       lineNumber: 1, description: 'زيادة رصيد نقدي' },
                { accountId: counterAccount.id, debit: 0,       credit: absDiff, lineNumber: 2, description: 'زيادة خزينة' }
              ]
        }
      }
    });
  }
}
```

- [ ] **Step 2: التحقق — أغلق الخزينة بفرق 50 جنيه عجز**

أدخل مبلغاً فعلياً أقل من المتوقع بـ 50 جنيه، وافق على الإغلاق، ثم:
```sql
SELECT je.entry_number, jel.debit, jel.credit, a.code, a.name
FROM journal_entries je
JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
JOIN accounts a ON a.id = jel.account_id
WHERE je.reference_type = 'treasury_difference'
ORDER BY je.created_at DESC LIMIT 2;
```

**المتوقع:**
```
entry_number   | debit | credit | code | name
JE-2026-000XXX | 50.00 | 0.00   | 5902 | مصروفات طوارئ
JE-2026-000XXX | 0.00  | 50.00  | 1001 | خزينة نقدية
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/payments.ts
git commit -m "feat(accounting): auto-create journal entry for treasury shortage/surplus on close-approve"
```

---

## Task 6: إصلاح الرصيد الجاري في دفتر الأستاذ 🟡

> **الخطأ المُصحَّح:** الخطأ #9 من تقرير التدقيق
>
> **الوضع الحالي:** الرصيد الجاري = `debit - credit` لجميع الحسابات → رصيد حسابات الخصوم والإيرادات مقلوب.
>
> **الوضع المطلوب:** الرصيد يُحسب باتجاه طبيعة الحساب.

**Files:**
- Modify: `server/src/accounting-api.ts:470-490`

---

- [ ] **Step 1: تحديث حلقة حساب الرصيد الجاري**

في `server/src/accounting-api.ts`، في handler `GET /reports/account-ledger`، ابحث عن:

```typescript
let runningBalance = 0;
const ledgerLines: any[] = [];

for (const entry of entries) {
  for (const line of entry.lines) {
    if (line.accountId === account.id) {
      runningBalance += Number(line.debit) - Number(line.credit);
```

استبدل السطر الأخير بـ:
```typescript
      const isDebitNormal = account.normalBalance === 'debit';
      runningBalance += isDebitNormal
        ? Number(line.debit) - Number(line.credit)
        : Number(line.credit) - Number(line.debit);
```

- [ ] **Step 2: التحقق — افتح دفتر أستاذ حساب 2001 (موردون)**

في واجهة المستخدم أو عبر API:
```
GET /api/accounting/reports/account-ledger?accountCode=2001
```

**المتوقع:** الرصيد الجاري يزيد (موجب) عند كل فاتورة مشتريات، ويقل عند كل دفعة للمورد.

- [ ] **Step 3: Commit**

```bash
git add server/src/accounting-api.ts
git commit -m "fix(accounting): compute running balance using account normalBalance in ledger report"
```

---

## Task 7: إصلاح حساب المخزون في قيد المشتريات 🟠

> **الخطأ المُصحَّح:** الخطأ #8 من تقرير التدقيق
>
> **الوضع الحالي:** قيد فاتورة المشتريات يُقيَّد مدينًا حساب المجموعة `1300` (`allowManualEntry: false`).
>
> **الوضع المطلوب:** القيد على الحساب التفصيلي المناسب `1303` (مستلزمات عامة).

**Files:**
- Modify: `server/src/routes/purchasing.ts:281`

---

- [ ] **Step 1: تغيير الكود**

في `server/src/routes/purchasing.ts`، في handler `POST /invoices`، ابحث عن:
```typescript
const invAccount = await tx.account.findUnique({ where: { code: '1300' } });
```

استبدله بـ:
```typescript
// 1303 = مخزون أدوات مكتبية — الحساب التفصيلي الافتراضي للمشتريات العامة
// في المستقبل يمكن تحديده من نوع الصنف (1301 كتب، 1302 زي، 1303 أدوات)
const invAccount = await tx.account.findUnique({ where: { code: '1303' } });
```

- [ ] **Step 2: التحقق**

أنشئ فاتورة مشتريات جديدة وافحص القيد:
```sql
SELECT a.code, a.name, jel.debit
FROM journal_entry_lines jel
JOIN accounts a ON a.id = jel.account_id
WHERE jel.debit > 0
  AND a.code LIKE '13%'
ORDER BY jel.created_at DESC LIMIT 1;
```

**المتوقع:** `code = 1303`، وليس `1300`.

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/purchasing.ts
git commit -m "fix(accounting): use detail inventory account 1303 in purchase invoice JE, not group 1300"
```

---

## Task 8: قيد فتح ذمم الطلاب عند تثبيت الرسوم 🔴

> **الخطأ المُصحَّح:** الخطأ #2 من تقرير التدقيق
>
> **الوضع الحالي:** لا يوجد قيد عند تثبيت رسوم الطالب — ذمم الطلاب (1201) لا تُفتح أبداً.
>
> **الوضع المطلوب:** عند انتقال الطالب من `fee_setup` إلى `admitted`، يُنشأ قيد إثبات الذمة وإيرادات العام.

> **ملاحظة:** هذا Task يُنفَّذ **بعد** Task 1. بعد Task 1 تكون الإيرادات تُسجَّل مباشرة عند التحصيل (Cash Basis). هذا Task يُضيف Accrual Basis كطبقة فوقها — يمكن تأجيله حتى يُقرِّر الإدارة الطريقة المطلوبة.

**Files:**
- Modify: `server/src/routes/students.ts` — موضع تثبيت حالة `admitted`

---

- [ ] **Step 1: تحديد موضع الكود في `students.ts`**

ابحث في `server/src/routes/students.ts` عن المكان الذي يغيّر `status` إلى `admitted`:
```bash
grep -n "admitted" server/src/routes/students.ts
```

- [ ] **Step 2: إضافة قيد فتح الذمة**

في المكان الذي يُحدَّث فيه الطالب إلى `admitted`، داخل transaction، أضف:

```typescript
// فتح الذمة عند الاعتماد
const feesBreakdown = [
  { code: '4001', amount: Number(student.tuitionFees) },
  { code: '4002', amount: Number(student.booksFees) },
  { code: '4003', amount: Number(student.uniformFees) },
  { code: '4004', amount: Number(student.busFees) },
  { code: '4006', amount: Number(student.otherFees) },
].filter(f => f.amount > 0);

if (feesBreakdown.length > 0) {
  const arAccount = await tx.account.findUnique({ where: { code: '1201' } });
  const revenueAccounts = await tx.account.findMany({
    where: { code: { in: feesBreakdown.map(f => f.code) } }
  });
  const codeToId = Object.fromEntries(revenueAccounts.map(a => [a.code, a.id]));

  if (arAccount) {
    const totalFees = feesBreakdown.reduce((s, f) => s + f.amount, 0);
    const jeCount = await tx.journalEntry.count();
    const entryNumber = `JE-${new Date().getFullYear()}-${String(jeCount + 1).padStart(6, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    await tx.journalEntry.create({
      data: {
        entryNumber,
        entryDate:     today,
        description:   `إثبات رسوم الطالب: ${student.name} — العام ${student.academicYear}`,
        referenceType: 'student_fees',
        referenceId:   student.id,
        status:        'posted',
        postedAt:      new Date(),
        lines: {
          create: [
            // مدين: ذمم الطالب بإجمالي الرسوم
            { accountId: arAccount.id, debit: totalFees, credit: 0, lineNumber: 1, description: `رسوم ${student.name}` },
            // دائن: كل نوع رسوم في حسابه
            ...feesBreakdown.map((f, idx) => ({
              accountId:  codeToId[f.code],
              debit:      0,
              credit:     f.amount,
              lineNumber: idx + 2,
              description: `إيراد نوع ${f.code}`
            }))
          ]
        }
      }
    });
  }
}
```

- [ ] **Step 3: التحقق**

اعتمد طالباً ثم افحص:
```sql
SELECT je.entry_number, jel.debit, jel.credit, a.code, a.name
FROM journal_entries je
JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
JOIN accounts a ON a.id = jel.account_id
WHERE je.reference_type = 'student_fees'
ORDER BY jel.line_number;
```

**المتوقع:** سطر مدين في 1201 + سطور دائنة في 4001/4002/4003/...

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/students.ts
git commit -m "feat(accounting): create AR opening entry on student admission"
```

---

## ملخص الـ Commits المتوقعة

```
fix(accounting): credit revenue accounts on payment collection, not AR 1201
fix(accounting): ensure journal entry numbering is atomic inside transactions
feat(accounting): link auto-generated journal entries to active accounting period
feat(accounting): preserve treasury closure audit trail before reopen
feat(accounting): auto-create journal entry for treasury shortage/surplus on close-approve
fix(accounting): compute running balance using account normalBalance in ledger report
fix(accounting): use detail inventory account 1303 in purchase invoice JE, not group 1300
feat(accounting): create AR opening entry on student admission
```

---

## Self-Review

**1. Spec coverage:**
- ✅ الخطأ 1 → Task 1
- ✅ الخطأ 2 → Task 8 (مؤجَّل — يعتمد على Task 1)
- ✅ الخطأ 3 → Task 2
- ✅ الخطأ 4 → Task 1 (Step 3)
- ✅ الخطأ 5 → Task 5
- ✅ الخطأ 6 → Task 4
- ✅ الخطأ 7 → Task 3
- ✅ الخطأ 8 → Task 7
- ✅ الخطأ 9 → Task 6
- ⏳ الخطأ 10 (خصومات) → خارج النطاق — يحتاج تصميم منفصل
- ⏳ الخطأ 11 (إغلاق السنة) → خارج النطاق — يحتاج تصميم منفصل

**2. Placeholder scan:** لا توجد TBD أو TODO بدون كود.

**3. Type consistency:** `getActivePeriodId` مُعرَّفة في Task 3 Step 1 ومستخدمة في Tasks 3 و 5.
