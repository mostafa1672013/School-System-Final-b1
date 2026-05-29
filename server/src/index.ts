import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';
import { zktecoService } from './services/zkteco.service';

// Global error handlers to prevent third-party library crashes (e.g., zkteco-js socket errors)
process.on('uncaughtException', (err: any) => {
  if (err && err.message && err.message.includes('subarray')) {
    console.error('⚠️ [ZKTeco Internal Error] Ignored unhandled internal subarray error:', err.message);
    return;
  }
  console.error('❌ Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason: any) => {
  console.error('⚠️ [Unhandled Rejection]:', reason);
});

// Load environmental variables, prioritizing root .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*', // السماح لجميع المصادر بالاتصال
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'server', 'uploads')));

import fs from 'fs';
import multer from 'multer';

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'server', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

app.post('/api/upload', (req, res) => {
  try {
    const { file, filename } = req.body; // Expects base64 string
    if (!file || !filename) return res.status(400).json({ error: 'Missing file data' });
    
    const base64Data = file.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    const uploadDir = path.join(process.cwd(), 'server', 'uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const uniqueName = Date.now() + '-' + filename;
    fs.writeFileSync(path.join(uploadDir, uniqueName), base64Data, 'base64');
    
    res.json({ url: `/uploads/${uniqueName}` });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// --- Students API ---

// Get all students
app.get('/api/students', async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        yearlyFinance: {
          orderBy: { academicYear: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Create a new student
app.post('/api/students', async (req, res) => {
  try {
    const student = await prisma.student.create({
      data: req.body
    });
    res.status(201).json(student);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create student' });
  }
});

// Update student
app.patch('/api/students/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const student = await prisma.student.update({
      where: { id },
      data: req.body,
      include: {
        yearlyFinance: {
          orderBy: { academicYear: 'asc' }
        }
      }
    });
    res.json(student);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update student' });
  }
});

// Delete student
app.delete('/api/students/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.student.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete student' });
  }
});

// --- Auth API ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`🔑 محاولة دخول: ${email}`);
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      console.log(`❌ المستخدم غير موجود: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.active) {
      console.log(`⚠️ محاولة دخول مستخدم معطل: ${email}`);
      return res.status(403).json({ error: 'Account is disabled' });
    }

    if (user.password === password) {
      console.log(`✅ دخول ناجح: ${user.name}`);
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      console.log(`❌ كلمة مرور خاطئة للمستخدم: ${email}`);
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// --- Users API ---

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user
app.post('/api/users', async (req, res) => {
  try {
    const user = await prisma.user.create({ data: req.body });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create user' });
  }
});

// Update user
app.patch('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`📝 محاولة تحديث بيانات المستخدم: ${id}`);
  try {
    const user = await prisma.user.update({
      where: { id },
      data: req.body
    });
    console.log('✅ تم تحديث المستخدم بنجاح');
    res.json(user);
  } catch (error) {
    console.error('❌ فشل تحديث المستخدم:', error);
    res.status(400).json({ error: 'Failed to update user' });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete user' });
  }
});

// --- Payments API ---
app.get('/api/payments', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { date: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

app.post('/api/payments', async (req, res) => {
  const { studentId, studentName, amount, type, method, date, receiptNumber, collectedBy, notes, academicYear } = req.body;
  
  try {
    // 1. Fetch student's yearly finance records ordered by year (oldest first)
    const yearlyFinances = await prisma.studentYearlyFinance.findMany({
      where: { studentId },
      orderBy: { academicYear: 'asc' }
    });

    let remainingAmount = amount;
    const updates = [];

    // 2. Allocate payment to oldest years first
    for (const finance of yearlyFinances) {
      if (remainingAmount <= 0) break;
      
      const balance = finance.totalFees - finance.paidAmount;
      if (balance > 0) {
        const paymentToThisYear = Math.min(remainingAmount, balance);
        updates.push(
          prisma.studentYearlyFinance.update({
            where: { id: finance.id },
            data: { paidAmount: { increment: paymentToThisYear } }
          })
        );
        remainingAmount -= paymentToThisYear;
      }
    }

    // 3. Execute transaction: Create payment, update yearly records, update student summary
    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: { studentId, studentName, amount, type, method, date, receiptNumber, collectedBy, notes, academicYear }
      }),
      ...updates,
      prisma.student.update({
        where: { id: studentId },
        data: { 
          paidAmount: { increment: amount },
          // If all remaining is used, clear any pending request
          pendingPaymentAmount: null,
          pendingPaymentType: null,
          paymentRequestStatus: null
        }
      })
    ]);

    res.status(201).json(payment);
  } catch (error) {
    console.error('Payment error:', error);
    res.status(400).json({ error: 'Failed to record payment' });
  }
});

// --- Inventory API ---
app.get('/api/inventory', async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// --- Bus Routes API ---
app.get('/api/bus-routes', async (req, res) => {
  try {
    const routes = await prisma.busRoute.findMany();
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bus routes' });
  }
});

app.post('/api/bus-routes', async (req, res) => {
  console.log('🚌 محاولة إنشاء خط باص جديد:', req.body.name);
  try {
    const route = await prisma.busRoute.create({
      data: req.body
    });
    console.log('✅ تم إنشاء الخط بنجاح:', route.id);
    res.json(route);
  } catch (error) {
    console.error('❌ فشل إنشاء الخط:', error);
    res.status(500).json({ error: 'Failed to create bus route' });
  }
});

app.patch('/api/bus-routes/:id', async (req, res) => {
  const { id } = req.params;
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

// --- Stage Fees API (Director) ---
app.get('/api/stage-fees', async (req, res) => {
  try {
    const fees = await prisma.stageFee.findMany();
    res.json(fees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stage fees' });
  }
});

app.post('/api/stage-fees', async (req, res) => {
  console.log('📬 طلب إضافة رسوم جديد:', req.body);
  const { stage, grade, track, academicYear, tuitionFees, booksFees, uniformFees, applicationFees, additionalFees } = req.body;
  
  if (!stage || !grade || !academicYear) {
    return res.status(400).json({ error: 'بيانات غير مكتملة (المرحلة، الصف، السنة الدراسية مطلوبة)' });
  }

  try {
    // Check if exists using findFirst instead of findUnique to avoid unique name issues
    const existing = await prisma.stageFee.findFirst({
      where: { stage, grade, track, academicYear }
    });

    if (existing) {
      console.log('⚠️ الرسوم مسجلة بالفعل');
      return res.status(409).json({ error: 'الرسوم مسجلة بالفعل لهذه المرحلة والسنة الدراسية' });
    }

    const fee = await prisma.stageFee.create({
      data: { 
        stage, grade, track, academicYear, 
        tuitionFees, tuitionMandatory: req.body.tuitionMandatory,
        booksFees, booksMandatory: req.body.booksMandatory,
        uniformFees, uniformMandatory: req.body.uniformMandatory,
        applicationFees, applicationMandatory: req.body.applicationMandatory,
        additionalFees 
      }
    });
    console.log('✅ تم الحفظ في قاعدة البيانات:', fee);
    res.status(201).json(fee);
  } catch (error) {
    console.error('❌ خطأ في قاعدة البيانات:', error);
    res.status(400).json({ error: 'فشل الحفظ في قاعدة البيانات' });
  }
});

app.patch('/api/stage-fees/:id', async (req, res) => {
  console.log('📬 طلب تعديل رسوم:', req.params.id, req.body);
  const { id } = req.params;
  try {
    const fee = await prisma.stageFee.update({
      where: { id },
      data: req.body
    });
    console.log('✅ تم التعديل بنجاح');
    res.json(fee);
  } catch (error) {
    console.error('❌ خطأ في التعديل:', error);
    res.status(400).json({ error: 'فشل تعديل البيانات' });
  }
});

app.delete('/api/stage-fees/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.stageFee.delete({
      where: { id }
    });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete' });
  }
});

// --- Admission Workflow API ---

// 1. Initial Application
app.post('/api/admission/apply', async (req, res) => {
  try {
    const student = await prisma.student.create({
      data: {
        ...req.body,
        status: 'applied'
      }
    });
    res.status(201).json(student);
  } catch (error) {
    res.status(400).json({ error: 'Failed to apply' });
  }
});

// 2. Set Test Result
app.patch('/api/admission/test-result/:id', async (req, res) => {
  const { id } = req.params;
  const { result } = req.body;
  try {
    const student = await prisma.student.update({
      where: { id },
      data: {
        testResult: result,
        status: result === 'pass' ? 'fee_setup' : result === 'fail' ? 'failed' : 'under_testing'
      }
    });
    res.json(student);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update test result' });
  }
});

// 3. Setup Fees & Discount
app.patch('/api/admission/setup-fees/:id', async (req, res) => {
  const { id } = req.params;
  const { tuitionFees, tuitionMandatory, booksFees, booksMandatory, uniformFees, uniformMandatory, otherFees, discountAmount, discountApprovedBy, busFees, busRouteId, additionalFees } = req.body;
  
  const totalFees = Number(tuitionFees || 0) + Number(booksFees || 0) + Number(uniformFees || 0) + Number(busFees || 0) + Number(otherFees || 0) + (additionalFees || []).reduce((s: number, f: any) => s + (f.selected ? f.amount : 0), 0) - Number(discountAmount || 0);

  try {
    const student = await prisma.student.update({
      where: { id },
      data: {
        tuitionFees, tuitionMandatory,
        booksFees, booksMandatory,
        uniformFees, uniformMandatory,
        busFees, busRouteId, otherFees, discountAmount, discountApprovedBy,
        totalFees,
        additionalFees,
        status: 'pending_approval'
      }
    });
    res.json(student);
  } catch (error) {
    res.status(400).json({ error: 'Failed to setup fees' });
  }
});

// 4. Final Approval
app.patch('/api/admission/approve/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const student = await prisma.student.update({
      where: { id },
      data: {
        status: 'admitted',
        enrollmentDate: new Date().toISOString().split('T')[0]
      }
    });
    res.json(student);
  } catch (error) {
    res.status(400).json({ error: 'Failed to approve' });
  }
});

// Get device status
app.get('/api/attendance/device-status', async (req, res) => {
  try {
    const isConnected = await zktecoService.pingDevice();
    res.json({ connected: isConnected });
  } catch (error) {
    res.json({ connected: false });
  }
});

// Force manual reconnect
app.post('/api/attendance/device-reconnect', async (req, res) => {
  try {
    const isConnected = await zktecoService.pingDevice();
    res.json({ connected: isConnected });
  } catch (error) {
    res.json({ connected: false });
  }
});

// Reconcile Database with ZKTeco
app.get('/api/attendance/reconcile', async (req, res) => {
  try {
    // 1. Get all employees from DB
    const employees = await prisma.employee.findMany({
      select: { employeeCode: true, fullName: true, id: true, nationalId: true }
    });
    
    // 2. Get all users from ZKTeco
    const machineUsers = await zktecoService.getAllUsers();
    
    // 3. Find missing (exists in DB, but not in Machine)
    const missing = employees.filter(emp => !machineUsers.includes(emp.employeeCode));
    
    res.json({ missing, machineUsersCount: machineUsers.length });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reconcile with device: ' + error.message });
  }
});

// --- Employees API ---

// Get next employee code directly from DB
app.get('/api/employees/next-code', async (req, res) => {
  try {
    const agg = await prisma.employee.aggregate({
      _max: { employeeCode: true }
    });
    const maxCode = agg._max.employeeCode || 0;
    res.json({ nextCode: maxCode + 1 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get next code' });
  }
});

app.get('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: { shift: true }
    });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// Get all employees or search
app.get('/api/employees', async (req, res) => {
  const { search, activeOnly } = req.query;
  try {
    // Build base where clause: if activeOnly=true, only return active employees
    const baseWhere: any = activeOnly === 'true' ? { active: true } : {};

    const employees = await prisma.employee.findMany({
      where: search ? {
        ...baseWhere,
        OR: [
          { fullName: { contains: String(search), mode: 'insensitive' as any } },
          { nationalId: { contains: String(search) } },
          ...( !isNaN(Number(search)) ? [{ employeeCode: Number(search) }] : [])
        ]
      } : baseWhere,
      orderBy: { createdAt: 'desc' }
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Get next employee code (DB fallback)
app.get('/api/employees/next-code', async (req, res) => {
  try {
    const lastEmployee = await prisma.employee.findFirst({
      orderBy: { employeeCode: 'desc' }
    });
    const nextCode = lastEmployee 
      ? lastEmployee.employeeCode + 1
      : 1;
    res.json({ nextCode });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate code' });
  }
});

// --- Attendance API ---

// Get next device ID from ZKTeco
app.get('/api/attendance/next-device-id', async (req, res) => {
  try {
    console.log('Fetching next device ID from ZKTeco...');
    const nextId = await zktecoService.getNextDeviceId();
    res.json({ nextId });
  } catch (error: any) {
    console.error('ZKTeco Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- Time parsing & attendance calculation utilities ---
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  return h * 60 + m;
}

function calculateDelay(checkInTimeStr: string, shiftStartTimeStr: string, gracePeriodIn: number): number {
  const checkInMin = parseTimeToMinutes(checkInTimeStr);
  const shiftStartMin = parseTimeToMinutes(shiftStartTimeStr);
  if (checkInMin > shiftStartMin + gracePeriodIn) {
    return checkInMin - shiftStartMin;
  }
  return 0;
}

function calculateEarlyDeparture(checkOutTimeStr: string, shiftEndTimeStr: string, gracePeriodOut: number): number {
  const checkOutMin = parseTimeToMinutes(checkOutTimeStr);
  const shiftEndMin = parseTimeToMinutes(shiftEndTimeStr);
  if (checkOutMin < shiftEndMin - gracePeriodOut) {
    return shiftEndMin - checkOutMin;
  }
  return 0;
}

function calculateTotalWorkingHours(checkInTimeStr: string, checkOutTimeStr: string): number {
  const checkInMin = parseTimeToMinutes(checkInTimeStr);
  const checkOutMin = parseTimeToMinutes(checkOutTimeStr);
  if (checkOutMin > checkInMin) {
    return parseFloat(((checkOutMin - checkInMin) / 60).toFixed(2));
  }
  return 0;
}

function calculateOvertime(checkOutTimeStr: string, shiftEndTimeStr: string): number {
  const checkOutMin = parseTimeToMinutes(checkOutTimeStr);
  const shiftEndMin = parseTimeToMinutes(shiftEndTimeStr);
  if (checkOutMin > shiftEndMin) {
    return parseFloat(((checkOutMin - shiftEndMin) / 60).toFixed(2));
  }
  return 0;
}

function calculateAcademicYear(dateStr: string): string {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  if (month > 9 || (month === 9 && day >= 15)) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

function getDatesInRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return [];
  }
  let current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function getLeaveEndDateStr(startDateStr: string, durationDays: number): string {
  const [year, month, day] = startDateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + durationDays - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
}

// Helper to parse record_time from ZKTeco device safely
// The library returns Date.toString() format like "Thu May 22 2026 07:30:00 GMT+0300"
// or sometimes ISO format or other variants
function parseDeviceRecordTime(recordTime: any): Date | null {
  if (!recordTime) return null;
  
  // If it's already a Date object
  if (recordTime instanceof Date) {
    return isNaN(recordTime.getTime()) ? null : recordTime;
  }
  
  // Try parsing as string
  const dateStr = String(recordTime);
  
  // Try standard Date parsing (handles both toString() and ISO formats)
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  // Try manual extraction if standard parsing fails
  // Format: "YYYY-MM-DD HH:mm:ss" or "YYYY/MM/DD HH:mm:ss"
  const manualMatch = dateStr.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
  if (manualMatch) {
    const [, year, month, day, hour, minute, second] = manualMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
  }
  
  return null;
}

// Helper to run ZKTeco attendance sync for a range of dates (applying database time offset)
async function syncAttendanceInternal(startRange: string, endRange: string, targetEmployeeCode?: number): Promise<number> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[Sync] بدء مزامنة البصمات من ${startRange} إلى ${endRange}`);
  console.log(`[Sync] الموظف المستهدف: ${targetEmployeeCode || 'جميع الموظفين'}`);
  console.log(`${'='.repeat(60)}`);
  
  let logs: any[];
  try {
    logs = await zktecoService.getAttendanceLogs();
  } catch (error: any) {
    console.error(`[Sync] ❌ فشل الاتصال بجهاز البصمة: ${error.message || error}`);
    // Abort sync to avoid overwriting attendance records
    return 0;
  }

  if (!logs || logs.length === 0) {
    console.log('[Sync] ⚠️ لا توجد سجلات بصمة في الجهاز. لا يتم تعديل سجلات الحضور.');
    return 0;
  } else {
    console.log(`[Sync] 📥 تم استلام ${logs.length} سجل بصمة من الجهاز`);
  }
  
  const settings = await prisma.deviceSetting.findFirst();
  const offset = settings?.timeOffsetMinutes || 0;
  if (offset !== 0) {
    console.log(`[Sync] ⏱️ إزاحة الوقت (Time Offset): ${offset} دقيقة`);
  }
  
  // Group all device logs by date, then by employeeCode
  const logMap: { [date: string]: { [empCode: number]: string[] } } = {};
  let parsedCount = 0;
  let parseFailCount = 0;
  const unmatchedUserIds = new Set<string>();
  
  for (const log of logs) {
    try {
      const userId = log.user_id || log.userId;
      const recordTime = log.record_time || log.recordTime;
      
      // تحويل كود الموظف - التأكد من مطابقة النوع (String -> Number)
      const employeeCode = parseInt(String(userId).trim(), 10);
      
      if (isNaN(employeeCode)) {
        unmatchedUserIds.add(String(userId));
        parseFailCount++;
        continue;
      }
      
      if (!recordTime) {
        parseFailCount++;
        continue;
      }
      
      // تحويل وقت البصمة بشكل آمن
      const logDate = parseDeviceRecordTime(recordTime);
      if (!logDate) {
        console.warn(`[Sync] ⚠️ فشل تحويل التاريخ للموظف ${employeeCode}: "${recordTime}"`);
        parseFailCount++;
        continue;
      }
      
      // تطبيق إزاحة الوقت
      if (offset !== 0) {
        logDate.setMinutes(logDate.getMinutes() + offset);
      }
      
      const dateStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(logDate.getHours()).padStart(2, '0')}:${String(logDate.getMinutes()).padStart(2, '0')}:${String(logDate.getSeconds()).padStart(2, '0')}`;
      
      if (!logMap[dateStr]) logMap[dateStr] = {};
      if (!logMap[dateStr][employeeCode]) logMap[dateStr][employeeCode] = [];
      logMap[dateStr][employeeCode].push(timeStr);
      parsedCount++;
    } catch (parseError: any) {
      parseFailCount++;
      console.warn(`[Sync] ⚠️ خطأ في معالجة سجل بصمة: ${parseError.message}`);
    }
  }

  console.log(`[Sync] 📊 نتائج التحليل: ${parsedCount} سجل صالح، ${parseFailCount} سجل مُتخطّى`);
  if (unmatchedUserIds.size > 0) {
    console.warn(`[Sync] ⚠️ أكواد مستخدمين غير صالحة من الجهاز: ${Array.from(unmatchedUserIds).join(', ')}`);
  }
  console.log(`[Sync] 📅 التواريخ الموجودة في السجلات: ${Object.keys(logMap).sort().join(', ')}`);
  
  const targetDates = getDatesInRange(startRange, endRange);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  // Fetch all approved public holidays
  const holidays = await prisma.publicHoliday.findMany({
    where: { status: 'APPROVED' }
  });

  const allEmployees = await prisma.employee.findMany({
    where: targetEmployeeCode !== undefined ? { employeeCode: targetEmployeeCode, active: true } : { active: true },
    include: { shift: true }
  });

  if (allEmployees.length === 0) {
    console.warn('[Sync] ⚠️ لا يوجد موظفين في قاعدة البيانات');
    return 0;
  }

  console.log(`[Sync] 👥 عدد الموظفين: ${allEmployees.length}, عدد الأيام: ${targetDates.length}`);

  // التحقق من وجود أكواد الموظفين في سجلات البصمة
  const allEmpCodes = new Set(allEmployees.map(e => e.employeeCode));
  const deviceEmpCodes = new Set<number>();
  for (const dateStr of Object.keys(logMap)) {
    for (const code of Object.keys(logMap[dateStr])) {
      deviceEmpCodes.add(parseInt(code));
    }
  }
  const unmatchedDeviceCodes = Array.from(deviceEmpCodes).filter(c => !allEmpCodes.has(c));
  if (unmatchedDeviceCodes.length > 0) {
    console.warn(`[Sync] ⚠️ أكواد موظفين موجودة في الجهاز لكن غير مسجلة في قاعدة البيانات: ${unmatchedDeviceCodes.join(', ')}`);
  }
  
  // Load approved leaves (CASUAL, ANNUAL) once to check ranges in-memory
  const approvedLeaves = await prisma.leavePermissionRequest.findMany({
    where: {
      employeeCode: targetEmployeeCode !== undefined ? targetEmployeeCode : undefined,
      type: { in: ['CASUAL', 'ANNUAL'] },
      status: { in: ['APPROVED_FREE', 'APPROVED_WITH_DEDUCTION'] }
    }
  });

  // Load manual attendances to prevent overwriting them during sync
  const manualAttendances = await prisma.attendance.findMany({
    where: {
      date: { in: targetDates },
      isManual: true,
      ...(targetEmployeeCode !== undefined ? { employeeCode: targetEmployeeCode } : {})
    },
    select: { employeeCode: true, date: true }
  });

  let processedCount = 0;
  let errorCount = 0;
  
  for (const dateStr of targetDates) {
    const dayOfWeek = dayNames[new Date(dateStr).getDay()];
    const dayLogs = logMap[dateStr] || {};
    
    for (const emp of allEmployees) {
      try {
        const empCode = emp.employeeCode;
        
        // ─── Manual Edit Check ──────────────────────────────────────────────
        // Skip automated sync processing if there is a manual edit for this date and employee
        const isManuallyEdited = manualAttendances.some(ma => ma.employeeCode === empCode && ma.date === dateStr);
        if (isManuallyEdited) {
          continue;
        }

        const empLogs = dayLogs[empCode] || [];
      
        // ─── Public Holiday Check ────────────────────────────────────────────
        // If this date falls within any approved public holiday range, all employees get LEAVE automatically
        const isPublicHoliday = holidays.some(h => dateStr >= h.startDate && dateStr <= h.endDate);
        if (isPublicHoliday) {
          await prisma.attendance.upsert({
            where: {
              employeeCode_date: {
                employeeCode: empCode,
                date: dateStr
              }
            },
            update: {
              checkIn: null,
              checkOut: null,
              delayMinutes: 0,
              earlyDeparture: 0,
              shiftId: emp.shiftId,
              status: 'LEAVE'
            },
            create: {
              employeeCode: empCode,
              date: dateStr,
              checkIn: null,
              checkOut: null,
              delayMinutes: 0,
              earlyDeparture: 0,
              shiftId: emp.shiftId,
              status: 'LEAVE'
            }
          });
          processedCount++;
          continue;
        }

        // ─── Approved Leave (CASUAL / ANNUAL) ───────────────────────────────
        // Check if there is an approved leave request for this employee that covers this date (range check)
        const approvedLeave = approvedLeaves.find(leave => {
          if (leave.employeeCode !== empCode) return false;
          const startStr = leave.date;
          const endStr = getLeaveEndDateStr(startStr, leave.durationDays);
          return dateStr >= startStr && dateStr <= endStr;
        });

        if (approvedLeave) {
          const finalStatus = approvedLeave.status === 'APPROVED_FREE' ? 'إجازة معفاة' : 'غياب بدون راتب';
          await prisma.attendance.upsert({
            where: {
              employeeCode_date: {
                employeeCode: empCode,
                date: dateStr
              }
            },
            update: {
              checkIn: null,
              checkOut: null,
              delayMinutes: 0,
              earlyDeparture: 0,
              shiftId: emp.shiftId,
              status: finalStatus
            },
            create: {
              employeeCode: empCode,
              date: dateStr,
              checkIn: null,
              checkOut: null,
              delayMinutes: 0,
              earlyDeparture: 0,
              shiftId: emp.shiftId,
              status: finalStatus
            }
          });
          processedCount++;
          continue;
        }

        // ─── No Logs ─────────────────────────────────────────────────────────
        // If no logs for this employee on this date
        if (empLogs.length === 0) {
          // If it's a weekend, skip entirely (no record needed)
          if (emp.shift.weekends.includes(dayOfWeek)) {
            continue;
          }
          
          // Otherwise, record as absent
          await prisma.attendance.upsert({
            where: {
              employeeCode_date: {
                employeeCode: empCode,
                date: dateStr
              }
            },
            update: {
              checkIn: null,
              checkOut: null,
              delayMinutes: 0,
              earlyDeparture: 0,
              shiftId: emp.shiftId,
              status: 'absent'
            },
            create: {
              employeeCode: empCode,
              date: dateStr,
              checkIn: null,
              checkOut: null,
              delayMinutes: 0,
              earlyDeparture: 0,
              shiftId: emp.shiftId,
              status: 'absent'
            }
          });
          processedCount++;
          continue;
        }
        
        // 2. We have logs! Let's categorize them into Check-In and Check-Out.
        const checkOutStartMin = parseTimeToMinutes(emp.shift.checkOutStart);
        
        let checkInPunches: string[] = [];
        let checkOutPunches: string[] = [];
        
        // Sort chronologically first
        empLogs.sort();
        
        for (const timeStr of empLogs) {
          const punchMin = parseTimeToMinutes(timeStr);
          if (punchMin < checkOutStartMin) {
            checkInPunches.push(timeStr);
          } else {
            checkOutPunches.push(timeStr);
          }
        }
        
        // Robustness: If no check-in was found (all punches were late), but they punched multiple times, 
        // the first punch is likely their check-in.
        if (checkInPunches.length === 0 && checkOutPunches.length > 1) {
          checkInPunches.push(checkOutPunches.shift() as string);
        }
        
        // Robustness: If no check-out was found, but they punched multiple times in the morning,
        // the last punch could be their check-out (e.g. they left early before checkOutStart).
        if (checkOutPunches.length === 0 && checkInPunches.length > 1) {
          checkOutPunches.push(checkInPunches.pop() as string);
        }
        
        const checkIn = checkInPunches.length > 0 ? checkInPunches[0] : null;
        const checkOut = checkOutPunches.length > 0 ? checkOutPunches[checkOutPunches.length - 1] : null;
        
        let delayMinutes = 0;
        let earlyDeparture = 0;
        let status = 'present';
        
        const shiftStartMin = parseTimeToMinutes(emp.shift.startTime);
        const shiftEndMin = parseTimeToMinutes(emp.shift.endTime);
        
        // Calculate status and metrics
        if (checkIn && !checkOut) {
          status = 'لم يبصم انصراف';
          // Calculate delay if any
          const checkInMin = parseTimeToMinutes(checkIn);
          const gracePeriodInMin = emp.shift.gracePeriodIn;
          
          if (checkInMin > shiftStartMin + gracePeriodInMin) {
            delayMinutes = checkInMin - (shiftStartMin + gracePeriodInMin);
          }
        } 
        else if (!checkIn && checkOut) {
          status = 'لم يبصم حضور';
          // Calculate early departure if any
          const checkOutMin = parseTimeToMinutes(checkOut);
          const gracePeriodOutMin = emp.shift.gracePeriodOut;
          
          if (checkOutMin < shiftEndMin - gracePeriodOutMin) {
            earlyDeparture = (shiftEndMin - gracePeriodOutMin) - checkOutMin;
          }
        } 
        else if (checkIn && checkOut) {
          // 1. Delay minutes
          const checkInMin = parseTimeToMinutes(checkIn);
          const gracePeriodInMin = emp.shift.gracePeriodIn;
          
          if (checkInMin > shiftStartMin + gracePeriodInMin) {
            delayMinutes = checkInMin - (shiftStartMin + gracePeriodInMin);
            status = 'late';
          } else {
            status = 'present';
          }
          
          // 2. Early departure
          const checkOutMin = parseTimeToMinutes(checkOut);
          const gracePeriodOutMin = emp.shift.gracePeriodOut;
          
          if (checkOutMin < shiftEndMin - gracePeriodOutMin) {
            earlyDeparture = (shiftEndMin - gracePeriodOutMin) - checkOutMin;
          }
        } else {
          // No punches classified (all fell outside windows), mark as absent if not weekend
          if (emp.shift.weekends.includes(dayOfWeek)) continue;
          status = 'absent';
        }
        
        // Check for approved permissions to apply 120-minute buffer subtraction
        const approvedAmPermission = await prisma.leavePermissionRequest.findFirst({
          where: {
            employeeCode: empCode,
            date: dateStr,
            type: 'AM_PERMISSION',
            status: { in: ['APPROVED_FREE', 'APPROVED_WITH_DEDUCTION'] }
          }
        });

        const approvedPmPermission = await prisma.leavePermissionRequest.findFirst({
          where: {
            employeeCode: empCode,
            date: dateStr,
            type: 'PM_PERMISSION',
            status: { in: ['APPROVED_FREE', 'APPROVED_WITH_DEDUCTION'] }
          }
        });

        // Apply AM_PERMISSION: covers max 120 minutes of delay
        if (approvedAmPermission && delayMinutes > 0) {
          if (delayMinutes <= 120) {
            delayMinutes = 0;
          } else {
            delayMinutes = delayMinutes - 120;
          }
          if (delayMinutes === 0 && status === 'late') {
            status = 'present';
          }
        }

        // Apply PM_PERMISSION: covers max 120 minutes of early departure
        if (approvedPmPermission && earlyDeparture > 0) {
          if (earlyDeparture <= 120) {
            earlyDeparture = 0;
          } else {
            earlyDeparture = earlyDeparture - 120;
          }
        }

        // Determine final composite status when both checkIn and checkOut exist
        if (checkIn && checkOut) {
          if (delayMinutes > 0 && earlyDeparture > 0) {
            status = 'حضر متأخر وانصرف مبكراً';
          } else if (delayMinutes > 0) {
            status = 'late';
          } else if (earlyDeparture > 0) {
            status = 'EARLY_DEPARTURE';
          } else {
            status = 'present';
          }
        }

        // تأكد من فحص دقائق الخروج المبكر بعد احتساب وقت الانصراف الفعلي ومقارنته بالمناوبة
        if (earlyDeparture > 0 && status !== 'حضر متأخر وانصرف مبكراً') {
            status = 'EARLY_DEPARTURE';
        }

        await prisma.attendance.upsert({
          where: {
            employeeCode_date: {
              employeeCode: empCode,
              date: dateStr
            }
          },
          update: {
            checkIn,
            checkOut,
            delayMinutes,
            earlyDeparture,
            shiftId: emp.shiftId,
            status
          },
          create: {
            employeeCode: empCode,
            date: dateStr,
            checkIn,
            checkOut,
            delayMinutes,
            earlyDeparture,
            shiftId: emp.shiftId,
            status
          }
        });
        processedCount++;
      } catch (empError: any) {
        errorCount++;
        console.error(`[Sync] ❌ خطأ في معالجة الموظف ${emp.employeeCode} (${emp.fullName}) بتاريخ ${dateStr}: ${empError.message}`);
        // نتخطى هذا الموظف ونكمل الباقي بدلاً من إيقاف السيرفر
        continue;
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[Sync] ✅ اكتملت المزامنة بنجاح!`);
  console.log(`[Sync] 📊 تم ترحيل ${processedCount} سجل حضور إلى قاعدة البيانات`);
  if (errorCount > 0) {
    console.warn(`[Sync] ⚠️ ${errorCount} سجل فشل في الترحيل`);
  }
  console.log(`${'='.repeat(60)}\n`);
  
  return processedCount;
}

// Sync attendance logs from ZKTeco
app.post('/api/attendance/sync', async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const startRange = fromDate || todayStr;
    const endRange = toDate || todayStr;
    
    const processedCount = await syncAttendanceInternal(startRange, endRange);
    
    res.json({ message: 'تمت المزامنة بنجاح', count: processedCount });
  } catch (error: any) {
    console.error('Sync Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get device time offset settings
app.get('/api/device-settings', async (req, res) => {
  try {
    const settings = await prisma.deviceSetting.findFirst();
    res.json({ timeOffsetMinutes: settings?.timeOffsetMinutes || 0 });
  } catch (error: any) {
    console.error('Fetch device settings error:', error.message);
    res.status(500).json({ error: 'Failed to fetch device settings' });
  }
});

// Update device settings and apply retroactive calculation for targetDate
app.post('/api/device-settings', async (req, res) => {
  try {
    const { timeOffsetMinutes, targetDate, employeeCode } = req.body;
    const offset = parseInt(timeOffsetMinutes);
    if (isNaN(offset)) {
      return res.status(400).json({ error: 'القيمة المدخلة غير صحيحة' });
    }
    
    let settings = await prisma.deviceSetting.findFirst();
    if (settings) {
      settings = await prisma.deviceSetting.update({
        where: { id: settings.id },
        data: { timeOffsetMinutes: offset }
      });
    } else {
      settings = await prisma.deviceSetting.create({
        data: { timeOffsetMinutes: offset }
      });
    }
    
    console.log(`[Device Settings] Time Offset updated to: ${offset} minutes.`);
    
    // Retroactive update if targetDate is specified
    let recalculatedCount = 0;
    if (targetDate) {
      const targetEmpCode = employeeCode === 'all' || !employeeCode ? undefined : parseInt(employeeCode);
      console.log(`[Device Settings] Applying offset retroactively to date: ${targetDate} for employee: ${employeeCode}...`);
      recalculatedCount = await syncAttendanceInternal(targetDate, targetDate, targetEmpCode);
    }
    
    res.json({ 
      message: 'تم حفظ فارق التوقيت وتحديث الحضور بنجاح', 
      timeOffsetMinutes: settings.timeOffsetMinutes,
      recalculatedCount
    });
  } catch (error: any) {
    console.error('Update device settings error:', error.message);
    res.status(500).json({ error: 'فشل حفظ إعدادات فارق التوقيت وتحديث الحركات: ' + error.message });
  }
});

// Get attendance logs from database
app.get('/api/attendance', async (req, res) => {
  try {
    const attendance = await prisma.attendance.findMany({
      where: {
        employee: {
          active: true
        }
      },
      include: { 
        employee: {
          select: { fullName: true, employeeCode: true, department: true }
        },
        shift: {
          select: { shiftName: true, startTime: true, endTime: true }
        }
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 100
    });
    res.json(attendance);
  } catch (error: any) {
    console.error('Fetch attendance error:', error.message);
    res.status(500).json({ error: 'Failed to fetch attendance: ' + error.message });
  }
});

// Manual attendance correction by manager
app.patch('/api/attendance/manual-update', async (req, res) => {
  try {
    const { employeeCode, date, checkIn, checkOut } = req.body as {
      employeeCode: number;
      date: string;
      checkIn?: string | null;
      checkOut?: string | null;
    };

    if (!employeeCode || !date) {
      return res.status(400).json({ error: 'employeeCode و date مطلوبان' });
    }

    // Validate time format HH:mm or HH:mm:ss
    const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
    const validCheckIn  = checkIn  && timeRegex.test(checkIn)  ? checkIn  : null;
    const validCheckOut = checkOut && timeRegex.test(checkOut) ? checkOut : null;

    // Load employee + shift for status recalculation
    const emp = await prisma.employee.findFirst({
      where: { employeeCode: Number(employeeCode) },
      include: { shift: true }
    });
    if (!emp || !emp.shift) {
      return res.status(404).json({ error: 'الموظف أو المناوبة غير موجودة' });
    }

    const shift = emp.shift;
    const shiftStartMin   = parseTimeToMinutes(shift.startTime);
    const shiftEndMin     = parseTimeToMinutes(shift.endTime);
    const gracePeriodIn   = shift.gracePeriodIn  || 0;
    const gracePeriodOut  = shift.gracePeriodOut || 0;

    let delayMinutes  = 0;
    let earlyDeparture = 0;
    let status = 'present';

    if (validCheckIn && validCheckOut) {
      const ciMin = parseTimeToMinutes(validCheckIn);
      const coMin = parseTimeToMinutes(validCheckOut);

      if (ciMin > shiftStartMin + gracePeriodIn) {
        delayMinutes = ciMin - (shiftStartMin + gracePeriodIn);
        status = 'late';
      }

      if (coMin < shiftEndMin - gracePeriodOut) {
        earlyDeparture = (shiftEndMin - gracePeriodOut) - coMin;
      }

      if (delayMinutes > 0 && earlyDeparture > 0) {
        status = 'حضر متأخر وانصرف مبكراً';
      } else if (delayMinutes > 0) {
        status = 'late';
      } else if (earlyDeparture > 0) {
        status = 'EARLY_DEPARTURE';
      } else {
        status = 'present';
      }
    } else if (validCheckIn && !validCheckOut) {
      const ciMin = parseTimeToMinutes(validCheckIn);
      if (ciMin > shiftStartMin + gracePeriodIn) {
        delayMinutes = ciMin - (shiftStartMin + gracePeriodIn);
      }
      status = 'لم يبصم انصراف';
    } else if (!validCheckIn && validCheckOut) {
      const coMin = parseTimeToMinutes(validCheckOut);
      if (coMin < shiftEndMin - gracePeriodOut) {
        earlyDeparture = (shiftEndMin - gracePeriodOut) - coMin;
      }
      status = 'لم يبصم حضور';
    } else {
      status = 'absent';
    }

    const updated = await prisma.attendance.upsert({
      where: {
        employeeCode_date: {
          employeeCode: Number(employeeCode),
          date
        }
      },
      update: {
        checkIn: validCheckIn,
        checkOut: validCheckOut,
        delayMinutes,
        earlyDeparture,
        status,
        shiftId: emp.shiftId,
        isManual: true
      },
      create: {
        employeeCode: Number(employeeCode),
        date,
        checkIn: validCheckIn,
        checkOut: validCheckOut,
        delayMinutes,
        earlyDeparture,
        status,
        shiftId: emp.shiftId,
        isManual: true
      },
      include: {
        employee: { select: { fullName: true, employeeCode: true, department: true } },
        shift:    { select: { shiftName: true, startTime: true, endTime: true } }
      }
    });

    console.log(`[Manual] ✅ تم تحديث حضور الموظف ${employeeCode} بتاريخ ${date} يدوياً → الحالة: ${status}`);
    res.json(updated);
  } catch (error: any) {
    console.error('[Manual] ❌ خطأ في التحديث اليدوي:', error.message);
    res.status(500).json({ error: 'فشل التحديث اليدوي: ' + error.message });
  }
});


// Get employee profile
app.get('/api/employees/profile/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: {
        busRoute: true,
        deductions: true,
        attendance: {
          orderBy: { date: 'desc' },
          take: 50 // Get last 50 attendance records
        },
        leaveBalances: true,
        leaveRequests: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!employee) {
      return res.status(404).json({ error: 'الموظف غير موجود' });
    }

    res.json(employee);
  } catch (error: any) {
    console.error('Fetch profile error:', error);
    res.status(500).json({ error: 'Failed to fetch employee profile' });
  }
});

// Create employee
app.post('/api/employees', upload.fields([{ name: 'personal_photo', maxCount: 1 }, { name: 'contract_pdf', maxCount: 1 }]), async (req, res) => {
  try {
    const { active, auditUser, oldData, busSubscription, ...rawData } = req.body;
    const data: any = {
      ...rawData,
      isBusSubscribed: rawData.isBusSubscribed === 'true' || rawData.isBusSubscribed === true,
      busRouteId: rawData.busRouteId === 'none' || !rawData.busRouteId ? null : rawData.busRouteId,
      busSubscriptionType: rawData.busSubscriptionType === 'none' || !rawData.busSubscriptionType ? null : rawData.busSubscriptionType,
    };

    if (active !== undefined) {
      data.active = active === true || active === 'true';
    }

    // Parse numeric fields if they come from FormData as strings
    if (data.employeeCode !== undefined) data.employeeCode = parseInt(data.employeeCode);
    if (data.shiftId !== undefined) data.shiftId = parseInt(data.shiftId);
    if (data.baseSalary !== undefined) data.baseSalary = parseFloat(data.baseSalary);
    if (data.contractDuration !== undefined) data.contractDuration = parseFloat(data.contractDuration);
    if (data.totalAllowedRegular !== undefined) data.totalAllowedRegular = parseInt(data.totalAllowedRegular);
    if (data.totalAllowedCasual !== undefined) data.totalAllowedCasual = parseInt(data.totalAllowedCasual);

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files && files['personal_photo']) {
      data.avatar = `/uploads/${files['personal_photo'][0].filename}`;
    }
    if (files && files['contract_pdf']) {
      data.contractPdf = `/uploads/${files['contract_pdf'][0].filename}`;
    }

    const employeeCode = parseInt(data.employeeCode);

    console.log('[HR] Creating employee in PostgreSQL...');
    const employee = await prisma.employee.create({ data });
    console.log('✅ [HR] Employee created in database:', employee.id);
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        employeeId: employee.id,
        action: 'INSERT',
        changedBy: auditUser || 'Unknown',
        newData: employee as any
      }
    });

    res.status(201).json(employee);
  } catch (error: any) {
    console.error('❌ [HR] FATAL Error creating employee:', error);
    
    // إرسال رسالة خطأ واضحة باللغة العربية
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'هذا الموظف مسجل من قبل بهذا الرقم القومي أو الكود' });
    }
    
    res.status(500).json({ error: 'حدث خطأ داخلي أثناء حفظ بيانات الموظف في قاعدة البيانات. الرجاء مراجعة سجلات الخادم.' });
  }
});

// Admin Allowed Balances Update (Individual/Bulk)
app.patch('/api/employees/balances', async (req, res) => {
  try {
    const { employeeCode, totalAllowedCasual, totalAllowedRegular, isBulk, academicYear } = req.body;
    
    if (totalAllowedCasual === undefined || totalAllowedRegular === undefined) {
      return res.status(400).json({ error: 'الأرصدة الجديدة مطلوبة' });
    }

    const casual = parseInt(totalAllowedCasual);
    const regular = parseInt(totalAllowedRegular);
    
    if (isNaN(casual) || isNaN(regular)) {
      return res.status(400).json({ error: 'القيم يجب أن تكون أرقاماً صحيحة' });
    }

    const activeAcademicYear = academicYear || getAcademicYear();

    if (isBulk) {
      // Bulk update all employees
      await prisma.employee.updateMany({
        data: {
          totalAllowedCasual: casual,
          totalAllowedRegular: regular
        }
      });

      // Recalculate balances for all ACTIVE employees only
      const allEmployees = await prisma.employee.findMany({
        where: { active: true },
        select: { employeeCode: true }
      });

      for (const emp of allEmployees) {
        await recalculateEmployeeBalances(emp.employeeCode, activeAcademicYear);
      }

      return res.json({ message: 'تم تحديث الأرصدة السنوية لجميع الموظفين بنجاح' });
    } else {
      if (!employeeCode) {
        return res.status(400).json({ error: 'كود الموظف مطلوب للتعديل الفردي' });
      }
      const empCode = parseInt(employeeCode);
      if (isNaN(empCode)) {
        return res.status(400).json({ error: 'كود الموظف غير صحيح' });
      }

      await prisma.employee.update({
        where: { employeeCode: empCode },
        data: {
          totalAllowedCasual: casual,
          totalAllowedRegular: regular
        }
      });

      // Recalculate balance for this employee
      await recalculateEmployeeBalances(empCode, activeAcademicYear);

      return res.json({ message: 'تم تحديث الأرصدة السنوية للموظف بنجاح' });
    }
  } catch (error: any) {
    console.error('Update allowed balances error:', error.message);
    res.status(500).json({ error: 'فشل تحديث الأرصدة السنوية: ' + error.message });
  }
});

// Update employee
app.patch('/api/employees/:id', upload.fields([{ name: 'personal_photo', maxCount: 1 }, { name: 'contract_pdf', maxCount: 1 }]), async (req, res) => {
  const { id } = req.params;
  const { active, auditUser, oldData, busSubscription, ...rawData } = req.body;
  try {
    const empId = parseInt(id as string);
    const otherData: any = { ...rawData };

    if (rawData.isBusSubscribed !== undefined) {
      otherData.isBusSubscribed = rawData.isBusSubscribed === 'true' || rawData.isBusSubscribed === true;
    }
    if (rawData.busRouteId !== undefined) {
      otherData.busRouteId = rawData.busRouteId === 'none' || !rawData.busRouteId ? null : rawData.busRouteId;
    }
    if (rawData.busSubscriptionType !== undefined) {
      otherData.busSubscriptionType = rawData.busSubscriptionType === 'none' || !rawData.busSubscriptionType ? null : rawData.busSubscriptionType;
    }

    let isActive = active === true || active === 'true';

    // Parse numeric fields if they come from FormData as strings
    if (otherData.employeeCode !== undefined) otherData.employeeCode = parseInt(otherData.employeeCode);
    if (otherData.shiftId !== undefined) otherData.shiftId = parseInt(otherData.shiftId);
    if (otherData.baseSalary !== undefined) otherData.baseSalary = parseFloat(otherData.baseSalary);
    if (otherData.contractDuration !== undefined) otherData.contractDuration = parseFloat(otherData.contractDuration);
    if (otherData.totalAllowedRegular !== undefined) otherData.totalAllowedRegular = parseInt(otherData.totalAllowedRegular);
    if (otherData.totalAllowedCasual !== undefined) otherData.totalAllowedCasual = parseInt(otherData.totalAllowedCasual);

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files && files['personal_photo']) {
      otherData.avatar = `/uploads/${files['personal_photo'][0].filename}`;
    }
    if (files && files['contract_pdf']) {
      otherData.contractPdf = `/uploads/${files['contract_pdf'][0].filename}`;
    }
    
    const existingEmployee = await prisma.employee.findUnique({ where: { id: empId } });
    if (!existingEmployee) return res.status(404).json({ error: 'الموظف غير موجود' });

    // Check if status is changing to INACTIVE
    if (otherData.status === 'INACTIVE') {
      isActive = false;
      otherData.isBusSubscribed = false;
      // Inactivate recurring deductions
      await prisma.deduction.updateMany({
        where: { employeeCode: existingEmployee.employeeCode, isRecurring: true },
        data: { status: 'INACTIVE' }
      });
    } else if (otherData.status === 'ACTIVE') {
      isActive = true;
    }
    
    // If active was explicitly omitted and status didn't change it, keep existing
    if (active === undefined && otherData.status === undefined) {
      isActive = existingEmployee.active;
    }


    const employee = await prisma.employee.update({
      where: { id: empId },
      data: {
        ...otherData,
        active: isActive
      }
    });

    // Handle Bus Subscription
    if (otherData.isBusSubscribed !== undefined || otherData.busRouteId || otherData.busSubscriptionType) {
      if (employee.isBusSubscribed && employee.busRouteId) {
        const busRoute = await prisma.busRoute.findUnique({ where: { id: employee.busRouteId } });
        if (busRoute) {
          const amount = employee.busSubscriptionType === 'SUPERVISOR' ? 0 : busRoute.monthlyFee * 0.5;
          
          // Upsert recurring BUS_SUBSCRIPTION deduction
          const existingBusDeduction = await prisma.deduction.findFirst({
            where: { employeeCode: employee.employeeCode, type: 'BUS_SUBSCRIPTION', isRecurring: true }
          });
          
          if (existingBusDeduction) {
            await prisma.deduction.update({
              where: { id: existingBusDeduction.id },
              data: { amount, status: 'ACTIVE' }
            });
          } else {
            await prisma.deduction.create({
              data: {
                employeeCode: employee.employeeCode,
                type: 'BUS_SUBSCRIPTION',
                amount,
                isRecurring: true,
                status: 'ACTIVE'
              }
            });
          }
        }
      } else {
        // If unsubscribed, inactivate bus deduction
        await prisma.deduction.updateMany({
          where: { employeeCode: employee.employeeCode, type: 'BUS_SUBSCRIPTION', isRecurring: true },
          data: { status: 'INACTIVE' }
        });
      }
    }

    // Create audit log
    let parsedOldData = oldData;
    if (typeof oldData === 'string') {
      try { parsedOldData = JSON.parse(oldData); } catch(e) {}
    }
    
    await prisma.auditLog.create({
      data: {
        employeeId: empId,
        action: 'UPDATE',
        changedBy: auditUser || 'Unknown',
        oldData: parsedOldData as any,
        newData: employee as any
      }
    });

    res.json(employee);
  } catch (error: any) {
    console.error('Update employee error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'NATIONAL_ID_EXISTS' });
    }
    res.status(400).json({ error: 'Failed to update employee' });
  }
});

// Delete employee
app.delete('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.employee.delete({ where: { id: parseInt(id) } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete employee' });
  }
});

// SHIFT ROUTES
// Get all shifts
app.get('/api/shifts', async (req, res) => {
  try {
    console.log('GET /api/shifts');
    const shifts = await prisma.shift.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(shifts);
  } catch (error: any) {
    console.error('Fetch shifts error:', error.message);
    res.status(500).json({ error: 'Failed to fetch shifts: ' + error.message });
  }
});

// Create shift
app.post('/api/shifts', async (req, res) => {
  console.log('POST /api/shifts - Body:', req.body);
  try {
    const { 
      shiftName, 
      startTime, 
      endTime, 
      gracePeriodIn, 
      gracePeriodOut, 
      checkInStart, 
      checkInEnd, 
      checkOutStart, 
      checkOutEnd,
      weekends
    } = req.body;
    
    if (!shiftName || !startTime || !endTime) {
      return res.status(400).json({ error: 'جميع الحقول الأساسية (الاسم، وقت البدء، وقت الانتهاء) مطلوبة' });
    }

    const shift = await prisma.shift.create({
      data: {
        shiftName,
        startTime,
        endTime,
        gracePeriodIn: parseInt(gracePeriodIn?.toString() || '0'),
        gracePeriodOut: parseInt(gracePeriodOut?.toString() || '0'),
        checkInStart: checkInStart || '00:00',
        checkInEnd: checkInEnd || '23:59',
        checkOutStart: checkOutStart || '00:00',
        checkOutEnd: checkOutEnd || '23:59',
        weekends: Array.isArray(weekends) ? weekends : []
      }
    });
    console.log('✅ Shift created:', shift.id);
    res.status(201).json(shift);
  } catch (error: any) {
    console.error('❌ [HR] FATAL Error creating shift:', error);
    res.status(500).json({ error: 'فشل إضافة المناوبة في قاعدة البيانات. ' + error.message });
  }
});

// Update shift
app.patch('/api/shifts/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`PATCH /api/shifts/${id} - Body:`, req.body);
  try {
    const { 
      shiftName, 
      startTime, 
      endTime, 
      gracePeriodIn, 
      gracePeriodOut, 
      checkInStart, 
      checkInEnd, 
      checkOutStart, 
      checkOutEnd,
      weekends
    } = req.body;
    const shiftId = parseInt(id);
    
    if (isNaN(shiftId)) {
      return res.status(400).json({ error: 'معرف المناوبة غير صحيح' });
    }

    const shift = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        shiftName,
        startTime,
        endTime,
        gracePeriodIn: gracePeriodIn !== undefined ? parseInt(gracePeriodIn.toString()) : undefined,
        gracePeriodOut: gracePeriodOut !== undefined ? parseInt(gracePeriodOut.toString()) : undefined,
        checkInStart,
        checkInEnd,
        checkOutStart,
        checkOutEnd,
        weekends: Array.isArray(weekends) ? weekends : undefined
      }
    });
    console.log('✅ Shift updated:', shift.id);
    res.json(shift);
  } catch (error: any) {
    console.error('Update shift error:', error.message);
    res.status(400).json({ error: 'فشل تحديث المناوبة: ' + error.message });
  }
});

// Delete shift
app.delete('/api/shifts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.shift.delete({ where: { id: parseInt(id) } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete shift' });
  }
});


// --- PUBLIC HOLIDAYS ENDPOINTS ---

// Get all public holidays (filtered by current server academic year)
app.get('/api/public-holidays', async (req, res) => {
  try {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const currentAcademicYear = calculateAcademicYear(todayStr);

    const holidays = await prisma.publicHoliday.findMany({
      where: {
        academicYear: currentAcademicYear
      },
      orderBy: { startDate: 'asc' }
    });
    res.json(holidays);
  } catch (error: any) {
    console.error('Fetch public holidays error:', error.message);
    res.status(500).json({ error: 'فشل جلب الأعياد الرسمية' });
  }
});

// Create public holiday (default to PENDING and calculate academicYear)
app.post('/api/public-holidays', async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ error: 'اسم العيد وتاريخ البداية والنهاية مطلوبان' });
    }

    if (startDate > endDate) {
      return res.status(400).json({ error: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية' });
    }

    const academicYear = calculateAcademicYear(startDate);

    const holiday = await prisma.publicHoliday.create({
      data: {
        name,
        startDate,
        endDate,
        status: 'PENDING',
        academicYear
      }
    });
    res.status(201).json(holiday);
  } catch (error: any) {
    console.error('Create public holiday error:', error.message);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'هذا التاريخ مسجل كعيد رسمي بالفعل' });
    }
    res.status(500).json({ error: 'فشل تسجيل العيد الرسمي' });
  }
});

// Update public holiday (HR can edit only if still PENDING)
app.put('/api/public-holidays/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { name, startDate, endDate } = req.body;
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ error: 'اسم العيد وتاريخ البداية والنهاية مطلوبان' });
    }

    if (startDate > endDate) {
      return res.status(400).json({ error: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية' });
    }

    const existing = await prisma.publicHoliday.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'العيد الرسمي غير موجود' });
    }

    if (existing.status !== 'PENDING') {
      return res.status(403).json({ error: 'لا يمكن تعديل العيد الرسمي بعد اعتماده من المدير' });
    }

    const academicYear = calculateAcademicYear(startDate);

    const updated = await prisma.publicHoliday.update({
      where: { id },
      data: {
        name,
        startDate,
        endDate,
        academicYear
      }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Update public holiday error:', error.message);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'هذا التاريخ مسجل كعيد رسمي لحدث آخر بالفعل' });
    }
    res.status(500).json({ error: 'فشل تعديل العيد الرسمي' });
  }
});

// Direct DELETE public holiday is disabled for security (use approve endpoint instead)
app.delete('/api/public-holidays/:id', async (req, res) => {
  res.status(403).json({ error: 'صلاحية الحذف المباشر محجوبة أمنياً. يجب استخدام لوحة اعتمادات المدير.' });
});

// Approve or reject/delete public holiday (Manager decision)
app.post('/api/public-holidays/approve', async (req, res) => {
  try {
    const { holidayId, decision } = req.body; // decision: APPROVED or DELETE
    if (!holidayId || !decision) {
      return res.status(400).json({ error: 'معرف العيد والقرار مطلوبان' });
    }

    const existing = await prisma.publicHoliday.findUnique({
      where: { id: holidayId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'العيد الرسمي غير موجود' });
    }

    if (decision === 'APPROVED') {
      const updated = await prisma.publicHoliday.update({
        where: { id: holidayId },
        data: { status: 'APPROVED' }
      });

      // Bulk update attendance records for this holiday date range
      const holidayDatesArray = getDatesInRange(existing.startDate, existing.endDate);
      
      await prisma.attendance.updateMany({
        where: {
          date: { in: holidayDatesArray }
        },
        data: {
          status: 'LEAVE',
          checkIn: null,
          checkOut: null,
          delayMinutes: 0,
          earlyDeparture: 0
        }
      });

      console.log(`✅ Public Holiday approved and attendance updated to LEAVE for dates ${existing.startDate} to ${existing.endDate}: ${existing.name}`);
      return res.json({ message: 'تم اعتماد العيد الرسمي وتحديث سجلات الحضور بنجاح', holiday: updated });
    } else if (decision === 'DELETE') {
      await prisma.publicHoliday.delete({
        where: { id: holidayId }
      });
      console.log(`❌ Public Holiday rejected and deleted: ${existing.name}`);
      return res.json({ message: 'تم رفض وحذف العيد الرسمي من النظام بنجاح' });
    } else {
      return res.status(400).json({ error: 'قرار غير صالح' });
    }
  } catch (error: any) {
    console.error('Approve public holiday error:', error.message);
    res.status(500).json({ error: 'فشل اتخاذ القرار بشأن العيد الرسمي: ' + error.message });
  }
});

// --- LEAVE & PERMISSION ENDPOINTS ---

// Helper function to get or create leave balance
// Helper function to calculate current academic year (e.g. "2025-2026")
function getAcademicYear() {
  const d = new Date();
  let yearStart = d.getFullYear();
  let yearEnd = yearStart + 1;
  if (d.getMonth() < 8 || (d.getMonth() === 8 && d.getDate() < 15)) {
    yearStart = d.getFullYear() - 1;
    yearEnd = d.getFullYear();
  }
  return `${yearStart}-${yearEnd}`;
}

// Helper function to recalculate employee leave balances dynamically
async function recalculateEmployeeBalances(employeeCode: number, academicYear: string) {
  // 1. Fetch employee allowed balances
  const employee = await prisma.employee.findUnique({
    where: { employeeCode }
  });
  if (!employee) return null;

  const allowedCasual = employee.totalAllowedCasual;
  const allowedRegular = employee.totalAllowedRegular;

  // 2. Fetch all APPROVED requests for this employee in this academic year
  const approvedRequests = await prisma.leavePermissionRequest.findMany({
    where: {
      employeeCode,
      status: { in: ['APPROVED_FREE', 'APPROVED_WITH_DEDUCTION', 'APPROVED'] },
      type: { in: ['CASUAL', 'ANNUAL'] }
    },
    orderBy: { date: 'asc' } // chronological order is important
  });

  let casualUsed = 0;
  let regularUsed = 0;

  for (const req of approvedRequests) {
    const duration = req.durationDays || 1;
    if (req.type === 'CASUAL') {
      if (casualUsed + duration <= allowedCasual) {
        casualUsed += duration;
      } else {
        const casualFit = Math.max(0, allowedCasual - casualUsed);
        casualUsed += casualFit;
        const excess = duration - casualFit;
        
        // Excess goes to regular
        if (regularUsed + excess <= allowedRegular) {
          regularUsed += excess;
        } else {
          const regularFit = Math.max(0, allowedRegular - regularUsed);
          regularUsed += regularFit;
        }
      }
    } else if (req.type === 'ANNUAL') {
      if (regularUsed + duration <= allowedRegular) {
        regularUsed += duration;
      } else {
        const regularFit = Math.max(0, allowedRegular - regularUsed);
        regularUsed += regularFit;
      }
    }
  }

  // 3. Upsert the leave_balances record
  const balance = await prisma.leaveBalance.upsert({
    where: {
      employeeCode_academicYear: {
        employeeCode,
        academicYear
      }
    },
    update: {
      totalCasualUsed: casualUsed,
      totalRegularUsed: regularUsed
    },
    create: {
      employeeCode,
      academicYear,
      totalCasualUsed: casualUsed,
      totalRegularUsed: regularUsed
    }
  });

  return balance;
}

// Helper function to get or create leave balance
async function getOrCreateLeaveBalance(employeeCode: number, academicYear: string) {
  let balance = await prisma.leaveBalance.findUnique({
    where: {
      employeeCode_academicYear: {
        employeeCode,
        academicYear
      }
    }
  });
  if (!balance) {
    balance = await prisma.leaveBalance.create({
      data: {
        employeeCode,
        academicYear,
        totalCasualUsed: 0,
        totalRegularUsed: 0
      }
    });
  }
  return balance;
}

// Get leave balance for employee
app.get('/api/leave-balances/:employeeCode/:academicYear', async (req, res) => {
  try {
    const employeeCode = parseInt(req.params.employeeCode);
    const academicYear = req.params.academicYear;
    if (isNaN(employeeCode)) {
      return res.status(400).json({ error: 'كود الموظف غير صحيح' });
    }

    // Dynamic Recalculation on access
    await recalculateEmployeeBalances(employeeCode, academicYear);

    const employee = await prisma.employee.findUnique({
      where: { employeeCode }
    });
    if (!employee) {
      return res.status(404).json({ error: 'الموظف غير موجود' });
    }

    const balance = await getOrCreateLeaveBalance(employeeCode, academicYear);

    // Compute remaining dynamically
    const casualRemaining = Math.max(0, employee.totalAllowedCasual - balance.totalCasualUsed);
    const annualRemaining = Math.max(0, employee.totalAllowedRegular - balance.totalRegularUsed);

    res.json({
      ...balance,
      casualRemaining,
      annualRemaining,
      totalAllowedCasual: employee.totalAllowedCasual,
      totalAllowedRegular: employee.totalAllowedRegular
    });
  } catch (error: any) {
    console.error('Get leave balance error:', error.message);
    res.status(500).json({ error: 'فشل جلب رصيد الإجازات' });
  }
});

// Get monthly permissions count for employee
app.get('/api/leaves/permissions-count/:employeeCode/:yearMonth', async (req, res) => {
  try {
    const employeeCode = parseInt(req.params.employeeCode);
    const { yearMonth } = req.params; // e.g. "2026-05"
    if (isNaN(employeeCode) || !yearMonth) {
      return res.status(400).json({ error: 'المدخلات غير صحيحة' });
    }

    const count = await prisma.leavePermissionRequest.count({
      where: {
        employeeCode,
        type: { in: ['AM_PERMISSION', 'PM_PERMISSION'] },
        date: { startsWith: yearMonth },
        status: { in: ['PENDING', 'APPROVED_FREE', 'APPROVED_WITH_DEDUCTION', 'APPROVED'] }
      }
    });

    res.json({ count });
  } catch (error: any) {
    console.error('Fetch permissions count error:', error.message);
    res.status(500).json({ error: 'فشل جلب عدد الأذونات' });
  }
});

// Get pending leave and permission requests (with employee name/balance context)
app.get('/api/leaves/pending', async (req, res) => {
  try {
    const requests = await prisma.leavePermissionRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        employee: {
          select: {
            fullName: true,
            employeeCode: true,
            department: true,
            totalAllowedCasual: true,
            totalAllowedRegular: true,
            leaveBalances: {
              take: 1,
              orderBy: { id: 'desc' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Dynamically calculate and inject casualRemaining and annualRemaining for manager approval UI
    const mappedRequests = requests.map(req => {
      const emp = req.employee;
      let casualRemaining = emp.totalAllowedCasual;
      let annualRemaining = emp.totalAllowedRegular;

      if (emp.leaveBalances && emp.leaveBalances.length > 0) {
        const lb = emp.leaveBalances[0];
        casualRemaining = Math.max(0, emp.totalAllowedCasual - lb.totalCasualUsed);
        annualRemaining = Math.max(0, emp.totalAllowedRegular - lb.totalRegularUsed);
      }

      return {
        ...req,
        employee: {
          ...emp,
          leaveBalances: [{
            ...emp.leaveBalances[0],
            casualRemaining,
            annualRemaining
          }]
        }
      };
    });

    res.json(mappedRequests);
  } catch (error: any) {
    console.error('Fetch pending leaves error:', error.message);
    res.status(500).json({ error: 'فشل جلب الطلبات المعلقة' });
  }
});

// Submit a new leave/permission request
app.post('/api/leaves/request', async (req, res) => {
  try {
    const { employeeCode, type, date, durationDays } = req.body;
    const empCode = parseInt(employeeCode);
    const duration = durationDays ? parseInt(durationDays) : 1;
    
    if (isNaN(empCode) || !type || !date) {
      return res.status(400).json({ error: 'جميع حقول الطلب (كود الموظف، النوع، التاريخ) مطلوبة' });
    }

    // 1. Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { employeeCode: empCode }
    });
    if (!employee) {
      return res.status(404).json({ error: 'الموظف غير موجود بالنظام' });
    }

    // 2. Check if a request already exists for this employee on this date (excluding REJECTED)
    const existingRequest = await prisma.leavePermissionRequest.findFirst({
      where: {
        employeeCode: empCode,
        date,
        status: { not: 'REJECTED' }
      }
    });
    if (existingRequest) {
      return res.status(409).json({ error: 'يوجد طلب إجازة/إذن مسجل بالفعل للموظف في هذا اليوم' });
    }

    // Academic year starts Sep 15 (15-9)
    const requestDate = new Date(date);
    let yearStart = requestDate.getFullYear();
    let yearEnd = yearStart + 1;
    if (requestDate.getMonth() < 8 || (requestDate.getMonth() === 8 && requestDate.getDate() < 15)) {
      yearStart = requestDate.getFullYear() - 1;
      yearEnd = requestDate.getFullYear();
    }
    const academicYear = `${yearStart}-${yearEnd}`;

    let deductedFrom = 'EXCEPTION';

    // 3. Process Permission Request Limit (AM_PERMISSION / PM_PERMISSION)
    if (type === 'AM_PERMISSION' || type === 'PM_PERMISSION') {
      const requestedYearMonth = date.substring(0, 7); // e.g. "2026-05"
      const monthlyPermissionsCount = await prisma.leavePermissionRequest.count({
        where: {
          employeeCode: empCode,
          type: { in: ['AM_PERMISSION', 'PM_PERMISSION'] },
          date: { startsWith: requestedYearMonth },
          status: { in: ['PENDING', 'APPROVED_FREE', 'APPROVED_WITH_DEDUCTION', 'APPROVED'] }
        }
      });

      if (monthlyPermissionsCount >= 2) {
        return res.status(400).json({ 
          error: `عفواً، تعديت الحد المسموح للأذونات هذا الشهر` 
        });
      }
    } else if (type === 'CASUAL' || type === 'ANNUAL') {
      deductedFrom = type;
    }

    // 4. Compute end date for multi-day leaves
    const computedEndDate = (type === 'CASUAL' || type === 'ANNUAL') && duration > 1
      ? getLeaveEndDateStr(date, duration)
      : date;

    // 5. Save Request
    const request = await prisma.leavePermissionRequest.create({
      data: {
        employeeCode: empCode,
        type,
        date,
        durationDays: duration,
        endDate: computedEndDate,
        status: 'PENDING',
        deductedFrom
      }
    });

    res.status(201).json(request);
  } catch (error: any) {
    console.error('Create request error:', error.message);
    res.status(500).json({ error: 'فشل تقديم طلب الإجازة/الإذن: ' + error.message });
  }
});

// Process Manager Approval / Rejection Decision
app.post('/api/leaves/approve', async (req, res) => {
  try {
    const { requestId, decision } = req.body;
    
    if (!requestId || !decision) {
      return res.status(400).json({ error: 'جميع حقول الاعتماد مطلوبة' });
    }

    // 1. Retrieve the Request
    const request = await prisma.leavePermissionRequest.findUnique({
      where: { id: requestId }
    });
    if (!request) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'تم اتخاذ قرار بالفعل بشأن هذا الطلب' });
    }

    // Academic Year
    const requestDate = new Date(request.date);
    let yearStart = requestDate.getFullYear();
    let yearEnd = yearStart + 1;
    if (requestDate.getMonth() < 8 || (requestDate.getMonth() === 8 && requestDate.getDate() < 15)) {
      yearStart = requestDate.getFullYear() - 1;
      yearEnd = requestDate.getFullYear();
    }
    const academicYear = `${yearStart}-${yearEnd}`;

    // 2. Process Attendance changes if APPROVED
    if (decision === 'APPROVED_FREE' || decision === 'APPROVED_WITH_DEDUCTION' || decision === 'APPROVED') {
      const employee = await prisma.employee.findUnique({
        where: { employeeCode: request.employeeCode }
      });
      if (!employee) {
        return res.status(404).json({ error: 'الموظف غير موجود' });
      }
      const shiftId = employee.shiftId || 1;

      if (request.type === 'CASUAL' || request.type === 'ANNUAL') {
        const currentBalances = await getOrCreateLeaveBalance(request.employeeCode, academicYear);
        let isExhausted = false;
        if (request.type === 'CASUAL') {
          const casualRemaining = Math.max(0, employee.totalAllowedCasual - currentBalances.totalCasualUsed);
          const annualRemaining = Math.max(0, employee.totalAllowedRegular - currentBalances.totalRegularUsed);
          isExhausted = casualRemaining === 0 && annualRemaining === 0;
        } else if (request.type === 'ANNUAL') {
          const annualRemaining = Math.max(0, employee.totalAllowedRegular - currentBalances.totalRegularUsed);
          isExhausted = annualRemaining === 0;
        }

        const attendanceStatus = decision === 'APPROVED_WITH_DEDUCTION' 
          ? 'غياب بدون راتب' 
          : decision === 'APPROVED_FREE'
            ? 'إجازة معفاة'
            : isExhausted ? 'غياب بدون راتب' : 'إجازة معفاة';

        // Upsert attendance for all days of the duration
        const startDate = new Date(request.date);
        for (let i = 0; i < (request.durationDays || 1); i++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(startDate.getDate() + i);
          const dateStr = currentDate.toISOString().split('T')[0];

          await prisma.attendance.upsert({
            where: {
              employeeCode_date: {
                employeeCode: request.employeeCode,
                date: dateStr
              }
            },
            update: {
              status: attendanceStatus,
              checkIn: null,
              checkOut: null,
              delayMinutes: 0,
              earlyDeparture: 0
            },
            create: {
              employeeCode: request.employeeCode,
              date: dateStr,
              status: attendanceStatus,
              shiftId,
              checkIn: null,
              checkOut: null,
              delayMinutes: 0,
              earlyDeparture: 0
            }
          });
        }
      } else if (request.type === 'AM_PERMISSION' || request.type === 'PM_PERMISSION') {
        const existingAttendance = await prisma.attendance.findUnique({
          where: {
            employeeCode_date: {
              employeeCode: request.employeeCode,
              date: request.date
            }
          }
        });

        if (existingAttendance) {
          let delayMinutes = existingAttendance.delayMinutes;
          let earlyDeparture = existingAttendance.earlyDeparture;
          let status = existingAttendance.status;

          if (request.type === 'AM_PERMISSION' && delayMinutes > 0) {
            delayMinutes = Math.max(0, delayMinutes - 120);
          } else if (request.type === 'PM_PERMISSION' && earlyDeparture > 0) {
            earlyDeparture = Math.max(0, earlyDeparture - 120);
          }

          // Recalculate status
          if (existingAttendance.checkIn && existingAttendance.checkOut) {
            if (delayMinutes > 0 && earlyDeparture > 0) {
              status = 'حضر متأخر وانصرف مبكراً';
            } else if (delayMinutes > 0) {
              status = 'late';
            } else if (earlyDeparture > 0) {
              status = 'EARLY_DEPARTURE';
            } else {
              status = 'present';
            }
          }

          // تأكد من فحص دقائق الخروج المبكر بعد احتساب وقت الانصراف الفعلي ومقارنته بالمناوبة
          if (earlyDeparture > 0 && status !== 'حضر متأخر وانصرف مبكراً') {
              status = 'EARLY_DEPARTURE';
          }

          await prisma.attendance.update({
            where: { id: existingAttendance.id },
            data: {
              delayMinutes,
              earlyDeparture,
              status
            }
          });
        }
      }
    }

    // 3. Update request status
    const updatedRequest = await prisma.leavePermissionRequest.update({
      where: { id: requestId },
      data: { status: decision }
    });

    // 4. Recalculate balances dynamically
    await recalculateEmployeeBalances(request.employeeCode, academicYear);

    res.json({ message: 'تم تحديث حالة الطلب والحضور بنجاح', request: updatedRequest });
  } catch (error: any) {
    console.error('Approve request error:', error.message);
    res.status(500).json({ error: 'فشل اعتماد الطلب: ' + error.message });
  }
});

// GET Requests History for an Employee
app.get('/api/leaves/history/:employeeCode', async (req, res) => {
  try {
    const employeeCode = parseInt(req.params.employeeCode);
    if (isNaN(employeeCode)) {
      return res.status(400).json({ error: 'كود الموظف غير صحيح' });
    }
    const requests = await prisma.leavePermissionRequest.findMany({
      where: { employeeCode },
      orderBy: { date: 'desc' }
    });
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: 'فشل جلب تاريخ الحركات: ' + error.message });
  }
});

// PATCH Edit Request (In-Place Correcting)
app.patch('/api/leaves/request/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, type, durationDays } = req.body;

    const originalRequest = await prisma.leavePermissionRequest.findUnique({
      where: { id }
    });
    if (!originalRequest) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    const requestDate = new Date(date || originalRequest.date);
    let yearStart = requestDate.getFullYear();
    let yearEnd = yearStart + 1;
    if (requestDate.getMonth() < 8 || (requestDate.getMonth() === 8 && requestDate.getDate() < 15)) {
      yearStart = requestDate.getFullYear() - 1;
      yearEnd = requestDate.getFullYear();
    }
    const academicYear = `${yearStart}-${yearEnd}`;

    // Compute new endDate
    const newDuration = durationDays !== undefined ? parseInt(durationDays) : (originalRequest.durationDays || 1);
    const newStartDate = date || originalRequest.date;
    const newType = type || originalRequest.type;
    const newEndDate = (newType === 'CASUAL' || newType === 'ANNUAL') && newDuration > 1
      ? getLeaveEndDateStr(newStartDate, newDuration)
      : newStartDate;

    // Update Request
    const updatedRequest = await prisma.leavePermissionRequest.update({
      where: { id },
      data: {
        date: date || undefined,
        type: type || undefined,
        durationDays: durationDays !== undefined ? parseInt(durationDays) : undefined,
        endDate: newEndDate
      }
    });

    // Revert/Update attendance if approved
    if (originalRequest.status === 'APPROVED_FREE' || originalRequest.status === 'APPROVED_WITH_DEDUCTION' || originalRequest.status === 'APPROVED') {
      const employee = await prisma.employee.findUnique({ where: { employeeCode: originalRequest.employeeCode } });
      const shiftId = employee?.shiftId || 1;

      // Revert old attendance dates (set to 'absent')
      const oldStartDate = new Date(originalRequest.date);
      for (let i = 0; i < (originalRequest.durationDays || 1); i++) {
        const currentDate = new Date(oldStartDate);
        currentDate.setDate(oldStartDate.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        await prisma.attendance.updateMany({
          where: {
            employeeCode: originalRequest.employeeCode,
            date: dateStr,
            status: { in: ['LEAVE', 'UNPAID_LEAVE', 'إجازة معفاة', 'غياب بدون راتب'] }
          },
          data: {
            status: 'absent'
          }
        });
      }

      // Apply new attendance dates
      if (updatedRequest.type === 'CASUAL' || updatedRequest.type === 'ANNUAL') {
        const attendanceStatus = updatedRequest.status === 'APPROVED_WITH_DEDUCTION' ? 'غياب بدون راتب' : 'إجازة معفاة';
        const newStartDate = new Date(updatedRequest.date);
        for (let i = 0; i < (updatedRequest.durationDays || 1); i++) {
          const currentDate = new Date(newStartDate);
          currentDate.setDate(newStartDate.getDate() + i);
          const dateStr = currentDate.toISOString().split('T')[0];

          await prisma.attendance.upsert({
            where: {
              employeeCode_date: {
                employeeCode: updatedRequest.employeeCode,
                date: dateStr
              }
            },
            update: {
              status: attendanceStatus,
              checkIn: null,
              checkOut: null
            },
            create: {
              employeeCode: updatedRequest.employeeCode,
              date: dateStr,
              status: attendanceStatus,
              shiftId,
              checkIn: null,
              checkOut: null
            }
          });
        }
      }
    }

    // Recalculate
    await recalculateEmployeeBalances(updatedRequest.employeeCode, academicYear);

    res.json(updatedRequest);
  } catch (error: any) {
    console.error('Edit request error:', error.message);
    res.status(500).json({ error: 'فشل تعديل الطلب: ' + error.message });
  }
});


app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server ready at: http://0.0.0.0:${PORT}`);
  console.log(`📡 [ZKTeco Config] IP: ${process.env.ZKTECO_IP || '192.168.1.201'}, PORT: ${process.env.ZKTECO_PORT || '4370'}`);
  console.log(`⚙️ [ZKTeco Mode] الاتصال الفعلي بالشبكة نشط (Strict Physical Connection Active). تم إزالة وضع المحاكاة نهائياً.`);
  
  // تصفية وتفريغ جدول الحضور من أي حركات وهمية سابقة، وتصفير فارق التوقيت
  (async () => {
    try {
      console.log('[Database] 🧹 جاري مسح سجلات الحضور الافتراضية العشوائية للبدء بصفحة نظيفة...');
      const result = await prisma.attendance.deleteMany({});
      console.log(`[Database] ✅ تم مسح ${result.count} سجل حضور وهمي بنجاح. جدول الحضور فارغ ونظيف الآن!`);
      
      console.log('[Database] ⏱️ جاري تصفير فارق الوقت لمنع تشويه حركات الحضور الحقيقية...');
      const settingsCount = await prisma.deviceSetting.count();
      if (settingsCount > 0) {
        await prisma.deviceSetting.updateMany({
          data: { timeOffsetMinutes: 0 }
        });
      } else {
        await prisma.deviceSetting.create({
          data: { timeOffsetMinutes: 0 }
        });
      }
      console.log('[Database] ✅ تم إعادة ضبط فارق الوقت بنجاح (0 دقيقة).');
    } catch (error: any) {
      console.error('[Database Error] ❌ فشل تفريغ جدول الحضور وإعادة ضبط الإعدادات:', error.message || error);
    }
  })();
});

