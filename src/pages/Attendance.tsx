import React, { useState, useEffect } from 'react';
import { 
  Fingerprint, 
  RefreshCw, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Search,
  CalendarDays,
  ShieldCheck,
  Timer,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Plus,
  BadgeCheck,
  CalendarRange,
  Pencil,
  X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

const API_BASE = "http://localhost:4000/api";

const PendingRequestCard = ({ req, isApproving, onApprove }: { req: any, isApproving: string | null, onApprove: (id: string, decision: string, days?: number, type?: string) => void }) => {
  const [approvalDays, setApprovalDays] = useState(req.durationDays || 1);
  const balance = req.employee?.leaveBalances?.[0] || { casualRemaining: 0, annualRemaining: 0 };
  
  const hasAnnual = balance.annualRemaining > 0;
  const hasCasual = balance.casualRemaining > 0;
  const isDepleted = !hasAnnual && !hasCasual;

  const typeTranslations: Record<string, string> = {
    'CASUAL': 'إجازة عارضة',
    'ANNUAL': 'إجازة اعتيادية',
    'AM_PERMISSION': 'إذن صباحي (ساعتان)',
    'PM_PERMISSION': 'إذن مسائي (ساعتان)',
  };

  return (
    <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-[15px] hover:border-royal-blue/30 transition-all flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold text-sm text-gray-800">{req.employee?.fullName}</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">القسم: {req.employee?.department || 'غير محدد'}</p>
          </div>
          <span className="bg-royal-blue/10 text-royal-blue text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <BadgeCheck className="h-3 w-3" />
            بانتظار الاعتماد
          </span>
        </div>

        <div className="flex flex-wrap gap-2 text-xs pt-1.5 border-t border-dashed border-slate-200">
          <div>الطلب: <span className="font-bold text-royal-blue">{typeTranslations[req.type] || req.type}</span></div>
          <div>من: <span className="font-bold text-slate-600">{req.date.replace(/-/g, '/')}</span></div>
          {(req.type === 'CASUAL' || req.type === 'ANNUAL') && req.endDate && req.endDate !== req.date && (
            <div className="flex items-center gap-1">
              <CalendarRange className="h-3 w-3 text-royal-blue" />
              <span>إلى:</span>
              <span className="font-bold text-emerald-700">{req.endDate.replace(/-/g, '/')}</span>
            </div>
          )}
        </div>

        {(req.type === 'CASUAL' || req.type === 'ANNUAL') && (
          <>
            <div className="bg-slate-100 p-2.5 rounded-[10px] text-[10px] space-y-1 text-slate-600 border border-slate-200">
              <div className="font-bold text-royal-blue/90">رصيد الإجازات المتبقي للسنة:</div>
              <div className="flex justify-between font-medium">
                <span>عارضة متبقي: <strong className="text-gray-800">{balance.casualRemaining}</strong></span>
                <span>اعتيادي متبقي: <strong className="text-gray-800">{balance.annualRemaining}</strong></span>
              </div>
            </div>

            <div className="bg-royal-blue/5 rounded-[15px] border border-royal-blue/15 p-3 mt-2">
              <p className="text-[11px] font-bold text-royal-blue mb-2 text-center">تعديل عدد أيام الموافقة (المرسل: {req.durationDays || 1})</p>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setApprovalDays((d: number) => Math.max(1, d - 1))}
                  className="w-7 h-7 rounded-full bg-white border-2 border-royal-blue/20 text-royal-blue hover:bg-royal-blue hover:text-white transition-all flex items-center justify-center"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <div className="text-center w-12">
                  <div className="text-lg font-extrabold text-royal-blue leading-none">{approvalDays}</div>
                  {approvalDays !== (req.durationDays || 1) && (
                    <div className="text-[9px] text-amber-600 font-bold mt-1">تغيير ⚠️</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setApprovalDays((d: number) => d + 1)}
                  className="w-7 h-7 rounded-full bg-white border-2 border-royal-blue/20 text-royal-blue hover:bg-royal-blue hover:text-white transition-all flex items-center justify-center"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {isDepleted && (req.type === 'CASUAL' || req.type === 'ANNUAL') && (
        <div className="text-[10px] bg-red-50 text-red-700 font-bold mt-3 p-2.5 rounded-[10px] border border-red-200 text-center">
          ⚠️ الموظف ليس لديه اجازات بحيث تتم الموافقة من الادارة بعدم الخصم او يتم الرفض
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 mt-4 pt-3 border-t border-slate-100">
        <Button
          size="sm"
          disabled={isApproving === req.id}
          onClick={() => onApprove(req.id, 'APPROVED_FREE', approvalDays, req.type)}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-[10px] text-xs font-bold h-9 flex items-center gap-2"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          موافقة بدون خصم من الراتب
        </Button>
        <Button
          size="sm"
          disabled={isApproving === req.id || hasAnnual}
          onClick={() => onApprove(req.id, 'APPROVED_WITH_DEDUCTION', approvalDays, req.type)}
          className={`w-full rounded-[10px] text-xs font-bold h-9 flex items-center gap-2 ${
            hasAnnual 
              ? 'bg-slate-200 text-slate-400 opacity-50 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          موافقة مع خصم من الراتب
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={isApproving === req.id}
          onClick={() => onApprove(req.id, 'REJECTED', approvalDays, req.type)}
          className="w-full rounded-[10px] text-xs font-bold h-9 flex items-center gap-2"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          رفض الطلب
        </Button>
      </div>
    </div>
  );
};

export default function Attendance() {
  const { user } = useAuthStore();
  const isManager = user?.role === 'system_admin' || user?.role === 'school_director';

  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Default dates to today's date in YYYY-MM-DD
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);

  // Table header filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");

  // Device status states
  const [deviceConnected, setDeviceConnected] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [missingEmployees, setMissingEmployees] = useState<any[]>([]);
  const [isReconciling, setIsReconciling] = useState(false);

  const fetchReconciliation = () => {
    setIsReconciling(true);
    fetch(`${API_BASE}/attendance/reconcile`)
      .then(res => res.json())
      .then(data => {
        if (data.missing) {
          setMissingEmployees(data.missing);
        }
      })
      .catch(err => console.error("Reconciliation error", err))
      .finally(() => setIsReconciling(false));
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/attendance`);
      const data = await res.json();
      setLogs(data);
    } catch (error) {
      toast.error("فشل جلب سجلات الحضور", {
        className: "font-cairo rounded-[15px] border-red-200 bg-red-50 text-red-900"
      });
    } finally {
      setIsLoading(false);
    }
  };


  const [pendingHolidays, setPendingHolidays] = useState<any[]>([]);
  const [isProcessingHoliday, setIsProcessingHoliday] = useState<string | null>(null);

  const fetchPendingHolidays = async () => {
    try {
      const res = await fetch(`${API_BASE}/public-holidays`);
      if (res.ok) {
        const data = await res.json();
        const pending = data.filter((h: any) => h.status === 'PENDING');
        setPendingHolidays(pending);
      }
    } catch (err) {
      console.error("Error fetching pending holidays", err);
    }
  };

  const handleHolidayDecision = async (holidayId: string, decision: 'APPROVED' | 'DELETE') => {
    setIsProcessingHoliday(holidayId);
    try {
      const res = await fetch(`${API_BASE}/public-holidays/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holidayId, decision })
      });

      if (res.ok) {
        toast.success(decision === 'APPROVED' ? "تم اعتماد العيد الرسمي بنجاح" : "تم رفض وحذف العيد الرسمي بنجاح", {
          className: "font-cairo rounded-[15px] border-green-200 bg-green-50 text-green-900"
        });
        fetchPendingHolidays();
        fetchLogs();
      } else {
        const data = await res.json();
        throw new Error(data.error || "فشل معالجة القرار");
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء معالجة القرار", {
        className: "font-cairo rounded-[15px] border-red-200 bg-red-50 text-red-900"
      });
    } finally {
      setIsProcessingHoliday(null);
    }
  };

  // ─── Manual Edit Modal State ────────────────────────────────────────────
  const [editingLog, setEditingLog] = useState<any | null>(null);
  const [manualCheckIn, setManualCheckIn] = useState("");
  const [manualCheckOut, setManualCheckOut] = useState("");
  const [isSavingManual, setIsSavingManual] = useState(false);

  const handleManualSave = async () => {
    if (!editingLog) return;
    setIsSavingManual(true);
    try {
      const res = await fetch(`${API_BASE}/attendance/manual-update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeCode: editingLog.employeeCode,
          date: editingLog.date,
          checkIn:  manualCheckIn  || null,
          checkOut: manualCheckOut || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التحديث');

      // Real-time state sync — replace the row in-place without full reload
      setLogs(prev =>
        prev.map(l =>
          l.employeeCode === data.employeeCode && l.date === data.date ? data : l
        )
      );
      toast.success(`✅ تم تحديث حضور ${data.employee?.fullName} بتاريخ ${data.date} بنجاح`, {
        className: 'font-cairo rounded-[15px] border-green-200 bg-green-50 text-green-900'
      });
      setEditingLog(null);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الحفظ', {
        className: 'font-cairo rounded-[15px] border-red-200 bg-red-50 text-red-900'
      });
    } finally {
      setIsSavingManual(false);
    }
  };

  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isApproving, setIsApproving] = useState<string | null>(null);

  const fetchPendingRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/leaves/pending`);
      if (res.ok) {
        const data = await res.json();
        setPendingRequests(data);
      }
    } catch (err) {
      console.error("Error fetching pending leaves", err);
    }
  };

  const handleDecision = async (requestId: string, decision: string, durationDays?: number, type?: string) => {
    setIsApproving(requestId);
    try {
      if ((type === 'CASUAL' || type === 'ANNUAL') && durationDays !== undefined) {
        const req = pendingRequests.find(r => r.id === requestId);
        if (req && durationDays !== (req.durationDays || 1)) {
          const patchRes = await fetch(`${API_BASE}/leaves/request/${requestId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ durationDays })
          });
          if (!patchRes.ok) throw new Error('فشل تحديث عدد الأيام');
        }
      }

      const res = await fetch(`${API_BASE}/leaves/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, decision })
      });
      
      if (res.ok) {
        toast.success("تم تسجيل القرار وتحديث الحضور بنجاح", {
          className: "font-cairo rounded-[15px] border-green-200 bg-green-50 text-green-900"
        });
        fetchPendingRequests();
        fetchLogs();
      } else {
        const data = await res.json();
        throw new Error(data.error || "فشل معالجة الطلب");
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء معالجة القرار", {
        className: "font-cairo rounded-[15px] border-red-200 bg-red-50 text-red-900"
      });
    } finally {
      setIsApproving(null);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/attendance/sync`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromDate, toDate })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`تمت المزامنة بنجاح: تم تحديث ومعالجة ${data.count} سجلات حضور للتواريخ المحددة`, {
          className: "font-cairo rounded-[15px] border-green-200 bg-green-50 text-green-900"
        });
        fetchLogs();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || "فشل الاتصال بجهاز البصمة", {
        className: "font-cairo rounded-[15px] border-red-200 bg-red-50 text-red-900"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualReconnect = async () => {
    setIsReconnecting(true);
    try {
      const response = await fetch(`${API_BASE}/attendance/device-reconnect`, { method: 'POST' });
      const data = await response.json();
      setDeviceConnected(data.connected);
      if (data.connected) {
        toast.success("تم الاتصال بالماكينة بنجاح", {
          className: "font-cairo rounded-[15px] border-green-200 bg-green-50 text-green-900"
        });
      } else {
        toast.error("فشل الاتصال بالماكينة، تأكد من التوصيلات", {
          className: "font-cairo rounded-[15px] border-red-200 bg-red-50 text-red-900"
        });
      }
    } catch (err) {
      toast.error("اتصال ضعيف .. انتظر قليلا", {
        className: "font-cairo rounded-[15px] border-red-200 bg-red-50 text-red-900"
      });
    } finally {
      setIsReconnecting(false);
    }
  };

  // Poll machine status
  useEffect(() => {
    fetchLogs();
    fetchPendingRequests();
    fetchPendingHolidays();
    fetchReconciliation();
    
    const checkStatus = () => {
      fetch(`${API_BASE}/attendance/device-status`)
        .then(res => res.json())
        .then(data => setDeviceConnected(data.connected))
        .catch(() => setDeviceConnected(false));
    };
    checkStatus();
    
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load pending requests on date changes
  useEffect(() => {
    fetchPendingRequests();
    fetchPendingHolidays();
  }, [fromDate, toDate]);

  // Unique shift names and departments for filters
  const uniqueShifts = Array.from(new Set(logs.map(l => l.shift?.shiftName).filter(Boolean)));
  const uniqueDepts = Array.from(new Set(logs.map(l => l.employee?.department).filter(Boolean)));

  // Filter logs locally based on search + table header selectors + date range
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.employee?.fullName || "").includes(searchTerm) || 
      (log.employee?.employeeCode || "").toString().includes(searchTerm);
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    const matchesShift = shiftFilter === "all" || log.shift?.shiftName === shiftFilter;
    const matchesDept = deptFilter === "all" || log.employee?.department === deptFilter;
    const matchesDate = (!fromDate || log.date >= fromDate) && (!toDate || log.date <= toDate);
    return matchesSearch && matchesStatus && matchesShift && matchesDept && matchesDate;
  });

  // Statistics calculations based on the selected date range
  const isTodayOnly = fromDate === todayStr && toDate === todayStr;
  const statsPeriodText = isTodayOnly ? "اليوم" : "في الفترة";

  const periodLogs = logs.filter(l => (!fromDate || l.date >= fromDate) && (!toDate || l.date <= toDate));
  const periodLogsCount = periodLogs.length;
  const latePeriodCount = periodLogs.filter(l => l.delayMinutes > 0).length;
  const earlyDeparturePeriodCount = periodLogs.filter(l => l.earlyDeparture > 0).length;

  return (
    <div className="container mx-auto py-8 px-4 font-cairo" dir="rtl">
      <div className="flex flex-col gap-6">


        {/* Header */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-6 rounded-[15px] shadow-sm border border-royal-blue/10">
          <div className="space-y-1 flex items-center gap-4">
            <div className="bg-royal-blue/10 p-3 rounded-[15px] shrink-0">
              <Fingerprint className="h-8 w-8 text-royal-blue" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-royal-blue flex items-center gap-2">
                لوحة مراقبة الحضور والإنصراف المتقدمة
              </h1>
              <p className="text-muted-foreground text-sm">متابعة سجلات البصمة، التأخير، الانصراف المبكر، وساعات العمل الفردية</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            {/* Date range picker */}
            <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-[15px] border border-royal-blue/10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-royal-blue">من:</span>
                <div className="relative">
                  <Calendar className="absolute right-3 top-2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date"
                    value={fromDate}
                    max={todayStr}
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      if (selectedDate > todayStr) {
                        toast.error("لا يمكن اختيار تاريخ بعد تاريخ اليوم", {
                          className: "font-cairo rounded-[15px] border-red-200 bg-red-50 text-red-900"
                        });
                        setFromDate(todayStr);
                      } else {
                        setFromDate(selectedDate);
                      }
                    }}
                    className="pr-9 rounded-[15px] border-royal-blue/20 focus:border-royal-blue text-xs h-8 w-36 font-bold cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-royal-blue">إلى:</span>
                <div className="relative">
                  <Calendar className="absolute right-3 top-2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date"
                    value={toDate}
                    max={todayStr}
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      if (selectedDate > todayStr) {
                        toast.error("لا يمكن اختيار تاريخ بعد تاريخ اليوم", {
                          className: "font-cairo rounded-[15px] border-red-200 bg-red-50 text-red-900"
                        });
                        setToDate(todayStr);
                      } else {
                        setToDate(selectedDate);
                      }
                    }}
                    className="pr-9 rounded-[15px] border-royal-blue/20 focus:border-royal-blue text-xs h-8 w-36 font-bold cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="relative flex-1 md:w-64">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="بحث باسم الموظف أو الكود..." 
                className="pr-10 rounded-[15px] border-royal-blue/20 focus:border-royal-blue font-bold text-sm h-11"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleSync} 
              disabled={isSyncing}
              className="bg-royal-blue hover:bg-royal-blue/90 text-white rounded-[15px] px-6 h-11 flex items-center gap-2 shadow-lg shadow-royal-blue/20 font-bold"
            >
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
              {isSyncing ? "جاري المزامنة المعقدة..." : "مزامنة الحركات الآن"}
            </Button>
          </div>
        </div>

        {/* Reconciliation Alert / Loading State */}
        {isReconciling ? (
          <div className="bg-yellow-50/50 border border-yellow-200/50 p-4 rounded-[15px] shadow-sm flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-yellow-600 animate-spin" />
            <span className="text-yellow-800 font-bold text-sm">جاري مراجعة ومطابقة البصمات مع الماكينة، يرجى الانتظار...</span>
          </div>
        ) : missingEmployees.length > 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-[15px] shadow-sm flex flex-col gap-3 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-2 text-yellow-800 font-bold">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
              <h3 className="text-lg">تنبيهات البصمة غير المسجلة</h3>
            </div>
            <div className="flex flex-col gap-2">
              {missingEmployees.map(emp => (
                <div key={emp.id} className="text-yellow-900 bg-yellow-100/50 p-3 rounded-[15px] text-sm flex items-center justify-between">
                  <span>
                    ⚠️ <strong>تنبيه:</strong> الموظف <strong>{emp.fullName}</strong> مسجل بكود <strong>({emp.employeeCode})</strong>، يرجى تسجيل بصمته على الماكينة فوراً لتفعيل احتساب الحضور.
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-[15px] border-none shadow-sm bg-gradient-to-br from-royal-blue to-blue-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs font-bold">إجمالي الحركات {statsPeriodText}</p>
                  <h3 className="text-3xl font-bold mt-1">{periodLogsCount}</h3>
                </div>
                <div className="bg-white/20 p-3 rounded-[15px]">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="rounded-[15px] border-none shadow-sm bg-white border border-royal-blue/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-bold">حالات التأخير {statsPeriodText}</p>
                  <h3 className={cn("text-3xl font-bold mt-1", latePeriodCount > 0 ? "text-red-600 animate-pulse" : "text-gray-800")}>
                    {latePeriodCount}
                  </h3>
                </div>
                <div className={cn("p-3 rounded-[15px]", latePeriodCount > 0 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-400")}>
                  <AlertTriangle className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[15px] border-none shadow-sm bg-white border border-royal-blue/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-bold">انصراف مبكر {statsPeriodText}</p>
                  <h3 className={cn("text-3xl font-bold mt-1", earlyDeparturePeriodCount > 0 ? "text-amber-600" : "text-gray-800")}>
                    {earlyDeparturePeriodCount}
                  </h3>
                </div>
                <div className={cn("p-3 rounded-[15px]", earlyDeparturePeriodCount > 0 ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-400")}>
                  <Timer className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[15px] border-none shadow-sm bg-white border border-royal-blue/10">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-bold">حالة جهاز البصمة</p>
                  <div className={cn(
                    "flex items-center gap-2 mt-1.5 font-bold text-sm",
                    deviceConnected ? "text-green-600" : "text-red-500"
                  )}>
                    <div className={cn(
                      "size-2 rounded-full", 
                      deviceConnected ? "bg-green-600 animate-pulse" : "bg-red-500"
                    )} />
                    {deviceConnected ? "متصل (Online)" : "غير متصل (Offline)"}
                  </div>
                  
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={handleManualReconnect} 
                    disabled={isReconnecting}
                    className="p-0 h-auto text-xs text-royal-blue font-bold flex items-center gap-1 mt-1 hover:text-royal-blue/80"
                  >
                    <RefreshCw className={cn("h-3 w-3", isReconnecting && "animate-spin")} />
                    إعادة الاتصال
                  </Button>
                </div>
                <div className={cn(
                  "p-3 rounded-[15px]", 
                  deviceConnected ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
                )}>
                  {deviceConnected ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Manager's Pending Public Holidays Card */}
        {isManager && pendingHolidays.length > 0 && (
          <Card className="rounded-[15px] border-none shadow-md overflow-hidden bg-white border border-royal-blue/20 animate-in fade-in slide-in-from-top-2">
            <CardHeader className="bg-royal-blue text-white py-4 px-6">
              <CardTitle className="text-md font-bold flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-yellow-300" />
                أعياد رسمية معلقة تنتظر الاعتماد
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {pendingHolidays.map((h) => {
                  return (
                    <div 
                      key={h.id} 
                      className="bg-slate-50 border border-slate-200/60 p-4 rounded-[15px] hover:border-royal-blue/30 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm text-gray-800">{h.name}</h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5">السنة الدراسية: {h.academicYear || 'غير محددة'}</p>
                          </div>
                          <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            بانتظار الاعتماد
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs pt-1.5 border-t border-dashed border-slate-200">
                          <div>من: <span className="font-bold text-royal-blue">{h.startDate ? h.startDate.replace(/-/g, '/') : ''}</span></div>
                          <div>إلى: <span className="font-bold text-royal-blue">{h.endDate ? h.endDate.replace(/-/g, '/') : ''}</span></div>
                        </div>
                        
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          ⚠️ بمجرد اعتماد هذا العيد الرسمي، سيقوم النظام تلقائياً باستثناء هذه الفترة من حساب الغياب لجميع الموظفين.
                        </p>
                      </div>

                      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                        <Button
                          size="sm"
                          disabled={isProcessingHoliday === h.id}
                          onClick={() => handleHolidayDecision(h.id, 'APPROVED')}
                          className="flex-1 rounded-[10px] text-[10px] font-bold h-8 bg-green-600 hover:bg-green-700 text-white animate-in fade-in"
                        >
                          اعتماد العيد الرسمي
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isProcessingHoliday === h.id}
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من رفض وحذف العيد الرسمي: "${h.name}" بالكامل؟`)) {
                              handleHolidayDecision(h.id, 'DELETE');
                            }
                          }}
                          className="flex-1 rounded-[10px] text-[10px] font-bold h-8"
                        >
                          رفض وحذف العيد
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manager's Pending Requests Card */}
        {isManager && pendingRequests.length > 0 && (
          <Card className="rounded-[15px] border-none shadow-md overflow-hidden bg-white border border-royal-blue/20 animate-in fade-in slide-in-from-top-2">
            <CardHeader className="bg-royal-blue text-white py-4 px-6">
              <CardTitle className="text-md font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-yellow-300" />
                طلبات معلقة بانتظار الاعتماد
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {pendingRequests.map((req) => (
                  <PendingRequestCard 
                    key={req.id} 
                    req={req} 
                    isApproving={isApproving} 
                    onApprove={handleDecision} 
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logs Table */}
        <Card className="rounded-[15px] border-none shadow-md overflow-hidden bg-white">
          <CardHeader className="bg-white border-b border-gray-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg font-bold text-royal-blue flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              سجل حركات البصمة المحسوبة
            </CardTitle>
            
            {/* Clear filters button */}
            {(statusFilter !== "all" || shiftFilter !== "all" || deptFilter !== "all") && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setStatusFilter("all");
                  setShiftFilter("all");
                  setDeptFilter("all");
                }}
                className="text-royal-blue border-royal-blue/20 hover:bg-royal-blue/5 rounded-[10px] text-xs font-bold"
              >
                إعادة ضبط الفلاتر
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse min-w-[1100px]">
                <thead>
                  <tr className="bg-royal-blue/5 text-royal-blue text-sm border-b border-royal-blue/10">
                    <th className="p-4 font-bold w-20">الكود</th>
                    <th className="p-4 font-bold">
                      <div className="flex flex-col gap-1">
                        <span>الموظف والوظيفة</span>
                        <select 
                          value={deptFilter}
                          onChange={(e) => setDeptFilter(e.target.value)}
                          className="bg-white border border-royal-blue/20 text-slate-800 text-[11px] rounded-[8px] px-2 py-1 font-bold outline-none cursor-pointer focus:border-royal-blue mt-1 font-cairo"
                        >
                          <option value="all">كل الأقسام</option>
                          {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </th>
                    <th className="p-4 font-bold">
                      <div className="flex flex-col gap-1">
                        <span>المناوبة المطبقة</span>
                        <select 
                          value={shiftFilter}
                          onChange={(e) => setShiftFilter(e.target.value)}
                          className="bg-white border border-royal-blue/20 text-slate-800 text-[11px] rounded-[8px] px-2 py-1 font-bold outline-none cursor-pointer focus:border-royal-blue mt-1 font-cairo"
                        >
                          <option value="all">كل المناوبات</option>
                          {uniqueShifts.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </th>
                    <th className="p-4 font-bold">التاريخ</th>
                    <th className="p-4 font-bold">الحضور والتأخير</th>
                    <th className="p-4 font-bold">الانصراف والسماح</th>
                    <th className="p-4 font-bold text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span>حالة اليوم</span>
                        <select 
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="bg-white border border-royal-blue/20 text-slate-800 text-[11px] rounded-[8px] px-2 py-1 font-bold outline-none cursor-pointer focus:border-royal-blue mt-1 font-cairo"
                        >
                          <option value="all">كل الحالات</option>
                          <option value="present">حاضر</option>
                          <option value="EARLY_DEPARTURE">خروج مبكر</option>
                          <option value="late">متأخر</option>
                          <option value="absent">غائب</option>
                          <option value="حضر متأخر وانصرف مبكراً">حضر متأخر وانصرف مبكراً</option>
                          <option value="LEAVE">إجازة معفاة</option>
                          <option value="UNPAID_LEAVE">غياب بدون راتب</option>
                          <option value="لم يبصم حضور">لم يبصم حضور</option>
                          <option value="لم يبصم انصراف">لم يبصم انصراف</option>
                        </select>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-royal-blue/30" />
                        <p className="text-muted-foreground mt-2 font-bold text-sm">جاري تحميل حركات الموظفين...</p>
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-muted-foreground">
                        لا توجد سجلات مطابقة للبحث أو الفلترة حالياً
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-royal-blue/5 transition-colors group">
                        <td className="p-4 font-bold text-royal-blue">{log.employeeCode}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="size-8 rounded-full bg-royal-blue/10 flex items-center justify-center text-royal-blue font-bold text-xs group-hover:bg-royal-blue group-hover:text-white transition-colors">
                              {(log.employee?.fullName || "?").charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-gray-800 block text-sm">{log.employee?.fullName || "موظف مجهول"}</span>
                              <span className="text-xs text-muted-foreground block">{log.employee?.department || "--"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-bold text-slate-700">
                          {log.shift ? (
                            <span className="inline-block bg-slate-100 px-2 py-1 rounded-[10px]">
                              {log.shift.shiftName} ({log.shift.startTime} - {log.shift.endTime})
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">غير محدد</span>
                          )}
                        </td>
                        <td className="p-4 text-xs font-medium text-gray-800">
                          {log.date ? log.date.replace(/-/g, '/') : ""}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1 w-fit">
                            {log.checkIn ? (
                              <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-green-100">
                                <Clock className="h-3 w-3" />
                                {log.checkIn}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs italic">--:--</span>
                            )}
                            {log.delayMinutes > 0 && (
                              <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-[10px] text-[10px] font-bold border border-red-100">
                                تأخير: {log.delayMinutes} د
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1 w-fit">
                            {log.checkOut ? (
                              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-blue-100">
                                <Clock className="h-3 w-3" />
                                {log.checkOut}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs italic">--:--</span>
                            )}
                            {log.earlyDeparture > 0 && (
                              <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-[10px] text-[10px] font-bold border border-amber-100">
                                خروج مبكر: {log.earlyDeparture} د
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={cn(
                            "px-3 py-1 text-[10px] font-bold inline-block whitespace-nowrap font-cairo rounded-[15px]",
                            log.status === 'present' && "bg-green-100 text-green-700",
                            log.status === 'EARLY_DEPARTURE' && "bg-orange-100 text-orange-700",
                            log.status === 'late' && "bg-amber-100 text-amber-700",
                            log.status === 'absent' && "bg-red-100 text-red-700",
                            log.status === 'حضر متأخر وانصرف مبكراً' && "bg-rose-100 text-rose-700",
                            (log.status === 'لم يبصم انصراف' || log.status === 'لم يبصم حضور') && "bg-orange-100 text-orange-700",
                            (log.status === 'LEAVE' || log.status === 'إجازة معفاة') && "bg-[#4169E1]/10 text-[#4169E1]",
                            (log.status === 'UNPAID_LEAVE' || log.status === 'غياب بدون راتب') && "bg-red-100 text-red-700"
                          )}>
                            {log.status === 'present' ? 'حاضر' : 
                             log.status === 'EARLY_DEPARTURE' ? 'خروج مبكر' :
                             log.status === 'late' ? 'متأخر' : 
                             log.status === 'absent' ? 'غائب' : 
                             (log.status === 'LEAVE' || log.status === 'إجازة معفاة') ? '🌙 إجازة معفاة' :
                             (log.status === 'UNPAID_LEAVE' || log.status === 'غياب بدون راتب') ? 'غياب بدون راتب' :
                             log.status === 'حضر متأخر وانصرف مبكراً' ? 'حضر متأخر وانصرف مبكراً' :
                             log.status}
                          </span>
                        </td>
                        {isManager && (
                          <td className="p-4 text-center">
                            <button
                              onClick={() => {
                                setEditingLog(log);
                                setManualCheckIn(log.checkIn || "");
                                setManualCheckOut(log.checkOut || "");
                              }}
                              title="تعديل يدوي"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold font-cairo rounded-[10px] bg-royal-blue/10 text-royal-blue hover:bg-royal-blue hover:text-white transition-all duration-200 border border-royal-blue/20"
                            >
                              <Pencil className="h-3 w-3" />
                              تعديل
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
    {/* ─── Manual Edit Modal ──────────────────────────────────────────── */}
    {editingLog && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) setEditingLog(null); }}
      >
        <div
          className="bg-white w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          style={{ borderRadius: 15, fontFamily: 'Cairo, sans-serif' }}
        >
          {/* Header */}
          <div className="bg-royal-blue px-6 py-4 flex items-center justify-between" style={{ borderRadius: '15px 15px 0 0' }}>
            <div>
              <h2 className="text-white font-bold text-base">تعديل حضور يدوي</h2>
              <p className="text-blue-100 text-xs mt-0.5">
                {editingLog.employee?.fullName} — {editingLog.date?.replace(/-/g, '/')}
              </p>
            </div>
            <button
              onClick={() => setEditingLog(null)}
              className="text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Info banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-[10px] p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
              <span>سيتم إعادة حساب الحالة (حاضر / متأخر / ...) تلقائياً بناءً على المناوبة بعد الحفظ.</span>
            </div>

            {/* Check-in */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700">وقت الحضور (اختياري)</label>
              <div className="relative">
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500 pointer-events-none" />
                <input
                  type="time"
                  value={manualCheckIn}
                  onChange={(e) => setManualCheckIn(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 border border-slate-200 text-sm font-bold text-slate-800 outline-none focus:border-royal-blue focus:ring-2 focus:ring-royal-blue/10 transition-all"
                  style={{ borderRadius: 10, fontFamily: 'Cairo, sans-serif' }}
                  placeholder="--:--"
                />
              </div>
              {manualCheckIn && (
                <button onClick={() => setManualCheckIn('')} className="text-xs text-red-400 hover:text-red-600 font-bold">✕ مسح وقت الحضور</button>
              )}
            </div>

            {/* Check-out */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700">وقت الانصراف (اختياري)</label>
              <div className="relative">
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 pointer-events-none" />
                <input
                  type="time"
                  value={manualCheckOut}
                  onChange={(e) => setManualCheckOut(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 border border-slate-200 text-sm font-bold text-slate-800 outline-none focus:border-royal-blue focus:ring-2 focus:ring-royal-blue/10 transition-all"
                  style={{ borderRadius: 10, fontFamily: 'Cairo, sans-serif' }}
                  placeholder="--:--"
                />
              </div>
              {manualCheckOut && (
                <button onClick={() => setManualCheckOut('')} className="text-xs text-red-400 hover:text-red-600 font-bold">✕ مسح وقت الانصراف</button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={handleManualSave}
              disabled={isSavingManual}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-royal-blue hover:bg-royal-blue/90 disabled:opacity-60 transition-all"
              style={{ borderRadius: 10, fontFamily: 'Cairo, sans-serif' }}
            >
              {isSavingManual ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> جاري الحفظ...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" /> حفظ التعديل</>  
              )}
            </button>
            <button
              onClick={() => setEditingLog(null)}
              disabled={isSavingManual}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 transition-all"
              style={{ borderRadius: 10, fontFamily: 'Cairo, sans-serif' }}
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    )}
      </div>
    </div>
  );
}
