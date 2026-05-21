import { useState, useEffect, useMemo } from 'react';
import { useAccountingStore } from '@/stores/accountingStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  BookOpen,
  Plus,
  Search,
  ChevronDown,
  ChevronLeft,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Account } from '@/types';

const typeLabels: Record<string, { label: string; color: string }> = {
  asset: { label: 'أصول', color: 'bg-blue-100 text-blue-800' },
  liability: { label: 'التزامات', color: 'bg-red-100 text-red-800' },
  equity: { label: 'حقوق ملكية', color: 'bg-purple-100 text-purple-800' },
  revenue: { label: 'إيرادات', color: 'bg-green-100 text-green-800' },
  expense: { label: 'مصروفات', color: 'bg-orange-100 text-orange-800' },
};

const normalBalanceLabel = (nb: string) => nb === 'debit' ? 'مدين' : 'دائن';

function AccountRow({
  account,
  depth,
  search,
}: {
  account: Account;
  depth: number;
  search: string;
}) {
  const hasChildren = account.subAccounts && account.subAccounts.length > 0;
  const [expanded, setExpanded] = useState(depth < 2);

  const matchesSearch = !search ||
    account.name.includes(search) ||
    account.code.includes(search) ||
    (account.nameEn?.toLowerCase().includes(search.toLowerCase()) ?? false);

  const childrenMatchSearch = hasChildren && account.subAccounts!.some(child =>
    child.name.includes(search) || child.code.includes(search)
  );

  if (search && !matchesSearch && !childrenMatchSearch) return null;

  const typeInfo = typeLabels[account.type] || { label: account.type, color: 'bg-gray-100 text-gray-800' };
  const indent = depth * 20;

  return (
    <>
      <tr
        className={cn(
          'border-b border-border/40 hover:bg-muted/30 transition-colors',
          account.isSystemAccount && 'bg-amber-50/30'
        )}
      >
        <td className="py-2.5 px-4">
          <div className="flex items-center gap-2" style={{ paddingRight: indent }}>
            {hasChildren ? (
              <button
                onClick={() => setExpanded(!expanded)}
                className="size-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                {expanded ? <ChevronDown className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
              </button>
            ) : (
              <span className="size-5" />
            )}
            <span className="font-mono text-sm font-medium text-primary">{account.code}</span>
          </div>
        </td>
        <td className="py-2.5 px-4">
          <div>
            <span className={cn('text-sm font-medium', depth === 0 && 'font-bold')}>{account.name}</span>
            {account.nameEn && (
              <span className="text-xs text-muted-foreground mr-2">{account.nameEn}</span>
            )}
          </div>
        </td>
        <td className="py-2.5 px-4">
          <Badge className={cn('text-xs', typeInfo.color)}>{typeInfo.label}</Badge>
        </td>
        <td className="py-2.5 px-4 text-center">
          <span className="text-xs text-muted-foreground">{account.level ?? 4}</span>
        </td>
        <td className="py-2.5 px-4 text-center">
          <span className={cn(
            'text-xs font-medium',
            account.normalBalance === 'debit' ? 'text-blue-600' : 'text-red-600'
          )}>
            {normalBalanceLabel(account.normalBalance ?? 'debit')}
          </span>
        </td>
        <td className="py-2.5 px-4 text-center">
          {account.isSystemAccount && (
            <Badge variant="outline" className="text-xs">نظام</Badge>
          )}
        </td>
      </tr>
      {expanded && hasChildren && account.subAccounts!.map(child => (
        <AccountRow key={child.id} account={child} depth={depth + 1} search={search} />
      ))}
    </>
  );
}

export default function ChartOfAccounts() {
  const { accounts, loading, fetchAccounts, addAccount } = useAccountingStore();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    nameEn: '',
    type: 'expense',
    parentId: '',
    normalBalance: 'debit',
    level: '4',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Build tree: top-level accounts (no parentId or parentId not in list)
  const topLevelAccounts = useMemo(() => {
    return accounts.filter(a => !a.parentId);
  }, [accounts]);

  // Flat list of level-4 accounts for parent selection
  const leafAccounts = useMemo(() => {
    return accounts.filter(a => (a.level ?? 4) >= 3);
  }, [accounts]);

  const filteredTop = useMemo(() => {
    if (filterType === 'all') return topLevelAccounts;
    return topLevelAccounts.filter(a => a.type === filterType);
  }, [topLevelAccounts, filterType]);

  // Stats
  const stats = useMemo(() => {
    const total = accounts.length;
    const byType = Object.fromEntries(
      ['asset', 'liability', 'equity', 'revenue', 'expense'].map(t => [t, accounts.filter(a => a.type === t).length])
    );
    return { total, byType };
  }, [accounts]);

  const handleSave = async () => {
    if (!form.code || !form.name || !form.type) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    setSaving(true);
    const ok = await addAccount({
      code: form.code,
      name: form.name,
      nameEn: form.nameEn || undefined,
      type: form.type,
      parentId: form.parentId || undefined,
      normalBalance: form.normalBalance,
      level: Number(form.level),
      allowManualEntry: Number(form.level) === 4,
    });
    setSaving(false);
    if (ok) {
      toast.success('تم إضافة الحساب بنجاح');
      setShowAddDialog(false);
      setForm({ code: '', name: '', nameEn: '', type: 'expense', parentId: '', normalBalance: 'debit', level: '4' });
    } else {
      toast.error('فشل إضافة الحساب - تحقق من عدم تكرار الكود');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">شجرة الحسابات</h1>
            <p className="text-sm text-muted-foreground">دليل الحسابات المحاسبية الهرمي</p>
          </div>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="size-4" />
          إضافة حساب
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(typeLabels).map(([type, info]) => (
          <Card key={type} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterType(filterType === type ? 'all' : type)}>
            <CardContent className="p-3 text-center">
              <Badge className={cn('text-xs mb-1', info.color)}>{info.label}</Badge>
              <p className="text-xl font-bold">{stats.byType[type] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالكود أو الاسم..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                {Object.entries(typeLabels).map(([t, info]) => (
                  <SelectItem key={t} value={t}>{info.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <CardTitle className="text-sm text-muted-foreground mr-auto">
              {accounts.length} حساب
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="py-3 px-4 text-right font-semibold">الكود</th>
                    <th className="py-3 px-4 text-right font-semibold">اسم الحساب</th>
                    <th className="py-3 px-4 text-right font-semibold">النوع</th>
                    <th className="py-3 px-4 text-center font-semibold">المستوى</th>
                    <th className="py-3 px-4 text-center font-semibold">الرصيد الطبيعي</th>
                    <th className="py-3 px-4 text-center font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTop.map(account => (
                    <AccountRow
                      key={account.id}
                      account={account}
                      depth={0}
                      search={search}
                    />
                  ))}
                  {filteredTop.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        <Building2 className="size-8 mx-auto mb-2 opacity-40" />
                        لا توجد حسابات
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة حساب جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>كود الحساب *</Label>
                <Input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="مثال: 159005"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>المستوى</Label>
                <Select value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - مجموعة رئيسية</SelectItem>
                    <SelectItem value="2">2 - فئة رئيسية</SelectItem>
                    <SelectItem value="3">3 - فئة فرعية</SelectItem>
                    <SelectItem value="4">4 - حساب تفصيلي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>اسم الحساب (عربي) *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="اسم الحساب"
                className="mt-1"
              />
            </div>
            <div>
              <Label>اسم الحساب (إنجليزي)</Label>
              <Input
                value={form.nameEn}
                onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))}
                placeholder="Account name"
                className="mt-1"
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>نوع الحساب *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">أصول</SelectItem>
                    <SelectItem value="liability">التزامات</SelectItem>
                    <SelectItem value="equity">حقوق ملكية</SelectItem>
                    <SelectItem value="revenue">إيرادات</SelectItem>
                    <SelectItem value="expense">مصروفات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الرصيد الطبيعي</Label>
                <Select value={form.normalBalance} onValueChange={v => setForm(f => ({ ...f, normalBalance: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">مدين</SelectItem>
                    <SelectItem value="credit">دائن</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>الحساب الأب (اختياري)</Label>
              <Select value={form.parentId || 'none'} onValueChange={v => setForm(f => ({ ...f, parentId: v === 'none' ? '' : v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="بدون حساب أب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون حساب أب</SelectItem>
                  {leafAccounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
