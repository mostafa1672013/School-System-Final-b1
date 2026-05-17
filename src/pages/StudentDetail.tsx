import { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
    ArrowRight, User, Phone, MapPin, Calendar, CreditCard, BookOpen,
    CheckCircle2, Clock, AlertCircle, Bus, Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStudentsStore } from '@/stores/studentsStore';
import { usePaymentsStore } from '@/stores/paymentsStore';
import { useBusStore } from '@/stores/busStore';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatDateShort, stageLabels, paymentTypeLabels, paymentMethodLabels, generateId } from '@/lib/utils';
import type { PaymentType, PaymentMethod } from '@/types';
import { printPaymentReceipt } from '@/hooks/usePrintReceipt';

const instStatusConfig = {
    paid: { label: 'مسدد', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    pending: { label: 'قادم', icon: Clock, color: 'text-amber-600 bg-amber-50' },
    overdue: { label: 'متأخر', icon: AlertCircle, color: 'text-red-600 bg-red-50' },
};

export default function StudentDetail() {
    const { id } = useParams<{ id: string }>();
    const { students, fetchStudents, updateStudent } = useStudentsStore();
    const { payments, fetchPayments, addPayment, installmentPlans, payInstallment, addInstallmentPlan, updateInstallmentPlan } = usePaymentsStore();
    const { subscriptions, routes } = useBusStore();
    const { user } = useAuthStore();

    useEffect(() => {
        fetchStudents();
        fetchPayments();
    }, [fetchStudents, fetchPayments]);

    const student = students.find((s) => s.id === id);
    const studentPayments = useMemo(() => payments.filter((p) => p.studentId === id && p.type !== 'application_fee'), [payments, id]);
    const studentInstallments = useMemo(() => installmentPlans.filter((p) => p.studentId === id), [installmentPlans, id]);
    const busSub = subscriptions.find((s) => s.studentId === id && s.status === 'active');

    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [instDialogOpen, setInstDialogOpen] = useState(false);
    const [payForm, setPayForm] = useState({ amount: 0, type: 'tuition' as PaymentType, method: 'cash' as PaymentMethod, notes: '', walletPhoneNumber: '' });
    const [instForm, setInstForm] = useState({ totalAmount: 0, numberOfInstallments: 3 });
    const [installmentsPreview, setInstallmentsPreview] = useState<{id?: string, dueDate: string, amount: number, status?: string, paidAmount?: number}[]>([]);
    const [payingInstallment, setPayingInstallment] = useState<{planId: string, instId: string, maxAmount: number} | null>(null);
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

    // Pre-fill form if there's a rejected request
    useEffect(() => {
        if (student && student.paymentRequestStatus === 'rejected' && payDialogOpen) {
            setPayForm(prev => ({
                ...prev,
                amount: student.pendingPaymentAmount || 0,
                type: (student.pendingPaymentType as PaymentType) || 'tuition',
                method: (student.pendingPaymentMethod as PaymentMethod) || 'cash',
                walletPhoneNumber: student.pendingWalletPhoneNumber || ''
            }));
            if (student.pendingInstallmentPlanId && student.pendingInstallmentId) {
                setPayingInstallment({
                    planId: student.pendingInstallmentPlanId,
                    instId: student.pendingInstallmentId,
                    maxAmount: student.pendingPaymentAmount || 0
                });
            }
        }
    }, [payDialogOpen, student]);

    if (!student) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <p className="text-lg text-muted-foreground">الطالب غير موجود</p>
                <Link to="/students"><Button variant="outline">العودة للطلاب</Button></Link>
            </div>
        );
    }

    const remaining = student.totalFees - student.paidAmount;
    const totalDebt = student.yearlyFinance?.reduce((sum, yf) => sum + (yf.totalFees - yf.paidAmount), 0) || remaining;
    const paidPct = student.totalFees > 0 ? Math.round((student.paidAmount / student.totalFees) * 100) : 0;

    // Initialize installment plan dialog
    useEffect(() => {
        if (instDialogOpen && student) {
            if (editingPlanId) {
                const plan = studentInstallments.find(p => p.id === editingPlanId);
                if (plan) {
                    setInstForm({ totalAmount: plan.totalAmount, numberOfInstallments: plan.numberOfInstallments });
                    setInstallmentsPreview(plan.installments.map(i => ({
                        id: i.id,
                        dueDate: i.dueDate,
                        amount: i.amount,
                        status: i.status,
                        paidAmount: i.paidAmount
                    })));
                }
            } else {
                setInstForm({ totalAmount: totalDebt, numberOfInstallments: 3 });
                generateInstallmentsPreview(totalDebt, 3);
            }
        } else {
            setEditingPlanId(null);
        }
    }, [instDialogOpen, editingPlanId]);

    const generateInstallmentsPreview = (total: number, count: number) => {
        const instAmount = Math.ceil(total / count);
        const preview = Array.from({ length: count }, (_, i) => {
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + i + 1);
            return {
                dueDate: dueDate.toISOString().split('T')[0],
                amount: i === count - 1 ? total - instAmount * (count - 1) : instAmount,
            };
        });
        setInstallmentsPreview(preview);
    };

    const handleUpdatePreview = (index: number, field: 'dueDate' | 'amount', value: any) => {
        const newPreview = [...installmentsPreview];
        newPreview[index] = { ...newPreview[index], [field]: value };
        setInstallmentsPreview(newPreview);
    };

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (payForm.method === 'wallet' && !payForm.walletPhoneNumber) {
            toast.error('يرجى إدخال رقم المحفظة المحول منها');
            return;
        }

        try {
            const nextStatus = payForm.method === 'cash' ? 'pending_treasury' : 'pending_director';
            await updateStudent(student.id, { 
                pendingPaymentAmount: payForm.amount,
                pendingPaymentType: payForm.type,
                pendingPaymentMethod: payForm.method,
                pendingWalletPhoneNumber: payForm.method === 'wallet' ? payForm.walletPhoneNumber : undefined,
                pendingInstallmentPlanId: payingInstallment?.planId,
                pendingInstallmentId: payingInstallment?.instId,
                paymentRequestStatus: nextStatus
            });
            if (nextStatus === 'pending_treasury') {
                toast.success('تم إرسال طلب التحصيل إلى الخزينة للتأكيد');
            } else {
                toast.success('تم إرسال طلب التحصيل إلى مدير المدرسة للاعتماد');
            }
            setPayDialogOpen(false);
            setPayingInstallment(null);
            setPayForm({ amount: 0, type: 'tuition', method: 'cash', notes: '', walletPhoneNumber: '' });
        } catch (error) {
            toast.error('حدث خطأ أثناء إرسال الطلب');
        }
    };

    const handleCreatePlan = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate total amounts match
        const sum = installmentsPreview.reduce((acc, curr) => acc + Number(curr.amount), 0);
        if (sum !== instForm.totalAmount) {
            toast.error(`مجموع الأقساط (${formatCurrency(sum)}) لا يتطابق مع إجمالي المبلغ (${formatCurrency(instForm.totalAmount)})`);
            return;
        }

        const installments = installmentsPreview.map((preview) => ({
            id: preview.id || generateId(),
            dueDate: preview.dueDate,
            amount: Number(preview.amount),
            status: (preview.status as any) || 'pending',
            paidAmount: preview.paidAmount || 0,
        }));

        if (editingPlanId) {
            if (user?.role === 'school_director' || user?.role === 'system_admin') {
                updateInstallmentPlan(editingPlanId, {
                    totalAmount: instForm.totalAmount,
                    numberOfInstallments: instForm.numberOfInstallments,
                    installments,
                });
                toast.success('تم تعديل خطة الأقساط بنجاح');
            } else {
                const existingPlan = studentInstallments.find(p => p.id === editingPlanId);
                usePaymentsStore.getState().addPendingPlanEdit({
                    planId: editingPlanId,
                    studentId: student.id,
                    studentName: student.name,
                    oldTotal: existingPlan?.totalAmount || 0,
                    newTotal: instForm.totalAmount,
                    oldInstallments: existingPlan?.installments || [],
                    newInstallments: installments,
                    requestDate: new Date().toISOString().split('T')[0],
                    requestedBy: user?.name || 'مستخدم'
                });
                toast.success('تم إرسال طلب تعديل تواريخ الأقساط لمدير المدرسة للاعتماد');
            }
        } else {
            addInstallmentPlan({
                studentId: student.id,
                studentName: student.name,
                totalAmount: instForm.totalAmount,
                numberOfInstallments: instForm.numberOfInstallments,
                installments,
                createdDate: new Date().toISOString().split('T')[0],
            });
            toast.success('تم إنشاء خطة الأقساط بنجاح');
        }
        
        setInstDialogOpen(false);
    };

    const handlePayInstallment = (planId: string, installmentId: string, amount: number) => {
        setPayingInstallment({ planId, instId: installmentId, maxAmount: amount });
        setPayForm({ amount, type: 'tuition', method: 'cash', notes: '', walletPhoneNumber: '' });
        setPayDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <Link to="/students" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowRight className="size-4" />
                العودة لقائمة الطلاب
            </Link>

            {/* Student Header */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-lg border bg-card p-6">
                    <div className="flex items-start gap-4">
                        <div className="size-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <User className="size-8" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold font-[Noto_Kufi_Arabic]">{student.name}</h2>
                            <p className="text-sm text-muted-foreground mt-1">{stageLabels[student.stage]} — {student.grade} / {student.className}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground"><BookOpen className="size-4" /> الرقم القومي: <span className="tabular-nums font-medium text-foreground">{student.nationalId}</span></div>
                                <div className="flex items-center gap-2 text-muted-foreground"><Phone className="size-4" /> ولي الأمر: <span className="font-medium text-foreground">{student.guardianName}</span></div>
                                <div className="flex items-center gap-2 text-muted-foreground"><Phone className="size-4" /> الهاتف: <span className="tabular-nums font-medium text-foreground" dir="ltr">{student.guardianPhone}</span></div>
                                <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="size-4" /> العنوان: <span className="font-medium text-foreground">{student.address}</span></div>
                                <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="size-4" /> تاريخ التسجيل: <span className="font-medium text-foreground">{formatDateShort(student.enrollmentDate)}</span></div>
                                {busSub && (
                                    <div className="flex items-center gap-2 text-muted-foreground"><Bus className="size-4" /> الباص: <span className="font-medium text-foreground">{busSub.routeName}</span></div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Financial Summary */}
                <div className="rounded-lg border bg-card p-6 space-y-4">
                    <h3 className="font-bold font-[Noto_Kufi_Arabic]">الملخص المالي</h3>
                    <div className="space-y-3">
                        <div className="space-y-1.5 mb-3 bg-muted/30 p-3 rounded-lg border">
                            <p className="text-xs font-bold text-muted-foreground mb-2">تفاصيل الرسوم المستحقة:</p>
                            {student.tuitionFees > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">مصروفات دراسية</span><span className="font-medium tabular-nums">{formatCurrency(student.tuitionFees)}</span></div>}
                            {student.booksFees > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">كتب دراسية</span><span className="font-medium tabular-nums">{formatCurrency(student.booksFees)}</span></div>}
                            {student.uniformFees > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">زي مدرسي</span><span className="font-medium tabular-nums">{formatCurrency(student.uniformFees)}</span></div>}
                            {student.busFees > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">اشتراك باص</span><span className="font-medium tabular-nums">{formatCurrency(student.busFees)}</span></div>}
                            {student.otherFees > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">رسوم أخرى</span><span className="font-medium tabular-nums">{formatCurrency(student.otherFees)}</span></div>}
                        </div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">إجمالي الرسوم المطلوبة</span><span className="font-bold tabular-nums">{formatCurrency(student.totalFees)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">المدفوع (السنة الحالية)</span><span className="font-bold text-emerald-600 tabular-nums">{formatCurrency(student.paidAmount)}</span></div>
                        <div className="flex justify-between text-sm border-t pt-2 mt-2"><span className="text-muted-foreground font-bold">إجمالي الرصيد المتبقي (غير مسدد)</span><span className="font-bold text-red-600 tabular-nums">{formatCurrency(totalDebt)}</span></div>
                        <div>
                            <div className="flex justify-between text-xs mb-1"><span>{paidPct}%</span></div>
                            <div className="h-3 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${paidPct}%` }} />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="flex-1" size="sm"><CreditCard className="size-4 ml-1" />تسجيل دفعة</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">تسجيل دفعة جديدة</DialogTitle></DialogHeader>
                                <form onSubmit={handlePay} className="space-y-4">
                                    {payingInstallment && (
                                        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded text-sm mb-3 font-medium">
                                            أنت تقوم بتسديد قسط محدد (بإمكانك تسديد جزء من القسط)
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>المبلغ المطلوب تحصيله</Label>
                                            <Input type="number" required min={1} max={payingInstallment ? payingInstallment.maxAmount : totalDebt} value={payForm.amount || ''} onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>النوع</Label>
                                            <Select value={payForm.type} onValueChange={(v) => setPayForm({ ...payForm, type: v as PaymentType })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(paymentTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>طريقة الدفع</Label>
                                        <Select value={payForm.method} onValueChange={(v) => setPayForm({ ...payForm, method: v as PaymentMethod })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(paymentMethodLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {payForm.method === 'wallet' && (
                                        <div className="space-y-2 border p-3 rounded-lg bg-slate-50">
                                            <Label className="text-primary font-bold">رقم المحفظة (الرقم المحول منه)</Label>
                                            <Input 
                                                required 
                                                type="tel" 
                                                dir="ltr"
                                                placeholder="مثال: 01012345678" 
                                                value={payForm.walletPhoneNumber} 
                                                onChange={(e) => setPayForm({ ...payForm, walletPhoneNumber: e.target.value })} 
                                                className="font-mono text-right"
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label>ملاحظات (اختياري)</Label>
                                        <Input value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
                                    </div>
                                    <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setPayDialogOpen(false)}>إلغاء</Button><Button type="submit">إرسال الطلب</Button></div>
                                </form>
                            </DialogContent>
                        </Dialog>
                        <Dialog open={instDialogOpen} onOpenChange={setInstDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="flex-1" size="sm" disabled={studentInstallments.length > 0}>
                                    {studentInstallments.length > 0 ? 'يوجد خطة أقساط (للتعديل من الأسفل)' : 'خطة أقساط'}
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">{editingPlanId ? 'تعديل خطة الأقساط' : 'إنشاء خطة أقساط'}</DialogTitle></DialogHeader>
                                <form onSubmit={handleCreatePlan} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>إجمالي المبلغ</Label>
                                            <Input 
                                                type="number" 
                                                required 
                                                min={1} 
                                                max={totalDebt}
                                                value={instForm.totalAmount || ''} 
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    setInstForm({ ...instForm, totalAmount: val });
                                                    generateInstallmentsPreview(val, instForm.numberOfInstallments);
                                                }} 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>عدد الأقساط</Label>
                                            <Input 
                                                type="number" 
                                                required 
                                                min={2} 
                                                max={12} 
                                                value={instForm.numberOfInstallments} 
                                                onChange={(e) => {
                                                    const count = Number(e.target.value);
                                                    setInstForm({ ...instForm, numberOfInstallments: count });
                                                    generateInstallmentsPreview(instForm.totalAmount, count);
                                                }} 
                                            />
                                        </div>
                                    </div>

                                    {installmentsPreview.length > 0 && (
                                        <div className="space-y-3 mt-4 border rounded-lg p-4 bg-slate-50/50">
                                            <div className="flex justify-between items-center mb-2">
                                                <Label className="font-bold text-primary">تفاصيل الأقساط</Label>
                                                <Badge variant="outline" className={installmentsPreview.reduce((s, p) => s + Number(p.amount), 0) === instForm.totalAmount ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}>
                                                    المجموع: {formatCurrency(installmentsPreview.reduce((s, p) => s + Number(p.amount), 0))}
                                                </Badge>
                                            </div>
                                            <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
                                                {installmentsPreview.map((preview, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded border shadow-sm">
                                                        <div className="w-8 text-center text-sm font-bold text-muted-foreground bg-slate-100 rounded-md py-1">{idx + 1}</div>
                                                        <div className="flex-1 space-y-1">
                                                            <Label className="text-xs text-muted-foreground">تاريخ الاستحقاق</Label>
                                                            <Input 
                                                                type="date" 
                                                                className="h-8 text-sm" 
                                                                value={preview.dueDate} 
                                                                onChange={(e) => handleUpdatePreview(idx, 'dueDate', e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <Label className="text-xs text-muted-foreground">قيمة القسط</Label>
                                                            <Input 
                                                                type="number" 
                                                                className="h-8 text-sm" 
                                                                value={preview.amount || ''} 
                                                                onChange={(e) => handleUpdatePreview(idx, 'amount', Number(e.target.value))}
                                                                required
                                                                min={1}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-3 pt-2">
                                        <Button type="button" variant="outline" onClick={() => setInstDialogOpen(false)}>إلغاء</Button>
                                        <Button type="submit">{editingPlanId ? 'حفظ التعديلات' : 'إنشاء الخطة'}</Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            {/* Rejected Request Alert */}
            {student.paymentRequestStatus === 'rejected' && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start gap-3">
                    <AlertCircle className="size-5 mt-0.5 text-red-600 shrink-0" />
                    <div>
                        <p className="font-bold">طلب تحصيل مرفوض أو معترض عليه</p>
                        <p className="text-sm mt-1">لقد تم إرجاع طلب التحصيل الأخير (المبلغ: {formatCurrency(student.pendingPaymentAmount || 0)}). يرجى مراجعة البيانات وتعديلها عبر زر "تسجيل دفعة" لإعادة إرسال الطلب.</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="payments" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="payments">سجل المدفوعات</TabsTrigger>
                    <TabsTrigger value="installments">خطط الأقساط</TabsTrigger>
                    <TabsTrigger value="history">السجل المالي للسنوات</TabsTrigger>
                </TabsList>

                <TabsContent value="payments">
                    <div className="rounded-lg border bg-card overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40">
                                    <th className="text-right p-3 font-semibold">رقم الإيصال</th>
                                    <th className="text-right p-3 font-semibold">المبلغ</th>
                                    <th className="text-right p-3 font-semibold">النوع</th>
                                    <th className="text-right p-3 font-semibold hidden sm:table-cell">الطريقة</th>
                                    <th className="text-right p-3 font-semibold hidden md:table-cell">التاريخ</th>
                                    <th className="text-right p-3 font-semibold w-14">طباعة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {studentPayments.map((p) => (
                                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                                        <td className="p-3 tabular-nums font-mono text-xs">{p.receiptNumber}</td>
                                        <td className="p-3 font-bold tabular-nums text-primary">{formatCurrency(p.amount)}</td>
                                        <td className="p-3">{paymentTypeLabels[p.type]}</td>
                                        <td className="p-3 hidden sm:table-cell">{paymentMethodLabels[p.method]}</td>
                                        <td className="p-3 hidden md:table-cell text-muted-foreground">{formatDateShort(p.date)}</td>
                                        <td className="p-3">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-7 text-muted-foreground hover:text-primary"
                                                onClick={() => printPaymentReceipt(p, { grade: `${student.grade} / ${student.className}`, guardianName: student.guardianName })}
                                                aria-label="طباعة الإيصال"
                                            >
                                                <Printer className="size-3.5" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {studentPayments.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground"><CreditCard className="size-10 mx-auto mb-3 opacity-30" /><p>لا يوجد مدفوعات مسجلة</p></div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="installments" className="space-y-4">
                    {studentInstallments.length === 0 ? (
                        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
                            <Clock className="size-10 mx-auto mb-3 opacity-30" />
                            <p>لا يوجد خطط أقساط — يمكنك إنشاء خطة جديدة من الأعلى</p>
                        </div>
                    ) : (
                        studentInstallments.map((plan) => (
                            <div key={plan.id} className="rounded-lg border bg-card p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold font-[Noto_Kufi_Arabic]">خطة أقساط — إجمالي المستحق: {formatCurrency(plan.totalAmount)}</h4>
                                        <p className="text-xs text-muted-foreground">{plan.numberOfInstallments} أقساط • أنشئت في {formatDateShort(plan.createdDate)}</p>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => {
                                        setEditingPlanId(plan.id);
                                        setInstDialogOpen(true);
                                    }}>
                                        {user?.role === 'school_director' || user?.role === 'system_admin' ? 'تعديل التواريخ / الخطة' : 'طلب تعديل تواريخ'}
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {plan.installments.map((inst) => {
                                        const isOverdue = inst.status === 'pending' && new Date(inst.dueDate) < new Date();
                                        const currentStatus = isOverdue ? 'overdue' : inst.status;
                                        const config = instStatusConfig[currentStatus as keyof typeof instStatusConfig];
                                        const Icon = config.icon;
                                        const remainingAmount = inst.amount - (inst.paidAmount || 0);
                                        return (
                                            <div key={inst.id} className={`flex items-center justify-between p-3 rounded-lg ${config.color}`}>
                                                <div className="flex items-center gap-3">
                                                    <Icon className="size-5" />
                                                    <div>
                                                        <p className="text-sm font-medium">{config.label}</p>
                                                        <p className="text-xs opacity-70">استحقاق: {formatDateShort(inst.dueDate)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col text-left ml-4">
                                                        <span className="font-bold tabular-nums">الإجمالي: {formatCurrency(inst.amount)}</span>
                                                        {(inst.paidAmount || 0) > 0 && <span className="text-emerald-700 text-xs font-bold mt-1">مسدد: {formatCurrency(inst.paidAmount || 0)}</span>}
                                                        {remainingAmount > 0 && remainingAmount < inst.amount && <span className="text-amber-700 text-xs font-bold mt-0.5">متبقي: {formatCurrency(remainingAmount)}</span>}
                                                    </div>
                                                    {(currentStatus === 'pending' || currentStatus === 'overdue') && remainingAmount > 0 && (
                                                        <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50 h-8" onClick={() => handlePayInstallment(plan.id, inst.id, remainingAmount)}>تسديد</Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </TabsContent>

                <TabsContent value="history">
                    <div className="rounded-lg border bg-card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40">
                                    <th className="text-right p-3 font-semibold">السنة الدراسية</th>
                                    <th className="text-right p-3 font-semibold">المرحلة / الصف</th>
                                    <th className="text-right p-3 font-semibold">إجمالي الرسوم</th>
                                    <th className="text-right p-3 font-semibold">المدفوع</th>
                                    <th className="text-right p-3 font-semibold">المتبقي</th>
                                    <th className="text-right p-3 font-semibold">الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {student.yearlyFinance?.map((yf) => {
                                    const yfRemaining = yf.totalFees - yf.paidAmount;
                                    return (
                                        <tr key={yf.id} className="border-b last:border-0 hover:bg-muted/20">
                                            <td className="p-3 font-medium tabular-nums">{yf.academicYear}</td>
                                            <td className="p-3">{stageLabels[yf.stage]} - {yf.grade}</td>
                                            <td className="p-3 tabular-nums font-bold">{formatCurrency(yf.totalFees)}</td>
                                            <td className="p-3 tabular-nums text-emerald-600">{formatCurrency(yf.paidAmount)}</td>
                                            <td className={`p-3 tabular-nums font-bold ${yfRemaining > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                                {formatCurrency(yfRemaining)}
                                            </td>
                                            <td className="p-3">
                                                {yfRemaining <= 0 ? (
                                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">مسدد بالكامل</Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-none">متأخرات</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {(!student.yearlyFinance || student.yearlyFinance.length === 0) && (
                            <div className="text-center py-12 text-muted-foreground">
                                <Clock className="size-10 mx-auto mb-3 opacity-30" />
                                <p>لا يوجد سجل مالي سابق متاح لهذا الطالب</p>
                            </div>
                        )}
                    </div>
                    {student.yearlyFinance && student.yearlyFinance.some(yf => (yf.totalFees - yf.paidAmount) > 0 && yf.academicYear !== student.academicYear) && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                            <AlertCircle className="size-5 text-amber-600 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-amber-800">تنبيه المديونية السابقة</p>
                                <p className="text-xs text-amber-700 mt-1">يوجد مديونية مستحقة من سنوات سابقة. سيتم توجيه أي مدفوعات جديدة تلقائياً لتغطية الديون القديمة أولاً.</p>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
