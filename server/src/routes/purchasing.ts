import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getActivePeriodId } from '../lib/accounting-helpers';

const router = Router();
import { prisma } from '../lib/prisma';

// ==========================================
// 1. الموردين (Suppliers)
// ==========================================

router.get('/suppliers', requireAuth, async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

router.post('/suppliers', requireAuth, async (req, res) => {
  try {
    const { code, name, contactPerson, phone, email, taxId, address } = req.body;
    const supplier = await prisma.supplier.create({
      data: { code, name, contactPerson, phone, email, taxId, address }
    });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create supplier' });
  }
});

// ==========================================
// 2. طلبات الشراء (Purchase Requests)
// ==========================================

router.get('/requests', requireAuth, async (req, res) => {
  try {
    const requests = await prisma.purchaseRequest.findMany({
      include: { items: true, supplier: true },
      orderBy: { date: 'desc' }
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchase requests' });
  }
});

router.post('/requests', requireAuth, async (req, res) => {
  try {
    const { requestedBy, department, notes, supplierId, items } = req.body;
    const request = await prisma.purchaseRequest.create({
      data: {
        requestedBy,
        department,
        notes,
        supplierId,
        items: {
          create: items.map((item: any) => ({
            itemName: item.itemName,
            itemId: item.itemId,
            quantity: item.quantity,
            estimatedCost: item.estimatedCost,
            notes: item.notes
          }))
        }
      },
      include: { items: true }
    });
    res.status(201).json(request);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create purchase request' });
  }
});

// ==========================================
// 3. أوامر الشراء (Purchase Orders)
// ==========================================

router.get('/orders', requireAuth, async (req, res) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: { items: true, supplier: true },
      orderBy: { date: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

router.post('/orders', requireAuth, async (req, res) => {
  try {
    const { supplierId, requestId, notes, createdBy, items } = req.body;
    
    const totalAmount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitCost), 0);
    
    const order = await prisma.purchaseOrder.create({
      data: {
        supplierId,
        requestId,
        notes,
        createdBy,
        totalAmount,
        items: {
          create: items.map((item: any) => ({
            itemId: item.itemId,
            itemName: item.itemName,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalAmount: item.quantity * item.unitCost
          }))
        }
      },
      include: { items: true }
    });
    
    // Update request status if linked
    if (requestId) {
      await prisma.purchaseRequest.update({
        where: { id: requestId },
        data: { status: 'po_created' }
      });
    }
    
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create purchase order' });
  }
});

// ==========================================
// 4. استلام البضاعة (Goods Receipts)
// ==========================================

router.get('/receipts', requireAuth, async (req, res) => {
  try {
    const receipts = await prisma.goodsReceipt.findMany({
      include: { items: true, supplier: true, order: true },
      orderBy: { date: 'desc' }
    });
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

router.post('/receipts', requireAuth, async (req, res) => {
  try {
    const { supplierId, orderId, deliveryNote, receivedBy, notes, items } = req.body;
    
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Receipt
      const receipt = await tx.goodsReceipt.create({
        data: {
          supplierId,
          orderId,
          deliveryNote,
          receivedBy,
          notes,
          items: {
            create: items.map((item: any) => ({
              itemId: item.itemId,
              itemName: item.itemName,
              quantity: item.quantity,
              unitCost: item.unitCost
            }))
          }
        },
        include: { items: true, supplier: true }
      });
      
      // 2. Update PO status & received qty if linked
      if (orderId) {
        let allReceived = true;
        const order = await tx.purchaseOrder.findUnique({ where: { id: orderId }, include: { items: true } });
        
        if (order) {
          for (const item of items) {
            const orderItem = order.items.find(oi => oi.itemId === item.itemId);
            if (orderItem) {
              const newReceived = orderItem.receivedQty + item.quantity;
              await tx.purchaseOrderItem.update({
                where: { id: orderItem.id },
                data: { receivedQty: newReceived }
              });
              if (newReceived < orderItem.quantity) allReceived = false;
            }
          }
          await tx.purchaseOrder.update({
            where: { id: orderId },
            data: { status: allReceived ? 'completed' : 'partially_received' }
          });
        }
      }
      
      // 3. Update Inventory & create transactions
      for (const item of items) {
        // Ensure item exists
        const invItem = await tx.inventoryItem.findUnique({ where: { id: item.itemId } });
        if (invItem) {
          // Calculate new average cost
          const oldTotal = Number(invItem.quantity) * Number(invItem.unitCost);
          const newTotal = Number(item.quantity) * Number(item.unitCost);
          const totalQty = Number(invItem.quantity) + Number(item.quantity);
          const newAvgCost = totalQty > 0 ? (oldTotal + newTotal) / totalQty : Number(item.unitCost);
          
          await tx.inventoryItem.update({
            where: { id: item.itemId },
            data: { 
              quantity: { increment: item.quantity },
              unitCost: newAvgCost,
              lastUpdated: new Date().toISOString()
            }
          });
          
          await tx.inventoryTransaction.create({
            data: {
              itemId: item.itemId,
              type: 'in',
              subType: 'purchase',
              quantity: item.quantity,
              unitCostSnapshot: item.unitCost,
              totalAmount: item.quantity * item.unitCost,
              supplierName: receipt.supplier.name,
              performedBy: receivedBy,
              date: new Date(),
              goodsReceiptId: receipt.id
            }
          });
        }
      }
      
      return receipt;
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to process goods receipt' });
  }
});

// ==========================================
// 5. فواتير المشتريات (Purchase Invoices)
// ==========================================

router.get('/invoices', requireAuth, async (req, res) => {
  try {
    const invoices = await prisma.purchaseInvoice.findMany({
      include: { supplier: true, receipt: true },
      orderBy: { date: 'desc' }
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

router.post('/invoices', requireAuth, async (req, res) => {
  try {
    const { invoiceNumber, date, dueDate, supplierId, receiptId, totalAmount, taxAmount, netAmount, createdBy } = req.body;
    
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create invoice
      const invoice = await tx.purchaseInvoice.create({
        data: { invoiceNumber, date: new Date(date), dueDate: dueDate ? new Date(dueDate) : null, supplierId, receiptId, totalAmount, taxAmount, netAmount, createdBy },
        include: { supplier: true }
      });
      
      if (receiptId) {
        await tx.goodsReceipt.update({ where: { id: receiptId }, data: { status: 'invoiced' } });
      }
      
      // 2. Generate Journal Entry
      // Dr. Inventory (1303) -> Detail-level account, not group-level (1300)
      // Cr. Accounts Payable (2001)
      // 1303 = مخزون أدوات مكتبية — الحساب التفصيلي الافتراضي للمشتريات العامة
      // في المستقبل يمكن تحديده من نوع الصنف (1301 كتب، 1302 زي، 1303 أدوات)
      const invAccount = await tx.account.findUnique({ where: { code: '1303' } });
      const apAccount = await tx.account.findUnique({ where: { code: '2001' } });
      
      if (invAccount && apAccount) {
        const count = await tx.journalEntry.count();
        const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
        const entryDate = new Date(date).toISOString().split('T')[0];
        const periodId = await getActivePeriodId(tx as any, entryDate);

        const je = await tx.journalEntry.create({
          data: {
            entryNumber,
            entryDate,
            description: `فاتورة مشتريات #${invoiceNumber} - المورد: ${invoice.supplier.name}`,
            referenceType: 'purchase_invoice',
            referenceId: invoice.id,
            status: 'posted',
            createdBy,
            postedAt: new Date(),
            postedBy: createdBy,
            periodId: periodId ?? undefined,
            lines: {
              create: [
                { accountId: invAccount.id, debit: netAmount, credit: 0, lineNumber: 1, description: 'قيمة المخزون المستلم' },
                { accountId: apAccount.id, debit: 0, credit: netAmount, lineNumber: 2, description: `استحقاق المورد ${invoice.supplier.name}` }
              ]
            }
          }
        });
        
        await tx.purchaseInvoice.update({
          where: { id: invoice.id },
          data: { journalEntryId: je.id }
        });
      }
      
      return invoice;
    });
    
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create invoice' });
  }
});

// ==========================================
// 6. سداد الموردين (Supplier Payments)
// ==========================================

router.get('/payments', requireAuth, async (req, res) => {
  try {
    const payments = await prisma.supplierPayment.findMany({
      include: { supplier: true, invoice: true },
      orderBy: { date: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

router.post('/payments', requireAuth, async (req, res) => {
  try {
    const { supplierId, invoiceId, amount, paymentMethod, referenceNumber, sessionId, createdBy } = req.body;
    
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate session
      if (sessionId) {
        const session = await tx.treasurySession.findUnique({ where: { id: sessionId } });
        if (!session || session.status !== 'open') throw new Error('Session is not open');
      }
      
      const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) throw new Error('Supplier not found');
      
      // 2. Create Payment
      const payment = await tx.supplierPayment.create({
        data: { supplierId, invoiceId, amount, paymentMethod, referenceNumber, sessionId, createdBy }
      });
      
      // 3. Update Invoice
      if (invoiceId) {
        const invoice = await tx.purchaseInvoice.findUnique({ where: { id: invoiceId } });
        if (invoice) {
          const newPaid = Number(invoice.paidAmount) + Number(amount);
          await tx.purchaseInvoice.update({
            where: { id: invoiceId },
            data: { 
              paidAmount: newPaid,
              status: newPaid >= Number(invoice.netAmount) ? 'paid' : 'partial'
            }
          });
        }
      }
      
      // 4. Generate Journal Entry
      // Dr. AP (2001)
      // Cr. Cash/Bank (1001/1002/1003)
      const apAccount = await tx.account.findUnique({ where: { code: '2001' } });
      let creditCode = '1001';
      if (paymentMethod === 'bank') creditCode = '1003';
      else if (paymentMethod === 'check') creditCode = '1003'; // Assuming checks hit bank
      else if (paymentMethod === 'wallet') creditCode = '1002';
      
      const cashAccount = await tx.account.findUnique({ where: { code: creditCode } });
      
      if (apAccount && cashAccount) {
        const count = await tx.journalEntry.count();
        const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
        const today = new Date().toISOString().split('T')[0];
        const periodId = await getActivePeriodId(tx as any, today);

        const je = await tx.journalEntry.create({
          data: {
            entryNumber,
            entryDate: today,
            description: `سداد دفعة للمورد: ${supplier.name} ${invoiceId ? 'عن فاتورة' : 'دفعة مقدمة'}`,
            referenceType: 'supplier_payment',
            referenceId: payment.id,
            status: 'posted',
            createdBy,
            postedAt: new Date(),
            postedBy: createdBy,
            periodId: periodId ?? undefined,
            lines: {
              create: [
                { accountId: apAccount.id, debit: amount, credit: 0, lineNumber: 1, description: `سداد للمورد ${supplier.name}` },
                { accountId: cashAccount.id, debit: 0, credit: amount, lineNumber: 2, description: `سداد نقدية` }
              ]
            }
          }
        });
        
        await tx.supplierPayment.update({
          where: { id: payment.id },
          data: { journalEntryId: je.id }
        });
      }
      
      return payment;
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to process payment' });
  }
});

export default router;
