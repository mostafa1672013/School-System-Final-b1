import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany();
  
  for (const student of students) {
    // Add 2 previous years of history
    const history = [
      {
        academicYear: '2022-2023',
        grade: 'السابق-1',
        stage: student.stage,
        tuitionFees: 10000,
        booksFees: 1000,
        uniformFees: 1000,
        totalFees: 12000,
        paidAmount: 11000, // Still owes 1000
      },
      {
        academicYear: '2023-2024',
        grade: 'السابق-2',
        stage: student.stage,
        tuitionFees: 12000,
        booksFees: 1200,
        uniformFees: 1200,
        totalFees: 14400,
        paidAmount: 14400, // Fully paid
      }
    ];

    for (const item of history) {
      await prisma.studentYearlyFinance.upsert({
        where: {
          studentId_academicYear: {
            studentId: student.id,
            academicYear: item.academicYear
          }
        },
        update: {},
        create: {
          ...item,
          studentId: student.id
        }
      });
    }

    // Also ensure current year is in yearlyFinance
    await prisma.studentYearlyFinance.upsert({
      where: {
        studentId_academicYear: {
          studentId: student.id,
          academicYear: '2024-2025'
        }
      },
      update: {},
      create: {
        academicYear: '2024-2025',
        grade: student.grade,
        stage: student.stage,
        tuitionFees: student.tuitionFees,
        booksFees: student.booksFees,
        uniformFees: student.uniformFees,
        busFees: student.busFees,
        otherFees: student.otherFees,
        totalFees: student.totalFees,
        paidAmount: student.paidAmount,
        studentId: student.id
      }
    });
  }

  console.log('✅ History seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
