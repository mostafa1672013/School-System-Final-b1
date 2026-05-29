import React, { useState } from 'react'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Clock,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Timer,
  LayoutGrid,
  LogIn,
  LogOut,
  CalendarDays,
  ShieldCheck,
  ArrowLeftRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const API_BASE = `http://${window.location.hostname}:4000/api`

const DAYS_OF_WEEK = [
  { id: 'Sunday', label: 'الأحد' },
  { id: 'Monday', label: 'الإثنين' },
  { id: 'Tuesday', label: 'الثلاثاء' },
  { id: 'Wednesday', label: 'الأربعاء' },
  { id: 'Thursday', label: 'الخميس' },
  { id: 'Friday', label: 'الجمعة' },
  { id: 'Saturday', label: 'السبت' },
]

const formatTimeDisplay = (timeStr: string) => {
  if (!timeStr || !timeStr.includes(':')) return timeStr;
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'م' : 'ص';
  const h12 = hours % 12 || 12;
  return `${h12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
}

const formSchema = z.object({
  shiftName: z.string().min(2, "يجب أن يكون اسم المناوبة حرفين على الأقل"),
  startTime: z.string().min(1, "وقت البدء مطلوب"),
  endTime: z.string().min(1, "وقت الانتهاء مطلوب"),
  gracePeriodIn: z.string().transform((val) => parseInt(val, 10)).or(z.number()),
  gracePeriodOut: z.string().transform((val) => parseInt(val, 10)).or(z.number()),
  checkInStart: z.string().min(1, "وقت بدء الحضور مطلوب"),
  checkInEnd: z.string().min(1, "وقت نهاية الحضور مطلوب"),
  checkOutStart: z.string().min(1, "وقت بدء الانصراف مطلوب"),
  checkOutEnd: z.string().min(1, "وقت نهاية الانصراف مطلوب"),
  weekends: z.array(z.string()).default([]),
})

export default function Shifts() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shiftName: "",
      startTime: "",
      endTime: "",
      gracePeriodIn: "0",
      gracePeriodOut: "0",
      checkInStart: "00:00",
      checkInEnd: "23:59",
      checkOutStart: "00:00",
      checkOutEnd: "23:59",
      weekends: [],
    },
  })

  // Fetch shifts
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_BASE}/shifts`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'فشل في تحميل المناوبات');
        }
        return response.json()
      } catch (error: any) {
        if (error.message === 'Failed to fetch') {
          throw new Error('فشل الاتصال بالسيرفر. تأكد من أن السيرفر يعمل على منفذ 4000');
        }
        throw error;
      }
    }
  })

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        shiftName: values.shiftName,
        startTime: values.startTime,
        endTime: values.endTime,
        gracePeriodIn: parseInt(values.gracePeriodIn.toString()) || 0,
        gracePeriodOut: parseInt(values.gracePeriodOut.toString()) || 0,
        checkInStart: values.checkInStart,
        checkInEnd: values.checkInEnd,
        checkOutStart: values.checkOutStart,
        checkOutEnd: values.checkOutEnd,
        weekends: values.weekends || []
      }

      const url = editingId ? `${API_BASE}/shifts/${editingId}` : `${API_BASE}/shifts`
      const method = editingId ? 'PATCH' : 'POST'

      try {
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to save shift');
        }
        return response.json()
      } catch (error: any) {
        if (error.message === 'Failed to fetch') {
          throw new Error('فشل الاتصال بالسيرفر عند الحفظ. تأكد من أن السيرفر يعمل');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      toast.success(editingId ? "تم تحديث المناوبة بنجاح" : "تم إضافة المناوبة بنجاح", {
        className: "font-cairo rounded-[15px] border-green-200 bg-green-50 text-green-900 shadow-md"
      })
      form.reset()
      setEditingId(null)
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء الحفظ", {
        duration: 6000,
        className: "font-cairo rounded-[15px] border-red-200 bg-red-50 text-red-900 shadow-md"
      })
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE}/shifts/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      toast.success("تم حذف المناوبة بنجاح", {
        className: "font-cairo rounded-[15px] border-green-200 bg-green-50 text-green-900 shadow-md"
      })
    }
  })

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Check for obvious time conflicts
    if (values.checkInStart >= values.checkInEnd) {
      toast.error("خطأ: وقت بدء قبول الحضور يجب أن يكون قبل وقت النهاية", {
        className: "font-cairo rounded-[15px] border-red-200 bg-red-50 text-red-900 shadow-md"
      });
      return;
    }
    if (values.checkOutStart >= values.checkOutEnd) {
      toast.error("خطأ: وقت بدء قبول الانصراف يجب أن يكون قبل وقت النهاية", {
        className: "font-cairo rounded-[15px] border-red-200 bg-red-50 text-red-900 shadow-md"
      });
      return;
    }
    mutation.mutate(values)
  }

  const handleEdit = (shift: any) => {
    setEditingId(shift.id)
    form.reset({
      shiftName: shift.shiftName,
      startTime: shift.startTime,
      endTime: shift.endTime,
      gracePeriodIn: shift.gracePeriodIn.toString(),
      gracePeriodOut: shift.gracePeriodOut.toString(),
      checkInStart: shift.checkInStart,
      checkInEnd: shift.checkInEnd,
      checkOutStart: shift.checkOutStart,
      checkOutEnd: shift.checkOutEnd,
      weekends: shift.weekends || []
    })
  }

  return (
    <div className="container mx-auto py-8 px-4 font-cairo" dir="rtl">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="bg-white p-6 rounded-[15px] shadow-sm border border-royal-blue/10 flex items-center gap-4">
          <div className="bg-royal-blue/10 p-3 rounded-[15px]">
            <Clock className="h-8 w-8 text-royal-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-royal-blue">إدارة المناوبات المتقدمة (Advanced Shifts)</h1>
            <p className="text-muted-foreground text-sm">إعداد أوقات العمل، فترات السماح، وأيام الإجازات الأسبوعية التفاعلية</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Form Card */}
          <Card className="border-none shadow-md overflow-hidden rounded-[15px]">
            <CardHeader className="bg-royal-blue text-white">
              <CardTitle className="flex items-center gap-2 text-lg">
                {editingId ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                {editingId ? "تعديل مناوبة متقدمة" : "إضافة مناوبة متقدمة"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* القسم الأول: الأساسيات */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-royal-blue border-b border-royal-blue/10 pb-1 flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4" />
                      البيانات الأساسية للمناوبة
                    </h3>
                    <FormField
                      control={form.control}
                      name="shiftName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-royal-blue font-bold text-xs">اسم المناوبة</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <LayoutGrid className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="مثال: صباحي، مسائي، طوارئ..." className="pr-10 rounded-[15px] border-royal-blue/20" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-royal-blue font-bold text-xs">بداية المناوبة</FormLabel>
                            <FormControl>
                              <Input type="time" className="rounded-[15px] border-royal-blue/20" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-royal-blue font-bold text-xs">نهاية المناوبة</FormLabel>
                            <FormControl>
                              <Input type="time" className="rounded-[15px] border-royal-blue/20" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* القسم الثاني: فترات السماح */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-bold text-royal-blue border-b border-royal-blue/10 pb-1 flex items-center gap-2">
                      <Timer className="h-4 w-4" />
                      فترات السماح (بالدقائق)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="gracePeriodIn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-royal-blue font-bold text-xs">سماح الدخول (دقائق)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Timer className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input type="number" min="0" className="pr-10 rounded-[15px] border-royal-blue/20" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="gracePeriodOut"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-royal-blue font-bold text-xs">سماح الخروج (دقائق)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Timer className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input type="number" min="0" className="pr-10 rounded-[15px] border-royal-blue/20" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* القسم الثالث: نطاقات الحضور والانصراف */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-bold text-royal-blue border-b border-royal-blue/10 pb-1 flex items-center gap-2">
                      <ArrowLeftRight className="h-4 w-4" />
                      نطاقات قبول بصمة الحضور
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="checkInStart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-royal-blue font-bold text-xs">بداية الحضور</FormLabel>
                            <FormControl>
                              <Input type="time" className="rounded-[15px] border-royal-blue/20" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="checkInEnd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-royal-blue font-bold text-xs">نهاية الحضور</FormLabel>
                            <FormControl>
                              <Input type="time" className="rounded-[15px] border-royal-blue/20" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-royal-blue border-b border-royal-blue/10 pb-1 flex items-center gap-2">
                      <ArrowLeftRight className="h-4 w-4" />
                      نطاقات قبول بصمة الانصراف
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="checkOutStart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-royal-blue font-bold text-xs">بداية الانصراف</FormLabel>
                            <FormControl>
                              <Input type="time" className="rounded-[15px] border-royal-blue/20" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="checkOutEnd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-royal-blue font-bold text-xs">نهاية الانصراف</FormLabel>
                            <FormControl>
                              <Input type="time" className="rounded-[15px] border-royal-blue/20" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* القسم الرابع: أيام الإجازة الأسبوعية */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-bold text-royal-blue border-b border-royal-blue/10 pb-1 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      أيام الإجازة الأسبوعية للمناوبة
                    </h3>
                    <FormField
                      control={form.control}
                      name="weekends"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <div className="flex flex-wrap gap-2 pt-1">
                            {DAYS_OF_WEEK.map((day) => {
                              const isSelected = (field.value || []).includes(day.id);
                              return (
                                <button
                                  type="button"
                                  key={day.id}
                                  onClick={() => {
                                    const newValue = isSelected
                                      ? (field.value || []).filter((d: string) => d !== day.id)
                                      : [...(field.value || []), day.id];
                                    field.onChange(newValue);
                                  }}
                                  className={cn(
                                    "px-3 py-1.5 rounded-[15px] text-xs font-bold transition-all border font-cairo",
                                    isSelected 
                                      ? "bg-royal-blue text-white border-royal-blue shadow-sm"
                                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                  )}
                                >
                                  {day.label}
                                </button>
                              );
                            })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      className="flex-1 bg-royal-blue hover:bg-royal-blue/90 rounded-[15px] h-11 font-bold text-white transition-all shadow-md"
                      disabled={mutation.isPending}
                    >
                      <Save className="ml-2 h-4 w-4" />
                      {editingId ? "حفظ التعديلات" : "إضافة المناوبة"}
                    </Button>
                    {editingId && (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-[15px] h-11 border-royal-blue/20 text-royal-blue hover:bg-royal-blue/5"
                        onClick={() => {
                          setEditingId(null)
                          form.reset()
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Table Card */}
          <Card className="lg:col-span-2 border-none shadow-md overflow-hidden rounded-[15px]">
            <CardHeader className="bg-white border-b border-royal-blue/10">
              <CardTitle className="text-royal-blue flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-royal-blue" />
                المناوبات الحالية وإعدادات البصمة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-royal-blue/5">
                  <TableRow>
                    <TableHead className="text-right font-bold text-royal-blue">المناوبة</TableHead>
                    <TableHead className="text-right font-bold text-royal-blue">وقت العمل</TableHead>
                    <TableHead className="text-right font-bold text-royal-blue">سماح (حضور/انصراف)</TableHead>
                    <TableHead className="text-right font-bold text-royal-blue">بصمة الحضور</TableHead>
                    <TableHead className="text-right font-bold text-royal-blue">بصمة الانصراف</TableHead>
                    <TableHead className="text-right font-bold text-royal-blue">أيام الإجازة</TableHead>
                    <TableHead className="text-center font-bold text-royal-blue w-24">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        لا توجد مناوبات مضافة حالياً
                      </TableCell>
                    </TableRow>
                  ) : (
                    shifts.map((shift: any) => (
                      <TableRow key={shift.id} className="hover:bg-royal-blue/5 transition-colors">
                        <TableCell className="font-bold text-royal-blue">{shift.shiftName}</TableCell>
                        <TableCell className="text-right font-medium">
                          <span dir="ltr">
                            {formatTimeDisplay(shift.startTime)} - {formatTimeDisplay(shift.endTime)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-block bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-bold ml-1">
                            +{shift.gracePeriodIn}د
                          </span>
                          <span className="inline-block bg-red-50 text-red-700 px-2 py-1 rounded-full text-xs font-bold">
                            +{shift.gracePeriodOut}د
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          <span dir="ltr">
                            [{shift.checkInStart} - {shift.checkInEnd}]
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          <span dir="ltr">
                            [{shift.checkOutStart} - {shift.checkOutEnd}]
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-xs">
                          {shift.weekends && shift.weekends.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {shift.weekends.map((dayId: string) => {
                                const dayObj = DAYS_OF_WEEK.find(d => d.id === dayId);
                                return (
                                  <span key={dayId} className="inline-block bg-royal-blue/10 text-royal-blue px-2.5 py-0.5 rounded-[12px] text-[10px] font-bold">
                                    {dayObj ? dayObj.label : dayId}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[10px] italic">بلا إجازة</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-royal-blue hover:bg-royal-blue/10 rounded-full h-8 w-8"
                              onClick={() => handleEdit(shift)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 rounded-full h-8 w-8"
                              onClick={() => {
                                if (confirm('هل أنت متأكد من حذف هذه المناوبة؟')) {
                                  deleteMutation.mutate(shift.id)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
