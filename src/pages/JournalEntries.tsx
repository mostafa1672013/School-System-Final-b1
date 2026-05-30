import { useState, useEffect } from 'react';
import { useAccountingStore } from '@/stores/accountingStore';
import { useAuthStore } from '@/stores/authStore';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { BookOpen, Plus, Eye, CheckCircle, Send, RotateCcw, Trash2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JournalEntry } from '@/types';

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-700' },
  approved: { label: 'معتمد', color: 'bg-blue-100 text-blue-700' },
  posted: { label: 'مرحل', color: 'bg-green-100 text-green-700' },
  reversed: { label: 'معكوس', color: 'bg-red-100 text-red-700' },
  pending_approval: { label: 'بانتظار الاعتماد', color: 'bg-yellow-100 text-yellow-700' },
};

interface LineForm {
  accountId: string;
  debit: string;
  credit: string;
  description: string;
  costCenterId: string;
}

function newLine(): LineForm {
  return { accountId: '', debit: '', credit: '', description: '', costCenterId: '' };
}

export default function JournalEntries() {
  const { user } = useAuthStore();
  const {
    journalEntries, accounts, periods, costCenters,
    fetchJournalEntries, fetchAccounts, fetchPeriods, fetchCostCenters,
    addJournalEntry, approveJournalEntry, postJournalEntry, reverseJournalEntry,
    loading,
  } = useAccountingStore();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null);
  const [showReverse, setShowReverse] = useState<JournalEntry | null>(null);
  const [reverseReason, setReverseReason] = useState('');

  // Form state
  const [form, setForm] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    description: '',
    notes: '',
    periodId: '',
    autoPost: false,
  });
  const [lines, setLines] = useState<LineForm[]>([newLine(), newLine()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchJournalEntries();
    fetchAccounts();
    fetchPeriods();
    fetchCostCenters();
  }, [fetchJournalEntries, fetchAccounts, fetchPeriods, fetchCostCenters]);

  const manualAccounts = accounts.filter(a => a.allowManualEntry !== false && (a.level ?? 4) >= 4);
  const openPeriods = periods.filter(p => p.status === 'open');

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;

  const filteredEntries = journalEntries.filter(e => {
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    if (search && !e.description.includes(search) && !e.entryNumber.includes(search)) return false;
    return true;
  });

  const handleLineChange = (idx: number, field: keyof LineForm, value: string) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const addLine = () => setLines(prev => [...prev, newLine()]);
  const removeLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(prev => prev.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setForm({ entryDate: new Date().toISOString().split('T')[0], description: '', notes: '', periodId: '', autoPost: false });
    setLines([newLine(), newLine()]);
  };

  const handleCreate = async () => {
    if (!form.description) { toast.error('يرجى إدخال وصف القيد'); return; }
    const validLines = lines.filter(l => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
    if (validLines.length < 2) { toast.error('يجب أن يحتوي القيد على سطرين صالحين على الأقل'); return; }
    if (!isBalanced) { toast.error('القيد غير متوازن: مجموع المدين يجب أن يساوي مجموع الدائن'); return; }

    setSaving(true);
    const result = await addJournalEntry({
      ...form,
      periodId: form.periodId || undefined,
      createdBy: user?.id,
      lines: validLines.map(l => ({
        accountId: l.accountId,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        description: l.description || undefined,
        costCenterId: l.costCenterId || undefined,
      })),
    });
    setSaving(false);

    if (result.success) {
      toast.success('تم إنشاء القيد بنجاح');
      setShowCreate(false);
      resetForm();
    } else {
      toast.error(result.error || 'فشل إنشاء القيد');
    }
  };

  const handleApprove = async (entry: JournalEntry) => {
    const ok = await approveJournalEntry(entry.id, user?.name || '');
    if (ok) toast.success('تم اعتماد القيد');
    else toast.error('فشل الاعتماد');
  };

  const handlePost = async (entry: JournalEntry) => {
    const ok = await postJournalEntry(entry.id, user?.name || '');
    if (ok) toast.success('تم ترحيل القيد');
    else toast.error('فشل الترحيل');
  };

  const handleReverse = async () => {
    if (!showReverse || !reverseReason) { toast.error('يرجى إدخال سبب العكس'); return; }
    const ok = await reverseJournalEntry(showReverse.id, user?.name || '', reverseReason);
    if (ok) {
      toast.success('تم عكس القيد بنجاح');
      setShowReverse(null);
      setReverseReason('');
    } else {
      toast.error('فشل عكس القيد');
    }
  };

  const formatAmount = (n: number) => n.toLocaleString('ar-EG', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">القيود المحاسبية</h1>
            <p className="text-sm text-muted-foreground">إنشاء وإدارة القيود المحاسبية</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="size-4" />
          قيد جديد
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute right-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالوصف أو الرقم..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                {Object.entries(statusConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">القيود ({filteredEntries.length})</CardTitle>
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
                  <tr className="border-b bg-muted/30">
                    <th className="py-3 px-4 text-right font-semibold">رقم القيد</th>
                    <th className="py-3 px-4 text-right font-semibold">التاريخ</th>
                    <th className="py-3 px-4 text-right font-semibold">الوصف</th>
                    <th className="py-3 px-4 text-center font-semibold">إجمالي المدين</th>
                    <th className="py-3 px-4 text-center font-semibold">الحالة</th>
                    <th className="py-3 px-4 text-center font-semibold">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map(entry => {
                    const totalDr = entry.lines.reduce((s, l) => s + l.debit, 0);
                    const sc = statusConfig[entry.status] || statusConfig.draft;
                    return (
                      <tr key={entry.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-primary text-xs">{entry.entryNumber}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">{entry.entryDate}</td>
                        <td className="py-2.5 px-4">
                          <span className="line-clamp-1">{entry.description}</span>
                          {entry.isReversal && (
                            <Badge className="text-xs bg-red-100 text-red-700 mr-1">عكس</Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center font-medium">
                          {formatAmount(totalDr)} ج.م
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <Badge className={cn('text-xs', sc.color)}>{sc.label}</Badge>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => setViewEntry(entry)}
                              title="عرض"
                            >
                              <Eye className="size-3.5" />
                            </Button>
                            {entry.status === 'draft' && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7 text-blue-600"
                                  onClick={() => handleApprove(entry)}
                                  title="اعتماد"
                                >
                                  <CheckCircle className="size-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7 text-green-600"
                                  onClick={() => handlePost(entry)}
                                  title="ترحيل"
                                >
                                  <Send className="size-3.5" />
                                </Button>
                              </>
                            )}
                            {entry.status === 'approved' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-green-600"
                                onClick={() => handlePost(entry)}
                                title="ترحيل"
                              >
                                <Send className="size-3.5" />
                              </Button>
                            )}
                            {entry.status === 'posted' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-orange-600"
                                onClick={() => setShowReverse(entry)}
                                title="عكس"
                              >
                                <RotateCcw className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        لا توجد قيود محاسبية
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Journal Entry Dialog */}
      <Dialog open={showCreate} onOpenChange={v => { setShowCreate(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء قيد محاسبي جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>تاريخ القيد *</Label>
                <Input
                  type="date"
                  value={form.entryDate}
                  onChange={e => setForm(f => ({ ...f, entryDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>الفترة المحاسبية</Label>
                <Select value={form.periodId || 'none'} onValueChange={v => setForm(f => ({ ...f, periodId: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="اختر الفترة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون فترة</SelectItem>
                    {openPeriods.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nameAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={form.autoPost}
                    onChange={e => setForm(f => ({ ...f, autoPost: e.target.checked }))}
                    className="size-4"
                  />
                  <span className="text-sm">ترحيل تلقائي</span>
                </label>
              </div>
            </div>
            <div>
              <Label>وصف القيد *</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="وصف القيد المحاسبي"
                className="mt-1"
              />
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="ملاحظات إضافية"
                className="mt-1"
                rows={2}
              />
            </div>

            {/* Lines */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">سطور القيد</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1">
                  <Plus className="size-3.5" />
                  إضافة سطر
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="py-2 px-3 text-right font-semibold">الحساب</th>
                      <th className="py-2 px-3 text-right font-semibold">الوصف</th>
                      <th className="py-2 px-3 text-center font-semibold">مدين</th>
                      <th className="py-2 px-3 text-center font-semibold">دائن</th>
                      <th className="py-2 px-3 text-center font-semibold">مركز تكلفة</th>
                      <th className="py-2 px-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2 min-w-48">
                          <Select value={line.accountId} onValueChange={v => handleLineChange(idx, 'accountId', v)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="اختر حساب" />
                            </SelectTrigger>
                            <SelectContent>
                              {manualAccounts.map(a => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.code} - {a.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Input
                            value={line.description}
                            onChange={e => handleLineChange(idx, 'description', e.target.value)}
                            placeholder="وصف"
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-2 w-28">
                          <Input
                            type="number"
                            value={line.debit}
                            onChange={e => handleLineChange(idx, 'debit', e.target.value)}
                            placeholder="0"
                            className="h-8 text-xs text-center"
                            min="0"
                          />
                        </td>
                        <td className="p-2 w-28">
                          <Input
                            type="number"
                            value={line.credit}
                            onChange={e => handleLineChange(idx, 'credit', e.target.value)}
                            placeholder="0"
                            className="h-8 text-xs text-center"
                            min="0"
                          />
                        </td>
                        <td className="p-2 min-w-32">
                          <Select value={line.costCenterId || 'none'} onValueChange={v => handleLineChange(idx, 'costCenterId', v === 'none' ? '' : v)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="اختياري" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">بدون</SelectItem>
                              {costCenters.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.nameAr}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-7 text-red-500"
                            onClick={() => removeLine(idx)}
                            disabled={lines.length <= 2}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-muted/20">
                    <tr>
                      <td colSpan={2} className="py-2 px-3 text-right font-semibold">الإجمالي</td>
                      <td className="py-2 px-3 text-center font-bold text-blue-700">{totalDebit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                      <td className="py-2 px-3 text-center font-bold text-green-700">{totalCredit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                      <td colSpan={2} className="py-2 px-3 text-center">
                        {isBalanced ? (
                          <Badge className="bg-green-100 text-green-700">متوازن</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">غير متوازن</Badge>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={saving || !isBalanced}>
              {saving ? 'جاري الحفظ...' : 'إنشاء القيد'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Entry Dialog */}
      {viewEntry && (
        <Dialog open={!!viewEntry} onOpenChange={() => setViewEntry(null)}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>تفاصيل القيد - {viewEntry.entryNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">التاريخ:</span> <span className="font-medium mr-1">{viewEntry.entryDate}</span></div>
                <div><span className="text-muted-foreground">الحالة:</span>
                  <Badge className={cn('mr-1 text-xs', statusConfig[viewEntry.status]?.color)}>
                    {statusConfig[viewEntry.status]?.label}
                  </Badge>
                </div>
                <div className="col-span-2"><span className="text-muted-foreground">الوصف:</span> <span className="font-medium mr-1">{viewEntry.description}</span></div>
                {viewEntry.notes && (
                  <div className="col-span-2"><span className="text-muted-foreground">ملاحظات:</span> <span className="mr-1">{viewEntry.notes}</span></div>
                )}
              </div>
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="py-2 px-3 text-right">الحساب</th>
                    <th className="py-2 px-3 text-center">مدين</th>
                    <th className="py-2 px-3 text-center">دائن</th>
                  </tr>
                </thead>
                <tbody>
                  {viewEntry.lines.map((line, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="py-2 px-3">{line.account?.code} - {line.account?.name}</td>
                      <td className="py-2 px-3 text-center text-blue-700 font-medium">
                        {line.debit > 0 ? formatAmount(line.debit) : '-'}
                      </td>
                      <td className="py-2 px-3 text-center text-green-700 font-medium">
                        {line.credit > 0 ? formatAmount(line.credit) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/20 font-bold">
                  <tr>
                    <td className="py-2 px-3">الإجمالي</td>
                    <td className="py-2 px-3 text-center text-blue-700">
                      {formatAmount(viewEntry.lines.reduce((s, l) => s + l.debit, 0))}
                    </td>
                    <td className="py-2 px-3 text-center text-green-700">
                      {formatAmount(viewEntry.lines.reduce((s, l) => s + l.credit, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewEntry(null)}>إغلاق</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reverse Dialog */}
      {showReverse && (
        <Dialog open={!!showReverse} onOpenChange={() => setShowReverse(null)}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>عكس القيد - {showReverse.entryNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">سيتم إنشاء قيد عكسي تلقائياً يعكس جميع سطور هذا القيد.</p>
              <div>
                <Label>سبب العكس *</Label>
                <Textarea
                  value={reverseReason}
                  onChange={e => setReverseReason(e.target.value)}
                  placeholder="أدخل سبب عكس القيد..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowReverse(null)}>إلغاء</Button>
              <Button variant="destructive" onClick={handleReverse} disabled={!reverseReason}>
                عكس القيد
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
