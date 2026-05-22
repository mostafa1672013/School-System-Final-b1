-- AlterTable
ALTER TABLE "Student" ADD COLUMN "nationalIdHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Student_nationalIdHash_key" ON "Student"("nationalIdHash");
