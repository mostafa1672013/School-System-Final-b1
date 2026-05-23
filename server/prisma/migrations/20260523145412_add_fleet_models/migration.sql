-- CreateTable
CREATE TABLE "RentalCompany" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "taxId" TEXT,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalContract" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "title" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "monthlyFeePerBus" DECIMAL(12,2) NOT NULL,
    "busesCount" INTEGER NOT NULL,
    "includesDriver" BOOLEAN NOT NULL DEFAULT true,
    "includesFuel" BOOLEAN NOT NULL DEFAULT true,
    "includesMaintenance" BOOLEAN NOT NULL DEFAULT true,
    "includesInsurance" BOOLEAN NOT NULL DEFAULT true,
    "paymentFrequency" TEXT NOT NULL DEFAULT 'monthly',
    "paymentDueDay" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetBus" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "ownershipType" TEXT NOT NULL DEFAULT 'rented_full',
    "rentalContractId" TEXT,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "color" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "insuranceExpiry" TIMESTAMP(3),
    "licenseExpiry" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetBus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalDriver" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "companyId" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalDriver_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RentalCompany_code_key" ON "RentalCompany"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RentalContract_contractNumber_key" ON "RentalContract"("contractNumber");

-- CreateIndex
CREATE INDEX "RentalContract_companyId_idx" ON "RentalContract"("companyId");

-- CreateIndex
CREATE INDEX "RentalContract_status_idx" ON "RentalContract"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FleetBus_code_key" ON "FleetBus"("code");

-- CreateIndex
CREATE UNIQUE INDEX "FleetBus_plateNumber_key" ON "FleetBus"("plateNumber");

-- CreateIndex
CREATE INDEX "FleetBus_status_idx" ON "FleetBus"("status");

-- CreateIndex
CREATE INDEX "FleetBus_rentalContractId_idx" ON "FleetBus"("rentalContractId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalDriver_code_key" ON "ExternalDriver"("code");

-- CreateIndex
CREATE INDEX "ExternalDriver_companyId_idx" ON "ExternalDriver"("companyId");

-- CreateIndex
CREATE INDEX "ExternalDriver_isActive_idx" ON "ExternalDriver"("isActive");

-- AddForeignKey
ALTER TABLE "RentalContract" ADD CONSTRAINT "RentalContract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "RentalCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetBus" ADD CONSTRAINT "FleetBus_rentalContractId_fkey" FOREIGN KEY ("rentalContractId") REFERENCES "RentalContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDriver" ADD CONSTRAINT "ExternalDriver_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "RentalCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
