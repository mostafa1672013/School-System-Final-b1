import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  User, MapPin, Phone, Briefcase, Calendar, FileText, Upload, IdCard,
  DollarSign, CreditCard, Save, X, RefreshCw, Bus, Clock, CalendarDays,
  ShieldAlert, UserCheck, AlertTriangle, ArrowRight, CheckCircle2, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const API_BASE = "http://localhost:4000/api";
const getFileUrl = (path: string | null | undefined) => path ? `http://localhost:4000${path}` : '';

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busRoutes, setBusRoutes] = useState<any[]>([]);

  // Stats
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/employees/profile/${id}`);
      if (!res.ok) throw new Error('فشل جلب بيانات الموظف');
      const data = await res.json();
      setEmployee(data);
    } catch (err) {
      toast.error('حدث خطأ أثناء جلب الملف الشخصي');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBusRoutes = async () => {
    try {
      const res = await fetch(`${API_BASE}/buses/routes`); // Assuming this endpoint exists, or just buses
      if (res.ok) {
        const data = await res.json();
        setBusRoutes(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchBusRoutes();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE}/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast.success(`تم تغيير حالة الموظف إلى ${newStatus === 'ACTIVE' ? 'نشط' : 'غير نشط'}`);
        fetchProfile();
      } else {
        toast.error('فشل تغيير الحالة');
      }
    } catch (err) {
      toast.error('حدث خطأ أثناء تغيير الحالة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    
    // Parse numeric/boolean fields properly before sending
    if (data.baseSalary) data.baseSalary = parseFloat(data.baseSalary as string) as any;
    
    try {
      const res = await fetch(`${API_BASE}/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        toast.success('تم تحديث البيانات بنجاح');
        setIsEditing(false);
        fetchProfile();
      } else {
        toast.error('فشل التحديث');
      }
    } catch (err) {
      toast.error('حدث خطأ أثناء التحديث');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBusUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      isBusSubscribed: formData.get('isBusSubscribed') === 'true',
      busRouteId: formData.get('busRouteId'),
      busSubscriptionType: formData.get('busSubscriptionType')
    };
    
    try {
      const res = await fetch(`${API_BASE}/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        toast.success('تم تحديث بيانات اشتراك الباص');
        fetchProfile();
      } else {
        toast.error('فشل تحديث اشتراك الباص');
      }
    } catch (err) {
      toast.error('حدث خطأ أثناء تحديث اشتراك الباص');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="size-10 text-royal-blue animate-spin" />
          <p className="text-sm text-muted-foreground font-cairo">جاري تحميل الملف الشخصي...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="container mx-auto py-8 px-4 font-cairo text-center">
        <h2 className="text-2xl font-bold text-red-500">لم يتم العثور على الموظف</h2>
        <Link to="/employees">
          <Button className="mt-4 bg-royal-blue rounded-[15px]">العودة لقائمة الموظفين</Button>
        </Link>
      </div>
    );
  }

  const balanceRecord = employee.leaveBalances?.[0] || { totalCasualUsed: 0, totalRegularUsed: 0 };
  const casualRemaining = Math.max(0, (employee.totalAllowedCasual || 7) - balanceRecord.totalCasualUsed);
  const annualRemaining = Math.max(0, (employee.totalAllowedRegular || 21) - balanceRecord.totalRegularUsed);
  
  const currentMonthPrefix = new Date().toISOString().substring(0, 7);
  const permissionsUsedThisMonth = employee.leaveRequests?.filter((r: any) => 
    (r.type === 'AM_PERMISSION' || r.type === 'PM_PERMISSION') && 
    r.date?.startsWith(currentMonthPrefix) && 
    ['PENDING', 'APPROVED_FREE', 'APPROVED_WITH_DEDUCTION', 'APPROVED'].includes(r.status)
  ).length || 0;
  const permissionsRemaining = Math.max(0, 2 - permissionsUsedThisMonth);

  return (
    <div className="container mx-auto py-8 px-4 font-cairo" dir="rtl">
      {/* Back Button */}
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => navigate('/employees')}
          variant="outline"
          className="rounded-[15px] border-royal-blue text-royal-blue hover:bg-royal-blue hover:text-white font-bold transition-all gap-2"
        >
          <ArrowRight className="size-4" /> عودة لقائمة الموظفين
        </Button>
      </div>

      {/* Header Card */}
      <Card className="border-none shadow-md overflow-hidden rounded-[15px] mb-8 relative">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-l from-royal-blue/20 to-transparent" />
        <CardContent className="pt-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="w-24 h-24 rounded-full bg-royal-blue/10 border-4 border-white shadow-lg flex items-center justify-center text-royal-blue overflow-hidden shrink-0">
                <User className="size-12" />
              </div>
              <div className="text-center md:text-right">
                <h1 className="text-3xl font-bold text-slate-800">{employee.fullName}</h1>
                <p className="text-muted-foreground mt-1 flex items-center justify-center md:justify-start gap-2">
                  <Briefcase className="size-4" />
                  {employee.operations} - {employee.department}
                </p>
                <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                  <span className="bg-royal-blue text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                    كود: {employee.employeeCode}
                  </span>
                  <span className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                    <IdCard className="size-3" />
                    {employee.nationalId}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center md:items-end gap-3 min-w-[200px]">
              <div className="w-full">
                <Label className="text-xs text-muted-foreground mb-1 block">حالة الموظف (Status)</Label>
                <Select value={employee.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className={cn(
                    "rounded-[15px] border-2 font-bold",
                    employee.status === 'ACTIVE' ? "border-green-500 text-green-700 bg-green-50" : "border-red-500 text-red-700 bg-red-50"
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-right font-cairo">
                    <SelectItem value="ACTIVE" className="text-green-700 font-bold">نشط (Active)</SelectItem>
                    <SelectItem value="INACTIVE" className="text-red-700 font-bold">غير نشط (Inactive)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {employee.status === 'INACTIVE' && (
                <span className="text-xs text-red-500 font-bold flex items-center gap-1 bg-red-50 px-2 py-1 rounded-md">
                  <ShieldAlert className="size-3" /> تم تعطيل صلاحيات الدخول
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="bio" className="w-full">
        <TabsList className="w-full justify-start bg-transparent border-b border-royal-blue/20 rounded-none pb-0 h-auto gap-6 px-4">
          <TabsTrigger value="bio" className="data-[state=active]:border-b-2 data-[state=active]:border-royal-blue data-[state=active]:text-royal-blue bg-transparent shadow-none rounded-none text-md py-3 font-bold">
            <User className="size-4 ml-2" />
            البيانات الأساسية (Bio)
          </TabsTrigger>
          <TabsTrigger value="bus" className="data-[state=active]:border-b-2 data-[state=active]:border-royal-blue data-[state=active]:text-royal-blue bg-transparent shadow-none rounded-none text-md py-3 font-bold">
            <Bus className="size-4 ml-2" />
            مزايا الباص (Bus)
          </TabsTrigger>
          <TabsTrigger value="attendance" className="data-[state=active]:border-b-2 data-[state=active]:border-royal-blue data-[state=active]:text-royal-blue bg-transparent shadow-none rounded-none text-md py-3 font-bold">
            <CalendarDays className="size-4 ml-2" />
            الحضور والأرشيف المالي
          </TabsTrigger>
        </TabsList>

        {/* Bio Tab */}
        <TabsContent value="bio" className="mt-6">
          <form onSubmit={handleUpdate} className="space-y-6">
            
            {/* Action Bar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-[15px] shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-full", isEditing ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600")}>
                  {isEditing ? <Pencil className="size-5" /> : <CheckCircle2 className="size-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{isEditing ? "وضع التعديل نشط" : "وضع العرض"}</h3>
                  <p className="text-xs text-muted-foreground">{isEditing ? "يمكنك الآن تعديل البيانات الوظيفية والتعاقدية" : "جميع البيانات للقراءة فقط"}</p>
                </div>
              </div>
              <div className="flex gap-3">
                {isEditing && (
                  <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white rounded-[15px] px-6 font-bold">
                    {isSubmitting ? <RefreshCw className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                    حفظ التعديلات
                  </Button>
                )}
                <Button
                  type="button"
                  variant={isEditing ? "outline" : "default"}
                  className={cn("rounded-[15px] transition-colors font-bold", !isEditing && "bg-royal-blue hover:bg-royal-blue/90 text-white")}
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? <><X className="size-4 ml-2"/> إلغاء</> : <><Pencil className="size-4 ml-2"/> تفعيل وضع التعديل</>}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Job Data Card */}
              <Card className="border-none shadow-sm overflow-hidden rounded-[15px]">
                <CardHeader className="bg-slate-50 border-b pb-4">
                  <div className="flex items-center gap-2">
                    <Briefcase className="size-5 text-royal-blue" />
                    <CardTitle className="text-royal-blue text-lg">البيانات الوظيفية</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Department */}
                  <div className="space-y-2">
                    <Label className="text-royal-blue font-bold">القسم / الإدارة</Label>
                    {isEditing ? (
                      <Input name="department" defaultValue={employee.department} className="rounded-[15px]" required />
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-[15px] border border-slate-100 flex items-center gap-2">
                        <Briefcase className="size-4 text-muted-foreground" /> {employee.department || 'غير مسجل'}
                      </div>
                    )}
                  </div>
                  {/* Job Title */}
                  <div className="space-y-2">
                    <Label className="text-royal-blue font-bold">المسمى الوظيفي</Label>
                    {isEditing ? (
                      <Input name="jobTitle" defaultValue={employee.jobTitle || employee.operations} className="rounded-[15px]" required />
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-[15px] border border-slate-100 flex items-center gap-2">
                        <UserCheck className="size-4 text-muted-foreground" /> {employee.jobTitle || employee.operations || 'غير مسجل'}
                      </div>
                    )}
                  </div>
                  {/* Status */}
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-royal-blue font-bold">حالة الموظف</Label>
                    <div className="p-3 bg-slate-50 rounded-[15px] border border-slate-100 flex items-center gap-2">
                      {employee.status === 'ACTIVE' ? (
                        <><CheckCircle2 className="size-4 text-green-600" /> <span className="text-green-700 font-bold">نشط</span></>
                      ) : (
                        <><ShieldAlert className="size-4 text-red-600" /> <span className="text-red-700 font-bold">غير نشط</span></>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contract Data Card */}
              <Card className="border-none shadow-sm overflow-hidden rounded-[15px]">
                <CardHeader className="bg-slate-50 border-b pb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="size-5 text-royal-blue" />
                    <CardTitle className="text-royal-blue text-lg">بيانات التعاقد</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Join Date */}
                  <div className="space-y-2">
                    <Label className="text-royal-blue font-bold">تاريخ التعيين (Hire Date)</Label>
                    {isEditing ? (
                      <Input type="date" name="joinDate" defaultValue={employee.joinDate?.replace(/\//g, '-')} className="rounded-[15px]" required />
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-[15px] border border-slate-100 flex items-center gap-2">
                        <Calendar className="size-4 text-muted-foreground" /> {employee.joinDate}
                      </div>
                    )}
                  </div>
                  {/* Contract Type */}
                  <div className="space-y-2">
                    <Label className="text-royal-blue font-bold">نوع العقد</Label>
                    {isEditing ? (
                      <Input name="contractType" defaultValue={employee.contractType} placeholder="مثال: محدد المدة" className="rounded-[15px]" />
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-[15px] border border-slate-100 flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" /> {employee.contractType || 'غير مسجل'}
                      </div>
                    )}
                  </div>
                  {/* Contract Start */}
                  <div className="space-y-2">
                    <Label className="text-royal-blue font-bold">بداية العقد</Label>
                    {isEditing ? (
                      <Input type="date" name="contractStartDate" defaultValue={employee.contractStartDate?.replace(/\//g, '-')} className="rounded-[15px]" required />
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-[15px] border border-slate-100 flex items-center gap-2">
                        <CalendarDays className="size-4 text-muted-foreground" /> {employee.contractStartDate}
                      </div>
                    )}
                  </div>
                  {/* Contract End */}
                  <div className="space-y-2">
                    <Label className="text-royal-blue font-bold">نهاية العقد</Label>
                    {isEditing ? (
                      <Input type="date" name="contractEndDate" defaultValue={employee.contractEndDate?.replace(/\//g, '-')} className="rounded-[15px]" required />
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-[15px] border border-slate-100 flex items-center gap-2">
                        <CalendarDays className="size-4 text-muted-foreground" /> {employee.contractEndDate}
                      </div>
                    )}
                  </div>
                  {/* Base Salary */}
                  <div className="space-y-2">
                    <Label className="text-royal-blue font-bold">الراتب الأساسي</Label>
                    {isEditing ? (
                      <Input type="number" name="baseSalary" defaultValue={employee.baseSalary} className="rounded-[15px]" required />
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-[15px] border border-slate-100 flex items-center gap-2 font-bold text-green-700">
                        <DollarSign className="size-4 text-green-600" /> {employee.baseSalary?.toLocaleString() || 0} ج.م
                      </div>
                    )}
                  </div>
                  {/* Payment Method */}
                  <div className="space-y-2">
                    <Label className="text-royal-blue font-bold">طريقة الدفع</Label>
                    {isEditing ? (
                      <Select name="paymentMethod" defaultValue={employee.paymentMethod || 'cash'}>
                        <SelectTrigger className="rounded-[15px]"><SelectValue /></SelectTrigger>
                        <SelectContent className="text-right font-cairo">
                          <SelectItem value="cash">كاش</SelectItem>
                          <SelectItem value="bank">تحويل بنكي</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-[15px] border border-slate-100 flex items-center gap-2">
                        <CreditCard className="size-4 text-muted-foreground" /> {employee.paymentMethod === 'bank' ? 'تحويل بنكي' : 'كاش'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Attachments Preview Card */}
            <Card className="border-none shadow-sm overflow-hidden rounded-[15px]">
              <CardHeader className="bg-slate-50 border-b pb-4">
                <div className="flex items-center gap-2">
                  <Upload className="size-5 text-royal-blue" />
                  <CardTitle className="text-royal-blue text-lg">المرفقات والمستندات (Attachments)</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Avatar */}
                <div className="space-y-3">
                  <Label className="text-royal-blue font-bold flex items-center gap-2"><User className="size-4" /> الصورة الشخصية</Label>
                  {employee.avatar ? (
                    <div className="border border-slate-200 rounded-[15px] overflow-hidden group relative aspect-square">
                      <img src={getFileUrl(employee.avatar)} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button type="button" variant="secondary" className="rounded-full font-bold" onClick={() => window.open(getFileUrl(employee.avatar), '_blank')}>
                          معاينة الصورة
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-300 bg-slate-50 rounded-[15px] aspect-square flex flex-col items-center justify-center p-4 text-center">
                      <User className="size-10 text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500 font-bold">لم يتم رفع هذا المستند بعد</p>
                    </div>
                  )}
                </div>

                {/* National ID */}
                <div className="space-y-3">
                  <Label className="text-royal-blue font-bold flex items-center gap-2"><IdCard className="size-4" /> صورة الرقم القومي</Label>
                  {employee.nationalIdImage ? (
                    <div className="border border-slate-200 rounded-[15px] overflow-hidden group relative aspect-video">
                      <img src={getFileUrl(employee.nationalIdImage)} alt="National ID" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button type="button" variant="secondary" className="rounded-full font-bold" onClick={() => window.open(getFileUrl(employee.nationalIdImage), '_blank')}>
                          معاينة البطاقة
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-300 bg-slate-50 rounded-[15px] aspect-video flex flex-col items-center justify-center p-4 text-center">
                      <IdCard className="size-10 text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500 font-bold">لم يتم رفع هذا المستند بعد</p>
                    </div>
                  )}
                </div>

                {/* Contract PDF */}
                <div className="space-y-3">
                  <Label className="text-royal-blue font-bold flex items-center gap-2"><FileText className="size-4" /> عقد العمل الموثق</Label>
                  {employee.contractPdf ? (
                    <div className="border border-slate-200 bg-red-50 rounded-[15px] aspect-video flex flex-col items-center justify-center p-6 text-center group cursor-pointer" onClick={() => window.open(employee.contractPdf, '_blank')}>
                      <FileText className="size-12 text-red-500 mb-3 group-hover:scale-110 transition-transform" />
                      <Button type="button" className="bg-red-600 hover:bg-red-700 text-white rounded-full font-bold shadow-md pointer-events-none">
                        فتح وطباعة المستند
                      </Button>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-300 bg-slate-50 rounded-[15px] aspect-video flex flex-col items-center justify-center p-4 text-center">
                      <FileText className="size-10 text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500 font-bold">لم يتم رفع هذا المستند بعد</p>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>

          </form>
        </TabsContent>

        {/* Bus Tab */}
        <TabsContent value="bus" className="mt-6">
          <Card className="border-none shadow-md overflow-hidden rounded-[15px]">
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle className="text-royal-blue flex items-center gap-2"><Bus className="size-5" /> إعدادات اشتراك الباص</CardTitle>
              <CardDescription>إدارة اشتراك الموظف في باص المدرسة والاستقطاعات الشهرية</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleBusUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold">حالة الاشتراك</Label>
                    <Select name="isBusSubscribed" defaultValue={employee.isBusSubscribed ? "true" : "false"}>
                      <SelectTrigger className="rounded-[15px]"><SelectValue /></SelectTrigger>
                      <SelectContent className="text-right">
                        <SelectItem value="true" className="text-green-600 font-bold">مشترك</SelectItem>
                        <SelectItem value="false" className="text-red-600 font-bold">غير مشترك</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="font-bold">خط الباص</Label>
                    <Select name="busRouteId" defaultValue={employee.busRouteId || "none"}>
                      <SelectTrigger className="rounded-[15px]"><SelectValue placeholder="اختر خط الباص" /></SelectTrigger>
                      <SelectContent className="text-right">
                        <SelectItem value="none" className="text-muted-foreground">-- لا يوجد --</SelectItem>
                        {busRoutes?.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.name} - {r.monthlyFee} ج.م</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">نوع الاشتراك (تأثير مالي)</Label>
                    <Select name="busSubscriptionType" defaultValue={employee.busSubscriptionType === 'REGULAR' || !employee.busSubscriptionType ? "none" : employee.busSubscriptionType}>
                      <SelectTrigger className="rounded-[15px]"><SelectValue /></SelectTrigger>
                      <SelectContent className="text-right">
                        <SelectItem value="none" className="text-muted-foreground">-- لا يوجد --</SelectItem>
                        <SelectItem value="passenger">راكب عادي (خصم 50%)</SelectItem>
                        <SelectItem value="SUPERVISOR">مشرف باص (إعفاء 100%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={isSubmitting} className="bg-royal-blue hover:bg-royal-blue/90 text-white rounded-[15px] px-8">
                    {isSubmitting ? <RefreshCw className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                    حفظ وإعادة حساب الاستقطاع
                  </Button>
                </div>
              </form>

              {/* Financial Card display for Bus */}
              {employee.isBusSubscribed && employee.busRoute && (
                <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-100 rounded-[15px] shadow-inner">
                  <h3 className="font-bold text-lg text-royal-blue mb-4">الملخص المالي لاشتراك الباص</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-white rounded-[10px] shadow-sm">
                      <p className="text-xs text-muted-foreground">خط الباص</p>
                      <p className="font-bold text-slate-800 mt-1">{employee.busRoute.name}</p>
                    </div>
                    <div className="p-4 bg-white rounded-[10px] shadow-sm">
                      <p className="text-xs text-muted-foreground">التكلفة الكاملة</p>
                      <p className="font-bold text-slate-800 mt-1">{employee.busRoute.monthlyFee} ج.م</p>
                    </div>
                    <div className="p-4 bg-white rounded-[10px] shadow-sm">
                      <p className="text-xs text-muted-foreground">دعم المدرسة</p>
                      <p className="font-bold text-green-600 mt-1">
                        {employee.busSubscriptionType === 'SUPERVISOR' ? '100%' : '50%'}
                      </p>
                    </div>
                    <div className="p-4 bg-royal-blue text-white rounded-[10px] shadow-sm">
                      <p className="text-xs text-blue-100">الصافي المستقطع شهرياً</p>
                      <p className="font-bold text-xl mt-1">
                        {employee.busSubscriptionType === 'SUPERVISOR' ? 0 : employee.busRoute.monthlyFee * 0.5} ج.م
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="mt-6">
          <Card className="border-none shadow-md overflow-hidden rounded-[15px]">
            <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-royal-blue flex items-center gap-2"><Clock className="size-5" /> الشفافية والأرصدة الزمنية</CardTitle>
              <div className="flex items-center gap-2" dir="rtl">
                <Label className="text-sm font-bold text-royal-blue">من:</Label>
                <Input type="date" dir="rtl" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="rounded-[10px] w-auto text-sm text-right" />
                <Label className="text-sm font-bold text-royal-blue mr-2">إلى:</Label>
                <Input type="date" dir="rtl" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="rounded-[10px] w-auto text-sm text-right" />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              
              {/* Leave Balances Card */}
              <div className="bg-slate-100 p-4 rounded-[15px] mb-6 border border-slate-200">
                <div className="font-bold text-royal-blue mb-3 text-lg flex items-center gap-2">
                  <CalendarDays className="size-5" /> أرصدة الإجازات والأذونات المتبقية
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-[10px] shadow-sm flex justify-between items-center border border-slate-100">
                    <span className="font-bold text-slate-700">إجازة اعتيادية متبقية (سنوي):</span>
                    <span className="text-xl font-black text-royal-blue">{annualRemaining}</span>
                  </div>
                  <div className="bg-white p-3 rounded-[10px] shadow-sm flex justify-between items-center border border-slate-100">
                    <span className="font-bold text-slate-700">إجازة عارضة متبقية (سنوي):</span>
                    <span className="text-xl font-black text-royal-blue">{casualRemaining}</span>
                  </div>
                  <div className="bg-white p-3 rounded-[10px] shadow-sm flex justify-between items-center border border-slate-100">
                    <span className="font-bold text-slate-700">أذونات متبقية (هذا الشهر):</span>
                    <span className="text-xl font-black text-royal-blue">{permissionsRemaining}</span>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="p-4 rounded-[15px] bg-red-50 border border-red-100 text-center">
                  <p className="text-red-800 font-bold text-sm">أيام الغياب الفعلي</p>
                  <p className="text-3xl font-black text-red-600 mt-2">
                    {employee.attendance?.filter((a: any) => a.status === 'absent' && a.date >= dateRange.start && a.date <= dateRange.end).length || 0}
                  </p>
                </div>
                <div className="p-4 rounded-[15px] bg-orange-50 border border-orange-100 text-center">
                  <p className="text-orange-800 font-bold text-sm">التأخير الصباحي (دقائق)</p>
                  <p className="text-3xl font-black text-orange-600 mt-2">
                    {employee.attendance?.filter((a: any) => a.date >= dateRange.start && a.date <= dateRange.end).reduce((sum: number, a: any) => sum + (a.delayMinutes || 0), 0) || 0}
                  </p>
                </div>
                <div className="p-4 rounded-[15px] bg-yellow-50 border border-yellow-100 text-center">
                  <p className="text-yellow-800 font-bold text-sm">الانصراف المبكر (دقائق)</p>
                  <p className="text-3xl font-black text-yellow-600 mt-2">
                    {employee.attendance?.filter((a: any) => a.date >= dateRange.start && a.date <= dateRange.end).reduce((sum: number, a: any) => sum + (a.earlyDeparture || 0), 0) || 0}
                  </p>
                </div>
                <div className="p-4 rounded-[15px] bg-green-50 border border-green-100 text-center">
                  <p className="text-green-800 font-bold text-sm">إجازات/أذونات معتمدة</p>
                  <p className="text-3xl font-black text-green-600 mt-2">
                    {employee.leaveRequests?.filter((r: any) => r.status.includes('APPROVED')).length || 0}
                  </p>
                </div>
              </div>

              {/* Attendance Table */}
              <h3 className="font-bold text-lg mb-4 text-slate-800">تفاصيل الحركات للفترة المحددة</h3>
              <div className="overflow-x-auto border rounded-[15px]">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">الحضور</th>
                      <th className="p-3">الانصراف</th>
                      <th className="p-3">تأخير</th>
                      <th className="p-3">مبكر</th>
                      <th className="p-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employee.attendance
                      ?.filter((a: any) => a.date >= dateRange.start && a.date <= dateRange.end)
                      .map((record: any) => (
                      <tr key={record.id} className="border-b last:border-0 hover:bg-slate-50/50">
                        <td className="p-3 font-bold">{record.date}</td>
                        <td className="p-3">{record.checkIn || '-'}</td>
                        <td className="p-3">{record.checkOut || '-'}</td>
                        <td className="p-3 text-orange-600 font-bold">{record.delayMinutes > 0 ? `${record.delayMinutes} د` : '-'}</td>
                        <td className="p-3 text-yellow-600 font-bold">{record.earlyDeparture > 0 ? `${record.earlyDeparture} د` : '-'}</td>
                        <td className="p-3">
                          <span className={cn(
                            "px-2 py-1 rounded text-xs font-bold",
                            record.status === 'present' ? "bg-green-100 text-green-800" :
                            record.status === 'absent' ? "bg-red-100 text-red-800" :
                            (record.status === 'LEAVE' || record.status === 'إجازة معفاة') ? "bg-[#4169E1]/10 text-[#4169E1]" :
                            (record.status === 'UNPAID_LEAVE' || record.status === 'غياب بدون راتب') ? "bg-red-100 text-red-800" :
                            "bg-slate-100 text-slate-800"
                          )}>
                            {record.status === 'present' ? 'حاضر' : 
                             record.status === 'absent' ? 'غائب' : 
                             (record.status === 'LEAVE' || record.status === 'إجازة معفاة') ? '🌙 إجازة معفاة' :
                             (record.status === 'UNPAID_LEAVE' || record.status === 'غياب بدون راتب') ? 'غياب بدون راتب' :
                             record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!employee.attendance || employee.attendance.filter((a: any) => a.date >= dateRange.start && a.date <= dateRange.end).length === 0) && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground">لا توجد حركات حضور وانصراف مسجلة في هذه الفترة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
