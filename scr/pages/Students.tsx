import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Filter, Eye, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStudentsStore } from '@/stores/studentsStore';
import { formatCurrency, stageLabels, statusLabels } from '@/lib/utils';
import type { Stage } from '@/types';

const stageOptions: { value: Stage; label: string }[] = [
  { value: 'kg', label: 'رياض الأطفال' },
  { value: 'primary', label: 'المرحلة الابتدائية' },
  { value: 'preparatory', label: 'المرحلة الإعدادية' },
  { value: 'secondary', label: 'المرحلة الثانوية' },
];

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-700',
  graduated: 'bg-blue-100 text-blue-700',
  transferred: 'bg-amber-100 text-amber-700',
};

export default function Students() {
  const { students, addStudent } = useStudentsStore();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    nationalId: '', name: '', stage: 'primary' as Stage, grade: '', className: '',
    guardianName: '', guardianPhone: '', address: '', totalFees: 0,
  });

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchSearch = s.name.includes(search) || s.nationalId.includes(search) || s.guardianPhone.includes(search);
      const matchStage = stageFilter === 'all' || s.stage === stageFilter;
      return matchSearch && matchStage;
    });
  }, [students, search, stageFilter]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addStudent({
      ...form,
      enrollmentDate: new Date().toISOString().split('T')[0],
      status: 'active',
      paidAmount: 0,
    });
    toast.success('تم تسجيل الطالب بنجاح');
    setDialogOpen(false);
    setForm({ nationalId: '', name: '', stage: 'primary', grade: '', className: '', guardianName: '', guardianPhone: '', address: '', totalFees: 0 });
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="بحث بالاسم أو الرقم القومي أو الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-44">
              <Filter className="size-4 ml-2" />
              <SelectValue placeholder="كل المراحل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المراحل</SelectItem>
              {stageOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4 ml-2" />تسجيل طالب جديد</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-[Noto_Kufi_Arabic]">تسجيل طالب جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم الطالب</Label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>الرقم القومي</Label>
                  <Input required value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>المرحلة</Label>
                  <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as Stage })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {stageOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الصف</Label>
                  <Input required value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="مثال: الأول" />
                </div>
                <div className="space-y-2">
                  <Label>الفصل</Label>
                  <Input required value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} placeholder="مثال: 1/أ" />
                </div>
                <div className="space-y-2">
                  <Label>اسم ولي الأمر</Label>
                  <Input required value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>هاتف ولي الأمر</Label>
                  <Input required value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>إجمالي الرسوم</Label>
                  <Input type="number" required value={form.totalFees || ''} onChange={(e) => setForm({ ...form, totalFees: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>العنوان</Label>
                <Input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
                <Button type="submit">تسجيل الطالب</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <GraduationCap className="size-4" />
        <span>عرض {filtered.length} من أصل {students.length} طالب</span>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-right p-3 font-semibold">الطالب</th>
              <th className="text-right p-3 font-semibold hidden md:table-cell">المرحلة</th>
              <th className="text-right p-3 font-semibold">الصف / الفصل</th>
              <th className="text-right p-3 font-semibold hidden lg:table-cell">ولي الأمر</th>
              <th className="text-right p-3 font-semibold">المدفوع / الإجمالي</th>
              <th className="text-right p-3 font-semibold hidden sm:table-cell">الحالة</th>
              <th className="text-right p-3 font-semibold w-16">عرض</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const pct = Math.round((s.paidAmount / s.totalFees) * 100);
              return (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="p-3">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.nationalId}</p>
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{stageLabels[s.stage]}</td>
                  <td className="p-3">{s.grade} / {s.className}</td>
                  <td className="p-3 hidden lg:table-cell">
                    <p>{s.guardianName}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{s.guardianPhone}</p>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-[80px]">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: pct >= 100 ? 'hsl(160,84%,39%)' : pct >= 50 ? 'hsl(38,92%,50%)' : 'hsl(0,72%,51%)',
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-xs tabular-nums whitespace-nowrap font-medium">
                        {formatCurrency(s.paidAmount)}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[s.status]}`}>
                      {statusLabels[s.status]}
                    </span>
                  </td>
                  <td className="p-3">
                    <Link to={`/students/${s.id}`}>
                      <Button variant="ghost" size="icon" className="size-8" aria-label="عرض تفاصيل الطالب">
                        <Eye className="size-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <GraduationCap className="size-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">لا يوجد طلاب مطابقون للبحث</p>
          </div>
        )}
      </div>
    </div>
  );
}
