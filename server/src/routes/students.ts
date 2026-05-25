import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRoles, managementRoles } from '../middleware/auth';
import { audit, getAuditContext } from '../middleware/audit';
import { encryptNationalId, decryptNationalId, hashNationalId } from '../lib/crypto';

const router = Router();
const prisma = new PrismaClient();

// ===== STUDENTS =====

// Get all students
router.get('/', async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where: { deletedAt: null },
      include: {
        yearlyFinance: {
          orderBy: { academicYear: 'asc' }
        },
        badge: true
      },
      orderBy: { createdAt: 'desc' }
    });
    const safeStudents = students.map(s => ({ ...s, nationalId: decryptNationalId(s.nationalId) }));
    res.json(safeStudents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Create a new student
router.post('/', async (req, res) => {
  try {
    const { nationalId, ...rest } = req.body;
    const encryptedId = nationalId ? encryptNationalId(nationalId) : undefined;
    const hashedId = nationalId ? hashNationalId(nationalId) : undefined;
    const student = await prisma.student.create({
      data: { ...rest, ...(nationalId ? { nationalId: encryptedId, nationalIdHash: hashedId } : {}) }
    });
    res.status(201).json({ ...student, nationalId: student.nationalId ? decryptNationalId(student.nationalId) : student.nationalId });
  } catch (error) {
    res.status(400).json({ error: 'Failed to create student' });
  }
});

// Update student
router.patch('/:id', async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const { nationalId, ...rest } = req.body;
    const extraData: Record<string, string> = {};
    if (nationalId !== undefined) {
      extraData.nationalId = encryptNationalId(nationalId);
      extraData.nationalIdHash = hashNationalId(nationalId);
    }
    const student = await prisma.student.update({
      where: { id },
      data: { ...rest, ...extraData },
      include: {
        yearlyFinance: {
          orderBy: { academicYear: 'asc' }
        }
      }
    });
    res.json({ ...student, nationalId: decryptNationalId(student.nationalId) });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(400).json({ error: 'Failed to update student', details: String(error) });
  }
});

// Delete student
router.delete('/:id', requireAuth, managementRoles, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const paymentCount = await prisma.payment.count({
      where: { studentId: id, deletedAt: null },
    });
    if (paymentCount > 0) {
      return res.status(409).json({
        error: 'Cannot delete student with payment history',
        code: 'STUDENT_HAS_PAYMENTS',
      });
    }

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student || student.deletedAt) {
      return res.status(404).json({ error: 'Student not found' });
    }

    await prisma.student.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await audit(
      getAuditContext(req),
      'DELETE',
      'Student',
      id,
      { name: student.name, status: student.status },
      { deletedAt: new Date().toISOString() },
    );
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete student' });
  }
});

// Promote student to new stage/grade with arrears carryover
router.post('/:id/promote', requireRoles('school_director', 'head_accountant'), async (req, res) => {
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
      .reduce((sum, p) => sum + Number(p.amount), 0);

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
router.post('/bulk-promote', requireRoles('school_director', 'head_accountant'), async (req, res) => {
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
      where: { id: { in: promotedIds }, deletedAt: null },
      include: { payments: { where: { NOT: { type: 'application_fee' } } } },
    });

    for (const student of studentsWithPayments) {
      const promo = promotions.find((p) => p.studentId === student.id);
      if (!promo) continue;
      const fromYear = promo.fromAcademicYear;
      const oldPaid = student.payments
        .filter((p) => !p.academicYear || p.academicYear === fromYear)
        .reduce((sum, p) => sum + Number(p.amount), 0);
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

// GET: Student inventory transactions
router.get('/:id/inventory', async (req, res) => {
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

// Assign badge to student (auto-apply discount)
router.patch('/:id/badge', requireAuth, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { badgeId } = req.body; // null to remove badge
  try {
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Gross fees = sum of individual components (never use totalFees which may already be net)
    const additionalFeesArr = Array.isArray(student.additionalFees) ? student.additionalFees as any[] : [];
    const grossFees =
      Number(student.tuitionFees  || 0) +
      Number(student.booksFees    || 0) +
      Number(student.uniformFees  || 0) +
      Number(student.busFees      || 0) +
      Number(student.otherFees    || 0) +
      additionalFeesArr.reduce((s: number, f: any) => {
        const amt = Number(f?.amount);
        return s + (f?.selected && !isNaN(amt) ? amt : 0);
      }, 0);

    let discountData: Record<string, unknown>;

    if (badgeId) {
      const badge = await prisma.badge.findUnique({ where: { id: badgeId } });
      if (!badge) return res.status(404).json({ error: 'Badge not found' });

      const discountAmount = Math.round(grossFees * Number(badge.discountPercentage) / 100);
      discountData = {
        badgeId,
        discountPercentage: badge.discountPercentage,
        discountAmount,
        totalFees: grossFees - discountAmount,   // apply the deduction
        discountStatus: 'approved',
        discountApprovedBy: 'badge_system',
      };
    } else {
      // Remove badge → zero the discount and restore full gross fees
      discountData = {
        badgeId: null,
        discountPercentage: 0,
        discountAmount: 0,
        totalFees: grossFees,                    // restore gross when badge removed
        discountStatus: 'approved',
        discountApprovedBy: null,
      };
    }

    const updated = await prisma.student.update({
      where: { id },
      data: discountData,
      include: { yearlyFinance: { orderBy: { academicYear: 'asc' } }, badge: true }
    });
    res.json(updated);
  } catch (error) {
    console.error('Assign badge error:', error);
    res.status(400).json({ error: 'Failed to assign badge' });
  }
});

// ===== ADMISSION =====
// NOTE: These routes are accessed via /api/admission/* (mounted separately)

// 1. Initial Application
router.post('/apply', async (req, res) => {
  try {
    const { nationalId, ...rest } = req.body;
    const encryptedId = nationalId ? encryptNationalId(nationalId) : undefined;
    const hashedId = nationalId ? hashNationalId(nationalId) : undefined;
    const student = await prisma.student.create({
      data: {
        ...rest,
        ...(nationalId ? { nationalId: encryptedId, nationalIdHash: hashedId } : {}),
        status: 'applied'
      }
    });
    res.status(201).json({ ...student, nationalId: student.nationalId ? decryptNationalId(student.nationalId) : student.nationalId });
  } catch (error) {
    console.error('❌ Admission apply error:', error);
    res.status(400).json({ error: 'Failed to apply' });
  }
});

// 2. Set Test Result
router.patch('/test-result/:id', async (req, res) => {
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
router.patch('/setup-fees/:id', async (req, res) => {
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
    const finalDiscountStatus = (Number(discountPercentage || 0) > Number(userLimit)) ? 'pending' : (discountStatus || 'approved');
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
router.get('/pending-discounts', async (req, res) => {
  const { approverId } = req.query;
  try {
    const user = approverId ? await prisma.user.findUnique({ where: { id: approverId as string } }) : null;

    let whereClause: any = { discountStatus: 'pending', deletedAt: null };

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
    res.json(students.map(s => ({ ...s, nationalId: decryptNationalId(s.nationalId) })));
  } catch (error) {
    console.error('❌ pending-discounts error:', error);
    res.status(500).json({ error: 'Failed to fetch pending discounts' });
  }
});

// Fix existing students that have discounts but wrong discountStatus
router.patch('/fix-discount-status', async (req, res) => {
  try {
    // Find students who have a discount amount but discountStatus is not 'pending'
    // and their status is 'pending_approval' — these likely bypassed the workflow
    const studentsWithDiscount = await prisma.student.findMany({
      where: {
        discountAmount: { gt: 0 },
        discountStatus: { not: 'pending' },
        status: 'pending_approval',
        deletedAt: null,
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
router.patch('/action-discount/:id', async (req, res) => {
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

      const discountPct = Number(student.discountPercentage || 0) ||
        (Number(student.totalFees) + Number(student.discountAmount) > 0
          ? (Number(student.discountAmount) / (Number(student.totalFees) + Number(student.discountAmount))) * 100
          : 0);

      if (discountPct > Number(approver.discountLimitPercent)) {
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
    await audit(
      getAuditContext(req),
      status === 'approved' ? 'APPROVE' : 'REJECT',
      'Discount',
      id,
      { discountStatus: 'pending' },
      { discountStatus: status === 'approved' ? 'approved' : 'rejected' },
    );
    res.json(updatedStudent);
  } catch (error) {
    res.status(400).json({ error: 'Failed to action discount' });
  }
});

// 4. Final Approval — ينشئ قيد ذمم الطالب المدينة عند الاعتماد
router.patch('/approve/:id', async (req, res) => {
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
    if (approverId && Number(existing.discountAmount) > 0) {
      const approver = await prisma.user.findUnique({ where: { id: approverId } });
      if (approver) {
        const discountPct = Number(existing.discountPercentage || 0) ||
          ((Number(existing.totalFees) + Number(existing.discountAmount)) > 0
            ? (Number(existing.discountAmount) / (Number(existing.totalFees) + Number(existing.discountAmount))) * 100
            : 0);

        if (discountPct > Number(approver.discountLimitPercent)) {
          return res.status(403).json({
            error: `لا يمكنك اعتماد هذا الطالب. صلاحيتك للخصم ${approver.discountLimitPercent}% والخصم المطبق ${discountPct.toFixed(1)}%`
          });
        }
      }
    }

    // ═══════════════════════════════════════════════════════
    // قيد محاسبي: نشوء الذمة المدينة عند اعتماد الطالب
    //   مدين:  ذمم طلاب مدينة (1201)  ← الدين نشأ
    //   دائن:  إيرادات رسوم (4001-4006) ← إيراد مستحق مفصّل
    // ═══════════════════════════════════════════════════════
    const [student] = await prisma.$transaction(async (tx) => {
      const updatedStudent = await tx.student.update({
        where: { id },
        data: {
          status: 'admitted',
          enrollmentDate: new Date().toISOString().split('T')[0]
        }
      });

      // فتح الذمة عند الاعتماد — تفصيل الإيرادات حسب نوع الرسوم
      const feesBreakdown = [
        { code: '4001', amount: Number(existing.tuitionFees) },
        { code: '4002', amount: Number(existing.booksFees) },
        { code: '4003', amount: Number(existing.uniformFees) },
        { code: '4004', amount: Number(existing.busFees) },
        { code: '4006', amount: Number(existing.otherFees) },
      ].filter(f => f.amount > 0);

      if (feesBreakdown.length > 0) {
        const arAccount = await tx.account.findUnique({ where: { code: '1201' } });
        const revenueAccounts = await tx.account.findMany({
          where: { code: { in: feesBreakdown.map(f => f.code) } }
        });
        const codeToId = Object.fromEntries(revenueAccounts.map(a => [a.code, a.id]));

        if (!arAccount) throw new Error('AR account 1201 not found — cannot record student fees');

        // تحقق: هل يوجد قيد ذمة مسبق لهذا الطالب؟
        const existingEntry = await tx.journalEntry.findFirst({
          where: { referenceType: 'student_fees', referenceId: id }
        });

        if (!existingEntry) {
          const totalFeesAmt = feesBreakdown.reduce((s, f) => s + f.amount, 0);
          const today = new Date().toISOString().split('T')[0];

          // Retry on unique constraint violation (entryNumber collision under concurrent load)
          let je: any;
          let retries = 0;
          while (!je && retries < 3) {
            const count = await tx.journalEntry.count();
            const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
            try {
              je = await tx.journalEntry.create({
                data: {
                  entryNumber,
                  entryDate:     today,
                  description:   `إثبات رسوم الطالب: ${existing.name} — العام ${existing.academicYear}`,
                  referenceType: 'student_fees',
                  referenceId:   id,
                  status:        'posted',
                  createdBy:     approverId || 'system',
                  postedAt:      new Date(),
                  postedBy:      approverId || 'system',
                  lines: {
                    create: [
                      // مدين: ذمم الطالب (1201)
                      { accountId: arAccount.id, debit: totalFeesAmt, credit: 0, lineNumber: 1, description: `رسوم ${existing.name}` },
                      // دائن: إيرادات حسب نوع الرسوم
                      ...feesBreakdown.map((f, idx) => ({
                        accountId:   codeToId[f.code],
                        debit:       0,
                        credit:      f.amount,
                        lineNumber:  idx + 2,
                        description: `إيراد نوع ${f.code}`
                      }))
                    ]
                  }
                }
              });
            } catch (err: any) {
              if (err?.code === 'P2002' && retries < 2) {
                retries++;
              } else {
                throw err;
              }
            }
          }
        }
      }

      return [updatedStudent];
    });

    res.json(student);
  } catch (error) {
    console.error('Approve error:', error);
    res.status(400).json({ error: 'فشل في اعتماد الطالب' });
  }
});

export default router;
