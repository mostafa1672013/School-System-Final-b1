import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Filter, FileText, CheckCircle2, Clock, CreditCard, UserCheck, GraduationCap, Upload, Image as ImageIcon, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAdmissionStore } from '@/stores/admissionStore';
import { useStudentsStore } from '@/stores/studentsStore';
import { useBusStore } from '@/stores/busStore';
import { useAuthStore } from '@/stores/authStore';
import { Link } from 'react-router-dom';
import { formatCurrency, stageLabels, statusLabels, trackLabels, gradeOptions, academicYears, currentAcademicYear, roleLabels } from '@/lib/utils';
import type { Stage, Track, Student, StudentStatus } from '@/types';
import StudentForm from '@/components/features/StudentForm';

const statusConfig: Record<string, { label: string, color: string, icon: any }> = {
    applied: { label: 'متقدم جديد', color: 'bg-blue-100 text-blue-700', icon: FileText },
    under_testing: { label: 'تحت الاختبار', color: 'bg-amber-100 text-amber-700', icon: Clock },
    failed: { label: 'لم يجتز الاختبار', color: 'bg-red-100 text-red-700', icon: GraduationCap },
    fee_setup: { label: 'إعداد الرسوم', color: 'bg-purple-100 text-purple-700', icon: CreditCard },
    pending_approval: { label: 'بانتظار الاعتماد', color: 'bg-orange-100 text-orange-700', icon: UserCheck },
    admitted: { label: 'تم القبول', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
    pending_discount: { label: 'طلب خصم معلق', color: 'bg-indigo-100 text-indigo-700', icon: CreditCard },
};

export default function Admission() {
    const { students, fetchStudents } = useStudentsStore();
    const { stageFees, fetchStageFees, applyAdmission, setTestResult, setupFees, approveAdmission } = useAdmissionStore();
    const { routes, fetchRoutes } = useBusStore();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    useEffect(() => {
        fetchStudents();
        fetchStageFees();
        fetchRoutes();
    }, [fetchStudents, fetchStageFees, fetchRoutes]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchesSearch = s.name.includes(search) || s.nationalId.includes(search);
            const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
            const isAdmissionProcess = ['applied', 'under_testing', 'failed', 'fee_setup', 'pending_discount', 'pending_approval'].includes(s.status);
            return matchesSearch && matchesStatus && (statusFilter !== 'all' || isAdmissionProcess);
        });
    }, [students, search, statusFilter]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-[Noto_Kufi_Arabic]">إدارة القبول والتسجيل</h1>
                    <p className="text-muted-foreground">متابعة طلبات الالتحاق والتحويل</p>
                </div>
                <Link to="/admission/new">
                    <Button className="font-[Noto_Kufi_Arabic]"><Plus className="size-4 ml-2" /> طلب التحاق جديد</Button>
                </Link>
            </div>

            <div className="flex items-center gap-3 bg-card p-4 rounded-lg border">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input placeholder="بحث بالاسم أو الرقم القومي..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                        <Filter className="size-4 ml-2" />
                        <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">كل الحالات</SelectItem>
                        {Object.entries(statusConfig).map(([val, cfg]) => (
                            <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    {filteredStudents.length === 0 ? (
                        <div className="text-center py-20 bg-card rounded-lg border border-dashed">
                            <GraduationCap className="size-12 mx-auto mb-4 opacity-20" />
                            <p className="text-muted-foreground font-medium">لا توجد طلبات مطابقة للبحث</p>
                        </div>
                    ) : (
                        filteredStudents.map(student => (
                            <Card key={student.id} className={`cursor-pointer transition-all hover:shadow-md ${selectedStudent?.id === student.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedStudent(student)}>
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-4">
                                            <div className="size-14 rounded-lg bg-muted flex items-center justify-center text-muted-foreground overflow-hidden border">
                                                {student.photoUrl ? <img src={student.photoUrl} className="size-full object-cover" /> : <ImageIcon className="size-6" />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">{student.name}</h3>
                                                <div className="flex gap-2 mt-1">
                                                    <Badge variant="outline" className="text-xs">{stageLabels[student.stage]} - {student.grade}</Badge>
                                                    <Badge variant="outline" className="text-xs">{trackLabels[student.track]}</Badge>
                                                    {student.hasSiblings && <Badge variant="secondary" className="text-xs flex items-center gap-1"><Users className="size-3" /> له إخوة</Badge>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <Badge className={statusConfig[student.status]?.color}>{statusConfig[student.status]?.label}</Badge>
                                            <p className="text-xs text-muted-foreground mt-2 font-mono">{student.nationalId}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                <div className="lg:sticky lg:top-6 h-fit">
                    {selectedStudent ? (
                        <AdmissionDetails 
                            student={selectedStudent} 
                            onUpdate={() => { fetchStudents(); setSelectedStudent(null); }} 
                        />
                    ) : (
                        <Card className="bg-muted/50 border-dashed">
                            <CardContent className="p-10 text-center">
                                <GraduationCap className="size-10 mx-auto mb-4 opacity-30" />
                                <p className="text-sm text-muted-foreground font-medium">اختر طالباً لمتابعة إجراءات القبول</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}


function AdmissionDetails({ student, onUpdate }: { student: Student, onUpdate: () => void }) {
    const { setTestResult, setupFees, approveAdmission, stageFees } = useAdmissionStore();
    const { user } = useAuthStore();
    const { routes } = useBusStore();
    const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
    const [isFeeDialogOpen, setIsFeeDialogOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const stageConfig = (stageFees || []).find(f => f.stage === student.stage && f.grade === student.grade && f.track === student.track && f.academicYear === student.academicYear);

    const handleTestResult = async (result: 'pass' | 'fail') => {
        await setTestResult(student.id, result);
        toast.success(`تم تسجيل النتيجة: ${result === 'pass' ? 'ناجح' : 'راسب'}`);
        onUpdate();
    };

    const handleSetupFees = async (data: any) => {
        await setupFees(student.id, data);
        toast.success('تم إعداد الرسوم والخصومات');
        onUpdate();
    };

    const handleApprove = async () => {
        try {
            const res = await fetch(`/api/admission/approve/${student.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ approverId: user?.id })
            });
            if (!res.ok) {
                const err = await res.json();
                toast.error(err.error || 'فشل الاعتماد');
                return;
            }
            toast.success('تم قبول الطالب بنجاح وتحويله إلى جدول الطلاب');
            onUpdate();
        } catch (error) {
            toast.error('حدث خطأ أثناء الاعتماد');
        }
    };

    return (
        <Card className="overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-bold font-[Noto_Kufi_Arabic]">إجراءات القبول</CardTitle>
                        <CardDescription>الخطوات الحالية للمتقدم: {student.name}</CardDescription>
                    </div>
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">تعديل الملف</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">تعديل بيانات المتقدم</DialogTitle></DialogHeader>
                            <StudentForm student={student} onSuccess={() => { setIsEditOpen(false); onUpdate(); }} />
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
                {/* Step 1: Payment Check & Documents */}
                <div className={`p-4 rounded-lg border-2 ${student.status === 'applied' ? 'border-amber-200 bg-amber-50 shadow-sm' : 'border-emerald-100 bg-emerald-50/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold flex items-center gap-2 text-sm"><CreditCard className="size-4" /> دفع رسوم الملف والمستندات</h4>
                        {student.status !== 'applied' ? <Badge className="bg-emerald-500">تم الدفع</Badge> : <Badge variant="outline">بانتظار الدفع</Badge>}
                    </div>
                    
                    <div className="space-y-2 mt-3">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1"><ImageIcon className="size-3" /> الصورة الشخصية:</span>
                            {student.photoUrl ? <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">مرفوعة</Badge> : <Badge variant="outline" className="text-[10px]">ناقصة</Badge>}
                        </div>
                        {Object.entries(student.documents || {}).map(([key, doc]: [string, any]) => (
                            <div key={key} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground flex items-center gap-1"><FileText className="size-3" /> {doc.label || key}:</span>
                                <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">مرفوعة</Badge>
                            </div>
                        ))}
                        {/* Show placeholders for missing required docs */}
                        {! (student.documents as any)?.birth_cert && (
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground flex items-center gap-1"><FileText className="size-3" /> شهادة الميلاد:</span>
                                <Badge variant="outline" className="text-[10px]">ناقصة</Badge>
                            </div>
                        )}
                        {! (student.documents as any)?.guardian_id && (
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground flex items-center gap-1"><FileText className="size-3" /> بطاقة ولي الأمر:</span>
                                <Badge variant="outline" className="text-[10px]">ناقصة</Badge>
                            </div>
                        )}
                    </div>

                    {/* Extra Fields Summary */}
                    {(student as any).extraFields && (student as any).extraFields.length > 0 && (
                        <div className="mt-4 pt-4 border-t space-y-2">
                            <h5 className="text-[10px] font-bold text-muted-foreground uppercase">بيانات إضافية</h5>
                            {(student as any).extraFields.map((f: any, i: number) => (
                                <div key={i} className="flex justify-between text-xs bg-muted/30 p-2 rounded">
                                    <span className="text-muted-foreground">{f.label}:</span>
                                    <span className="font-medium">{f.value}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {student.status === 'applied' && (
                        <div className="mt-4 p-2 bg-white rounded border text-xs flex justify-between items-center">
                            <span>القيمة المطلوبة للملف:</span>
                            <span className="font-bold">{formatCurrency(stageConfig?.applicationFees || 500)}</span>
                        </div>
                    )}
                </div>

                {/* Step 2: Testing */}
                <div className={`p-4 rounded-lg border-2 ${student.status === 'under_testing' ? 'border-amber-200 bg-amber-50 shadow-sm' : ['fee_setup', 'pending_approval', 'admitted'].includes(student.status) ? 'border-emerald-100 bg-emerald-50/30' : 'opacity-40 grayscale'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold flex items-center gap-2 text-sm"><Clock className="size-4" /> اختبارات القبول</h4>
                        {['fee_setup', 'pending_approval', 'admitted'].includes(student.status) ? <Badge className="bg-emerald-500">اجتاز</Badge> : student.status === 'failed' ? <Badge className="bg-red-500">لم يجتز</Badge> : student.status === 'under_testing' ? <Badge variant="outline">قيد الاختبار</Badge> : null}
                    </div>
                    {['under_testing', 'failed'].includes(student.status) && (
                        <div className="flex gap-2 mt-4">
                            <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleTestResult('pass')}>ناجح</Button>
                            <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleTestResult('fail')}>راسب</Button>
                        </div>
                    )}
                </div>

                {/* Step 3: Fee Setup */}
                <div className={`p-4 rounded-lg border-2 ${student.status === 'fee_setup' ? 'border-amber-200 bg-amber-50 shadow-sm' : ['pending_discount', 'pending_approval', 'admitted'].includes(student.status) ? 'border-emerald-100 bg-emerald-50/30' : 'opacity-40 grayscale'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold flex items-center gap-2 text-sm"><CreditCard className="size-4" /> إعداد الرسوم والخصومات</h4>
                        {['pending_discount', 'pending_approval', 'admitted'].includes(student.status) ? <Badge className="bg-emerald-500">تم الإعداد</Badge> : null}
                    </div>
                    {student.status === 'fee_setup' && (
                        <Dialog open={isFeeDialogOpen} onOpenChange={setIsFeeDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="w-full mt-2">إدراج الرسوم والخصم</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">إعداد الرسوم المالية للمتقدم</DialogTitle></DialogHeader>
                                <FeeSetupForm 
                                    student={student} 
                                    config={stageConfig} 
                                    routes={routes} 
                                    onSubmit={(d) => { handleSetupFees(d); setIsFeeDialogOpen(false); }} 
                                />
                            </DialogContent>
                        </Dialog>
                    )}
                    {['pending_approval', 'pending_discount'].includes(student.status) && (
                        <div className="mt-2 text-xs space-y-1">
                            <div className="flex justify-between"><span>إجمالي الرسوم:</span><span className="font-bold">{formatCurrency(student.totalFees)}</span></div>
                            <div className="flex justify-between text-red-600"><span>الخصم المطبق:</span><span className="font-bold">-{formatCurrency(student.discountAmount)}</span></div>
                            {(student.discountStatus === 'pending' || student.status === 'pending_discount') && (
                                <div className="p-3 mt-2 bg-red-50 border-2 border-red-200 rounded text-xs text-red-700 font-bold">
                                    ⚠ الملف مجمد مالياً — بانتظار اعتماد الخصم من الإدارة المالية
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Step 4: Final Approval */}
                <div className={`p-4 rounded-lg border-2 ${(student.status === 'pending_approval' && student.discountStatus !== 'pending') ? 'border-amber-200 bg-amber-50 shadow-sm' : student.status === 'admitted' ? 'border-emerald-100 bg-emerald-50/30' : 'opacity-40 grayscale'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold flex items-center gap-2 text-sm"><UserCheck className="size-4" /> الاعتماد النهائي</h4>
                        {student.status === 'admitted' ? <Badge className="bg-emerald-500">تم الاعتماد</Badge> : (student.discountStatus === 'pending' || student.status === 'pending_discount') ? <Badge className="bg-red-500">مجمد - خصم معلق</Badge> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">مراجعة المحاسب والمدير للخصومات والاعتماد النهائي للملف.</p>
                    {student.status === 'pending_approval' && student.discountStatus !== 'pending' && (
                        <Button className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 font-[Noto_Kufi_Arabic]" onClick={handleApprove}>
                            اعتماد الطلب وتحويله لطالب نشط
                        </Button>
                    )}
                    {(student.discountStatus === 'pending' || student.status === 'pending_discount') && (
                        <div className="p-3 mt-3 bg-red-50 border-2 border-red-200 rounded text-center">
                            <p className="text-sm text-red-700 font-bold">لا يمكن الاعتماد حتى يتم البت في طلب الخصم المعلق</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function FeeSetupForm({ student, config, routes, onSubmit }: { student: Student, config?: any, routes: any[], onSubmit: (data: any) => void }) {
    const { user } = useAuthStore();
    const { fetchStageFees } = useAdmissionStore();
    const [data, setData] = useState({
        tuitionFees: config?.tuitionFees || 0,
        tuitionSelected: true,
        tuitionMandatory: config?.tuitionMandatory ?? true,
        booksFees: config?.booksFees || 0,
        booksSelected: config?.booksMandatory ?? true,
        booksMandatory: config?.booksMandatory ?? true,
        uniformFees: config?.uniformFees || 0,
        uniformSelected: config?.uniformMandatory ?? true,
        uniformMandatory: config?.uniformMandatory ?? true,
        busFees: 0,
        otherFees: 0,
        discountAmount: 0,
        discountPercentage: 0,
        discountApprovedBy: '',
        busRouteId: '',
        additionalFees: (Array.isArray(config?.additionalFees) ? config.additionalFees : []).map((f: any) => ({ 
            name: f.name || 'رسوم',
            amount: f.amount || 0,
            isMandatory: !!f.isMandatory,
            selected: !!f.isMandatory 
        }))
    });

    const [userLimit, setUserLimit] = useState(user?.discountLimitPercent || 0);

    useEffect(() => {
        fetchStageFees();
        // Fetch latest user limit from backend
        if (user?.id) {
            fetch(`/api/users/${user.id}`)
                .then(res => res.json())
                .then(data => setUserLimit(data.discountLimitPercent || 0))
                .catch(err => console.error('Failed to fetch user limit'));
        }
    }, [fetchStageFees, user?.id]);

    const userLimitPercent = userLimit;
    const userRoleLabel = roleLabels[user?.role || 'accountant'] || user?.role;

    const additionalTotal = data.additionalFees.reduce((sum, f) => sum + (f.selected ? f.amount : 0), 0);
    const standardTotal = 
        (data.tuitionSelected ? data.tuitionFees : 0) + 
        (data.booksSelected ? data.booksFees : 0) + 
        (data.uniformSelected ? data.uniformFees : 0) + 
        data.busFees;
        
    const totalBeforeDiscount = standardTotal + additionalTotal;

    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [needsApproval, setNeedsApproval] = useState(false);
    const [selectedApprover, setSelectedApprover] = useState<string>('');

    useEffect(() => {
        fetch('/api/users')
            .then(res => res.json())
            .then(data => setAllUsers(data));
    }, []);

    const handleDiscountChange = (val: number, type: 'amount' | 'percentage') => {
        let amount = data.discountAmount;
        let percentage = data.discountPercentage;
        const baseAmount = totalBeforeDiscount || 1;

        if (type === 'percentage') {
            percentage = val;
            amount = (baseAmount * percentage) / 100;
        } else {
            amount = val;
            percentage = (amount / baseAmount) * 100;
        }

        const exceeding = percentage > userLimitPercent;
        setNeedsApproval(exceeding);
        if (exceeding) {
            toast.info(`هذا الخصم (${percentage.toFixed(1)}%) يتجاوز حدك المسموح (${userLimitPercent}%). سيتم إرساله للاعتماد.`);
        }

        setData(prev => ({ 
            ...prev, 
            discountAmount: amount, 
            discountPercentage: percentage,
            discountApprovedBy: exceeding ? '' : userRoleLabel
        }));
    };

    const potentialApprovers = allUsers.filter(u => u.discountLimitPercent >= data.discountPercentage && u.id !== user?.id);

    const total = totalBeforeDiscount - data.discountAmount;

    const toggleStandardFee = (field: 'tuitionSelected' | 'booksSelected' | 'uniformSelected', mandatory: boolean) => {
        if (mandatory) return;
        setData(prev => ({ ...prev, [field]: !prev[field as keyof typeof prev] }));
    };

    const toggleFee = (idx: number) => {
        const fees = [...data.additionalFees];
        if (fees[idx].isMandatory) return; // Cannot unselect mandatory
        fees[idx].selected = !fees[idx].selected;
        setData({ ...data, additionalFees: fees });
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div 
                    onClick={() => toggleStandardFee('tuitionSelected', data.tuitionMandatory)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center justify-between ${data.tuitionSelected ? 'border-primary bg-primary/5' : 'bg-muted/30 opacity-60'}`}
                >
                    <div>
                        <p className="font-bold text-xs">رسوم التعليم</p>
                        <p className="text-[10px] text-muted-foreground">{data.tuitionMandatory ? 'إجباري' : 'اختياري'}</p>
                    </div>
                    <span className="font-bold text-sm">{formatCurrency(data.tuitionFees)}</span>
                </div>

                <div 
                    onClick={() => toggleStandardFee('booksSelected', data.booksMandatory)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center justify-between ${data.booksSelected ? 'border-primary bg-primary/5' : 'bg-muted/30 opacity-60'}`}
                >
                    <div>
                        <p className="font-bold text-xs">رسوم الكتب</p>
                        <p className="text-[10px] text-muted-foreground">{data.booksMandatory ? 'إجباري' : 'اختياري'}</p>
                    </div>
                    <span className="font-bold text-sm">{formatCurrency(data.booksFees)}</span>
                </div>

                <div 
                    onClick={() => toggleStandardFee('uniformSelected', data.uniformMandatory)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center justify-between ${data.uniformSelected ? 'border-primary bg-primary/5' : 'bg-muted/30 opacity-60'}`}
                >
                    <div>
                        <p className="font-bold text-xs">رسوم الزي</p>
                        <p className="text-[10px] text-muted-foreground">{data.uniformMandatory ? 'إجباري' : 'اختياري'}</p>
                    </div>
                    <span className="font-bold text-sm">{formatCurrency(data.uniformFees)}</span>
                </div>
            </div>

            <div className="space-y-2">
                <Label>خط الباص</Label>
                <Select value={data.busRouteId} onValueChange={v => {
                    const route = routes.find(r => r.id === v);
                    setData({...data, busRouteId: v, busFees: route?.annualFee || 0});
                }}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="اختر الخط" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">لا يوجد</SelectItem>
                        {Array.isArray(routes) && routes.map(r => (
                            <SelectItem key={r.id} value={r.id}>
                                {r.name} ({formatCurrency(r.annualFee)})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label className="font-bold">رسوم إضافية</Label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.additionalFees.map((fee, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => toggleFee(idx)}
                            className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center justify-between ${fee.selected ? 'border-primary bg-primary/5' : 'bg-muted/30 opacity-60'}`}
                        >
                            <div>
                                <p className="font-bold text-xs">{fee.name}</p>
                                <p className="text-[10px] text-muted-foreground">{fee.isMandatory ? 'إجباري' : 'اختياري'}</p>
                            </div>
                            <span className="font-bold text-sm">{formatCurrency(fee.amount)}</span>
                        </div>
                    ))}
                    {data.additionalFees.length === 0 && (
                        <div className="col-span-full py-4 text-center border border-dashed rounded-lg text-xs text-muted-foreground">
                            لا توجد رسوم إضافية لهذا الصف
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 rounded-lg bg-red-50 border border-red-100 space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-red-800">إدراج خصم خاص</h4>
                    {userLimitPercent > 0 && (
                        <Badge variant="outline" className="text-[10px] border-red-200 text-red-600">
                            حدك الأقصى: {userLimitPercent}%
                        </Badge>
                    )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>نسبة الخصم %</Label>
                        <Input type="number" value={data.discountPercentage} onChange={e => handleDiscountChange(Number(e.target.value), 'percentage')} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                        <Label>قيمة الخصم</Label>
                        <Input type="number" value={data.discountAmount} onChange={e => handleDiscountChange(Number(e.target.value), 'amount')} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                        <Label>بموافقة</Label>
                        {needsApproval ? (
                            <Select value={selectedApprover} onValueChange={setSelectedApprover}>
                                <SelectTrigger className="bg-white border-blue-200">
                                    <SelectValue placeholder="اختر من يعتمد" />
                                </SelectTrigger>
                                <SelectContent>
                                    {potentialApprovers.length > 0 ? (
                                        potentialApprovers.map(u => (
                                            <SelectItem key={u.id} value={u.id}>{u.name} ({u.discountLimitPercent}%)</SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="none" disabled>لا يوجد مستخدم بهذه الصلاحية</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input 
                                readOnly 
                                value={data.discountApprovedBy} 
                                className="bg-muted cursor-not-allowed" 
                                placeholder="تحدد تلقائياً" 
                            />
                        )}
                    </div>
                </div>
                {needsApproval && (
                    <p className="text-[10px] text-blue-600 mt-2 font-bold">
                        * سيتم إرسال طلب الخصم للموظف المختار للموافقة عليه قبل إتمام العملية.
                    </p>
                )}
            </div>

            <div className="p-4 rounded-lg bg-primary/5 border text-center">
                <p className="text-sm text-muted-foreground">إجمالي المبلغ النهائي المستحق</p>
                <p className="text-2xl font-bold text-primary font-mono">{formatCurrency(total)}</p>
            </div>

            <Button 
                className="w-full font-[Noto_Kufi_Arabic]" 
                disabled={needsApproval && !selectedApprover}
                onClick={() => onSubmit({ 
                    ...data, 
                    discountStatus: needsApproval ? 'pending' : 'approved',
                    discountApproverId: selectedApprover || null,
                    discountRequesterId: user?.id
                })}
            >
                {needsApproval ? 'إرسال طلب الخصم للاعتماد' : 'حفظ وتحويل للاعتماد'}
            </Button>
        </div>
    );
}
