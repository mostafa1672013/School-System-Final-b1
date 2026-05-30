import { useState, useEffect, useMemo } from 'react';
import { useAccountingStore } from '@/stores/accountingStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Wallet, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDateShort } from '@/lib/utils';

export default function Expenses() {
    const { user } = useAuthStore();
    const { expenses, accounts, fetchExpenses, fetchAccounts, addExpense } = useAccountingStore();
    const [dialogOpen, setDialogOpen] = useState(false);
    
    const expenseAccounts = useMemo(() => accounts.filter(a => a.type === 'Expense'), [accounts]);
    
    const displayedExpenses = useMemo(() => {
        if (!user) return [];
        // Admin, Director, and Head Accountant see all expenses
        if (['system_admin', 'school_director', 'head_accountant'].includes(user.role)) {
            return expenses;
        }
        // Others only see expenses they requested
        return expenses.filter(exp => exp.requestedBy === user.name);
    }, [expenses, user]);

    const [form, setForm] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        accountId: '',
        paymentMethod: 'cash',
        notes: ''
    });

    useEffect(() => {
        fetchExpenses();
        fetchAccounts();
    }, [fetchExpenses, fetchAccounts]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.amount || !form.accountId || !form.description) {
            toast.error('يرجى تعبئة الحقول الأساسية');
            return;
        }

        const expenseData = {
            amount: Number(form.amount),
            date: form.date,
            description: form.description,
            accountId: form.accountId,
            paymentMethod: form.paymentMethod,
            notes: form.notes,
            requestedBy: user?.name || 'مستخدم النظام',
            role: user?.role || 'accountant'
        };

        const success = await addExpense(expenseData);
        if (success) {
            toast.success(Number(form.amount) <= 1000 ? 'تم صرف وتسجيل المصروف بنجاح' : 'تم تسجيل المصروف وإرساله للاعتماد');
            setDialogOpen(false);
            setForm({
                amount: '',
                date: new Date().toISOString().split('T')[0],
                description: '',
                accountId: '',
                paymentMethod: 'cash',
                notes: ''
            });
        } else {
            toast.error('حدث خطأ أثناء حفظ المصروف');
        }
    };

    const statusConfig: Record<string, { label: string, color: string, icon: any }> = {
        paid: { label: 'تم الصرف', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
        pending_treasury: { label: 'جاهز للصرف', color: 'bg-blue-100 text-blue-800', icon: Clock },
        pending_approval: { label: 'بانتظار الاعتماد', color: 'bg-amber-100 text-amber-800', icon: Clock },
        rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-800', icon: AlertCircle },
        // Legacy fallbacks
        pending: { label: 'بانتظار الاعتماد', color: 'bg-amber-100 text-amber-800', icon: Clock },
        approved: { label: 'جاهز للصرف', color: 'bg-blue-100 text-blue-800', icon: Clock },
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold font-[Noto_Kufi_Arabic] text-slate-800">المصروفات التشغيلية</h1>
                    <p className="text-sm text-slate-500 mt-1">تسجيل وإدارة مدفوعات ونفقات المدرسة</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-slate-900 hover:bg-slate-800">
                            <Plus className="ml-2 size-4" /> طلب صرف جديد
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="font-[Noto_Kufi_Arabic]">تسجيل مصروف / طلب صرف</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>المبلغ (ج.م)</Label>
                                    <Input type="number" min="1" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>تاريخ الصرف</Label>
                                    <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>حساب المصروف الموجه له</Label>
                                <Select required value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v })}>
                                    <SelectTrigger><SelectValue placeholder="اختر حساب المصروف" /></SelectTrigger>
                                    <SelectContent>
                                        {expenseAccounts.map(acc => (
                                            <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.code})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>البيان / سبب الصرف</Label>
                                <Input required placeholder="مثال: فاتورة كهرباء شهر مايو" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <Label>طريقة الدفع (الصرف من)</Label>
                                <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">نقداً (الخزينة الرئيسية)</SelectItem>
                                        <SelectItem value="bank_transfer">تحويل بنكي / شيك (البنك)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>ملاحظات إضافية (اختياري)</Label>
                                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                            </div>

                            {Number(form.amount) > 1000 && (
                                <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm border border-amber-200 flex items-start gap-2">
                                    <AlertCircle className="size-4 mt-0.5 shrink-0" />
                                    <p>المبلغ يتجاوز حد الصرف المباشر (1000 ج.م). سيتم إرسال الطلب للمدير المالي للاعتماد قبل خصم المبلغ.</p>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
                                <Button type="submit">تأكيد وتسجيل</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-right">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 font-semibold text-slate-600">التاريخ</th>
                            <th className="p-4 font-semibold text-slate-600">البيان</th>
                            <th className="p-4 font-semibold text-slate-600">الحساب</th>
                            <th className="p-4 font-semibold text-slate-600">طريقة الدفع</th>
                            <th className="p-4 font-semibold text-slate-600">بواسطة</th>
                            <th className="p-4 font-semibold text-slate-600">المبلغ</th>
                            <th className="p-4 font-semibold text-slate-600">الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedExpenses.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-slate-500">لا توجد مصروفات مسجلة</td></tr>
                        ) : displayedExpenses.map((exp) => {
                            const conf = statusConfig[exp.status] || statusConfig.pending_approval;
                            const Icon = conf.icon;
                            return (
                                <tr key={exp.id} className="border-b last:border-0 border-slate-100 hover:bg-slate-50/50">
                                    <td className="p-4 text-slate-600 tabular-nums">{formatDateShort(exp.date)}</td>
                                    <td className="p-4 font-medium text-slate-800">{exp.description}</td>
                                    <td className="p-4 text-slate-600">{exp.account?.name}</td>
                                    <td className="p-4 text-slate-600">{exp.paymentMethod === 'cash' ? 'نقدًا' : 'بنكي'}</td>
                                    <td className="p-4 text-slate-600">{exp.requestedBy}</td>
                                    <td className="p-4 font-bold text-slate-900 tabular-nums">{formatCurrency(exp.amount)}</td>
                                    <td className="p-4">
                                        <Badge variant="secondary" className={`${conf.color} border-0 flex inline-flex items-center gap-1`}>
                                            <Icon className="size-3" />
                                            {conf.label}
                                        </Badge>
                                        {exp.approvedBy && exp.status === 'approved' && (
                                            <div className="text-[10px] text-slate-400 mt-1">بواسطة: {exp.approvedBy}</div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
