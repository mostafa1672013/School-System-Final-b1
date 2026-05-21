/*
  Warnings:

  - Added the required column `updatedAt` to the `InventoryItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "itemType" TEXT NOT NULL DEFAULT 'consumable',
ADD COLUMN     "maxQuantity" INTEGER,
ADD COLUMN     "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subType" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitCostSnapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPriceSnapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "supplierName" TEXT,
    "departmentName" TEXT,
    "studentId" TEXT,
    "studentName" TEXT,
    "notes" TEXT,
    "performedBy" TEXT NOT NULL,
    "performedByUserId" TEXT,
    "journalEntryId" TEXT,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
