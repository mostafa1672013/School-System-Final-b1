-- CreateTable
CREATE TABLE "treasury_session_audits" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "closingBalance" DECIMAL(12,2),
    "actualBalance" DECIMAL(12,2),
    "difference" DECIMAL(12,2),
    "closedBy" TEXT,
    "approvedBy" TEXT,
    "closureNote" TEXT,
    "performedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treasury_session_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "treasury_session_audits_sessionId_idx" ON "treasury_session_audits"("sessionId");
