import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileBarChart, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStudentsStore } from '@/stores/studentsStore';
import { usePaymentsStore } from '@/stores/paymentsStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useBusStore } from '@/stores/busStore';
import { formatCurrency, formatDateShort, stageLabels, categoryLabels, paymentTypeLabels } from '@/lib/utils';

const COLORS = ['hsl(173,58%,39%)', 'hsl(38,92%,50%)', 'hsl(199,89%,48%)', 'hsl(0,72%,51%)', 'hsl(160,84%,39%)'];

export default function Reports() {
  const { students } = useStudentsStore();
  const { payments, installmentPlans } = usePaymentsStore();
  const { items } = useInventoryStore();
  const { routes, subscriptions } = useBusStore();
  const [studentSearch, setStudentSearch] = useState('');

  const financialData = useMemo(() => {
    const totalFees = students.reduce((s, st) => s + st.totalFees, 0);
    const totalPaid = students.reduce((s, st) => s + st.paidAmount, 0);
    const totalRemaining = totalFees - totalPaid;
    const overdue = installmentPlans.flatMap((p) => p.installments.filter((i) => i.status === 'overdue')).reduce((s, i) => s + i.amount, 0);

    const byStage = Object.entries(stageLabels).map(([key, label]) => {
      const stageStudents = students.filter((s) => s.stage === key);
      const fees = stageStudents.reduce((s, st) => s + st.totalFees, 0);
      const paid = stageStudents.reduce((s, st) => s + st.paidAmount, 0);
      return { name: label, الرسوم: fees, المحصل: paid, المتبقي: fees - paid };
    });

    const byType = Object.entries(paymentTypeLabels).map(([key, label]) => {
      const total = payments.filter((p) => p.type === key).reduce((s, p) => s + p.amount, 0);
      return { name: label, value: total };
    }).filter((d) => d.value > 0);

    return { totalFees, totalPaid, totalRemaining, overdue, byStage, byType };
  }, [students, payments, installmentPlans]);

  const searchedStudent = useMemo(() => {
    if (!studentSearch) return null;
    return students.find((s) => s.name.includes(studentSearch) || s.nationalId.includes(studentSearch));
  }, [students, studentSearch]);

  const studentPayments = useMemo(() => {
    if (!searchedStudent) return [];
    return payments.filter((p) => p.studentId === searchedStudent.id);
  }, [payments, searchedStudent]);

  const inventoryReport = useMemo(() => {
    return Object.entries(categoryLabels).map(([key, label]) => {
      const catItems = items.filter((i) => i.category === key);
      const totalQty = catItems.reduce((s, i) => s + i.quantity, 0);
      const totalVal = catItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const lowStock = catItems.filter((i) => i.quantity <= i.minQuantity).length;
      return { name: label, items: catItems.length, quantity: totalQty, value: totalVal, lowStock };
    });
  }, [items]);

  const busReport = useMemo(() => {
    return routes.map((r) => {
      const subs = subscriptions.filter((s) => s.routeId === r.id && s.status === 'active');
      const revenue = subs.reduce((s, sub) => s + (sub.type === 'annual' ? r.annualFee : r.monthlyFee), 0);
      return { name: r.name, subscribers: subs.length, capacity: r.capacity, revenue, occupancy: Math.round((subs.length / r.capacity) * 100) };
    });
  }, [routes, subscriptions]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="financial">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="financial">التقرير المالي</TabsTrigger>
          <TabsTrigger value="student">كشف حساب طالب</TabsTrigger>
          <TabsTrigger value="inventory">تقرير المخزن</TabsTrigger>
          <TabsTrigger value="bus">تقرير الباصات</TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'إجمالي الرسوم', value: financialData.totalFees, color: 'text-foreground' },
              { label: 'إجمالي المحصل', value: financialData.totalPaid, color: 'text-emerald-600' },
              { label: 'إجمالي المتبقي', value: financialData.totalRemaining, color: 'text-amber-600' },
              { label: 'المتأخرات', value: financialData.overdue, color: 'text-red-600' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border bg-card p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-xl font-bold tabular-nums mt-1 ${s.color}`}>{formatCurrency(s.value)}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 rounded-lg border bg-card p-5">
              <h4 className="text-sm font-bold font-[Noto_Kufi_Arabic] mb-4">التحصيل حسب المرحلة</h4>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialData.byStage}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="المحصل" fill="hsl(173,58%,39%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="المتبقي" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="lg:col-span-2 rounded-lg border bg-card p-5">
              <h4 className="text-sm font-bold font-[Noto_Kufi_Arabic] mb-4">توزيع حسب النوع</h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={financialData.byType} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                      {financialData.byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {financialData.byType.map((e, i) => (
                  <span key={e.name} className="flex items-center gap-1 text-xs">
                    <span className="size-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />{e.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="student" className="mt-4 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="بحث بالاسم أو الرقم القومي..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="pr-10" />
          </div>
          {searchedStudent ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-5">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div>
                    <h4 className="font-bold font-[Noto_Kufi_Arabic]">{searchedStudent.name}</h4>
                    <p className="text-sm text-muted-foreground">{stageLabels[searchedStudent.stage]} — {searchedStudent.grade}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div><p className="text-xs text-muted-foreground">الرسوم</p><p className="font-bold tabular-nums">{formatCurrency(searchedStudent.totalFees)}</p></div>
                    <div><p className="text-xs text-muted-foreground">المدفوع</p><p className="font-bold tabular-nums text-emerald-600">{formatCurrency(searchedStudent.paidAmount)}</p></div>
                    <div><p className="text-xs text-muted-foreground">المتبقي</p><p className="font-bold tabular-nums text-red-600">{formatCurrency(searchedStudent.totalFees - searchedStudent.paidAmount)}</p></div>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border bg-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/40">
                    <th className="text-right p-3 font-semibold">الإيصال</th><th className="text-right p-3 font-semibold">المبلغ</th><th className="text-right p-3 font-semibold">النوع</th><th className="text-right p-3 font-semibold">التاريخ</th>
                  </tr></thead>
                  <tbody>
                    {studentPayments.map((p) => (
                      <tr key={p.id} className="border-b last:border-0"><td className="p-3 font-mono text-xs">{p.receiptNumber}</td><td className="p-3 font-bold tabular-nums text-primary">{formatCurrency(p.amount)}</td><td className="p-3">{paymentTypeLabels[p.type]}</td><td className="p-3 text-muted-foreground">{formatDateShort(p.date)}</td></tr>
                    ))}
                  </tbody>
                </table>
                {studentPayments.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">لا يوجد مدفوعات</p>}
              </div>
            </div>
          ) : studentSearch ? (
            <div className="text-center py-12 text-muted-foreground"><FileBarChart className="size-10 mx-auto mb-3 opacity-30" /><p>لا يوجد طالب مطابق</p></div>
          ) : (
            <div className="text-center py-12 text-muted-foreground"><FileBarChart className="size-10 mx-auto mb-3 opacity-30" /><p>ابحث عن طالب لعرض كشف حسابه</p></div>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="text-right p-3 font-semibold">التصنيف</th><th className="text-right p-3 font-semibold">الأصناف</th><th className="text-right p-3 font-semibold">الكمية</th><th className="text-right p-3 font-semibold">القيمة</th><th className="text-right p-3 font-semibold">نقص</th>
              </tr></thead>
              <tbody>
                {inventoryReport.map((r) => (
                  <tr key={r.name} className="border-b last:border-0"><td className="p-3 font-medium">{r.name}</td><td className="p-3 tabular-nums">{r.items}</td><td className="p-3 tabular-nums font-bold">{r.quantity}</td><td className="p-3 tabular-nums text-primary font-bold">{formatCurrency(r.value)}</td><td className="p-3">{r.lowStock > 0 ? <span className="text-red-600 font-bold">{r.lowStock}</span> : <span className="text-emerald-600">✓</span>}</td></tr>
                ))}
              </tbody>
              <tfoot><tr className="bg-muted/40 font-bold"><td className="p-3">الإجمالي</td><td className="p-3 tabular-nums">{items.length}</td><td className="p-3 tabular-nums">{items.reduce((s, i) => s + i.quantity, 0)}</td><td className="p-3 tabular-nums text-primary">{formatCurrency(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0))}</td><td className="p-3">{items.filter((i) => i.quantity <= i.minQuantity).length}</td></tr></tfoot>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="bus" className="mt-4">
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="text-right p-3 font-semibold">الخط</th><th className="text-right p-3 font-semibold">المشتركين</th><th className="text-right p-3 font-semibold">السعة</th><th className="text-right p-3 font-semibold">الإشغال</th><th className="text-right p-3 font-semibold">الإيرادات</th>
              </tr></thead>
              <tbody>
                {busReport.map((r) => (
                  <tr key={r.name} className="border-b last:border-0"><td className="p-3 font-medium">{r.name}</td><td className="p-3 tabular-nums font-bold">{r.subscribers}</td><td className="p-3 tabular-nums">{r.capacity}</td><td className="p-3"><div className="flex items-center gap-2"><div className="h-2 w-16 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${r.occupancy}%` }} /></div><span className="text-xs tabular-nums">{r.occupancy}%</span></div></td><td className="p-3 tabular-nums text-primary font-bold">{formatCurrency(r.revenue)}</td></tr>
                ))}
              </tbody>
              <tfoot><tr className="bg-muted/40 font-bold"><td className="p-3">الإجمالي</td><td className="p-3 tabular-nums">{busReport.reduce((s, r) => s + r.subscribers, 0)}</td><td className="p-3 tabular-nums">{busReport.reduce((s, r) => s + r.capacity, 0)}</td><td className="p-3">—</td><td className="p-3 tabular-nums text-primary">{formatCurrency(busReport.reduce((s, r) => s + r.revenue, 0))}</td></tr></tfoot>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
