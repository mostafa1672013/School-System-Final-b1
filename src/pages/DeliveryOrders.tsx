import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, CheckCircle, Package, RotateCcw, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDeliveryOrderStore } from '@/stores/deliveryOrderStore';
import { useStudentsStore } from '@/stores/studentsStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatCurrency } from '@/lib/utils';
import type { DeliveryOrder, DeliveryOrderStatus } from '@/types';

const STATUS_LABELS: Record<DeliveryOrderStatus, { label: string; color: string }> = {
  pending: { label: 'معلق', color: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'مؤكد', color: 'bg-blue-100 text-blue-800' },
  delivered: { label: 'مُسلَّم', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'ملغي', color: 'bg-gray-100 text-gray-600' }
};

const TERMS = ['1', '2', '3', 'summer'];

export default function DeliveryOrders() {
  const { orders, loading, fetchOrders, createOrder, confirmOrder, deliverOrder, returnItem, cancelOrder } = useDeliveryOrderStore();
  const { students } = useStudentsStore();
  const { items: inventoryItems } = useInventoryStore();
  const { user } = useAuthStore();
  const { activeAcademicYear } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<DeliveryOrderStatus | 'all'>('pending');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [returnDialog, setReturnDialog] = useState<{ orderId: string; itemId: string; itemName: string } | null>(null);
  const [returnNotes, setReturnNotes] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [formStudentId, setFormStudentId] = useState('');
  const [formTerm, setFormTerm] = useState('1');
  const [formChargeType, setFormChargeType] = useState<'within_fees' | 'external'>('within_fees');
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<Array<{ inventoryItemId: string; itemName: string; quantity: number; unitPrice: number }>>([]);
  const [creating, setCreating] = useState(false);

  const userRole = (user as any)?.role || '';
  const isWarehouse = ['warehouse_keeper', 'system_admin', 'school_director'].includes(userRole);
  const isAccounting = ['accountant', 'head_accountant', 'system_admin', 'school_director'].includes(userRole);

  useEffect(() => {
    fetchOrders({ academicYear: activeAcademicYear });
  }, [activeAcademicYear]);

  const filtered = activeTab === 'all' ? orders : orders.filter(o => o.status === activeTab);

  const addItem = () => setFormItems([...formItems, { inventoryItemId: '', itemName: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => setFormItems(formItems.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: unknown) => {
    const updated = [...formItems];
    if (field === 'inventoryItemId') {
      const inv = (inventoryItems as any[]).find((x: any) => x.id === value);
      updated[i] = { ...updated[i], inventoryItemId: String(value), itemName: inv?.name || '', unitPrice: inv?.unitPrice || 0 };
    } else {
      updated[i] = { ...updated[i], [field]: value };
    }
    setFormItems(updated);
  };

  const handleCreate = async () => {
    if (!formStudentId) { toast.error('اختر الطالب'); return; }
    const valid = formItems.filter(i => i.inventoryItemId && i.quantity > 0);
    if (!valid.length) { toast.error('أضف صنفاً واحداً على الأقل'); return; }
    setCreating(true);
    try {
      await createOrder({ studentId: formStudentId, academicYear: activeAcademicYear, term: formTerm, chargeType: formChargeType, notes: formNotes, items: valid });
      toast.success('تم إنشاء طلب التسليم');
      setCreateOpen(false);
      setFormStudentId(''); setFormTerm('1'); setFormItems([]); setFormNotes('');
    } catch (err: any) {
      toast.error(err.message || 'فشل الإنشاء');
    } finally {
      setCreating(false);
    }
  };

  const handleConfirm = async (id: string) => {
    setSubmitting(id);
    try { await confirmOrder(id); toast.success('تم تأكيد الطلب'); }
    catch (err: any) { toast.error(err.message || 'فشل التأكيد'); }
    finally { setSubmitting(null); }
  };

  const handleDeliver = async (id: string) => {
    setSubmitting(id);
    try { await deliverOrder(id); toast.success('تم تسجيل التسليم'); }
    catch (err: any) { toast.error(err.message || 'فشل التسليم'); }
    finally { setSubmitting(null); }
  };

  const handleReturn = async () => {
    if (!returnDialog) return;
    setSubmitting(returnDialog.orderId);
    try {
      await returnItem(returnDialog.orderId, returnDialog.itemId, returnNotes);
      toast.success('تم تسجيل الإرجاع');
      setReturnDialog(null); setReturnNotes('');
    } catch (err: any) { toast.error(err.message || 'فشل الإرجاع'); }
    finally { setSubmitting(null); }
  };

  const OrderCard = ({ order }: { order: DeliveryOrder }) => {
    const st = STATUS_LABELS[order.status];
    return (
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold">{order.student?.name || order.studentId}</p>
            <p className="text-xs text-muted-foreground">{order.code} — ترم {order.term} — {order.academicYear}</p>
          </div>
          <Badge className={st.color}>{st.label}</Badge>
        </div>
        <div className="space-y-1">
          {order.items.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className={item.returnedAt ? 'line-through text-muted-foreground' : ''}>{item.itemName} × {item.quantity}</span>
              <div className="flex items-center gap-2">
                <span>{formatCurrency(item.totalAmount)}</span>
                {order.status === 'delivered' && item.deliveredAt && !item.returnedAt && isWarehouse && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-orange-600"
                    onClick={() => setReturnDialog({ orderId: order.id, itemId: item.id, itemName: item.itemName })}>
                    <RotateCcw className="size-3 ml-1" />إرجاع
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">{order.chargeType === 'external' ? 'خارجي' : 'ضمن المصاريف'}</p>
            <p className="font-semibold">{formatCurrency(order.totalAmount)}</p>
          </div>
          <div className="flex gap-2">
            {order.status === 'pending' && isWarehouse && (
              <Button size="sm" variant="outline" disabled={submitting === order.id} onClick={() => handleConfirm(order.id)}>
                {submitting === order.id ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle className="size-3 ml-1" />}تأكيد
              </Button>
            )}
            {order.status === 'confirmed' && isWarehouse && (
              <Button size="sm" disabled={submitting === order.id} onClick={() => handleDeliver(order.id)}>
                {submitting === order.id ? <Loader2 className="size-3 animate-spin" /> : <Package className="size-3 ml-1" />}تسليم
              </Button>
            )}
            {order.status === 'pending' && isAccounting && (
              <Button size="sm" variant="ghost" className="text-red-600" disabled={submitting === order.id}
                onClick={() => cancelOrder(order.id).then(() => toast.success('تم الإلغاء')).catch(() => toast.error('فشل الإلغاء'))}>
                إلغاء
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">طلبات التسليم</h1>
          <p className="text-sm text-muted-foreground">توزيع الكتب والزي على الطلاب</p>
        </div>
        {isAccounting && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 ml-2" />طلب تسليم جديد</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>إنشاء طلب تسليم</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>الطالب</Label>
                  <Select value={formStudentId} onValueChange={setFormStudentId}>
                    <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                    <SelectContent>{(students as any[]).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} — صف {s.grade}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>الترم</Label>
                    <Select value={formTerm} onValueChange={setFormTerm}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TERMS.map(t => <SelectItem key={t} value={t}>{t === 'summer' ? 'صيفي' : `ترم ${t}`}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>نوع المصروف</Label>
                    <Select value={formChargeType} onValueChange={(v) => setFormChargeType(v as 'within_fees' | 'external')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="within_fees">ضمن المصاريف</SelectItem>
                        <SelectItem value="external">خارجي (يُضاف للطالب)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>الأصناف</Label>
                  {formItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-10 gap-2 items-end border rounded p-2">
                      <div className="col-span-5">
                        <Select value={item.inventoryItemId} onValueChange={v => updateItem(idx, 'inventoryItemId', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="الصنف" /></SelectTrigger>
                          <SelectContent>{(inventoryItems as any[]).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input type="number" min={1} className="h-8 text-xs" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} placeholder="الكمية" />
                      </div>
                      <div className="col-span-2 text-xs text-muted-foreground self-center">{formatCurrency(item.unitPrice * item.quantity)}</div>
                      <Button variant="ghost" size="icon" className="col-span-1 h-8 text-red-600" onClick={() => removeItem(idx)}><Trash2 className="size-3" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full" onClick={addItem}><Plus className="size-3 ml-1" />إضافة صنف</Button>
                </div>
                <div className="space-y-1"><Label>ملاحظات</Label><Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} /></div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>إلغاء</Button>
                  <Button onClick={handleCreate} disabled={creating}>{creating ? 'جاري...' : 'إنشاء'}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DeliveryOrderStatus | 'all')}>
        <TabsList>
          <TabsTrigger value="all">الكل ({orders.length})</TabsTrigger>
          <TabsTrigger value="pending">معلق ({orders.filter(o => o.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="confirmed">مؤكد ({orders.filter(o => o.status === 'confirmed').length})</TabsTrigger>
          <TabsTrigger value="delivered">مُسلَّم ({orders.filter(o => o.status === 'delivered').length})</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab}>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-3 py-16 flex justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <p className="col-span-3 text-center py-12 text-muted-foreground">لا توجد طلبات</p>
            ) : filtered.map(order => <OrderCard key={order.id} order={order} />)}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!returnDialog} onOpenChange={(o) => { if (!o) { setReturnDialog(null); setReturnNotes(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>إرجاع: {returnDialog?.itemName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">سيُعاد هذا الصنف للمخزن ويُلغى استلامه للطالب حتى يمكن إعادة التسليم.</p>
            <div className="space-y-1"><Label>سبب الإرجاع</Label><Textarea value={returnNotes} onChange={e => setReturnNotes(e.target.value)} placeholder="مثال: خطأ في المقاس، كتاب تالف" rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReturnDialog(null)}>إلغاء</Button>
              <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleReturn} disabled={!!submitting}>تأكيد الإرجاع</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
