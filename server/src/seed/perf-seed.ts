/**
 * Performance seed — generates full-academic-year volume for load/perf testing.
 *
 * Inserts (configurable via env):
 *   - 10,000+ students
 *   - 10,000+ payments (linked to those students)
 *   - 10,000+ inventory items
 *   - 10,000+ inventory transactions (linked to those items)
 *
 * All inserts are batched with `createMany` for speed. Explicit UUIDs are
 * generated up-front so child rows can reference parents without round-trips.
 *
 * Usage:  npm run seed:perf
 * Tunable: PERF_SEED_STUDENTS, PERF_SEED_PAYMENTS, PERF_SEED_ITEMS,
 *          PERF_SEED_TX  (all integers)
 *
 * NOTE: This is test/volume data only. Do NOT run against production.
 */
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';

const STUDENTS = Number.parseInt(process.env.PERF_SEED_STUDENTS ?? '10000', 10);
const PAYMENTS = Number.parseInt(process.env.PERF_SEED_PAYMENTS ?? '12000', 10);
const ITEMS = Number.parseInt(process.env.PERF_SEED_ITEMS ?? '10000', 10);
const TX = Number.parseInt(process.env.PERF_SEED_TX ?? '12000', 10);
const BATCH = 1000;

const STAGES = ['primary', 'preparatory', 'secondary'];
const GRADES = ['1', '2', '3', '4', '5', '6'];
const ACADEMIC_YEAR = '2025-2026';
const CATEGORIES = ['books', 'uniform', 'stationery', 'supplies'];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

/** Spread a date across the academic year (Sep → Jun) for realistic ranges. */
function yearDate(i: number): Date {
  const start = new Date('2025-09-01').getTime();
  const end = new Date('2026-06-30').getTime();
  return new Date(start + ((end - start) * (i % 300)) / 300);
}

async function insertInBatches<T>(
  label: string,
  rows: T[],
  create: (chunk: T[]) => Promise<unknown>,
) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await create(chunk);
    process.stdout.write(
      `\r  ${label}: ${Math.min(i + BATCH, rows.length)}/${rows.length}`,
    );
  }
  process.stdout.write('\n');
}

async function main() {
  const runId = Date.now().toString(36);
  console.log(
    `Perf seed start (runId=${runId}): students=${STUDENTS} payments=${PAYMENTS} items=${ITEMS} tx=${TX}`,
  );

  // ---- Students -----------------------------------------------------------
  const studentIds: string[] = [];
  const students = Array.from({ length: STUDENTS }, (_, i) => {
    const id = randomUUID();
    studentIds.push(id);
    const tuition = 10000 + (i % 20) * 500;
    return {
      id,
      // nationalId is unique + required; namespace by runId to avoid clashes.
      nationalId: `PERF-${runId}-${i}`,
      name: `Perf Student ${i}`,
      stage: pick(STAGES, i),
      grade: pick(GRADES, i),
      academicYear: ACADEMIC_YEAR,
      guardianName: `Guardian ${i}`,
      guardianPhone: `+2010${String(i).padStart(8, '0')}`,
      status: 'admitted',
      tuitionFees: tuition,
      totalFees: tuition,
      paidAmount: (i % 5) * 1000,
    };
  });
  await insertInBatches('students', students, (chunk) =>
    prisma.student.createMany({ data: chunk, skipDuplicates: true }),
  );

  // ---- Payments (linked to students) -------------------------------------
  const payments = Array.from({ length: PAYMENTS }, (_, i) => {
    const sid = studentIds[i % studentIds.length];
    return {
      studentId: sid,
      studentName: `Perf Student ${i % STUDENTS}`,
      amount: 500 + (i % 10) * 100,
      type: pick(['tuition', 'books', 'uniform', 'bus'], i),
      method: pick(['cash', 'wallet', 'transfer'], i),
      date: yearDate(i),
      receiptNumber: `PERF-RC-${runId}-${i}`,
      collectedBy: 'perf-seed',
      academicYear: ACADEMIC_YEAR,
    };
  });
  await insertInBatches('payments', payments, (chunk) =>
    prisma.payment.createMany({ data: chunk, skipDuplicates: true }),
  );

  // ---- Inventory items ----------------------------------------------------
  const itemIds: string[] = [];
  const items = Array.from({ length: ITEMS }, (_, i) => {
    const id = randomUUID();
    itemIds.push(id);
    return {
      id,
      name: `Perf Item ${i}`,
      category: pick(CATEGORIES, i),
      quantity: 100 + (i % 50),
      unitPrice: 10 + (i % 90),
      unitCost: 5 + (i % 45),
      grade: pick(GRADES, i),
      lastUpdated: ACADEMIC_YEAR,
    };
  });
  await insertInBatches('items', items, (chunk) =>
    prisma.inventoryItem.createMany({ data: chunk, skipDuplicates: true }),
  );

  // ---- Inventory transactions (linked to items) --------------------------
  const txs = Array.from({ length: TX }, (_, i) => {
    const iid = itemIds[i % itemIds.length];
    const qty = 1 + (i % 10);
    const unitPrice = 10 + (i % 90);
    return {
      itemId: iid,
      type: pick(['in', 'out'], i),
      subType: i % 2 === 0 ? 'sale' : 'purchase',
      quantity: qty,
      unitPriceSnapshot: unitPrice,
      unitCostSnapshot: 5 + (i % 45),
      totalAmount: qty * unitPrice,
      performedBy: 'perf-seed',
      date: yearDate(i),
    };
  });
  await insertInBatches('transactions', txs, (chunk) =>
    prisma.inventoryTransaction.createMany({ data: chunk, skipDuplicates: true }),
  );

  console.log('Perf seed complete.');
}

main()
  .catch((err) => {
    console.error('Perf seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
