import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Search, Plus, Banknote, Filter, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatCard from '@/components/features/StatCard';
import { usePaymentsStore } from '@/stores/paymentsStore';
import { useStudentsStore } from '@/stores/studentsStore';
import { formatCurrency, formatDateShort, paymentTypeLabels, paymentMethodLabels } from '@/lib/utils';
import type { PaymentType, PaymentMethod } from '@/types';
import { TrendingUp, Clock, CreditCard } from 'lucide-react';
import { printPaymentReceipt } from '@/hooks/usePrintReceipt';

export default function Payments() {
  const { payments, addPayment } = usePaymentsStore();
  const { students, addPaymentToStudent } = useStudentsStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    studentId: '', amount: 0, type: 'tuition' as PaymentType, method: 'cash' as PaymentMethod, notes: '',
  });

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
    toast.success(`تم تسجيل دفعة ${formatCurrency(form.amount)} للطالب ${student.name}`);
    printPaymentReceipt(
      { id: '', ...newPayment },
      { grade: student.grade, guardianName: student.guardianName }
    );
    setDialogOpen(false);
    setForm({ studentId: '', amount: 0, type: 'tuition', method: 'cash', notes: '' });
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
                    {students.filter((s) => s.status === 'active').map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} — {s.grade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>المبلغ</Label>
                  <Input type="number" required min={1} value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
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
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
                <Button type="submit">تأكيد الدفع</Button>
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
