import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Search, Plus, Package, AlertTriangle, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useStudentsStore } from '@/stores/studentsStore';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatDateShort, categoryLabels } from '@/lib/utils';
import StatCard from '@/components/features/StatCard';
import type { InventoryCategory } from '@/types';

const categories: { value: InventoryCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'books', label: 'كتب' },
  { value: 'uniform', label: 'زي مدرسي' },
  { value: 'tools', label: 'أدوات مكتبية' },
  { value: 'lab_equipment', label: 'أدوات معملية' },
  { value: 'operational', label: 'مستلزمات تشغيلية' },
];

export default function Inventory() {
  const { items, transactions, receiveStock, issueStock, addItem } = useInventoryStore();
  const { students } = useStudentsStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [qty, setQty] = useState(0);
  const [txNote, setTxNote] = useState('');
  const [txStudentId, setTxStudentId] = useState('');
  const [newItem, setNewItem] = useState({ name: '', category: 'books' as InventoryCategory, quantity: 0, minQuantity: 10, unitPrice: 0, grade: '', description: '' });

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const matchSearch = i.name.includes(search);
      const matchCat = activeTab === 'all' || i.category === activeTab;
      return matchSearch && matchCat;
    });
  }, [items, search, activeTab]);

  const lowStockItems = items.filter((i) => i.quantity <= i.minQuantity);
  const totalValue = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    addItem({ ...newItem, lastUpdated: new Date().toISOString().split('T')[0] });
    toast.success('تم إضافة الصنف بنجاح');
    setAddDialogOpen(false);
    setNewItem({ name: '', category: 'books', quantity: 0, minQuantity: 10, unitPrice: 0, grade: '', description: '' });
  };

  const handleReceive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || qty <= 0) return;
    receiveStock(selectedItemId, qty, user?.name || '', txNote || undefined);
    toast.success('تم استلام الكمية بنجاح');
    setReceiveDialogOpen(false);
    resetTxForm();
  };

  const handleIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || qty <= 0) return;
    const student = students.find((s) => s.id === txStudentId);
    issueStock(selectedItemId, qty, user?.name || '', txStudentId || undefined, student?.name || undefined, txNote || undefined);
    toast.success('تم صرف الكمية بنجاح');
    setIssueDialogOpen(false);
    resetTxForm();
  };

  const resetTxForm = () => {
    setSelectedItemId(''); setQty(0); setTxNote(''); setTxStudentId('');
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="إجمالي الأصناف" value={items.length.toString()} icon={Package} colorClass="teal" />
        <StatCard title="قيمة المخزن" value={formatCurrency(totalValue)} icon={Package} colorClass="emerald" />
        <StatCard title="أصناف تحت الحد الأدنى" value={lowStockItems.length.toString()} icon={AlertTriangle} colorClass="rose" trend={lowStockItems.length > 0 ? 'يحتاج إعادة طلب' : 'الكل بخير'} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="بحث في الأصناف..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
        <div className="flex gap-2">
          <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><ArrowDownToLine className="size-4 ml-2" />استلام</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">استلام بضاعة</DialogTitle></DialogHeader>
              <form onSubmit={handleReceive} className="space-y-4">
                <div className="space-y-2">
                  <Label>الصنف</Label>
                  <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                    <SelectTrigger><SelectValue placeholder="اختر الصنف" /></SelectTrigger>
                    <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>الكمية</Label><Input type="number" required min={1} value={qty || ''} onChange={(e) => setQty(Number(e.target.value))} /></div>
                <div className="space-y-2"><Label>ملاحظات</Label><Input value={txNote} onChange={(e) => setTxNote(e.target.value)} /></div>
                <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setReceiveDialogOpen(false)}>إلغاء</Button><Button type="submit">تأكيد الاستلام</Button></div>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><ArrowUpFromLine className="size-4 ml-2" />صرف</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">صرف بضاعة</DialogTitle></DialogHeader>
              <form onSubmit={handleIssue} className="space-y-4">
                <div className="space-y-2">
                  <Label>الصنف</Label>
                  <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                    <SelectTrigger><SelectValue placeholder="اختر الصنف" /></SelectTrigger>
                    <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name} (المتاح: {i.quantity})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>الكمية</Label><Input type="number" required min={1} value={qty || ''} onChange={(e) => setQty(Number(e.target.value))} /></div>
                <div className="space-y-2">
                  <Label>للطالب (اختياري)</Label>
                  <Select value={txStudentId} onValueChange={setTxStudentId}>
                    <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">بدون طالب</SelectItem>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>ملاحظات</Label><Input value={txNote} onChange={(e) => setTxNote(e.target.value)} /></div>
                <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setIssueDialogOpen(false)}>إلغاء</Button><Button type="submit">تأكيد الصرف</Button></div>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="size-4 ml-2" />صنف جديد</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">إضافة صنف جديد</DialogTitle></DialogHeader>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>اسم الصنف</Label><Input required value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>التصنيف</Label>
                    <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v as InventoryCategory })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{categories.filter((c) => c.value !== 'all').map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>الكمية المبدئية</Label><Input type="number" required min={0} value={newItem.quantity || ''} onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })} /></div>
                  <div className="space-y-2"><Label>الحد الأدنى</Label><Input type="number" required min={0} value={newItem.minQuantity} onChange={(e) => setNewItem({ ...newItem, minQuantity: Number(e.target.value) })} /></div>
                  <div className="space-y-2"><Label>سعر الوحدة</Label><Input type="number" required min={0} value={newItem.unitPrice || ''} onChange={(e) => setNewItem({ ...newItem, unitPrice: Number(e.target.value) })} /></div>
                  <div className="space-y-2"><Label>الصف (اختياري)</Label><Input value={newItem.grade} onChange={(e) => setNewItem({ ...newItem, grade: e.target.value })} /></div>
                </div>
                <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>إلغاء</Button><Button type="submit">إضافة</Button></div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category Tabs + Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {categories.map((c) => (
            <TabsTrigger key={c.value} value={c.value} className="text-xs">{c.label}</TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4 rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-right p-3 font-semibold">الصنف</th>
                <th className="text-right p-3 font-semibold hidden sm:table-cell">التصنيف</th>
                <th className="text-right p-3 font-semibold">الكمية</th>
                <th className="text-right p-3 font-semibold hidden md:table-cell">الحد الأدنى</th>
                <th className="text-right p-3 font-semibold hidden lg:table-cell">سعر الوحدة</th>
                <th className="text-right p-3 font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const isLow = item.quantity <= item.minQuantity;
                return (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-3">
                      <p className="font-medium">{item.name}</p>
                      {item.grade && <p className="text-xs text-muted-foreground">{item.grade}</p>}
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      <Badge variant="secondary" className="text-xs">{categoryLabels[item.category]}</Badge>
                    </td>
                    <td className="p-3 tabular-nums font-bold">{item.quantity}</td>
                    <td className="p-3 hidden md:table-cell tabular-nums text-muted-foreground">{item.minQuantity}</td>
                    <td className="p-3 hidden lg:table-cell tabular-nums">{formatCurrency(item.unitPrice)}</td>
                    <td className="p-3">
                      {isLow ? (
                        <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="size-3" />نقص</Badge>
                      ) : (
                        <Badge className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-100">متوفر</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="size-12 mx-auto mb-3 opacity-30" />
              <p>لا يوجد أصناف في هذا التصنيف</p>
            </div>
          )}
        </div>
      </Tabs>

      {/* Recent Transactions */}
      <div className="rounded-lg border bg-card">
        <div className="p-5 border-b">
          <h3 className="text-base font-bold font-[Noto_Kufi_Arabic]">آخر حركات المخزن</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-right p-3 font-semibold">الصنف</th>
                <th className="text-right p-3 font-semibold">النوع</th>
                <th className="text-right p-3 font-semibold">الكمية</th>
                <th className="text-right p-3 font-semibold hidden sm:table-cell">ملاحظات</th>
                <th className="text-right p-3 font-semibold hidden md:table-cell">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 10).map((tx) => (
                <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-3 font-medium">{tx.itemName}</td>
                  <td className="p-3">
                    <Badge className={tx.type === 'in' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}>
                      {tx.type === 'in' ? 'وارد' : 'منصرف'}
                    </Badge>
                  </td>
                  <td className="p-3 tabular-nums font-bold">{tx.quantity}</td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground">{tx.studentName || tx.notes || '—'}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{formatDateShort(tx.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
