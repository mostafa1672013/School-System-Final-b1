-- CreateTable
CREATE TABLE "SubscriptionChange" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "changeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "previousRouteId" TEXT,
    "newRouteId" TEXT,
    "previousFullFee" DECIMAL(12,2),
    "newFullFee" DECIMAL(12,2),
    "monthsRemaining" INTEGER,
    "previousRemaining" DECIMAL(12,2),
    "newRemaining" DECIMAL(12,2),
    "proRataDifference" DECIMAL(12,2),
    "direction" TEXT,
    "changeReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "SubscriptionChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalInvoice" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "baseAmount" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "paymentDate" TIMESTAMP(3),
    "notes" TEXT,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionChange_subscriptionId_idx" ON "SubscriptionChange"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "RentalInvoice_code_key" ON "RentalInvoice"("code");

-- CreateIndex
CREATE INDEX "RentalInvoice_contractId_idx" ON "RentalInvoice"("contractId");

-- CreateIndex
CREATE INDEX "RentalInvoice_status_idx" ON "RentalInvoice"("status");

-- AddForeignKey
ALTER TABLE "SubscriptionChange" ADD CONSTRAINT "SubscriptionChange_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "BusSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalInvoice" ADD CONSTRAINT "RentalInvoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "RentalContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
