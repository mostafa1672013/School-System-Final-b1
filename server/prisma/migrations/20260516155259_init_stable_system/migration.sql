/*
  Warnings:

  - The primary key for the `employees` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `employees` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `employee_id` on the `attendance` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `employee_id` on the `audit_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_employee_id_fkey";

-- AlterTable
ALTER TABLE "attendance" DROP COLUMN "employee_id",
ADD COLUMN     "employee_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "employee_id",
ADD COLUMN     "employee_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "employees" DROP CONSTRAINT "employees_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_employee_id_date_key" ON "attendance"("employee_id", "date");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
