"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format, addYears, addMonths, differenceInYears, isNaN as isDateNaN } from "date-fns"
import { ar } from "date-fns/locale"
import {
  User, IdCard, Calendar as CalendarIcon, Phone, MapPin,
  Briefcase, GraduationCap, Clock, FileText,
  CreditCard, DollarSign, Upload, Info, CheckCircle2,
  Search, RotateCcw, Save
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { saveEmployee, searchEmployees, updateEmployee, requestLeave } from "./actions"
import { toast } from "sonner"

interface Employee {
  id: number;
  employee_code: string;
  full_name: string;
  national_id: string;
  date_of_birth: string;
  gender: string;
  phone_number: string;
  address: string;
  governorate: string;
  department: string;
  job_title: string;
  shift_id: number;
  join_date: string;
  contract_start_date: string;
  contract_duration: number;
  contract_end_date: string;
  base_salary: number;
  payment_method: string;
  iban?: string;
  reduced_hour_position?: string;
  annual_leave_balance: number;
  casual_leave_balance: number;
  maternity_leave_counter: number;
}

// ... govCodes and extractFromNationalID remain same ...

const govCodes: Record<string, string> = {
  "01": "القاهرة", "02": "الإسكندرية", "03": "بورسعيد", "04": "السويس",
  "11": "دمياط", "12": "الدقهلية", "13": "الشرقية", "14": "القليوبية",
  "15": "كفر الشيخ", "16": "الغربية", "17": "المنوفية", "18": "البحيرة",
  "19": "الإسماعيلية", "21": "الجيزة", "22": "بني سويف", "23": "الفيوم",
  "24": "المنيا", "25": "أسيوط", "26": "سوهاج", "27": "قنا",
  "28": "أسوان", "29": "الأقصر", "31": "البحر الأحمر", "32": "الوادي الجديد",
  "33": "مطروح", "34": "شمال سيناء", "35": "جنوب سيناء", "88": "خارج الجمهورية"
};

const extractFromNationalID = (id: string) => {
  if (id.length !== 14) return null;

  const centuryDigit = id.substring(0, 1);
  const yearDigit = id.substring(1, 3);
  const monthDigit = id.substring(3, 5);
  const dayDigit = id.substring(5, 7);
  const govDigit = id.substring(7, 9);
  const genderDigit = id.substring(12, 13);

  const century = centuryDigit === '2' ? 1900 : centuryDigit === '3' ? 2000 : 1900;
  const year = century + parseInt(yearDigit);
  const month = parseInt(monthDigit) - 1;
  const day = parseInt(dayDigit);

  const birthDate = new Date(year, month, day);

  if (isNaN(birthDate.getTime())) return null;

  const gender = parseInt(genderDigit) % 2 === 0 ? 'أنثى' : 'ذكر';
  const governorate = govCodes[govDigit] || "";

  return { birthDate, gender, governorate };
};

const formSchema = z.object({
  fullName: z.string().min(3, "الاسم الكامل مطلوب"),
  nationalId: z.string().length(14, "الرقم القومي يجب أن يكون 14 رقم"),
  dateOfBirth: z.date({ required_error: "تاريخ الميلاد مطلوب" }),
  gender: z.string().min(1, "يرجى اختيار الجنس"),
  phoneNumber: z.string().min(10, "رقم الهاتف مطلوب"),
  address: z.string().min(5, "العنوان مطلوب"),
  governorate: z.string().min(1, "يرجى اختيار المحافظة"),
  employeeCode: z.string(),
  department: z.string().min(1, "يرجى اختيار القسم"),
  jobTitle: z.string().min(1, "يرجى اختيار المسمى الوظيفي"),
  shiftId: z.string().min(1, "يرجى اختيار المناوبة"),
  reducedHourPosition: z.string().optional(),
  joinDate: z.date({ required_error: "تاريخ مباشرة العمل مطلوب" }),
  contractStartDate: z.date({ required_error: "تاريخ بداية العقد مطلوب" }),
  contractDuration: z.string().min(1, "يرجى اختيار مدة العقد"),
  contractEndDate: z.string(),
  baseSalary: z.string().min(1, "الراتب الأساسي مطلوب"),
  paymentMethod: z.string().min(1, "يرجى اختيار طريقة الصرف"),
  iban: z.string().optional(),
})

export default function AddEmployeePage() {
  const [employeeCode, setEmployeeCode] = useState("")
  const [showIban, setShowIban] = useState(false)
  const [age, setAge] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Search and Edit State
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      nationalId: "",
      gender: "",
      phoneNumber: "",
      address: "",
      governorate: "",
      employeeCode: "",
      department: "",
      jobTitle: "",
      shiftId: "",
      joinDate: new Date(),
      contractStartDate: new Date(),
      contractDuration: "",
      contractEndDate: "",
      baseSalary: "",
      paymentMethod: "",
      iban: "",
    },
  })

  // Debounced search
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      const res = await searchEmployees(searchTerm)
      setIsSearching(false)
      if (res.success) {
        setSearchResults(res.employees || [])
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployee(emp)
    setSearchTerm("")
    setSearchResults([])

    // Map shift ID back to Arabic string
    const shiftRevMap: Record<number, string> = {
      1: "مناوبة قياسية (Standard)",
      4: "مناوبة الشعائر الدينية (Religious)",
      5: "مناوبة ذوي الاحتياجات الخاصة (5%)",
      6: "مناوبة رعاية الطفل (Nursing)"
    }

    form.reset({
      fullName: emp.full_name,
      nationalId: emp.national_id,
      gender: emp.gender,
      phoneNumber: emp.phone_number,
      address: emp.address,
      governorate: emp.governorate,
      employeeCode: emp.employee_code,
      department: emp.department,
      jobTitle: emp.job_title,
      shiftId: shiftRevMap[emp.shift_id] || "مناوبة قياسية (Standard)",
      reducedHourPosition: emp.reduced_hour_position || "end",
      joinDate: new Date(emp.join_date),
      contractStartDate: new Date(emp.contract_start_date),
      contractDuration: emp.contract_duration.toString(),
      contractEndDate: emp.contract_end_date,
      baseSalary: emp.base_salary.toString(),
      paymentMethod: emp.payment_method,
      iban: emp.iban || "",
    })
    setEmployeeCode(emp.employee_code)
    toast.success(`تم جلب بيانات: ${emp.full_name}`)
  }

  const handleReset = () => {
    setSelectedEmployee(null)
    form.reset({
      fullName: "",
      nationalId: "",
      gender: "",
      phoneNumber: "",
      address: "",
      governorate: "",
      employeeCode: "",
      department: "",
      jobTitle: "",
      shiftId: "",
      reducedHourPosition: "end",
      joinDate: new Date(),
      contractStartDate: new Date(),
      contractDuration: "",
      contractEndDate: "",
      baseSalary: "",
      paymentMethod: "",
      iban: "",
    })
    // Regenerate code
    const datePart = format(new Date(), "yyyyMM")
    const randomPart = Math.floor(1000 + Math.random() * 9000)
    const code = `EMP-${datePart}-${randomPart}`
    setEmployeeCode(code)
    form.setValue("employeeCode", code)
  }

  // Auto-generate Employee Code (only for new employees)
  useEffect(() => {
    if (!selectedEmployee) {
      const datePart = format(new Date(), "yyyyMM")
      const randomPart = Math.floor(1000 + Math.random() * 9000)
      const code = `EMP-${datePart}-${randomPart}`
      setEmployeeCode(code)
      form.setValue("employeeCode", code)
    }
  }, [form, selectedEmployee])



  // Watch for contract changes
  const watchStartDate = form.watch("contractStartDate")
  const watchDuration = form.watch("contractDuration")
  const watchPaymentMethod = form.watch("paymentMethod")
  const watchShift = form.watch("shiftId")
  const watchDOB = form.watch("dateOfBirth")
  const watchNationalId = form.watch("nationalId")
  const watchContractEndDate = form.watch("contractEndDate")

  useEffect(() => {
    if (watchNationalId && watchNationalId.length === 14) {
      const extracted = extractFromNationalID(watchNationalId)
      if (extracted) {
        form.setValue("dateOfBirth", extracted.birthDate)
        form.setValue("gender", extracted.gender)
        form.setValue("governorate", extracted.governorate)
        toast.info("تم استخراج البيانات من الرقم القومي")
      }
    }
  }, [watchNationalId, form])

  useEffect(() => {
    if (watchStartDate && watchDuration) {
      const durationNum = parseFloat(watchDuration)
      let endDate;
      if (durationNum === 0.5) {
        endDate = addMonths(watchStartDate, 6)
      } else {
        endDate = addYears(watchStartDate, durationNum)
      }
      const formattedEndDate = format(endDate, "yyyy-MM-dd")
      form.setValue("contractEndDate", formattedEndDate)
    }
  }, [watchStartDate, watchDuration, form])

  useEffect(() => {
    setShowIban(watchPaymentMethod === "بنك")
  }, [watchPaymentMethod])

  useEffect(() => {
    if (watchDOB && watchDOB instanceof Date && !isNaN(watchDOB.getTime())) {
      const calculatedAge = differenceInYears(new Date(), watchDOB)
      setAge(calculatedAge)
    } else {
      setAge(null)
    }
  }, [watchDOB])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    let result;

    if (selectedEmployee) {
      // Map shift string to ID for comparison
      const shiftMap: Record<string, number> = {
        "مناوبة عامة (8:00 - 3:00)": 1,
        "مناوبة صباحية مخصصة": 2,
        "مناوبة مسائية مخصصة": 3
      }

      const oldDataNormalized = {
        fullName: selectedEmployee.full_name,
        nationalId: selectedEmployee.national_id,
        gender: selectedEmployee.gender,
        phoneNumber: selectedEmployee.phone_number,
        address: selectedEmployee.address,
        governorate: selectedEmployee.governorate,
        department: selectedEmployee.department,
        jobTitle: selectedEmployee.job_title,
        shiftId: shiftMap[selectedEmployee.shift_id] || selectedEmployee.shift_id,
        reducedHourPosition: selectedEmployee.reduced_hour_position || "end",
        joinDate: new Date(selectedEmployee.join_date),
        contractStartDate: new Date(selectedEmployee.contract_start_date),
        contractDuration: selectedEmployee.contract_duration.toString(),
        baseSalary: selectedEmployee.base_salary.toString(),
        paymentMethod: selectedEmployee.payment_method,
        iban: selectedEmployee.iban || "",
      }
      result = await updateEmployee(selectedEmployee.id, values, oldDataNormalized)
    } else {
      result = await saveEmployee(values)
    }

    setIsSubmitting(false)

    if (result.success) {
      toast.success(selectedEmployee ? "تم تحديث بيانات الموظف بنجاح!" : "تم حفظ بيانات الموظف الجديد بنجاح!")
      handleReset()
    } else {
      toast.error("خطأ أثناء الحفظ: " + result.error)
    }
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl" dir="rtl">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-primary">
            {selectedEmployee ? "تعديل بيانات موظف" : "إضافة موظف جديد"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {selectedEmployee ? `أنت تقوم بتعديل بيانات: ${selectedEmployee.full_name}` : "يرجى استيفاء جميع البيانات المطلوبة لترحيل الموظف للنظام."}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-96">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن موظف لتعديل بياناته (الاسم، الكود، الرقم القومي)..."
              className="pr-10 rounded-xl border-primary/20 focus:border-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isSearching && <div className="absolute left-3 top-2.5 animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />}
          </div>

          {searchResults.length > 0 && (
            <div className="absolute top-full right-0 w-full bg-white mt-1 rounded-xl shadow-lg border border-primary/10 z-50 overflow-hidden">
              {searchResults.map((emp) => (
                <div
                  key={emp.id}
                  className="p-3 hover:bg-primary/5 cursor-pointer border-b border-gray-100 last:border-none flex justify-between items-center transition-colors"
                  onClick={() => handleSelectEmployee(emp)}
                >
                  <div className="text-right">
                    <div className="font-semibold text-sm">{emp.full_name}</div>
                    <div className="text-xs text-muted-foreground">{emp.employee_code} - {emp.national_id}</div>
                  </div>
                  <User className="h-4 w-4 text-primary/40" />
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedEmployee && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-primary/20 shadow-sm rounded-[15px] bg-blue-50/30">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <CalendarIcon className="h-8 w-8 text-primary mb-2" />
                <div className="text-sm text-muted-foreground">رصيد السنوي المتبقي</div>
                <div className="text-2xl font-bold text-primary">{selectedEmployee.annual_leave_balance} يوم</div>
              </CardContent>
            </Card>
            <Card className="border-orange-200 shadow-sm rounded-[15px] bg-orange-50/30">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <Clock className="h-8 w-8 text-orange-500 mb-2" />
                <div className="text-sm text-muted-foreground">رصيد العارضة المتبقي</div>
                <div className="text-2xl font-bold text-orange-600">{selectedEmployee.casual_leave_balance} يوم</div>
              </CardContent>
            </Card>
            <Card className="border-green-200 shadow-sm rounded-[15px] bg-green-50/30">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <User className="h-8 w-8 text-green-600 mb-2" />
                <div className="text-sm text-muted-foreground">إجازات الوضع المستهلكة</div>
                <div className="text-2xl font-bold text-green-700">{selectedEmployee.maternity_leave_counter} / 2</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl flex items-center gap-2 border border-primary/20 self-start">
          <Briefcase className="h-5 w-5" />
          <span className="font-semibold">كود الموظف: {employeeCode}</span>
        </div>

        {selectedEmployee && (
          <Button variant="outline" onClick={handleReset} className="rounded-xl gap-2 border-orange-200 text-orange-600 hover:bg-orange-50 cursor-pointer">
            <RotateCcw className="h-4 w-4" /> إلغاء التعديل
          </Button>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

          {/* 1. Identity Info */}
          <Card className="border-none shadow-md overflow-hidden rounded-[15px]">
            <CardHeader className="bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <IdCard className="h-5 w-5" />
                <CardTitle>1. بيانات الهوية (Identity Info)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم الكامل</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="أدخل الاسم رباعي" className="pr-10 rounded-[15px]" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nationalId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الرقم القومي (14 رقم)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <IdCard className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="2900101XXXXXXXX" maxLength={14} className="pr-10 rounded-[15px]" {...field} />
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
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ الميلاد</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-right font-normal rounded-[15px] h-11 pr-10 relative",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="absolute right-3 h-4 w-4 text-muted-foreground" />
                            {field.value instanceof Date && !isNaN(field.value.getTime()) ? (
                              format(field.value, "dd-MM-yyyy")
                            ) : (
                              <span>اختر التاريخ</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          captionLayout="dropdown"
                          fromYear={1945}
                          toYear={new Date().getFullYear()}
                          locale={ar}
                        />
                      </PopoverContent>
                    </Popover>
                    {age !== null && (
                      <p className="text-xs text-muted-foreground mt-1">
                        السن الحالي: {age} سنة {age >= 60 && <span className="text-destructive font-bold">(سن التقاعد)</span>}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الجنس</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-[15px] w-full text-right h-auto py-2">
                          <SelectValue placeholder="اختر الجنس" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ذكر">ذكر</SelectItem>
                        <SelectItem value="أنثى">أنثى</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 2. Contact Info */}
          <Card className="border-none shadow-md overflow-hidden rounded-[15px]">
            <CardHeader className="bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                <CardTitle>2. بيانات الاتصال (Contact Info)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف الشخصي</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="01XXXXXXXXX" className="pr-10 rounded-[15px]" {...field} />
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-[15px] w-full text-right h-auto py-2">
                          <SelectValue placeholder="اختر المحافظة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="min-w-[200px] h-60 text-right">
                        {Object.entries(govCodes).map(([code, name]) => (
                          <SelectItem key={code} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العنوان بالتفصيل</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="المدينة، الشارع..." className="pr-10 rounded-[15px]" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 3. Employment Info */}
          <Card className="border-none shadow-md overflow-hidden rounded-[15px]">
            <CardHeader className="bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                <CardTitle>3. البيانات الوظيفية (Employment Info)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>القسم</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-[15px] w-full text-right h-auto py-2">
                          <SelectValue placeholder="اختر القسم" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="min-w-[300px] text-right">
                        <SelectItem value="الموارد البشرية (HR)">الموارد البشرية (HR)</SelectItem>
                        <SelectItem value="مدير المدرسة">مدير المدرسة</SelectItem>
                        <SelectItem value="نائب مدير">نائب مدير</SelectItem>
                        <SelectItem value="المدرسين">المدرسين</SelectItem>
                        <SelectItem value="شئون طلبة">شئون طلبة</SelectItem>
                        <SelectItem value="الحسابات">الحسابات</SelectItem>
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
                    <FormLabel>المسمى الوظيفي</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-[15px] w-full text-right h-auto py-2">
                          <SelectValue placeholder="اختر المسمى" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="min-w-[300px] text-right">
                        <SelectItem value="مدير HR">مدير HR</SelectItem>
                        <SelectItem value="مدير المدرسة">مدير المدرسة</SelectItem>
                        <SelectItem value="نائب مدير">نائب مدير</SelectItem>
                        <SelectItem value="مدرس">مدرس</SelectItem>
                        <SelectItem value="محاسب">محاسب</SelectItem>
                        <SelectItem value="شئون طلاب">شئون طلاب</SelectItem>
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
                  <FormItem>
                    <FormLabel>المناوبة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-[15px] w-full text-right h-auto py-2">
                          <SelectValue placeholder="اختر المناوبة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="min-w-[300px] text-right">
                        <SelectItem value="مناوبة قياسية (Standard)">مناوبة قياسية (Standard)</SelectItem>
                        <SelectItem value="مناوبة الشعائر الدينية (Religious)">مناوبة الشعائر الدينية (Religious)</SelectItem>
                        <SelectItem value="مناوبة ذوي الاحتياجات الخاصة (5%)">مناوبة ذوي الاحتياجات الخاصة (5%)</SelectItem>
                        <SelectItem value="مناوبة رعاية الطفل (Nursing)">مناوبة رعاية الطفل (Nursing)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {(watchShift === "مناوبة ذوي الاحتياجات الخاصة (5%)" || watchShift === "مناوبة رعاية الطفل (Nursing)") && (
                <FormField
                  control={form.control}
                  name="reducedHourPosition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>توقيت ساعة التخفيض القانونية</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-[15px] w-full text-right h-auto py-2 border-primary/40 bg-primary/5">
                            <SelectValue placeholder="اختر التوقيت" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="text-right">
                          <SelectItem value="start">حضور متأخر ساعة (بداية اليوم)</SelectItem>
                          <SelectItem value="end">انصراف مبكر ساعة (نهاية اليوم)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-primary/60 mt-1">* سيتم تعديل منطق التأخير تلقائياً بناءً على هذا الاختيار.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="joinDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ مباشرة العمل</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-right font-normal rounded-[15px] h-11 pr-10 relative",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="absolute right-3 h-4 w-4 text-muted-foreground" />
                            {field.value instanceof Date && !isNaN(field.value.getTime()) ? (
                              format(field.value, "dd-MM-yyyy")
                            ) : (
                              <span>اختر التاريخ</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          captionLayout="dropdown"
                          fromYear={2020}
                          toYear={2035}
                          locale={ar}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 4. Contract Module */}
          <Card className="border-none shadow-md overflow-hidden rounded-[15px]">
            <CardHeader className="bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <CardTitle>4. بيانات التعاقد (Contract Info)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <FormField
                control={form.control}
                name="contractStartDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ بداية العقد</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-right font-normal rounded-[15px] h-11 pr-10 relative",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="absolute right-3 h-4 w-4 text-muted-foreground" />
                            {field.value instanceof Date && !isNaN(field.value.getTime()) ? (
                              format(field.value, "dd-MM-yyyy")
                            ) : (
                              <span>اختر التاريخ</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          captionLayout="dropdown"
                          fromYear={2020}
                          toYear={2035}
                          locale={ar}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contractDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>مدة العقد</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-[15px] w-full text-right h-auto py-2">
                          <SelectValue placeholder="اختر المدة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="min-w-[300px] text-right">
                        <SelectItem value="0.5">6 أشهر</SelectItem>
                        <SelectItem value="1">سنة واحدة</SelectItem>
                        <SelectItem value="2">سنتين</SelectItem>
                        <SelectItem value="3">3 سنوات</SelectItem>
                        <SelectItem value="4">4 سنوات</SelectItem>
                        <SelectItem value="5">5 سنوات</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>تاريخ نهاية العقد (تلقائي)</FormLabel>
                <div className="relative">
                  <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={watchContractEndDate ? format(new Date(watchContractEndDate), "dd-MM-yyyy") : ""}
                    disabled
                    className="pr-10 rounded-[15px] bg-muted cursor-not-allowed text-right"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">يُحسب بناءً على البداية والمدة.</p>
              </FormItem>
            </CardContent>
          </Card>

          {/* 5. Financial Info */}
          <Card className="border-none shadow-md overflow-hidden rounded-[15px]">
            <CardHeader className="bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                <CardTitle>5. البيانات المالية (Financial Info)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <FormField
                control={form.control}
                name="baseSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الراتب الأساسي</FormLabel>
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
                    <FormLabel>طريقة الصرف</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-[15px] w-full text-right h-auto py-2">
                          <SelectValue placeholder="اختر الطريقة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="نقدي">نقدي</SelectItem>
                        <SelectItem value="بنك">بنك</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {showIban && (
                <FormField
                  control={form.control}
                  name="iban"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>رقم الحساب البنكي (IBAN)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <CreditCard className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="EG0000000000000000000000000" className="pr-10 rounded-[15px]" {...field} />
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
          <Card className="border-none shadow-md overflow-hidden rounded-[15px]">
            <CardHeader className="bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                <CardTitle>6. المرفقات (Attachments)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <div className="space-y-2">
                <Label>صورة شخصية</Label>
                <div className="border-2 border-dashed border-muted rounded-[15px] p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">اسحب الصورة أو اضغط هنا</p>
                  <Input type="file" className="hidden" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>صورة العقد الموقّع (PDF)</Label>
                <div className="border-2 border-dashed border-muted rounded-[15px] p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">ارفع ملف PDF</p>
                  <Input type="file" accept=".pdf" className="hidden" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>صور الأوراق الرسمية</Label>
                <div className="border-2 border-dashed border-muted rounded-[15px] p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">بطاقة، شهادة ميلاد (صور/PDF)</p>
                  <Input type="file" multiple className="hidden" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 pb-10">
            <Button
              type="button"
              variant="outline"
              className="rounded-[15px] px-8 h-12 cursor-pointer"
              onClick={handleReset}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (selectedEmployee && !form.formState.isDirty)}
              className="rounded-[15px] px-12 h-12 text-lg font-bold cursor-pointer"
            >
              {isSubmitting ? "جاري الحفظ..." : selectedEmployee ? "حفظ التعديلات" : "حفظ بيانات موظف جديد"}
              {selectedEmployee ? <Save className="mr-2 h-5 w-5" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
            </Button>
          </div>
        </form>
      </Form>

      {selectedEmployee && (
        <Card className="border-none shadow-md overflow-hidden rounded-[15px] mt-8 mb-20">
          <CardHeader className="bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle>طلب إجازة جديدة</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form action={async (formData) => {
              formData.append("employeeId", selectedEmployee.id.toString())
              const res = await requestLeave(formData)
              if (res.success) {
                toast.success("تم تقديم طلب الإجازة بنجاح، في انتظار موافقة المدير")
                // Reset form manually or reload
              } else {
                toast.error(`خطأ: ${res.error}`)
              }
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>نوع الإجازة</Label>
                  <Select name="leaveType" required>
                    <SelectTrigger className="rounded-[15px]">
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="إجازة سنوية">إجازة سنوية</SelectItem>
                      <SelectItem value="إجازة عارضة">إجازة عارضة</SelectItem>
                      <SelectItem value="إجازة وضع">إجازة وضع (90 يوماً)</SelectItem>
                      <SelectItem value="إجازة مرضية">إجازة مرضية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>تاريخ البداية</Label>
                  <Input type="date" name="startDate" required className="rounded-[15px]" />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ النهاية</Label>
                  <Input type="date" name="endDate" required className="rounded-[15px]" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>السبب / ملاحظات</Label>
                <Input name="reason" placeholder="اكتب سبب الإجازة هنا..." className="rounded-[15px]" />
              </div>
              <div className="space-y-2">
                <Label>المرفقات (شهادة ميلاد / تقرير طبي)</Label>
                <div className="flex items-center gap-4">
                  <Input type="file" name="attachment" className="rounded-[15px] border-dashed" />
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">مطلوب لإجازة الوضع أو المرضية</span>
                </div>
              </div>
              <Button type="submit" className="w-full rounded-[15px] h-12 bg-primary hover:bg-primary/90 font-bold">
                تقديم طلب الإجازة <CheckCircle2 className="mr-2 h-5 w-5" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
