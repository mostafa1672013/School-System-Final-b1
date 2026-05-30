import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format, addMonths, addYears, differenceInYears } from "date-fns"
import {
  IdCard,
  User,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  CreditCard,
  Upload,
  CheckCircle2,
  Search,
  Save,
  X,
  FileText,
  RefreshCw,
  AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { useAuthStore } from '@/stores/authStore'

const API_BASE = "/api"

const fetch = (url: RequestInfo | URL, options: RequestInit = {}) => {
  const token = useAuthStore.getState().token;
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
  return window.fetch(url, { ...options, headers });
};

const govCodes: Record<string, string> = {
  "01": "القاهرة", "02": "الإسكندرية", "03": "بورسعيد", "04": "السويس",
  "11": "دمياط", "12": "الدقهلية", "13": "الشرقية", "14": "القليوبية",
  "15": "كفر الشيخ", "16": "الغربية", "17": "المنوفية", "18": "البحيرة",
  "19": "الإسماعيلية", "21": "الجيزة", "22": "بني سويف", "23": "الفيوم",
  "24": "المنيا", "25": "أسيوط", "26": "سوهاج", "27": "قنا",
  "28": "أسوان", "29": "الأقصر", "31": "البحر الأحمر", "32": "الوادى الجديد",
  "33": "مطروح", "34": "شمال سيناء", "35": "جنوب سيناء"
}

const formSchema = z.object({
  fullName: z.string().min(3, "الاسم يجب أن يكون 3 أحرف على الأقل"),
  nationalId: z.string().length(14, "الرقم القومي يجب أن يكون 14 رقماً"),
  dateOfBirth: z.string().min(1, "تاريخ الميلاد مطلوب"),
  gender: z.string().min(1, "النوع مطلوب"),
  phoneNumber: z.string().min(10, "رقم الهاتف يجب أن يكون 10 أرقام على الأقل"),
  address: z.string().min(5, "العنوان مطلوب"),
  governorate: z.string().min(1, "المحافظة مطلوبة"),
  employeeCode: z.coerce.number().min(1, "كود الموظف مطلوب"),
  department: z.string().min(1, "برجاء اختيار القسم"),
  jobTitle: z.string().min(1, "برجاء اختيار المسمى الوظيفي"),
  shiftId: z.string().min(1, "برجاء اختيار نظام المناولة"),
  joinDate: z.string().min(1, "تاريخ التعيين مطلوب"),
  contractStartDate: z.string().min(1, "بداية العقد مطلوبة"),
  contractDuration: z.string().min(1, "مدة العقد مطلوبة"),
  contractEndDate: z.string().min(1, "نهاية العقد مطلوبة"),
  baseSalary: z.string().min(1, "الراتب الأساسي مطلوب"),
  paymentMethod: z.string().min(1, "طريقة الصرف مطلوبة"),
  iban: z.string().optional(),
  reducedHourPosition: z.string().optional(),
  busSubscription: z.union([z.boolean(), z.string()]).optional(),
  busSubscriptionType: z.string().optional(),
  busRouteId: z.string().optional(),
})

type Employee = z.infer<typeof formSchema> & { id?: string }

export default function Employees() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [employeeCode, setEmployeeCode] = useState("")
  const [shifts, setShifts] = useState<any[]>([])
  const [isIdChecking, setIsIdChecking] = useState(false)
  const [idExists, setIdExists] = useState<boolean | null>(null)
  const [isVerifyingMachine, setIsVerifyingMachine] = useState(false)
  const [deviceConnected, setDeviceConnected] = useState<boolean>(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [missingEmployees, setMissingEmployees] = useState<any[]>([])
  const [isReconciling, setIsReconciling] = useState(false)
  const [allEmployees, setAllEmployees] = useState<any[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [personalPhotoFile, setPersonalPhotoFile] = useState<File | null>(null)
  const [contractPdfFile, setContractPdfFile] = useState<File | null>(null)
  
  // UI States
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10;

  // Fetch all employees for quick access
  const fetchAllEmployees = () => {
    fetch(`${API_BASE}/employees`)
      .then(res => res.json())
      .then(data => setAllEmployees(data))
      .catch(err => console.error("Error fetching all employees", err))
  }

  useEffect(() => {
    fetchAllEmployees()
  }, [])

  // Fetch missing employees (Reconciliation)
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
  }

  // Poll device status and reconciliation
  const handleManualReconnect = async () => {
    setIsReconnecting(true)
    try {
      const response = await fetch(`${API_BASE}/attendance/device-reconnect`, { method: 'POST' })
      const data = await response.json()
      setDeviceConnected(data.connected)
      if (data.connected) {
        toast.success("تم الاتصال بالماكينة بنجاح")
      } else {
        toast.error("فشل الاتصال بالماكينة، تأكد من الكابلات")
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء محاولة الاتصال")
    } finally {
      setIsReconnecting(false)
    }
  }

  // Poll device status
  useEffect(() => {
    const checkStatus = () => {
      fetch(`${API_BASE}/attendance/device-status`)
        .then(res => res.json())
        .then(data => setDeviceConnected(data.connected))
        .catch(() => setDeviceConnected(false))
    }
    checkStatus() // Check immediately
    fetchReconciliation() // Check missing immediately
    const interval = setInterval(() => {
      checkStatus();
    }, 10000); // Only poll status, do NOT poll heavy reconciliation
    return () => clearInterval(interval)
  }, [])

  // Fetch shifts
  useEffect(() => {
    fetch(`${API_BASE}/shifts`)
      .then(res => res.json())
      .then(data => setShifts(data))
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      fullName: "",
      nationalId: "",
      dateOfBirth: "",
      gender: "",
      phoneNumber: "",
      address: "",
      governorate: "",
      employeeCode: 0,
      department: "",
      jobTitle: "",
      shiftId: "",
      joinDate: format(new Date(), "yyyy-MM-dd"),
      contractStartDate: format(new Date(), "yyyy-MM-dd"),
      contractDuration: "1",
      contractEndDate: format(addYears(new Date(), 1), "yyyy-MM-dd"),
      baseSalary: "",
      paymentMethod: "كاش",
      iban: "",
      reducedHourPosition: "end",
      busSubscription: "false",
      busSubscriptionType: "none",
      busRouteId: "",
    },
  })

  // Fetch next employee code from DB on mount
  useEffect(() => {
    if (!selectedEmployee) {
      fetch(`${API_BASE}/employees/next-code`)
        .then(res => res.json())
        .then(data => {
          const nextId = parseInt(data.nextCode) || 1;
          setEmployeeCode(nextId.toString());
          form.setValue("employeeCode", nextId);
        })
        .catch(() => {
          setEmployeeCode("1");
          form.setValue("employeeCode", 1);
        });
    }
  }, [selectedEmployee, form])

  // National ID Auto-parse
  const watchNationalId = form.watch("nationalId")
  useEffect(() => {
    if (watchNationalId && watchNationalId.length === 14) {
      const century = watchNationalId[0] === '2' ? '19' : '20'
      const year = watchNationalId.substring(1, 3)
      const month = watchNationalId.substring(3, 5)
      const day = watchNationalId.substring(5, 7)
      const govCode = watchNationalId.substring(7, 9)
      const genderCode = parseInt(watchNationalId.substring(12, 13))

      const birthDate = `${century}${year}-${month}-${day}`
      const gender = genderCode % 2 === 0 ? "أنثى" : "ذكر"
      const governorate = govCodes[govCode] || "غير محدد"

      const currentBirthDate = form.getValues("dateOfBirth")
      if (currentBirthDate !== birthDate) {
        form.setValue("dateOfBirth", birthDate)
        form.setValue("gender", gender)
        form.setValue("governorate", governorate)
        toast.info("تم تحديث البيانات من الرقم القومي", { duration: 2000 })
      }
    } else {
      setIdExists(null)
    }
  }, [watchNationalId, form])

  // Debounced ID Existence Check
  useEffect(() => {
    const checkId = async () => {
      if (watchNationalId && watchNationalId.length === 14 && !selectedEmployee) {
        setIsIdChecking(true)
        try {
          const res = await fetch(`${API_BASE}/employees?search=${watchNationalId}`)
          const data = await res.json()
          const exists = data.some((emp: any) => emp.nationalId === watchNationalId)
          setIdExists(exists)
          if (exists) {
            form.setError("nationalId", { type: "manual", message: "هذا الرقم القومي مسجل لموظف آخر بالفعل" })
          } else {
            form.clearErrors("nationalId")
          }
        } catch (error) {
          console.error("Error checking ID:", error)
        } finally {
          setIsIdChecking(false)
        }
      } else {
        setIdExists(null)
      }
    }

    const timer = setTimeout(checkId, 700)
    return () => clearTimeout(timer)
  }, [watchNationalId, selectedEmployee, form])

  // Contract End Date Auto-calc
  const watchStartDate = form.watch("contractStartDate")
  const watchDuration = form.watch("contractDuration")
  useEffect(() => {
    if (watchStartDate && watchDuration) {
      const start = new Date(watchStartDate)
      const duration = parseFloat(watchDuration)
      let end;
      if (duration === 0.5) {
        end = addMonths(start, 6)
      } else {
        end = addYears(start, duration)
      }
      form.setValue("contractEndDate", format(end, "yyyy-MM-dd"))
    }
  }, [watchStartDate, watchDuration, form])

  // Determine if selected shift is special (needs reduced hours position)
  const watchShiftId = form.watch("shiftId");
  const selectedShift = shifts.find(s => s.id.toString() === watchShiftId);
  const isSpecialShift = selectedShift && (selectedShift.shiftName === "مناوبة ذوي الاحتياجات الخاصة" || selectedShift.shiftName === "مناوبة رعاية الطفل" || selectedShift.shiftName.includes("خاصة") || selectedShift.shiftName.includes("طفل"));

  // Search logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        fetch(`${API_BASE}/employees?search=${encodeURIComponent(searchTerm)}`)
          .then(res => res.json())
          .then(data => setSearchResults(data))
      } else {
        setSearchResults([])
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const handleSelectEmployee = (emp: any) => {
    setSelectedEmployee(emp)
    setSearchTerm("")
    setSearchResults([])
    setViewMode('form')

    // Map backend model to form schema
    const shiftRevMap: Record<number, string> = {}
    shifts.forEach(s => shiftRevMap[s.id] = s.shiftName)

    const genderRevMap: Record<string, string> = {
      "male": "ذكر",
      "female": "أنثى"
    }

    const paymentMethodRevMap: Record<string, string> = {
      "cash": "كاش",
      "bank": "بنك"
    }

    form.reset({
      fullName: emp.fullName || "",
      nationalId: emp.nationalId || "",
      dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.replace(/\//g, '-') : "",
      gender: genderRevMap[emp.gender] || emp.gender || "",
      phoneNumber: emp.phoneNumber || "",
      address: emp.address || "",
      governorate: emp.governorate || "",
      employeeCode: emp.employeeCode || 1,
      department: emp.department || "",
      jobTitle: emp.operations || "",
      shiftId: emp.shiftId ? emp.shiftId.toString() : "",
      joinDate: emp.joinDate ? emp.joinDate.replace(/\//g, '-') : "",
      contractStartDate: emp.contractStartDate ? emp.contractStartDate.replace(/\//g, '-') : "",
      contractDuration: emp.contractDuration ? emp.contractDuration.toString() : "1",
      contractEndDate: emp.contractEndDate ? emp.contractEndDate.replace(/\//g, '-') : "",
      baseSalary: emp.baseSalary ? emp.baseSalary.toString() : "",
      paymentMethod: paymentMethodRevMap[emp.paymentMethod] || emp.paymentMethod || "كاش",
      iban: emp.iban || "",
      reducedHourPosition: emp.reducedHourPosition || "end",
      busSubscription: emp.isBusSubscribed ? "true" : "false",
      busSubscriptionType: emp.busSubscriptionType || "none",
      busRouteId: emp.busRouteId || "",
    })
    setEmployeeCode(emp.employeeCode.toString())
    toast.success("تم تحميل بيانات الموظف")
  }

  const handleCancelEdit = () => {
    setSelectedEmployee(null)
    setUploadedFiles([])
    form.reset({
      fullName: "",
      nationalId: "",
      dateOfBirth: "",
      gender: "",
      phoneNumber: "",
      address: "",
      governorate: "",
      employeeCode: 0,
      department: "",
      jobTitle: "",
      shiftId: "",
      joinDate: format(new Date(), "yyyy-MM-dd"),
      contractStartDate: format(new Date(), "yyyy-MM-dd"),
      contractDuration: "1",
      contractEndDate: format(addYears(new Date(), 1), "yyyy-MM-dd"),
      baseSalary: "",
      paymentMethod: "كاش",
      iban: "",
      reducedHourPosition: "end",
      busSubscription: "false",
      busSubscriptionType: "none",
      busRouteId: "",
    })
    // Increment locally for immediate feedback
    const currentCode = parseInt(employeeCode) || 0;
    const nextCode = currentCode + 1;
    setEmployeeCode(nextCode.toString());
    form.setValue("employeeCode", nextCode);

    // Verify with DB
    fetch(`${API_BASE}/employees/next-code`)
      .then(res => res.json())
      .then(data => {
        const serverNextId = data.nextCode || nextCode;
        setEmployeeCode(serverNextId.toString());
        form.setValue("employeeCode", serverNextId);
      })
      .catch(() => {
        // Silent fallback
      });
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'الصورة الشخصية' || type === 'personal_photo') {
      setPersonalPhotoFile(file);
    } else if (type === 'عقد العمل' || type === 'contract_pdf') {
      setContractPdfFile(file);
    }
    setUploadedFiles(prev => [...prev, file.name]);
    toast.success(`تم اختيار ${type} المرفق وسيتم رفعه عند الحفظ`);
  };

  const genderMap: Record<string, string> = {
    "ذكر": "male",
    "أنثى": "female"
  }

  const paymentMethodMap: Record<string, string> = {
    "كاش": "cash",
    "بنك": "bank"
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    try {
      const formData = new FormData();
      
      formData.append('active', "true");
      formData.append('auditUser', "Admin");
      formData.append('isBusSubscribed', (values.busSubscription === "true" || values.busSubscription === true) ? "true" : "false");
      if (values.busSubscriptionType && values.busSubscriptionType !== "none") formData.append('busSubscriptionType', values.busSubscriptionType);
      if (values.busRouteId && values.busRouteId !== "none") formData.append('busRouteId', values.busRouteId);
      
      formData.append('dateOfBirth', values.dateOfBirth.replace(/-/g, '/'));
      formData.append('joinDate', values.joinDate.replace(/-/g, '/'));
      formData.append('contractStartDate', values.contractStartDate.replace(/-/g, '/'));
      formData.append('contractEndDate', values.contractEndDate.replace(/-/g, '/'));
      formData.append('gender', genderMap[values.gender] || values.gender);
      formData.append('paymentMethod', paymentMethodMap[values.paymentMethod] || values.paymentMethod);
      formData.append('operations', values.jobTitle);
      formData.append('employeeCode', parseInt(values.employeeCode as any).toString());
      if (values.shiftId) formData.append('shiftId', parseInt(values.shiftId).toString());
      if (values.baseSalary) formData.append('baseSalary', parseFloat(values.baseSalary).toString());
      if (values.contractDuration) formData.append('contractDuration', parseFloat(values.contractDuration).toString());
      formData.append('fullName', values.fullName);
      formData.append('nationalId', values.nationalId);
      formData.append('phoneNumber', values.phoneNumber);
      formData.append('address', values.address);
      formData.append('governorate', values.governorate);
      formData.append('department', values.department);
      
      if (selectedEmployee) {
        formData.append('oldData', JSON.stringify(selectedEmployee));
      }
      
      if (personalPhotoFile) formData.append('personal_photo', personalPhotoFile);
      if (contractPdfFile) formData.append('contract_pdf', contractPdfFile);

      const url = selectedEmployee ? `${API_BASE}/employees/${selectedEmployee.id}` : `${API_BASE}/employees`
      const method = selectedEmployee ? 'PATCH' : 'POST'

      setIsSubmitting(true)
      setIsVerifyingMachine(false)
      
      const response = await fetch(url, {
        method,
        body: formData
      })

      const result = await response.json().catch(() => ({}));
      
      if (response.status === 409 || result.error === 'NATIONAL_ID_EXISTS') {
        form.setError("nationalId", { 
          type: "manual", 
          message: "هذا الموظف مسجل من قبل بهذا الرقم القومي" 
        })
        toast.error("هذا الرقم القومي مسجل بالفعل لموظف آخر")
        setIsSubmitting(false)
        return
      }

      if (!response.ok) {
        const errorMsg = result.error || "حدث خطأ أثناء الحفظ";
        toast.error(errorMsg, {
          duration: 6000,
          className: "font-cairo rounded-[15px] border-red-200 bg-red-50 text-red-900"
        });
        setIsSubmitting(false);
        return;
      }

      toast.success(selectedEmployee ? "تم تحديث بيانات وحالة الموظف بنجاح" : "تم حفظ الموظف الجديد بنجاح", {
        className: "font-cairo rounded-[15px] border-green-200 bg-green-50 text-green-900"
      });
      fetchAllEmployees()
      setUploadedFiles([])
      handleCancelEdit()
    } catch (error: any) {
      toast.error("حدث خطأ أثناء الحفظ")
    } finally {
      setIsSubmitting(false)
      setIsVerifyingMachine(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 font-cairo" dir="rtl">
      <div className="flex flex-col gap-6">
        
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

        {/* ZKTeco Status Badge (moved here to show in both modes) */}
        <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-[15px] shadow-sm border border-royal-blue/10 animate-in fade-in slide-in-from-top-4">
          <div className={cn(
            "px-6 py-2 rounded-full flex items-center gap-2 shadow-sm border transition-all",
            deviceConnected 
              ? "bg-green-50 text-green-700 border-green-200" 
              : "bg-red-50 text-red-700 border-red-200"
          )}>
            <div className={cn(
              "h-3 w-3 rounded-full animate-pulse",
              deviceConnected ? "bg-green-500" : "bg-red-500"
            )} />
            <span className="font-bold text-sm">
              {deviceConnected ? "الماكينة متصلة" : "الماكينة غير متصلة"}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualReconnect}
            disabled={isReconnecting}
            className={cn(
              "rounded-[15px] h-10 px-4 border-royal-blue/30 text-royal-blue hover:bg-royal-blue/10 flex items-center gap-2",
              isReconnecting && "animate-pulse"
            )}
          >
            <RefreshCw className={cn("h-4 w-4", isReconnecting && "animate-spin")} />
            فحص الاتصال
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReconciliation}
            disabled={isReconciling}
            className="rounded-[15px] h-10 px-4 bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100 font-bold flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            استعلام البصمات المفقودة
            {isReconciling && <RefreshCw className="h-4 w-4 animate-spin ml-2" />}
          </Button>
        </div>

        {viewMode === 'list' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Header & Controls for List Mode */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[15px] shadow-sm border border-royal-blue/10">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-royal-blue flex items-center gap-2">
                  <User className="h-6 w-6" />
                  إدارة الموظفين (HR System)
                </h1>
                <p className="text-muted-foreground text-sm">إجمالي الموظفين: {allEmployees.length}</p>
              </div>

              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
                <div className="relative w-full md:w-64">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث (اسم، كود، رقم قومي)..."
                    className="pr-10 rounded-[15px] border-royal-blue/30 focus:border-royal-blue bg-white/50 backdrop-blur-sm"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                </div>
                
                <Select value={filterStatus} onValueChange={(val: any) => { setFilterStatus(val); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full md:w-40 rounded-[15px] border-royal-blue/30 font-bold text-royal-blue bg-royal-blue/5">
                    <SelectValue placeholder="حالة الموظف" />
                  </SelectTrigger>
                  <SelectContent className="text-right font-cairo">
                    <SelectItem value="ALL">الكل</SelectItem>
                    <SelectItem value="ACTIVE" className="text-green-600 font-bold">نشط</SelectItem>
                    <SelectItem value="INACTIVE" className="text-red-600 font-bold">غير نشط</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  onClick={() => {
                    handleCancelEdit()
                    setViewMode('form')
                  }}
                  className="bg-royal-blue hover:bg-royal-blue/90 text-white rounded-[15px] font-bold shadow-md w-full md:w-auto"
                >
                  ➕ إضافة موظف جديد
                </Button>
              </div>
            </div>

            {/* Employee Table Container */}
            <div className="bg-white rounded-[15px] shadow-sm border border-royal-blue/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 text-royal-blue border-b border-slate-200">
                      <th className="p-4 font-bold">الكود</th>
                      <th className="p-4 font-bold">الاسم الرباعي</th>
                      <th className="p-4 font-bold">المسمى الوظيفي</th>
                      <th className="p-4 font-bold">القسم</th>
                      <th className="p-4 font-bold">الحالة</th>
                      <th className="p-4 font-bold">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = allEmployees.filter(emp => {
                        if (filterStatus !== 'ALL' && emp.status !== filterStatus) return false;
                        if (searchTerm) {
                          return emp.fullName.includes(searchTerm) || 
                                 emp.employeeCode.toString() === searchTerm || 
                                 emp.nationalId.includes(searchTerm);
                        }
                        return true;
                      });
                      
                      const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
                      const current = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

                      if (current.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-muted-foreground">
                              لا يوجد موظفين يطابقون معايير البحث
                            </td>
                          </tr>
                        )
                      }

                      return (
                        <>
                          {current.map((emp) => (
                            <tr key={emp.id} className="border-b border-slate-100 hover:bg-royal-blue/5 transition-colors">
                              <td className="p-4">
                                <span className="bg-royal-blue/10 text-royal-blue px-3 py-1 rounded-full font-bold text-xs">
                                  {emp.employeeCode}
                                </span>
                              </td>
                              <td className="p-4 font-bold text-slate-800">{emp.fullName}</td>
                              <td className="p-4 text-muted-foreground">{emp.jobTitle || emp.operations}</td>
                              <td className="p-4 text-muted-foreground">{emp.department}</td>
                              <td className="p-4">
                                <span className={cn(
                                  "px-2 py-1 rounded text-xs font-bold",
                                  emp.status === 'ACTIVE' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                )}>
                                  {emp.status === 'ACTIVE' ? 'نشط' : 'غير نشط'}
                                </span>
                              </td>
                              <td className="p-4 flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleSelectEmployee(emp)}
                                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-8 rounded-[10px] text-xs font-bold"
                                >
                                  تعديل سريع
                                </Button>
                                <Link to={`/employees/${emp.id}`}>
                                  <Button size="sm" className="bg-royal-blue hover:bg-royal-blue/90 text-white h-8 rounded-[10px] text-xs font-bold shadow-sm">
                                    عرض الملف الكامل
                                  </Button>
                                </Link>
                              </td>
                            </tr>
                          ))}
                          
                          {/* Pagination Footer */}
                          {totalPages > 1 && (
                            <tr>
                              <td colSpan={6} className="p-4 border-t bg-slate-50">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">
                                    صفحة {currentPage} من {totalPages}
                                  </span>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                      disabled={currentPage === 1}
                                      className="rounded-[10px] font-bold"
                                    >
                                      السابق
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                      disabled={currentPage === totalPages}
                                      className="rounded-[10px] font-bold"
                                    >
                                      التالي
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Form Mode Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[15px] shadow-sm border border-royal-blue/10">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-royal-blue flex items-center gap-2">
                  <User className="h-6 w-6" />
                  {selectedEmployee ? "تعديل بيانات موظف" : "إضافة موظف جديد"}
                </h1>
              </div>
              <Button 
                variant="outline"
                onClick={() => setViewMode('list')}
                className="rounded-[15px] border-royal-blue text-royal-blue hover:bg-royal-blue/5 font-bold"
              >
                العودة للقائمة
              </Button>
            </div>

            {/* Badges Container */}
            <div className="flex flex-wrap items-center gap-4 self-start">
              {/* Employee Code Badge */}
              <div className="bg-royal-blue text-white px-6 py-2 rounded-full flex items-center gap-2 shadow-lg shadow-royal-blue/20">
                <IdCard className="h-5 w-5" />
                <span className="font-bold tracking-wider">كود الموظف: {employeeCode}</span>
              </div>
            </div>

            {selectedEmployee && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-[15px] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Save className="h-5 w-5 animate-pulse" />
                  <span className="font-bold">أنت الآن تقوم بتعديل بيانات: {selectedEmployee.fullName}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="text-amber-800 hover:bg-amber-100">
                  <X className="h-4 w-4 ml-1" /> إلغاء التعديل
                </Button>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* 1. Identity Data */}
              <Card className="border-none shadow-md overflow-hidden rounded-[15px] hover:shadow-lg transition-shadow">
                <CardHeader className="bg-royal-blue text-white">
                  <div className="flex items-center gap-2">
                    <IdCard className="h-5 w-5" />
                    <CardTitle>1. بيانات الهوية (Identity)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                  <FormField
                    control={form.control}
                    name="nationalId"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-royal-blue font-bold">الرقم القومي (14 رقماً)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <IdCard className={cn(
                              "absolute right-3 top-2.5 h-4 w-4 transition-colors",
                              idExists === true ? "text-red-500" : idExists === false ? "text-green-500" : "text-muted-foreground"
                            )} />
                            <Input 
                              placeholder="أدخل 14 رقماً..." 
                              className={cn(
                                "pr-10 rounded-[15px] border-royal-blue/20 focus:border-royal-blue transition-all",
                                idExists === true && "border-red-500 bg-red-50/30",
                                idExists === false && "border-green-500 bg-green-50/30"
                              )} 
                              {...field} 
                              onChange={(e) => {
                                field.onChange(e)
                                setIdExists(null) // Clear status immediately on change
                                if (form.formState.errors.nationalId) {
                                  form.clearErrors("nationalId")
                                }
                              }}
                            />
                            {isIdChecking && (
                              <div className="absolute left-3 top-3">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-royal-blue"></div>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        {idExists === false && (
                          <p className="text-[10px] text-green-600 font-bold mt-1 animate-in fade-in slide-in-from-top-1">
                            ✓ هذا الرقم القومي متاح للاستخدام
                          </p>
                        )}
                        <FormMessage className="text-xs font-bold text-red-500" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-royal-blue font-bold">الاسم الرباعي</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="أدخل الاسم الرباعي..." className="pr-10 rounded-[15px]" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاريخ الميلاد</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="YYYY/MM/DD" className="pr-10 rounded-[15px]" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>النوع</FormLabel>
                        <FormControl>
                          <Input className="rounded-[15px] bg-muted/50" {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* 2. Contact Data */}
              <Card className="border-none shadow-md overflow-hidden rounded-[15px] hover:shadow-lg transition-shadow">
                <CardHeader className="bg-royal-blue text-white">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    <CardTitle>2. بيانات الاتصال (Contact)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-royal-blue font-bold">رقم الهاتف</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="01xxxxxxxxx" className="pr-10 rounded-[15px]" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="governorate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المحافظة</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input className="pr-10 rounded-[15px] bg-muted/50" {...field} readOnly />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>العنوان التفصيلي</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="الشارع، المنطقة، رقم العقار..." className="pr-10 rounded-[15px]" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* 3. Job Data */}
              <Card className="border-none shadow-md overflow-hidden rounded-[15px] hover:shadow-lg transition-shadow">
                <CardHeader className="bg-royal-blue text-white">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    <CardTitle>3. البيانات الوظيفية (Job Details)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-royal-blue font-bold">القسم / الإدارة</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-[15px]">
                              <SelectValue placeholder="اختر القسم" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="min-w-[300px] text-right">
                            <SelectItem value="الشئون الإدارية">الشئون الإدارية</SelectItem>
                            <SelectItem value="التعليم">التعليم</SelectItem>
                            <SelectItem value="الحسابات">الحسابات</SelectItem>
                            <SelectItem value="الخدمات المعاونة">الخدمات المعاونة</SelectItem>
                            <SelectItem value="الأمن">الأمن</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-royal-blue font-bold">المسمى الوظيفي</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-[15px]">
                              <SelectValue placeholder="اختر المسمى الوظيفي" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="min-w-[300px] text-right">
                            <SelectItem value="الموارد البشرية">الموارد البشرية</SelectItem>
                            <SelectItem value="مدير">مدير</SelectItem>
                            <SelectItem value="نائب مدير">نائب مدير</SelectItem>
                            <SelectItem value="مدرس">مدرس</SelectItem>
                            <SelectItem value="شئون طلبة">شئون طلبة</SelectItem>
                            <SelectItem value="محاسب">محاسب</SelectItem>
                            <SelectItem value="رئيس حسابات">رئيس حسابات</SelectItem>
                            <SelectItem value="عمال">عمال</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shiftId"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-royal-blue font-bold">نظام المناوبة (Shift)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-[15px]">
                              <SelectValue placeholder="اختر نظام المناوبة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="min-w-[300px] text-right">
                            {shifts.map((s) => (
                              <SelectItem key={s.id} value={s.id.toString()}>
                                {s.shiftName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {isSpecialShift && (
                    <FormField
                      control={form.control}
                      name="reducedHourPosition"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-royal-blue font-bold">موقع الساعة المخفضة</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-[15px]">
                                <SelectValue placeholder="اختر موقع الساعة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="text-right">
                              <SelectItem value="start">في بداية الدوام (تأخير ساعة)</SelectItem>
                              <SelectItem value="end">في نهاية الدوام (انصراف مبكر ساعة)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              {/* 4. Contract Data */}
              <Card className="border-none shadow-md overflow-hidden rounded-[15px] hover:shadow-lg transition-shadow">
                <CardHeader className="bg-royal-blue text-white">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    <CardTitle>4. بيانات التعاقد (Contract)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                  <FormField
                    control={form.control}
                    name="joinDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاريخ التعيين</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="YYYY/MM/DD" className="pr-10 rounded-[15px]" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contractStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>بداية العقد</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="YYYY/MM/DD" className="pr-10 rounded-[15px]" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contractDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-royal-blue font-bold">مدة العقد</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-[15px]">
                              <SelectValue placeholder="اختر المدة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="text-right">
                            <SelectItem value="0.5">6 أشهر</SelectItem>
                            <SelectItem value="1">سنة واحدة</SelectItem>
                            <SelectItem value="2">سنتان</SelectItem>
                            <SelectItem value="3">3 سنوات</SelectItem>
                            <SelectItem value="5">5 سنوات</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contractEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نهاية العقد</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="YYYY/MM/DD" className="pr-10 rounded-[15px]" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* 5. Salary & Payment */}
              <Card className="border-none shadow-md overflow-hidden rounded-[15px] hover:shadow-lg transition-shadow lg:col-span-2">
                <CardHeader className="bg-royal-blue text-white">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    <CardTitle>5. الراتب والماليات (Salary & Finance)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                  <FormField
                    control={form.control}
                    name="baseSalary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-royal-blue font-bold">الراتب الأساسي</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input type="number" placeholder="0.00" className="pr-10 rounded-[15px]" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-royal-blue font-bold">طريقة الصرف</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-[15px]">
                              <SelectValue placeholder="اختر الطريقة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="text-right">
                            <SelectItem value="كاش">كاش (Cash)</SelectItem>
                            <SelectItem value="بنك">تحويل بنكي (Bank Transfer)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="busSubscription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-royal-blue font-bold">حالة اشتراك الباص</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger className="rounded-[15px]">
                              <SelectValue placeholder="اختر حالة الاشتراك" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="text-right">
                            <SelectItem value="true">مشترك</SelectItem>
                            <SelectItem value="false">غير مشترك</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch("busSubscription") === "true" && (
                    <FormField
                      control={form.control}
                      name="busSubscriptionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-royal-blue font-bold">نوع الاشتراك</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-[15px]">
                                <SelectValue placeholder="اختر نوع الاشتراك" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="text-right">
                              <SelectItem value="passenger">راكب عادي - خصم 50%</SelectItem>
                              <SelectItem value="supervisor">مشرف باص - إعفاء 100%</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {form.watch("paymentMethod") === "بنك" && (
                    <FormField
                      control={form.control}
                      name="iban"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>رقم الحساب البنكي</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <CreditCard className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="أدخل رقم الحساب البنكي..." className="pr-10 rounded-[15px]" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              {/* 6. Attachments */}
              <Card className="border-none shadow-md overflow-hidden rounded-[15px] lg:col-span-2">
                <CardHeader className="bg-royal-blue text-white">
                  <div className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    <CardTitle>6. المرفقات (Attachments)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                  <div className="space-y-3" onClick={() => document.getElementById('avatar-upload')?.click()}>
                    <Label className="text-royal-blue font-bold">صورة شخصية</Label>
                    <div className="border-2 border-dashed border-royal-blue/20 rounded-[15px] p-8 text-center cursor-pointer hover:bg-royal-blue/5 transition-all group">
                      <Upload className="mx-auto h-10 w-10 text-royal-blue/40 group-hover:text-royal-blue transition-colors mb-3" />
                      <p className="text-sm font-semibold text-royal-blue">اضغط للرفع أو اسحب الملف</p>
                      <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG حتى 5 ميجا</p>
                      <input id="avatar-upload" type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'الصورة الشخصية')} accept="image/*" />
                    </div>
                  </div>
                  <div className="space-y-3" onClick={() => document.getElementById('contract-upload')?.click()}>
                    <Label className="text-royal-blue font-bold">صورة العقد الموقّع (PDF)</Label>
                    <div className="border-2 border-dashed border-royal-blue/20 rounded-[15px] p-8 text-center cursor-pointer hover:bg-royal-blue/5 transition-all group">
                      <FileText className="mx-auto h-10 w-10 text-royal-blue/40 group-hover:text-royal-blue transition-colors mb-3" />
                      <p className="text-sm font-semibold text-royal-blue">ارفع نسخة PDF</p>
                      <p className="text-[10px] text-muted-foreground mt-1">ملف PDF فقط</p>
                      <input id="contract-upload" type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'صورة العقد')} />
                    </div>
                  </div>
                  <div className="space-y-3" onClick={() => document.getElementById('docs-upload')?.click()}>
                    <Label className="text-royal-blue font-bold">صور الأوراق الرسمية</Label>
                    <div className="border-2 border-dashed border-royal-blue/20 rounded-[15px] p-8 text-center cursor-pointer hover:bg-royal-blue/5 transition-all group">
                      <Upload className="mx-auto h-10 w-10 text-royal-blue/40 group-hover:text-royal-blue transition-colors mb-3" />
                      <p className="text-sm font-semibold text-royal-blue">بطاقة / شهادة ميلاد</p>
                      <p className="text-[10px] text-muted-foreground mt-1">صور أو ملفات PDF</p>
                      <input id="docs-upload" type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e, 'الأوراق الرسمية')} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col items-center gap-4 py-8">
              {isVerifyingMachine && (
                <div className="flex items-center gap-2 text-royal-blue animate-pulse bg-royal-blue/5 px-6 py-3 rounded-full mb-4">
                  <div className="h-4 w-4 rounded-full border-2 border-royal-blue border-t-transparent animate-spin" />
                  <span className="font-bold text-sm">جاري التحقق من الماكينة...</span>
                </div>
              )}
              <div className="flex justify-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="rounded-[15px] px-12 h-12 text-lg font-bold border-royal-blue/30 text-royal-blue hover:bg-royal-blue/5"
                >
                  إلغاء
                </Button>
                <Button
                  id="save-employee-button"
                  type="submit"
                  disabled={isSubmitting || (selectedEmployee && !form.formState.isDirty && uploadedFiles.length === 0)}
                  className="rounded-[15px] px-12 h-12 text-lg font-bold bg-royal-blue hover:bg-royal-blue/90 text-white shadow-lg shadow-royal-blue/30"
                >
                  {isSubmitting ? "جاري الحفظ..." : selectedEmployee ? "حفظ التعديلات" : "حفظ بيانات موظف جديد"}
                  {selectedEmployee ? <Save className="mr-2 h-5 w-5" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                </Button>
              </div>
            </div>
          </form>
        </Form>
        </div>
      )}
      </div>
    </div>
  )
}
