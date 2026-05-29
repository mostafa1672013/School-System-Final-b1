import React, { useState, useEffect } from 'react';
import { 
  Search, 
  User, 
  Settings, 
  Users, 
  Save, 
  AlertTriangle, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

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

export default function AdminBalances() {
  // Search & Employee State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  
  // Individual Balance Form State
  const [allowedCasual, setAllowedCasual] = useState<number>(3);
  const [allowedRegular, setAllowedRegular] = useState<number>(21);
  const [academicYear, setAcademicYear] = useState<string>(getAcademicYear());
  const [isUpdatingIndividual, setIsUpdatingIndividual] = useState(false);
  
  // Bulk Balance Form State
  const [bulkAllowedCasual, setBulkAllowedCasual] = useState<number>(3);
  const [bulkAllowedRegular, setBulkAllowedRegular] = useState<number>(21);
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);

  // Employee search logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        fetch(`${API_BASE}/employees?search=${encodeURIComponent(searchTerm)}`)
          .then(res => res.json())
          .then(data => setSearchResults(data))
          .catch(err => console.error("Search employees error", err));
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSelectEmployee = (emp: any) => {
    setSelectedEmployee(emp);
    setAllowedCasual(emp.totalAllowedCasual);
    setAllowedRegular(emp.totalAllowedRegular);
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleUpdateIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) {
      toast.error('برجاء اختيار موظف أولاً');
      return;
    }

    setIsUpdatingIndividual(true);
    try {
      const res = await fetch(`${API_BASE}/employees/balances`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeCode: selectedEmployee.employeeCode,
          totalAllowedCasual: allowedCasual,
          totalAllowedRegular: allowedRegular,
          academicYear,
          isBulk: false
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تحديث رصيد الموظف');
      }

      toast.success(data.message || 'تم تحديث الأرصدة بنجاح');
      
      // Update local selected employee state
      setSelectedEmployee({
        ...selectedEmployee,
        totalAllowedCasual: allowedCasual,
        totalAllowedRegular: allowedRegular
      });
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء التحديث');
    } finally {
      setIsUpdatingIndividual(false);
    }
  };

  const handleUpdateBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('هل أنت متأكد من رغبتك في تحديث الأرصدة السنوية لجميع الموظفين؟ سيتم إعادة حساب الأرصدة المستهلكة تلقائياً.')) {
      return;
    }

    setIsUpdatingBulk(true);
    try {
      const res = await fetch(`${API_BASE}/employees/balances`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalAllowedCasual: bulkAllowedCasual,
          totalAllowedRegular: bulkAllowedRegular,
          academicYear,
          isBulk: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل التحديث الجماعي للأرصدة');
      }

      toast.success(data.message || 'تم تحديث الأرصدة السنوية لجميع الموظفين بنجاح');
      
      // Update selected employee too if loaded
      if (selectedEmployee) {
        setSelectedEmployee({
          ...selectedEmployee,
          totalAllowedCasual: bulkAllowedCasual,
          totalAllowedRegular: bulkAllowedRegular
        });
        setAllowedCasual(bulkAllowedCasual);
        setAllowedRegular(bulkAllowedRegular);
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء التحديث الجماعي');
    } finally {
      setIsUpdatingBulk(false);
    }
  };

  return (
    <div className="p-6 space-y-6 font-cairo text-right" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <Settings className="size-6 text-[#4169E1]" />
            إدارة أرصدة الإجازات السنوية (للمشرفين)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            تعديل الأرصدة الافتراضية والمخصصة للإجازات العارضة والاعتيادية للموظفين بشكل فردي أو جماعي.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#4169E1]/10 px-4 py-2 rounded-[15px] border border-[#4169E1]/20">
          <Sparkles className="size-5 text-[#4169E1]" />
          <span className="text-sm font-semibold text-[#4169E1]">السنة الدراسية الحالية: {academicYear}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Section: Individual Balance Adjustment */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border shadow-md rounded-[15px] overflow-hidden">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-700">
                <User className="size-5 text-[#4169E1]" />
                تعديل رصيد موظف معين
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* Employee Selector Search Input */}
              <div className="relative">
                <label className="block text-sm font-semibold text-slate-600 mb-2">ابحث عن الموظف (بالاسم أو كود البصمة)</label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="اكتب اسم الموظف أو الكود..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-[15px] border border-slate-300 focus:border-[#4169E1] focus:ring focus:ring-[#4169E1]/20 transition-all font-cairo"
                  />
                  <Search className="absolute left-3 top-3.5 size-5 text-slate-400" />
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-[15px] shadow-lg max-h-60 overflow-y-auto overflow-hidden divide-y">
                    {searchResults.map((emp) => (
                      <button
                        key={emp.id}
                        onClick={() => handleSelectEmployee(emp)}
                        className="w-full text-right px-4 py-3 hover:bg-slate-50 flex items-center justify-between transition-colors font-cairo"
                      >
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs">
                            {emp.fullName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800 text-sm block">{emp.fullName}</span>
                            <span className="text-xs text-slate-500">{emp.department || 'بدون قسم'}</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                          كود #{emp.employeeCode}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Employee Card & Form */}
              {selectedEmployee ? (
                <form onSubmit={handleUpdateIndividual} className="space-y-6 pt-4 border-t border-slate-100">
                  <div className="bg-[#4169E1]/5 p-4 rounded-[15px] border border-[#4169E1]/10 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800">{selectedEmployee.fullName}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">الرقم القومي: {selectedEmployee.nationalId}</p>
                    </div>
                    <div className="text-left">
                      <span className="inline-block text-xs font-mono bg-white border border-[#4169E1]/20 text-[#4169E1] px-2 py-1 rounded-md font-bold">
                        كود الموظف #{selectedEmployee.employeeCode}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">{selectedEmployee.jobTitle || 'HR'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-2">رصيد الإجازات العارضة السنوي المسموح</label>
                      <Input
                        type="number"
                        min="0"
                        value={allowedCasual}
                        onChange={(e) => setAllowedCasual(parseInt(e.target.value) || 0)}
                        className="rounded-[15px] focus:border-[#4169E1] focus:ring-[#4169E1]/20 font-cairo"
                      />
                      <span className="text-xs text-slate-400 block mt-1">الرصيد الافتراضي للنظام هو 3 أيام</span>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-2">رصيد الإجازات الاعتيادية السنوي المسموح</label>
                      <Input
                        type="number"
                        min="0"
                        value={allowedRegular}
                        onChange={(e) => setAllowedRegular(parseInt(e.target.value) || 0)}
                        className="rounded-[15px] focus:border-[#4169E1] focus:ring-[#4169E1]/20 font-cairo"
                      />
                      <span className="text-xs text-slate-400 block mt-1">الرصيد الافتراضي للنظام هو 21 يوماً</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="block text-sm font-semibold text-slate-600">تطبيق التغييرات على السنة الدراسية:</label>
                    <Input
                      type="text"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-32 rounded-[15px] text-center focus:border-[#4169E1] focus:ring-[#4169E1]/20 font-cairo"
                    />
                  </div>

                  <div className="bg-[#4169E1]/5 text-[#4169E1] p-4 rounded-[15px] text-xs leading-relaxed flex gap-2 items-start border border-[#4169E1]/10">
                    <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                    <p>
                      عند الحفظ، سيقوم النظام تلقائياً وبأثر رجعي بإعادة حساب رصيد الإجازات المستهلك (Consumed) والمتبقي (Remaining) بناءً على المعادلة المحاسبية الديناميكية، وسوف تتأثر طلبات الحركات المستقبلية مباشرة.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isUpdatingIndividual}
                    className="w-full bg-[#4169E1] hover:bg-[#3158c9] text-white py-3 rounded-[15px] font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="size-5" />
                    {isUpdatingIndividual ? 'جاري الحفظ وتحديث الأرصدة...' : 'حفظ التعديلات الفردية'}
                  </Button>
                </form>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-[15px] bg-slate-50/50">
                  <User className="size-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-semibold text-sm">برجاء البحث واختيار موظف لعرض وتعديل أرصدته السنوية</p>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        {/* Right Section: Bulk Adjustment & Policy Notes */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Bulk Update Card */}
          <Card className="border shadow-md rounded-[15px] overflow-hidden">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-700">
                <Users className="size-5 text-amber-500" />
                تحديث الأرصدة لجميع الموظفين (دفعة واحدة)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="bg-amber-50 text-amber-800 p-4 rounded-[15px] text-xs leading-relaxed flex gap-2 items-start border border-amber-200">
                <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-500" />
                <p>
                  <strong>تنبيه هام جداً:</strong> هذا الإجراء سيقوم بتحديث أرصدة الإجازات السنوية المسموحة لجميع الموظفين المسجلين في النظام دفعة واحدة وسيؤثر في عملية حساب الأرصدة المتبقية لكل الموظفين فوراً.
                </p>
              </div>

              <form onSubmit={handleUpdateBulk} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">رصيد الإجازات العارضة الجديد للكل</label>
                  <Input
                    type="number"
                    min="0"
                    value={bulkAllowedCasual}
                    onChange={(e) => setBulkAllowedCasual(parseInt(e.target.value) || 0)}
                    className="rounded-[15px] focus:border-[#4169E1] focus:ring-[#4169E1]/20 font-cairo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">رصيد الإجازات الاعتيادية الجديد للكل</label>
                  <Input
                    type="number"
                    min="0"
                    value={bulkAllowedRegular}
                    onChange={(e) => setBulkAllowedRegular(parseInt(e.target.value) || 0)}
                    className="rounded-[15px] focus:border-[#4169E1] focus:ring-[#4169E1]/20 font-cairo"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isUpdatingBulk}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-[15px] font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-2"
                >
                  <Users className="size-5" />
                  {isUpdatingBulk ? 'جاري تحديث كافة الأرصدة...' : 'تحديث الأرصدة السنوية للجميع دفعة واحدة'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* System Policy Card */}
          <Card className="border shadow-md rounded-[15px] overflow-hidden">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-sm font-bold text-slate-700">
                القواعد المنظمة للأرصدة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs text-slate-600 space-y-2.5">
              <p>
                1. <strong>الإجازة العارضة (Casual):</strong> بحد أقصى مسموح 3 أيام سنوية. في حال رغب الموظف في إجازة عارضة إضافية ورصيده 0، سيقوم النظام تلقائياً بخصمها من الإجازات الاعتيادية (Regular) طالما لم تنفذ.
              </p>
              <p>
                2. <strong>الإجازة الاعتيادية (Regular):</strong> بحد أقصى مسموح 21 يوماً سنوية.
              </p>
              <p>
                3. <strong>الاستثناء ونفاذ الرصيد:</strong> عند نفاذ أرصدة الإجازة المسموحة بالكامل للموظف والموافقة على طلب إجازة إضافية، يتم تسجيل اليوم تلقائياً كـ <strong className="text-red-500">إجازة بدون راتب (UNPAID_LEAVE)</strong> في سجلات الحضور.
              </p>
              <p>
                4. <strong>الأذونات الشهرية:</strong> الأذونات الصباحية والمسائية تحسب بحد أقصى إثنين (2) في الشهر الدراسي الواحد. ويمنع النظام الموظف من طلب الإذن الثالث.
              </p>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
