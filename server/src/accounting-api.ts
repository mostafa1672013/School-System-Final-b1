import { PrismaClient } from '@prisma/client';
import express from 'express';
import { requireAuth, requireRoles, adminOnly, accountantRoles } from './middleware/auth';

const prisma = new PrismaClient();
const router = express.Router();

// ======= EXPENSE LIMITS =======
router.get('/expense-limits', async (req, res) => {
  const limits = await prisma.expenseLimit.findMany();
  res.json(limits);
});

router.patch('/expense-limits/:role', requireAuth, adminOnly, async (req, res) => {
  const { maxAmount } = req.body;
  const role = Array.isArray(req.params.role) ? req.params.role[0] : req.params.role;
  const limit = await prisma.expenseLimit.upsert({
    where: { role },
    update: { maxAmount: Number(maxAmount) },
    create: { role, maxAmount: Number(maxAmount) }
  });
  res.json(limit);
});

// ======= EXPENSES =======
router.post('/expenses', requireAuth, accountantRoles, async (req, res) => {
  const { amount, date, description, accountId, paymentMethod, notes } = req.body;
  // Get requestedBy and role from JWT, not from request body
  const requestedBy = req.user!.userId;
  const role = req.user!.role;
  try {
    const limitRecord = await prisma.expenseLimit.findUnique({ where: { role } });
    const limit = limitRecord ? limitRecord.maxAmount : 0;
    const requiresApproval = amount > limit;
    const status = requiresApproval ? 'pending_approval' : 'pending_treasury';
    const expense = await prisma.expense.create({
      data: { amount: Number(amount), date, description, accountId, paymentMethod, requestedBy, notes, status }
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create expense request' });
  }
});

router.patch('/expenses/:id/approve', requireAuth, requireRoles('system_admin', 'school_director', 'head_accountant'), async (req, res) => {
  // Get approvedBy from JWT, not from request body
  const approvedBy = req.user!.userId;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const expense = await prisma.expense.update({
    where: { id },
    data: { status: 'pending_treasury', approvedBy }
  });
  res.json(expense);
});

router.patch('/expenses/:id/reject', requireAuth, requireRoles('system_admin', 'school_director', 'head_accountant'), async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const expense = await prisma.expense.update({
    where: { id },
    data: { status: 'rejected' }
  });
  res.json(expense);
});

router.patch('/expenses/:id/pay', requireAuth, accountantRoles, async (req, res) => {
  const { sessionId } = req.body;
  // Get paidBy and userId from JWT, not from request body
  const paidBy = req.user!.userId;
  const userId = req.user!.userId;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const exp = await tx.expense.update({
        where: { id },
        data: { status: 'paid', paidBy, paidByUserId: userId, sessionId },
        include: { account: true }
      });
      const creditCode = exp.paymentMethod === 'cash' ? '111001' : '111002';
      const creditAccount = await tx.account.findUnique({ where: { code: creditCode } });
      if (creditAccount) {
        const today = new Date().toISOString().split('T')[0];
        const count = await tx.journalEntry.count();
        const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
        await tx.journalEntry.create({
          data: {
            entryNumber,
            entryDate: today,
            description: `صرف مصروف: ${exp.description}`,
            referenceType: 'expense',
            referenceId: exp.id,
            status: 'posted',
            postedAt: new Date(),
            postedBy: userId,
            createdBy: userId,
            lines: {
              create: [
                { accountId: exp.accountId, debit: exp.amount, credit: 0, lineNumber: 1 },
                { accountId: creditAccount.id, debit: 0, credit: exp.amount, lineNumber: 2 }
              ]
            }
          }
        });
      }
      return exp;
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: 'Failed to process payment' });
  }
});

// ======= FISCAL YEARS =======
router.get('/fiscal-years', async (req, res) => {
  const years = await prisma.fiscalYear.findMany({
    include: { periods: true },
    orderBy: { yearCode: 'desc' }
  });
  res.json(years);
});

router.post('/fiscal-years', async (req, res) => {
  try {
    const { yearCode, nameAr, nameEn, startDate, endDate } = req.body;
    const year = await prisma.fiscalYear.create({
      data: { yearCode, nameAr, nameEn, startDate, endDate }
    });
    res.status(201).json(year);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create fiscal year' });
  }
});

router.patch('/fiscal-years/:id/close', async (req, res) => {
  try {
    const { closedBy } = req.body;
    const year = await prisma.fiscalYear.update({
      where: { id: req.params.id },
      data: { status: 'closed', closedAt: new Date(), closedBy }
    });
    res.json(year);
  } catch (error) {
    res.status(400).json({ error: 'Failed to close fiscal year' });
  }
});

// ======= ACCOUNTING PERIODS =======
router.get('/accounting-periods', async (req, res) => {
  const periods = await prisma.accountingPeriod.findMany({
    include: { fiscalYear: true },
    orderBy: { startDate: 'desc' }
  });
  res.json(periods);
});

router.post('/accounting-periods', async (req, res) => {
  try {
    const { periodCode, nameAr, nameEn, startDate, endDate, fiscalYearId } = req.body;
    const period = await prisma.accountingPeriod.create({
      data: { periodCode, nameAr, nameEn, startDate, endDate, fiscalYearId }
    });
    res.status(201).json(period);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create period' });
  }
});

router.patch('/accounting-periods/:id/close', async (req, res) => {
  try {
    const { closedBy } = req.body;
    const period = await prisma.accountingPeriod.update({
      where: { id: req.params.id },
      data: { status: 'closed', closedAt: new Date(), closedBy }
    });
    res.json(period);
  } catch (error) {
    res.status(400).json({ error: 'Failed to close period' });
  }
});

router.patch('/accounting-periods/:id/reopen', async (req, res) => {
  try {
    const period = await prisma.accountingPeriod.update({
      where: { id: req.params.id },
      data: { status: 'open', closedAt: null, closedBy: null }
    });
    res.json(period);
  } catch (error) {
    res.status(400).json({ error: 'Failed to reopen period' });
  }
});

// ======= COST CENTERS =======
router.get('/cost-centers', async (req, res) => {
  const centers = await prisma.costCenter.findMany({
    include: { children: true },
    orderBy: { code: 'asc' }
  });
  res.json(centers);
});

router.post('/cost-centers', async (req, res) => {
  try {
    const { code, nameAr, nameEn, description, parentId } = req.body;
    const center = await prisma.costCenter.create({
      data: { code, nameAr, nameEn, description, parentId: parentId || null }
    });
    res.status(201).json(center);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create cost center' });
  }
});

// ======= JOURNAL ENTRIES =======
router.get('/journal-entries', async (req, res) => {
  try {
    const { status, periodId, referenceType, referenceId } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (periodId) where.periodId = periodId;
    if (referenceType) where.referenceType = referenceType;
    if (referenceId) where.referenceId = referenceId;

    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        lines: { include: { account: true, costCenter: true }, orderBy: { lineNumber: 'asc' } },
        period: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch journal entries' });
  }
});

router.get('/journal-entries/:id', async (req, res) => {
  try {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: req.params.id },
      include: {
        lines: { include: { account: true, costCenter: true }, orderBy: { lineNumber: 'asc' } },
        period: true
      }
    });
    if (!entry) return res.status(404).json({ error: 'Not found' });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch journal entry' });
  }
});

router.post('/journal-entries', async (req, res) => {
  try {
    const { entryDate, description, notes, referenceType, referenceId, periodId, lines, autoPost, createdBy } = req.body;

    const totalDebit = lines.reduce((s: number, l: any) => s + (Number(l.debit) || 0), 0);
    const totalCredit = lines.reduce((s: number, l: any) => s + (Number(l.credit) || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      return res.status(400).json({ error: 'القيد غير متوازن: مجموع المدين يجب أن يساوي مجموع الدائن' });
    }
    if (lines.length < 2) {
      return res.status(400).json({ error: 'يجب أن يحتوي القيد على سطرين على الأقل' });
    }

    if (periodId) {
      const period = await prisma.accountingPeriod.findUnique({ where: { id: periodId } });
      if (period && period.status !== 'open') {
        return res.status(400).json({ error: 'الفترة المحاسبية مغلقة' });
      }
    }

    const count = await prisma.journalEntry.count();
    const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
    const status = autoPost ? 'posted' : 'draft';

    const entry = await prisma.journalEntry.create({
      data: {
        entryNumber,
        entryDate: entryDate || new Date().toISOString().split('T')[0],
        description,
        notes,
        referenceType,
        referenceId,
        periodId: periodId || null,
        status,
        createdBy,
        postedAt: autoPost ? new Date() : null,
        postedBy: autoPost ? createdBy : null,
        lines: {
          create: lines.map((l: any, idx: number) => ({
            accountId: l.accountId,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            description: l.description || null,
            costCenterId: l.costCenterId || null,
            lineNumber: idx + 1
          }))
        }
      },
      include: {
        lines: { include: { account: true }, orderBy: { lineNumber: 'asc' } }
      }
    });
    res.status(201).json(entry);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Failed to create journal entry' });
  }
});

router.patch('/journal-entries/:id/approve', async (req, res) => {
  try {
    const { approvedBy } = req.body;
    const entry = await prisma.journalEntry.update({
      where: { id: req.params.id },
      data: { status: 'approved', approvedAt: new Date(), approvedBy }
    });
    res.json(entry);
  } catch (error) {
    res.status(400).json({ error: 'Failed to approve' });
  }
});

router.patch('/journal-entries/:id/post', async (req, res) => {
  try {
    const { postedBy } = req.body;
    const entry = await prisma.journalEntry.update({
      where: { id: req.params.id },
      data: { status: 'posted', postedAt: new Date(), postedBy }
    });
    res.json(entry);
  } catch (error) {
    res.status(400).json({ error: 'Failed to post' });
  }
});

router.patch('/journal-entries/:id/reverse', async (req, res) => {
  try {
    const { reversedBy, reason } = req.body;
    const original = await prisma.journalEntry.findUnique({
      where: { id: req.params.id },
      include: { lines: true }
    });
    if (!original) return res.status(404).json({ error: 'Not found' });
    if (original.status !== 'posted') return res.status(400).json({ error: 'يمكن عكس القيود المرحلة فقط' });

    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.journalEntry.count();
      const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
      const today = new Date().toISOString().split('T')[0];

      const reversal = await tx.journalEntry.create({
        data: {
          entryNumber,
          entryDate: today,
          description: `عكس قيد: ${original.description} - ${reason || ''}`,
          referenceType: 'reversal',
          referenceId: original.id,
          status: 'posted',
          isReversal: true,
          reversalOfId: original.id,
          createdBy: reversedBy,
          postedAt: new Date(),
          postedBy: reversedBy,
          lines: {
            create: original.lines.map((l, idx) => ({
              accountId: l.accountId,
              debit: l.credit,
              credit: l.debit,
              description: 'عكس',
              lineNumber: idx + 1
            }))
          }
        }
      });

      await tx.journalEntry.update({
        where: { id: original.id },
        data: { status: 'reversed', reversedById: reversal.id }
      });

      return reversal;
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to reverse' });
  }
});

// ======= REPORTS =======

router.get('/reports/trial-balance', async (req, res) => {
  try {
    const { periodId, startDate, endDate } = req.query;

    let dateFilter: any = {};
    if (periodId) {
      const period = await prisma.accountingPeriod.findUnique({ where: { id: String(periodId) } });
      if (period) {
        dateFilter = { gte: period.startDate, lte: period.endDate };
      }
    } else if (startDate && endDate) {
      dateFilter = { gte: String(startDate), lte: String(endDate) };
    }

    const entries = await prisma.journalEntry.findMany({
      where: {
        status: 'posted',
        ...(Object.keys(dateFilter).length > 0 ? { entryDate: dateFilter } : {})
      },
      include: { lines: { include: { account: true } } }
    });

    const balanceMap = new Map<string, { account: any; totalDebit: number; totalCredit: number }>();

    for (const entry of entries) {
      for (const line of entry.lines) {
        const key = line.accountId;
        if (!balanceMap.has(key)) {
          balanceMap.set(key, { account: line.account, totalDebit: 0, totalCredit: 0 });
        }
        const bal = balanceMap.get(key)!;
        bal.totalDebit += line.debit;
        bal.totalCredit += line.credit;
      }
    }

    const result = Array.from(balanceMap.values())
      .map(({ account, totalDebit, totalCredit }) => ({
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        totalDebit,
        totalCredit,
        balance: Math.abs(totalDebit - totalCredit),
        balanceType: totalDebit > totalCredit ? 'debit' : totalDebit < totalCredit ? 'credit' : 'zero'
      }))
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    const grandTotalDebit = result.reduce((s, r) => s + r.totalDebit, 0);
    const grandTotalCredit = result.reduce((s, r) => s + r.totalCredit, 0);

    res.json({ lines: result, grandTotalDebit, grandTotalCredit });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reports/account-ledger', async (req, res) => {
  try {
    const { accountCode, startDate, endDate } = req.query;
    if (!accountCode) return res.status(400).json({ error: 'accountCode required' });

    const account = await prisma.account.findUnique({ where: { code: String(accountCode) } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const entries = await prisma.journalEntry.findMany({
      where: {
        status: 'posted',
        ...(startDate && endDate ? { entryDate: { gte: String(startDate), lte: String(endDate) } } : {}),
        lines: { some: { accountId: account.id } }
      },
      include: {
        lines: { include: { account: true }, orderBy: { lineNumber: 'asc' } }
      },
      orderBy: { entryDate: 'asc' }
    });

    let runningBalance = 0;
    const ledgerLines: any[] = [];

    for (const entry of entries) {
      for (const line of entry.lines) {
        if (line.accountId === account.id) {
          runningBalance += line.debit - line.credit;
          ledgerLines.push({
            entryDate: entry.entryDate,
            entryNumber: entry.entryNumber,
            description: line.description || entry.description,
            debit: line.debit,
            credit: line.credit,
            runningBalance
          });
        }
      }
    }

    res.json({ account, lines: ledgerLines });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reports/income-statement', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const entries = await prisma.journalEntry.findMany({
      where: {
        status: 'posted',
        ...(startDate && endDate ? { entryDate: { gte: String(startDate), lte: String(endDate) } } : {}),
        lines: {
          some: {
            account: { type: { in: ['revenue', 'expense', 'Revenue', 'Expense'] } }
          }
        }
      },
      include: {
        lines: {
          include: { account: true },
          where: { account: { type: { in: ['revenue', 'expense', 'Revenue', 'Expense'] } } }
        }
      }
    });

    const accountMap = new Map<string, { account: any; net: number }>();
    for (const entry of entries) {
      for (const line of entry.lines) {
        const key = line.accountId;
        if (!accountMap.has(key)) {
          accountMap.set(key, { account: line.account, net: 0 });
        }
        accountMap.get(key)!.net += line.debit - line.credit;
      }
    }

    const revenues: any[] = [];
    const expenses: any[] = [];
    let totalRevenue = 0;
    let totalExpense = 0;

    for (const { account, net } of accountMap.values()) {
      const isRevenue = account.type === 'revenue' || account.type === 'Revenue';
      if (isRevenue) {
        const amount = -net;
        revenues.push({ accountCode: account.code, accountName: account.name, amount });
        totalRevenue += amount;
      } else {
        expenses.push({ accountCode: account.code, accountName: account.name, amount: net });
        totalExpense += net;
      }
    }

    revenues.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    expenses.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    res.json({ revenues, expenses, totalRevenue, totalExpense, netIncome: totalRevenue - totalExpense });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reports/general-ledger', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const entries = await prisma.journalEntry.findMany({
      where: {
        status: 'posted',
        ...(startDate && endDate ? { entryDate: { gte: String(startDate), lte: String(endDate) } } : {})
      },
      include: {
        lines: { include: { account: true }, orderBy: { lineNumber: 'asc' } }
      },
      orderBy: [{ entryDate: 'asc' }, { entryNumber: 'asc' }]
    });
    res.json(entries);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
