import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, adminOnly } from '../middleware/auth';
import { decryptNationalId } from '../lib/crypto';

const router = Router();
const prisma = new PrismaClient();

// ===== DATABASE MANAGEMENT (system_admin only) =====

// Get database connection status
router.get('/status', requireAuth, adminOnly, async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'connected', provider: 'postgresql' });
  } catch (error) {
    console.error('Database connection test failed:', error);
    res.json({ status: 'disconnected', error: String(error) });
  }
});

// Get all tables and their row counts
router.get('/tables', requireAuth, adminOnly, async (req, res) => {
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
router.get('/tables/:tableName', requireAuth, adminOnly, async (req, res) => {
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
router.get('/backup', requireAuth, adminOnly, async (req, res) => {
  try {
    const backup = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      data: {
        user: await prisma.user.findMany({ where: { deletedAt: null } }),
        roleLimit: await prisma.roleLimit.findMany(),
        account: await prisma.account.findMany(),
        fiscalYear: await prisma.fiscalYear.findMany(),
        accountingPeriod: await prisma.accountingPeriod.findMany(),
        costCenter: await prisma.costCenter.findMany(),
        journalEntry: await prisma.journalEntry.findMany(),
        journalEntryLine: await prisma.journalEntryLine.findMany(),
        student: (await prisma.student.findMany({ where: { deletedAt: null } })).map(s => ({ ...s, nationalId: decryptNationalId(s.nationalId) })),
        studentYearlyFinance: await prisma.studentYearlyFinance.findMany(),
        stageFee: await prisma.stageFee.findMany(),
        payment: await prisma.payment.findMany({ where: { deletedAt: null } }),
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
router.post('/reset', requireAuth, adminOnly, async (req, res) => {
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
router.post('/restore', requireAuth, adminOnly, async (req, res) => {
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

export default router;
