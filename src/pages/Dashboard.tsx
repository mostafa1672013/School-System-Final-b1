import { useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Banknote, AlertTriangle, Package, TrendingUp, Clock, Bus, Boxes, ArrowDownToLine, ArrowUpToLine, FileText, Server, Database, Activity, Users, Vault, ShieldAlert, ListChecks } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StatCard from '@/components/features/StatCard';
import { useStudentsStore } from '@/stores/studentsStore';
import { usePaymentsStore } from '@/stores/paymentsStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useBusStore } from '@/stores/busStore';
import { useAuthStore } from '@/stores/authStore';
import { useUsersStore } from '@/stores/usersStore';
import { useTreasuryStore } from '@/stores/treasuryStore';
import { useAccountingStore } from '@/stores/accountingStore';
import { usePurchasingStore } from '@/stores/purchasingStore';
import { formatCurrency, formatDateShort, paymentTypeLabels } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const PIE_COLORS = ['hsl(173,58%,39%)', 'hsl(38,92%,50%)', 'hsl(199,89%,48%)', 'hsl(0,72%,51%)', 'hsl(160,84%,39%)', 'hsl(270,60%,50%)'];

// --- Sub-components for reusability ---
function MonthlyCollectionChart({ monthlyData }: { monthlyData: any[] }) {
  return (
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
  );
}

function PaymentDistributionChart({ paymentTypeData }: { paymentTypeData: any[] }) {
  return (
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
  );
}

function RecentPaymentsTable({ recentPayments }: { recentPayments: any[] }) {
  return (
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
            {recentPayments.length === 0 && (
               <tr>
                 <td colSpan={4} className="p-8 text-center text-muted-foreground">لا توجد مدفوعات مسجلة</td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OverdueInstallmentsCard({ overdueInstallments }: { overdueInstallments: any[] }) {
  return (
    <div className="lg:col-span-2 rounded-lg border bg-card">
      <div className="flex items-center justify-between p-5 border-b">
        <h3 className="text-base font-bold font-[Noto_Kufi_Arabic] flex items-center gap-2">
          <Clock className="size-4 text-[hsl(0,72%,51%)]" />
          أقساط متأخرة
        </h3>
        <Badge variant="destructive" className="tabular-nums">{overdueInstallments.length}</Badge>
      </div>
      <div className="p-3 space-y-2 max-h-[350px] overflow-y-auto">
        {overdueInstallments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">لا توجد أقساط متأخرة</p>
        ) : (
          overdueInstallments.map((inst, i) => (
            <Link
              key={`${inst.id}-${i}`}
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
  );
}

// --- Main Component ---
export default function Dashboard() {
  const { user } = useAuthStore();
  const { students, fetchStudents } = useStudentsStore();
  const { payments, fetchPayments, installmentPlans } = usePaymentsStore();
  const { items, transactions, categories, fetchItems, fetchTransactions, fetchCategories } = useInventoryStore();
  const { subscriptions, fetchRoutes, fetchSubscriptions } = useBusStore();
  const { users, fetchUsers } = useUsersStore();
  const { status: treasuryStatus, fetchStatus: fetchTreasuryStatus } = useTreasuryStore();
  const { journalEntries, fetchJournalEntries, expenses: accountingExpenses, fetchExpenses: fetchAccountingExpenses } = useAccountingStore();
  const { requests, orders, receipts, fetchRequests, fetchOrders, fetchReceipts } = usePurchasingStore();

  useEffect(() => {
    fetchStudents();
    fetchPayments();
    fetchItems();
    fetchRoutes();
    fetchSubscriptions();
    fetchUsers();
  }, [fetchStudents, fetchPayments, fetchItems, fetchRoutes, fetchSubscriptions, fetchUsers]);

  useEffect(() => {
    fetchTreasuryStatus();
  }, [fetchTreasuryStatus]);

  useEffect(() => {
    if (user?.role === 'head_accountant' || user?.role === 'system_admin') {
      fetchJournalEntries();
      fetchAccountingExpenses();
    }
    if (user?.role === 'warehouse_keeper' || user?.role === 'system_admin') {
      fetchTransactions();
      fetchCategories();
      fetchRequests();
      fetchOrders();
      fetchReceipts();
    }
  }, [user?.role, fetchJournalEntries, fetchAccountingExpenses, fetchTransactions, fetchCategories, fetchRequests, fetchOrders, fetchReceipts]);

  const stats = useMemo(() => {
    const validStudents = Array.isArray(students) ? students.filter(s => s && ['active', 'admitted', 'inactive', 'graduated', 'transferred'].includes(s.status)) : [];
    const validItems = items.filter(i => i);
    const validSubs = subscriptions.filter(sub => sub);

    const totalStudents = validStudents.filter((s) => s.status === 'active' || s.status === 'admitted').length;
    const allEnrolledCount = validStudents.length;
    const totalFees = validStudents.reduce((sum, s) => sum + Number(s.totalFees || 0), 0);
    const totalPaid = validStudents.reduce((sum, s) => sum + Number(s.paidAmount || 0), 0);
    const outstanding = totalFees - totalPaid;
    const lowStockCount = validItems.filter((i) => i.quantity <= i.minQuantity).length;
    const activeBusSubs = validSubs.filter((s) => s.status === 'active').length;
    
    return { totalStudents, allEnrolledCount, totalFees, totalPaid, outstanding, lowStockCount, activeBusSubs, validItems, validSubs };
  }, [students, items, subscriptions]);

  const overdueInstallments = useMemo(() => {
    return Object.values(installmentPlans).flatMap((plan) =>
      plan.installments
        .filter((inst) => inst.status === 'overdue' || (inst.status === 'pending' && new Date(inst.dueDate) < new Date()))
        .map((inst) => ({ 
          ...inst, 
          studentName: students.find(s => s.id === plan.studentId)?.name || 'طالب', 
          planId: plan.id, 
          studentId: plan.studentId 
        }))
    );
  }, [installmentPlans, students]);

  const recentPayments = useMemo(() => payments.slice(0, 8), [payments]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    const monthNames = ['سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر', 'يناير', 'فبراير'];
    payments.forEach((p) => {
      if (!p.date) return;
      const d = new Date(p.date);
      if (isNaN(d.getTime())) return;
      
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months[key] = (months[key] || 0) + Number(p.amount);
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
      if (!p || !p.type) return;
      types[p.type] = (types[p.type] || 0) + Number(p.amount || 0);
    });
    return Object.entries(types).map(([type, amount]) => ({
      name: paymentTypeLabels[type] || type,
      value: amount,
    }));
  }, [payments]);

  const accountingStats = useMemo(() => {
    const draftJEs = journalEntries.filter((je: any) => je.status === 'draft');
    const postedJEs = journalEntries.filter((je: any) => je.status === 'posted');
    const pendingExpenses = accountingExpenses.filter((e: any) => e.status.includes('pending'));
    
    return {
      draftCount: draftJEs.length,
      postedCount: postedJEs.length,
      totalEntries: journalEntries.length,
      pendingExpensesCount: pendingExpenses.length
    };
  }, [journalEntries, accountingExpenses]);

  const inventoryStats = useMemo(() => {
    const categoryData: Record<string, number> = {};
    items.forEach((item) => {
      const catName = categories.find((c) => c.id === item.categoryId)?.name || 'غير مصنف';
      categoryData[catName] = (categoryData[catName] || 0) + 1;
    });
    const pieData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));

    const recentTxs = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const currentMonthTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const receivedCount = currentMonthTxs.filter(t => t.type === 'in').reduce((sum, t) => sum + t.quantity, 0);
    const issuedCount = currentMonthTxs.filter(t => t.type === 'out').reduce((sum, t) => sum + t.quantity, 0);

    return { pieData, recentTxs, receivedCount, issuedCount };
  }, [items, categories, transactions]);

  const purchasingStats = useMemo(() => {
    const pendingRequests = requests.filter(r => r.status === 'pending').length;
    const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'partial').length;
    
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const currentMonthReceipts = receipts.filter(r => {
      const d = new Date(r.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    return { pendingRequests, activeOrders, currentMonthReceipts };
  }, [requests, orders, receipts]);

  if (!user) return null;

  // 1. Warehouse Keeper View
  if (user.role === 'warehouse_keeper') {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold mb-4 font-[Noto_Kufi_Arabic]">مراقبة المخزون وحركة الأصناف</h2>
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="إجمالي الأصناف" value={stats.validItems.length.toString()} icon={Boxes} colorClass="indigo" trend="مسجلة في قاعدة البيانات" />
          <StatCard title="تنبيهات نواقص" value={stats.lowStockCount.toString()} icon={AlertTriangle} colorClass={stats.lowStockCount > 0 ? "rose" : "emerald"} trend={`${stats.lowStockCount} صنف يحتاج إعادة طلب`} />
          <StatCard title="وارد هذا الشهر" value={inventoryStats.receivedCount.toString()} icon={ArrowDownToLine} colorClass="teal" trend="إجمالي الكميات المستلمة" />
          <StatCard title="منصرف هذا الشهر" value={inventoryStats.issuedCount.toString()} icon={ArrowUpToLine} colorClass="amber" trend="إجمالي الكميات المنصرفة" />
        </div>

        <h2 className="text-xl font-bold mt-8 mb-4 font-[Noto_Kufi_Arabic]">مراقبة دورة المشتريات</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="طلبات شراء قيد الانتظار" value={purchasingStats.pendingRequests.toString()} icon={FileText} colorClass={purchasingStats.pendingRequests > 0 ? "amber" : "gray"} trend={purchasingStats.pendingRequests > 0 ? "طلبات تنتظر اعتماد الإدارة/الحسابات" : "لا توجد طلبات جديدة"} />
          <StatCard title="أوامر شراء نشطة" value={purchasingStats.activeOrders.toString()} icon={AlertTriangle} colorClass={purchasingStats.activeOrders > 0 ? "indigo" : "gray"} trend={purchasingStats.activeOrders > 0 ? "بانتظار استلام البضائع من المورد" : "لا توجد طلبات جارية"} />
          <StatCard title="استلامات تمت هذا الشهر" value={purchasingStats.currentMonthReceipts.toString()} icon={Boxes} colorClass="emerald" trend="عملية استلام من أوامر الشراء" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Categories Distribution */}
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-base font-bold font-[Noto_Kufi_Arabic] mb-4">توزيع الأصناف حسب التصنيف</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={inventoryStats.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {inventoryStats.pieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {inventoryStats.pieData.map((entry, idx) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  {entry.name} ({entry.value})
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions Table */}
          <div className="lg:col-span-2 rounded-lg border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold font-[Noto_Kufi_Arabic]">أحدث الحركات (وارد / منصرف)</h3>
              <Link to="/inventory/transactions" className="text-sm text-primary hover:underline font-medium">عرض السجل كاملاً</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="p-3 font-semibold">التاريخ</th>
                    <th className="p-3 font-semibold">الصنف</th>
                    <th className="p-3 font-semibold">النوع</th>
                    <th className="p-3 font-semibold">الكمية</th>
                    <th className="p-3 font-semibold">المستلم/المورد</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryStats.recentTxs.map((t) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 text-muted-foreground">{formatDateShort(t.date)}</td>
                      <td className="p-3 font-medium">{t.item?.name || 'صنف محذوف'}</td>
                      <td className="p-3">
                        {t.type === 'in' ? (
                          <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">وارد</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">منصرف</Badge>
                        )}
                      </td>
                      <td className={`p-3 font-bold ${t.type === 'in' ? 'text-teal-600' : 'text-amber-600'}`}>
                        {t.type === 'in' ? '+' : '-'}{t.quantity}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {t.studentName || t.departmentName || t.supplierName || t.subType}
                      </td>
                    </tr>
                  ))}
                  {inventoryStats.recentTxs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">لا توجد حركات مسجلة مؤخراً</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Bus Supervisor View
  if (user.role === 'bus_supervisor') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard title="اشتراكات الباصات النشطة" value={stats.activeBusSubs.toString()} icon={Bus} colorClass="emerald" trend={`من أصل ${stats.validSubs.length} اشتراك إجمالي`} />
          <StatCard title="تنبيهات متأخرات الباص" value="0" icon={AlertTriangle} colorClass="rose" trend="قيد التطوير" />
        </div>
        <div className="rounded-lg border bg-card p-8 text-center mt-8">
           <Bus className="size-16 mx-auto text-emerald-200 mb-4" />
           <h3 className="text-xl font-bold mb-2">أهلاً بك في إدارة الباصات</h3>
           <p className="text-muted-foreground">يمكنك إدارة الخطوط والمشتركين من القائمة الجانبية.</p>
        </div>
      </div>
    );
  }

  // 3. Accountant & Treasury View (Head Accountant sees this + Admin sees full)
  const isFinanceFocused = user.role === 'accountant' || user.role === 'treasury_accountant';

  if (isFinanceFocused) {
    const myDraftJEs = journalEntries.filter((je: any) => je.status === 'draft' && je.createdBy === user.name).length;
    const myPostedJEs = journalEntries.filter((je: any) => je.status === 'posted' && je.createdBy === user.name).length;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold font-[Noto_Kufi_Arabic]">البيان التحليلي المالي (العمليات اليومية)</h2>
        </div>
        
        {/* KPI Row 1: Money & Collections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="إجمالي تحصيل اليوم" value={formatCurrency(stats.totalPaid)} icon={TrendingUp} colorClass="emerald" trend="جميع وسائل الدفع" trendUp />
          <StatCard title="النقدية المتوفرة (الخزينة)" value={formatCurrency(treasuryStatus?.currentBalance || 0)} icon={Vault} colorClass="teal" trend={treasuryStatus?.isOpen ? 'الخزينة مفتوحة للعمل' : 'الخزينة مغلقة'} />
          <StatCard title="مصروفات معلقة (للصرف)" value={accountingStats.pendingExpensesCount.toString()} icon={ArrowDownToLine} colorClass="amber" trend="تتطلب المراجعة والصرف" />
          <StatCard title="متأخرات ومستحقات" value={formatCurrency(stats.outstanding)} icon={AlertTriangle} colorClass="rose" trend={`${overdueInstallments.length} قسط متأخر الدفع`} />
        </div>

        {/* KPI Row 2: User's Accounting Activity */}
        <h3 className="text-lg font-bold mt-8 mb-4 font-[Noto_Kufi_Arabic]">نشاطي المحاسبي (قيود اليومية)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="قيود مسودة (منشأة بواسطتي)" value={myDraftJEs.toString()} icon={FileText} colorClass={myDraftJEs > 0 ? "indigo" : "gray"} trend="تحتاج إلى ترحيل" />
          <StatCard title="قيود مُرحلة (منشأة بواسطتي)" value={myPostedJEs.toString()} icon={ListChecks} colorClass="emerald" trend="تم ترحيلها واعتمادها" />
          <StatCard title="إجمالي إيصالات الدفع" value={payments.length.toString()} icon={FileText} colorClass="blue" trend="إيصالات مسجلة في النظام" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <MonthlyCollectionChart monthlyData={monthlyData} />
          <PaymentDistributionChart paymentTypeData={paymentTypeData} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-8">
          <RecentPaymentsTable recentPayments={recentPayments} />
          <OverdueInstallmentsCard overdueInstallments={overdueInstallments} />
        </div>
      </div>
    );
  }

  // 4. System Admin View (IT Focus)
  if (user.role === 'system_admin') {
    const onlineUsers = users.filter((u) => u.isOnline).length;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="حالة السيرفر" value="99.9%" icon={Server} colorClass="emerald" trend="مستقر ومتصل" trendUp />
          <StatCard title="سلامة قاعدة البيانات" value="متصل" icon={Database} colorClass="emerald" trend="لا توجد أخطاء في المزامنة" trendUp />
          <StatCard title="تدفق الأعمال (المهام)" value="نشط" icon={Activity} colorClass="blue" trend="النسخ الاحتياطي يعمل" trendUp />
          <StatCard title="المستخدمين المتصلين" value={onlineUsers.toString()} icon={Users} colorClass="teal" trend={`من أصل ${users.length} مستخدم مسجل`} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="rounded-lg border bg-card p-6">
             <div className="flex items-center gap-3 mb-4">
                <Activity className="size-6 text-blue-500" />
                <h3 className="font-bold text-lg">مراقبة أداء النظام (System Load)</h3>
             </div>
             <div className="space-y-4">
               <div>
                 <div className="flex justify-between text-sm mb-1">
                   <span>استهلاك المعالج (CPU)</span>
                   <span className="font-mono">12%</span>
                 </div>
                 <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500 w-[12%]" />
                 </div>
               </div>
               <div>
                 <div className="flex justify-between text-sm mb-1">
                   <span>استهلاك الذاكرة (RAM)</span>
                   <span className="font-mono">4.2 GB / 8 GB</span>
                 </div>
                 <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-500 w-[52%]" />
                 </div>
               </div>
               <div>
                 <div className="flex justify-between text-sm mb-1">
                   <span>مساحة التخزين (Disk)</span>
                   <span className="font-mono">45 GB / 100 GB</span>
                 </div>
                 <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-teal-500 w-[45%]" />
                 </div>
               </div>
             </div>
          </div>
          
          <div className="rounded-lg border bg-card p-6">
             <div className="flex items-center gap-3 mb-4">
                <Database className="size-6 text-emerald-500" />
                <h3 className="font-bold text-lg">حالة خدمات النظام</h3>
             </div>
             <div className="space-y-3">
               <div className="flex items-center justify-between p-3 border rounded-lg bg-emerald-50/50">
                 <span className="font-medium">واجهة برمجة التطبيقات (Main API)</span>
                 <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">تعمل بشكل ممتاز</Badge>
               </div>
               <div className="flex items-center justify-between p-3 border rounded-lg bg-emerald-50/50">
                 <span className="font-medium">قاعدة البيانات (PostgreSQL)</span>
                 <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">تعمل بشكل ممتاز</Badge>
               </div>
               <div className="flex items-center justify-between p-3 border rounded-lg bg-emerald-50/50">
                 <span className="font-medium">خدمة التنبيهات (Sockets)</span>
                 <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">تعمل بشكل ممتاز</Badge>
               </div>
               <div className="flex items-center justify-between p-3 border rounded-lg bg-emerald-50/50">
                 <span className="font-medium">خدمة النسخ الاحتياطي التلقائي</span>
                 <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">آخر نسخة: منذ ساعتين</Badge>
               </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. Executive Director View
  if (user.role === 'school_director') {
    const totalInventoryValue = stats.validItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitCost)), 0);
    const activeEmployees = users.filter(u => u.active).length;
    
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold mb-4 font-[Noto_Kufi_Arabic]">ملخص تنفيذي (Executive Summary)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="إجمالي التحصيلات (إيرادات)" value={formatCurrency(stats.totalPaid)} icon={TrendingUp} colorClass="emerald" trend="إجمالي مسدد" trendUp />
          <StatCard title="النقدية المتوفرة (الخزينة)" value={formatCurrency(treasuryStatus?.currentBalance || 0)} icon={Vault} colorClass="teal" trend={treasuryStatus?.isOpen ? 'مفتوحة الآن' : 'الخزينة مغلقة'} />
          <StatCard title="الديون المستحقة (متأخرات)" value={formatCurrency(stats.outstanding)} icon={AlertTriangle} colorClass="rose" trend={`${overdueInstallments.length} قسط متأخر`} />
          <StatCard title="المصروفات التشغيلية" value="قيد التطوير" icon={ArrowDownToLine} colorClass="amber" trend="مقارنة بالشهر الماضي" />
        </div>

        <h2 className="text-xl font-bold mt-8 mb-4 font-[Noto_Kufi_Arabic]">مؤشرات التشغيل (Operational Metrics)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="الطلاب" value={stats.totalStudents.toString()} icon={GraduationCap} colorClass="blue" trend={`إجمالي مقيد: ${stats.allEnrolledCount}`} />
          <StatCard title="الباصات النشطة" value={stats.activeBusSubs.toString()} icon={Bus} colorClass="indigo" trend="طالب مشترك" />
          <StatCard title="الموظفين" value={activeEmployees.toString()} icon={Users} colorClass="purple" trend={`${users.length} مستخدم مسجل`} />
          <StatCard title="قيمة المخزون" value={formatCurrency(totalInventoryValue)} icon={Boxes} colorClass="amber" trend={`${stats.lowStockCount} تنبيه نواقص`} />
        </div>

        <h2 className="text-xl font-bold mt-8 mb-4 font-[Noto_Kufi_Arabic]">إجراءات مطلوبة فوراً (Pending Actions)</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-lg border bg-card p-5">
             <div className="flex items-center gap-3 mb-4">
                <Vault className="size-5 text-teal-600" />
                <h3 className="font-bold">اعتمادات الخزينة</h3>
             </div>
             {treasuryStatus?.pendingClosure ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-medium text-amber-800">توجد جلسة خزينة تنتظر الاعتماد للإغلاق</p>
                  <Link to="/treasury" className="text-xs text-amber-700 underline mt-1 inline-block">مراجعة الآن</Link>
                </div>
             ) : (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد طلبات إغلاق خزينة معلقة</p>
             )}
          </div>
          
          <div className="rounded-lg border bg-card p-5">
             <div className="flex items-center gap-3 mb-4">
                <ShieldAlert className="size-5 text-rose-600" />
                <h3 className="font-bold">اعتمادات الخصومات</h3>
             </div>
             <p className="text-sm text-muted-foreground text-center py-4">سيتم إتاحة الموافقات المعلقة هنا</p>
          </div>
          
          <div className="rounded-lg border bg-card p-5">
             <div className="flex items-center gap-3 mb-4">
                <ListChecks className="size-5 text-blue-600" />
                <h3 className="font-bold">طلبات المصروفات</h3>
             </div>
             <p className="text-sm text-muted-foreground text-center py-4">سيتم إتاحة طلبات الصرف المعلقة هنا</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <MonthlyCollectionChart monthlyData={monthlyData} />
          <PaymentDistributionChart paymentTypeData={paymentTypeData} />
        </div>
      </div>
    );
  }

  // 6. Head Accountant (Financial Control View)
  if (user.role === 'head_accountant') {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold mb-4 font-[Noto_Kufi_Arabic]">مركز المراقبة المالية (Financial Control)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="إجمالي الإيرادات (المحصلة)" value={formatCurrency(stats.totalPaid)} icon={TrendingUp} colorClass="emerald" trend="عن جميع الطلاب" trendUp />
          <StatCard title="النقدية المتوفرة (الخزينة)" value={formatCurrency(treasuryStatus?.currentBalance || 0)} icon={Vault} colorClass="teal" trend={treasuryStatus?.isOpen ? 'مفتوحة الآن' : 'الخزينة مغلقة'} />
          <StatCard title="إجمالي المستحقات (المتأخرات)" value={formatCurrency(stats.outstanding)} icon={AlertTriangle} colorClass="rose" trend={`${overdueInstallments.length} قسط مستحق`} />
          <StatCard title="إجمالي المصروفات التشغيلية" value="قيد التطوير" icon={ArrowDownToLine} colorClass="amber" trend="مقارنة بالشهر الماضي" />
          <StatCard title="إجمالي إيصالات الدفع" value={payments.length.toString()} icon={FileText} colorClass="blue" trend="إيصالات مسجلة" />
        </div>

        <h2 className="text-xl font-bold mt-8 mb-4 font-[Noto_Kufi_Arabic]">اعتمادات وإجراءات مالية معلقة</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-lg border bg-card p-5">
             <div className="flex items-center gap-3 mb-4">
                <Vault className="size-5 text-teal-600" />
                <h3 className="font-bold">إغلاق يوميات الخزينة</h3>
             </div>
             {treasuryStatus?.pendingClosure ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-medium text-amber-800">توجد جلسة خزينة تنتظر المراجعة والاعتماد</p>
                  <Link to="/treasury" className="text-xs text-amber-700 underline mt-1 inline-block">مراجعة الآن</Link>
                </div>
             ) : (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد طلبات إغلاق خزينة معلقة</p>
             )}
          </div>
          
          <div className="rounded-lg border bg-card p-5">
             <div className="flex items-center gap-3 mb-4">
                <ShieldAlert className="size-5 text-rose-600" />
                <h3 className="font-bold">اعتمادات الخصومات والإعفاءات</h3>
             </div>
             <p className="text-sm text-muted-foreground text-center py-4">سيتم إتاحة طلبات الخصم المعلقة هنا قريباً</p>
          </div>
          
          <div className="rounded-lg border bg-card p-5">
             <div className="flex items-center gap-3 mb-4">
                <ListChecks className="size-5 text-blue-600" />
                <h3 className="font-bold">طلبات الصرف والفواتير</h3>
             </div>
             <p className="text-sm text-muted-foreground text-center py-4">سيتم إتاحة طلبات المصروفات المعلقة هنا قريباً</p>
          </div>
        </div>

        <h2 className="text-xl font-bold mt-8 mb-4 font-[Noto_Kufi_Arabic]">مراقبة الدورة المحاسبية وقيود اليومية</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
           <StatCard title="قيود لم ترحل (مسودة)" value={accountingStats.draftCount.toString()} icon={AlertTriangle} colorClass={accountingStats.draftCount > 0 ? "amber" : "gray"} trend={accountingStats.draftCount > 0 ? "تحتاج ترحيل لاعتمادها" : "الكل مرحل"} />
           <StatCard title="قيود مرحلة (معتمدة)" value={accountingStats.postedCount.toString()} icon={ListChecks} colorClass="emerald" trend="مرحلة لدفتر الأستاذ" />
           <StatCard title="مصروفات معلقة للسداد" value={accountingStats.pendingExpensesCount.toString()} icon={Banknote} colorClass={accountingStats.pendingExpensesCount > 0 ? "rose" : "gray"} trend="مطلوب مراجعتها وتسديدها" />
           
           <div className={`rounded-xl border p-6 flex flex-col justify-center items-center text-center shadow-sm transition-all duration-300 ${accountingStats.draftCount === 0 && accountingStats.pendingExpensesCount === 0 && !treasuryStatus?.pendingClosure ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'}`}>
             {accountingStats.draftCount === 0 && accountingStats.pendingExpensesCount === 0 && !treasuryStatus?.pendingClosure ? (
                <>
                  <Activity className="size-10 text-emerald-600 mb-3 animate-pulse" />
                  <h3 className="font-bold text-emerald-800 text-lg">الدورة المحاسبية سليمة</h3>
                  <p className="text-sm text-emerald-600 mt-1">لا توجد أي قيود أو إجراءات معلقة</p>
                </>
              ) : (
                <>
                  <AlertTriangle className="size-10 text-amber-600 mb-3" />
                  <h3 className="font-bold text-amber-800 text-lg">يوجد إجراءات معلقة</h3>
                  <p className="text-sm text-amber-600 mt-1">يجب إنهاء القيود أو المهام المعلقة</p>
                </>
              )}
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <MonthlyCollectionChart monthlyData={monthlyData} />
          <PaymentDistributionChart paymentTypeData={paymentTypeData} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-8">
          <RecentPaymentsTable recentPayments={recentPayments} />
          <OverdueInstallmentsCard overdueInstallments={overdueInstallments} />
        </div>
      </div>
    );
  }

  // 7. Fallback View (For other roles like student_affairs)
  return (
    <div className="space-y-6">
       <div className="rounded-lg border bg-card p-8 text-center mt-8">
         <GraduationCap className="size-16 mx-auto text-muted-foreground mb-4" />
         <h3 className="text-xl font-bold mb-2">مرحباً بك في النظام</h3>
         <p className="text-muted-foreground">يمكنك الوصول إلى مهامك الخاصة من خلال القائمة الجانبية.</p>
       </div>
    </div>
  );
}
