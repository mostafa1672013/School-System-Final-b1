import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, Plus, Banknote, Filter, Download, Printer } from 'lucide-react';
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
import { formatCurrency, formatDateShort, paymentTypeLabels, paymentMethodLabels, stageLabels, statusLabels } from '@/lib/utils';
import type { PaymentType, PaymentMethod } from '@/types';
import { TrendingUp, Clock, CreditCard } from 'lucide-react';
import { printPaymentReceipt } from '@/hooks/usePrintReceipt';

export default function Payments() {
    const location = useLocation();
    const { payments, addPayment } = usePaymentsStore();
    const { students, addPaymentToStudent, fetchStudents } = useStudentsStore();
    const { stageFees } = useAdmissionStore();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({
        studentId: '', amount: 0, type: 'tuition' as PaymentType, method: 'cash' as PaymentMethod, notes: '',
    });

    // Check for incoming state from Student Detail page
    useEffect(() => {
        if (location.state && (location.state as any).studentId) {
            const { studentId, amount, type } = location.state as any;
            setForm(prev => ({
                ...prev,
                studentId,
                amount: amount || 0,
                type: type || 'tuition'
            }));
            setDialogOpen(true);
            // Clear state after reading it
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Fetch latest data on mount to ensure we see new pending requests
    useEffect(() => {
        fetchStudents();
        usePaymentsStore.getState().fetchPayments?.();
    }, [fetchStudents]);

    const pendingApplicationFees = useMemo(() => {
        return students.filter(s => s.status === 'applied' || s.status === 'failed');
    }, [students]);

    const pendingTuitionFees = useMemo(() => {
        return students.filter(s => s.paymentRequestStatus === 'pending' && s.pendingPaymentAmount && s.pendingPaymentAmount > 0);
    }, [students]);

    const filtered = useMemo(() => {
        return payments.filter((p) => {
            const matchSearch = p.studentName.includes(search) || p.receiptNumber.includes(search);
            const matchType = typeFilter === 'all' || p.type === typeFilter;
            return matchSearch && matchType;
        });
    }, [payments, search, typeFilter]);

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const todayPayments = payments.filter((p) => p.date === today);
        const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
        const todayTotal = todayPayments.reduce((s, p) => s + p.amount, 0);
        return { totalCollected, todayTotal, todayCount: todayPayments.length, totalCount: payments.length };
    }, [payments]);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
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
            collectedBy: 'المستخدم الحالي',
            notes: form.notes || undefined,
        };
        addPayment(newPayment);
        addPaymentToStudent(form.studentId, form.amount);
        
        // Auto-transition if it's an application fee
        if (form.type === 'other' && (student.status === 'applied' || student.status === 'failed')) {
            // Move to under_testing (reset for new try)
            fetch(`http://127.0.0.1:4000/api/admission/test-result/${student.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ result: 'pending' }), 
            }).then(() => fetchStudents());
        }

        // Clear the pending request if it was one
        if (student.pendingPaymentAmount && student.pendingPaymentAmount > 0) {
            fetch(`http://127.0.0.1:4000/api/students/${student.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pendingPaymentAmount: null, pendingPaymentType: null, paymentRequestStatus: null }),
            });
        }

        toast.success(`تم تسجيل دفعة ${formatCurrency(form.amount)} للطالب ${student.name}`);
        printPaymentReceipt(
            { id: '', ...newPayment },
            { grade: student.grade, guardianName: student.guardianName }
        );
        setDialogOpen(false);
        setForm({ studentId: '', amount: 0, type: 'tuition', method: 'cash', notes: '' });
    };

    const handleRejectFee = async () => {
        if (!form.studentId) return;
        try {
            await fetch(`http://127.0.0.1:4000/api/students/${form.studentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentRequestStatus: 'rejected' }),
            });
            await fetchStudents();
            toast.info('تم إرجاع الطلب وإلغاءه للمحاسب');
            setDialogOpen(false);
        } catch (error) {
            toast.error('حدث خطأ أثناء إرجاع الطلب');
        }
    };

    const handlePayApplicationFee = (student: any) => {
        const fee = stageFees.find(f => f.stage === student.stage && f.grade === student.grade && f.track === student.track)?.applicationFees || 500;
        setForm({
            studentId: student.id,
            amount: fee,
            type: 'other',
            method: 'cash',
            notes: 'رسوم فتح ملف'
        });
        setDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard title="إجمالي المحصّل" value={formatCurrency(stats.totalCollected)} icon={TrendingUp} colorClass="emerald" />
                <StatCard title="تحصيل اليوم" value={formatCurrency(stats.todayTotal)} icon={Banknote} colorClass="teal" />
                <StatCard title="عمليات اليوم" value={stats.todayCount.toString()} icon={CreditCard} colorClass="sky" />
                <StatCard title="إجمالي العمليات" value={stats.totalCount.toString()} icon={Clock} colorClass="purple" />
            </div>

            {/* Quick Actions / Pending Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Application Fees List */}
                <Card className="border-blue-100 bg-blue-50/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Clock className="size-4 text-blue-600" /> طلاب بانتظار دفع رسوم الملف ({pendingApplicationFees.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {pendingApplicationFees.slice(0, 5).map(s => (
                                <div key={s.id} className="flex items-center justify-between p-2 bg-white rounded border border-blue-100 shadow-sm">
                                    <div className="text-xs">
                                        <p className="font-bold">{s.name}</p>
                                        <p className="text-muted-foreground">{stageLabels[s.stage]} - {s.grade}</p>
                                    </div>
                                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handlePayApplicationFee(s)}>تحصيل</Button>
                                </div>
                            ))}
                            {pendingApplicationFees.length === 0 && <p className="text-center py-4 text-xs text-muted-foreground italic">لا يوجد طلاب بانتظار الملف</p>}
                            {pendingApplicationFees.length > 5 && <p className="text-[10px] text-center text-muted-foreground font-bold">+{pendingApplicationFees.length - 5} طلاب آخرين</p>}
                        </div>
                    </CardContent>
                </Card>

                {/* Tuition Fees List */}
                <Card className="border-emerald-100 bg-emerald-50/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Banknote className="size-4 text-emerald-600" /> طلاب بانتظار تحصيل مصاريف ({pendingTuitionFees.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {pendingTuitionFees.slice(0, 5).map(s => (
                                <div key={s.id} className="flex items-center justify-between p-2 bg-white rounded border border-emerald-100 shadow-sm">
                                    <div className="text-xs">
                                        <p className="font-bold">{s.name}</p>
                                        <p className="text-muted-foreground">المبلغ المطلوب تحصيله: {formatCurrency(s.pendingPaymentAmount || 0)}</p>
                                    </div>
                                    <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                                        setForm({ studentId: s.id, amount: s.pendingPaymentAmount || 0, type: (s.pendingPaymentType as PaymentType) || 'tuition', method: 'cash', notes: '' });
                                        setDialogOpen(true);
                                    }}>تحصيل</Button>
                                </div>
                            ))}
                            {pendingTuitionFees.length === 0 && <p className="text-center py-4 text-xs text-muted-foreground italic">لا يوجد مديونيات حالية</p>}
                            {pendingTuitionFees.length > 5 && <p className="text-[10px] text-center text-muted-foreground font-bold">+{pendingTuitionFees.length - 5} طلاب آخرين</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input placeholder="بحث بالاسم أو رقم الإيصال..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-40">
                            <Filter className="size-4 ml-2" />
                            <SelectValue placeholder="كل الأنواع" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">كل الأنواع</SelectItem>
                            {Object.entries(paymentTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="size-4 ml-2" />تسجيل دفعة</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="font-[Noto_Kufi_Arabic]">تسجيل دفعة جديدة</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="space-y-2">
                                <Label>الطالب</Label>
                                <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })}>
                                    <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                                    <SelectContent>
                                        {students.filter((s) => ['admitted', 'applied', 'fee_setup'].includes(s.status)).map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name} — {s.grade} ({statusLabels[s.status]})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>المبلغ (للقراءة فقط)</Label>
                                    <Input 
                                        type="number" 
                                        value={form.amount || ''} 
                                        readOnly 
                                        className="bg-muted cursor-not-allowed font-bold text-primary" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>النوع</Label>
                                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as PaymentType })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{Object.entries(paymentTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>طريقة الدفع</Label>
                                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v as PaymentMethod })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{Object.entries(paymentMethodLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>ملاحظات (اختياري)</Label>
                                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <Button 
                                    type="button" 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={handleRejectFee}
                                    disabled={!form.studentId}
                                >
                                    إرجاع للمحاسب
                                </Button>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
                                    <Button type="submit">تأكيد تحصيل المبلغ</Button>
                                </div>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Table */}
            <div className="rounded-lg border bg-card overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/40">
                            <th className="text-right p-3 font-semibold">رقم الإيصال</th>
                            <th className="text-right p-3 font-semibold">الطالب</th>
                            <th className="text-right p-3 font-semibold">المبلغ</th>
                            <th className="text-right p-3 font-semibold hidden sm:table-cell">النوع</th>
                            <th className="text-right p-3 font-semibold hidden md:table-cell">الطريقة</th>
                            <th className="text-right p-3 font-semibold hidden lg:table-cell">بواسطة</th>
                            <th className="text-right p-3 font-semibold">التاريخ</th>
                            <th className="text-right p-3 font-semibold w-16">طباعة</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((p) => (
                            <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                <td className="p-3 font-mono text-xs tabular-nums">{p.receiptNumber}</td>
                                <td className="p-3 font-medium">{p.studentName}</td>
                                <td className="p-3 font-bold tabular-nums text-primary">{formatCurrency(p.amount)}</td>
                                <td className="p-3 hidden sm:table-cell">
                                    <Badge variant="secondary" className="text-xs">{paymentTypeLabels[p.type]}</Badge>
                                </td>
                                <td className="p-3 hidden md:table-cell">{paymentMethodLabels[p.method]}</td>
                                <td className="p-3 hidden lg:table-cell text-muted-foreground">{p.collectedBy}</td>
                                <td className="p-3 text-muted-foreground">{formatDateShort(p.date)}</td>
                                <td className="p-3">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-muted-foreground hover:text-primary"
                                        onClick={() => printPaymentReceipt(p)}
                                        aria-label="طباعة الإيصال"
                                    >
                                        <Printer className="size-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Banknote className="size-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">لا يوجد مدفوعات مطابقة</p>
                    </div>
                )}
            </div>
        </div>
    );
}
