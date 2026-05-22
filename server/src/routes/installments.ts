import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ===== INSTALLMENT MANAGEMENT =====

router.get('/:studentId', async (req, res) => {
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

router.post('/', async (req, res) => {
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

router.patch('/:installmentId', async (req, res) => {
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

router.delete('/plan/:studentId', async (req, res) => {
  try {
    await prisma.installmentPlan.deleteMany({
      where: { studentId: req.params.studentId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete plan' });
  }
});

export default router;
