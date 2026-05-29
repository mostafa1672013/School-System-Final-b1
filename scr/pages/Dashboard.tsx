import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Banknote, AlertTriangle, Package, TrendingUp, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StatCard from '@/components/features/StatCard';
import { useStudentsStore } from '@/stores/studentsStore';
import { usePaymentsStore } from '@/stores/paymentsStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useBusStore } from '@/stores/busStore';
import { formatCurrency, formatDateShort, paymentTypeLabels } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const PIE_COLORS = ['hsl(173,58%,39%)', 'hsl(38,92%,50%)', 'hsl(199,89%,48%)', 'hsl(0,72%,51%)', 'hsl(160,84%,39%)', 'hsl(270,60%,50%)'];

export default function Dashboard() {
  const { students } = useStudentsStore();
  const { payments, installmentPlans } = usePaymentsStore();
  const { items } = useInventoryStore();
  const { subscriptions } = useBusStore();

  const stats = useMemo(() => {
    const totalStudents = students.filter((s) => s.status === 'active').length;
    const totalFees = students.reduce((sum, s) => sum + s.totalFees, 0);
    const totalPaid = students.reduce((sum, s) => sum + s.paidAmount, 0);
    const outstanding = totalFees - totalPaid;
    const lowStockCount = items.filter((i) => i.quantity <= i.minQuantity).length;
    const activeBusSubs = subscriptions.filter((s) => s.status === 'active').length;
    return { totalStudents, totalFees, totalPaid, outstanding, lowStockCount, activeBusSubs };
  }, [students, items, subscriptions]);

  const overdueInstallments = useMemo(() => {
    return installmentPlans.flatMap((plan) =>
      plan.installments
        .filter((inst) => inst.status === 'overdue')
        .map((inst) => ({ ...inst, studentName: plan.studentName, planId: plan.id, studentId: plan.studentId }))
    );
  }, [installmentPlans]);

  const recentPayments = useMemo(() => payments.slice(0, 8), [payments]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    const monthNames = ['سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر', 'يناير', 'فبراير'];
    payments.forEach((p) => {
      const d = new Date(p.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months[key] = (months[key] || 0) + p.amount;
    });
    return monthNames.map((name, i) => {
      const monthIdx = i < 4 ? i + 8 : i - 4;
      const year = i < 4 ? 2024 : 2025;
      const key = `${year}-${monthIdx}`;
      return { name, amount: months[key] || 0 };
    });
  }, [payments]);

  const paymentTypeData = useMemo(() => {
    const types: Record<string, number> = {};
    payments.forEach((p) => {
      types[p.type] = (types[p.type] || 0) + p.amount;
    });
    return Object.entries(types).map(([type, amount]) => ({
      name: paymentTypeLabels[type] || type,
      value: amount,
    }));
  }, [payments]);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="إجمالي الطلاب النشطين" value={stats.totalStudents.toString()} icon={GraduationCap} colorClass="teal" trend={`من أصل ${students.length} طالب`} trendUp />
        <StatCard title="إجمالي المحصّل" value={formatCurrency(stats.totalPaid)} icon={TrendingUp} colorClass="emerald" trend={`${((stats.totalPaid / stats.totalFees) * 100).toFixed(0)}% من الإجمالي`} trendUp />
        <StatCard title="المتأخرات" value={formatCurrency(stats.outstanding)} icon={AlertTriangle} colorClass="rose" trend={`${overdueInstallments.length} قسط متأخر`} />
        <StatCard title="تنبيهات المخزن" value={stats.lowStockCount.toString()} icon={Package} colorClass="amber" trend={`${stats.activeBusSubs} اشتراك باص نشط`} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-lg border bg-card p-5">
          <h3 className="text-base font-bold font-[Noto_Kufi_Arabic] mb-4">التحصيل الشهري</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} labelStyle={{ fontFamily: 'Tajawal' }} />
                <Bar dataKey="amount" name="المبلغ" fill="hsl(173,58%,39%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-base font-bold font-[Noto_Kufi_Arabic] mb-4">توزيع المدفوعات</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentTypeData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  {paymentTypeData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {paymentTypeData.map((entry, idx) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                {entry.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Payments */}
        <div className="lg:col-span-3 rounded-lg border bg-card">
          <div className="flex items-center justify-between p-5 border-b">
            <h3 className="text-base font-bold font-[Noto_Kufi_Arabic]">آخر المدفوعات</h3>
            <Link to="/payments" className="text-sm text-primary hover:underline font-medium">عرض الكل</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-right p-3 font-semibold">الطالب</th>
                  <th className="text-right p-3 font-semibold">المبلغ</th>
                  <th className="text-right p-3 font-semibold hidden sm:table-cell">النوع</th>
                  <th className="text-right p-3 font-semibold hidden md:table-cell">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-medium">{p.studentName}</td>
                    <td className="p-3 tabular-nums font-semibold text-primary">{formatCurrency(p.amount)}</td>
                    <td className="p-3 hidden sm:table-cell">{paymentTypeLabels[p.type]}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{formatDateShort(p.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Overdue Installments */}
        <div className="lg:col-span-2 rounded-lg border bg-card">
          <div className="flex items-center justify-between p-5 border-b">
            <h3 className="text-base font-bold font-[Noto_Kufi_Arabic] flex items-center gap-2">
              <Clock className="size-4 text-[hsl(0,72%,51%)]" />
              أقساط متأخرة
            </h3>
            <Badge variant="destructive" className="tabular-nums">{overdueInstallments.length}</Badge>
          </div>
          <div className="p-3 space-y-2">
            {overdueInstallments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد أقساط متأخرة</p>
            ) : (
              overdueInstallments.map((inst) => (
                <Link
                  key={inst.id}
                  to={`/students/${inst.studentId}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{inst.studentName}</p>
                    <p className="text-xs text-muted-foreground">استحقاق: {formatDateShort(inst.dueDate)}</p>
                  </div>
                  <span className="text-sm font-bold text-[hsl(0,72%,51%)] tabular-nums">
                    {formatCurrency(inst.amount)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
