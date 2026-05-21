import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, Plus, Banknote, Filter, Download, Printer, TrendingUp, Clock, CreditCard, ShieldCheck, Wallet, Coins, Receipt, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import StatCard from '@/components/features/StatCard';
import { usePaymentsStore } from '@/stores/paymentsStore';
import { useStudentsStore } from '@/stores/studentsStore';
import { useAdmissionStore } from '@/stores/admissionStore';
import { useTreasuryStore } from '@/stores/treasuryStore';
import { formatCurrency, formatDateShort, paymentTypeLabels, paymentMethodLabels, statusLabels } from '@/lib/utils';
import type { PaymentType, PaymentMethod } from '@/types';
import { printPaymentReceipt } from '@/hooks/usePrintReceipt';
import { useAuthStore } from '@/stores/authStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAccountingStore } from '@/stores/accountingStore';
import { usePrintExpenseVoucher } from '@/hooks/usePrintExpenseVoucher';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Payments() {
    const location = useLocation();
    const { payments, addPayment, fetchPayments } = usePaymentsStore();
    const { students, addPaymentToStudent, fetchStudents } = useStudentsStore();
    const { user } = useAuthStore();
    const { expenses, fetchExpenses, payExpense, loading: accountingLoading } = useAccountingStore();
    const { printVoucher } = usePrintExpenseVoucher();
    const { status: treasuryStatus, fetchStatus: fetchTreasuryStatus } = useTreasuryStore();
    const { stageFees, fetchStageFees } = useAdmissionStore();

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('income');
    const [isAuthorized, setIsAuthorized] = useState(false);
    
    const [form, setForm] = useState({
        studentId: '', amount: 0, type: 'tuition' as PaymentType, method: 'cash' as PaymentMethod, notes: '', walletPhoneNumber: ''
    });

    useEffect(() => {
        if (location.state && (location.state as any).studentId) {
            const { studentId, amount, type } = location.state as any;
            setForm(prev => ({
                ...prev,
                studentId,
                amount: amount || 0,
                type: type || 'tuition',
                method: location.state.method || 'cash',
                walletPhoneNumber: location.state.walletPhoneNumber || ''
            }));
            setDialogOpen(true);
            setActiveTab('income');
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    useEffect(() => {
        fetchStudents();
        fetchPayments();
        fetchExpenses();
        fetchTreasuryStatus();
        fetchStageFees();
    }, [fetchStudents, fetchPayments, fetchExpenses, fetchTreasuryStatus, fetchStageFees]);

    // التحقق من تفويض المستخدم: هل هو من فتح الخزينة؟
    useEffect(() => {
        if (!treasuryStatus || treasuryStatus.status !== 'open') {
            // الخزينة مغلقة أو لا توجد جلسة
            setIsAuthorized(false);
            return;
        }

        if (!treasuryStatus.session || !treasuryStatus.session.openedBy) {
            // بيانات الجلسة غير كاملة
            setIsAuthorized(false);
            return;
        }

        if (!user || !user.id) {
            // المستخدم غير مسجل دخول
            setIsAuthorized(false);
            return;
        }

        // مقارنة صارمة: هل المستخدم الحالي هو من فتح الخزينة؟
        const authorized = treasuryStatus.session.openedBy === user.id;
        setIsAuthorized(authorized);
    }, [treasuryStatus, user]);

    const readyToPayExpenses = useMemo(() => {
        return expenses.filter(e => e.status === 'pending_treasury');
    }, [expenses]);

    const pendingApplicationFees = useMemo(() => {
        return students.filter(s => s.status === 'applied' || s.status === 'failed');
    }, [students]);

    const pendingTuitionFees = useMemo(() => {
        return students.filter(s => s.paymentRequestStatus === 'pending_treasury' && s.pendingPaymentAmount && s.pendingPaymentAmount > 0);
    }, [students]);

    const filteredPayments = useMemo(() => {
        return payments.filter((p) => {
            if (!p) return false;
            const studentName = p.studentName || '';
            const receiptNumber = p.receiptNumber || '';
            const matchSearch = studentName.includes(search) || receiptNumber.includes(search);
            const matchType = typeFilter === 'all' || p.type === typeFilter;
            return matchSearch && matchType;
        });
    }, [payments, search, typeFilter]);

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const validPayments = payments.filter(p => p && typeof p.amount === 'number');
        const todayPayments = validPayments.filter((p) => p.date === today);
        const totalCollected = validPayments.reduce((s, p) => s + p.amount, 0);
        const todayTotal = todayPayments.reduce((s, p) => s + p.amount, 0);
        return { totalCollected, todayTotal, todayCount: todayPayments.length, totalCount: validPayments.length };
    }, [payments]);

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();

        // Security: User must be logged in
        if (!user || !user.id) {
            toast.error('يجب تسجيل الدخول أولاً');
            return;
        }

        // Security: Check authorization - MUST be the one who opened the treasury
        if (!treasuryStatus || !treasuryStatus.session || !treasuryStatus.session.openedBy) {
            toast.error('لا توجد جلسة خزينة');
            return;
        }

        if (treasuryStatus.session.openedBy !== user.id) {
            toast.error('فقط الشخص الذي فتح الخزينة يمكنه تسجيل المدفوعات');
            return;
        }

        // Validation: Amount must be greater than zero
        if (!form.amount || form.amount <= 0) {
            toast.error('يجب إدخال مبلغ أكبر من صفر');
            return;
        }

        // Guard: Treasury must be open
        if (treasuryStatus.status !== 'open') {
            toast.error('الخزينة مغلقة - يجب فتحها أولاً');
            return;
        }

        try {
            const student = students.find((s) => s.id === form.studentId);
            if (!student) { toast.error('يرجى اختيار طالب'); return; }
            
            const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;
            const date = new Date().toISOString().split('T')[0];
            const newPayment = {
                studentId: form.studentId,
                studentName: student.name,
                amount: form.amount,
                type: form.type,
                method: form.method,
                date,
                receiptNumber,
                collectedBy: user?.name || 'موظف الخزينة',
                notes: form.notes || undefined,
                walletPhoneNumber: form.method === 'wallet' ? form.walletPhoneNumber : undefined,
                userId: user?.id,
                academicYear: student.academicYear,
            };
            
            const paymentId = await addPayment(newPayment);
            await addPaymentToStudent(form.studentId, form.amount);
            
            // Handle post-payment student updates
            if (form.type === 'application_fee' && (student.status === 'applied' || student.status === 'failed')) {
                await fetch(`/api/admission/test-result/${student.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ result: 'pending' }), 
                });
            }

            if (student.pendingPaymentAmount && student.pendingPaymentAmount > 0) {
                await fetch(`/api/students/${student.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        pendingPaymentAmount: null, 
                        pendingPaymentType: null, 
                        pendingPaymentMethod: null, 
                        pendingWalletPhoneNumber: null, 
                        pendingPaymentNotes: null, 
                        paymentRequestStatus: null 
                    }),
                });
            }

            toast.success(`تم تسجيل دفعة ${formatCurrency(form.amount)} للطالب ${student.name}`);
            printPaymentReceipt({ id: paymentId || '', ...newPayment }, { grade: student.grade, guardianName: student.guardianName });
            
            fetchStudents();
            setDialogOpen(false);
            setForm({ studentId: '', amount: 0, type: 'tuition', method: 'cash', notes: '', walletPhoneNumber: '' });
        } catch (error) {
            toast.error('حدث خطأ أثناء تسجيل الدفع');
        }
    };

    const handleRejectPayment = async () => {
        if (!form.studentId) return;
        try {
            await fetch(`/api/students/${form.studentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentRequestStatus: 'rejected' }),
            });
            fetchStudents();
            toast.info('تم إرجاع الطلب للمحاسب');
            setDialogOpen(false);
        } catch (error) {
            toast.error('حدث خطأ أثناء إرجاع الطلب');
        }
    };

    const handlePayExpense = async (expense: any) => {
        // Security check: Only the treasury opener can pay expenses
        if (!user || !user.id) {
            toast.error('يجب تسجيل الدخول أولاً');
            return;
        }

        if (!treasuryStatus || !treasuryStatus.session || !treasuryStatus.session.openedBy) {
            toast.error('لا توجد جلسة خزينة');
            return;
        }

        if (treasuryStatus.session.openedBy !== user.id) {
            toast.error('فقط الشخص الذي فتح الخزينة يمكنه صرف المصروفات');
            return;
        }

        const success = await payExpense(expense.id, user?.name || 'موظف الخزينة', user?.id);
        if (success) {
            toast.success('تم إثبات الصرف وخصم المبلغ من الخزينة');
            printVoucher({ ...expense, status: 'paid', paidBy: user?.name || 'موظف الخزينة' });
        } else {
            toast.error('حدث خطأ أثناء معالجة الصرف');
        }
    };

    return (
        <div className="space-y-6">
            {treasuryStatus?.status !== 'open' && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>الخزينة مغلقة</AlertTitle>
                    <AlertDescription>
                        لا يمكن تسجيل أي مدفوعات أو صرف مصروفات حتى يتم فتح الخزينة.{' '}
                        <a href="/treasury" className="underline font-semibold">
                            اذهب إلى الخزينة
                        </a>
                    </AlertDescription>
                </Alert>
            )}

            {treasuryStatus?.status === 'open' && !isAuthorized && (
                <Alert variant="destructive">
                    <ShieldCheck className="h-4 w-4" />
                    <AlertTitle>🔒 صلاحية مرفوضة</AlertTitle>
                    <AlertDescription>
                        فقط الشخص الذي فتح الخزينة يمكنه تسجيل المدفوعات والمصروفات.
                        الخزينة الآن مفتوحة من قبل {treasuryStatus?.session?.openedBy ? 'مستخدم آخر' : 'شخص آخر'}.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard title="إجمالي المحصّل" value={formatCurrency(stats.totalCollected)} icon={TrendingUp} colorClass="emerald" />
                <StatCard title="تحصيل اليوم" value={formatCurrency(stats.todayTotal)} icon={Banknote} colorClass="teal" />
                <StatCard title="عمليات اليوم" value={stats.todayCount.toString()} icon={CreditCard} colorClass="sky" />
                <StatCard title="إجمالي العمليات" value={stats.totalCount.toString()} icon={Clock} colorClass="purple" />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-100 p-1 mb-6">
                    <TabsTrigger value="income" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">
                        <Banknote className="ml-2 size-4" /> المقبوضات (تحصيل الطلاب)
                    </TabsTrigger>
                    <TabsTrigger value="expense" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">
                        <Receipt className="ml-2 size-4" /> المصروفات (صرف معتمد)
                        {readyToPayExpenses.length > 0 && (
                            <Badge className="mr-2 bg-red-500 text-white border-0">{readyToPayExpenses.length}</Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="income" className="space-y-6">
                    {/* Pending Lists */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingApplicationFees.map(s => (
                            <Card key={s.id} className="border-emerald-100 bg-emerald-50/30">
                                <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><Plus className="size-4 text-emerald-600" /> رسوم ملف معلقة</CardTitle></CardHeader>
                                <CardContent className="p-4 pt-0 flex justify-between items-center">
                                    <span className="font-medium text-sm">{s.name}</span>
                                    <Button size="sm" variant="ghost" className="h-8 text-emerald-700" disabled={!isAuthorized || treasuryStatus?.status !== 'open'} onClick={() => {
                                        const stageConfig = (stageFees || []).find(f =>
                                            f.stage === s.stage &&
                                            f.grade === s.grade &&
                                            f.track === s.track &&
                                            f.academicYear === s.academicYear
                                        );
                                        const appFee = stageConfig ? stageConfig.applicationFees : 500;
                                        setForm({ ...form, studentId: s.id, amount: appFee, type: 'application_fee', method: 'cash' });
                                        setDialogOpen(true);
                                    }}>تحصيل</Button>
                                </CardContent>
                            </Card>
                        ))}
                        {pendingTuitionFees.map(s => (
                            <Card key={s.id} className="border-primary/20 bg-primary/5">
                                <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2 text-primary"><Clock className="size-4" /> سداد مطلوب: {s.name}</CardTitle></CardHeader>
                                <CardContent className="p-4 pt-0 flex justify-between items-center">
                                    <span className="text-lg font-black">{formatCurrency(s.pendingPaymentAmount || 0)}</span>
                                    <Button size="sm" disabled={!isAuthorized || treasuryStatus?.status !== 'open'} onClick={() => {
                                        setForm({
                                            studentId: s.id,
                                            amount: s.pendingPaymentAmount || 0,
                                            type: (s.pendingPaymentType as PaymentType) || 'tuition',
                                            method: (s.pendingPaymentMethod as PaymentMethod) || 'cash',
                                            notes: s.pendingPaymentNotes || '',
                                            walletPhoneNumber: s.pendingWalletPhoneNumber || ''
                                        });
                                        setDialogOpen(true);
                                    }}>تحصيل الآن</Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input placeholder="بحث بالاسم أو رقم الإيصال..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="النوع" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">كل الأنواع</SelectItem>
                                    {Object.entries(paymentTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                <DialogTrigger asChild><Button disabled={!isAuthorized || treasuryStatus?.status !== 'open'}><Plus className="size-4 ml-2" />تسجيل يدوي</Button></DialogTrigger>
                                <DialogContent className="max-w-lg">
                                    <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">تسجيل دفعة نقدية</DialogTitle></DialogHeader>
                                    <form onSubmit={handleAddPayment} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>الطالب</Label>
                                            <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })} disabled={!!form.studentId}>
                                                <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                                                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2"><Label>المبلغ</Label><Input type="number" value={form.amount || ''} readOnly className="bg-muted font-bold" /></div>
                                            <div className="space-y-2"><Label>النوع</Label><Input value={paymentTypeLabels[form.type]} readOnly className="bg-muted" /></div>
                                        </div>
                                        <div className="space-y-2"><Label>طريقة الدفع</Label><Input value={paymentMethodLabels[form.method]} readOnly className="bg-muted" /></div>
                                        {form.method === 'wallet' && <div className="space-y-2"><Label>رقم المحفظة</Label><Input value={form.walletPhoneNumber} readOnly className="bg-muted" /></div>}
                                        <div className="space-y-2"><Label>ملاحظات</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                                        <div className="flex justify-between items-center pt-2">
                                            <Button type="button" variant="destructive" size="sm" onClick={handleRejectPayment}>إرجاع للمحاسب</Button>
                                            <div className="flex gap-2">
                                                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
                                                <Button type="submit" disabled={!isAuthorized || treasuryStatus?.status !== 'open'}>تأكيد التحصيل</Button>
                                            </div>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    <div className="rounded-lg border bg-white overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-right">
                            <thead><tr className="border-b bg-slate-50 text-slate-600"><th className="p-3">رقم الإيصال</th><th className="p-3">الطالب</th><th className="p-3">المبلغ</th><th className="p-3">النوع</th><th className="p-3">التاريخ</th><th className="p-3 w-16">طباعة</th></tr></thead>
                            <tbody>
                                {filteredPayments.map((p) => (
                                    <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                                        <td className="p-3 font-mono text-xs">{p.receiptNumber}</td>
                                        <td className="p-3 font-medium">{p.studentName}</td>
                                        <td className="p-3 font-bold text-primary">{formatCurrency(p.amount)}</td>
                                        <td className="p-3"><Badge variant="secondary" className="text-[10px]">{paymentTypeLabels[p.type]}</Badge></td>
                                        <td className="p-3 text-slate-500">{formatDateShort(p.date)}</td>
                                        <td className="p-3"><Button variant="ghost" size="icon" onClick={() => printPaymentReceipt(p)}><Printer className="size-4" /></Button></td>
                                    </tr>
                                ))}
                                {filteredPayments.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-slate-400">لا يوجد سجلات دفع مطابقة</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>

                <TabsContent value="expense" className="space-y-6">
                    {readyToPayExpenses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-slate-300">
                            <CheckCircle className="size-12 text-slate-200 mb-4" />
                            <p className="text-slate-500 font-medium">لا توجد مصروفات بانتظار الصرف حالياً</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {readyToPayExpenses.map((exp) => (
                                <Card key={exp.id} className="border-slate-200/60 shadow-sm overflow-hidden border-r-4 border-r-blue-500">
                                    <CardContent className="p-0 flex flex-col md:flex-row items-stretch">
                                        <div className="p-4 flex-1">
                                            <div className="flex justify-between items-start mb-3">
                                                <div><h3 className="font-bold text-lg text-slate-900">{exp.description}</h3><p className="text-xs text-slate-500">رقم: {exp.id.slice(0, 8)} | الموظف: {exp.requestedBy}</p></div>
                                                <Badge className="bg-blue-50 text-blue-700"><Clock className="ml-1 size-3" /> بانتظار الصرف</Badge>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
                                                <div><p className="text-slate-400 text-[10px]">الحساب</p><p className="font-medium">{exp.account?.name}</p></div>
                                                <div><p className="text-slate-400 text-[10px]">الطريقة</p><p className="font-medium">{exp.paymentMethod === 'cash' ? 'نقداً' : 'بنكي'}</p></div>
                                                <div><p className="text-slate-400 text-[10px]">التاريخ</p><p className="font-medium">{formatDateShort(exp.date)}</p></div>
                                                <div><p className="text-slate-400 text-[10px]">المبلغ</p><p className="font-black text-blue-600 text-lg">{formatCurrency(exp.amount)}</p></div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-4 flex flex-row md:flex-col justify-center gap-2 border-t md:border-t-0 md:border-r border-slate-100 md:w-48">
                                            <Button className="flex-1 bg-slate-900 hover:bg-slate-800" onClick={() => handlePayExpense(exp)} disabled={!isAuthorized || treasuryStatus?.status !== 'open' || accountingLoading}>
                                                <Printer className="ml-2 size-4" /> تأكيد وصرف
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
