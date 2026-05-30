-- CreateTable
CREATE TABLE "BusSubscription" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "subscriberType" TEXT NOT NULL,
    "studentId" TEXT,
    "subscriberName" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "fullFeeAmount" DECIMAL(12,2) NOT NULL,
    "discountPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "actualAmount" DECIMAL(12,2) NOT NULL,
    "pickupAddress" TEXT,
    "pickupPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusSubscription_code_key" ON "BusSubscription"("code");

-- AddForeignKey
ALTER TABLE "BusSubscription" ADD CONSTRAINT "BusSubscription_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "BusRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
