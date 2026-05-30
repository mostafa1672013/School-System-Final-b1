-- CreateTable (baseline: BankDeposit already exists in DB, applied via db push)
CREATE TABLE IF NOT EXISTS "BankDeposit" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bankAccountId" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "sessionId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BankDeposit_sessionId_idx" ON "BankDeposit"("sessionId");

-- AddForeignKey (skip if already exists)
DO $$ BEGIN
    ALTER TABLE "BankDeposit" ADD CONSTRAINT "BankDeposit_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TreasurySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "BankDeposit" ADD CONSTRAINT "BankDeposit_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
