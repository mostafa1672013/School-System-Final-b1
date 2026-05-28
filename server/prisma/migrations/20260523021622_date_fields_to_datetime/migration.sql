/*
  Warnings:

  - Changed the type of `date` on the `Expense` table from String to DateTime.
  - Changed the type of `date` on the `InventoryTransaction` table from String to DateTime.
  - Changed the type of `date` on the `Payment` table from String to DateTime.

*/
-- AlterTable: Payment date String → DateTime (cast existing YYYY-MM-DD strings)
ALTER TABLE "Payment" ALTER COLUMN "date" TYPE TIMESTAMP(3) USING ("date"::timestamp);

-- AlterTable: Expense date String → DateTime
ALTER TABLE "Expense" ALTER COLUMN "date" TYPE TIMESTAMP(3) USING ("date"::timestamp);

-- AlterTable: InventoryTransaction date String → DateTime
ALTER TABLE "InventoryTransaction" ALTER COLUMN "date" TYPE TIMESTAMP(3) USING ("date"::timestamp);
