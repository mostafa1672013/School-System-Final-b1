import { useState } from 'react';
import { toast } from 'sonner';
import { Bus, MapPin, Phone, Users, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBusStore } from '@/stores/busStore';
import { useStudentsStore } from '@/stores/studentsStore';
import { formatCurrency } from '@/lib/utils';
import StatCard from '@/components/features/StatCard';

export default function BusManagement() {
  const { routes, subscriptions, addSubscription, cancelSubscription, getRouteSubscribers } = useBusStore();
  const { students } = useStudentsStore();
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [subForm, setSubForm] = useState({ studentId: '', routeId: '', type: 'annual' as 'monthly' | 'annual' });

  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active');
  const totalBusRevenue = activeSubscriptions.reduce((sum, s) => {
    const route = routes.find((r) => r.id === s.routeId);
    return sum + (route ? (s.type === 'annual' ? route.annualFee : route.monthlyFee) : 0);
  }, 0);

  const selectedRouteData = routes.find((r) => r.id === selectedRoute);
  const routeSubscribers = selectedRoute ? getRouteSubscribers(selectedRoute) : [];

  const handleAddSub = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === subForm.studentId);
    const route = routes.find((r) => r.id === subForm.routeId);
    if (!student || !route) return;
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    if (subForm.type === 'annual') endDate.setFullYear(endDate.getFullYear() + 1);
    else endDate.setMonth(endDate.getMonth() + 1);
    addSubscription({
      studentId: student.id,
      studentName: student.name,
      routeId: route.id,
      routeName: route.name,
      type: subForm.type,
      startDate,
      endDate: endDate.toISOString().split('T')[0],
      status: 'active',
    });
    toast.success(`تم اشتراك ${student.name} في ${route.name}`);
    setSubDialogOpen(false);
    setSubForm({ studentId: '', routeId: '', type: 'annual' });
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="عدد الخطوط" value={routes.length.toString()} icon={Bus} colorClass="teal" />
        <StatCard title="إجمالي المشتركين" value={activeSubscriptions.length.toString()} icon={Users} colorClass="sky" />
        <StatCard title="إيرادات الباصات" value={formatCurrency(totalBusRevenue)} icon={Bus} colorClass="emerald" />
      </div>

      <div className="flex justify-end">
        <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4 ml-2" />اشتراك جديد</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">اشتراك جديد في الباص</DialogTitle></DialogHeader>
            <form onSubmit={handleAddSub} className="space-y-4">
              <div className="space-y-2">
                <Label>الطالب</Label>
                <Select value={subForm.studentId} onValueChange={(v) => setSubForm({ ...subForm, studentId: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                  <SelectContent>{students.filter((s) => s.status === 'active').map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الخط</Label>
                <Select value={subForm.routeId} onValueChange={(v) => setSubForm({ ...subForm, routeId: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الخط" /></SelectTrigger>
                  <SelectContent>{routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>نوع الاشتراك</Label>
                <Select value={subForm.type} onValueChange={(v) => setSubForm({ ...subForm, type: v as 'monthly' | 'annual' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">شهري</SelectItem>
                    <SelectItem value="annual">سنوي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {subForm.routeId && (
                <div className="bg-muted/50 p-3 rounded-lg text-sm">
                  <p>الرسوم: <strong className="tabular-nums">{formatCurrency(subForm.type === 'annual' ? (routes.find((r) => r.id === subForm.routeId)?.annualFee || 0) : (routes.find((r) => r.id === subForm.routeId)?.monthlyFee || 0))}</strong></p>
                </div>
              )}
              <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setSubDialogOpen(false)}>إلغاء</Button><Button type="submit">تأكيد الاشتراك</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Routes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-base font-bold font-[Noto_Kufi_Arabic]">خطوط الباصات</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routes.map((route) => {
              const subs = getRouteSubscribers(route.id);
              const occupancy = Math.round((subs.length / route.capacity) * 100);
              return (
                <button
                  key={route.id}
                  onClick={() => setSelectedRoute(route.id)}
                  className={`text-right rounded-lg border p-5 transition-all hover:shadow-md ${selectedRoute === route.id ? 'border-primary ring-2 ring-primary/20' : ''}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bus className="size-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{route.name}</h4>
                        <p className="text-xs text-muted-foreground">{route.busNumber}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="size-3.5" />{subs.length} / {route.capacity} راكب
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${occupancy}%` }} />
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>شهري: {formatCurrency(route.monthlyFee)}</span>
                      <span>سنوي: {formatCurrency(route.annualFee)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Route Detail */}
        <div className="rounded-lg border bg-card">
          {selectedRouteData ? (
            <div>
              <div className="p-5 border-b">
                <h3 className="font-bold font-[Noto_Kufi_Arabic] mb-3">{selectedRouteData.name}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><span className="font-medium text-foreground">السائق:</span>{selectedRouteData.driverName}</div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Phone className="size-4" /><span dir="ltr" className="tabular-nums">{selectedRouteData.driverPhone}</span></div>
                </div>
              </div>
              <div className="p-5 border-b">
                <p className="text-sm font-medium mb-3">المحطات</p>
                <div className="space-y-2">
                  {selectedRouteData.stops.map((stop, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <MapPin className="size-3.5 text-primary shrink-0" />
                      <span>{stop}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm font-medium mb-3">المشتركين ({routeSubscribers.length})</p>
                <div className="space-y-2">
                  {routeSubscribers.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-sm">
                      <span className="font-medium">{sub.studentName}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{sub.type === 'annual' ? 'سنوي' : 'شهري'}</Badge>
                        <button onClick={() => { cancelSubscription(sub.id); toast.success('تم إلغاء الاشتراك'); }} className="text-red-500 hover:text-red-700" aria-label="إلغاء الاشتراك"><X className="size-4" /></button>
                      </div>
                    </div>
                  ))}
                  {routeSubscribers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">لا يوجد مشتركين</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Bus className="size-10 mb-3 opacity-30" />
              <p className="text-sm">اختر خطاً لعرض التفاصيل</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
