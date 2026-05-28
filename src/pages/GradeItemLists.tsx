import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, BookOpen, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useGradeItemListStore } from '@/stores/gradeItemListStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { usePurchasingStore } from '@/stores/purchasingStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { GradeItemList } from '@/types';

const TERMS = [
  { value: '1', label: 'الترم الأول' },
  { value: '2', label: 'الترم الثاني' },
  { value: '3', label: 'الترم الثالث' },
  { value: 'summer', label: 'الفصل الصيفي' },
];

export default function GradeItemLists() {
  const { lists, loading, fetchLists, createList, updateEntries, deleteList } = useGradeItemListStore();
  const { items: inventoryItems, fetchItems } = useInventoryStore();
  const { suppliers, fetchSuppliers } = usePurchasingStore();
  const { activeAcademicYear } = useSettingsStore();

  const [selectedYear, setSelectedYear] = useState(activeAcademicYear || '2025-2026');
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingList, setEditingList] = useState<GradeItemList | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formStage, setFormStage] = useState('');
  const [formGrade, setFormGrade] = useState('');
  const [formTrack, setFormTrack] = useState('local');
  const [formEntries, setFormEntries] = useState<Array<{ inventoryItemId: string; quantity: number; sellingPrice?: number; preferredSupplierId?: string }>>([]);

  useEffect(() => {
    fetchLists({ academicYear: selectedYear, term: selectedTerm });
    fetchItems();
    fetchSuppliers();
  }, [selectedYear, selectedTerm]);

  const addEntryRow = () => setFormEntries([...formEntries, { inventoryItemId: '', quantity: 1, sellingPrice: undefined }]);
  const removeEntryRow = (idx: number) => setFormEntries(formEntries.filter((_, i) => i !== idx));
  const updateEntryRow = (idx: number, field: string, value: unknown) => {
    const updated = [...formEntries];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormEntries(updated);
  };

  const resetForm = () => { setFormStage(''); setFormGrade(''); setFormTrack('local'); setFormEntries([]); };

  const handleCreate = async () => {
    if (!formStage || !formGrade) { toast.error('المرحلة والصف مطلوبان'); return; }
    const validEntries = formEntries.filter(e => e.inventoryItemId && e.quantity > 0);
    if (!validEntries.length) { toast.error('أضف صنفاً واحداً على الأقل'); return; }
    try {
      await createList({ stage: formStage, grade: formGrade, track: formTrack, academicYear: selectedYear, term: selectedTerm, entries: validEntries });
      toast.success('تم إنشاء القائمة');
      setCreateOpen(false);
      resetForm();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'فشل الإنشاء');
    }
  };

  const handleUpdateEntries = async () => {
    if (!editingList) return;
    const validEntries = formEntries.filter(e => e.inventoryItemId && e.quantity > 0);
    if (!validEntries.length) { toast.error('أضف صنفاً واحداً على الأقل'); return; }
    const ok = await updateEntries(editingList.id, validEntries);
    if (ok) { toast.success('تم تحديث القائمة'); setEditingList(null); }
    else toast.error('فشل التحديث');
  };

  const openEdit = (list: GradeItemList) => {
    setEditingList(list);
    setFormEntries(list.entries.map(e => ({
      inventoryItemId: e.inventoryItemId, quantity: e.quantity, sellingPrice: e.sellingPrice, preferredSupplierId: e.preferredSupplierId
    })));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const ok = await deleteList(deleteId);
    if (ok) toast.success('تم الحذف'); else toast.error('فشل الحذف');
    setDeleteId(null);
  };

  const EntryEditor = () => (
    <div className="space-y-3">
      {formEntries.map((entry, idx) => (
        <div key={idx} className="grid grid-cols-12 gap-2 items-end border rounded p-2 bg-muted/20">
          <div className="col-span-4 space-y-1">
            <Label className="text-xs">الصنف</Label>
            <Select value={entry.inventoryItemId} onValueChange={(v) => updateEntryRow(idx, 'inventoryItemId', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختر صنف" /></SelectTrigger>
              <SelectContent>{inventoryItems.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">الكمية</Label>
            <Input type="number" min={1} className="h-8 text-xs" value={entry.quantity} onChange={(e) => updateEntryRow(idx, 'quantity', Number(e.target.value))} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">سعر البيع</Label>
            <Input type="number" min={0} step="0.01" className="h-8 text-xs" placeholder="اختياري" value={entry.sellingPrice ?? ''} onChange={(e) => updateEntryRow(idx, 'sellingPrice', e.target.value === '' ? undefined : Number(e.target.value))} />
          </div>
          <div className="col-span-3 space-y-1">
            <Label className="text-xs">المورد المفضل</Label>
            <Select value={entry.preferredSupplierId || ''} onValueChange={(v) => updateEntryRow(idx, 'preferredSupplierId', v || undefined)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="أي مورد" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">أي مورد</SelectItem>
                {(suppliers || []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="icon" className="col-span-1 h-8 text-red-600" onClick={() => removeEntryRow(idx)}><Trash2 className="size-3" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addEntryRow} className="w-full"><Plus className="size-3 ml-1" />إضافة صنف</Button>
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <BookOpen className="size-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">قوائم مستلزمات المراحل</h1>
            <p className="text-sm text-muted-foreground">تحديد الكتب والزي المطلوب لكل صف وترم</p>
          </div>
        </div>
        <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="size-4 ml-2" />قائمة جديدة</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>قائمة مستلزمات جديدة</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>المرحلة</Label><Input value={formStage} onChange={e => setFormStage(e.target.value)} placeholder="ابتدائي" /></div>
                <div className="space-y-1"><Label>الصف</Label><Input value={formGrade} onChange={e => setFormGrade(e.target.value)} placeholder="5" /></div>
                <div className="space-y-1">
                  <Label>المسار</Label>
                  <Select value={formTrack} onValueChange={setFormTrack}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="local">محلي</SelectItem><SelectItem value="international">دولي</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <EntryEditor />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>إلغاء</Button>
                <Button onClick={handleCreate}>إنشاء</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{['2025-2026', '2026-2027', '2024-2025'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={selectedTerm} onValueChange={setSelectedTerm}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{TERMS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-muted-foreground col-span-3">جاري التحميل...</p>
        ) : lists.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            <BookOpen className="size-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد قوائم لهذا الترم — ابدأ بإنشاء واحدة</p>
          </div>
        ) : lists.map(list => (
          <div key={list.id} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">{list.stage} — صف {list.grade}</p>
                <Badge variant="outline" className="text-xs">{list.track === 'local' ? 'محلي' : 'دولي'}</Badge>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(list)}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon" className="text-red-600" onClick={() => setDeleteId(list.id)}><Trash2 className="size-4" /></Button>
              </div>
            </div>
            <div className="space-y-1">
              {list.entries.map(e => (
                <div key={e.id} className="flex justify-between text-sm border-b pb-1 last:border-0">
                  <span>{e.inventoryItem?.name || e.inventoryItemId}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {e.quantity} {e.inventoryItem?.unit || 'وحدة'}
                    {e.sellingPrice != null && <span className="mr-2 text-xs text-blue-600">({e.sellingPrice} ج)</span>}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{list.entries.length} صنف</p>
          </div>
        ))}
      </div>

      <Dialog open={!!editingList} onOpenChange={(o) => { if (!o) setEditingList(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تعديل قائمة: {editingList?.stage} صف {editingList?.grade}</DialogTitle></DialogHeader>
          <EntryEditor />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingList(null)}>إلغاء</Button>
            <Button onClick={handleUpdateEntries}>حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>حذف القائمة؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف قائمة المستلزمات وجميع أصنافها. لا يمكن التراجع.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600">حذف</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
