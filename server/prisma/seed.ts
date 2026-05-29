import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const academicYear = "2024-2025";
  
  const stageFees = [
    // KG
    { stage: 'kg', grade: 'KG1', track: 'local', academicYear, tuitionFees: 12000, booksFees: 1500, uniformFees: 1000, applicationFees: 500 },
    { stage: 'kg', grade: 'KG2', track: 'local', academicYear, tuitionFees: 12500, booksFees: 1500, uniformFees: 1000, applicationFees: 500 },
    { stage: 'kg', grade: 'KG1', track: 'international', academicYear, tuitionFees: 25000, booksFees: 3000, uniformFees: 2000, applicationFees: 1000 },
    
    // Primary
    { stage: 'primary', grade: 'الصف الأول الابتدائي', track: 'local', academicYear, tuitionFees: 15000, booksFees: 2000, uniformFees: 1200, applicationFees: 500 },
    { stage: 'primary', grade: 'الصف الثاني الابتدائي', track: 'local', academicYear, tuitionFees: 15500, booksFees: 2000, uniformFees: 1200, applicationFees: 500 },
    { stage: 'primary', grade: 'الصف السادس الابتدائي', track: 'local', academicYear, tuitionFees: 18000, booksFees: 2500, uniformFees: 1200, applicationFees: 500 },
    
    // Preparatory
    { stage: 'preparatory', grade: 'الصف الأول الإعدادي', track: 'local', academicYear, tuitionFees: 20000, booksFees: 3000, uniformFees: 1500, applicationFees: 500 },
    
    // Secondary
    { stage: 'secondary', grade: 'الصف الأول الثانوي', track: 'local', academicYear, tuitionFees: 25000, booksFees: 3500, uniformFees: 1500, applicationFees: 500 },
    { stage: 'secondary', grade: 'الصف الثالث الثانوي', track: 'local', academicYear, tuitionFees: 30000, booksFees: 4000, uniformFees: 1500, applicationFees: 500 },
  ];

  console.log('🌱 جاري إضافة بيانات الرسوم التجريبية...');

  for (const fee of stageFees) {
    await prisma.stageFee.upsert({
      where: {
        stage_grade_track_academicYear: {
          stage: fee.stage,
          grade: fee.grade,
          track: fee.track,
          academicYear: fee.academicYear
        }
      },
      update: fee,
      create: fee,
    });
  }

  console.log('✅ تم إضافة بيانات الرسوم بنجاح.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
