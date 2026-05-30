import { useEffect, useState } from 'react';
import { usePurchasingStore } from '@/stores/purchasingStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, Plus, Search, Building } from 'lucide-react';
import { toast } from 'sonner';

export default function Suppliers() {
  const { suppliers, loading, fetchSuppliers, addSupplier } = usePurchasingStore();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', contactPerson: '', phone: '', email: '', taxId: '', address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const filtered = suppliers.filter(s => 
    s.name.includes(search) || 
    s.code.includes(search) || 
    (s.contactPerson?.includes(search))
  );

  const handleSave = async () => {
    if (!form.code || !form.name) {
      toast.error('يرجى إدخال الكود واسم المورد');
      return;
    }
    setSaving(true);
    const ok = await addSupplier(form);
    setSaving(false);
    if (ok) {
      toast.success('تمت الإضافة بنجاح');
      setShowAdd(false);
      setForm({ code: '', name: '', contactPerson: '', phone: '', email: '', taxId: '', address: '' });
    } else {
      toast.error('فشل الإضافة، قد يكون الكود مكرراً');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Building className="size-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">سجل الموردين</h1>
            <p className="text-sm text-muted-foreground">إدارة بيانات الموردين</p>
          </div>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="size-4" />
          إضافة مورد
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute right-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالكود، الاسم..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
            <CardTitle className="text-sm text-muted-foreground">
              العدد: {filtered.length}
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
                  <tr className="border-b bg-muted/30">
                    <th className="py-3 px-4 text-right font-semibold">كود المورد</th>
                    <th className="py-3 px-4 text-right font-semibold">اسم المورد</th>
                    <th className="py-3 px-4 text-right font-semibold">مسؤول التواصل</th>
                    <th className="py-3 px-4 text-right font-semibold">الهاتف</th>
                    <th className="py-3 px-4 text-right font-semibold">الرقم الضريبي</th>
                    <th className="py-3 px-4 text-center font-semibold">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono">{s.code}</td>
                      <td className="py-3 px-4 font-medium">{s.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{s.contactPerson || '-'}</td>
                      <td className="py-3 px-4">{s.phone || '-'}</td>
                      <td className="py-3 px-4">{s.taxId || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={s.isActive ? 'default' : 'secondary'}>
                          {s.isActive ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        لا يوجد موردين مسجلين
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة مورد جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>كود المورد *</Label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
              </div>
              <div>
                <Label>اسم المورد *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>مسؤول التواصل</Label>
              <Input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>رقم الهاتف</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>الرقم الضريبي</Label>
                <Input value={form.taxId} onChange={e => setForm({ ...form, taxId: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>البريد الإلكتروني</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>العنوان</Label>
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
