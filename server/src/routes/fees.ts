import { Router } from 'express';
const router = Router();
import { prisma } from '../lib/prisma';

// ===== STAGE FEES =====

router.get('/', async (req, res) => {
  try {
    const fees = await prisma.stageFee.findMany();
    res.json(fees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stage fees' });
  }
});

router.post('/', async (req, res) => {
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

router.patch('/:id', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
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

export default router;
