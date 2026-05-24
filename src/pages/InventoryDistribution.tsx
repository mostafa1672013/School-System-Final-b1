import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BarChart3, AlertTriangle, CheckCircle, Clock, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAuthHeaders, useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatCurrency } from '@/lib/utils';
import type { GradeDistributionSummary, StudentDeliveryStatus } from '@/types';

const TERMS = [
  { value: '1', label: 'الترم الأول' },
  { value: '2', label: 'الترم الثاني' },
  { value: '3', label: 'الترم الثالث' },
  { value: 'summer', label: 'الفصل الصيفي' },
];

export default function InventoryDistribution() {
  const { user } = useAuthStore();
  const { activeAcademicYear } = useSettingsStore();
  const [selectedYear, setSelectedYear] = useState(activeAcademicYear || '2025-2026');
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [summaries, setSummaries] = useState<GradeDistributionSummary[]>([]);
  const [studentStatus, setStudentStatus] = useState<{ summary: { total: number; delivered: number; inProgress: number; notStarted: number }; students: StudentDeliveryStatus[] } | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<{ stage: string; grade: string; track: string } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [creatingPR, setCreatingPR] = useState<string | null>(null);
  const [profitability, setProfitability] = useState<{
    items: Array<{ inventoryItemId: string; itemName: string; unit: string; category: string; totalQty: number; totalRevenue: number; totalCost: number; profit: number; margin: number }>;
    totals: { totalRevenue: number; totalCost: number; profit: number };
  } | null>(null);
  const [loadingProfitability, setLoadingProfitability] = useState(false);
  const [profitTerm, setProfitTerm] = useState<string>('');

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch(
        `/api/distribution/grade-summary?academicYear=${encodeURIComponent(selectedYear)}&term=${selectedTerm}`,
        { headers: getAuthHeaders() }
      );
      const data = await res.json();
      setSummaries(Array.isArray(data) ? data : []);
    } catch { toast.error('فشل تحميل التقرير'); }
    finally { setLoadingSummary(false); }
  };

  const fetchStudentStatus = async (stage: string, grade: string, track: string) => {
    setLoadingStudents(true);
    setSelectedGrade({ stage, grade, track });
    try {
      const res = await fetch(
        `/api/distribution/student-status?academicYear=${encodeURIComponent(selectedYear)}&term=${selectedTerm}&stage=${encodeURIComponent(stage)}&grade=${encodeURIComponent(grade)}&track=${encodeURIComponent(track)}`,
        { headers: getAuthHeaders() }
      );
      const data = await res.json();
      setStudentStatus(data);
    } catch { toast.error('فشل تحميل بيانات الطلاب'); }
    finally { setLoadingStudents(false); }
  };

  const fetchProfitability = async () => {
    setLoadingProfitability(true);
    try {
      const params = new URLSearchParams({ academicYear: selectedYear });
      if (profitTerm) params.set('term', profitTerm);
      const res = await fetch(`/api/distribution/profitability?${params}`, { headers: getAuthHeaders() });
      const data = await res.json();
      setProfitability(data);
    } catch { toast.error('فشل تحميل تقرير الربحية'); }
    finally { setLoadingProfitability(false); }
  };

  useEffect(() => { fetchSummary(); }, [selectedYear, selectedTerm]);

  const handleCreatePurchaseRequest = async (summary: GradeDistributionSummary) => {
    const deficitItems = summary.items.filter(i => i.needsPurchase);
    if (!deficitItems.length) return;
    setCreatingPR(summary.listId);
    try {
      const res = await fetch('/api/purchasing/requests', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          requestedBy: (user as any)?.id || (user as any)?.userId || 'system',
          department: `${summary.stage} صف ${summary.grade}`,
          notes: `طلب شراء تلقائي لتغطية عجز ${summary.stage} صف ${summary.grade} — ترم ${selectedTerm}`,
          items: deficitItems.map(item => ({
            itemName: item.itemName,
            itemId: item.inventoryItemId,
            quantity: item.deficit,
            estimatedCost: 0,
            notes: `عجز: ${item.deficit} ${item.unit}`
          })),
          supplierId: deficitItems[0].preferredSupplierId || null
        })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('تم إنشاء طلب الشراء — يمكن متابعته في دورة المشتريات');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'فشل إنشاء طلب الشراء');
    } finally { setCreatingPR(null); }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-violet-100 flex items-center justify-center">
          <BarChart3 className="size-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">تقارير التوزيع</h1>
          <p className="text-sm text-muted-foreground">متابعة توزيع الكتب والزي — العجز والزيادة</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{['2025-2026', '2026-2027', '2024-2025'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={selectedTerm} onValueChange={setSelectedTerm}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{TERMS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchSummary} disabled={loadingSummary}>تحديث</Button>
      </div>

      <Tabs defaultValue="grades">
        <TabsList>
          <TabsTrigger value="grades">توزيع المراحل</TabsTrigger>
          <TabsTrigger value="students">متابعة الطلاب</TabsTrigger>
          <TabsTrigger value="profitability" onClick={() => { if (!profitability) fetchProfitability(); }}>ربحية الأصناف</TabsTrigger>
        </TabsList>

        <TabsContent value="grades" className="mt-4 space-y-4">
          {loadingSummary ? (
            <p className="text-muted-foreground py-8 text-center">جاري التحميل...</p>
          ) : summaries.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart3 className="size-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد قوائم مستلزمات لهذا الترم — أنشئها أولاً من شاشة قوائم المستلزمات</p>
            </div>
          ) : summaries.map(summary => {
            const hasDeficit = summary.items.some(i => i.needsPurchase);
            return (
              <div key={summary.listId} className="rounded-xl border bg-card overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-bold">{summary.stage} — صف {summary.grade}</p>
                      <p className="text-xs text-muted-foreground">{summary.studentCount} طالب</p>
                    </div>
                    {hasDeficit && <Badge className="bg-red-100 text-red-700"><AlertTriangle className="size-3 ml-1" />عجز</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchStudentStatus(summary.stage, summary.grade, summary.track)}>
                      <Users className="size-3 ml-1" />حالة الطلاب
                    </Button>
                    {hasDeficit && (
                      <Button size="sm" className="bg-violet-600 hover:bg-violet-700"
                        disabled={creatingPR === summary.listId}
                        onClick={() => handleCreatePurchaseRequest(summary)}>
                        <ShoppingCart className="size-3 ml-1" />
                        {creatingPR === summary.listId ? 'جاري...' : 'إنشاء طلب شراء'}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-right p-3 font-semibold">الصنف</th>
                        <th className="text-center p-3 font-semibold">مطلوب</th>
                        <th className="text-center p-3 font-semibold">في المخزن</th>
                        <th className="text-center p-3 font-semibold">تم التوزيع</th>
                        <th className="text-center p-3 font-semibold">العجز / الزيادة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.items.map(item => (
                        <tr key={item.inventoryItemId} className="border-t">
                          <td className="p-3">{item.itemName}<span className="text-xs text-muted-foreground mr-1">({item.quantityPerStudent}/طالب)</span></td>
                          <td className="p-3 text-center tabular-nums">{item.required} {item.unit}</td>
                          <td className="p-3 text-center tabular-nums">{item.currentStock}</td>
                          <td className="p-3 text-center tabular-nums">{item.delivered}</td>
                          <td className="p-3 text-center">
                            {item.deficit > 0 ? (
                              <Badge className="bg-red-100 text-red-700">عجز {item.deficit}</Badge>
                            ) : item.deficit < 0 ? (
                              <Badge className="bg-green-100 text-green-700">زيادة {Math.abs(item.deficit)}</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-600">مكتمل</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="students" className="mt-4 space-y-4">
          {!selectedGrade ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="size-12 mx-auto mb-3 opacity-30" />
              <p>اختر مرحلة من تبويب "توزيع المراحل" للعرض</p>
            </div>
          ) : loadingStudents ? (
            <p className="text-muted-foreground py-8 text-center">جاري التحميل...</p>
          ) : studentStatus && (
            <div className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                {[
                  { label: 'إجمالي', value: studentStatus.summary.total, icon: Users, color: 'text-gray-600' },
                  { label: 'تم التسليم', value: studentStatus.summary.delivered, icon: CheckCircle, color: 'text-green-600' },
                  { label: 'قيد التنفيذ', value: studentStatus.summary.inProgress, icon: Clock, color: 'text-blue-600' },
                  { label: 'لم يبدأ', value: studentStatus.summary.notStarted, icon: AlertTriangle, color: 'text-amber-600' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center gap-2 border rounded-lg px-4 py-2">
                    <Icon className={`size-4 ${color}`} />
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="font-bold">{value}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-right p-3">الطالب</th>
                      <th className="text-right p-3">الحالة</th>
                      <th className="text-right p-3">ما تم استلامه</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentStatus.students.map(s => (
                      <tr key={s.studentId} className="border-t hover:bg-muted/10">
                        <td className="p-3 font-medium">{s.studentName}</td>
                        <td className="p-3">
                          {s.status === 'delivered' && <Badge className="bg-green-100 text-green-700"><CheckCircle className="size-3 ml-1" />مُسلَّم</Badge>}
                          {s.status === 'in_progress' && <Badge className="bg-blue-100 text-blue-700"><Clock className="size-3 ml-1" />قيد التنفيذ</Badge>}
                          {s.status === 'not_started' && <Badge className="bg-gray-100 text-gray-600">لم يبدأ</Badge>}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {s.receivedItems.length ? s.receivedItems.map(i => `${i.itemName} ×${i.quantity}`).join('، ') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="profitability" className="mt-4 space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <Select value={profitTerm} onValueChange={setProfitTerm}>
              <SelectTrigger className="w-40"><SelectValue placeholder="كل الترمات" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">كل الترمات</SelectItem>
                {TERMS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchProfitability} disabled={loadingProfitability}>تحديث</Button>
          </div>

          {loadingProfitability ? (
            <p className="text-muted-foreground py-8 text-center">جاري التحميل...</p>
          ) : !profitability ? (
            <div className="text-center py-16 text-muted-foreground">
              <TrendingUp className="size-12 mx-auto mb-3 opacity-30" />
              <p>اضغط "تحديث" لعرض تقرير الربحية</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'إجمالي الإيرادات', value: formatCurrency(profitability.totals.totalRevenue), color: 'text-blue-600' },
                  { label: 'إجمالي التكاليف', value: formatCurrency(profitability.totals.totalCost), color: 'text-red-600' },
                  { label: 'صافي الربح', value: formatCurrency(profitability.totals.profit), color: profitability.totals.profit >= 0 ? 'text-green-600' : 'text-red-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg border p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">{label}</p>
                    <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {profitability.items.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">لا توجد بيانات توزيع مكتملة لهذه الفترة</p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-right p-3 font-semibold">الصنف</th>
                        <th className="text-center p-3 font-semibold">الكمية</th>
                        <th className="text-center p-3 font-semibold">الإيراد</th>
                        <th className="text-center p-3 font-semibold">التكلفة</th>
                        <th className="text-center p-3 font-semibold">الربح</th>
                        <th className="text-center p-3 font-semibold">هامش %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profitability.items.map(item => (
                        <tr key={item.inventoryItemId} className="border-t hover:bg-muted/10">
                          <td className="p-3">
                            <p className="font-medium">{item.itemName}</p>
                            {item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}
                          </td>
                          <td className="p-3 text-center tabular-nums">{item.totalQty} {item.unit}</td>
                          <td className="p-3 text-center tabular-nums text-blue-700">{formatCurrency(item.totalRevenue)}</td>
                          <td className="p-3 text-center tabular-nums text-red-700">{formatCurrency(item.totalCost)}</td>
                          <td className="p-3 text-center tabular-nums font-semibold" style={{ color: item.profit >= 0 ? 'rgb(22,163,74)' : 'rgb(220,38,38)' }}>
                            {formatCurrency(item.profit)}
                          </td>
                          <td className="p-3 text-center tabular-nums">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.margin >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {item.margin}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
