import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Search, 
  Plus, 
  AlertCircle, 
  User, 
  Clock, 
  Sparkles, 
  CheckCircle2,
  CalendarDays,
  UserCheck,
  Pencil,
  ThumbsUp,
  ThumbsDown,
  Minus,
  BadgeCheck,
  X
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/authStore';

const API_BASE = "/api";

const fetch = (url: RequestInfo | URL, options: RequestInit = {}) => {
  const token = useAuthStore.getState().token;
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
  return window.fetch(url, { ...options, headers });
};

// Helper to format today's date as YYYY-MM-DD
const getTodayString = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Helper to calculate current academic year (e.g. "2025-2026")
const getAcademicYear = (d = new Date()) => {
  let yearStart = d.getFullYear();
  let yearEnd = yearStart + 1;
  if (d.getMonth() < 8 || (d.getMonth() === 8 && d.getDate() < 15)) {
    yearStart = d.getFullYear() - 1;
    yearEnd = d.getFullYear();
  }
  return `${yearStart}-${yearEnd}`;
};

export default function HRDashboard() {
  const [activeTab, setActiveTab] = useState<'leaves' | 'holidays'>('leaves');
  
  // Search & Employee State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  
  // Leave Balance State
  const [leaveBalance, setLeaveBalance] = useState<{
    casualRemaining: number;
    annualRemaining: number;
  } | null>(null);
  
  // Leave Request Form State
  const [leaveType, setLeaveType] = useState<string>('');
  const [leaveDate, setLeaveDate] = useState<string>(getTodayString());
  const [leaveEndDate, setLeaveEndDate] = useState<string>(getTodayString());
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [permissionsCount, setPermissionsCount] = useState<number | null>(null);
  
  // Holiday State
  const [holidays, setHolidays] = useState<any[]>([]);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayStart, setNewHolidayStart] = useState('');
  const [newHolidayEnd, setNewHolidayEnd] = useState('');
  const [isSubmittingHoliday, setIsSubmittingHoliday] = useState(false);

  // Edit Holiday State
  const [editingHoliday, setEditingHoliday] = useState<any | null>(null);
  const [editHolidayName, setEditHolidayName] = useState('');
  const [editHolidayStart, setEditHolidayStart] = useState('');
  const [editHolidayEnd, setEditHolidayEnd] = useState('');
  const [isEditingHoliday, setIsEditingHoliday] = useState(false);

  // Duration & History States
  const [durationDays, setDurationDays] = useState<number>(1);
  const [requestHistory, setRequestHistory] = useState<any[]>([]);

  // Edit Request State
  const [editingRequest, setEditingRequest] = useState<any | null>(null);
  const [editRequestType, setEditRequestType] = useState<string>('');
  const [editRequestDate, setEditRequestDate] = useState<string>('');
  const [editRequestEndDate, setEditRequestEndDate] = useState<string>('');
  const [editRequestDuration, setEditRequestDuration] = useState<number>(1);
  const [isEditingRequest, setIsEditingRequest] = useState(false);

  // Fetch request history for employee
  const fetchRequestHistory = async (empCode: number) => {
    try {
      const res = await fetch(`${API_BASE}/leaves/history/${empCode}`);
      if (res.ok) {
        const data = await res.json();
        setRequestHistory(data);
      }
    } catch (err) {
      console.error('Fetch request history error', err);
    }
  };

  const refreshBalances = async (empCode: number) => {
    try {
      const currentYear = getAcademicYear();
      const res = await fetch(`${API_BASE}/leave-balances/${empCode}/${currentYear}`);
      if (res.ok) {
        const data = await res.json();
        setLeaveBalance(data);
      }
      fetchRequestHistory(empCode);
    } catch (err) {
      console.error('Refresh balances error', err);
    }
  };

  // Fetch all registered holidays
  const fetchHolidays = async () => {
    try {
      const res = await fetch(`${API_BASE}/public-holidays`);
      if (res.ok) {
        const data = await res.json();
        setHolidays(data);
      }
    } catch (err) {
      console.error('Fetch holidays error', err);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  // Employee search logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        fetch(`${API_BASE}/employees?search=${encodeURIComponent(searchTerm)}&activeOnly=true`)
          .then(res => res.json())
          .then(data => setSearchResults(data))
          .catch(err => console.error("Search employees error", err));
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle selecting an employee
  const handleSelectEmployee = async (emp: any) => {
    setSelectedEmployee(emp);
    setSearchTerm('');
    setSearchResults([]);
    
    // Fetch leave balance and request history
    try {
      const currentYear = getAcademicYear();
      const res = await fetch(`${API_BASE}/leave-balances/${emp.employeeCode}/${currentYear}`);
      if (res.ok) {
        const data = await res.json();
        setLeaveBalance(data);
      }
      fetchRequestHistory(emp.employeeCode);
    } catch (err) {
      toast.error('حدث خطأ أثناء جلب رصيد الإجازات');
    }
  };

  const fetchPermissionsCount = async (empCode: number, dateStr: string) => {
    try {
      const yearMonth = dateStr ? dateStr.substring(0, 7) : new Date().toISOString().substring(0, 7);
      const res = await fetch(`${API_BASE}/leaves/permissions-count/${empCode}/${yearMonth}`);
      if (res.ok) {
        const data = await res.json();
        setPermissionsCount(data.count);
      }
    } catch (err) {
      console.error("Error fetching permissions count", err);
    }
  };

  useEffect(() => {
    if (selectedEmployee) {
      fetchPermissionsCount(selectedEmployee.employeeCode, leaveDate);
    } else {
      setPermissionsCount(null);
    }
  }, [selectedEmployee, leaveDate]);

  useEffect(() => {
    if (leaveDate && leaveEndDate && (leaveType === 'CASUAL' || leaveType === 'ANNUAL')) {
      const start = new Date(leaveDate);
      const end = new Date(leaveEndDate);
      if (end < start) {
        setLeaveEndDate(leaveDate);
        setDurationDays(1);
      } else {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setDurationDays(diffDays);
      }
    } else {
      setDurationDays(1);
    }
  }, [leaveDate, leaveEndDate, leaveType]);

  useEffect(() => {
    if (editRequestDate && editRequestEndDate && (editRequestType === 'CASUAL' || editRequestType === 'ANNUAL')) {
      const start = new Date(editRequestDate);
      const end = new Date(editRequestEndDate);
      if (end < start) {
        setEditRequestEndDate(editRequestDate);
        setEditRequestDuration(1);
      } else {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setEditRequestDuration(diffDays);
      }
    } else {
      setEditRequestDuration(1);
    }
  }, [editRequestDate, editRequestEndDate, editRequestType]);

  // Submit Leave Request
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveType) {
      toast.error('برجاء اختيار نوع الإجازة أو الإذن من القائمة');
      return;
    }
    if (!leaveDate) {
      toast.error('برجاء تحديد تاريخ الإجازة/الإذن');
      return;
    }

    setIsSubmittingLeave(true);
    try {
      const res = await fetch(`${API_BASE}/leaves/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeCode: selectedEmployee.employeeCode,
          type: leaveType,
          date: leaveDate,
          durationDays: (leaveType === 'CASUAL' || leaveType === 'ANNUAL') ? durationDays : 1
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تقديم طلب الإجازة');
      }

      toast.success('تم تقديم الطلب بنجاح وهو الآن بانتظار اعتماد المدير');
      
      // Refresh balance and history
      await refreshBalances(selectedEmployee.employeeCode);
      
      setLeaveDate(getTodayString());
      setLeaveEndDate(getTodayString());
      setDurationDays(1);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء تقديم الطلب');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Open edit request dialog
  const handleOpenEditRequest = (req: any) => {
    setEditingRequest(req);
    setEditRequestType(req.type);
    setEditRequestDate(req.date);
    
    // Compute end date based on date and durationDays
    const start = new Date(req.date);
    const end = new Date(start);
    end.setDate(start.getDate() + (req.durationDays || 1) - 1);
    setEditRequestEndDate(getTodayString(end));
    setEditRequestDuration(req.durationDays || 1);
  };

  // Submit edit request
  const handleUpdateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;
    if (!editRequestType || !editRequestDate) {
      toast.error('برجاء إدخال نوع الطلب وتاريخه');
      return;
    }

    setIsEditingRequest(true);
    try {
      const res = await fetch(`${API_BASE}/leaves/request/${editingRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editRequestType,
          date: editRequestDate,
          durationDays: (editRequestType === 'CASUAL' || editRequestType === 'ANNUAL') ? editRequestDuration : 1
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تعديل طلب الحركة');
      }

      toast.success('تم تعديل الطلب وإعادة حساب الأرصدة بنجاح');
      setEditingRequest(null);
      await refreshBalances(selectedEmployee.employeeCode);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء تعديل الطلب');
    } finally {
      setIsEditingRequest(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName || !newHolidayStart || !newHolidayEnd) {
      toast.error('برجاء إدخال اسم العيد وفترة العيد كاملة');
      return;
    }

    if (newHolidayStart > newHolidayEnd) {
      toast.error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
      return;
    }

    setIsSubmittingHoliday(true);
    try {
      const res = await fetch(`${API_BASE}/public-holidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newHolidayName,
          startDate: newHolidayStart,
          endDate: newHolidayEnd
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تسجيل العيد');
      }

      toast.success('تم تسجيل العيد الرسمي بنجاح وسيتم تجنب احتساب الغياب فيه');
      setNewHolidayName('');
      setNewHolidayStart('');
      setNewHolidayEnd('');
      fetchHolidays();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء تسجيل العيد');
    } finally {
      setIsSubmittingHoliday(false);
    }
  };

  // Open edit holiday dialog
  const handleOpenEdit = (h: any) => {
    setEditingHoliday(h);
    setEditHolidayName(h.name);
    setEditHolidayStart(h.startDate);
    setEditHolidayEnd(h.endDate);
  };

  // Submit edit public holiday
  const handleUpdateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHoliday) return;
    if (!editHolidayName || !editHolidayStart || !editHolidayEnd) {
      toast.error('برجاء إدخال اسم العيد وفترة العيد كاملة');
      return;
    }

    if (editHolidayStart > editHolidayEnd) {
      toast.error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
      return;
    }

    setIsEditingHoliday(true);
    try {
      const res = await fetch(`${API_BASE}/public-holidays/${editingHoliday.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editHolidayName,
          startDate: editHolidayStart,
          endDate: editHolidayEnd
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تعديل العيد الرسمي');
      }

      toast.success('تم تعديل العيد الرسمي بنجاح');
      setEditingHoliday(null);
      fetchHolidays();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء تعديل العيد');
    } finally {
      setIsEditingHoliday(false);
    }
  };

  // Check live warning messages for Leave Balance
  const getWarningMessage = () => {
    if (!leaveBalance || (leaveType !== 'CASUAL' && leaveType !== 'ANNUAL')) return null;
    
    const { casualRemaining, annualRemaining } = leaveBalance;
    
    if (leaveType === 'CASUAL') {
      if (casualRemaining === 0 && annualRemaining === 0) {
        return {
          type: 'error',
          text: '⚠️ تحذير حاد: لقد نفذت جميع أرصدة الإجازات (العارضة والاعتيادية) لهذا الموظف! سيتم رفع الطلب للمدير كـ "طلب استثناء لنفاذ الرصيد" وسيتم خصم اليوم مالياً عند الموافقة بخصم.'
        };
      }
      if (casualRemaining === 0 && annualRemaining > 0) {
        return {
          type: 'warning',
          text: '⚠️ تنبيه: رصيد الإجازات العارضة (Casual) لهذا الموظف فارغ. سيتم الخصم تلقائياً من رصيده المتبقي للإجازات الاعتيادية (Annual).'
        };
      }
    }
    
    if (leaveType === 'ANNUAL') {
      if (annualRemaining === 0) {
        return {
          type: 'error',
          text: '⚠️ تحذير حاد: لقد نفذ رصيد الإجازات الاعتيادية لهذا الموظف! سيتم رفع الطلب كـ "طلب استثناء لنفاذ الرصيد" وسيتم خصمه مالياً عند الموافقة بخصم.'
        };
      }
    }
    
    return null;
  };

  const warning = getWarningMessage();

  return (
    <div className="space-y-8 font-cairo max-w-7xl mx-auto p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/60 backdrop-blur-md p-6 rounded-[15px] border border-royal-blue/10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-royal-blue/10 p-3 rounded-[15px]">
            <CalendarDays className="h-8 w-8 text-royal-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-royal-blue">إدارة الإجازات والأذونات والأعياد الرسمية</h1>
            <p className="text-muted-foreground text-sm">إدخال طلبات الإجازات والأذونات للموظفين، ومتابعة الأرصدة السنوية وتسجيل العطلات الرسمية</p>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex bg-slate-100/80 p-1.5 rounded-[15px] max-w-md shadow-inner">
        <button
          onClick={() => setActiveTab('leaves')}
          className={`flex-1 py-2.5 rounded-[12px] font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
            activeTab === 'leaves'
              ? 'bg-royal-blue text-white shadow-md'
              : 'text-slate-600 hover:text-royal-blue hover:bg-white/50'
          }`}
        >
          <Clock className="h-4 w-4" />
          طلب إجازة / إذن لموظف
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          className={`flex-1 py-2.5 rounded-[12px] font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
            activeTab === 'holidays'
              ? 'bg-royal-blue text-white shadow-md'
              : 'text-slate-600 hover:text-royal-blue hover:bg-white/50'
          }`}
        >
          <Calendar className="h-4 w-4" />
          الأعياد الرسمية السنوية
        </button>
      </div>

      {/* Tab 1: Leaves & Permissions */}
      {activeTab === 'leaves' && (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Right Column: Search & Balance */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-none shadow-md rounded-[15px] overflow-hidden">
              <CardHeader className="bg-royal-blue text-white">
                <CardTitle className="text-md font-bold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  البحث عن الموظف
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالاسم، الكود، أو الرقم القومي..."
                    className="pr-10 rounded-[15px] border-royal-blue/20 focus:border-royal-blue bg-slate-50 font-bold"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full right-0 w-full bg-white mt-1 rounded-[15px] shadow-lg border border-royal-blue/10 z-50 overflow-hidden">
                      {searchResults.map((emp) => (
                        <div
                          key={emp.id}
                          className="p-3 hover:bg-royal-blue/5 cursor-pointer border-b last:border-0 transition-colors flex items-center justify-between"
                          onClick={() => handleSelectEmployee(emp)}
                        >
                          <div>
                            <div className="font-bold text-sm text-gray-800">{emp.fullName}</div>
                            <div className="text-[10px] text-muted-foreground">{emp.nationalId}</div>
                          </div>
                          <span className="bg-royal-blue/10 text-royal-blue text-xs font-bold px-2 py-1 rounded-full">
                            كود: {emp.employeeCode}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedEmployee ? (
                  <div className="bg-royal-blue/5 p-4 rounded-[15px] border border-royal-blue/10 space-y-3 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-royal-blue" />
                      <span className="font-bold text-sm text-royal-blue">الموظف المختار حالياً:</span>
                    </div>
                    <div className="text-sm font-bold text-gray-800">{selectedEmployee.fullName}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-2 border-t border-royal-blue/10">
                      <div>كود الموظف: <span className="font-bold">{selectedEmployee.employeeCode}</span></div>
                      <div>القسم: <span className="font-bold">{selectedEmployee.department}</span></div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedEmployee(null);
                        setLeaveBalance(null);
                      }}
                      className="text-red-500 hover:text-red-600 text-xs font-bold pt-1 underline"
                    >
                      إلغاء الاختيار
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-xs bg-slate-50 rounded-[15px] border border-dashed border-slate-200">
                    الرجاء البحث واختيار الموظف لعرض أرصدة إجازاته وتقديم الطلبات
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Leave Balance Card (CASUAL / ANNUAL) */}
            {leaveBalance && selectedEmployee && (leaveType === 'CASUAL' || leaveType === 'ANNUAL') && (
              <Card className="border-none shadow-md rounded-[15px] overflow-hidden bg-gradient-to-br from-royal-blue to-royal-blue/90 text-white">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="text-md font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-300" />
                    رصيد إجازات السنة ({getAcademicYear()})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-[12px] border border-white/10">
                    <div className="text-3xl font-extrabold text-white">{leaveBalance.casualRemaining}</div>
                    <div className="text-xs font-medium text-white/80 mt-1">عارضة (Casual)</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-[12px] border border-white/10">
                    <div className="text-3xl font-extrabold text-white">{leaveBalance.annualRemaining}</div>
                    <div className="text-xs font-medium text-white/80 mt-1">اعتيادي (Annual)</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Monthly Permission Balance Card (AM_PERMISSION / PM_PERMISSION) */}
            {selectedEmployee && (leaveType === 'AM_PERMISSION' || leaveType === 'PM_PERMISSION') && (
              <Card className="border-none shadow-md rounded-[15px] overflow-hidden bg-gradient-to-br from-royal-blue to-royal-blue/90 text-white">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="text-md font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-300" />
                    الأذونات المتاحة لهذا الشهر ({leaveDate ? leaveDate.substring(0, 7).replace('-', '/') : new Date().toISOString().substring(0, 7).replace('-', '/')})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-[12px] border border-white/10">
                    <div className="text-3xl font-extrabold text-white">{permissionsCount ?? 0}</div>
                    <div className="text-xs font-medium text-white/80 mt-1">المستهلكة (Used)</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-[12px] border border-white/10">
                    <div className="text-3xl font-extrabold text-white">{Math.max(0, 2 - (permissionsCount ?? 0))}</div>
                    <div className="text-xs font-medium text-white/80 mt-1">المتبقية (Remaining)</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedEmployee && !leaveType && (
              <div className="text-center py-6 text-muted-foreground text-xs bg-slate-50 rounded-[15px] border border-dashed border-slate-200">
                الرجاء اختيار نوع الطلب من القائمة لعرض الأرصدة المتاحة للتقديم.
              </div>
            )}
          </div>

          {/* Left Column: Form */}
          <div className="lg:col-span-2">
            <Card className="border-none shadow-md rounded-[15px] overflow-hidden h-full">
              <CardHeader className="bg-royal-blue text-white">
                <CardTitle className="text-md font-bold flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  تفاصيل طلب إجازة / إذن جديد
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmitLeave} className="space-y-6">
                  {/* Select Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-royal-blue">نوع الطلب</label>
                      <select
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value)}
                        className="w-full bg-slate-50 border border-royal-blue/20 rounded-[15px] p-3 text-sm font-bold focus:border-royal-blue focus:outline-none"
                      >
                        <option value="">اختر نوع الإجازة أو الإذن...</option>
                        <option value="CASUAL">إجازة عارضة (Casual Leave)</option>
                        <option value="ANNUAL">إجازة اعتيادية (Annual Leave)</option>
                        <option value="AM_PERMISSION">إذن صباحي (AM Permission - ساعتان)</option>
                        <option value="PM_PERMISSION">إذن مسائي (PM Permission - ساعتان)</option>
                      </select>
                    </div>

                    {leaveType && (leaveType === 'CASUAL' || leaveType === 'ANNUAL') ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-royal-blue">من تاريخ</label>
                          <div className="relative">
                            <Calendar className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="date"
                              value={leaveDate}
                              onChange={(e) => setLeaveDate(e.target.value)}
                              className="pr-10 rounded-[15px] border-royal-blue/20 focus:border-royal-blue font-bold text-sm h-12 cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-royal-blue">إلى تاريخ</label>
                          <div className="relative">
                            <Calendar className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="date"
                              value={leaveEndDate}
                              onChange={(e) => setLeaveEndDate(e.target.value)}
                              className="pr-10 rounded-[15px] border-royal-blue/20 focus:border-royal-blue font-bold text-sm h-12 cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="md:col-span-2 bg-royal-blue/5 p-4 rounded-[15px] border border-royal-blue/10 flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-700">عدد أيام الإجازة المحسوب تلقائياً:</span>
                          <span className="bg-royal-blue text-white text-sm font-extrabold px-4 py-1.5 rounded-full">
                            {durationDays} {durationDays === 1 ? 'يوم واحد' : durationDays === 2 ? 'يومان' : `${durationDays} أيام`}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-royal-blue">تاريخ الطلب</label>
                        <div className="relative">
                          <Calendar className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="date"
                            value={leaveDate}
                            onChange={(e) => setLeaveDate(e.target.value)}
                            className="pr-10 rounded-[15px] border-royal-blue/20 focus:border-royal-blue font-bold text-sm h-12 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Warning Messages */}
                  {warning && (
                    <div className={`p-4 rounded-[15px] border text-xs font-bold leading-relaxed ${
                      warning.type === 'error' 
                        ? 'bg-red-50 border-red-200 text-red-800' 
                        : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    }`}>
                      {warning.text}
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isSubmittingLeave || !selectedEmployee || !leaveType || !leaveDate}
                    className="w-full bg-royal-blue hover:bg-royal-blue/90 text-white rounded-[15px] h-12 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-royal-blue/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    تقديم طلب الإجازة/الإذن وإرساله للاعتماد
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Employee Requests History */}

        {selectedEmployee && (
          <Card className="border-none shadow-md rounded-[15px] overflow-hidden mt-8">
            <CardHeader className="bg-royal-blue text-white">
              <CardTitle className="text-md font-bold flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                سجل طلبات الإجازات والأذونات الأخير للموظف: {selectedEmployee.fullName}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {requestHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b border-royal-blue/10 text-xs font-bold text-royal-blue">
                        <th className="p-3 text-right">نوع الطلب</th>
                        <th className="p-3 text-right">التاريخ</th>
                        <th className="p-3 text-center">المدة</th>
                        <th className="p-3 text-center">الحالة</th>
                        <th className="p-3 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requestHistory.map((req) => {
                        let typeLabel = req.type;
                        if (req.type === 'CASUAL') typeLabel = 'إجازة عارضة';
                        else if (req.type === 'ANNUAL') typeLabel = 'إجازة اعتيادية';
                        else if (req.type === 'AM_PERMISSION') typeLabel = 'إذن صباحي';
                        else if (req.type === 'PM_PERMISSION') typeLabel = 'إذن مسائي';

                        return (
                          <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-xs transition-colors">
                            <td className="p-3 font-bold text-gray-800">{typeLabel}</td>
                            <td className="p-3 font-medium text-slate-600">
                              {req.date ? req.date.replace(/-/g, '/') : ''}
                            </td>
                            <td className="p-3 text-center font-bold text-slate-700">
                              {(req.type === 'CASUAL' || req.type === 'ANNUAL') ? `${req.durationDays || 1} يوم` : 'ساعتان'}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                                req.status === 'APPROVED_FREE' || req.status === 'APPROVED'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : req.status === 'APPROVED_WITH_DEDUCTION'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : req.status === 'REJECTED'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {req.status === 'APPROVED_FREE' || req.status === 'APPROVED'
                                  ? 'موافق عليها (بدون خصم)'
                                  : req.status === 'APPROVED_WITH_DEDUCTION'
                                  ? 'موافق عليها (مع خصم)'
                                  : req.status === 'REJECTED'
                                  ? 'مرفوضة'
                                  : 'قيد الانتظار'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {req.status === 'PENDING' ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenEditRequest(req)}
                                    className="text-royal-blue hover:text-royal-blue hover:bg-royal-blue/10 rounded-[10px] h-8 px-2 py-1 font-bold text-xs"
                                  >
                                    <Pencil className="h-3 w-3 inline-block ml-1" />
                                    تعديل
                                  </Button>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-bold">مغلق للتعديل</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  لا توجد طلبات إجازة أو أذونات مسجلة لهذا الموظف في الأرشيف بعد.
                </div>
              )}
            </CardContent>
          </Card>
        )}
        </>
    )}

      {/* Tab 2: Public Holidays */}
      {activeTab === 'holidays' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Holiday Form */}
          <div className="lg:col-span-1">
            <Card className="border-none shadow-md rounded-[15px] overflow-hidden">
              <CardHeader className="bg-royal-blue text-white">
                <CardTitle className="text-md font-bold flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  إضافة عيد رسمي جديد
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleAddHoliday} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-royal-blue">اسم العيد الرسمي (مثال: عيد الفطر)</label>
                    <Input
                      placeholder="أدخل اسم العيد..."
                      value={newHolidayName}
                      onChange={(e) => setNewHolidayName(e.target.value)}
                      className="rounded-[15px] border-royal-blue/20 focus:border-royal-blue font-bold h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-royal-blue">تاريخ بداية العيد (Start Date)</label>
                    <div className="relative">
                      <Calendar className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={newHolidayStart}
                        onChange={(e) => setNewHolidayStart(e.target.value)}
                        className="pr-10 rounded-[15px] border-royal-blue/20 focus:border-royal-blue font-bold h-11 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-royal-blue">تاريخ نهاية العيد (End Date)</label>
                    <div className="relative">
                      <Calendar className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={newHolidayEnd}
                        onChange={(e) => setNewHolidayEnd(e.target.value)}
                        className="pr-10 rounded-[15px] border-royal-blue/20 focus:border-royal-blue font-bold h-11 cursor-pointer"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmittingHoliday}
                    className="w-full text-white rounded-[15px] h-11 text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
                    style={{ backgroundColor: '#4169E1' }}
                  >
                    <Plus className="h-4 w-4" />
                    تسجيل العيد في خادم المدرسة
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Holidays List */}
          <div className="lg:col-span-2">
            <Card className="border-none shadow-md rounded-[15px] overflow-hidden">
              <CardHeader className="bg-royal-blue text-white">
                <CardTitle className="text-md font-bold flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  الأعياد الرسمية المسجلة سنوياً
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {(() => {
                  const currentYear = getAcademicYear();
                  const activeYearHolidays = holidays.filter((h) => h.academicYear === currentYear);

                  return activeYearHolidays.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="border-b border-royal-blue/10 text-xs font-bold text-royal-blue">
                            <th className="p-3 text-right">اسم العيد الرسمي</th>
                            <th className="p-3 text-right">التاريخ</th>
                            <th className="p-3 text-center">الحالة</th>
                            <th className="p-3 text-center">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeYearHolidays.map((h) => (
                            <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-xs transition-colors">
                              <td className="p-3 font-bold text-gray-800">{h.name}</td>
                              <td className="p-3 font-medium text-slate-600">
                                <div className="flex flex-col gap-1 items-start text-[10px]">
                                  <span>من: <strong className="text-royal-blue">{h.startDate ? h.startDate.replace(/-/g, '/') : ''}</strong></span>
                                  <span>إلى: <strong className="text-royal-blue">{h.endDate ? h.endDate.replace(/-/g, '/') : ''}</strong></span>
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                                  h.status === 'APPROVED'
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {h.status === 'APPROVED' ? 'معتمد' : 'معلق'}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                {h.status === 'PENDING' ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenEdit(h)}
                                    className="text-royal-blue hover:text-royal-blue hover:bg-royal-blue/10 rounded-[10px] h-8 w-8 p-0"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-bold">مغلق للتعديل</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-muted-foreground text-xs">
                      لم يتم تسجيل أي أعياد رسمية للسنة الدراسية الحالية ({currentYear}) بعد. استخدم النموذج الجانبي لإضافتها.
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Edit Holiday Dialog */}
      {editingHoliday && (
        <Dialog open={!!editingHoliday} onOpenChange={(open) => { if (!open) setEditingHoliday(null); }}>
          <DialogContent className="font-cairo rounded-[15px] max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-royal-blue flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                تعديل العيد الرسمي المعلق
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateHoliday} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-royal-blue">اسم العيد الرسمي</label>
                <Input
                  value={editHolidayName}
                  onChange={(e) => setEditHolidayName(e.target.value)}
                  className="rounded-[15px] border-royal-blue/20 focus:border-royal-blue font-bold h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-royal-blue">تاريخ بداية العيد (Start Date)</label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={editHolidayStart}
                    onChange={(e) => setEditHolidayStart(e.target.value)}
                    className="pr-10 rounded-[15px] border-royal-blue/20 focus:border-royal-blue font-bold h-11 cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-royal-blue">تاريخ نهاية العيد (End Date)</label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={editHolidayEnd}
                    onChange={(e) => setEditHolidayEnd(e.target.value)}
                    className="pr-10 rounded-[15px] border-royal-blue/20 focus:border-royal-blue font-bold h-11 cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isEditingHoliday}
                  className="flex-1 bg-royal-blue hover:bg-royal-blue/90 text-white rounded-[15px] h-11 text-xs font-bold"
                >
                  {isEditingHoliday ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingHoliday(null)}
                  className="flex-1 rounded-[15px] h-11 text-xs font-bold border-royal-blue/20 text-royal-blue hover:bg-royal-blue/5"
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Request Dialog */}
      {editingRequest && (
        <Dialog open={!!editingRequest} onOpenChange={(open) => { if (!open) setEditingRequest(null); }}>
          <DialogContent className="font-cairo rounded-[15px] max-w-md animate-in fade-in" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-royal-blue flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                تعديل طلب الحركة بأثر رجعي
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateRequest} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-royal-blue">نوع الطلب</label>
                <select
                  value={editRequestType}
                  onChange={(e) => setEditRequestType(e.target.value)}
                  className="w-full bg-slate-50 border border-royal-blue/20 rounded-[15px] p-3 text-sm font-bold focus:border-royal-blue focus:outline-none font-cairo"
                >
                  <option value="CASUAL">إجازة عارضة (Casual Leave)</option>
                  <option value="ANNUAL">إجازة اعتيادية (Annual Leave)</option>
                  <option value="AM_PERMISSION">إذن صباحي (AM Permission)</option>
                  <option value="PM_PERMISSION">إذن مسائي (PM Permission)</option>
                </select>
              </div>

              {editRequestType && (editRequestType === 'CASUAL' || editRequestType === 'ANNUAL') ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-royal-blue">من تاريخ</label>
                    <div className="relative">
                      <Calendar className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={editRequestDate}
                        onChange={(e) => setEditRequestDate(e.target.value)}
                        className="pr-10 rounded-[15px] border-royal-blue/20 focus:border-royal-blue font-bold h-11 cursor-pointer font-cairo"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-royal-blue">إلى تاريخ</label>
                    <div className="relative">
                      <Calendar className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={editRequestEndDate}
                        onChange={(e) => setEditRequestEndDate(e.target.value)}
                        className="pr-10 rounded-[15px] border-royal-blue/20 focus:border-royal-blue font-bold h-11 cursor-pointer font-cairo"
                        required
                      />
                    </div>
                  </div>

                  <div className="bg-royal-blue/5 p-4 rounded-[15px] border border-royal-blue/10 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700 font-cairo">عدد أيام الإجازة المحسوب تلقائياً:</span>
                    <span className="bg-royal-blue text-white text-sm font-extrabold px-4 py-1.5 rounded-full font-cairo">
                      {editRequestDuration} {editRequestDuration === 1 ? 'يوم واحد' : editRequestDuration === 2 ? 'يومان' : `${editRequestDuration} أيام`}
                    </span>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-royal-blue">تاريخ الطلب</label>
                  <div className="relative">
                    <Calendar className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={editRequestDate}
                      onChange={(e) => setEditRequestDate(e.target.value)}
                      className="pr-10 rounded-[15px] border-royal-blue/20 focus:border-royal-blue font-bold h-11 cursor-pointer font-cairo"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isEditingRequest}
                  className="flex-1 bg-royal-blue hover:bg-royal-blue/90 text-white rounded-[15px] h-11 text-xs font-bold font-cairo"
                >
                  {isEditingRequest ? 'جاري الحفظ...' : 'حفظ التعديلات وإعادة الحساب'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingRequest(null)}
                  className="flex-1 rounded-[15px] h-11 text-xs font-bold border-royal-blue/20 text-royal-blue hover:bg-royal-blue/5 font-cairo"
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
