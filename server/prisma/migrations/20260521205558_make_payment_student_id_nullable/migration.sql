-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_studentId_fkey";

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "studentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
