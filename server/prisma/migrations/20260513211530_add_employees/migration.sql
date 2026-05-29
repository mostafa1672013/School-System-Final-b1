-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "nationalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "stage" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "track" TEXT NOT NULL DEFAULT 'local',
    "academicYear" TEXT NOT NULL DEFAULT '2024-2025',
    "className" TEXT,
    "guardianName" TEXT NOT NULL,
    "guardianPhone" TEXT NOT NULL,
    "address" TEXT,
    "enrollmentDate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'applied',
    "hasSiblings" BOOLEAN NOT NULL DEFAULT false,
    "testResult" TEXT,
    "tuitionFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tuitionMandatory" BOOLEAN NOT NULL DEFAULT true,
    "booksFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "booksMandatory" BOOLEAN NOT NULL DEFAULT true,
    "uniformFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "uniformMandatory" BOOLEAN NOT NULL DEFAULT true,
    "busFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingPaymentAmount" DOUBLE PRECISION,
    "pendingPaymentType" TEXT,
    "paymentRequestStatus" TEXT,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountApprovedBy" TEXT,
    "busRouteId" TEXT,
    "documents" JSONB,
    "additionalFees" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageFee" (
    "id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "track" TEXT NOT NULL DEFAULT 'local',
    "academicYear" TEXT NOT NULL,
    "tuitionFees" DOUBLE PRECISION NOT NULL,
    "tuitionMandatory" BOOLEAN NOT NULL DEFAULT true,
    "booksFees" DOUBLE PRECISION NOT NULL,
    "booksMandatory" BOOLEAN NOT NULL DEFAULT true,
    "uniformFees" DOUBLE PRECISION NOT NULL,
    "uniformMandatory" BOOLEAN NOT NULL DEFAULT true,
    "applicationFees" DOUBLE PRECISION NOT NULL,
    "applicationMandatory" BOOLEAN NOT NULL DEFAULT true,
    "additionalFees" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StageFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "collectedBy" TEXT NOT NULL,
    "academicYear" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentYearlyFinance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "tuitionFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "booksFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "uniformFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "busFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "StudentYearlyFinance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minQuantity" INTEGER NOT NULL DEFAULT 5,
    "unit" TEXT NOT NULL DEFAULT 'قطعة',
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grade" TEXT,
    "description" TEXT,
    "lastUpdated" TEXT NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusRoute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "driverPhone" TEXT NOT NULL,
    "busNumber" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "monthlyFee" DOUBLE PRECISION NOT NULL,
    "annualFee" DOUBLE PRECISION NOT NULL,
    "stops" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "BusRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "avatar" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "discountLimitPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "employee_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "national_id" TEXT NOT NULL,
    "date_of_birth" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "governorate" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "operations" TEXT NOT NULL,
    "shift_id" INTEGER NOT NULL,
    "join_date" TEXT NOT NULL,
    "contract_start_date" TEXT NOT NULL,
    "contract_duration" DOUBLE PRECISION NOT NULL,
    "contract_end_date" TEXT NOT NULL,
    "base_salary" DOUBLE PRECISION NOT NULL,
    "payment_method" TEXT NOT NULL,
    "iban" TEXT,
    "reduced_hour_position" TEXT,
    "annual_leave_balance" INTEGER NOT NULL DEFAULT 21,
    "casual_leave_balance" INTEGER NOT NULL DEFAULT 6,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "old_data" JSONB,
    "new_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_nationalId_key" ON "Student"("nationalId");

-- CreateIndex
CREATE UNIQUE INDEX "StageFee_stage_grade_track_academicYear_key" ON "StageFee"("stage", "grade", "track", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StudentYearlyFinance_studentId_academicYear_key" ON "StudentYearlyFinance"("studentId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employee_code_key" ON "employees"("employee_code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_national_id_key" ON "employees"("national_id");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentYearlyFinance" ADD CONSTRAINT "StudentYearlyFinance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
