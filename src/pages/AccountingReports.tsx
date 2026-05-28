import { useState, useEffect } from 'react';
import { useAccountingStore } from '@/stores/accountingStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { BarChart3, TrendingUp, FileText, BookOpen, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type ReportType = 'trial-balance' | 'income-statement' | 'account-ledger' | 'general-ledger';

const reportTabs: { key: ReportType; label: string; icon: React.ElementType }[] = [
  { key: 'trial-balance', label: 'ميزان المراجعة', icon: BarChart3 },
  { key: 'income-statement', label: 'قائمة الدخل', icon: TrendingUp },
  { key: 'account-ledger', label: 'كشف حساب', icon: FileText },
  { key: 'general-ledger', label: 'دفتر الأستاذ', icon: BookOpen },
];

const formatAmount = (n: number) =>
  n.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const typeLabels: Record<string, string> = {
  asset: 'أصول', liability: 'التزامات', equity: 'حقوق ملكية',
  revenue: 'إيرادات', expense: 'مصروفات',
};

export default function AccountingReports() {
  const { periods, accounts, fetchPeriods, fetchAccounts, fetchTrialBalance, fetchIncomeStatement, fetchAccountLedger, fetchGeneralLedger } = useAccountingStore();

  const [activeTab, setActiveTab] = useState<ReportType>('trial-balance');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [accountCode, setAccountCode] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPeriods();
    fetchAccounts();
  }, [fetchPeriods, fetchAccounts]);

  const leafAccounts = accounts.filter(a => (a.level ?? 4) >= 4 && a.isActive !== false);

  const handleFetch = async () => {
    setLoading(true);
    setReportData(null);
    try {
      let data: any;
      if (activeTab === 'trial-balance') {
        data = await fetchTrialBalance({ periodId: periodId || undefined, startDate: startDate || undefined, endDate: endDate || undefined });
      } else if (activeTab === 'income-statement') {
        data = await fetchIncomeStatement(startDate || undefined, endDate || undefined);
      } else if (activeTab === 'account-ledger') {
        if (!accountCode) { toast.error('يرجى اختيار الحساب'); setLoading(false); return; }
        data = await fetchAccountLedger(accountCode, startDate || undefined, endDate || undefined);
      } else if (activeTab === 'general-ledger') {
        data = await fetchGeneralLedger(startDate || undefined, endDate || undefined);
      }
      setReportData(data);
    } catch (e) {
      toast.error('فشل تحميل التقرير');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">التقارير المحاسبية</h1>
          <p className="text-sm text-muted-foreground">ميزان المراجعة، قائمة الدخل، كشف الحسابات</p>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex gap-2 border-b pb-0">
        {reportTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setReportData(null); }}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <Label className="text-xs mb-1">الفترة المحاسبية</Label>
              <Select value={periodId || 'all'} onValueChange={v => { setPeriodId(v === 'all' ? '' : v); if (v && v !== 'all') { setStartDate(''); setEndDate(''); } }}>
                <SelectTrigger className="w-48 h-9">
                  <SelectValue placeholder="جميع الفترات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفترات</SelectItem>
                  {periods.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nameAr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1">من تاريخ</Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setPeriodId(''); }}
                className="h-9 w-36"
              />
            </div>
            <div>
              <Label className="text-xs mb-1">إلى تاريخ</Label>
              <Input
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setPeriodId(''); }}
                className="h-9 w-36"
              />
            </div>
            {activeTab === 'account-ledger' && (
              <div>
                <Label className="text-xs mb-1">الحساب *</Label>
                <Select value={accountCode} onValueChange={setAccountCode}>
                  <SelectTrigger className="w-56 h-9">
                    <SelectValue placeholder="اختر الحساب" />
                  </SelectTrigger>
                  <SelectContent>
                    {leafAccounts.map(a => (
                      <SelectItem key={a.id} value={a.code}>{a.code} - {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleFetch} disabled={loading} className="gap-2 h-9">
              {loading ? <RefreshCw className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              تحديث التقرير
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && reportData && activeTab === 'trial-balance' && (
        <Card>
          <CardHeader>
            <CardTitle>ميزان المراجعة</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 border-b">
                  <tr>
                    <th className="py-3 px-4 text-right">كود الحساب</th>
                    <th className="py-3 px-4 text-right">اسم الحساب</th>
                    <th className="py-3 px-4 text-right">النوع</th>
                    <th className="py-3 px-4 text-center">إجمالي المدين</th>
                    <th className="py-3 px-4 text-center">إجمالي الدائن</th>
                    <th className="py-3 px-4 text-center">الرصيد</th>
                    <th className="py-3 px-4 text-center">نوع الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.lines?.map((line: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-muted/20">
                      <td className="py-2.5 px-4 font-mono text-primary text-xs">{line.accountCode}</td>
                      <td className="py-2.5 px-4">{line.accountName}</td>
                      <td className="py-2.5 px-4">
                        <span className="text-xs text-muted-foreground">{typeLabels[line.accountType] || line.accountType}</span>
                      </td>
                      <td className="py-2.5 px-4 text-center text-blue-700">{formatAmount(line.totalDebit)}</td>
                      <td className="py-2.5 px-4 text-center text-green-700">{formatAmount(line.totalCredit)}</td>
                      <td className="py-2.5 px-4 text-center font-medium">{formatAmount(line.balance)}</td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge className={cn('text-xs', line.balanceType === 'debit' ? 'bg-blue-100 text-blue-700' : line.balanceType === 'credit' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700')}>
                          {line.balanceType === 'debit' ? 'مدين' : line.balanceType === 'credit' ? 'دائن' : 'صفر'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/30 font-bold">
                  <tr>
                    <td colSpan={3} className="py-3 px-4">الإجمالي</td>
                    <td className="py-3 px-4 text-center text-blue-700">{formatAmount(reportData.grandTotalDebit ?? 0)}</td>
                    <td className="py-3 px-4 text-center text-green-700">{formatAmount(reportData.grandTotalCredit ?? 0)}</td>
                    <td colSpan={2} className="py-3 px-4 text-center">
                      {Math.abs((reportData.grandTotalDebit ?? 0) - (reportData.grandTotalCredit ?? 0)) < 0.01 ? (
                        <Badge className="bg-green-100 text-green-700">متوازن</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700">غير متوازن</Badge>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && reportData && activeTab === 'income-statement' && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-700">الإيرادات</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 border-b">
                  <tr>
                    <th className="py-2 px-4 text-right">الحساب</th>
                    <th className="py-2 px-4 text-center">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.revenues?.map((r: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-muted/20">
                      <td className="py-2 px-4">{r.accountCode} - {r.accountName}</td>
                      <td className="py-2 px-4 text-center text-green-700 font-medium">{formatAmount(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/20 font-bold">
                  <tr>
                    <td className="py-2 px-4">إجمالي الإيرادات</td>
                    <td className="py-2 px-4 text-center text-green-700">{formatAmount(reportData.totalRevenue ?? 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-red-700">المصروفات</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 border-b">
                  <tr>
                    <th className="py-2 px-4 text-right">الحساب</th>
                    <th className="py-2 px-4 text-center">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.expenses?.map((e: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-muted/20">
                      <td className="py-2 px-4">{e.accountCode} - {e.accountName}</td>
                      <td className="py-2 px-4 text-center text-red-700 font-medium">{formatAmount(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/20 font-bold">
                  <tr>
                    <td className="py-2 px-4">إجمالي المصروفات</td>
                    <td className="py-2 px-4 text-center text-red-700">{formatAmount(reportData.totalExpense ?? 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>صافي الربح / الخسارة</span>
                <span className={cn(
                  'text-2xl',
                  (reportData.netIncome ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'
                )}>
                  {(reportData.netIncome ?? 0) >= 0 ? '+' : ''}{formatAmount(reportData.netIncome ?? 0)} ج.م
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && reportData && activeTab === 'account-ledger' && (
        <Card>
          <CardHeader>
            <CardTitle>كشف حساب: {reportData.account?.code} - {reportData.account?.name}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 border-b">
                  <tr>
                    <th className="py-3 px-4 text-right">التاريخ</th>
                    <th className="py-3 px-4 text-right">رقم القيد</th>
                    <th className="py-3 px-4 text-right">البيان</th>
                    <th className="py-3 px-4 text-center">مدين</th>
                    <th className="py-3 px-4 text-center">دائن</th>
                    <th className="py-3 px-4 text-center">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.lines?.map((line: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-muted/20">
                      <td className="py-2.5 px-4 text-muted-foreground">{line.entryDate}</td>
                      <td className="py-2.5 px-4 font-mono text-primary text-xs">{line.entryNumber}</td>
                      <td className="py-2.5 px-4">{line.description}</td>
                      <td className="py-2.5 px-4 text-center text-blue-700">
                        {line.debit > 0 ? formatAmount(line.debit) : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-center text-green-700">
                        {line.credit > 0 ? formatAmount(line.credit) : '-'}
                      </td>
                      <td className={cn(
                        'py-2.5 px-4 text-center font-medium',
                        line.runningBalance >= 0 ? 'text-blue-700' : 'text-red-700'
                      )}>
                        {formatAmount(Math.abs(line.runningBalance))}
                        <span className="text-xs mr-1">{line.runningBalance >= 0 ? 'مدين' : 'دائن'}</span>
                      </td>
                    </tr>
                  ))}
                  {(!reportData.lines || reportData.lines.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">لا توجد حركات لهذا الحساب</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && reportData && activeTab === 'general-ledger' && (
        <div className="space-y-4">
          {(reportData as any[])?.map((entry: any) => (
            <Card key={entry.id}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-primary text-sm">{entry.entryNumber}</span>
                    <span className="text-muted-foreground text-sm mr-3">{entry.entryDate}</span>
                  </div>
                  <span className="text-sm font-medium">{entry.description}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <table className="w-full text-xs">
                  <tbody>
                    {entry.lines?.map((line: any, idx: number) => (
                      <tr key={idx} className="border-t">
                        <td className="py-1.5 px-3">{line.account?.code} - {line.account?.name}</td>
                        <td className="py-1.5 px-3 text-center text-blue-700 w-28">
                          {line.debit > 0 ? formatAmount(line.debit) : ''}
                        </td>
                        <td className="py-1.5 px-3 text-center text-green-700 w-28">
                          {line.credit > 0 ? formatAmount(line.credit) : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
          {(!reportData || (reportData as any[]).length === 0) && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                لا توجد قيود مرحلة في الفترة المحددة
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!loading && !reportData && (
        <Card>
          <CardContent className="flex items-center justify-center h-48 text-muted-foreground flex-col gap-3">
            <BarChart3 className="size-10 opacity-30" />
            <p>اختر معايير التقرير ثم اضغط "تحديث التقرير"</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
