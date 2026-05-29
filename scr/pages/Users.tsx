import { useState } from 'react';
import { toast } from 'sonner';
import { UserCog, Plus, Shield, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockUsers } from '@/constants/mockData';
import { roleLabels } from '@/lib/utils';
import type { UserRole } from '@/types';

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'system_admin', label: 'مدير النظام' },
  { value: 'school_director', label: 'مدير المدرسة' },
  { value: 'head_accountant', label: 'رئيس الحسابات' },
  { value: 'accountant', label: 'محاسب' },
  { value: 'warehouse_keeper', label: 'أمين المخزن' },
  { value: 'bus_supervisor', label: 'مشرف الباصات' },
];

const roleBadgeColors: Record<string, string> = {
  system_admin: 'bg-red-100 text-red-700',
  school_director: 'bg-purple-100 text-purple-700',
  head_accountant: 'bg-teal-100 text-teal-700',
  accountant: 'bg-blue-100 text-blue-700',
  warehouse_keeper: 'bg-amber-100 text-amber-700',
  bus_supervisor: 'bg-emerald-100 text-emerald-700',
};

export default function Users() {
  const [users, setUsers] = useState(mockUsers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'accountant' as UserRole, password: '123456' });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser = {
      id: `u${Date.now()}`,
      ...form,
      active: true,
    };
    setUsers([...users, newUser]);
    toast.success(`تم إضافة المستخدم ${form.name}`);
    setDialogOpen(false);
    setForm({ name: '', email: '', role: 'accountant', password: '123456' });
  };

  const toggleActive = (userId: string) => {
    setUsers(users.map((u) => u.id === userId ? { ...u, active: !u.active } : u));
    toast.success('تم تحديث حالة المستخدم');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{users.length} مستخدم مسجل</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4 ml-2" />إضافة مستخدم</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-[Noto_Kufi_Arabic]">إضافة مستخدم جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الاسم</Label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الدور</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور</Label>
                  <Input required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
                <Button type="submit">إضافة</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Permissions Overview */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-bold font-[Noto_Kufi_Arabic] mb-4 flex items-center gap-2">
          <Shield className="size-4 text-primary" />
          صلاحيات الأدوار
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-right p-2 font-semibold">الصفحة</th>
                {roleOptions.map((r) => <th key={r.value} className="text-center p-2 font-semibold">{r.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                { page: 'لوحة التحكم', access: [true, true, true, true, true, true] },
                { page: 'الطلاب', access: [true, true, true, true, false, false] },
                { page: 'المدفوعات', access: [true, true, true, true, false, false] },
                { page: 'المخزن', access: [true, true, false, false, true, false] },
                { page: 'الباصات', access: [true, true, false, false, false, true] },
                { page: 'التقارير', access: [true, true, true, false, false, false] },
                { page: 'المستخدمين', access: [true, false, false, false, false, false] },
              ].map((row) => (
                <tr key={row.page} className="border-b last:border-0">
                  <td className="p-2 font-medium">{row.page}</td>
                  {row.access.map((a, i) => (
                    <td key={i} className="text-center p-2">
                      {a ? <Check className="size-4 text-emerald-500 mx-auto" /> : <X className="size-4 text-gray-300 mx-auto" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-right p-3 font-semibold">المستخدم</th>
              <th className="text-right p-3 font-semibold">البريد الإلكتروني</th>
              <th className="text-right p-3 font-semibold">الدور</th>
              <th className="text-right p-3 font-semibold">الحالة</th>
              <th className="text-right p-3 font-semibold w-24">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {u.name.charAt(0)}
                    </div>
                    <span className="font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground" dir="ltr">{u.email}</td>
                <td className="p-3">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${roleBadgeColors[u.role]}`}>
                    {roleLabels[u.role]}
                  </span>
                </td>
                <td className="p-3">
                  <Badge variant={u.active ? 'default' : 'secondary'} className={u.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>
                    {u.active ? 'نشط' : 'معطل'}
                  </Badge>
                </td>
                <td className="p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => toggleActive(u.id)}
                  >
                    {u.active ? 'تعطيل' : 'تفعيل'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
