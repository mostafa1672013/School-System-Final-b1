-- Performance indexes — Phase 1.1 of the performance optimization plan
-- Cite: plan section 1.1

-- Student: hot filters
CREATE INDEX IF NOT EXISTS "Student_status_academicYear_idx" ON "Student"("status", "academicYear");
CREATE INDEX IF NOT EXISTS "Student_stage_grade_academicYear_idx" ON "Student"("stage", "grade", "academicYear");
CREATE INDEX IF NOT EXISTS "Student_academicYear_deletedAt_idx" ON "Student"("academicYear", "deletedAt");
CREATE INDEX IF NOT EXISTS "Student_guardianPhone_idx" ON "Student"("guardianPhone");
CREATE INDEX IF NOT EXISTS "Student_busRouteId_idx" ON "Student"("busRouteId");
CREATE INDEX IF NOT EXISTS "Student_badgeId_idx" ON "Student"("badgeId");
CREATE INDEX IF NOT EXISTS "Student_paymentRequestStatus_idx" ON "Student"("paymentRequestStatus");
CREATE INDEX IF NOT EXISTS "Student_discountStatus_idx" ON "Student"("discountStatus");
CREATE INDEX IF NOT EXISTS "Student_createdAt_idx" ON "Student"("createdAt");

-- Payment: hot filters
CREATE INDEX IF NOT EXISTS "Payment_studentId_createdAt_idx" ON "Payment"("studentId", "createdAt");
CREATE INDEX IF NOT EXISTS "Payment_sessionId_idx" ON "Payment"("sessionId");
CREATE INDEX IF NOT EXISTS "Payment_academicYear_type_idx" ON "Payment"("academicYear", "type");
CREATE INDEX IF NOT EXISTS "Payment_date_idx" ON "Payment"("date");
CREATE INDEX IF NOT EXISTS "Payment_deletedAt_idx" ON "Payment"("deletedAt");
CREATE INDEX IF NOT EXISTS "Payment_userId_idx" ON "Payment"("userId");

-- InventoryItem
CREATE INDEX IF NOT EXISTS "InventoryItem_category_idx" ON "InventoryItem"("category");
CREATE INDEX IF NOT EXISTS "InventoryItem_grade_idx" ON "InventoryItem"("grade");
CREATE INDEX IF NOT EXISTS "InventoryItem_itemType_idx" ON "InventoryItem"("itemType");

-- InventoryTransaction
CREATE INDEX IF NOT EXISTS "InventoryTransaction_itemId_date_idx" ON "InventoryTransaction"("itemId", "date");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_type_date_idx" ON "InventoryTransaction"("type", "date");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_studentId_idx" ON "InventoryTransaction"("studentId");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_goodsReceiptId_idx" ON "InventoryTransaction"("goodsReceiptId");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_journalEntryId_idx" ON "InventoryTransaction"("journalEntryId");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_date_idx" ON "InventoryTransaction"("date");

-- Account
CREATE INDEX IF NOT EXISTS "Account_parentId_idx" ON "Account"("parentId");
CREATE INDEX IF NOT EXISTS "Account_type_isActive_idx" ON "Account"("type", "isActive");

-- AccountingPeriod
CREATE INDEX IF NOT EXISTS "AccountingPeriod_fiscalYearId_idx" ON "AccountingPeriod"("fiscalYearId");
CREATE INDEX IF NOT EXISTS "AccountingPeriod_status_idx" ON "AccountingPeriod"("status");

-- CostCenter
CREATE INDEX IF NOT EXISTS "CostCenter_parentId_idx" ON "CostCenter"("parentId");
CREATE INDEX IF NOT EXISTS "CostCenter_isActive_idx" ON "CostCenter"("isActive");

-- JournalEntry
CREATE INDEX IF NOT EXISTS "JournalEntry_periodId_status_idx" ON "JournalEntry"("periodId", "status");
CREATE INDEX IF NOT EXISTS "JournalEntry_entryDate_idx" ON "JournalEntry"("entryDate");
CREATE INDEX IF NOT EXISTS "JournalEntry_status_postingDate_idx" ON "JournalEntry"("status", "postingDate");
CREATE INDEX IF NOT EXISTS "JournalEntry_referenceType_referenceId_idx" ON "JournalEntry"("referenceType", "referenceId");
CREATE INDEX IF NOT EXISTS "JournalEntry_reversalOfId_idx" ON "JournalEntry"("reversalOfId");

-- JournalEntryLine
CREATE INDEX IF NOT EXISTS "JournalEntryLine_journalEntryId_idx" ON "JournalEntryLine"("journalEntryId");
CREATE INDEX IF NOT EXISTS "JournalEntryLine_accountId_idx" ON "JournalEntryLine"("accountId");
CREATE INDEX IF NOT EXISTS "JournalEntryLine_costCenterId_idx" ON "JournalEntryLine"("costCenterId");

-- Expense
CREATE INDEX IF NOT EXISTS "Expense_accountId_idx" ON "Expense"("accountId");
CREATE INDEX IF NOT EXISTS "Expense_sessionId_idx" ON "Expense"("sessionId");
CREATE INDEX IF NOT EXISTS "Expense_status_date_idx" ON "Expense"("status", "date");
CREATE INDEX IF NOT EXISTS "Expense_date_idx" ON "Expense"("date");

-- InstallmentPlan
CREATE INDEX IF NOT EXISTS "InstallmentPlan_academicYear_status_idx" ON "InstallmentPlan"("academicYear", "status");

-- Installment
CREATE INDEX IF NOT EXISTS "Installment_planId_status_idx" ON "Installment"("planId", "status");
CREATE INDEX IF NOT EXISTS "Installment_dueDate_status_idx" ON "Installment"("dueDate", "status");

-- TreasurySession
CREATE INDEX IF NOT EXISTS "TreasurySession_status_idx" ON "TreasurySession"("status");
CREATE INDEX IF NOT EXISTS "TreasurySession_openedAt_idx" ON "TreasurySession"("openedAt");

-- Supplier
CREATE INDEX IF NOT EXISTS "Supplier_isActive_idx" ON "Supplier"("isActive");

-- PurchaseRequest
CREATE INDEX IF NOT EXISTS "PurchaseRequest_supplierId_idx" ON "PurchaseRequest"("supplierId");
CREATE INDEX IF NOT EXISTS "PurchaseRequest_status_date_idx" ON "PurchaseRequest"("status", "date");

-- PurchaseRequestItem
CREATE INDEX IF NOT EXISTS "PurchaseRequestItem_requestId_idx" ON "PurchaseRequestItem"("requestId");
CREATE INDEX IF NOT EXISTS "PurchaseRequestItem_itemId_idx" ON "PurchaseRequestItem"("itemId");

-- PurchaseOrder
CREATE INDEX IF NOT EXISTS "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_requestId_idx" ON "PurchaseOrder"("requestId");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_status_date_idx" ON "PurchaseOrder"("status", "date");

-- PurchaseOrderItem
CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_orderId_idx" ON "PurchaseOrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_itemId_idx" ON "PurchaseOrderItem"("itemId");

-- GoodsReceipt
CREATE INDEX IF NOT EXISTS "GoodsReceipt_orderId_idx" ON "GoodsReceipt"("orderId");
CREATE INDEX IF NOT EXISTS "GoodsReceipt_supplierId_idx" ON "GoodsReceipt"("supplierId");
CREATE INDEX IF NOT EXISTS "GoodsReceipt_status_date_idx" ON "GoodsReceipt"("status", "date");

-- GoodsReceiptItem
CREATE INDEX IF NOT EXISTS "GoodsReceiptItem_receiptId_idx" ON "GoodsReceiptItem"("receiptId");
CREATE INDEX IF NOT EXISTS "GoodsReceiptItem_itemId_idx" ON "GoodsReceiptItem"("itemId");

-- PurchaseInvoice
CREATE INDEX IF NOT EXISTS "PurchaseInvoice_supplierId_idx" ON "PurchaseInvoice"("supplierId");
CREATE INDEX IF NOT EXISTS "PurchaseInvoice_receiptId_idx" ON "PurchaseInvoice"("receiptId");
CREATE INDEX IF NOT EXISTS "PurchaseInvoice_status_dueDate_idx" ON "PurchaseInvoice"("status", "dueDate");

-- SupplierPayment
CREATE INDEX IF NOT EXISTS "SupplierPayment_supplierId_idx" ON "SupplierPayment"("supplierId");
CREATE INDEX IF NOT EXISTS "SupplierPayment_invoiceId_idx" ON "SupplierPayment"("invoiceId");
CREATE INDEX IF NOT EXISTS "SupplierPayment_sessionId_idx" ON "SupplierPayment"("sessionId");
CREATE INDEX IF NOT EXISTS "SupplierPayment_date_idx" ON "SupplierPayment"("date");

-- DeliveryOrderItem
CREATE INDEX IF NOT EXISTS "DeliveryOrderItem_orderId_idx" ON "DeliveryOrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "DeliveryOrderItem_inventoryItemId_idx" ON "DeliveryOrderItem"("inventoryItemId");

-- StudentYearlyFinance
CREATE INDEX IF NOT EXISTS "StudentYearlyFinance_academicYear_stage_grade_idx" ON "StudentYearlyFinance"("academicYear", "stage", "grade");
