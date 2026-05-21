-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "arrearsFees" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StudentYearlyFinance" ADD COLUMN     "arrearsFees" DOUBLE PRECISION NOT NULL DEFAULT 0;
