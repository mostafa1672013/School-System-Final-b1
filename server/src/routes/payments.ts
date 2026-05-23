import express, { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { audit, getAuditContext } from '../middleware/audit';
import { getActivePeriodId } from '../lib/accounting-helpers';

const router = Router();
const prisma = new PrismaClient();

// ===== Treasury Guard Middleware =====
async function requireOpenTreasury(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    // Get userId from JWT token, not from request body
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED_USER',
      });
    }

    const session = await prisma.treasurySession.findUnique({
      where: { date: today }
    });

    if (!session || session.status !== 'open') {
      return res.status(403).json({
        error: 'الخزينة مغلقة أو في انتظار الموافقة',
        code: 'TREASURY_CLOSED',
        message: 'يجب فتح الخزينة أولاً قبل تسجيل أي عملية مالية'
      });
    }

    if (session.openedBy !== userId) {
      return res.status(403).json({
        error: 'صلاحية مرفوضة',
        code: 'UNAUTHORIZED_USER',
        message: 'فقط الشخص الذي فتح الخزينة يمكنه إجراء العمليات عليها'
      });
    }

    (req as any).treasurySession = session;
    next();
  } catch (error) {
    res.status(500).json({ error: 'فشل التحقق من حالة الخزينة' });
  }
}

// ===== PAYMENTS =====

router.get('/payments', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { deletedAt: null },
      orderBy: { date: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

function getRevenueCreditCode(type: string): string {
  const map: Record<string, string> = {
    tuition:         '4001',
    books:           '4002',
    uniform:         '4003',
    bus:             '4004',
    application_fee: '4005',
    arrears:         '4001',
  };
  return map[type] ?? '4006';
}

router.post('/payments', requireOpenTreasury, async (req, res) => {
  const { studentId, studentName, amount, type, method, date, receiptNumber, collectedBy, notes, academicYear, walletPhoneNumber, userId } = req.body;
  const session = (req as any).treasurySession;

  if (!studentId) {
    return res.status(400).json({ error: 'معرف الطالب مطلوب' });
  }

  // Validation: Amount must be greater than zero
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'المبلغ يجب أن يكون أكبر من صفر', code: 'INVALID_AMOUNT' });
  }

  if (type === 'arrears') {
    const currentStudent = await prisma.student.findUnique({ where: { id: studentId }, select: { arrearsFees: true } });
    if (!currentStudent) return res.status(404).json({ error: 'الطالب غير موجود' });
    if (amount > currentStudent.arrearsFees) {
      return res.status(400).json({ error: 'مبلغ السداد أكبر من المتأخرات المستحقة' });
    }
  }

  // CRITICAL: Prevent duplicate application fee payments
  if (type === 'application_fee') {
    const currentStudent = await prisma.student.findUnique({ where: { id: studentId }, select: { status: true } });
    if (!currentStudent) return res.status(404).json({ error: 'الطالب غير موجود' });
    if (currentStudent.status !== 'applied' && currentStudent.status !== 'failed') {
      return res.status(400).json({ error: 'رسوم الملف مدفوعة بالفعل أو الطالب في مرحلة متقدمة' });
    }
  }

  try {
    // 1. Fetch student's yearly finance records ordered by year (oldest first)
    const yearlyFinances = await prisma.studentYearlyFinance.findMany({
      where: { studentId },
      orderBy: { academicYear: 'asc' }
    });

    let remainingAmount = amount;
    const updates: ReturnType<typeof prisma.studentYearlyFinance.update>[] = [];

    const debitCode = method === 'cash' ? '1001' : '1002';
    const creditCode = getRevenueCreditCode(type);

    const debitAccount  = await prisma.account.findUnique({ where: { code: debitCode } });
    const creditAccount = await prisma.account.findUnique({ where: { code: creditCode } });

    // 2. Allocate payment to oldest years first (if not application fee or arrears)
    if (type !== 'application_fee' && type !== 'arrears') {
      for (const finance of yearlyFinances) {
        if (remainingAmount <= 0) break;

        const balance = Number(finance.totalFees) - Number(finance.paidAmount);
        if (balance > 0) {
          const paymentToThisYear = Math.min(remainingAmount, balance);
          updates.push(
            prisma.studentYearlyFinance.update({
              where: { id: finance.id },
              data: { paidAmount: { increment: paymentToThisYear } }
            })
          );
          remainingAmount -= paymentToThisYear;
        }
      }
    }

    // 3. Execute transaction: Create payment, update yearly records, update student summary
    const jeCount = await prisma.journalEntry.count();
    const jeNumber = `JE-${new Date().getFullYear()}-${String(jeCount + 1).padStart(6, '0')}`;
    const paymentDate = new Date(date).toISOString().split('T')[0];
    const jePeriodId = await getActivePeriodId(prisma, paymentDate);
    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: { studentId, studentName, amount, type, method, date: new Date(date), receiptNumber, collectedBy, notes, academicYear, walletPhoneNumber, sessionId: session.id, userId }
      }),
      ...(debitAccount && creditAccount ? [
        prisma.journalEntry.create({
          data: {
            entryNumber: jeNumber,
            entryDate: new Date(date).toISOString().split('T')[0],
            description: `تحصيل رسوم (${receiptNumber}) - الطالب: ${studentName}`,
            referenceType: 'payment',
            referenceId: receiptNumber,
            status: 'posted',
            postedAt: new Date(),
            createdBy: userId,
            periodId: jePeriodId ?? undefined,
            lines: {
              create: [
                { accountId: debitAccount.id,  debit: amount, credit: 0,      lineNumber: 1 },
                { accountId: creditAccount.id, debit: 0,      credit: amount, lineNumber: 2 }
              ]
            }
          }
        })
      ] : []),
      ...updates,
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
    ]);

    await audit(
      getAuditContext(req),
      'CREATE',
      'Payment',
      payment.id,
      null,
      { amount: String(payment.amount), type: payment.type, studentId: payment.studentId, method: payment.method },
    );
    res.status(201).json(payment);
  } catch (error: any) {
    console.error('Payment error:', error?.message || error);
    res.status(400).json({ error: 'Failed to record payment', details: String(error) });
  }
});

// ===== EXPENSES =====

router.get('/expenses', async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      include: { account: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

router.post('/expenses', async (req, res) => {
  try {
    const { amount, date, description, accountId, paymentMethod, requestedBy, notes, role } = req.body;

    // Validation: Amount must be greater than zero
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'المبلغ يجب أن يكون أكبر من صفر', code: 'INVALID_AMOUNT' });
    }

    const limitRecord = await prisma.expenseLimit.findUnique({ where: { role } });
    const limit = limitRecord ? Number(limitRecord.maxAmount) : 0;

    const requiresApproval = Number(amount) > limit;
    const status = requiresApproval ? 'pending_approval' : 'pending_treasury';

    const expense = await prisma.expense.create({
      data: {
        amount: Number(amount),
        date: new Date(date),
        description,
        accountId,
        paymentMethod,
        requestedBy,
        notes,
        status
      }
    });

    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create expense request' });
  }
});

router.patch('/expenses/:id/approve', async (req, res) => {
  try {
    const { approvedBy } = req.body;
    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: { status: 'pending_treasury', approvedBy }
    });
    res.json(expense);
  } catch (error) {
    res.status(400).json({ error: 'Failed to approve expense' });
  }
});

router.patch('/expenses/:id/reject', async (req, res) => {
  try {
    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: { status: 'rejected' }
    });
    res.json(expense);
  } catch (error) {
    res.status(400).json({ error: 'Failed to reject expense' });
  }
});

router.patch('/expenses/:id/pay', requireOpenTreasury, async (req, res) => {
  try {
    const { paidBy, userId } = req.body;
    const session = (req as any).treasurySession;

    const [expense] = await prisma.$transaction(async (tx) => {
      const exp = await tx.expense.update({
        where: { id: req.params.id as string },
        data: { status: 'paid', paidBy, paidByUserId: userId, sessionId: session.id },
        include: { account: true }
      });

      const creditCode = exp.paymentMethod === 'cash' ? '1001' : '1002';
      const creditAccount = await tx.account.findUnique({ where: { code: creditCode } });

      if (creditAccount) {
        const count = await tx.journalEntry.count();
        const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
        const today = new Date().toISOString().split('T')[0];
        const periodId = await getActivePeriodId(tx as any, today);
        await tx.journalEntry.create({
          data: {
            entryNumber,
            entryDate: today,
            description: `صرف مصروف نقدية (${exp.id.slice(0,8)}) - ${exp.description}`,
            referenceType: 'expense',
            referenceId: exp.id,
            status: 'posted',
            postedAt: new Date(),
            postedBy: paidBy,
            createdBy: paidBy,
            periodId: periodId ?? undefined,
            lines: {
              create: [
                { accountId: exp.accountId, debit: exp.amount, credit: 0, lineNumber: 1 },
                { accountId: creditAccount.id, debit: 0, credit: exp.amount, lineNumber: 2 }
              ]
            }
          }
        });
      }
      return [exp];
    });
    res.json(expense);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to process payment' });
  }
});

router.get('/expense-limits', async (req, res) => {
  try {
    const limits = await prisma.expenseLimit.findMany();
    res.json(limits);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch limits' });
  }
});

router.patch('/expense-limits/:role', async (req, res) => {
  try {
    const { maxAmount } = req.body;
    const limit = await prisma.expenseLimit.upsert({
      where: { role: req.params.role },
      update: { maxAmount: Number(maxAmount) },
      create: { role: req.params.role, maxAmount: Number(maxAmount) }
    });
    res.json(limit);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update limit' });
  }
});

// ===== ACCOUNTS =====

router.get('/accounts', async (req, res) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      include: { subAccounts: { where: { isActive: true } } },
      orderBy: { code: 'asc' }
    });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

router.post('/accounts', async (req, res) => {
  try {
    const account = await prisma.account.create({ data: req.body });
    res.status(201).json(account);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create account' });
  }
});

router.patch('/accounts/:id', async (req, res) => {
  try {
    const account = await prisma.account.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(account);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update account' });
  }
});

router.delete('/accounts/:id', async (req, res) => {
  try {
    await prisma.account.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete account' });
  }
});

// ===== TREASURY SESSIONS =====

// GET: الحالة الحالية للخزينة (اليوم)
router.get('/treasury/status', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const session = await prisma.treasurySession.findUnique({
      where: { date: today },
      include: {
        payments: { select: { amount: true } },
        expenses: { where: { status: 'paid' }, select: { amount: true } }
      }
    });

    if (!session || session.status === 'closed') {
      const userId = req.user!.userId;
      const userLastSession = await prisma.treasurySession.findFirst({
        where: { status: 'closed', openedBy: userId },
        orderBy: { date: 'desc' }
      });
      const anyLastSession = userLastSession ?? await prisma.treasurySession.findFirst({
        where: { status: 'closed' },
        orderBy: { date: 'desc' }
      });
      return res.json({
        status: 'no_session',
        suggestedOpeningBalance: userLastSession
          ? (userLastSession.actualBalance ?? userLastSession.closingBalance ?? null)
          : null,
        userHasPreviousSession: !!userLastSession,
        isFirstEver: !anyLastSession,
        closedToday: session?.status === 'closed'
      });
    }

    const totalIncome = session.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const totalExpenses = session.expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    const currentBalance = Number(session.openingBalance) + totalIncome - totalExpenses;

    const opener = session.openedBy
      ? await prisma.user.findUnique({ where: { id: session.openedBy }, select: { name: true } })
      : null;

    if (session.status === 'pending_close') {
      return res.json({
        status: 'pending_close',
        session: {
          ...session,
          openedByName: opener?.name || session.openedBy,
        },
        totalIncome,
        totalExpenses,
        currentBalance,
        paymentsCount: session.payments.length,
        expensesCount: session.expenses.length
      });
    }

    if (session.status === 'pending_reopen') {
      const requester = session.reopenRequestedBy
        ? await prisma.user.findUnique({ where: { id: session.reopenRequestedBy }, select: { name: true } })
        : null;
      return res.json({
        status: 'pending_reopen',
        session: {
          ...session,
          openedByName: opener?.name || session.openedBy,
          reopenRequestedByName: requester?.name || session.reopenRequestedBy,
        }
      });
    }

    res.json({
      status: 'open',
      session: {
        ...session,
        openedByName: opener?.name || session.openedBy,
      },
      totalIncome,
      totalExpenses,
      currentBalance,
      paymentsCount: session.payments.length,
      expensesCount: session.expenses.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch treasury status' });
  }
});

// POST: فتح جلسة جديدة
router.post('/treasury/open', async (req, res) => {
  const { openingBalance } = req.body;
  const userId = req.user!.userId;  // always from JWT, never from body

  try {
    const today = new Date().toISOString().split('T')[0];

    const existing = await prisma.treasurySession.findUnique({ where: { date: today } });
    if (existing) {
      return res.status(409).json({
        error: 'الخزينة مفتوحة بالفعل اليوم',
        code: 'ALREADY_OPEN'
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const allowedRoles = ['accountant', 'head_accountant', 'school_director', 'system_admin'];
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'ليس لديك صلاحية فتح الخزينة' });
    }

    const session = await prisma.treasurySession.create({
      data: {
        date: today,
        openingBalance: Number(openingBalance),
        openedBy: userId,
        status: 'open'
      }
    });

    await audit(
      getAuditContext(req),
      'CREATE',
      'TreasurySession',
      session.id,
      null,
      { date: session.date, openingBalance: String(session.openingBalance) },
    );

    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({ error: 'فشل فتح الخزينة' });
  }
});

// POST: جرد الإغلاق - المرحلة الأولى (إدخال المبلغ الفعلي)
router.post('/treasury/close-request', async (req, res) => {
  const { actualBalance } = req.body;

  try {
    const today = new Date().toISOString().split('T')[0];
    const session = await prisma.treasurySession.findUnique({
      where: { date: today },
      include: {
        payments: true,
        expenses: { where: { status: 'paid' } }
      }
    });

    if (!session || session.status !== 'open') {
      return res.status(404).json({ error: 'لا توجد جلسة مفتوحة اليوم' });
    }

    const closerUser = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { name: true, role: true } });
    const closedBy = closerUser?.name || req.user!.userId;

    const managerRoles = ['school_director', 'head_accountant', 'system_admin'];
    const isManager = closerUser && managerRoles.includes(closerUser.role);

    if (session.openedBy !== req.user!.userId && !isManager) {
      return res.status(403).json({
        error: 'فقط الشخص الذي فتح الخزينة أو المدير يمكنه إغلاقها',
        code: 'UNAUTHORIZED_CLOSER'
      });
    }

    const totalIncome = session.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const totalExpenses = session.expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    const expectedBalance = Number(session.openingBalance) + totalIncome - totalExpenses;
    const difference = Number(actualBalance) - expectedBalance;

    if (Math.abs(difference) < 0.01) {
      const closed = await prisma.treasurySession.update({
        where: { id: session.id },
        data: {
          actualBalance: Number(actualBalance),
          closingBalance: expectedBalance,
          difference: 0,
          status: 'closed',
          closedBy,
          closedAt: new Date()
        }
      });
      await audit(
        getAuditContext(req),
        'UPDATE',
        'TreasurySession',
        closed.id,
        { status: 'open' },
        { status: 'closed', closingBalance: String(expectedBalance) },
      );
      return res.json({
        status: 'closed',
        session: closed,
        expectedBalance,
        difference: 0
      });
    }

    // Lock the session immediately to prevent payments during the approval window
    await prisma.treasurySession.update({
      where: { id: session.id },
      data: {
        status: 'pending_close',
        actualBalance: Number(actualBalance),
        closingBalance: expectedBalance,
        difference,
        closedBy,
      }
    });

    res.json({
      status: 'needs_approval',
      expectedBalance,
      actualBalance: Number(actualBalance),
      difference,
      sessionId: session.id
    });
  } catch (error) {
    res.status(400).json({ error: 'فشل إجراء الجرد' });
  }
});

// POST: إضافة ملاحظة الفرق إلى الجلسة المقفلة مسبقاً بواسطة close-request
router.post('/treasury/pending-close', async (req, res) => {
  const { closureNote } = req.body;

  if (!closureNote || closureNote.trim().length < 10) {
    return res.status(400).json({ error: 'يجب كتابة سبب الفرق (10 أحرف على الأقل)' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const session = await prisma.treasurySession.findUnique({
      where: { date: today }
    });

    if (!session) {
      return res.status(404).json({ error: 'لا توجد جلسة اليوم' });
    }
    if (session.status !== 'pending_close') {
      return res.status(400).json({ error: 'الجلسة ليست في حالة انتظار الإغلاق' });
    }

    const updated = await prisma.treasurySession.update({
      where: { id: session.id },
      data: { closureNote: closureNote.trim() }
    });

    res.json({
      status: 'pending_close',
      session: updated,
      expectedBalance: Number(updated.closingBalance),
      actualBalance: Number(updated.actualBalance),
      difference: Number(updated.difference),
      sessionId: session.id
    });
  } catch (error) {
    res.status(400).json({ error: 'فشل تقديم طلب الإغلاق' });
  }
});

// POST: إغلاق مع موافقة المدير (عند وجود فرق - الجلسة يجب أن تكون في حالة pending_close)
router.post('/treasury/close-approve', async (req, res) => {
  const { sessionId } = req.body;
  const approvedByUserId = req.user!.userId;

  try {
    const approver = await prisma.user.findUnique({ where: { id: approvedByUserId } });
    const approverRoles = ['school_director', 'head_accountant', 'system_admin'];
    if (!approver || !approverRoles.includes(approver.role)) {
      return res.status(403).json({ error: 'ليس لديك صلاحية اعتماد الإغلاق' });
    }

    const session = await prisma.treasurySession.findUnique({
      where: { id: sessionId }
    });

    if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });
    if (session.status !== 'pending_close') {
      return res.status(400).json({ error: 'الجلسة ليست في حالة انتظار الموافقة' });
    }

    // سجّل الإغلاق + تحديث الجلسة + قيد الفرق في معاملة واحدة لضمان الذرية التامة
    const closed = await prisma.$transaction(async (tx) => {
      // 1. Audit record
      await tx.treasurySessionAudit.create({
        data: {
          sessionId:      session.id,
          eventType:      'close_approved',
          closingBalance: session.closingBalance,
          actualBalance:  session.actualBalance,
          difference:     session.difference,
          closedBy:       session.closedBy,
          approvedBy:     approver.name,
          closureNote:    session.closureNote,
          performedBy:    approvedByUserId
        }
      });

      // 2. Close session
      const updatedSession = await tx.treasurySession.update({
        where: { id: sessionId },
        data: {
          status:     'closed',
          approvedBy: approver.name,
          closedAt:   new Date()
          // actualBalance, closingBalance, difference, closedBy, closureNote already set in pending-close step
        }
      });

      // 3. Difference JE — created inside the same transaction so it rolls back with the session on failure
      const diff = Number(session.difference ?? 0);
      if (Math.abs(diff) >= 0.01) {
        const today = new Date().toISOString().split('T')[0];

        // عجز → Dr. مصروف طوارئ (5902)  Cr. خزينة (1001)
        // زيادة → Dr. خزينة (1001)  Cr. إيرادات أخرى (4006)
        const isShortage = diff < 0;
        const counterCode = isShortage ? '5902' : '4006';
        const cashAccount    = await tx.account.findUnique({ where: { code: '1001' } });
        const counterAccount = await tx.account.findUnique({ where: { code: counterCode } });

        if (!cashAccount || !counterAccount) {
          throw new Error(`حساب الخزينة أو حساب الطرف المقابل غير موجود (${counterCode})`);
        }

        // Idempotency: skip if a JE already exists for this session (e.g. retry)
        const existingJe = await tx.journalEntry.findFirst({
          where: { referenceType: 'treasury_difference', referenceId: sessionId }
        });

        if (!existingJe) {
          const jeCount = await tx.journalEntry.count();
          const entryNumber = `JE-${new Date().getFullYear()}-${String(jeCount + 1).padStart(6, '0')}`;
          const absDiff = Math.abs(diff);
          const periodId = await getActivePeriodId(tx as any, today);

          await tx.journalEntry.create({
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

      return updatedSession;
    });

    await audit(
      getAuditContext(req),
      'UPDATE',
      'TreasurySession',
      closed.id,
      { status: 'pending_close' },
      { status: 'closed', closingBalance: String(closed.closingBalance) },
    );

    res.json({ status: 'closed', session: closed });
  } catch (error) {
    res.status(400).json({ error: 'فشل إغلاق الخزينة' });
  }
});

// POST: طلب إعادة فتح الخزينة المغلقة اليوم
router.post('/treasury/reopen-request', async (req, res) => {
  const userId = req.user!.userId;
  try {
    const today = new Date().toISOString().split('T')[0];
    const session = await prisma.treasurySession.findUnique({ where: { date: today } });

    if (!session || session.status !== 'closed') {
      return res.status(400).json({ error: 'لا توجد جلسة مغلقة اليوم لطلب إعادة فتحها' });
    }

    const requester = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, role: true } });
    const allowedRoles = ['accountant', 'head_accountant', 'school_director', 'system_admin'];
    if (!requester || !allowedRoles.includes(requester.role)) {
      return res.status(403).json({ error: 'ليس لديك صلاحية طلب إعادة الفتح' });
    }

    const updated = await prisma.treasurySession.update({
      where: { id: session.id },
      data: { status: 'pending_reopen', reopenRequestedBy: userId }
    });

    res.json({ status: 'pending_reopen', session: updated });
  } catch (error) {
    res.status(400).json({ error: 'فشل تقديم طلب إعادة الفتح' });
  }
});

// POST: الموافقة على إعادة فتح الخزينة (رئيس الحسابات أو مدير المدرسة فقط)
router.post('/treasury/reopen-approve', async (req, res) => {
  const approverId = req.user!.userId;
  try {
    const today = new Date().toISOString().split('T')[0];
    const session = await prisma.treasurySession.findUnique({ where: { date: today } });

    if (!session || session.status !== 'pending_reopen') {
      return res.status(400).json({ error: 'لا يوجد طلب إعادة فتح معلق اليوم' });
    }

    const approver = await prisma.user.findUnique({ where: { id: approverId }, select: { name: true, role: true } });
    const managerRoles = ['head_accountant', 'school_director', 'system_admin'];
    if (!approver || !managerRoles.includes(approver.role)) {
      return res.status(403).json({ error: 'فقط رئيس الحسابات أو مدير المدرسة يمكنه الموافقة على إعادة الفتح' });
    }

    // احفظ بيانات الإغلاق قبل مسحها، وأعِد فتح الجلسة في معاملة واحدة لضمان الذرية
    const [, updated] = await prisma.$transaction([
      prisma.treasurySessionAudit.create({
        data: {
          sessionId:      session.id,
          eventType:      'reopened',
          closingBalance: session.closingBalance,
          actualBalance:  session.actualBalance,
          difference:     session.difference,
          closedBy:       session.closedBy,
          approvedBy:     session.approvedBy,
          closureNote:    session.closureNote,
          performedBy:    approverId
        }
      }),
      prisma.treasurySession.update({
        where: { id: session.id },
        data: {
          status:            'open',
          closingBalance:    null,
          actualBalance:     null,
          difference:        null,
          closedBy:          null,
          closedAt:          null,
          closureNote:       null,
          approvedBy:        null,
          reopenRequestedBy: null,
        }
      })
    ]);

    res.json({ status: 'open', session: updated });
  } catch (error) {
    res.status(400).json({ error: 'فشل الموافقة على إعادة الفتح' });
  }
});

// GET: تاريخ جلسات الخزينة (للتقارير)
router.get('/treasury/sessions', async (req, res) => {
  try {
    const sessions = await prisma.treasurySession.findMany({
      orderBy: { date: 'desc' },
      take: 30
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET: تفاصيل جلسة معينة بالمعاملات الكاملة
router.get('/treasury/sessions/:id', async (req, res) => {
  try {
    const session = await prisma.treasurySession.findUnique({
      where: { id: req.params.id },
      include: {
        payments: { orderBy: { createdAt: 'asc' } },
        expenses: {
          where: { status: 'paid' },
          include: { account: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });

    const totalIncome = session.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const totalExpenses = session.expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    const currentBalance = Number(session.openingBalance) + totalIncome - totalExpenses;

    res.json({ session, totalIncome, totalExpenses, currentBalance });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session details' });
  }
});

export default router;
