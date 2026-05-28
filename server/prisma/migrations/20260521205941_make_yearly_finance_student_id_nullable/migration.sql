-- DropForeignKey
ALTER TABLE "StudentYearlyFinance" DROP CONSTRAINT "StudentYearlyFinance_studentId_fkey";

-- AlterTable
ALTER TABLE "StudentYearlyFinance" ALTER COLUMN "studentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "StudentYearlyFinance" ADD CONSTRAINT "StudentYearlyFinance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
