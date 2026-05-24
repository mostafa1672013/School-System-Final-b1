import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRoles } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ===== BADGES =====
// Mounted at /api/badges

router.get('/badges', async (req, res) => {
  try {
    const badges = await prisma.badge.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { students: true } } }
    });
    res.json(badges);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

router.post('/badges', requireRoles('system_admin', 'school_director'), async (req, res) => {
  try {
    const { name, color, icon, discountPercentage, description } = req.body;
    const badge = await prisma.badge.create({
      data: { name, color, icon, discountPercentage: Number(discountPercentage), description }
    });
    res.status(201).json(badge);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create badge' });
  }
});

router.patch('/badges/:id', requireRoles('system_admin', 'school_director'), async (req, res) => {
  const { id } = req.params;
  try {
    const { name, color, icon, discountPercentage, description } = req.body;
    const badge = await prisma.badge.update({
      where: { id: String(id) },
      data: { name, color, icon, discountPercentage: Number(discountPercentage), description }
    });
    res.json(badge);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update badge' });
  }
});

router.delete('/badges/:id', requireRoles('system_admin', 'school_director'), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.badge.delete({ where: { id: String(id) } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete badge' });
  }
});

const busTransportRoles = requireRoles('system_admin', 'school_director', 'head_accountant', 'bus_supervisor');

// ===== BUS ROUTES =====
// Mounted at /api/bus-routes

router.get('/bus-routes', async (req, res) => {
  try {
    const routes = await prisma.busRoute.findMany();
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bus routes' });
  }
});

router.post('/bus-routes', requireAuth, busTransportRoles, async (req, res) => {
  console.log('🚌 محاولة إنشاء خط باص جديد:', req.body.name);
  try {
    const { name, driverName, driverPhone, busNumber, capacity, monthlyFee, annualFee, stops } = req.body;
    const route = await prisma.busRoute.create({
      data: { name, driverName, driverPhone, busNumber, capacity, monthlyFee, annualFee, stops },
    });
    console.log('✅ تم إنشاء الخط بنجاح:', route.id);
    res.json(route);
  } catch (error) {
    console.error('❌ فشل إنشاء الخط:', error);
    res.status(500).json({ error: 'Failed to create bus route' });
  }
});

router.patch('/bus-routes/:id', requireAuth, busTransportRoles, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  console.log(`📝 محاولة تعديل الخط: ${id}`, req.body);
  try {
    const route = await prisma.busRoute.update({
      where: { id },
      data: req.body
    });
    console.log('✅ تم التعديل بنجاح');
    res.json(route);
  } catch (error) {
    console.error('❌ فشل التعديل:', error);
    res.status(500).json({ error: 'Failed to update bus route' });
  }
});

// ===== BUS SUBSCRIPTIONS =====
// Mounted at /api/bus-subscriptions

async function generateSubCode(): Promise<string> {
  const year = new Date().getFullYear();
  // Find the last code issued this year to avoid count-collision
  const last = await prisma.busSubscription.findFirst({
    where: { code: { startsWith: `SUB-${year}-` } },
    orderBy: { code: 'desc' },
  });
  if (!last) return `SUB-${year}-0001`;
  const lastNum = parseInt(last.code.split('-')[2] ?? '0', 10);
  return `SUB-${year}-${String(lastNum + 1).padStart(4, '0')}`;
}

router.get('/bus-subscriptions', requireAuth, async (req, res) => {
  try {
    const { routeId, status, academicYear } = req.query as Record<string, string>;
    const where: any = {};
    if (routeId) where.routeId = routeId;
    if (status) where.status = status;
    if (academicYear) where.academicYear = academicYear;
    const subs = await prisma.busSubscription.findMany({
      where,
      include: { route: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(subs);
  } catch (error) {
    console.error('Fetch subscriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

router.post('/bus-subscriptions', requireAuth, busTransportRoles, async (req, res) => {
  try {
    const code = await generateSubCode();
    const {
      subscriberType, studentId, subscriberName, routeId,
      academicYear, startDate, endDate,
      fullFeeAmount, discountPct, actualAmount,
      pickupAddress, pickupPhone, notes,
    } = req.body;
    const sub = await prisma.busSubscription.create({
      data: {
        code,
        subscriberType, studentId, subscriberName, routeId,
        academicYear,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        fullFeeAmount, discountPct, actualAmount,
        pickupAddress, pickupPhone, notes,
      },
      include: { route: true },
    });
    console.log('✅ اشتراك جديد:', sub.code);
    res.status(201).json(sub);
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

router.patch('/bus-subscriptions/:id', requireAuth, busTransportRoles, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const {
      subscriberType, subscriberName, routeId,
      startDate, endDate,
      fullFeeAmount, discountPct, actualAmount,
      pickupAddress, pickupPhone, status, notes,
    } = req.body;

    const updateData: any = {
      ...(subscriberType !== undefined && { subscriberType }),
      ...(subscriberName !== undefined && { subscriberName }),
      ...(routeId !== undefined && { routeId }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
      ...(fullFeeAmount !== undefined && { fullFeeAmount }),
      ...(discountPct !== undefined && { discountPct }),
      ...(actualAmount !== undefined && { actualAmount }),
      ...(pickupAddress !== undefined && { pickupAddress }),
      ...(pickupPhone !== undefined && { pickupPhone }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
    };

    const sub = await prisma.busSubscription.update({
      where: { id },
      data: updateData,
      include: { route: true },
    });
    res.json(sub);
  } catch (error: any) {
    console.error('Update subscription error:', error);
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

router.delete('/bus-subscriptions/:id', requireAuth, busTransportRoles, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    await prisma.busSubscription.update({
      where: { id },
      data: { status: 'cancelled' },
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ===== SETTINGS =====
// Mounted at /api/settings

router.get('/settings/academic-year', requireAuth, async (req, res) => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'activeAcademicYear' },
    });
    res.json({ academicYear: setting?.value ?? '2024-2025' });
  } catch (error) {
    res.status(500).json({ error: 'فشل جلب السنة الدراسية' });
  }
});

router.put('/settings/academic-year', requireRoles('school_director', 'head_accountant'), async (req, res) => {
  const { academicYear } = req.body;
  if (!academicYear || typeof academicYear !== 'string') {
    return res.status(400).json({ error: 'السنة الدراسية مطلوبة' });
  }
  try {
    const setting = await prisma.systemSetting.upsert({
      where: { key: 'activeAcademicYear' },
      create: { key: 'activeAcademicYear', value: academicYear },
      update: { value: academicYear },
    });
    res.json({ academicYear: setting.value });
  } catch (error) {
    res.status(500).json({ error: 'فشل تحديث السنة الدراسية' });
  }
});

// ===== RENTAL COMPANIES =====

router.get('/rental-companies', requireAuth, async (req, res) => {
  try {
    const companies = await prisma.rentalCompany.findMany({
      where: { isActive: true },
      include: { _count: { select: { contracts: true, drivers: true } } },
      orderBy: { nameAr: 'asc' },
    });
    res.json(companies);
  } catch (error) {
    console.error('Fetch rental companies error:', error);
    res.status(500).json({ error: 'Failed to fetch rental companies' });
  }
});

router.post('/rental-companies', requireAuth, busTransportRoles, async (req, res) => {
  try {
    const count = await prisma.rentalCompany.count();
    const code = `RC-${String(count + 1).padStart(3, '0')}`;
    const { nameAr, nameEn, contactPerson, phone, email, address, taxId, bankName, bankAccountNumber, notes, isActive } = req.body;
    const company = await prisma.rentalCompany.create({
      data: { code, nameAr, nameEn, contactPerson: contactPerson ?? null, phone: phone ?? null, email: email ?? null, address: address ?? null, taxId: taxId ?? null, bankName: bankName ?? null, bankAccountNumber: bankAccountNumber ?? null, notes: notes ?? null, isActive: isActive ?? true },
      include: { _count: { select: { contracts: true, drivers: true } } },
    });
    res.status(201).json(company);
  } catch (error) {
    console.error('Create rental company error:', error);
    res.status(500).json({ error: 'Failed to create rental company' });
  }
});

router.patch('/rental-companies/:id', requireAuth, busTransportRoles, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const company = await prisma.rentalCompany.update({
      where: { id },
      data: req.body,
    });
    res.json(company);
  } catch (error: any) {
    console.error('Update rental company error:', error);
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Company not found' });
    res.status(500).json({ error: 'Failed to update rental company' });
  }
});

// ===== RENTAL CONTRACTS =====

router.get('/rental-contracts', requireAuth, async (req, res) => {
  try {
    const contracts = await prisma.rentalContract.findMany({
      include: { company: true, _count: { select: { buses: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(contracts);
  } catch (error) {
    console.error('Fetch rental contracts error:', error);
    res.status(500).json({ error: 'Failed to fetch rental contracts' });
  }
});

router.post('/rental-contracts', requireAuth, busTransportRoles, async (req, res) => {
  try {
    const {
      companyId, contractNumber, title, startDate, endDate,
      monthlyFeePerBus, busesCount, includesDriver, includesFuel,
      includesMaintenance, includesInsurance, paymentFrequency, paymentDueDay, status, notes,
    } = req.body;
    const contract = await prisma.rentalContract.create({
      data: {
        companyId,
        contractNumber,
        title: title || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        monthlyFeePerBus,
        busesCount,
        includesDriver: includesDriver ?? true,
        includesFuel: includesFuel ?? true,
        includesMaintenance: includesMaintenance ?? true,
        includesInsurance: includesInsurance ?? true,
        paymentFrequency: paymentFrequency || 'monthly',
        paymentDueDay: paymentDueDay ?? null,
        status: status || 'active',
        notes: notes || null,
      },
      include: { company: true },
    });
    res.status(201).json(contract);
  } catch (error) {
    console.error('Create rental contract error:', error);
    res.status(500).json({ error: 'Failed to create rental contract' });
  }
});

router.patch('/rental-contracts/:id', requireAuth, busTransportRoles, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const {
      contractNumber, title, startDate, endDate,
      monthlyFeePerBus, busesCount, includesDriver, includesFuel,
      includesMaintenance, includesInsurance, paymentFrequency, paymentDueDay, status, notes,
    } = req.body;
    const data: Record<string, unknown> = {};
    if (contractNumber !== undefined) data.contractNumber = contractNumber;
    if (title !== undefined) data.title = title || null;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = new Date(endDate);
    if (monthlyFeePerBus !== undefined) data.monthlyFeePerBus = monthlyFeePerBus;
    if (busesCount !== undefined) data.busesCount = busesCount;
    if (includesDriver !== undefined) data.includesDriver = includesDriver;
    if (includesFuel !== undefined) data.includesFuel = includesFuel;
    if (includesMaintenance !== undefined) data.includesMaintenance = includesMaintenance;
    if (includesInsurance !== undefined) data.includesInsurance = includesInsurance;
    if (paymentFrequency !== undefined) data.paymentFrequency = paymentFrequency;
    if (paymentDueDay !== undefined) data.paymentDueDay = paymentDueDay ?? null;
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes || null;
    const contract = await prisma.rentalContract.update({
      where: { id },
      data,
      include: { company: true },
    });
    res.json(contract);
  } catch (error: any) {
    console.error('Update rental contract error:', error);
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Contract not found' });
    res.status(500).json({ error: 'Failed to update rental contract' });
  }
});

// ===== FLEET BUSES =====

router.get('/buses', requireAuth, async (req, res) => {
  try {
    const buses = await prisma.fleetBus.findMany({
      include: { rentalContract: { include: { company: true } } },
      orderBy: { code: 'asc' },
    });
    res.json(buses);
  } catch (error) {
    console.error('Fetch buses error:', error);
    res.status(500).json({ error: 'Failed to fetch buses' });
  }
});

router.post('/buses', requireAuth, busTransportRoles, async (req, res) => {
  try {
    const count = await prisma.fleetBus.count();
    const code = `BUS-${String(count + 1).padStart(3, '0')}`;
    const { plateNumber, capacity, ownershipType, rentalContractId, make, model, year, color, status, insuranceExpiry, licenseExpiry, notes } = req.body;
    const bus = await prisma.fleetBus.create({
      data: { code, plateNumber, capacity, ownershipType, rentalContractId: rentalContractId ?? null, make: make ?? null, model: model ?? null, year: year ?? null, color: color ?? null, status: status ?? undefined, insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null, licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null, notes: notes ?? null },
      include: { rentalContract: { include: { company: true } } },
    });
    res.status(201).json(bus);
  } catch (error) {
    console.error('Create bus error:', error);
    res.status(500).json({ error: 'Failed to create bus' });
  }
});

router.patch('/buses/:id', requireAuth, busTransportRoles, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const bus = await prisma.fleetBus.update({
      where: { id },
      data: req.body,
      include: { rentalContract: { include: { company: true } } },
    });
    res.json(bus);
  } catch (error: any) {
    console.error('Update bus error:', error);
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Bus not found' });
    res.status(500).json({ error: 'Failed to update bus' });
  }
});

// ===== EXTERNAL DRIVERS =====

router.get('/external-drivers', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.query;
    const where: any = { isActive: true };
    if (typeof companyId === 'string') where.companyId = companyId;
    const drivers = await prisma.externalDriver.findMany({
      where,
      include: { company: true },
      orderBy: { fullName: 'asc' },
    });
    res.json(drivers);
  } catch (error) {
    console.error('Fetch drivers error:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

router.post('/external-drivers', requireAuth, busTransportRoles, async (req, res) => {
  try {
    const count = await prisma.externalDriver.count();
    const code = `DRV-${String(count + 1).padStart(3, '0')}`;
    const { fullName, phone, companyId, licenseNumber, licenseExpiry, isActive, notes } = req.body;
    const driver = await prisma.externalDriver.create({
      data: { code, fullName, phone: phone ?? null, companyId: companyId ?? null, licenseNumber: licenseNumber ?? null, licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null, isActive: isActive ?? true, notes: notes ?? null },
      include: { company: true },
    });
    res.status(201).json(driver);
  } catch (error) {
    console.error('Create driver error:', error);
    res.status(500).json({ error: 'Failed to create driver' });
  }
});

// ── Subscription Changes ──────────────────────────────────────────────────

router.get('/subscription-changes', requireAuth, async (req, res) => {
  try {
    const { subscriptionId } = req.query as Record<string, string>;
    const where: any = {};
    if (subscriptionId) where.subscriptionId = subscriptionId;
    const changes = await prisma.subscriptionChange.findMany({
      where,
      include: { subscription: { include: { route: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(changes);
  } catch (error) {
    console.error('Fetch subscription changes error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription changes' });
  }
});

router.post('/subscription-changes', requireAuth, busTransportRoles, async (req, res) => {
  try {
    const {
      subscriptionId, changeType, effectiveDate,
      previousRouteId, newRouteId, changeReason,
      previousFullFee, newFullFee,
      monthsRemaining, previousRemaining, newRemaining,
      proRataDifference, direction, notes,
    } = req.body as Record<string, any>;

    if (!subscriptionId || !changeType || !effectiveDate) {
      return res.status(400).json({ error: 'subscriptionId, changeType, effectiveDate are required' });
    }

    const sub = await prisma.busSubscription.findUnique({ where: { id: subscriptionId } });
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    const change = await prisma.subscriptionChange.create({
      data: {
        subscriptionId,
        changeType,
        effectiveDate: new Date(effectiveDate),
        previousRouteId: previousRouteId ?? sub.routeId,
        newRouteId: newRouteId ?? null,
        previousFullFee: previousFullFee != null ? previousFullFee : null,
        newFullFee: newFullFee != null ? newFullFee : null,
        monthsRemaining: monthsRemaining != null ? Number(monthsRemaining) : null,
        previousRemaining: previousRemaining != null ? previousRemaining : null,
        newRemaining: newRemaining != null ? newRemaining : null,
        proRataDifference: proRataDifference != null ? proRataDifference : null,
        direction: direction ?? null,
        changeReason: changeReason ?? null,
        notes: notes ?? null,
        createdBy: req.user?.userId ?? null,
        status: 'pending',
      },
    });

    // Apply cancel immediately
    if (changeType === 'cancel') {
      await prisma.busSubscription.update({
        where: { id: subscriptionId },
        data: { status: 'cancelled', endDate: new Date(effectiveDate) },
      });
    }

    res.status(201).json(change);
  } catch (error) {
    console.error('Create subscription change error:', error);
    res.status(500).json({ error: 'Failed to create subscription change' });
  }
});

// ── Rental Invoices ───────────────────────────────────────────────────────

async function generateInvoiceCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const last = await prisma.rentalInvoice.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
  });
  const seq = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

router.get('/rental-invoices', requireAuth, async (req, res) => {
  try {
    const invoices = await prisma.rentalInvoice.findMany({
      include: { contract: { include: { company: true } } },
      orderBy: { invoiceDate: 'desc' },
    });
    res.json(invoices);
  } catch (error) {
    console.error('Fetch rental invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch rental invoices' });
  }
});

router.post('/rental-invoices', requireAuth, busTransportRoles, async (req, res) => {
  const {
    contractId, invoiceDate, periodFrom, periodTo,
    baseAmount, discountAmount, taxAmount, totalAmount,
    status, notes, attachmentUrl,
  } = req.body as Record<string, any>;

  if (!contractId || !invoiceDate || !periodFrom || !periodTo || totalAmount == null) {
    return res.status(400).json({ error: 'contractId, invoiceDate, periodFrom, periodTo, totalAmount are required' });
  }

  try {
    let invoice: any = null;
    let attempts = 0;
    while (!invoice && attempts < 3) {
      attempts++;
      try {
        const code = await generateInvoiceCode();
        invoice = await prisma.rentalInvoice.create({
          data: {
            code,
            contractId,
            invoiceDate: new Date(invoiceDate),
            periodFrom: new Date(periodFrom),
            periodTo: new Date(periodTo),
            baseAmount: Number(baseAmount),
            discountAmount: discountAmount != null ? Number(discountAmount) : 0,
            taxAmount: taxAmount != null ? Number(taxAmount) : 0,
            totalAmount: Number(totalAmount),
            status: status ?? 'pending_review',
            notes: notes ?? null,
            attachmentUrl: attachmentUrl ?? null,
          },
          include: { contract: { include: { company: true } } },
        });
      } catch (innerErr: any) {
        if (innerErr?.code === 'P2002' && attempts < 3) continue;
        throw innerErr;
      }
    }
    return res.status(201).json(invoice);
  } catch (error) {
    console.error('Create rental invoice error:', error);
    res.status(500).json({ error: 'Failed to create rental invoice' });
  }
});

router.patch('/rental-invoices/:id', requireAuth, busTransportRoles, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const { status, paymentDate, notes, discountAmount, taxAmount, totalAmount } = req.body as Record<string, any>;
    const invoice = await prisma.rentalInvoice.update({
      where: { id },
      data: {
        ...(status != null && { status }),
        ...(paymentDate != null && { paymentDate: new Date(paymentDate) }),
        ...(notes != null && { notes }),
        ...(discountAmount != null && { discountAmount: Number(discountAmount) }),
        ...(taxAmount != null && { taxAmount: Number(taxAmount) }),
        ...(totalAmount != null && { totalAmount: Number(totalAmount) }),
      },
      include: { contract: { include: { company: true } } },
    });
    res.json(invoice);
  } catch (error: any) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Invoice not found' });
    console.error('Update rental invoice error:', error);
    res.status(500).json({ error: 'Failed to update rental invoice' });
  }
});

export default router;
