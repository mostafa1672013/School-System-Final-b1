-- AlterTable JournalEntry: add new columns as optional first
ALTER TABLE "JournalEntry" 
  ADD COLUMN IF NOT EXISTS "entryNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "entryDate" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "postingDate" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "referenceType" TEXT,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "periodId" TEXT,
  ADD COLUMN IF NOT EXISTS "isReversal" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reversalOfId" TEXT,
  ADD COLUMN IF NOT EXISTS "reversedById" TEXT,
  ADD COLUMN IF NOT EXISTS "createdBy" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "postedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "postedBy" TEXT;

-- Populate entryNumber for existing rows
UPDATE "JournalEntry" SET "entryNumber" = gen_random_uuid()::text WHERE "entryNumber" IS NULL;

-- Now make entryNumber NOT NULL and UNIQUE
ALTER TABLE "JournalEntry" ALTER COLUMN "entryNumber" SET NOT NULL;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_entryNumber_key" UNIQUE ("entryNumber");

-- Drop old date column (migrate data to entryDate first)
UPDATE "JournalEntry" SET "entryDate" = to_char("date", 'YYYY-MM-DD') WHERE "entryDate" = '' AND "date" IS NOT NULL;
ALTER TABLE "JournalEntry" DROP COLUMN IF EXISTS "date";

-- AlterTable JournalEntryLine: add new columns
ALTER TABLE "JournalEntryLine"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "costCenterId" TEXT,
  ADD COLUMN IF NOT EXISTS "lineNumber" INT NOT NULL DEFAULT 1;

-- AlterTable Account: add new columns
ALTER TABLE "Account"
  ADD COLUMN IF NOT EXISTS "nameEn" TEXT,
  ADD COLUMN IF NOT EXISTS "level" INT NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS "normalBalance" TEXT NOT NULL DEFAULT 'debit',
  ADD COLUMN IF NOT EXISTS "isSystemAccount" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "allowManualEntry" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable FiscalYear
CREATE TABLE IF NOT EXISTS "FiscalYear" (
  "id" TEXT NOT NULL,
  "yearCode" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "startDate" TEXT NOT NULL,
  "endDate" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "closedAt" TIMESTAMP(3),
  "closedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FiscalYear_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FiscalYear_yearCode_key" ON "FiscalYear"("yearCode");

-- CreateTable AccountingPeriod
CREATE TABLE IF NOT EXISTS "AccountingPeriod" (
  "id" TEXT NOT NULL,
  "periodCode" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "startDate" TEXT NOT NULL,
  "endDate" TEXT NOT NULL,
  "fiscalYearId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "closedAt" TIMESTAMP(3),
  "closedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AccountingPeriod_periodCode_key" ON "AccountingPeriod"("periodCode");

-- AddForeignKey for AccountingPeriod
ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_fiscalYearId_fkey" 
  FOREIGN KEY ("fiscalYearId") REFERENCES "FiscalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey for JournalEntry -> AccountingPeriod
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_periodId_fkey"
  FOREIGN KEY ("periodId") REFERENCES "AccountingPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable CostCenter
CREATE TABLE IF NOT EXISTS "CostCenter" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "description" TEXT,
  "parentId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CostCenter_code_key" ON "CostCenter"("code");

-- AddForeignKey for CostCenter self-reference
ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for JournalEntryLine -> CostCenter
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_costCenterId_fkey"
  FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

