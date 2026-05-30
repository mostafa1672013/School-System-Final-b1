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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Calendar, Plus, Lock, Unlock, ChevronDown, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FiscalYear } from '@/types';

export default function AccountingPeriods() {
  const { user } = useAuthStore();
  const {
    fiscalYears, periods,
    fetchFiscalYears, fetchPeriods,
    addFiscalYear, closeFiscalYear,
    addPeriod, closePeriod, reopenPeriod,
  } = useAccountingStore();

  const [showAddYear, setShowAddYear] = useState(false);
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [expandedYear, setExpandedYear] = useState<string | null>(null);
  const [yearForm, setYearForm] = useState({ yearCode: '', nameAr: '', nameEn: '', startDate: '', endDate: '' });
  const [periodForm, setPeriodForm] = useState({ periodCode: '', nameAr: '', nameEn: '', startDate: '', endDate: '', fiscalYearId: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFiscalYears();
    fetchPeriods();
  }, [fetchFiscalYears, fetchPeriods]);

  // Group periods by fiscal year
  const periodsByYear = (yearId: string) => periods.filter(p => p.fiscalYearId === yearId);

  const handleAddYear = async () => {
    if (!yearForm.yearCode || !yearForm.nameAr || !yearForm.startDate || !yearForm.endDate) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    setSaving(true);
    const ok = await addFiscalYear(yearForm);
    setSaving(false);
    if (ok) {
      toast.success('تم إنشاء السنة المالية بنجاح');
      setShowAddYear(false);
      setYearForm({ yearCode: '', nameAr: '', nameEn: '', startDate: '', endDate: '' });
    } else {
      toast.error('فشل إنشاء السنة المالية');
    }
  };

  const handleAddPeriod = async () => {
    if (!periodForm.periodCode || !periodForm.nameAr || !periodForm.startDate || !periodForm.endDate || !periodForm.fiscalYearId) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    setSaving(true);
    const ok = await addPeriod(periodForm);
    setSaving(false);
    if (ok) {
      toast.success('تم إنشاء الفترة المحاسبية بنجاح');
      setShowAddPeriod(false);
      setPeriodForm({ periodCode: '', nameAr: '', nameEn: '', startDate: '', endDate: '', fiscalYearId: '' });
    } else {
      toast.error('فشل إنشاء الفترة');
    }
  };

  const handleClosePeriod = async (id: string) => {
    const ok = await closePeriod(id, user?.name || '');
    if (ok) toast.success('تم إغلاق الفترة');
    else toast.error('فشل إغلاق الفترة');
  };

  const handleReopenPeriod = async (id: string) => {
    const ok = await reopenPeriod(id);
    if (ok) toast.success('تم إعادة فتح الفترة');
    else toast.error('فشل إعادة الفتح');
  };

  const handleCloseYear = async (year: FiscalYear) => {
    const yearPeriods = periodsByYear(year.id);
    const hasOpenPeriods = yearPeriods.some(p => p.status === 'open');
    if (hasOpenPeriods) {
      toast.error('لا يمكن إغلاق السنة المالية وهناك فترات مفتوحة');
      return;
    }
    const ok = await closeFiscalYear(year.id, user?.name || '');
    if (ok) toast.success('تم إغلاق السنة المالية');
    else toast.error('فشل إغلاق السنة المالية');
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">الفترات المحاسبية</h1>
            <p className="text-sm text-muted-foreground">إدارة السنوات المالية والفترات المحاسبية</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddPeriod(true)} className="gap-2">
            <Plus className="size-4" />
            فترة جديدة
          </Button>
          <Button onClick={() => setShowAddYear(true)} className="gap-2">
            <Plus className="size-4" />
            سنة مالية جديدة
          </Button>
        </div>
      </div>

      {/* Fiscal Years */}
      <div className="space-y-4">
        {fiscalYears.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
              لا توجد سنوات مالية
            </CardContent>
          </Card>
        ) : (
          fiscalYears.map(year => {
            const yearPeriods = periodsByYear(year.id);
            const isExpanded = expandedYear === year.id;
            const openCount = yearPeriods.filter(p => p.status === 'open').length;
            return (
              <Card key={year.id} className={cn(year.status === 'closed' && 'opacity-75')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setExpandedYear(isExpanded ? null : year.id)}
                      className="flex items-center gap-3 text-right flex-1"
                    >
                      {isExpanded ? <ChevronDown className="size-4" /> : <ChevronLeft className="size-4" />}
                      <div>
                        <CardTitle className="text-base">{year.nameAr}</CardTitle>
                        <p className="text-sm text-muted-foreground">{year.startDate} - {year.endDate}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-muted-foreground">
                        {openCount} فترة مفتوحة / {yearPeriods.length} إجمالي
                      </div>
                      <Badge className={cn(
                        'text-xs',
                        year.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      )}>
                        {year.status === 'active' ? 'نشطة' : 'مغلقة'}
                      </Badge>
                      {year.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 h-7 text-xs"
                          onClick={() => handleCloseYear(year)}
                        >
                          <Lock className="size-3 ml-1" />
                          إغلاق السنة
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {yearPeriods.map(period => (
                        <div
                          key={period.id}
                          className={cn(
                            'rounded-lg border p-3 space-y-2',
                            period.status === 'open' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{period.nameAr}</span>
                            <Badge className={cn(
                              'text-xs',
                              period.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            )}>
                              {period.status === 'open' ? 'مفتوحة' : 'مغلقة'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{period.startDate} - {period.endDate}</p>
                          {period.status === 'open' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full h-7 text-xs text-red-600"
                              onClick={() => handleClosePeriod(period.id)}
                            >
                              <Lock className="size-3 ml-1" />
                              إغلاق
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full h-7 text-xs text-green-600"
                              onClick={() => handleReopenPeriod(period.id)}
                              disabled={year.status === 'closed'}
                            >
                              <Unlock className="size-3 ml-1" />
                              إعادة فتح
                            </Button>
                          )}
                        </div>
                      ))}
                      {yearPeriods.length === 0 && (
                        <div className="col-span-full text-center text-sm text-muted-foreground py-4">
                          لا توجد فترات لهذه السنة
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Add Fiscal Year Dialog */}
      <Dialog open={showAddYear} onOpenChange={setShowAddYear}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء سنة مالية جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>كود السنة *</Label>
              <Input
                value={yearForm.yearCode}
                onChange={e => setYearForm(f => ({ ...f, yearCode: e.target.value }))}
                placeholder="مثال: 2026-2027"
                className="mt-1"
              />
            </div>
            <div>
              <Label>الاسم بالعربية *</Label>
              <Input
                value={yearForm.nameAr}
                onChange={e => setYearForm(f => ({ ...f, nameAr: e.target.value }))}
                placeholder="السنة المالية 2026-2027"
                className="mt-1"
              />
            </div>
            <div>
              <Label>الاسم بالإنجليزية</Label>
              <Input
                value={yearForm.nameEn}
                onChange={e => setYearForm(f => ({ ...f, nameEn: e.target.value }))}
                placeholder="Fiscal Year 2026-2027"
                className="mt-1"
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>تاريخ البداية *</Label>
                <Input
                  type="date"
                  value={yearForm.startDate}
                  onChange={e => setYearForm(f => ({ ...f, startDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>تاريخ النهاية *</Label>
                <Input
                  type="date"
                  value={yearForm.endDate}
                  onChange={e => setYearForm(f => ({ ...f, endDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddYear(false)}>إلغاء</Button>
            <Button onClick={handleAddYear} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Period Dialog */}
      <Dialog open={showAddPeriod} onOpenChange={setShowAddPeriod}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء فترة محاسبية جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>السنة المالية *</Label>
              <select
                value={periodForm.fiscalYearId}
                onChange={e => setPeriodForm(f => ({ ...f, fiscalYearId: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm mt-1"
              >
                <option value="">اختر السنة المالية</option>
                {fiscalYears.filter(y => y.status === 'active').map(y => (
                  <option key={y.id} value={y.id}>{y.nameAr}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>كود الفترة *</Label>
              <Input
                value={periodForm.periodCode}
                onChange={e => setPeriodForm(f => ({ ...f, periodCode: e.target.value }))}
                placeholder="مثال: 2026-07"
                className="mt-1"
              />
            </div>
            <div>
              <Label>الاسم بالعربية *</Label>
              <Input
                value={periodForm.nameAr}
                onChange={e => setPeriodForm(f => ({ ...f, nameAr: e.target.value }))}
                placeholder="يوليو 2026"
                className="mt-1"
              />
            </div>
            <div>
              <Label>الاسم بالإنجليزية</Label>
              <Input
                value={periodForm.nameEn}
                onChange={e => setPeriodForm(f => ({ ...f, nameEn: e.target.value }))}
                placeholder="July 2026"
                className="mt-1"
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>تاريخ البداية *</Label>
                <Input
                  type="date"
                  value={periodForm.startDate}
                  onChange={e => setPeriodForm(f => ({ ...f, startDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>تاريخ النهاية *</Label>
                <Input
                  type="date"
                  value={periodForm.endDate}
                  onChange={e => setPeriodForm(f => ({ ...f, endDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddPeriod(false)}>إلغاء</Button>
            <Button onClick={handleAddPeriod} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
