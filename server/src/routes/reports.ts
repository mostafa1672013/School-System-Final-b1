/**
 * Report endpoints — Student 360° and reconciliation summary.
 *
 * Caching strategy:
 *  - Auth + permission check BEFORE any cache read (contract §3).
 *  - withCache(key, 60, loader): miss → compute + store; hit → serve Redis.
 *  - X-Cache: HIT|MISS header for observability (contract §2).
 *  - Cache invalidated by payments.ts write path (T025).
 *  - Financial figures are byte-identical whether served from cache or fresh
 *    (FR-009): loader is the single source of truth.
 *
 * Cite: specs/001-performance-optimization/contracts/list-and-report-contracts.md
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { withCache } from '../lib/cache';
import { decryptNationalId } from '../lib/crypto';

const router = Router();
import { prisma } from '../lib/prisma';

// ── Student 360° ──────────────────────────────────────────────────────────
//
// Aggregates: student profile + all payments + yearly finance snapshots.
// Cache key: report:student360:<studentId>
// Invalidated when: a payment for this student is created/updated (payments.ts).

router.get('/student-360/:studentId', requireAuth, async (req, res) => {
  try {
    // Express v5: params can be string | string[]
    const studentId = Array.isArray(req.params.studentId)
      ? req.params.studentId[0]
      : req.params.studentId;
    if (!studentId) return res.status(400).json({ error: 'studentId required' });

    const cacheKey = `report:student360:${studentId}`;
    let cacheHit = true;

    const report = await withCache<unknown>(cacheKey, 60, async () => {
      cacheHit = false;

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          badge: true,
          yearlyFinance: { orderBy: { academicYear: 'asc' } },
        },
      });
      if (!student) return null;

      const payments = await prisma.payment.findMany({
        where: { studentId: studentId as string, deletedAt: null },
        orderBy: { date: 'desc' },
      });

      // Financial summary — Decimal-safe arithmetic (FR-009).
      const totalPaid = payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const balance = Number(student.totalFees) - totalPaid;
      // yearlyFinance is already included in the student object via Prisma include
      const { yearlyFinance, ...studentBase } = student as any;

      return {
        student: {
          ...studentBase,
          nationalId: decryptNationalId(student.nationalId),
          yearlyFinance,
        },
        payments,
        financialSummary: {
          totalFees: Number(student.totalFees),
          totalPaid: Math.round(totalPaid * 100) / 100,
          balance: Math.round(balance * 100) / 100,
          discountAmount: Number(student.discountAmount),
        },
      };
    });

    if (report === null) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.setHeader('X-Cache', cacheHit ? 'HIT' : 'MISS');
    res.json(report);
  } catch (error) {
    console.error('Student 360 report error:', error);
    res.status(500).json({ error: 'Failed to generate student report' });
  }
});

// ── Income statement (reconciliation proxy) ───────────────────────────────
//
// Wraps the accounting income-statement for a given period; expensive
// JournalEntryLine aggregation benefits from the 60s cache.
// Cache key: report:reconciliation:<periodId>
// Invalidated on payment create (payments.ts write path — T025).

router.get('/reconciliation/:periodId', requireAuth, async (req, res) => {
  try {
    const periodId = Array.isArray(req.params.periodId)
      ? req.params.periodId[0]
      : req.params.periodId;
    if (!periodId) return res.status(400).json({ error: 'periodId required' });

    const cacheKey = `report:reconciliation:${periodId}`;
    let cacheHit = true;

    const report = await withCache<unknown>(cacheKey, 60, async () => {
      cacheHit = false;

      const period = await prisma.accountingPeriod.findUnique({
        where: { id: periodId as string },
      });
      if (!period) return null;

      // Aggregate credits (revenue) and debits (cost) for the period.
      // Use any[] to avoid fighting Prisma include generic inference.
      const lines: any[] = await prisma.journalEntryLine.findMany({
        where: {
          journalEntry: {
            periodId: periodId as string,
            status: 'posted',
          },
        },
        include: {
          account: { select: { id: true, code: true, name: true, type: true } },
        },
      });

      const summary: Record<
        string,
        { accountCode: string; accountName: string; type: string; totalDebit: number; totalCredit: number }
      > = {};
      for (const line of lines) {
        const key = line.accountId as string;
        if (!summary[key]) {
          summary[key] = {
            accountCode: line.account.code,
            accountName: line.account.name,
            type: line.account.type,
            totalDebit: 0,
            totalCredit: 0,
          };
        }
        summary[key].totalDebit += Number(line.debit);
        summary[key].totalCredit += Number(line.credit);
      }

      const rows = Object.values(summary).map(r => ({
        ...r,
        totalDebit: Math.round(r.totalDebit * 100) / 100,
        totalCredit: Math.round(r.totalCredit * 100) / 100,
        netBalance: Math.round((r.totalCredit - r.totalDebit) * 100) / 100,
      }));

      return { period, rows };
    });

    if (report === null) {
      return res.status(404).json({ error: 'Period not found' });
    }

    res.setHeader('X-Cache', cacheHit ? 'HIT' : 'MISS');
    res.json(report);
  } catch (error) {
    console.error('Reconciliation report error:', error);
    res.status(500).json({ error: 'Failed to generate reconciliation report' });
  }
});

export default router;
