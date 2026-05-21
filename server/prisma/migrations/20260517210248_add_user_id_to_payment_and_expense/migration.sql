-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "paidByUserId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "userId" TEXT;
