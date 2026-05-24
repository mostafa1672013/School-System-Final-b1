-- CreateTable
CREATE TABLE "GradeItemList" (
    "id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "track" TEXT NOT NULL DEFAULT 'local',
    "academicYear" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradeItemList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeItemListEntry" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "preferredSupplierId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeItemListEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "chargeType" TEXT NOT NULL DEFAULT 'within_fees',
    "requestedBy" TEXT NOT NULL,
    "confirmedBy" TEXT,
    "deliveredBy" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "returnNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GradeItemList_academicYear_term_idx" ON "GradeItemList"("academicYear", "term");

-- CreateIndex
CREATE UNIQUE INDEX "GradeItemList_stage_grade_track_academicYear_term_key" ON "GradeItemList"("stage", "grade", "track", "academicYear", "term");

-- CreateIndex
CREATE UNIQUE INDEX "GradeItemListEntry_listId_inventoryItemId_key" ON "GradeItemListEntry"("listId", "inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryOrder_code_key" ON "DeliveryOrder"("code");

-- CreateIndex
CREATE INDEX "DeliveryOrder_studentId_idx" ON "DeliveryOrder"("studentId");

-- CreateIndex
CREATE INDEX "DeliveryOrder_status_idx" ON "DeliveryOrder"("status");

-- CreateIndex
CREATE INDEX "DeliveryOrder_academicYear_term_idx" ON "DeliveryOrder"("academicYear", "term");

-- AddForeignKey
ALTER TABLE "GradeItemListEntry" ADD CONSTRAINT "GradeItemListEntry_listId_fkey" FOREIGN KEY ("listId") REFERENCES "GradeItemList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeItemListEntry" ADD CONSTRAINT "GradeItemListEntry_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeItemListEntry" ADD CONSTRAINT "GradeItemListEntry_preferredSupplierId_fkey" FOREIGN KEY ("preferredSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOrder" ADD CONSTRAINT "DeliveryOrder_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOrderItem" ADD CONSTRAINT "DeliveryOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "DeliveryOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOrderItem" ADD CONSTRAINT "DeliveryOrderItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
