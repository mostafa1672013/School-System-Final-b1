import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const academicYear = "2024-2025";
  
  const testStudents = [
    {
      nationalId: '30001010111111',
      name: 'عمار ياسر محمد',
      stage: 'kg',
      grade: 'KG1',
      track: 'local',
      academicYear,
      guardianName: 'ياسر محمد علي',
      guardianPhone: '01001111111',
      status: 'applied',
      hasSiblings: true,
    },
    {
      nationalId: '30002020222222',
      name: 'لينا أحمد كمال',
      stage: 'primary',
      grade: 'الصف الأول الابتدائي',
      track: 'local',
      academicYear,
      guardianName: 'أحمد كمال حسن',
      guardianPhone: '01002222222',
      status: 'under_testing',
      hasSiblings: false,
    },
    {
      nationalId: '30003030333333',
      name: 'ياسين محمود عمر',
      stage: 'preparatory',
      grade: 'الصف الأول الإعدادي',
      track: 'local',
      academicYear,
      guardianName: 'محمود عمر سعيد',
      guardianPhone: '01003333333',
      status: 'fee_setup',
      testResult: 'pass',
      hasSiblings: false,
    },
    {
      nationalId: '30004040444444',
      name: 'سلمى إبراهيم نور',
      stage: 'secondary',
      grade: 'الصف الأول الثانوي',
      track: 'local',
      academicYear,
      guardianName: 'إبراهيم نور الدين',
      guardianPhone: '01004444444',
      status: 'pending_approval',
      testResult: 'pass',
      tuitionFees: 25000,
      booksFees: 3500,
      uniformFees: 1500,
      totalFees: 30000,
      hasSiblings: true,
    }
  ];

  console.log('🌱 جاري إضافة طلاب تجريبيين للقبول...');

  for (const student of testStudents) {
    await prisma.student.upsert({
      where: { nationalId: student.nationalId },
      update: student,
      create: student,
    });
  }

  console.log('✅ تم إضافة الطلاب بنجاح.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
