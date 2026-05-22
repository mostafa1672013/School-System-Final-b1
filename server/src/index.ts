import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import bcrypt from 'bcrypt';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import accountingRouter from './accounting-api';
import { signToken, requireAuth, requireRoles, adminOnly, managementRoles, accountantRoles, socketAuth } from './middleware/auth';
import { validate, LoginSchema, CreateUserSchema, UpdateUserSchema } from './validation/schemas';

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

// Parse allowed origins from env
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:8080')
  .split(',')
  .map(s => s.trim());

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow any localhost/127.0.0.1 origin in development
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, origin);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

// Security middleware
app.use(helmet());

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Login rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Global auth middleware for all protected routes
const PUBLIC_PATHS = ['/api/auth/login', '/health'];
app.use((req, res, next) => {
  if (PUBLIC_PATHS.includes(req.path)) return next();
  requireAuth(req, res, next);
});

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

// --- Students API ---

// Get all students
app.get('/api/students', async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        yearlyFinance: {
          orderBy: { academicYear: 'asc' }
        },
        badge: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Create a new student
app.post('/api/students', async (req, res) => {
  try {
    const student = await prisma.student.create({
      data: req.body
    });
    res.status(201).json(student);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create student' });
  }
});

// Update student
app.patch('/api/students/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const student = await prisma.student.update({
      where: { id },
      data: req.body,
      include: {
        yearlyFinance: {
          orderBy: { academicYear: 'asc' }
        }
      }
    });
    res.json(student);
  } catch (error) {
    console.error('Update student error:', error);
    res.status(400).json({ error: 'Failed to update student', details: String(error) });
  }
});

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

// Promote student to new stage/grade with arrears carryover
app.post('/api/students/:id/promote', requireRoles('school_director', 'head_accountant'), async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const {
    stage, grade, academicYear,
    tuitionFees, booksFees, uniformFees, busFees, otherFees,
    arrearsFees, discountAmount, discountPercentage, totalFees,
    status,
  } = req.body;

  try {
    // Fetch current student to save old-year snapshot
    const currentStudent = await prisma.student.findUnique({
      where: { id },
      include: {
        payments: {
          where: { NOT: { type: 'application_fee' } },
        },
      },
    });

    if (!currentStudent) {
      return res.status(404).json({ error: 'الطالب غير موجود' });
    }

    const oldAcademicYear = currentStudent.academicYear;
    const oldPaidAmount = currentStudent.payments
      .filter(p => !p.academicYear || p.academicYear === oldAcademicYear)
      .reduce((sum, p) => sum + p.amount, 0);

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
          status: status ?? 'admitted',
        },
        include: { yearlyFinance: { orderBy: { academicYear: 'asc' } } },
      }),
      prisma.studentYearlyFinance.upsert({
        where: { studentId_academicYear: { studentId: id, academicYear: oldAcademicYear } },
        create: {
          studentId: id,
          academicYear: oldAcademicYear,
          stage: currentStudent.stage,
          grade: currentStudent.grade,
          tuitionFees: currentStudent.tuitionFees,
          booksFees: currentStudent.booksFees,
          uniformFees: currentStudent.uniformFees,
          busFees: currentStudent.busFees,
          otherFees: currentStudent.otherFees,
          arrearsFees: currentStudent.arrearsFees,
          totalFees: currentStudent.totalFees,
          paidAmount: oldPaidAmount,
        },
        update: { paidAmount: oldPaidAmount },
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

// Bulk promote students (wizard use)
app.post('/api/students/bulk-promote', requireRoles('school_director', 'head_accountant'), async (req, res) => {
  const { promotions } = req.body as {
    promotions: Array<{
      studentId: string;
      fromAcademicYear: string;
      stage: string;
      grade: string;
      academicYear: string;
      tuitionFees: number;
      booksFees: number;
      uniformFees: number;
      busFees: number;
      otherFees: number;
      arrearsFees: number;
      discountAmount: number;
      discountPercentage: number;
      totalFees: number;
      status: string;
    }>;
  };

  if (!Array.isArray(promotions) || promotions.length === 0) {
    return res.status(400).json({ error: 'لا يوجد طلاب للترقية' });
  }

  let promoted = 0;
  const skipped: { id: string; name: string; reason: string }[] = [];

  // Process in batches of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < promotions.length; i += BATCH_SIZE) {
    const batch = promotions.slice(i, i + BATCH_SIZE);
    try {
      await prisma.$transaction(
        batch.map((p) =>
          prisma.student.update({
            where: { id: p.studentId },
            data: {
              stage: p.stage,
              grade: p.grade,
              academicYear: p.academicYear,
              tuitionFees: p.tuitionFees,
              booksFees: p.booksFees,
              uniformFees: p.uniformFees,
              busFees: p.busFees,
              otherFees: p.otherFees,
              arrearsFees: p.arrearsFees,
              discountAmount: p.discountAmount,
              discountPercentage: p.discountPercentage,
              totalFees: p.totalFees,
              paidAmount: 0,
              status: p.status,
            },
          })
        )
      );
      promoted += batch.length;
    } catch (error) {
      for (const p of batch) {
        skipped.push({ id: p.studentId, name: p.studentId, reason: String(error) });
      }
    }
  }

  // Save yearly finance snapshots for promoted students
  try {
    const promotedIds = promotions
      .filter((p) => !skipped.find((s) => s.id === p.studentId))
      .map((p) => p.studentId);

    const studentsWithPayments = await prisma.student.findMany({
      where: { id: { in: promotedIds } },
      include: { payments: { where: { NOT: { type: 'application_fee' } } } },
    });

    for (const student of studentsWithPayments) {
      const promo = promotions.find((p) => p.studentId === student.id);
      if (!promo) continue;
      const fromYear = promo.fromAcademicYear;
      const oldPaid = student.payments
        .filter((p) => !p.academicYear || p.academicYear === fromYear)
        .reduce((sum, p) => sum + p.amount, 0);
      await prisma.studentYearlyFinance.upsert({
        where: { studentId_academicYear: { studentId: student.id, academicYear: fromYear } },
        create: {
          studentId: student.id,
          academicYear: fromYear,
          stage: promo.stage,
          grade: promo.grade,
          tuitionFees: promo.tuitionFees,
          booksFees: promo.booksFees,
          uniformFees: promo.uniformFees,
          busFees: promo.busFees,
          otherFees: promo.otherFees,
          arrearsFees: promo.arrearsFees,
          totalFees: promo.totalFees,
          paidAmount: oldPaid,
        },
        update: { paidAmount: oldPaid },
      });
    }
  } catch (error) {
    console.error('Yearly finance snapshot error:', error);
    // Non-fatal
  }

  res.json({ promoted, skipped });
});

// --- Settings API ---
app.get('/api/settings/academic-year', requireAuth, async (req, res) => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'activeAcademicYear' },
    });
    res.json({ academicYear: setting?.value ?? '2024-2025' });
  } catch (error) {
    res.status(500).json({ error: 'فشل جلب السنة الدراسية' });
  }
});

app.put('/api/settings/academic-year', requireRoles('school_director', 'head_accountant'), async (req, res) => {
  const { academicYear } = req.body;
  if (!academicYear || typeof academicYear !== 'string') {
    return res.status(400).json({ error: 'السنة الدراسية مطلوبة' });
  }
  try {
    const setting = await prisma.systemSetting.upsert({
      where: { key: 'activeAcademicYear' },
      create: { key: 'activeAcademicYear', value: academicYear },
      update: { value: academicYear },
    });
    res.json({ academicYear: setting.value });
  } catch (error) {
    res.status(500).json({ error: 'فشل تحديث السنة الدراسية' });
  }
});

// --- Payments API ---
app.get('/api/payments', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { date: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// --- Auth API ---
app.post('/api/auth/login', loginLimiter, validate(LoginSchema), async (req, res) => {
  const { email, password } = req.body;
  console.log(`🔑 محاولة دخول: ${email}`);
  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.log(`❌ المستخدم غير موجود: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.active) {
      console.log(`⚠️ محاولة دخول مستخدم معطل: ${email}`);
      return res.status(403).json({ error: 'Account is disabled' });
    }

    // Use bcrypt to compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.log(`❌ كلمة مرور خاطئة للمستخدم: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`✅ دخول ناجح: ${user.name}`);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastLoginAt: new Date() },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    const token = signToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { isOnline: false, lastLogoutAt: new Date() },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// --- Users API ---

// Get all users (omit password field)
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        discountLimitPercent: true,
        isOnline: true,
        lastLoginAt: true,
        lastLogoutAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user (omit password field)
app.get('/api/users/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        discountLimitPercent: true,
        isOnline: true,
        lastLoginAt: true,
        lastLogoutAt: true,
        createdAt: true,
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user (admin only, with validation and password hashing)
app.post('/api/users', requireAuth, adminOnly, validate(CreateUserSchema), async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { ...rest, password: hashedPassword },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        discountLimitPercent: true,
        createdAt: true,
      }
    });
    res.status(201).json(user);
  } catch (error) {
    console.error('User creation error:', error);
    res.status(400).json({ error: 'Failed to create user' });
  }
});

// Update user (with field allowlist and password hashing)
app.patch('/api/users/:id', requireAuth, validate(UpdateUserSchema), async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const isAdmin = req.user!.role === 'system_admin';

  // Non-admins can only update their own profile
  if (!isAdmin && req.user!.userId !== id) {
    return res.status(403).json({ error: 'Cannot update another user' });
  }

  console.log(`📝 محاولة تحديث بيانات المستخدم: ${id}`);
  try {
    const allowedFields = ['name', 'avatar', 'discountLimitPercent', 'active', 'role'];
    const safeData: any = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowedFields.includes(k))
    );

    // Handle password hashing if password is in the update
    if (req.body.password) {
      safeData.password = await bcrypt.hash(req.body.password, 12);
    }

    // Non-admins cannot change role
    if (!isAdmin) {
      delete safeData.role;
    }

    const user = await prisma.user.update({
      where: { id },
      data: safeData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        discountLimitPercent: true,
        isOnline: true,
        lastLoginAt: true,
        lastLogoutAt: true,
        createdAt: true,
      }
    });
    console.log('✅ تم تحديث المستخدم بنجاح');
    res.json(user);
  } catch (error) {
    console.error('❌ فشل تحديث المستخدم:', error);
    res.status(400).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', requireAuth, adminOnly, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  console.log(`🗑️ محاولة حذف المستخدم: ${id}`);
  try {
    await prisma.user.delete({ where: { id } });
    console.log('✅ تم حذف المستخدم بنجاح');
    res.status(204).send();
  } catch (error) {
    console.error('❌ فشل حذف المستخدم:', error);
    res.status(400).json({ error: 'Failed to delete user' });
  }
});

// --- Payments API ---
app.get('/api/payments', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { date: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

app.post('/api/payments', requireOpenTreasury, async (req, res) => {
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
    let creditCode = '4006';
    switch (type) {
      case 'tuition': creditCode = '4001'; break;
      case 'books': creditCode = '4002'; break;
      case 'uniform': creditCode = '4003'; break;
      case 'bus': creditCode = '4004'; break;
      case 'application_fee': creditCode = '4005'; break;
    }

    const debitAccount = await prisma.account.findUnique({ where: { code: debitCode } });
    const creditAccount = await prisma.account.findUnique({ where: { code: creditCode } });

    // 2. Allocate payment to oldest years first (if not application fee or arrears)
    if (type !== 'application_fee' && type !== 'arrears') {
      for (const finance of yearlyFinances) {
        if (remainingAmount <= 0) break;

        const balance = finance.totalFees - finance.paidAmount;
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
    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: { studentId, studentName, amount, type, method, date, receiptNumber, collectedBy, notes, academicYear, walletPhoneNumber, sessionId: session.id, userId }
      }),
      ...(debitAccount && creditAccount ? [
        prisma.journalEntry.create({
          data: {
            description: `تحصيل إيرادات (${receiptNumber}) - الطالب: ${studentName}`,
            referenceId: receiptNumber,
            lines: {
              create: [
                { accountId: debitAccount.id, debit: amount, credit: 0 },
                { accountId: creditAccount.id, debit: 0, credit: amount }
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

    res.status(201).json(payment);
  } catch (error: any) {
    console.error('Payment error:', error?.message || error);
    res.status(400).json({ error: 'Failed to record payment', details: String(error) });
  }
});

// --- Inventory API ---

// GET: All categories
app.get('/api/inventory/categories', async (req, res) => {
  try {
    const categories = await prisma.itemCategory.findMany({
      orderBy: { createdAt: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'فشل تحميل التصنيفات' });
  }
});

// POST: Create new category
app.post('/api/inventory/categories', async (req, res) => {
  try {
    const { key, name } = req.body;
    if (!key || !name) {
      return res.status(400).json({ error: 'المفتاح والاسم مطلوبان' });
    }
    // Normalize key: lowercase, no spaces
    const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
    const category = await prisma.itemCategory.create({
      data: { key: normalizedKey, name: name.trim() }
    });
    res.status(201).json(category);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'هذا المفتاح مستخدم بالفعل' });
    }
    res.status(400).json({ error: 'فشل إنشاء التصنيف' });
  }
});

// PATCH: Update category name (key is immutable)
app.patch('/api/inventory/categories/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'الاسم مطلوب' });
    }
    const category = await prisma.itemCategory.update({
      where: { id },
      data: { name: name.trim() }
    });
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: 'فشل تحديث التصنيف' });
  }
});

// DELETE: Delete category (blocked if items use it)
app.delete('/api/inventory/categories/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const category = await prisma.itemCategory.findUnique({ where: { id } });
    if (!category) {
      return res.status(404).json({ error: 'التصنيف غير موجود' });
    }
    const itemCount = await prisma.inventoryItem.count({
      where: { category: category.key }
    });
    if (itemCount > 0) {
      return res.status(409).json({
        error: `لا يمكن حذف التصنيف، يوجد ${itemCount} صنف مرتبط به`,
        itemCount
      });
    }
    await prisma.itemCategory.delete({ where: { id } });
    res.json({ message: 'تم حذف التصنيف بنجاح' });
  } catch (error) {
    res.status(400).json({ error: 'فشل حذف التصنيف' });
  }
});

app.get('/api/inventory', async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// POST: Create new inventory item
app.post('/api/inventory', async (req, res) => {
  try {
    const { name, category, itemType, quantity, minQuantity, maxQuantity, unit, unitCost, unitPrice, grade, description } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'اسم الصنف والفئة مطلوبة' });
    }

    const item = await prisma.inventoryItem.create({
      data: {
        name,
        category,
        itemType: itemType || 'consumable',
        quantity: quantity || 0,
        minQuantity: minQuantity || 5,
        maxQuantity: maxQuantity || null,
        unit: unit || 'قطعة',
        unitCost: unitCost || 0,
        unitPrice: unitPrice || 0,
        grade: grade || null,
        description: description || null,
        lastUpdated: new Date().toISOString().split('T')[0]
      }
    });

    res.status(201).json(item);
  } catch (error: any) {
    console.error('Inventory item creation error:', error);
    res.status(400).json({ error: 'فشل إنشاء الصنف', details: error.message });
  }
});

// PATCH: Update inventory item (metadata only, NOT quantity)
app.patch('/api/inventory/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const { name, category, itemType, minQuantity, maxQuantity, unit, unitCost, unitPrice, grade, description } = req.body;

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(itemType && { itemType }),
        ...(minQuantity !== undefined && { minQuantity }),
        ...(maxQuantity !== undefined && { maxQuantity }),
        ...(unit && { unit }),
        ...(unitCost !== undefined && { unitCost }),
        ...(unitPrice !== undefined && { unitPrice }),
        ...(grade && { grade }),
        ...(description !== undefined && { description }),
        lastUpdated: new Date().toISOString().split('T')[0]
      }
    });

    res.json(item);
  } catch (error: any) {
    console.error('Inventory item update error:', error);
    res.status(400).json({ error: 'فشل تحديث الصنف' });
  }
});

// DELETE: Delete inventory item
app.delete('/api/inventory/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    // Cascade delete will be handled by Prisma due to onDelete: Cascade
    const item = await prisma.inventoryItem.delete({
      where: { id }
    });

    res.json({ message: 'تم حذف الصنف بنجاح', item });
  } catch (error: any) {
    console.error('Inventory item deletion error:', error);
    res.status(400).json({ error: 'فشل حذف الصنف' });
  }
});

// GET: Low stock items (below minQuantity)
app.get('/api/inventory/low-stock', async (req, res) => {
  try {
    const lowStock = await prisma.inventoryItem.findMany({
      where: {
        quantity: {
          lt: prisma.inventoryItem.fields.minQuantity
        }
      },
      orderBy: { quantity: 'asc' }
    });

    res.json(lowStock);
  } catch (error: any) {
    console.error('Low stock query error:', error);
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
});

// GET: All inventory transactions
app.get('/api/inventory/transactions', async (req, res) => {
  try {
    const { itemId } = req.query;

    const transactions = await prisma.inventoryTransaction.findMany({
      where: itemId ? { itemId: String(itemId) } : undefined,
      include: { item: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json(transactions);
  } catch (error: any) {
    console.error('Inventory transactions query error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST: Receive stock (stock-in)
app.post('/api/inventory/receive', async (req, res) => {
  try {
    const { itemId, quantity, supplierName, unitCost, notes, performedBy, performedByUserId } = req.body;

    if (!itemId || !quantity || !performedBy) {
      return res.status(400).json({ error: 'الصنف والكمية والموظف مطلوبين' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ error: 'الكمية يجب أن تكون أكبر من صفر' });
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });

      if (!item) {
        throw new Error('الصنف غير موجود');
      }

      // Update item quantity
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          quantity: item.quantity + quantity,
          ...(unitCost !== undefined && { unitCost }),
          lastUpdated: new Date().toISOString().split('T')[0]
        }
      });

      // Create transaction record
      const transaction = await tx.inventoryTransaction.create({
        data: {
          itemId,
          type: 'in',
          subType: 'purchase',
          quantity,
          unitCostSnapshot: unitCost || item.unitCost,
          unitPriceSnapshot: item.unitPrice,
          totalAmount: (unitCost || item.unitCost) * quantity,
          supplierName: supplierName || null,
          notes: notes || null,
          performedBy,
          performedByUserId: performedByUserId || null,
          date: new Date().toISOString().split('T')[0]
        }
      });

      // Create journal entry: DR 1300 (Inventory) | CR 2001 (Accounts Payable)
      try {
        const asset1300 = await tx.account.findUnique({ where: { code: '1300' } });
        const liability2001 = await tx.account.findUnique({ where: { code: '2001' } });

        if (asset1300 && liability2001) {
          const journalEntry = await tx.journalEntry.create({
            data: {
              date: new Date(),
              description: `استلام مخزون: ${item.name} (${quantity} ${item.unit})`,
              referenceId: transaction.id,
              lines: {
                create: [
                  {
                    accountId: asset1300.id,
                    debit: (unitCost || item.unitCost) * quantity,
                    credit: 0
                  },
                  {
                    accountId: liability2001.id,
                    debit: 0,
                    credit: (unitCost || item.unitCost) * quantity
                  }
                ]
              }
            }
          });

          // Update transaction with journal entry ID
          await tx.inventoryTransaction.update({
            where: { id: transaction.id },
            data: { journalEntryId: journalEntry.id }
          });
        } else {
          console.warn('⚠️ Accounting codes 1300 or 2001 not found. Stock transaction created without journal entry.');
        }
      } catch (journalError) {
        console.warn('⚠️ Journal entry creation failed:', journalError);
        // Continue anyway - graceful degradation
      }

      return { item: updatedItem, transaction };
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Stock receive error:', error);
    res.status(400).json({ error: error.message || 'فشل استلام المخزون' });
  }
});

// POST: Issue stock (stock-out)
app.post('/api/inventory/issue', async (req, res) => {
  try {
    const { itemId, quantity, subType, departmentName, studentId, studentName, notes, performedBy, performedByUserId } = req.body;

    if (!itemId || !quantity || !subType || !performedBy) {
      return res.status(400).json({ error: 'الصنف والكمية والنوع والموظف مطلوبين' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ error: 'الكمية يجب أن تكون أكبر من صفر' });
    }

    if (!['sale', 'consumption', 'adjustment'].includes(subType)) {
      return res.status(400).json({ error: 'نوع الصرف غير صحيح' });
    }

    // Use transaction for consistency
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });

      if (!item) {
        throw new Error('الصنف غير موجود');
      }

      if (item.quantity < quantity) {
        throw new Error(`الكمية المتاحة ${item.quantity} أقل من المطلوبة ${quantity}`);
      }

      // Update item quantity
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          quantity: item.quantity - quantity,
          lastUpdated: new Date().toISOString().split('T')[0]
        }
      });

      // Create transaction record
      const transaction = await tx.inventoryTransaction.create({
        data: {
          itemId,
          type: 'out',
          subType,
          quantity,
          unitCostSnapshot: item.unitCost,
          unitPriceSnapshot: item.unitPrice,
          totalAmount: item.unitPrice * quantity,
          departmentName: departmentName || null,
          studentId: studentId || null,
          studentName: studentName || null,
          notes: notes || null,
          performedBy,
          performedByUserId: performedByUserId || null,
          date: new Date().toISOString().split('T')[0]
        }
      });

      // Create journal entries based on subType
      try {
        if (subType === 'sale') {
          // Double entry: Revenue + COGS
          const cash1001 = await tx.account.findUnique({ where: { code: '1001' } });
          const inventory1300 = await tx.account.findUnique({ where: { code: '1300' } });
          const cogs5001 = await tx.account.findUnique({ where: { code: '5001' } });

          // Map category to revenue account
          let revenueAccount;
          if (item.category === 'books' || item.category === 'كتب') {
            revenueAccount = await tx.account.findUnique({ where: { code: '4002' } });
          } else if (item.category === 'uniform' || item.category === 'زي') {
            revenueAccount = await tx.account.findUnique({ where: { code: '4003' } });
          } else {
            revenueAccount = await tx.account.findUnique({ where: { code: '4006' } });
          }

          if (cash1001 && revenueAccount && inventory1300 && cogs5001) {
            // Entry 1: DR Cash | CR Revenue
            const journalEntry1 = await tx.journalEntry.create({
              data: {
                date: new Date(),
                description: `بيع مخزون: ${item.name} لطالب (${quantity} ${item.unit})`,
                referenceId: transaction.id,
                lines: {
                  create: [
                    {
                      accountId: cash1001.id,
                      debit: item.unitPrice * quantity,
                      credit: 0
                    },
                    {
                      accountId: revenueAccount.id,
                      debit: 0,
                      credit: item.unitPrice * quantity
                    }
                  ]
                }
              }
            });

            // Entry 2: DR COGS | CR Inventory
            const journalEntry2 = await tx.journalEntry.create({
              data: {
                date: new Date(),
                description: `تكلفة بضاعة مباعة: ${item.name} (${quantity} ${item.unit})`,
                referenceId: transaction.id,
                lines: {
                  create: [
                    {
                      accountId: cogs5001.id,
                      debit: item.unitCost * quantity,
                      credit: 0
                    },
                    {
                      accountId: inventory1300.id,
                      debit: 0,
                      credit: item.unitCost * quantity
                    }
                  ]
                }
              }
            });

            await tx.inventoryTransaction.update({
              where: { id: transaction.id },
              data: { journalEntryId: journalEntry1.id }
            });
          } else {
            console.warn('⚠️ Required accounts not found for sale entry.');
          }
        } else if (subType === 'consumption') {
          // Single entry: DR Expense | CR Inventory
          const expense5002 = await tx.account.findUnique({ where: { code: '5002' } });
          const inventory1300 = await tx.account.findUnique({ where: { code: '1300' } });

          if (expense5002 && inventory1300) {
            const journalEntry = await tx.journalEntry.create({
              data: {
                date: new Date(),
                description: `صرف مستلزمات: ${item.name} للقسم ${departmentName || 'غير محدد'} (${quantity} ${item.unit})`,
                referenceId: transaction.id,
                lines: {
                  create: [
                    {
                      accountId: expense5002.id,
                      debit: item.unitCost * quantity,
                      credit: 0
                    },
                    {
                      accountId: inventory1300.id,
                      debit: 0,
                      credit: item.unitCost * quantity
                    }
                  ]
                }
              }
            });

            await tx.inventoryTransaction.update({
              where: { id: transaction.id },
              data: { journalEntryId: journalEntry.id }
            });
          } else {
            console.warn('⚠️ Required accounts not found for consumption entry.');
          }
        }
      } catch (journalError) {
        console.warn('⚠️ Journal entry creation failed:', journalError);
        // Continue anyway
      }

      return { item: updatedItem, transaction };
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Stock issue error:', error);
    res.status(400).json({ error: error.message || 'فشل صرف المخزون' });
  }
});

// GET: Student inventory transactions
app.get('/api/students/:id/inventory', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        studentId: id,
        type: 'out',
        subType: 'sale'
      },
      include: { item: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json(transactions);
  } catch (error: any) {
    console.error('Student inventory query error:', error);
    res.status(500).json({ error: 'Failed to fetch student inventory transactions' });
  }
});

// --- Bus Routes API ---
app.get('/api/bus-routes', async (req, res) => {
  try {
    const routes = await prisma.busRoute.findMany();
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bus routes' });
  }
});

app.post('/api/bus-routes', async (req, res) => {
  console.log('🚌 محاولة إنشاء خط باص جديد:', req.body.name);
  try {
    const route = await prisma.busRoute.create({
      data: req.body
    });
    console.log('✅ تم إنشاء الخط بنجاح:', route.id);
    res.json(route);
  } catch (error) {
    console.error('❌ فشل إنشاء الخط:', error);
    res.status(500).json({ error: 'Failed to create bus route' });
  }
});

app.patch('/api/bus-routes/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  console.log(`📝 محاولة تعديل الخط: ${id}`, req.body);
  try {
    const route = await prisma.busRoute.update({
      where: { id },
      data: req.body
    });
    console.log('✅ تم التعديل بنجاح');
    res.json(route);
  } catch (error) {
    console.error('❌ فشل التعديل:', error);
    res.status(500).json({ error: 'Failed to update bus route' });
  }
});

// --- Stage Fees API (Director) ---
app.get('/api/stage-fees', async (req, res) => {
  try {
    const fees = await prisma.stageFee.findMany();
    res.json(fees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stage fees' });
  }
});

app.post('/api/stage-fees', async (req, res) => {
  console.log('📬 طلب إضافة رسوم جديد:', req.body);
  const { stage, grade, track, academicYear, tuitionFees, booksFees, uniformFees, applicationFees, additionalFees } = req.body;
  
  if (!stage || !grade || !academicYear) {
    return res.status(400).json({ error: 'بيانات غير مكتملة (المرحلة، الصف، السنة الدراسية مطلوبة)' });
  }

  try {
    // Check if exists using findFirst instead of findUnique to avoid unique name issues
    const existing = await prisma.stageFee.findFirst({
      where: { stage, grade, track, academicYear }
    });

    if (existing) {
      console.log('⚠️ الرسوم مسجلة بالفعل');
      return res.status(409).json({ error: 'الرسوم مسجلة بالفعل لهذه المرحلة والسنة الدراسية' });
    }

    const fee = await prisma.stageFee.create({
      data: { 
        stage, grade, track, academicYear, 
        tuitionFees, tuitionMandatory: req.body.tuitionMandatory,
        booksFees, booksMandatory: req.body.booksMandatory,
        uniformFees, uniformMandatory: req.body.uniformMandatory,
        applicationFees, applicationMandatory: req.body.applicationMandatory,
        additionalFees 
      }
    });
    console.log('✅ تم الحفظ في قاعدة البيانات:', fee);
    res.status(201).json(fee);
  } catch (error) {
    console.error('❌ خطأ في قاعدة البيانات:', error);
    res.status(400).json({ error: 'فشل الحفظ في قاعدة البيانات' });
  }
});

app.patch('/api/stage-fees/:id', async (req, res) => {
  console.log('📬 طلب تعديل رسوم:', req.params.id, req.body);
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const fee = await prisma.stageFee.update({
      where: { id },
      data: req.body
    });
    console.log('✅ تم التعديل بنجاح');
    res.json(fee);
  } catch (error) {
    console.error('❌ خطأ في التعديل:', error);
    res.status(400).json({ error: 'فشل تعديل البيانات' });
  }
});

app.delete('/api/stage-fees/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    await prisma.stageFee.delete({
      where: { id }
    });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete' });
  }
});

// --- Admission Workflow API ---

// 1. Initial Application
app.post('/api/admission/apply', async (req, res) => {
  try {
    const student = await prisma.student.create({
      data: {
        ...req.body,
        status: 'applied'
      }
    });
    res.status(201).json(student);
  } catch (error) {
    console.error('❌ Admission apply error:', error);
    res.status(400).json({ error: 'Failed to apply' });
  }
});

// 2. Set Test Result
app.patch('/api/admission/test-result/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { result } = req.body;
  try {
    const student = await prisma.student.update({
      where: { id },
      data: {
        testResult: result,
        status: result === 'pass' ? 'fee_setup' : result === 'fail' ? 'failed' : 'under_testing'
      }
    });
    res.json(student);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update test result' });
  }
});

// 3. Setup Fees & Discount
app.patch('/api/admission/setup-fees/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { 
    tuitionFees, tuitionMandatory, booksFees, booksMandatory, uniformFees, uniformMandatory, busFees, busRouteId, otherFees, 
    discountAmount, discountPercentage, discountApprovedBy, discountStatus, discountApproverId, discountRequesterId,
    additionalFees 
  } = req.body;

  try {
    const totalFees = Number(tuitionFees || 0) + Number(booksFees || 0) + Number(uniformFees || 0) + Number(busFees || 0) + Number(otherFees || 0) + (additionalFees || []).reduce((s: number, f: any) => s + (f.selected ? f.amount : 0), 0) - Number(discountAmount || 0);

    // Server-side safety: check requester's limit
    const requester = await prisma.user.findUnique({ where: { id: discountRequesterId || '' } });
    const userLimit = requester?.discountLimitPercent || 0;
    const finalDiscountStatus = (Number(discountPercentage || 0) > userLimit) ? 'pending' : (discountStatus || 'approved');
    const finalStudentStatus = (finalDiscountStatus === 'pending') ? 'pending_discount' : 'pending_approval';

    const student = await prisma.student.update({
      where: { id },
      data: {
        tuitionFees, tuitionMandatory,
        booksFees, booksMandatory,
        uniformFees, uniformMandatory,
        busFees, busRouteId, otherFees, 
        discountAmount, discountPercentage, 
        discountApprovedBy: (finalDiscountStatus === 'pending') ? '' : (discountApprovedBy || ''),
        discountStatus: finalDiscountStatus,
        discountApproverId, discountRequesterId,
        totalFees,
        additionalFees,
        status: finalStudentStatus
      }
    });
    res.json(student);
  } catch (error) {
    res.status(400).json({ error: 'Failed to setup fees' });
  }
});

// Get pending discounts for an approver
app.get('/api/admission/pending-discounts', async (req, res) => {
  const { approverId } = req.query;
  try {
    const user = approverId ? await prisma.user.findUnique({ where: { id: approverId as string } }) : null;
    
    let whereClause: any = { discountStatus: 'pending' };
    
    // If not a high-level manager, only show assigned ones
    if (user && !['school_director', 'head_accountant', 'system_admin'].includes(user.role)) {
      whereClause.discountApproverId = approverId as string;
    }

    console.log('🔍 Searching pending discounts with:', JSON.stringify(whereClause), 'User role:', user?.role);

    const students = await prisma.student.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' }
    });
    
    console.log(`📋 Found ${students.length} pending discount requests`);
    res.json(students);
  } catch (error) {
    console.error('❌ pending-discounts error:', error);
    res.status(500).json({ error: 'Failed to fetch pending discounts' });
  }
});

// Fix existing students that have discounts but wrong discountStatus
app.patch('/api/admission/fix-discount-status', async (req, res) => {
  try {
    // Find students who have a discount amount but discountStatus is not 'pending' 
    // and their status is 'pending_approval' — these likely bypassed the workflow
    const studentsWithDiscount = await prisma.student.findMany({
      where: {
        discountAmount: { gt: 0 },
        discountStatus: { not: 'pending' },
        status: 'pending_approval'
      }
    });

    let fixed = 0;
    for (const s of studentsWithDiscount) {
      // Check if the requester had permission
      if (s.discountRequesterId) {
        const requester = await prisma.user.findUnique({ where: { id: s.discountRequesterId } });
        const userLimit = requester?.discountLimitPercent || 0;
        if (s.discountPercentage > userLimit) {
          await prisma.student.update({
            where: { id: s.id },
            data: { discountStatus: 'pending', status: 'pending_discount' }
          });
          fixed++;
          console.log(`🔧 Fixed student ${s.name}: discountStatus -> pending, status -> pending_discount`);
        }
      }
    }

    res.json({ message: `Fixed ${fixed} students`, total: studentsWithDiscount.length });
  } catch (error) {
    console.error('Fix error:', error);
    res.status(500).json({ error: 'Failed to fix' });
  }
});

// Action discount (approve/reject)
app.patch('/api/admission/action-discount/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { status, approvedBy, approverId } = req.body; // status: 'approved' | 'rejected'
  try {
    // CRITICAL: If approving, verify the approver has sufficient discount limit
    if (status === 'approved' && approverId) {
      const approver = await prisma.user.findUnique({ where: { id: approverId } });
      const student = await prisma.student.findUnique({ where: { id } });
      
      if (!approver || !student) {
        return res.status(404).json({ error: 'بيانات غير صالحة' });
      }

      const discountPct = student.discountPercentage || 
        (student.totalFees + student.discountAmount > 0 
          ? (student.discountAmount / (student.totalFees + student.discountAmount)) * 100 
          : 0);

      if (discountPct > approver.discountLimitPercent) {
        return res.status(403).json({ 
          error: `لا يمكنك اعتماد هذا الخصم. صلاحيتك ${approver.discountLimitPercent}% والخصم المطلوب ${discountPct.toFixed(1)}%` 
        });
      }
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: { 
        discountStatus: status,
        discountApprovedBy: status === 'approved' ? approvedBy : null,
        status: status === 'approved' ? 'pending_approval' : 'fee_setup'
      }
    });
    res.json(updatedStudent);
  } catch (error) {
    res.status(400).json({ error: 'Failed to action discount' });
  }
});

// 4. Final Approval
app.patch('/api/admission/approve/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { approverId } = req.body;
  try {
    // Fetch the student
    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'الطالب غير موجود' });
    
    // CRITICAL: Only pending_approval students can be approved
    if (existing.status !== 'pending_approval') {
      return res.status(403).json({ error: `لا يمكن اعتماد الطالب - الحالة الحالية: ${existing.status}. يجب أن يكون في مرحلة "بانتظار الاعتماد"` });
    }

    // CRITICAL: Check if there's a pending discount
    if (existing.discountStatus === 'pending') {
      return res.status(403).json({ error: 'لا يمكن اعتماد الطالب - يوجد طلب خصم معلق يجب البت فيه أولاً' });
    }

    // CRITICAL: Check approver's discount limit if student has a discount
    if (approverId && existing.discountAmount > 0) {
      const approver = await prisma.user.findUnique({ where: { id: approverId } });
      if (approver) {
        const discountPct = existing.discountPercentage || 
          ((existing.totalFees + existing.discountAmount) > 0 
            ? (existing.discountAmount / (existing.totalFees + existing.discountAmount)) * 100 
            : 0);
        
        if (discountPct > approver.discountLimitPercent) {
          return res.status(403).json({ 
            error: `لا يمكنك اعتماد هذا الطالب. صلاحيتك للخصم ${approver.discountLimitPercent}% والخصم المطبق ${discountPct.toFixed(1)}%` 
          });
        }
      }
    }

    const student = await prisma.student.update({
      where: { id },
      data: {
        status: 'admitted',
        enrollmentDate: new Date().toISOString().split('T')[0]
      }
    });
    res.json(student);
  } catch (error) {
    console.error('Approve error:', error);
    res.status(400).json({ error: 'فشل في اعتماد الطالب' });
  }
});

// --- Installment Management APIs ---

app.get('/api/installments/:studentId', async (req, res) => {
  try {
    const plan = await prisma.installmentPlan.findUnique({
      where: { studentId: req.params.studentId },
      include: { installments: { orderBy: { dueDate: 'asc' } } }
    });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch installments' });
  }
});

app.post('/api/installments', async (req, res) => {
  try {
    const { studentId, totalAmount, academicYear, installments } = req.body;
    
    // Use transaction to ensure plan and installments are created together
    const plan = await prisma.$transaction(async (tx) => {
      // Delete existing plan if any
      await tx.installmentPlan.deleteMany({ where: { studentId } });
      
      return tx.installmentPlan.create({
        data: {
          studentId,
          totalAmount,
          academicYear,
          installments: {
            create: installments.map((inst: any) => ({
              amount: inst.amount,
              dueDate: inst.dueDate,
              paidAmount: inst.paidAmount || 0,
              status: inst.status || 'pending',
              notes: inst.notes
            }))
          }
        },
        include: { installments: true }
      });
    });
    res.json(plan);
  } catch (error) {
    console.error('Failed to create plan:', error);
    res.status(400).json({ error: 'Failed to create installment plan' });
  }
});

app.patch('/api/installments/:installmentId', async (req, res) => {
  try {
    const { paidAmount, status, paidDate } = req.body;
    const installment = await prisma.installment.update({
      where: { id: req.params.installmentId },
      data: { paidAmount, status, paidDate }
    });
    res.json(installment);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update installment' });
  }
});

app.delete('/api/installments/plan/:studentId', async (req, res) => {
  try {
    await prisma.installmentPlan.deleteMany({
      where: { studentId: req.params.studentId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete plan' });
  }
});


// --- Accounting & Expenses API ---

// Mount the comprehensive accounting router (fiscal years, periods, cost centers, journal entries, reports)
app.use('/api', accountingRouter);

app.get('/api/accounts', async (req, res) => {
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

app.post('/api/accounts', async (req, res) => {
  try {
    const account = await prisma.account.create({ data: req.body });
    res.status(201).json(account);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create account' });
  }
});

app.patch('/api/accounts/:id', async (req, res) => {
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

app.delete('/api/accounts/:id', async (req, res) => {
  try {
    await prisma.account.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete account' });
  }
});

app.get('/api/expense-limits', async (req, res) => {
  try {
    const limits = await prisma.expenseLimit.findMany();
    res.json(limits);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch limits' });
  }
});

app.patch('/api/expense-limits/:role', async (req, res) => {
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

app.get('/api/expenses', async (req, res) => {
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

app.post('/api/expenses', async (req, res) => {
  try {
    const { amount, date, description, accountId, paymentMethod, requestedBy, notes, role } = req.body;

    // Validation: Amount must be greater than zero
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'المبلغ يجب أن يكون أكبر من صفر', code: 'INVALID_AMOUNT' });
    }

    const limitRecord = await prisma.expenseLimit.findUnique({ where: { role } });
    const limit = limitRecord ? limitRecord.maxAmount : 0;

    const requiresApproval = Number(amount) > limit;
    const status = requiresApproval ? 'pending_approval' : 'pending_treasury';

    const expense = await prisma.expense.create({
      data: {
        amount: Number(amount),
        date,
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

app.patch('/api/expenses/:id/approve', async (req, res) => {
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

app.patch('/api/expenses/:id/reject', async (req, res) => {
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

app.patch('/api/expenses/:id/pay', requireOpenTreasury, async (req, res) => {
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
        await tx.journalEntry.create({
          data: {
            description: `صرف مصروف نقدية (${exp.id.slice(0,8)}) - ${exp.description}`,
            referenceId: exp.id,
            lines: {
              create: [
                { accountId: exp.accountId, debit: exp.amount, credit: 0 },
                { accountId: creditAccount.id, debit: 0, credit: exp.amount }
              ]
            }
          }
        });
      }
      return [exp];
    });
    res.json(expense);
  } catch (error) {
    res.status(400).json({ error: 'Failed to process payment' });
  }
});

// ===== TREASURY SESSION APIs =====

// GET: الحالة الحالية للخزينة (اليوم)
app.get('/api/treasury/status', async (req, res) => {
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
      const lastSession = await prisma.treasurySession.findFirst({
        where: { status: 'closed' },
        orderBy: { date: 'desc' }
      });
      return res.json({
        status: 'no_session',
        suggestedOpeningBalance: lastSession?.actualBalance ?? lastSession?.closingBalance ?? null,
        isFirstEver: !lastSession,
        closedToday: session?.status === 'closed'
      });
    }

    const totalIncome = session.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const totalExpenses = session.expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    const currentBalance = session.openingBalance + totalIncome - totalExpenses;

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
app.post('/api/treasury/open', async (req, res) => {
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

    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({ error: 'فشل فتح الخزينة' });
  }
});

// POST: جرد الإغلاق - المرحلة الأولى (إدخال المبلغ الفعلي)
app.post('/api/treasury/close-request', async (req, res) => {
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

    const totalIncome = session.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const totalExpenses = session.expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    const expectedBalance = session.openingBalance + totalIncome - totalExpenses;
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
      return res.json({
        status: 'closed',
        session: closed,
        expectedBalance,
        difference: 0
      });
    }

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

// POST: تقديم ملاحظة فرق وتحويل الجلسة إلى حالة pending_close
app.post('/api/treasury/pending-close', async (req, res) => {
  const { actualBalance, closureNote, expectedBalance } = req.body;
  const userId = req.user!.userId;

  if (!closureNote || closureNote.trim().length < 10) {
    return res.status(400).json({ error: 'يجب كتابة سبب الفرق (10 أحرف على الأقل)' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const session = await prisma.treasurySession.findUnique({
      where: { date: today }
      // no include needed — we use caller-supplied expectedBalance
    });

    if (!session) {
      return res.status(404).json({ error: 'لا توجد جلسة اليوم' });
    }
    if (session.status === 'pending_close') {
      return res.status(409).json({ error: 'طلب الإغلاق تم تقديمه بالفعل وفي انتظار موافقة المدير', code: 'ALREADY_PENDING' });
    }
    if (session.status !== 'open') {
      return res.status(400).json({ error: 'الجلسة مغلقة بالفعل' });
    }

    if (session.openedBy !== userId) {
      return res.status(403).json({ error: 'فقط من فتح الخزينة يمكنه تقديم طلب الإغلاق' });
    }

    const difference = Number(actualBalance) - Number(expectedBalance);

    const closerUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    const updated = await prisma.treasurySession.update({
      where: { id: session.id },
      data: {
        status: 'pending_close',
        actualBalance: Number(actualBalance),
        closingBalance: Number(expectedBalance),
        difference,
        closedBy: closerUser?.name || userId,
        closureNote: closureNote.trim()
      }
    });

    res.json({
      status: 'pending_close',
      session: updated,
      expectedBalance: Number(expectedBalance),
      actualBalance: Number(actualBalance),
      difference,
      sessionId: session.id
    });
  } catch (error) {
    res.status(400).json({ error: 'فشل تقديم طلب الإغلاق' });
  }
});

// POST: إغلاق مع موافقة المدير (عند وجود فرق - الجلسة يجب أن تكون في حالة pending_close)
app.post('/api/treasury/close-approve', async (req, res) => {
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

    const closed = await prisma.treasurySession.update({
      where: { id: sessionId },
      data: {
        status: 'closed',
        approvedBy: approver.name,
        closedAt: new Date()
        // actualBalance, closingBalance, difference, closedBy, closureNote already set in pending-close step
      }
    });

    res.json({ status: 'closed', session: closed });
  } catch (error) {
    res.status(400).json({ error: 'فشل إغلاق الخزينة' });
  }
});

// GET: تاريخ جلسات الخزينة (للتقارير)
app.get('/api/treasury/sessions', async (req, res) => {
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
app.get('/api/treasury/sessions/:id', async (req, res) => {
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

    const totalIncome = session.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const totalExpenses = session.expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    const currentBalance = session.openingBalance + totalIncome - totalExpenses;

    res.json({ session, totalIncome, totalExpenses, currentBalance });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session details' });
  }
});

// --- Database Management API (system_admin only) ---

// Get database connection status
app.get('/api/database/status', requireAuth, adminOnly, async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'connected', provider: 'postgresql' });
  } catch (error) {
    console.error('Database connection test failed:', error);
    res.json({ status: 'disconnected', error: String(error) });
  }
});

// Get all tables and their row counts
app.get('/api/database/tables', requireAuth, adminOnly, async (req, res) => {
  try {
    const tables = [
      { key: 'user', name: 'المستخدمين (User)', count: await prisma.user.count() },
      { key: 'student', name: 'الطلاب (Student)', count: await prisma.student.count() },
      { key: 'studentYearlyFinance', name: 'المالية السنوية للطلاب (StudentYearlyFinance)', count: await prisma.studentYearlyFinance.count() },
      { key: 'stageFee', name: 'هياكل الرسوم (StageFee)', count: await prisma.stageFee.count() },
      { key: 'payment', name: 'المدفوعات (Payment)', count: await prisma.payment.count() },
      { key: 'inventoryItem', name: 'أصناف المخزن (InventoryItem)', count: await prisma.inventoryItem.count() },
      { key: 'inventoryTransaction', name: 'حركات المخزن (InventoryTransaction)', count: await prisma.inventoryTransaction.count() },
      { key: 'itemCategory', name: 'تصنيفات المخزن (ItemCategory)', count: await prisma.itemCategory.count() },
      { key: 'busRoute', name: 'خطوط الباص (BusRoute)', count: await prisma.busRoute.count() },
      { key: 'roleLimit', name: 'حدود الخصم للأدوار (RoleLimit)', count: await prisma.roleLimit.count() },
      { key: 'account', name: 'شجرة الحسابات (Account)', count: await prisma.account.count() },
      { key: 'fiscalYear', name: 'السنوات المالية (FiscalYear)', count: await prisma.fiscalYear.count() },
      { key: 'accountingPeriod', name: 'الفترات المحاسبية (AccountingPeriod)', count: await prisma.accountingPeriod.count() },
      { key: 'costCenter', name: 'مراكز التكلفة (CostCenter)', count: await prisma.costCenter.count() },
      { key: 'journalEntry', name: 'القيود المحاسبية (JournalEntry)', count: await prisma.journalEntry.count() },
      { key: 'journalEntryLine', name: 'تفاصيل القيود (JournalEntryLine)', count: await prisma.journalEntryLine.count() },
      { key: 'expense', name: 'المصروفات (Expense)', count: await prisma.expense.count() },
      { key: 'expenseLimit', name: 'حدود المصروفات (ExpenseLimit)', count: await prisma.expenseLimit.count() },
      { key: 'installmentPlan', name: 'خطط الأقساط (InstallmentPlan)', count: await prisma.installmentPlan.count() },
      { key: 'installment', name: 'الأقساط (Installment)', count: await prisma.installment.count() },
      { key: 'treasurySession', name: 'جلسات الخزينة (TreasurySession)', count: await prisma.treasurySession.count() }
    ];
    res.json(tables);
  } catch (error) {
    console.error('Failed to fetch tables:', error);
    res.status(500).json({ error: 'Failed to fetch database tables' });
  }
});

// Get all rows in a table (query only)
app.get('/api/database/tables/:tableName', requireAuth, adminOnly, async (req, res) => {
  const tableName = Array.isArray(req.params.tableName) ? req.params.tableName[0] : req.params.tableName;
  try {
    const delegate = (prisma as any)[tableName];
    if (!delegate) {
      return res.status(400).json({ error: 'جدول غير صالح' });
    }
    const data = await delegate.findMany({
      take: 1000 // Limit query to top 1000 rows to prevent memory overload in UI
    });
    res.json(data);
  } catch (error) {
    console.error(`Failed to query table ${tableName}:`, error);
    res.status(500).json({ error: `Failed to query table ${tableName}` });
  }
});

// Download full database backup
app.get('/api/database/backup', requireAuth, adminOnly, async (req, res) => {
  try {
    const backup = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      data: {
        user: await prisma.user.findMany(),
        roleLimit: await prisma.roleLimit.findMany(),
        account: await prisma.account.findMany(),
        fiscalYear: await prisma.fiscalYear.findMany(),
        accountingPeriod: await prisma.accountingPeriod.findMany(),
        costCenter: await prisma.costCenter.findMany(),
        journalEntry: await prisma.journalEntry.findMany(),
        journalEntryLine: await prisma.journalEntryLine.findMany(),
        student: await prisma.student.findMany(),
        studentYearlyFinance: await prisma.studentYearlyFinance.findMany(),
        stageFee: await prisma.stageFee.findMany(),
        payment: await prisma.payment.findMany(),
        inventoryItem: await prisma.inventoryItem.findMany(),
        inventoryTransaction: await prisma.inventoryTransaction.findMany(),
        itemCategory: await prisma.itemCategory.findMany(),
        busRoute: await prisma.busRoute.findMany(),
        expense: await prisma.expense.findMany(),
        expenseLimit: await prisma.expenseLimit.findMany(),
        installmentPlan: await prisma.installmentPlan.findMany(),
        installment: await prisma.installment.findMany(),
        treasurySession: await prisma.treasurySession.findMany(),
      }
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=school_backup_${new Date().toISOString().split('T')[0]}.json`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (error) {
    console.error('Backup generation failed:', error);
    res.status(500).json({ error: 'Failed to generate backup' });
  }
});

// Reset database (wipe everything except currently logged in admin)
app.post('/api/database/reset', requireAuth, adminOnly, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser || !currentUser.id) {
      return res.status(401).json({ error: 'سياق المستخدم غير متوفر' });
    }

    // 1. Fetch current logged-in user data to preserve it
    const adminData = await prisma.user.findUnique({
      where: { id: currentUser.id }
    });

    if (!adminData) {
      return res.status(404).json({ error: 'المستخدم الحالي غير موجود في قاعدة البيانات' });
    }

    // 2. Perform safe reset in transaction
    await prisma.$transaction(async (tx) => {
      // Temporarily disable foreign key constraints in PostgreSQL session
      await tx.$executeRawUnsafe("SET session_replication_role = 'replica';");
      
      const tablesToTruncate = [
        'InventoryTransaction', 'JournalEntryLine', 'Installment', 'InstallmentPlan',
        'Payment', 'Expense', 'JournalEntry', 'StudentYearlyFinance', 'StageFee',
        'AccountingPeriod', 'InventoryItem', 'Student', 'CostCenter', 'TreasurySession',
        'Account', 'FiscalYear', 'ItemCategory', 'BusRoute', 'RoleLimit', 'ExpenseLimit', 'User'
      ];
      
      // Truncate all tables
      for (const tbl of tablesToTruncate) {
        await tx.$executeRawUnsafe(`TRUNCATE TABLE "${tbl}" CASCADE;`);
      }

      // Re-insert the logged in administrator user
      await tx.user.create({
        data: {
          id: adminData.id,
          name: adminData.name,
          email: adminData.email,
          password: adminData.password,
          role: adminData.role,
          avatar: adminData.avatar,
          active: adminData.active,
          discountLimitPercent: adminData.discountLimitPercent,
          isOnline: adminData.isOnline,
          lastLoginAt: adminData.lastLoginAt,
          lastLogoutAt: adminData.lastLogoutAt,
          createdAt: adminData.createdAt
        }
      });

      // Restore foreign key checks
      await tx.$executeRawUnsafe("SET session_replication_role = 'origin';");
    });

    res.json({ message: 'تم تصفير قاعدة البيانات بنجاح مع الحفاظ على حسابك النشط' });
  } catch (error) {
    console.error('Database reset failed:', error);
    res.status(500).json({ error: 'فشل تصفير قاعدة البيانات: ' + String(error) });
  }
});

// Restore database backup
app.post('/api/database/restore', requireAuth, adminOnly, async (req, res) => {
  const { data } = req.body;
  if (!data) {
    return res.status(400).json({ error: 'بيانات النسخ الاحتياطي مفقودة' });
  }

  // Safety validations
  if (!data.user || !Array.isArray(data.user) || data.user.length === 0) {
    return res.status(400).json({ error: 'ملف النسخة الاحتياطية يجب أن يحتوي على مستخدمين' });
  }

  const hasAdmin = data.user.some((u: any) => u.role === 'system_admin');
  if (!hasAdmin) {
    return res.status(400).json({ error: 'يجب أن تحتوي النسخة الاحتياطية على مستخدم مسؤول واحد على الأقل لمنع قفل النظام' });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Temporarily disable foreign key constraints in PostgreSQL session
      await tx.$executeRawUnsafe("SET session_replication_role = 'replica';");
      try {
        const tablesToTruncate = [
          'InventoryTransaction', 'JournalEntryLine', 'Installment', 'InstallmentPlan',
          'Payment', 'Expense', 'JournalEntry', 'StudentYearlyFinance', 'StageFee',
          'AccountingPeriod', 'InventoryItem', 'Student', 'CostCenter', 'TreasurySession',
          'Account', 'FiscalYear', 'ItemCategory', 'BusRoute', 'RoleLimit', 'ExpenseLimit', 'User'
        ];
        
        // Truncate existing tables to avoid duplicate keys and conflicting data
        for (const tbl of tablesToTruncate) {
          await tx.$executeRawUnsafe(`TRUNCATE TABLE "${tbl}" CASCADE;`);
        }

        const modelKeys = [
          { key: 'user', delegate: 'user' },
          { key: 'roleLimit', delegate: 'roleLimit' },
          { key: 'account', delegate: 'account' },
          { key: 'fiscalYear', delegate: 'fiscalYear' },
          { key: 'accountingPeriod', delegate: 'accountingPeriod' },
          { key: 'costCenter', delegate: 'costCenter' },
          { key: 'journalEntry', delegate: 'journalEntry' },
          { key: 'journalEntryLine', delegate: 'journalEntryLine' },
          { key: 'student', delegate: 'student' },
          { key: 'studentYearlyFinance', delegate: 'studentYearlyFinance' },
          { key: 'stageFee', delegate: 'stageFee' },
          { key: 'payment', delegate: 'payment' },
          { key: 'inventoryItem', delegate: 'inventoryItem' },
          { key: 'inventoryTransaction', delegate: 'inventoryTransaction' },
          { key: 'itemCategory', delegate: 'itemCategory' },
          { key: 'busRoute', delegate: 'busRoute' },
          { key: 'expense', delegate: 'expense' },
          { key: 'expenseLimit', delegate: 'expenseLimit' },
          { key: 'installmentPlan', delegate: 'installmentPlan' },
          { key: 'installment', delegate: 'installment' },
          { key: 'treasurySession', delegate: 'treasurySession' },
        ];

        // Insert backup records
        for (const mk of modelKeys) {
          const records = data[mk.key];
          if (records && Array.isArray(records) && records.length > 0) {
            const delegate = (tx as any)[mk.delegate];
            await delegate.createMany({ data: records });
          }
        }
      } finally {
        // Re-enable foreign key constraints in PostgreSQL session
        await tx.$executeRawUnsafe("SET session_replication_role = 'origin';");
      }
    });

    console.log('✅ Database restore successfully completed');
    res.json({ message: 'تم استرجاع قاعدة البيانات بنجاح' });
  } catch (error) {
    console.error('Database restore failed:', error);
    res.status(500).json({ error: 'فشل استرجاع قاعدة البيانات', details: String(error) });
  }
});

// ===== Socket.IO Real-time User Presence =====

// Apply Socket.IO authentication middleware
io.use(socketAuth);

// Track connected users by socket ID (in-memory store)
const userSockets = new Map<string, { userId: string; socketId: string; connectTime: Date }>();

io.on('connection', (socket) => {
  const userId = socket.data.user.userId;
  console.log(`✅ New socket connection: ${socket.id} (user: ${userId})`);

  // When user logs in or connects
  socket.on('user-login', async () => {
    try {
      // userId comes from socket.data.user (JWT), not from event parameter
      userSockets.set(socket.id, { userId, socketId: socket.id, connectTime: new Date() });
      console.log(`🟢 User online: ${userId}`);

      // Notify all connected clients about this user being online
      io.emit('user-status-changed', {
        userId,
        isOnline: true,
        lastLogoutAt: null
      });
    } catch (error) {
      console.error('❌ user-login error:', error);
    }
  });

  // Heartbeat - User sends signal every 30 seconds to prove they're still online
  socket.on('heartbeat', () => {
    try {
      // userId comes from socket.data.user (JWT)
      // Update the socket entry to keep it fresh
      const existing = userSockets.get(socket.id);
      if (existing) {
        userSockets.set(socket.id, { ...existing, connectTime: new Date() });
      }
    } catch (error) {
      console.error('❌ heartbeat error:', error);
    }
  });

  // When user explicitly logs out
  socket.on('user-logout', async () => {
    try {
      // userId comes from socket.data.user (JWT)
      userSockets.delete(socket.id);
      console.log(`🔴 User offline (explicit logout): ${userId}`);

      // Notify all connected clients
      io.emit('user-status-changed', {
        userId,
        isOnline: false,
        lastLogoutAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ user-logout error:', error);
    }
  });

  // When socket disconnects (network issue, page close, etc.)
  socket.on('disconnect', () => {
    try {
      const user = userSockets.get(socket.id);
      if (user) {
        userSockets.delete(socket.id);
        console.log(`🔴 Socket disconnected, marking user offline: ${user.userId}`);

        // Notify all clients that user is offline
        io.emit('user-status-changed', {
          userId: user.userId,
          isOnline: false,
          lastLogoutAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('❌ disconnect error:', error);
    }
  });
});

// ===== Badges API =====

// Get all badges
app.get('/api/badges', async (req, res) => {
  try {
    const badges = await prisma.badge.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { students: true } } }
    });
    res.json(badges);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

// Create badge
app.post('/api/badges', requireRoles('system_admin', 'school_director'), async (req, res) => {
  try {
    const { name, color, icon, discountPercentage, description } = req.body;
    const badge = await prisma.badge.create({
      data: { name, color, icon, discountPercentage: Number(discountPercentage), description }
    });
    res.status(201).json(badge);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create badge' });
  }
});

// Update badge
app.patch('/api/badges/:id', requireRoles('system_admin', 'school_director'), async (req, res) => {
  const { id } = req.params;
  try {
    const { name, color, icon, discountPercentage, description } = req.body;
    const badge = await prisma.badge.update({
      where: { id: String(id) },
      data: { name, color, icon, discountPercentage: Number(discountPercentage), description }
    });
    res.json(badge);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update badge' });
  }
});

// Delete badge
app.delete('/api/badges/:id', requireRoles('system_admin', 'school_director'), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.badge.delete({ where: { id: String(id) } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete badge' });
  }
});

// Assign badge to student (auto-apply discount)
app.patch('/api/students/:id/badge', async (req, res) => {
  const { id } = req.params;
  const { badgeId } = req.body; // null to remove badge
  try {
    let discountData: Record<string, unknown> = {};

    if (badgeId) {
      const badge = await prisma.badge.findUnique({ where: { id: badgeId } });
      if (!badge) return res.status(404).json({ error: 'Badge not found' });

      const student = await prisma.student.findUnique({ where: { id } });
      if (!student) return res.status(404).json({ error: 'Student not found' });

      const discountAmount = Math.round((student.totalFees * badge.discountPercentage) / 100);
      discountData = {
        badgeId,
        discountPercentage: badge.discountPercentage,
        discountAmount,
        discountStatus: 'approved',
        discountApprovedBy: 'badge_system',
      };
    } else {
      // Remove badge → remove badge-based discount only if it was from badge
      discountData = {
        badgeId: null,
        discountPercentage: 0,
        discountAmount: 0,
        discountStatus: 'approved',
        discountApprovedBy: null,
      };
    }

    const student = await prisma.student.update({
      where: { id },
      data: discountData,
      include: { yearlyFinance: { orderBy: { academicYear: 'asc' } }, badge: true }
    });
    res.json(student);
  } catch (error) {
    console.error('Assign badge error:', error);
    res.status(400).json({ error: 'Failed to assign badge' });
  }
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { app };

// Start server (only when not in test environment)
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket ready on ws://localhost:${PORT}`);
  });
}
