import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { zktecoService } from '../services/zkteco.service';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

const router = Router();

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

// Get device status
router.get('/attendance/device-status', async (req, res) => {
  try {
    const isConnected = await zktecoService.pingDevice();
    res.json({ connected: isConnected });
  } catch (error) {
    res.json({ connected: false });
  }
});

// Force manual reconnect
router.post('/attendance/device-reconnect', async (req, res) => {
  try {
    const isConnected = await zktecoService.pingDevice();
    res.json({ connected: isConnected });
  } catch (error) {
    res.json({ connected: false });
  }
});

// Reconcile Database with ZKTeco
router.get('/attendance/reconcile', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      select: { employeeCode: true, fullName: true, id: true, nationalId: true }
    });
    
    const machineUsers = await zktecoService.getAllUsers();
    const missing = employees.filter(emp => !machineUsers.includes(emp.employeeCode));
    
    res.json({ missing, machineUsersCount: machineUsers.length });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reconcile with device: ' + error.message });
  }
});

// Get next employee code directly from DB
router.get('/employees/next-code', async (req, res) => {
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

// Get single employee by ID
router.get('/employees/:id', async (req, res) => {
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
router.get('/employees', async (req, res) => {
  const { search, activeOnly } = req.query;
  try {
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

// Get next device ID from ZKTeco
router.get('/attendance/next-device-id', async (req, res) => {
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

function parseDeviceRecordTime(recordTime: any): Date | null {
  if (!recordTime) return null;
  
  if (recordTime instanceof Date) {
    return isNaN(recordTime.getTime()) ? null : recordTime;
  }
  
  const dateStr = String(recordTime);
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  const manualMatch = dateStr.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
  if (manualMatch) {
    const [, year, month, day, hour, minute, second] = manualMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
  }
  
  return null;
}

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
    return 0;
  }

  if (!logs || logs.length === 0) {
    console.log('[Sync] ⚠️ لا توجد سجلات بصمة في الجهاز. لا يتم تعديل سجلات الحضور.');
    return 0;
  }
  
  const settings = await prisma.deviceSetting.findFirst();
  const offset = settings?.timeOffsetMinutes || 0;
  
  const logMap: { [date: string]: { [empCode: number]: string[] } } = {};
  let parsedCount = 0;
  let parseFailCount = 0;
  
  for (const log of logs) {
    try {
      const userId = log.user_id || log.userId;
      const recordTime = log.record_time || log.recordTime;
      const employeeCode = parseInt(String(userId).trim(), 10);
      
      if (isNaN(employeeCode) || !recordTime) {
        parseFailCount++;
        continue;
      }
      
      const logDate = parseDeviceRecordTime(recordTime);
      if (!logDate) {
        parseFailCount++;
        continue;
      }
      
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
    }
  }
  
  const targetDates = getDatesInRange(startRange, endRange);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  const holidays = await prisma.publicHoliday.findMany({
    where: { status: 'APPROVED' }
  });

  const allEmployees = await prisma.employee.findMany({
    where: targetEmployeeCode !== undefined ? { employeeCode: targetEmployeeCode, active: true } : { active: true },
    include: { shift: true }
  });

  if (allEmployees.length === 0) {
    return 0;
  }
  
  const approvedLeaves = await prisma.leavePermissionRequest.findMany({
    where: {
      employeeCode: targetEmployeeCode !== undefined ? targetEmployeeCode : undefined,
      type: { in: ['CASUAL', 'ANNUAL'] },
      status: { in: ['APPROVED_FREE', 'APPROVED_WITH_DEDUCTION'] }
    }
  });

  const manualAttendances = await prisma.attendance.findMany({
    where: {
      date: { in: targetDates },
      isManual: true,
      ...(targetEmployeeCode !== undefined ? { employeeCode: targetEmployeeCode } : {})
    },
    select: { employeeCode: true, date: true }
  });

  let processedCount = 0;
  
  for (const dateStr of targetDates) {
    const dayOfWeek = dayNames[new Date(dateStr).getDay()];
    const dayLogs = logMap[dateStr] || {};
    
    for (const emp of allEmployees) {
      try {
        const empCode = emp.employeeCode;
        const isManuallyEdited = manualAttendances.some(ma => ma.employeeCode === empCode && ma.date === dateStr);
        if (isManuallyEdited) {
          continue;
        }

        const empLogs = dayLogs[empCode] || [];
      
        const isPublicHoliday = holidays.some(h => dateStr >= h.startDate && dateStr <= h.endDate);
        if (isPublicHoliday) {
          await prisma.attendance.upsert({
            where: { employeeCode_date: { employeeCode: empCode, date: dateStr } },
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

        const approvedLeave = approvedLeaves.find(leave => {
          if (leave.employeeCode !== empCode) return false;
          const startStr = leave.date;
          const endStr = getLeaveEndDateStr(startStr, leave.durationDays);
          return dateStr >= startStr && dateStr <= endStr;
        });

        if (approvedLeave) {
          const finalStatus = approvedLeave.status === 'APPROVED_FREE' ? 'إجازة معفاة' : 'غياب بدون راتب';
          await prisma.attendance.upsert({
            where: { employeeCode_date: { employeeCode: empCode, date: dateStr } },
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

        if (empLogs.length === 0) {
          if (emp.shift.weekends.includes(dayOfWeek)) {
            continue;
          }
          
          await prisma.attendance.upsert({
            where: { employeeCode_date: { employeeCode: empCode, date: dateStr } },
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
        
        const checkOutStartMin = parseTimeToMinutes(emp.shift.checkOutStart);
        let checkInPunches: string[] = [];
        let checkOutPunches: string[] = [];
        
        empLogs.sort();
        for (const timeStr of empLogs) {
          const punchMin = parseTimeToMinutes(timeStr);
          if (punchMin < checkOutStartMin) {
            checkInPunches.push(timeStr);
          } else {
            checkOutPunches.push(timeStr);
          }
        }
        
        if (checkInPunches.length === 0 && checkOutPunches.length > 1) {
          checkInPunches.push(checkOutPunches.shift() as string);
        }
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
        
        if (checkIn && !checkOut) {
          status = 'لم يبصم انصراف';
          const checkInMin = parseTimeToMinutes(checkIn);
          const gracePeriodInMin = emp.shift.gracePeriodIn;
          if (checkInMin > shiftStartMin + gracePeriodInMin) {
            delayMinutes = checkInMin - (shiftStartMin + gracePeriodInMin);
          }
        } 
        else if (!checkIn && checkOut) {
          status = 'لم يبصم حضور';
          const checkOutMin = parseTimeToMinutes(checkOut);
          const gracePeriodOutMin = emp.shift.gracePeriodOut;
          if (checkOutMin < shiftEndMin - gracePeriodOutMin) {
            earlyDeparture = (shiftEndMin - gracePeriodOutMin) - checkOutMin;
          }
        } 
        else if (checkIn && checkOut) {
          const checkInMin = parseTimeToMinutes(checkIn);
          const gracePeriodInMin = emp.shift.gracePeriodIn;
          
          if (checkInMin > shiftStartMin + gracePeriodInMin) {
            delayMinutes = checkInMin - (shiftStartMin + gracePeriodInMin);
            status = 'late';
          } else {
            status = 'present';
          }
          
          const checkOutMin = parseTimeToMinutes(checkOut);
          const gracePeriodOutMin = emp.shift.gracePeriodOut;
          
          if (checkOutMin < shiftEndMin - gracePeriodOutMin) {
            earlyDeparture = (shiftEndMin - gracePeriodOutMin) - checkOutMin;
          }
        } else {
          if (emp.shift.weekends.includes(dayOfWeek)) continue;
          status = 'absent';
        }
        
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

        if (approvedAmPermission && delayMinutes > 0) {
          delayMinutes = Math.max(0, delayMinutes - 120);
          if (delayMinutes === 0 && status === 'late') {
            status = 'present';
          }
        }

        if (approvedPmPermission && earlyDeparture > 0) {
          earlyDeparture = Math.max(0, earlyDeparture - 120);
        }

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

        if (earlyDeparture > 0 && status !== 'حضر متأخر وانصرف مبكراً') {
            status = 'EARLY_DEPARTURE';
        }

        await prisma.attendance.upsert({
          where: { employeeCode_date: { employeeCode: empCode, date: dateStr } },
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
        continue;
      }
    }
  }
  
  return processedCount;
}

// Sync attendance logs from ZKTeco
router.post('/attendance/sync', async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const startRange = fromDate || todayStr;
    const endRange = toDate || todayStr;
    
    const processedCount = await syncAttendanceInternal(startRange, endRange);
    res.json({ message: 'تمت المزامنة بنجاح', count: processedCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get device time offset settings
router.get('/device-settings', async (req, res) => {
  try {
    const settings = await prisma.deviceSetting.findFirst();
    res.json({ timeOffsetMinutes: settings?.timeOffsetMinutes || 0 });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch device settings' });
  }
});

// Update device settings and apply retroactive calculation for targetDate
router.post('/device-settings', async (req, res) => {
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
    
    let recalculatedCount = 0;
    if (targetDate) {
      const targetEmpCode = employeeCode === 'all' || !employeeCode ? undefined : parseInt(employeeCode);
      recalculatedCount = await syncAttendanceInternal(targetDate, targetDate, targetEmpCode);
    }
    
    res.json({ 
      message: 'تم حفظ فارق التوقيت وتحديث الحضور بنجاح', 
      timeOffsetMinutes: settings.timeOffsetMinutes,
      recalculatedCount
    });
  } catch (error: any) {
    res.status(500).json({ error: 'فشل حفظ إعدادات فارق التوقيت وتحديث الحركات: ' + error.message });
  }
});

// Get attendance logs from database
router.get('/attendance', async (req, res) => {
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
    res.status(500).json({ error: 'Failed to fetch attendance: ' + error.message });
  }
});

// Manual attendance correction by manager
router.patch('/attendance/manual-update', async (req, res) => {
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

    const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
    const validCheckIn  = checkIn  && timeRegex.test(checkIn)  ? checkIn  : null;
    const validCheckOut = checkOut && timeRegex.test(checkOut) ? checkOut : null;

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

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'فشل التحديث اليدوي: ' + error.message });
  }
});

// Get employee profile
router.get('/employees/profile/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: {
        busRoute: true,
        deductions: true,
        attendance: {
          orderBy: { date: 'desc' },
          take: 50
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
    res.status(500).json({ error: 'Failed to fetch employee profile' });
  }
});

// Create employee
router.post('/employees', upload.fields([{ name: 'personal_photo', maxCount: 1 }, { name: 'contract_pdf', maxCount: 1 }]), async (req, res) => {
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

    const employee = await prisma.employee.create({ data });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        employeeId: employee.id,
        userId: 'HR_USER',
        userName: auditUser || 'Unknown',
        action: 'INSERT',
        entityType: 'Employee',
        entityId: String(employee.id),
        after: employee as any
      }
    });

    res.status(201).json(employee);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'هذا الموظف مسجل من قبل بهذا الرقم القومي أو الكود' });
    }
    res.status(500).json({ error: 'حدث خطأ داخلي أثناء حفظ بيانات الموظف: ' + error.message });
  }
});

// Helper function to get academic year
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
  const employee = await prisma.employee.findUnique({
    where: { employeeCode }
  });
  if (!employee) return null;

  const allowedCasual = employee.totalAllowedCasual;
  const allowedRegular = employee.totalAllowedRegular;

  const approvedRequests = await prisma.leavePermissionRequest.findMany({
    where: {
      employeeCode,
      status: { in: ['APPROVED_FREE', 'APPROVED_WITH_DEDUCTION', 'APPROVED'] },
      type: { in: ['CASUAL', 'ANNUAL'] }
    },
    orderBy: { date: 'asc' }
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

// Admin Allowed Balances Update (Individual/Bulk)
router.patch('/employees/balances', async (req, res) => {
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
      await prisma.employee.updateMany({
        data: {
          totalAllowedCasual: casual,
          totalAllowedRegular: regular
        }
      });

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

      await recalculateEmployeeBalances(empCode, activeAcademicYear);
      return res.json({ message: 'تم تحديث الأرصدة السنوية للموظف بنجاح' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'فشل تحديث الأرصدة السنوية: ' + error.message });
  }
});

// Update employee
router.patch('/employees/:id', upload.fields([{ name: 'personal_photo', maxCount: 1 }, { name: 'contract_pdf', maxCount: 1 }]), async (req, res) => {
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

    if (otherData.status === 'INACTIVE') {
      isActive = false;
      otherData.isBusSubscribed = false;
      await prisma.deduction.updateMany({
        where: { employeeCode: existingEmployee.employeeCode, isRecurring: true },
        data: { status: 'INACTIVE' }
      });
    } else if (otherData.status === 'ACTIVE') {
      isActive = true;
    }
    
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

    if (otherData.isBusSubscribed !== undefined || otherData.busRouteId || otherData.busSubscriptionType) {
      if (employee.isBusSubscribed && employee.busRouteId) {
        const busRoute = await prisma.busRoute.findUnique({ where: { id: employee.busRouteId } });
        if (busRoute) {
          const amount = employee.busSubscriptionType === 'SUPERVISOR' ? 0 : Number(busRoute.monthlyFee) * 0.5;
          
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
        await prisma.deduction.updateMany({
          where: { employeeCode: employee.employeeCode, type: 'BUS_SUBSCRIPTION', isRecurring: true },
          data: { status: 'INACTIVE' }
        });
      }
    }

    let parsedOldData = oldData;
    if (typeof oldData === 'string') {
      try { parsedOldData = JSON.parse(oldData); } catch(e) {}
    }
    
    await prisma.auditLog.create({
      data: {
        employeeId: empId,
        userId: 'HR_USER',
        userName: auditUser || 'Unknown',
        action: 'UPDATE',
        entityType: 'Employee',
        entityId: String(empId),
        before: parsedOldData as any,
        after: employee as any
      }
    });

    res.json(employee);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'NATIONAL_ID_EXISTS' });
    }
    res.status(400).json({ error: 'Failed to update employee' });
  }
});

// Delete employee
router.delete('/employees/:id', async (req, res) => {
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
router.get('/shifts', async (req, res) => {
  try {
    const shifts = await prisma.shift.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(shifts);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch shifts: ' + error.message });
  }
});

// Create shift
router.post('/shifts', async (req, res) => {
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
    res.status(201).json(shift);
  } catch (error: any) {
    res.status(500).json({ error: 'فشل إضافة المناوبة: ' + error.message });
  }
});

// Update shift
router.patch('/shifts/:id', async (req, res) => {
  const { id } = req.params;
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
    res.json(shift);
  } catch (error: any) {
    res.status(400).json({ error: 'فشل تحديث المناوبة: ' + error.message });
  }
});

// Delete shift
router.delete('/shifts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.shift.delete({ where: { id: parseInt(id) } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete shift' });
  }
});

// --- PUBLIC HOLIDAYS ENDPOINTS ---
router.get('/public-holidays', async (req, res) => {
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
    res.status(500).json({ error: 'فشل جلب الأعياد الرسمية' });
  }
});

router.post('/public-holidays', async (req, res) => {
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
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'هذا التاريخ مسجل كعيد رسمي بالفعل' });
    }
    res.status(500).json({ error: 'فشل تسجيل العيد الرسمي' });
  }
});

router.put('/public-holidays/:id', async (req, res) => {
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
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'هذا التاريخ مسجل كعيد رسمي لحدث آخر بالفعل' });
    }
    res.status(500).json({ error: 'فشل تعديل العيد الرسمي' });
  }
});

router.delete('/public-holidays/:id', async (req, res) => {
  res.status(403).json({ error: 'صلاحية الحذف المباشر محجوبة أمنياً. يجب استخدام لوحة اعتمادات المدير.' });
});

router.post('/public-holidays/approve', async (req, res) => {
  try {
    const { holidayId, decision } = req.body;
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

      return res.json({ message: 'تم اعتماد العيد الرسمي وتحديث سجلات الحضور بنجاح', holiday: updated });
    } else if (decision === 'DELETE') {
      await prisma.publicHoliday.delete({
        where: { id: holidayId }
      });
      return res.json({ message: 'تم رفض وحذف العيد الرسمي من النظام بنجاح' });
    } else {
      return res.status(400).json({ error: 'قرار غير صالح' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'فشل اتخاذ القرار بشأن العيد الرسمي: ' + error.message });
  }
});

// Get leave balance for employee
router.get('/leave-balances/:employeeCode/:academicYear', async (req, res) => {
  try {
    const employeeCode = parseInt(req.params.employeeCode);
    const academicYear = req.params.academicYear;
    if (isNaN(employeeCode)) {
      return res.status(400).json({ error: 'كود الموظف غير صحيح' });
    }

    await recalculateEmployeeBalances(employeeCode, academicYear);

    const employee = await prisma.employee.findUnique({
      where: { employeeCode }
    });
    if (!employee) {
      return res.status(404).json({ error: 'الموظف غير موجود' });
    }

    const balance = await getOrCreateLeaveBalance(employeeCode, academicYear);
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
    res.status(500).json({ error: 'فشل جلب رصيد الإجازات' });
  }
});

// Get monthly permissions count for employee
router.get('/leaves/permissions-count/:employeeCode/:yearMonth', async (req, res) => {
  try {
    const employeeCode = parseInt(req.params.employeeCode);
    const { yearMonth } = req.params;
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
    res.status(500).json({ error: 'فشل جلب عدد الأذونات' });
  }
});

// Get pending leave and permission requests
router.get('/leaves/pending', async (req, res) => {
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
    res.status(500).json({ error: 'فشل جلب الطلبات المعلقة' });
  }
});

// Submit a new leave/permission request
router.post('/leaves/request', async (req, res) => {
  try {
    const { employeeCode, type, date, durationDays } = req.body;
    const empCode = parseInt(employeeCode);
    const duration = durationDays ? parseInt(durationDays) : 1;
    
    if (isNaN(empCode) || !type || !date) {
      return res.status(400).json({ error: 'جميع حقول الطلب (كود الموظف، النوع، التاريخ) مطلوبة' });
    }

    const employee = await prisma.employee.findUnique({
      where: { employeeCode: empCode }
    });
    if (!employee) {
      return res.status(404).json({ error: 'الموظف غير موجود بالنظام' });
    }

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

    const requestDate = new Date(date);
    let yearStart = requestDate.getFullYear();
    let yearEnd = yearStart + 1;
    if (requestDate.getMonth() < 8 || (requestDate.getMonth() === 8 && requestDate.getDate() < 15)) {
      yearStart = requestDate.getFullYear() - 1;
      yearEnd = requestDate.getFullYear();
    }
    const academicYear = `${yearStart}-${yearEnd}`;
    let deductedFrom = 'EXCEPTION';

    if (type === 'AM_PERMISSION' || type === 'PM_PERMISSION') {
      const requestedYearMonth = date.substring(0, 7);
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

    const computedEndDate = (type === 'CASUAL' || type === 'ANNUAL') && duration > 1
      ? getLeaveEndDateStr(date, duration)
      : date;

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
    res.status(500).json({ error: 'فشل تقديم طلب الإجازة/الإذن: ' + error.message });
  }
});

// Process Manager Approval / Rejection Decision
router.post('/leaves/approve', async (req, res) => {
  try {
    const { requestId, decision } = req.body;
    
    if (!requestId || !decision) {
      return res.status(400).json({ error: 'جميع حقول الاعتماد مطلوبة' });
    }

    const request = await prisma.leavePermissionRequest.findUnique({
      where: { id: requestId }
    });
    if (!request) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'تم اتخاذ قرار بالفعل بشأن هذا الطلب' });
    }

    const requestDate = new Date(request.date);
    let yearStart = requestDate.getFullYear();
    let yearEnd = yearStart + 1;
    if (requestDate.getMonth() < 8 || (requestDate.getMonth() === 8 && requestDate.getDate() < 15)) {
      yearStart = requestDate.getFullYear() - 1;
      yearEnd = requestDate.getFullYear();
    }
    const academicYear = `${yearStart}-${yearEnd}`;

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

    const updatedRequest = await prisma.leavePermissionRequest.update({
      where: { id: requestId },
      data: { status: decision }
    });

    await recalculateEmployeeBalances(request.employeeCode, academicYear);
    res.json({ message: 'تم تحديث حالة الطلب والحضور بنجاح', request: updatedRequest });
  } catch (error: any) {
    res.status(500).json({ error: 'فشل اعتماد الطلب: ' + error.message });
  }
});

// GET Requests History for an Employee
router.get('/leaves/history/:employeeCode', async (req, res) => {
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
router.patch('/leaves/request/:id', async (req, res) => {
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

    const newDuration = durationDays !== undefined ? parseInt(durationDays) : (originalRequest.durationDays || 1);
    const newStartDate = date || originalRequest.date;
    const newType = type || originalRequest.type;
    const newEndDate = (newType === 'CASUAL' || newType === 'ANNUAL') && newDuration > 1
      ? getLeaveEndDateStr(newStartDate, newDuration)
      : newStartDate;

    const updatedRequest = await prisma.leavePermissionRequest.update({
      where: { id },
      data: {
        date: date || undefined,
        type: type || undefined,
        durationDays: durationDays !== undefined ? parseInt(durationDays) : undefined,
        endDate: newEndDate
      }
    });

    if (originalRequest.status === 'APPROVED_FREE' || originalRequest.status === 'APPROVED_WITH_DEDUCTION' || originalRequest.status === 'APPROVED') {
      const employee = await prisma.employee.findUnique({ where: { employeeCode: originalRequest.employeeCode } });
      const shiftId = employee?.shiftId || 1;

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

    await recalculateEmployeeBalances(updatedRequest.employeeCode, academicYear);
    res.json(updatedRequest);
  } catch (error: any) {
    res.status(500).json({ error: 'فشل تعديل الطلب: ' + error.message });
  }
});

export default router;
