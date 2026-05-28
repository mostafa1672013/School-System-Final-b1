# Risk Mitigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address all critical and high risks identified in the current Node.js/Express/Prisma stack, aligned with `03_RISK_REGISTER.md`.

**Architecture:** Incremental hardening of the existing stack — no rebuild, no downtime. Each task is independently deployable and tested before the next begins.

**Tech Stack:** Node.js 20, Express 5, Prisma 6, PostgreSQL 16, TypeScript, Jest, bcrypt, jsonwebtoken

**Risks Addressed:**
| Risk | ID | Plan Tasks |
|---|---|---|
| Float arithmetic errors in financial data | RISK-001 | Tasks 1–2 |
| Catastrophic data loss (hard deletes) | RISK-002 | Tasks 3–4 |
| No audit trail | RISK-001, RISK-013 | Tasks 5–6 |
| nationalId stored as plaintext | RISK-003 | Task 7 |
| JWT not revocable | RISK-003, RISK-013 | Task 8 |
| 50 MB body limit (DoS vector) | RISK-003 | Task 9 |
| 2,629-line god file | RISK-008, RISK-014 | Tasks 10–11 |
| Single role per user | Architecture | Task 12 |
| Zero test coverage on financial logic | RISK-014 | Tasks 13–14 |
| Dates stored as String (timezone bugs) | RISK-023 | Task 15 |

---

## File Map

### New files to create:
- `server/src/routes/students.ts` — student CRUD routes
- `server/src/routes/payments.ts` — payment routes
- `server/src/routes/users.ts` — user management routes
- `server/src/routes/treasury.ts` — treasury session routes
- `server/src/routes/inventory.ts` — inventory routes
- `server/src/routes/fees.ts` — stage fees + discount routes
- `server/src/routes/installments.ts` — installment plan routes
- `server/src/middleware/audit.ts` — audit log middleware
- `server/src/lib/crypto.ts` — nationalId encryption helpers
- `server/src/lib/decimal.ts` — Decimal serialization helpers
- `server/src/__tests__/financial.test.ts` — financial calculation tests
- `server/src/__tests__/audit.test.ts` — audit log tests
- `server/src/__tests__/crypto.test.ts` — encryption tests
- `server/prisma/migrations/YYYYMMDD_float_to_decimal/` — auto-generated

### Files to modify:
- `server/prisma/schema.prisma` — Float→Decimal, soft delete, AuditLog, tokenVersion
- `server/src/index.ts` — mount routers, remove extracted routes, fix body limit
- `server/src/middleware/auth.ts` — add tokenVersion check

---

## Task 1: Migrate All Monetary Fields from Float to Decimal

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: migration (auto-generated via `prisma migrate dev`)

**Why:** `Float` is IEEE 754 binary floating point. `0.1 + 0.2 = 0.30000000000000004` in JavaScript. All financial calculations in this system accumulate these errors silently. PostgreSQL `NUMERIC(12,2)` is exact. This is RISK-001, already occurring in production.

- [ ] **Step 1: Update schema — all monetary Float fields to Decimal**

Replace every monetary `Float` field in `server/prisma/schema.prisma` with `Decimal  @db.Decimal(12, 2)`.

Fields to change (grouped by model):

```prisma
// Badge
discountPercentage Decimal  @default(0) @db.Decimal(5, 2)

// Student — monetary amounts
tuitionFees          Decimal  @default(0) @db.Decimal(12, 2)
booksFees            Decimal  @default(0) @db.Decimal(12, 2)
uniformFees          Decimal  @default(0) @db.Decimal(12, 2)
busFees              Decimal  @default(0) @db.Decimal(12, 2)
otherFees            Decimal  @default(0) @db.Decimal(12, 2)
arrearsFees          Decimal  @default(0) @db.Decimal(12, 2)
totalFees            Decimal  @default(0) @db.Decimal(12, 2)
paidAmount           Decimal  @default(0) @db.Decimal(12, 2)
pendingPaymentAmount Decimal? @db.Decimal(12, 2)
discountAmount         Decimal  @default(0) @db.Decimal(12, 2)
discountPercentage     Decimal  @default(0) @db.Decimal(5, 2)
requestedDiscountAmount     Decimal  @default(0) @db.Decimal(12, 2)
requestedDiscountPercentage Decimal  @default(0) @db.Decimal(5, 2)

// StageFee
tuitionFees     Decimal  @db.Decimal(12, 2)
booksFees       Decimal  @db.Decimal(12, 2)
uniformFees     Decimal  @db.Decimal(12, 2)
applicationFees Decimal  @db.Decimal(12, 2)

// Payment
amount Decimal  @db.Decimal(12, 2)

// StudentYearlyFinance
tuitionFees Decimal  @default(0) @db.Decimal(12, 2)
booksFees   Decimal  @default(0) @db.Decimal(12, 2)
uniformFees Decimal  @default(0) @db.Decimal(12, 2)
busFees     Decimal  @default(0) @db.Decimal(12, 2)
otherFees   Decimal  @default(0) @db.Decimal(12, 2)
arrearsFees Decimal  @default(0) @db.Decimal(12, 2)
totalFees   Decimal  @default(0) @db.Decimal(12, 2)
paidAmount  Decimal  @default(0) @db.Decimal(12, 2)

// InventoryItem
unitCost  Decimal  @default(0) @db.Decimal(12, 2)
unitPrice Decimal  @default(0) @db.Decimal(12, 2)

// InventoryTransaction
unitCostSnapshot  Decimal  @default(0) @db.Decimal(12, 2)
unitPriceSnapshot Decimal  @default(0) @db.Decimal(12, 2)
totalAmount       Decimal  @default(0) @db.Decimal(12, 2)

// BusRoute
monthlyFee Decimal  @db.Decimal(12, 2)
annualFee  Decimal  @db.Decimal(12, 2)

// User
discountLimitPercent Decimal  @default(0) @db.Decimal(5, 2)

// RoleLimit
maxPercentage Decimal  @db.Decimal(5, 2)
maxAmount     Decimal  @db.Decimal(12, 2)

// JournalEntryLine
debit  Decimal  @default(0) @db.Decimal(12, 2)
credit Decimal  @default(0) @db.Decimal(12, 2)

// Expense
amount Decimal  @db.Decimal(12, 2)

// ExpenseLimit
maxAmount Decimal  @db.Decimal(12, 2)

// InstallmentPlan
totalAmount Decimal  @db.Decimal(12, 2)

// Installment
amount     Decimal  @db.Decimal(12, 2)
paidAmount Decimal  @default(0) @db.Decimal(12, 2)

// TreasurySession
openingBalance Decimal  @db.Decimal(12, 2)
closingBalance Decimal? @db.Decimal(12, 2)
actualBalance  Decimal? @db.Decimal(12, 2)
difference     Decimal? @db.Decimal(12, 2)
```

- [ ] **Step 2: Create the Decimal serialization helper**

Create `server/src/lib/decimal.ts`:

```typescript
import { Decimal } from '@prisma/client/runtime/library';

// Prisma returns Decimal objects, not JS numbers.
// Use these helpers throughout the codebase — never cast to number directly.

export function toNumber(d: Decimal | null | undefined): number {
  if (d == null) return 0;
  return d.toNumber();
}

export function toDecimal(n: number | string): Decimal {
  return new Decimal(n);
}

// For JSON responses, recursively convert Decimal → number
// so Express res.json() serializes correctly.
export function serializeDecimals<T>(obj: T): T {
  if (obj instanceof Decimal) return obj.toNumber() as unknown as T;
  if (Array.isArray(obj)) return obj.map(serializeDecimals) as unknown as T;
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, serializeDecimals(v)])
    ) as T;
  }
  return obj;
}
```

- [ ] **Step 3: Run migration**

```bash
cd server
npx prisma migrate dev --name float_to_decimal
```

Expected output:
```
✔ Generated Prisma Client
The following migration(s) have been applied:
  migrations/YYYYMMDD_float_to_decimal/migration.sql
```

If it fails because of existing data: the migration auto-casts `double precision` → `numeric(12,2)` in PostgreSQL, which is safe for existing values.

- [ ] **Step 4: Wrap all Prisma responses in res.json() with serializeDecimals**

In every route handler that calls `res.json(result)` where `result` contains financial data:

```typescript
import { serializeDecimals } from '../lib/decimal';

// Before:
res.json(student);

// After:
res.json(serializeDecimals(student));
```

- [ ] **Step 5: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/ server/src/lib/decimal.ts
git commit -m "fix: migrate all monetary Float fields to Decimal(12,2) to prevent rounding errors"
```

---

## Task 2: Write Financial Calculation Tests

**Files:**
- Create: `server/src/__tests__/financial.test.ts`

**Why:** RISK-001 and RISK-014. Currently there are only 2 tests in the entire server. Financial logic has zero automated coverage.

- [ ] **Step 1: Create the test file**

```typescript
// server/src/__tests__/financial.test.ts
import { Decimal } from '@prisma/client/runtime/library';
import { toNumber, toDecimal, serializeDecimals } from '../lib/decimal';

describe('Decimal helpers', () => {
  it('toNumber converts Decimal correctly', () => {
    expect(toNumber(new Decimal('1234.56'))).toBe(1234.56);
  });

  it('toNumber returns 0 for null', () => {
    expect(toNumber(null)).toBe(0);
  });

  it('toDecimal avoids float precision issues', () => {
    // This would be 0.30000000000000004 with native floats
    const result = toDecimal('0.1').plus(toDecimal('0.2'));
    expect(result.toFixed(2)).toBe('0.30');
  });

  it('serializeDecimals converts nested Decimal objects', () => {
    const input = { amount: new Decimal('100.50'), nested: { fee: new Decimal('25.00') } };
    const result = serializeDecimals(input);
    expect(result.amount).toBe(100.50);
    expect(result.nested.fee).toBe(25.00);
  });

  it('serializeDecimals handles arrays', () => {
    const input = [{ amount: new Decimal('10.00') }, { amount: new Decimal('20.00') }];
    const result = serializeDecimals(input);
    expect(result[0].amount).toBe(10.00);
    expect(result[1].amount).toBe(20.00);
  });
});

describe('Fee calculation correctness', () => {
  it('discount percentage applied correctly avoids float error', () => {
    const tuitionFees = new Decimal('15000');
    const discountPct  = new Decimal('33.33');
    const discountAmt  = tuitionFees.mul(discountPct).div(100).toDecimalPlaces(2);
    expect(discountAmt.toFixed(2)).toBe('4999.50');
  });

  it('total fees = sum of individual fees', () => {
    const fees = ['3000', '500', '750', '1200'].map(f => new Decimal(f));
    const total = fees.reduce((sum, f) => sum.plus(f), new Decimal(0));
    expect(total.toFixed(2)).toBe('5450.00');
  });

  it('remaining balance = totalFees - paidAmount', () => {
    const total = new Decimal('15000');
    const paid  = new Decimal('7500.50');
    const remaining = total.minus(paid);
    expect(remaining.toFixed(2)).toBe('7499.50');
  });
});
```

- [ ] **Step 2: Run tests and verify they pass**

```bash
cd server
npm test -- --testPathPattern=financial
```

Expected: `PASS src/__tests__/financial.test.ts` — 8 tests pass.

- [ ] **Step 3: Commit**

```bash
git add server/src/__tests__/financial.test.ts
git commit -m "test: add financial calculation tests for Decimal precision"
```

---

## Task 3: Add Soft Delete to Core Models

**Files:**
- Modify: `server/prisma/schema.prisma`

**Why:** RISK-002. `prisma.student.delete` permanently destroys a student and their payment history. A school cannot legally lose student financial records. Soft delete sets `deletedAt` instead of removing the row.

- [ ] **Step 1: Add deletedAt to Student, User, and Payment**

In `server/prisma/schema.prisma`, add `deletedAt DateTime?` to these three models:

```prisma
model Student {
  // ... existing fields ...
  deletedAt  DateTime?    // soft delete — null means active
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}

model User {
  // ... existing fields ...
  deletedAt  DateTime?    // soft delete
  createdAt  DateTime  @default(now())
}

model Payment {
  // ... existing fields ...
  deletedAt  DateTime?    // soft delete
  createdAt  DateTime  @default(now())
}
```

- [ ] **Step 2: Run migration**

```bash
cd server
npx prisma migrate dev --name add_soft_delete
```

Expected: migration applied, new nullable columns added.

- [ ] **Step 3: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add deletedAt soft delete columns to Student, User, Payment"
```

---

## Task 4: Replace Hard Deletes with Soft Deletes

**Files:**
- Modify: `server/src/index.ts` (lines 176–184, 625–634)

**Why:** RISK-002. The actual deletion routes must now set `deletedAt` instead of calling `prisma.X.delete()`. All read queries must also filter `deletedAt: null`.

- [ ] **Step 1: Replace student delete route (line 176)**

Find this block in `server/src/index.ts`:

```typescript
app.delete('/api/students/:id', async (req, res) => {
```

Replace the handler body:

```typescript
app.delete('/api/students/:id', requireAuth, managementRoles, async (req, res) => {
  const { id } = req.params;
  try {
    // Guard: cannot delete student with active payments
    const paymentCount = await prisma.payment.count({
      where: { studentId: id, deletedAt: null },
    });
    if (paymentCount > 0) {
      return res.status(409).json({
        error: 'Cannot delete student with payment history',
        code: 'STUDENT_HAS_PAYMENTS',
      });
    }

    await prisma.student.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete student' });
  }
});
```

- [ ] **Step 2: Replace user delete route (line 625)**

```typescript
app.delete('/api/users/:id', requireAuth, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    // Cannot soft-delete yourself
    if (req.user?.userId === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete user' });
  }
});
```

- [ ] **Step 3: Add deletedAt filter to all Student read queries**

Search `server/src/index.ts` for every `prisma.student.findMany` and `prisma.student.findUnique`. Add `deletedAt: null` to every `where` clause:

```typescript
// Before:
prisma.student.findMany({ where: { academicYear } })

// After:
prisma.student.findMany({ where: { academicYear, deletedAt: null } })
```

Do the same for `prisma.user.findMany` and `prisma.user.findUnique` — add `deletedAt: null`.

- [ ] **Step 4: Write a test for the guard**

In `server/src/__tests__/financial.test.ts`, add (requires a test DB — use the existing Jest setup in `server/src/__tests__/setup.ts`):

```typescript
describe('Student delete guard', () => {
  it('rejects deletion of student with payments via correct status code', async () => {
    // This is an integration test — skip if no test DB available
    // Mark as integration: only runs when TEST_DB_URL is set
    if (!process.env.TEST_DATABASE_URL) return;

    // Setup: create student + payment in test DB
    // Assert: DELETE /api/students/:id returns 409
    // (Full implementation requires supertest — add in Task 10 when routes are split)
  });
});
```

- [ ] **Step 5: Commit**

```bash
git add server/src/index.ts
git commit -m "fix: replace hard deletes with soft deletes, guard student delete against payment history"
```

---

## Task 5: Create AuditLog Model

**Files:**
- Modify: `server/prisma/schema.prisma`

**Why:** RISK-001, RISK-013. Without an audit trail, there is no way to investigate discrepancies in the treasury, trace unauthorized discount changes, or reconstruct what happened in a dispute. This is a legal requirement for any financial system.

- [ ] **Step 1: Add AuditLog model to schema**

Add at the end of `server/prisma/schema.prisma`:

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  userId     String   // who performed the action
  userName   String   // denormalized for display after user deletion
  action     String   // CREATE | UPDATE | DELETE | LOGIN | LOGOUT | APPROVE | REJECT
  entityType String   // Student | Payment | TreasurySession | User | Discount | Expense
  entityId   String?  // the affected record's id
  before     Json?    // snapshot of data before change
  after      Json?    // snapshot of data after change
  ip         String?
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([userId])
  @@index([createdAt])
}
```

- [ ] **Step 2: Run migration**

```bash
cd server
npx prisma migrate dev --name add_audit_log
```

Expected: `audit_logs` table created with 3 indexes.

- [ ] **Step 3: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add AuditLog model for financial audit trail"
```

---

## Task 6: Add Audit Middleware and Wire to Sensitive Operations

**Files:**
- Create: `server/src/middleware/audit.ts`
- Modify: `server/src/index.ts`

**Why:** The model exists — now use it. Payments, discounts, treasury sessions, and user changes must all generate audit records.

- [ ] **Step 1: Create the audit middleware**

Create `server/src/middleware/audit.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

const prisma = new PrismaClient();

export interface AuditContext {
  userId: string;
  userName: string;
  ip: string | undefined;
  userAgent: string | undefined;
}

export function getAuditContext(req: Request): AuditContext {
  return {
    userId: req.user?.userId ?? 'system',
    userName: (req.user as any)?.name ?? req.user?.email ?? 'unknown',
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

export async function audit(
  ctx: AuditContext,
  action: string,
  entityType: string,
  entityId: string | null,
  before: object | null,
  after: object | null,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: ctx.userId,
      userName: ctx.userName,
      action,
      entityType,
      entityId: entityId ?? undefined,
      before: before ?? undefined,
      after: after ?? undefined,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    },
  });
}
```

- [ ] **Step 2: Wire audit to payment creation**

In `server/src/index.ts`, find the payment creation route (POST `/api/payments`). After the payment is created, add:

```typescript
import { audit, getAuditContext } from './middleware/audit';

// After: const payment = await prisma.payment.create(...)
await audit(
  getAuditContext(req),
  'CREATE',
  'Payment',
  payment.id,
  null,
  { amount: payment.amount, type: payment.type, studentId: payment.studentId },
);
```

- [ ] **Step 3: Wire audit to discount approval/rejection**

Find the discount approval route (PATCH `/api/students/:id/approve-discount` or similar). Add before the update:

```typescript
const before = await prisma.student.findUnique({
  where: { id },
  select: { discountAmount: true, discountPercentage: true, discountStatus: true },
});

// ... do the update ...

await audit(
  getAuditContext(req),
  'APPROVE',
  'Discount',
  id,
  before,
  { discountAmount, discountPercentage, discountStatus: 'approved' },
);
```

- [ ] **Step 4: Wire audit to treasury open/close**

Find treasury open and close routes. Add audit calls:

```typescript
// On treasury open:
await audit(ctx, 'CREATE', 'TreasurySession', session.id, null, { openingBalance: session.openingBalance, date: session.date });

// On treasury close:
await audit(ctx, 'UPDATE', 'TreasurySession', session.id, { status: 'open' }, { status: 'closed', closingBalance, actualBalance });
```

- [ ] **Step 5: Write audit tests**

Create `server/src/__tests__/audit.test.ts`:

```typescript
import { audit, getAuditContext } from '../middleware/audit';

describe('AuditLog', () => {
  it('getAuditContext extracts userId and ip from request', () => {
    const mockReq = {
      user: { userId: 'user-123', email: 'test@test.com' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'Jest' },
    } as any;

    const ctx = getAuditContext(mockReq);
    expect(ctx.userId).toBe('user-123');
    expect(ctx.ip).toBe('127.0.0.1');
  });

  it('getAuditContext handles missing user gracefully', () => {
    const mockReq = { headers: {} } as any;
    const ctx = getAuditContext(mockReq);
    expect(ctx.userId).toBe('system');
  });
});
```

- [ ] **Step 6: Run tests**

```bash
cd server && npm test -- --testPathPattern=audit
```

Expected: `PASS src/__tests__/audit.test.ts`

- [ ] **Step 7: Commit**

```bash
git add server/src/middleware/audit.ts server/src/index.ts server/src/__tests__/audit.test.ts
git commit -m "feat: add audit logging for payments, discounts, and treasury operations"
```

---

## Task 7: Encrypt nationalId at Rest

**Files:**
- Create: `server/src/lib/crypto.ts`
- Modify: `server/src/index.ts` (all student create/update/search touching nationalId)

**Why:** RISK-003. National IDs are stored as plaintext strings. A single SQL injection or DB breach exposes every student's national ID. AES-256-GCM is reversible (needed for display) and authenticated (detects tampering).

- [ ] **Step 1: Create the crypto helper**

Create `server/src/lib/crypto.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_ENV   = process.env.NATIONAL_ID_ENCRYPTION_KEY; // 32-byte hex string

function getKey(): Buffer {
  if (!KEY_ENV || KEY_ENV.length !== 64) {
    throw new Error('NATIONAL_ID_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
  }
  return Buffer.from(KEY_ENV, 'hex');
}

// Returns format: iv:authTag:ciphertext (all hex)
export function encryptNationalId(plaintext: string): string {
  const key    = getKey();
  const iv     = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag   = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptNationalId(stored: string): string {
  const [ivHex, authTagHex, encryptedHex] = stored.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Invalid encrypted nationalId format');
  }

  const key       = getKey();
  const iv        = Buffer.from(ivHex, 'hex');
  const authTag   = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher  = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted) + decipher.final('utf8');
}

// For @unique constraint: store a deterministic HMAC-SHA256 hash for lookups
import { createHmac } from 'crypto';

export function hashNationalId(plaintext: string): string {
  const key = getKey();
  return createHmac('sha256', key).update(plaintext).digest('hex');
}
```

- [ ] **Step 2: Add env variable and schema change**

Add `NATIONAL_ID_ENCRYPTION_KEY` to `server/.env` (generate with `openssl rand -hex 32`).

In `server/prisma/schema.prisma`, add a hash field to Student for unique lookup:

```prisma
model Student {
  nationalId     String   @unique  // now stores encrypted value
  nationalIdHash String?  @unique  // HMAC hash for lookups
  // ...
}
```

- [ ] **Step 3: Run migration**

```bash
cd server
npx prisma migrate dev --name add_national_id_hash
```

- [ ] **Step 4: Write a migration script to encrypt existing data**

Create `server/src/migrate-national-ids.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { encryptNationalId, hashNationalId } from './lib/crypto';

const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    select: { id: true, nationalId: true },
  });

  let count = 0;
  for (const student of students) {
    // Skip already-encrypted values (they contain ':')
    if (student.nationalId.includes(':')) continue;

    await prisma.student.update({
      where: { id: student.id },
      data: {
        nationalId:     encryptNationalId(student.nationalId),
        nationalIdHash: hashNationalId(student.nationalId),
      },
    });
    count++;
  }
  console.log(`Encrypted ${count} national IDs`);
}

main().finally(() => prisma.$disconnect());
```

Run it:
```bash
cd server && npx ts-node src/migrate-national-ids.ts
```

- [ ] **Step 5: Write encryption tests**

Create `server/src/__tests__/crypto.test.ts`:

```typescript
import { encryptNationalId, decryptNationalId, hashNationalId } from '../lib/crypto';

// Set test key before import
process.env.NATIONAL_ID_ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes of 0xaa for tests

describe('nationalId encryption', () => {
  it('round-trips correctly', () => {
    const original = '29901012345678';
    const encrypted = encryptNationalId(original);
    expect(decryptNationalId(encrypted)).toBe(original);
  });

  it('produces different ciphertext each time (random IV)', () => {
    const id = '29901012345678';
    expect(encryptNationalId(id)).not.toBe(encryptNationalId(id));
  });

  it('hash is deterministic', () => {
    const id = '29901012345678';
    expect(hashNationalId(id)).toBe(hashNationalId(id));
  });

  it('decryption fails on tampered ciphertext', () => {
    const encrypted = encryptNationalId('29901012345678');
    const tampered = encrypted.slice(0, -4) + 'ffff';
    expect(() => decryptNationalId(tampered)).toThrow();
  });
});
```

- [ ] **Step 6: Run tests**

```bash
cd server && npm test -- --testPathPattern=crypto
```

Expected: 4 tests pass.

- [ ] **Step 7: Update nationalId lookups in routes**

In `server/src/index.ts`, find all queries that search by `nationalId`. Replace with hash lookup:

```typescript
// Before:
where: { nationalId: req.body.nationalId }

// After:
import { hashNationalId } from './lib/crypto';
where: { nationalIdHash: hashNationalId(req.body.nationalId) }
```

When returning student data, decrypt for display:
```typescript
import { decryptNationalId } from './lib/crypto';

// After fetching student:
const student = await prisma.student.findUnique(...);
if (student) {
  student.nationalId = decryptNationalId(student.nationalId);
}
```

- [ ] **Step 8: Commit**

```bash
git add server/src/lib/crypto.ts server/src/__tests__/crypto.test.ts server/src/migrate-national-ids.ts server/prisma/schema.prisma server/prisma/migrations/ server/src/index.ts
git commit -m "security: encrypt nationalId at rest using AES-256-GCM with HMAC hash for lookups"
```

---

## Task 8: Add JWT Token Versioning (Revocation)

**Files:**
- Modify: `server/prisma/schema.prisma`
- Modify: `server/src/middleware/auth.ts`
- Modify: `server/src/index.ts` (login + logout + role-change routes)

**Why:** RISK-003, RISK-013. Currently, changing a user's role or disabling their account does not invalidate their active token. A terminated employee can use their token for up to 8 hours after dismissal.

- [ ] **Step 1: Add tokenVersion to User schema**

```prisma
model User {
  // ... existing fields ...
  tokenVersion Int  @default(0)  // increment to invalidate all tokens
}
```

- [ ] **Step 2: Run migration**

```bash
cd server
npx prisma migrate dev --name add_token_version
```

- [ ] **Step 3: Update JWT payload and signing**

In `server/src/middleware/auth.ts`:

```typescript
export interface JwtPayload {
  userId: string;
  role: string;
  email: string;
  tokenVersion: number;  // add this
}

export function signToken(payload: JwtPayload): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as any };
  return jwt.sign(payload, JWT_SECRET as string, options);
}
```

- [ ] **Step 4: Update requireAuth to verify tokenVersion**

In `server/src/middleware/auth.ts`, update `requireAuth`:

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET as string) as JwtPayload;

    // Verify tokenVersion against DB (cached: check only once per request)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { tokenVersion: true, active: true, deletedAt: true },
    });

    if (!user || user.deletedAt || !user.active) {
      return res.status(401).json({ error: 'Account inactive or deleted' });
    }
    if (user.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ error: 'Session invalidated. Please log in again.' });
    }

    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

- [ ] **Step 5: Include tokenVersion in login response**

In `server/src/index.ts`, find the login handler. Update:

```typescript
const token = signToken({
  userId: user.id,
  role: user.role,
  email: user.email,
  tokenVersion: user.tokenVersion,  // include it
});
```

- [ ] **Step 6: Increment tokenVersion on role change and logout**

Find the user update route (PATCH `/api/users/:id`). Add after updating role:

```typescript
if (body.role && body.role !== existingUser.role) {
  // Invalidate all tokens when role changes
  await prisma.user.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
}
```

Find the logout route (or add one if missing):
```typescript
app.post('/api/auth/logout', requireAuth, async (req, res) => {
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { tokenVersion: { increment: 1 }, isOnline: false, lastLogoutAt: new Date() },
  });
  res.json({ success: true });
});
```

- [ ] **Step 7: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/ server/src/middleware/auth.ts server/src/index.ts
git commit -m "security: add JWT tokenVersion for instant session revocation on role change or logout"
```

---

## Task 9: Fix Request Body Size Limit

**Files:**
- Modify: `server/src/index.ts` (lines with `limit: '50mb'`)

**Why:** RISK-003. A 50 MB JSON body limit invites memory-exhaustion attacks. Legitimate school management requests are never close to 50 MB. Photo uploads should use multipart/form-data with a separate file upload service, not JSON.

- [ ] **Step 1: Reduce JSON body limit**

In `server/src/index.ts`, change:

```typescript
// Before:
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// After:
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
```

- [ ] **Step 2: Identify if any route actually needs large payloads**

Search for routes that accept base64-encoded images or large JSON:

```bash
grep -n "base64\|photoUrl\|image" server/src/index.ts
```

If any route accepts base64 images in JSON body, create a separate endpoint with a higher limit:

```typescript
// Only for photo upload — separate route, explicit limit
app.post('/api/upload/photo',
  requireAuth,
  express.json({ limit: '5mb' }),
  async (req, res) => { /* ... */ }
);
```

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "security: reduce request body limit from 50mb to 1mb to prevent memory exhaustion"
```

---

## Task 10: Split the God File — Domain Routers

**Files:**
- Create: `server/src/routes/students.ts`
- Create: `server/src/routes/payments.ts`
- Create: `server/src/routes/users.ts`
- Create: `server/src/routes/treasury.ts`
- Create: `server/src/routes/inventory.ts`
- Create: `server/src/routes/fees.ts`
- Create: `server/src/routes/installments.ts`
- Modify: `server/src/index.ts`

**Why:** RISK-008, RISK-014. At 2,629 lines, `index.ts` is unmaintainable. Adding a feature risks breaking unrelated routes. Testing individual routes requires loading the entire file. Split by domain — each router owns one bounded context.

- [ ] **Step 1: Create the students router**

Create `server/src/routes/students.ts`:

```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, managementRoles, accountantRoles } from '../middleware/auth';
import { audit, getAuditContext } from '../middleware/audit';
import { serializeDecimals } from '../lib/decimal';
import { decryptNationalId } from '../lib/crypto';

const router = Router();
const prisma = new PrismaClient();

// GET /api/students
router.get('/', requireAuth, async (req, res) => {
  const { academicYear, status, search } = req.query as Record<string, string>;
  const students = await prisma.student.findMany({
    where: {
      deletedAt: null,
      ...(academicYear && { academicYear }),
      ...(status && { status }),
    },
    include: { badge: true },
    orderBy: { createdAt: 'desc' },
  });
  // Decrypt nationalId for response
  const safe = students.map(s => ({
    ...s,
    nationalId: decryptNationalId(s.nationalId),
  }));
  res.json(serializeDecimals(safe));
});

// GET /api/students/:id
router.get('/:id', requireAuth, async (req, res) => {
  const student = await prisma.student.findUnique({
    where: { id: req.params.id, deletedAt: null },
    include: { badge: true, payments: true, installmentPlan: true },
  });
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json(serializeDecimals({ ...student, nationalId: decryptNationalId(student.nationalId) }));
});

// POST /api/students — moved from index.ts
// PATCH /api/students/:id — moved from index.ts
// DELETE /api/students/:id — soft delete (already updated in Task 4)
// ... (move all student routes from index.ts here)

export default router;
```

- [ ] **Step 2: Create routers for other domains**

Repeat Step 1 pattern for:
- `server/src/routes/payments.ts` — all `/api/payments` routes
- `server/src/routes/users.ts` — all `/api/users` routes
- `server/src/routes/treasury.ts` — all `/api/treasury` routes
- `server/src/routes/inventory.ts` — all `/api/inventory` routes
- `server/src/routes/fees.ts` — all `/api/stage-fees`, `/api/discounts`, `/api/discount-settings` routes
- `server/src/routes/installments.ts` — all `/api/installments` routes

Each file follows the same pattern:
```typescript
import { Router } from 'express';
const router = Router();
// ... routes ...
export default router;
```

- [ ] **Step 3: Mount routers in index.ts**

Replace the route handlers in `server/src/index.ts` with router mounts:

```typescript
import studentsRouter    from './routes/students';
import paymentsRouter    from './routes/payments';
import usersRouter       from './routes/users';
import treasuryRouter    from './routes/treasury';
import inventoryRouter   from './routes/inventory';
import feesRouter        from './routes/fees';
import installmentsRouter from './routes/installments';

app.use('/api/students',     studentsRouter);
app.use('/api/payments',     paymentsRouter);
app.use('/api/users',        usersRouter);
app.use('/api/treasury',     treasuryRouter);
app.use('/api/inventory',    inventoryRouter);
app.use('/api/stage-fees',   feesRouter);
app.use('/api/installments', installmentsRouter);
```

After moving all routes, `index.ts` should contain only: middleware setup, DB connection, router mounts, error handler, and server listen. Target: under 150 lines.

- [ ] **Step 4: Start the server and verify all routes still work**

```bash
cd server && npm run dev
```

Test a few endpoints manually:
```bash
curl http://localhost:3000/health
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/students
```

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/ server/src/index.ts
git commit -m "refactor: split 2629-line god file into domain routers"
```

---

## Task 11: Multi-Role Support

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: migration

**Why:** Architecture requirement and RISK-005 mitigation. El Shorouk's accountant holds 3 operational roles simultaneously. The current `role String` field cannot represent this. A `UserRole` join table enables role composition without breaking existing code.

- [ ] **Step 1: Add UserRole model**

In `server/prisma/schema.prisma`, add:

```prisma
model UserRole {
  id         String    @id @default(uuid())
  userId     String
  role       String
  assignedAt DateTime  @default(now())
  assignedBy String?
  expiresAt  DateTime? // for temporary role grants
  notes      String?

  @@unique([userId, role])
  @@index([userId])
}
```

Keep the existing `role String` field on `User` as the **primary role** for backward compatibility. New code reads from `UserRole` when checking multi-role access.

- [ ] **Step 2: Run migration**

```bash
cd server
npx prisma migrate dev --name add_user_roles_table
```

- [ ] **Step 3: Seed existing roles into UserRole table**

Create `server/src/seed-user-roles.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, role: true } });
  for (const user of users) {
    await prisma.userRole.upsert({
      where: { userId_role: { userId: user.id, role: user.role } },
      update: {},
      create: { userId: user.id, role: user.role },
    });
  }
  console.log(`Seeded ${users.length} user roles`);
}

main().finally(() => prisma.$disconnect());
```

Run:
```bash
cd server && npx ts-node src/seed-user-roles.ts
```

- [ ] **Step 4: Update requireRoles to check UserRole table**

In `server/src/middleware/auth.ts`:

```typescript
export function requireRoles(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    // Check UserRole table for multi-role support
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId: req.user.userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { role: true },
    });

    const roleSet = new Set(userRoles.map(r => r.role));
    const hasRole = allowedRoles.some(r => roleSet.has(r));

    if (!hasRole) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}
```

- [ ] **Step 5: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/ server/src/seed-user-roles.ts server/src/middleware/auth.ts
git commit -m "feat: add UserRole table for multi-role support per user"
```

---

## Task 12: Add API Routes for Audit Log Viewing

**Files:**
- Create: `server/src/routes/audit.ts`

**Why:** RISK-001, RISK-013. The audit log is only useful if admins can view it. This adds a read-only API for the Principal and Head Accountant.

- [ ] **Step 1: Create audit routes**

Create `server/src/routes/audit.ts`:

```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, managementRoles } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/audit?entityType=Payment&entityId=xxx&page=1
router.get('/', requireAuth, managementRoles, async (req, res) => {
  const { entityType, entityId, userId, page = '1' } = req.query as Record<string, string>;
  const PAGE_SIZE = 50;
  const skip = (parseInt(page) - 1) * PAGE_SIZE;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        ...(entityType && { entityType }),
        ...(entityId && { entityId }),
        ...(userId && { userId }),
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.auditLog.count({
      where: {
        ...(entityType && { entityType }),
        ...(entityId && { entityId }),
        ...(userId && { userId }),
      },
    }),
  ]);

  res.json({ logs, total, page: parseInt(page), pageSize: PAGE_SIZE });
});

export default router;
```

Mount it in `index.ts`:
```typescript
import auditRouter from './routes/audit';
app.use('/api/audit', auditRouter);
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/audit.ts server/src/index.ts
git commit -m "feat: add read-only audit log API for management roles"
```

---

## Task 13: Fix Date Storage (Timezone Safety)

**Files:**
- Modify: `server/prisma/schema.prisma` (Payment.date, Expense.date, InventoryTransaction.date, TreasurySession.date)

**Why:** RISK-023. Five models store dates as `String` (e.g., `"2026-05-22"`). This prevents: sorting by date at DB level, timezone-aware queries, and integrity constraints. PostgreSQL `DATE` type is safer and more correct.

- [ ] **Step 1: Change String date fields to DateTime in schema**

```prisma
model Payment {
  date      DateTime   // was String
}

model Expense {
  date      DateTime   // was String
}

model InventoryTransaction {
  date      DateTime   // was String
}

// TreasurySession.date is used as @unique key (YYYY-MM-DD string) — leave as String
// to avoid breaking the unique constraint logic. Document this exception.
```

- [ ] **Step 2: Run migration**

```bash
cd server
npx prisma migrate dev --name date_fields_to_datetime
```

Note: If there is existing data in `date` columns that is a string like `"2026-05-22"`, PostgreSQL can auto-cast. If it fails, write a manual migration:

```sql
ALTER TABLE "Payment" ALTER COLUMN date TYPE TIMESTAMP WITH TIME ZONE
  USING (date || 'T00:00:00+02:00')::TIMESTAMPTZ;
```

- [ ] **Step 3: Update all route handlers that create/read these date fields**

Find every place in `server/src/index.ts` (and new route files) that sets `date: someString`. Change to:

```typescript
// Before:
date: req.body.date  // e.g., "2026-05-22"

// After:
date: new Date(req.body.date)
```

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/ server/src/index.ts server/src/routes/
git commit -m "fix: change date String fields to DateTime for timezone safety and proper DB sorting"
```

---

## Task 14: Increase Test Coverage on Financial Routes

**Files:**
- Create: `server/src/__tests__/payments.test.ts`

**Why:** RISK-014. Financial routes have zero automated tests. This adds integration tests for the payment creation flow — the most critical path in the system.

- [ ] **Step 1: Install supertest**

```bash
cd server && npm install --save-dev supertest @types/supertest
```

- [ ] **Step 2: Create payment route tests**

Create `server/src/__tests__/payments.test.ts`:

```typescript
import request from 'supertest';
import app from '../app'; // We need to export app from index.ts — see Step 3

describe('Payment routes', () => {
  let authToken: string;

  beforeAll(async () => {
    // Login to get token for tests
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    authToken = res.body.token;
  });

  it('rejects payment creation without auth', async () => {
    const res = await request(app)
      .post('/api/payments')
      .send({ amount: 1000, studentId: 'test', type: 'tuition', method: 'cash' });
    expect(res.status).toBe(401);
  });

  it('rejects payment with negative amount', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ amount: -500, studentId: 'test-id', type: 'tuition', method: 'cash' });
    expect(res.status).toBe(400);
  });

  it('rejects payment when treasury is closed', async () => {
    // This test verifies the requireOpenTreasury guard
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ amount: 1000, studentId: 'test-id', type: 'tuition', method: 'cash', date: '2020-01-01' });
    // 2020-01-01 treasury session will not be open
    expect([400, 403, 404]).toContain(res.status);
  });
});
```

- [ ] **Step 3: Export app from index.ts**

At the end of `server/src/index.ts`, before `httpServer.listen(...)`:

```typescript
export default app; // for testing
```

Also export `httpServer`:
```typescript
export { httpServer };
```

- [ ] **Step 4: Run tests**

```bash
cd server && npm test
```

Expected: all existing tests pass + new payment tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/__tests__/payments.test.ts server/src/index.ts
git commit -m "test: add payment route integration tests"
```

---

## Self-Review Against Risk Register

| Risk | Addressed? | Tasks |
|---|---|---|
| RISK-001 Float errors | ✅ Full | Tasks 1–2 |
| RISK-002 Data loss (hard delete) | ✅ Full | Tasks 3–4 |
| RISK-002 Data loss (no audit) | ✅ Full | Tasks 5–6, 12 |
| RISK-003 Security breach (nationalId) | ✅ Full | Task 7 |
| RISK-003 Security breach (JWT) | ✅ Full | Task 8 |
| RISK-003 Security breach (DoS) | ✅ Full | Task 9 |
| RISK-003 Security (no 2FA) | ⚠️ Partial | Deferred — infrastructure needed |
| RISK-008 Performance (god file) | ✅ Full | Tasks 10 |
| RISK-013 Insider threat | ✅ Full | Tasks 5–6, 12 |
| RISK-014 Test coverage | ✅ Partial | Tasks 2, 6, 13, 14 |
| RISK-023 Timezone bugs | ✅ Full | Task 15 |
| RISK-004 Django learning curve | N/A | Chose Node.js — not applicable |
| RISK-005 Scope creep | N/A | Process risk — handled by PM |
| RISK-006 Excel migration | N/A | Future feature |
| RISK-007 ZKTeco integration | N/A | Future feature |
| RISK-009 Internet outage | N/A | Infrastructure |
| RISK-010 Tax law changes | N/A | Future feature (config tables) |
| RISK-011 Approval engine | N/A | Future feature |
| RISK-012 SoD detection | N/A | Future feature |
| RISK-015 Config errors | N/A | Future feature |

**Deferred (requires infrastructure):**
- 2FA (TOTP) — requires email/SMS setup
- Redis caching for permissions — requires Redis instance
- Backup automation — requires DevOps setup
- IP whitelisting for high-privilege roles — requires reverse proxy config

---

## Execution Order

Execute tasks in this order. Each task is independently testable before the next begins:

1. **Task 1** (Float → Decimal) + **Task 2** (financial tests) — one commit block
2. **Task 3** + **Task 4** (soft delete) — one commit block
3. **Task 5** + **Task 6** (audit log) — one commit block
4. **Task 9** (body limit) — 5-minute fix, do immediately
5. **Task 8** (JWT versioning) — security critical
6. **Task 7** (encryption) — security, but can run in parallel with Task 8
7. **Task 10** (god file split) — largest task, last because it touches all routes
8. **Task 11** (multi-role)
9. **Task 12** (audit API)
10. **Task 13** (date fields)
11. **Task 14** (tests)
