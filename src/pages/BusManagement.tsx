import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Bus, MapPin, Phone, Users, Plus, X, Loader2, Edit, Building2, FileText, Car, ArrowLeftRight, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useBusStore } from '@/stores/busStore';
import { useTransportStore } from '@/stores/transportStore';
import { useStudentsStore } from '@/stores/studentsStore';
import { formatCurrency } from '@/lib/utils';
import { calculateChangeDifference, calculateCancellationRefund } from '@/lib/proRata';
import { getAuthHeaders } from '@/stores/authStore';
import StatCard from '@/components/features/StatCard';
import type { SubscriberType, BusRoute, BusSubscription } from '@/types';

const DISCOUNT_BY_TYPE: Record<SubscriberType, number> = {
  student: 0,
  employee: 50,
  supervisor: 100,
};

const SUBSCRIBER_LABEL: Record<SubscriberType, string> = {
  student: 'طالب',
  employee: 'موظف',
  supervisor: 'مشرف',
};

const CURRENT_YEAR = '2025-2026';

export default function BusManagement() {
  const {
    routes, subscriptions, isLoading, isSubLoading,
    fetchRoutes, fetchSubscriptions,
    addRoute, updateRoute,
    addSubscription, cancelSubscription,
    getRouteSubscribers,
  } = useBusStore();
  const { students } = useStudentsStore();

  const {
    companies, contracts, buses, drivers: _drivers, isLoading: isFleetLoading,
    fetchAll, addCompany, addContract, addBus,
  } = useTransportStore();

  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);

  const [companyForm, setCompanyForm] = useState({ nameAr: '', phone: '', contactPerson: '', email: '', address: '' });
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);

  const [contractForm, setContractForm] = useState({
    companyId: '', contractNumber: '', title: '', startDate: '', endDate: '',
    monthlyFeePerBus: 0, busesCount: 1, paymentFrequency: 'monthly', status: 'active',
  });
  const [contractDialogOpen, setContractDialogOpen] = useState(false);

  const [busForm, setBusForm] = useState({
    plateNumber: '', capacity: 40, ownershipType: 'rented_full', rentalContractId: '',
    make: '', model: '', year: new Date().getFullYear(), status: 'active',
  });
  const [busDialogOpen, setBusDialogOpen] = useState(false);

  const defaultSubForm = {
    subscriberType: 'student' as SubscriberType,
    studentId: '',
    subscriberName: '',
    routeId: '',
    pickupAddress: '',
    pickupPhone: '',
    notes: '',
  };
  const [subForm, setSubForm] = useState(defaultSubForm);

  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [selectedSubForChange, setSelectedSubForChange] = useState<BusSubscription | null>(null);
  const [changeType, setChangeType] = useState<'route_change' | 'cancel'>('route_change');
  const [changeForm, setChangeForm] = useState({
    newRouteId: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    reason: '',
  });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoiceForm, setInvoiceForm] = useState({
    contractId: '', invoiceDate: '', periodFrom: '', periodTo: '',
    baseAmount: 0, taxAmount: 0, discountAmount: 0, notes: '',
  });
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const ACADEMIC_YEAR_END = new Date('2026-06-30');

  const [routeForm, setRouteForm] = useState({
    name: '', driverName: '', driverPhone: '', busNumber: '',
    capacity: 20, monthlyFee: 0, annualFee: 0, stops: [] as string[],
  });

  useEffect(() => {
    fetchRoutes();
    fetchSubscriptions({ academicYear: CURRENT_YEAR });
  }, [fetchRoutes, fetchSubscriptions]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    fetch('/api/rental-invoices', { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then(setInvoices)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (subForm.subscriberType === 'student' && subForm.studentId) {
      const s = students.find((s) => s.id === subForm.studentId);
      if (s) setSubForm((f) => ({ ...f, subscriberName: s.name }));
    }
  }, [subForm.studentId, subForm.subscriberType, students]);

  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active');
  const totalBusRevenue = activeSubscriptions.reduce((sum, s) => sum + s.actualAmount, 0);

  const selectedRouteData = routes.find((r) => r.id === selectedRoute);
  const routeSubscribers = selectedRoute ? getRouteSubscribers(selectedRoute) : [];

  const selectedRouteForSub = routes.find((r) => r.id === subForm.routeId);
  const fullFee = selectedRouteForSub?.annualFee || 0;
  const discountPct = DISCOUNT_BY_TYPE[subForm.subscriberType];
  const actualAmount = fullFee * (100 - discountPct) / 100;

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    await addRoute(routeForm);
    toast.success(`تم إنشاء خط ${routeForm.name} بنجاح`);
    setRouteDialogOpen(false);
    setRouteForm({ name: '', driverName: '', driverPhone: '', busNumber: '', capacity: 20, monthlyFee: 0, annualFee: 0, stops: [] });
  };

  const handleEditRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRouteId) return;
    await updateRoute(editingRouteId, routeForm);
    toast.success('تم تحديث بيانات الخط بنجاح');
    setEditDialogOpen(false);
    setEditingRouteId(null);
    setRouteForm({ name: '', driverName: '', driverPhone: '', busNumber: '', capacity: 20, monthlyFee: 0, annualFee: 0, stops: [] });
  };

  const openEditDialog = (route: BusRoute) => {
    setEditingRouteId(route.id);
    setRouteForm({
      name: route.name, driverName: route.driverName, driverPhone: route.driverPhone,
      busNumber: route.busNumber, capacity: route.capacity,
      monthlyFee: route.monthlyFee, annualFee: route.annualFee, stops: route.stops || [],
    });
    setEditDialogOpen(true);
  };

  const handleAddSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subForm.routeId || !subForm.subscriberName) return;
    const result = await addSubscription({
      subscriberType: subForm.subscriberType,
      studentId: subForm.subscriberType === 'student' ? subForm.studentId : undefined,
      subscriberName: subForm.subscriberName,
      routeId: subForm.routeId,
      academicYear: CURRENT_YEAR,
      startDate: new Date().toISOString(),
      fullFeeAmount: fullFee,
      discountPct,
      actualAmount,
      pickupAddress: subForm.pickupAddress || undefined,
      pickupPhone: subForm.pickupPhone || undefined,
      notes: subForm.notes || undefined,
    });
    if (result) {
      toast.success(`تم اشتراك ${subForm.subscriberName} في ${selectedRouteForSub?.name}`);
      setSubDialogOpen(false);
      setSubForm(defaultSubForm);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats — 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard title="عدد الخطوط" value={routes.length.toString()} icon={Bus} colorClass="teal" />
        <StatCard title="إجمالي المشتركين" value={activeSubscriptions.length.toString()} icon={Users} colorClass="sky" />
        <StatCard title="الباصات النشطة" value={buses.filter((b) => b.status === 'active').length.toString()} icon={Car} colorClass="violet" />
        <StatCard title="إيرادات الباصات" value={formatCurrency(totalBusRevenue)} icon={Bus} colorClass="emerald" />
      </div>

      <Tabs defaultValue="routes">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="routes" className="gap-1.5"><Bus className="size-3.5" />الخطوط</TabsTrigger>
          <TabsTrigger value="fleet" className="gap-1.5"><Car className="size-3.5" />الأسطول</TabsTrigger>
          <TabsTrigger value="companies" className="gap-1.5"><Building2 className="size-3.5" />الشركات</TabsTrigger>
          <TabsTrigger value="contracts" className="gap-1.5"><FileText className="size-3.5" />العقود</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5"><Receipt className="size-3.5" />الفواتير</TabsTrigger>
        </TabsList>

        {/* ─── ROUTES TAB ─── */}
        <TabsContent value="routes" className="mt-6">
          <div className="flex justify-end gap-2">
            {/* Add Route Dialog */}
            <Dialog open={routeDialogOpen} onOpenChange={setRouteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Plus className="size-4 ml-2" />تعريف خط جديد</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">إضافة خط باص جديد</DialogTitle></DialogHeader>
                <form onSubmit={handleAddRoute} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>اسم الخط</Label><Input required value={routeForm.name} onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })} /></div>
                    <div className="space-y-2"><Label>رقم الباص</Label><Input required value={routeForm.busNumber} onChange={(e) => setRouteForm({ ...routeForm, busNumber: e.target.value })} /></div>
                    <div className="space-y-2"><Label>اسم السائق</Label><Input required value={routeForm.driverName} onChange={(e) => setRouteForm({ ...routeForm, driverName: e.target.value })} /></div>
                    <div className="space-y-2"><Label>هاتف السائق</Label><Input required value={routeForm.driverPhone} onChange={(e) => setRouteForm({ ...routeForm, driverPhone: e.target.value })} /></div>
                    <div className="space-y-2"><Label>السعة (ركاب)</Label><Input type="number" required min={1} value={routeForm.capacity} onChange={(e) => setRouteForm({ ...routeForm, capacity: Number(e.target.value) })} /></div>
                    <div className="space-y-2"><Label>الرسوم الشهرية</Label><Input type="number" required min={0} value={routeForm.monthlyFee} onChange={(e) => setRouteForm({ ...routeForm, monthlyFee: Number(e.target.value) })} /></div>
                    <div className="space-y-2"><Label>الرسوم السنوية</Label><Input type="number" required min={0} value={routeForm.annualFee} onChange={(e) => setRouteForm({ ...routeForm, annualFee: Number(e.target.value) })} /></div>
                    <div className="space-y-2">
                      <Label>المحطات (مفصولة بفاصلة)</Label>
                      <Input value={routeForm.stops.join(', ')} onChange={(e) => setRouteForm({ ...routeForm, stops: e.target.value.split(',').map((s) => s.trim()) })} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setRouteDialogOpen(false)}>إلغاء</Button>
                    <Button type="submit">حفظ الخط</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Edit Route Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">تعديل بيانات الخط</DialogTitle></DialogHeader>
                <form onSubmit={handleEditRoute} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>اسم الخط</Label><Input required value={routeForm.name} onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })} /></div>
                    <div className="space-y-2"><Label>رقم الباص</Label><Input required value={routeForm.busNumber} onChange={(e) => setRouteForm({ ...routeForm, busNumber: e.target.value })} /></div>
                    <div className="space-y-2"><Label>اسم السائق</Label><Input required value={routeForm.driverName} onChange={(e) => setRouteForm({ ...routeForm, driverName: e.target.value })} /></div>
                    <div className="space-y-2"><Label>هاتف السائق</Label><Input required value={routeForm.driverPhone} onChange={(e) => setRouteForm({ ...routeForm, driverPhone: e.target.value })} /></div>
                    <div className="space-y-2"><Label>السعة (ركاب)</Label><Input type="number" required min={1} value={routeForm.capacity} onChange={(e) => setRouteForm({ ...routeForm, capacity: Number(e.target.value) })} /></div>
                    <div className="space-y-2"><Label>الرسوم الشهرية</Label><Input type="number" required min={0} value={routeForm.monthlyFee} onChange={(e) => setRouteForm({ ...routeForm, monthlyFee: Number(e.target.value) })} /></div>
                    <div className="space-y-2"><Label>الرسوم السنوية</Label><Input type="number" required min={0} value={routeForm.annualFee} onChange={(e) => setRouteForm({ ...routeForm, annualFee: Number(e.target.value) })} /></div>
                    <div className="space-y-2">
                      <Label>المحطات</Label>
                      <Input value={routeForm.stops.join(', ')} onChange={(e) => setRouteForm({ ...routeForm, stops: e.target.value.split(',').map((s) => s.trim()) })} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>إلغاء</Button>
                    <Button type="submit">حفظ التعديلات</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* New Subscription Dialog */}
            <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="size-4 ml-2" />اشتراك جديد</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">اشتراك جديد في الباص</DialogTitle></DialogHeader>
                <form onSubmit={handleAddSub} className="space-y-4">
                  <div className="space-y-2">
                    <Label>نوع المشترك</Label>
                    <Select value={subForm.subscriberType} onValueChange={(v) => setSubForm({ ...defaultSubForm, subscriberType: v as SubscriberType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">طالب</SelectItem>
                        <SelectItem value="employee">موظف (خصم 50%)</SelectItem>
                        <SelectItem value="supervisor">مشرف (مجاني)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {subForm.subscriberType === 'student' ? (
                    <div className="space-y-2">
                      <Label>الطالب</Label>
                      <Select value={subForm.studentId} onValueChange={(v) => setSubForm((f) => ({ ...f, studentId: v }))}>
                        <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                        <SelectContent>
                          {students.filter((s) => s.status === 'active').map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>اسم {SUBSCRIBER_LABEL[subForm.subscriberType]}</Label>
                      <Input
                        required
                        value={subForm.subscriberName}
                        onChange={(e) => setSubForm((f) => ({ ...f, subscriberName: e.target.value }))}
                        placeholder="الاسم الكامل"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>الخط</Label>
                    <Select value={subForm.routeId} onValueChange={(v) => setSubForm((f) => ({ ...f, routeId: v }))}>
                      <SelectTrigger><SelectValue placeholder="اختر الخط" /></SelectTrigger>
                      <SelectContent>
                        {routes.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.name} — {formatCurrency(r.annualFee)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>عنوان الصعود</Label>
                      <Input value={subForm.pickupAddress} onChange={(e) => setSubForm((f) => ({ ...f, pickupAddress: e.target.value }))} placeholder="اختياري" />
                    </div>
                    <div className="space-y-2">
                      <Label>هاتف التواصل</Label>
                      <Input value={subForm.pickupPhone} onChange={(e) => setSubForm((f) => ({ ...f, pickupPhone: e.target.value }))} placeholder="اختياري" />
                    </div>
                  </div>

                  {subForm.routeId && (
                    <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                      <div className="flex justify-between"><span>الرسوم السنوية الكاملة:</span><strong>{formatCurrency(fullFee)}</strong></div>
                      <div className="flex justify-between"><span>خصم ({SUBSCRIBER_LABEL[subForm.subscriberType]} {discountPct}%):</span><span className="text-red-600">- {formatCurrency(fullFee * discountPct / 100)}</span></div>
                      <div className="flex justify-between font-bold border-t pt-1 mt-1"><span>المبلغ المستحق:</span><span className="text-primary">{formatCurrency(actualAmount)}</span></div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => { setSubDialogOpen(false); setSubForm(defaultSubForm); }}>إلغاء</Button>
                    <Button type="submit" disabled={!subForm.routeId || !subForm.subscriberName}>تأكيد الاشتراك</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Routes Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-base font-bold font-[Noto_Kufi_Arabic]">خطوط الباصات</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isLoading ? (
                  <div className="col-span-2 py-20 flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="size-10 animate-spin text-primary" />
                    <p className="font-bold">جاري تحميل خطوط الباصات...</p>
                  </div>
                ) : (
                  routes.map((route) => {
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
                          <Button variant="ghost" size="icon" className="size-8 -mt-2 -mr-2" onClick={(e) => { e.stopPropagation(); openEditDialog(route); }}>
                            <Edit className="size-4 text-muted-foreground" />
                          </Button>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="size-3.5" />{subs.length} / {route.capacity} راكب
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(occupancy, 100)}%` }} />
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>شهري: {formatCurrency(route.monthlyFee)}</span>
                            <span>سنوي: {formatCurrency(route.annualFee)}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Route Detail Panel */}
            <div className="rounded-lg border bg-card">
              {selectedRouteData ? (
                <div>
                  <div className="p-5 border-b">
                    <h3 className="font-bold font-[Noto_Kufi_Arabic] mb-3">{selectedRouteData.name}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground"><span className="font-medium text-foreground">السائق:</span>{selectedRouteData.driverName}</div>
                      <div className="flex items-center gap-2 text-muted-foreground"><Phone className="size-4" /><span dir="ltr">{selectedRouteData.driverPhone}</span></div>
                    </div>
                  </div>
                  <div className="p-5 border-b">
                    <p className="text-sm font-medium mb-3">المحطات</p>
                    <div className="space-y-2">
                      {selectedRouteData.stops.map((stop, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <MapPin className="size-3.5 text-primary shrink-0" /><span>{stop}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-sm font-medium mb-3">
                      المشتركين ({isSubLoading ? '...' : routeSubscribers.length})
                    </p>
                    {isSubLoading ? (
                      <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
                    ) : (
                      <div className="space-y-2">
                        {routeSubscribers.map((sub) => (
                          <div key={sub.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-sm">
                            <div>
                              <span className="font-medium">{sub.subscriberName}</span>
                              {sub.pickupAddress && <p className="text-xs text-muted-foreground">{sub.pickupAddress}</p>}
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {SUBSCRIBER_LABEL[sub.subscriberType as SubscriberType] ?? sub.subscriberType}
                              </Badge>
                              <button
                                onClick={() => {
                                  setSelectedSubForChange(sub);
                                  setChangeType('route_change');
                                  setChangeForm({ newRouteId: '', effectiveDate: new Date().toISOString().split('T')[0], reason: '' });
                                  setChangeDialogOpen(true);
                                }}
                                className="text-blue-500 hover:text-blue-700"
                                title="تغيير الاشتراك"
                              >
                                <ArrowLeftRight className="size-3.5" />
                              </button>
                              <button
                                onClick={() => { cancelSubscription(sub.id); toast.success('تم إلغاء الاشتراك'); }}
                                className="text-red-500 hover:text-red-700"
                                aria-label="إلغاء الاشتراك"
                              >
                                <X className="size-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {routeSubscribers.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">لا يوجد مشتركين</p>
                        )}
                      </div>
                    )}
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
        </TabsContent>

        {/* ─── FLEET TAB ─── */}
        <TabsContent value="fleet" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Dialog open={busDialogOpen} onOpenChange={setBusDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="size-4 ml-2" />إضافة باص</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">إضافة باص جديد</DialogTitle></DialogHeader>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  await addBus({
                    ...busForm,
                    ownershipType: busForm.ownershipType as 'rented_full' | 'rented_no_driver' | 'owned',
                    status: 'active',
                    rentalContractId: busForm.rentalContractId || undefined,
                  });
                  setBusDialogOpen(false);
                  setBusForm({ plateNumber: '', capacity: 40, ownershipType: 'rented_full', rentalContractId: '', make: '', model: '', year: new Date().getFullYear(), status: 'active' });
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>رقم اللوحة</Label><Input required value={busForm.plateNumber} onChange={(e) => setBusForm({ ...busForm, plateNumber: e.target.value })} /></div>
                    <div className="space-y-2"><Label>السعة</Label><Input type="number" min={1} value={busForm.capacity} onChange={(e) => setBusForm({ ...busForm, capacity: Number(e.target.value) })} /></div>
                    <div className="space-y-2"><Label>الماركة</Label><Input value={busForm.make} onChange={(e) => setBusForm({ ...busForm, make: e.target.value })} /></div>
                    <div className="space-y-2"><Label>الموديل</Label><Input value={busForm.model} onChange={(e) => setBusForm({ ...busForm, model: e.target.value })} /></div>
                    <div className="space-y-2 col-span-2">
                      <Label>العقد</Label>
                      <Select value={busForm.rentalContractId} onValueChange={(v) => setBusForm({ ...busForm, rentalContractId: v })}>
                        <SelectTrigger><SelectValue placeholder="اختر العقد (اختياري)" /></SelectTrigger>
                        <SelectContent>
                          {contracts.filter((c) => c.status === 'active').map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.contractNumber} — {c.company?.nameAr}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setBusDialogOpen(false)}>إلغاء</Button>
                    <Button type="submit">إضافة</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكود</TableHead>
                  <TableHead>اللوحة</TableHead>
                  <TableHead>السعة</TableHead>
                  <TableHead>الشركة</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFleetLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="size-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : buses.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد باصات مسجلة</TableCell></TableRow>
                ) : (
                  buses.map((bus) => (
                    <TableRow key={bus.id}>
                      <TableCell className="font-mono font-bold">{bus.code}</TableCell>
                      <TableCell>{bus.plateNumber}</TableCell>
                      <TableCell>{bus.capacity} راكب</TableCell>
                      <TableCell>{bus.rentalContract?.company?.nameAr || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={bus.status === 'active' ? 'default' : 'secondary'}>
                          {bus.status === 'active' ? 'نشط' : bus.status === 'maintenance' ? 'صيانة' : 'متقاعد'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ─── COMPANIES TAB ─── */}
        <TabsContent value="companies" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="size-4 ml-2" />إضافة شركة</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">إضافة شركة تأجير</DialogTitle></DialogHeader>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  await addCompany({ ...companyForm, isActive: true });
                  setCompanyDialogOpen(false);
                  setCompanyForm({ nameAr: '', phone: '', contactPerson: '', email: '', address: '' });
                }} className="space-y-4">
                  <div className="space-y-2"><Label>اسم الشركة (عربي)</Label><Input required value={companyForm.nameAr} onChange={(e) => setCompanyForm({ ...companyForm, nameAr: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>المسؤول</Label><Input value={companyForm.contactPerson} onChange={(e) => setCompanyForm({ ...companyForm, contactPerson: e.target.value })} /></div>
                    <div className="space-y-2"><Label>الهاتف</Label><Input value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>البريد الإلكتروني</Label><Input type="email" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} /></div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setCompanyDialogOpen(false)}>إلغاء</Button>
                    <Button type="submit">إضافة</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isFleetLoading && companies.length === 0 && (
              <div className="col-span-2 flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
            )}
            {companies.map((company) => (
              <div key={company.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold">{company.nameAr}</h4>
                  <Badge variant="outline">{company.code}</Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  {company.contactPerson && <p>المسؤول: {company.contactPerson}</p>}
                  {company.phone && <p dir="ltr" className="text-right">{company.phone}</p>}
                  <p className="text-xs">{company._count?.contracts || 0} عقد · {company._count?.drivers || 0} سائق</p>
                </div>
              </div>
            ))}
            {companies.length === 0 && !isFleetLoading && (
              <p className="text-muted-foreground text-sm col-span-2 text-center py-8">لا توجد شركات مسجلة</p>
            )}
          </div>
        </TabsContent>

        {/* ─── CONTRACTS TAB ─── */}
        <TabsContent value="contracts" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Dialog open={contractDialogOpen} onOpenChange={setContractDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="size-4 ml-2" />إضافة عقد</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">إضافة عقد تأجير</DialogTitle></DialogHeader>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  await addContract({
                    ...contractForm,
                    monthlyFeePerBus: Number(contractForm.monthlyFeePerBus),
                    busesCount: Number(contractForm.busesCount),
                    status: contractForm.status as 'active',
                    includesDriver: true, includesFuel: true,
                    includesMaintenance: true, includesInsurance: true,
                    paymentFrequency: 'monthly',
                  });
                  setContractDialogOpen(false);
                  setContractForm({ companyId: '', contractNumber: '', title: '', startDate: '', endDate: '', monthlyFeePerBus: 0, busesCount: 1, paymentFrequency: 'monthly', status: 'active' });
                }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>الشركة</Label>
                    <Select value={contractForm.companyId} onValueChange={(v) => setContractForm({ ...contractForm, companyId: v })}>
                      <SelectTrigger><SelectValue placeholder="اختر الشركة" /></SelectTrigger>
                      <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.nameAr}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>رقم العقد</Label><Input required value={contractForm.contractNumber} onChange={(e) => setContractForm({ ...contractForm, contractNumber: e.target.value })} /></div>
                    <div className="space-y-2"><Label>عدد الباصات</Label><Input type="number" min={1} value={contractForm.busesCount} onChange={(e) => setContractForm({ ...contractForm, busesCount: Number(e.target.value) })} /></div>
                    <div className="space-y-2"><Label>تاريخ البداية</Label><Input type="date" required value={contractForm.startDate} onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })} /></div>
                    <div className="space-y-2"><Label>تاريخ الانتهاء</Label><Input type="date" required value={contractForm.endDate} onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })} /></div>
                    <div className="space-y-2 col-span-2"><Label>الإيجار الشهري لكل باص (ج.م)</Label><Input type="number" min={0} required value={contractForm.monthlyFeePerBus} onChange={(e) => setContractForm({ ...contractForm, monthlyFeePerBus: Number(e.target.value) })} /></div>
                  </div>
                  {contractForm.monthlyFeePerBus > 0 && contractForm.busesCount > 0 && (
                    <div className="bg-muted/50 p-3 rounded-lg text-sm text-center">
                      إجمالي شهري: <strong>{formatCurrency(contractForm.monthlyFeePerBus * contractForm.busesCount)}</strong>
                    </div>
                  )}
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setContractDialogOpen(false)}>إلغاء</Button>
                    <Button type="submit" disabled={!contractForm.companyId}>إضافة</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم العقد</TableHead>
                  <TableHead>الشركة</TableHead>
                  <TableHead>عدد الباصات</TableHead>
                  <TableHead>الإيجار الشهري</TableHead>
                  <TableHead>الانتهاء</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFleetLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="size-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : contracts.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد عقود</TableCell></TableRow>
                ) : (
                  contracts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono">{c.contractNumber}</TableCell>
                      <TableCell>{c.company?.nameAr}</TableCell>
                      <TableCell>{c.busesCount} باص</TableCell>
                      <TableCell>{formatCurrency(c.monthlyFeePerBus * c.busesCount)}</TableCell>
                      <TableCell>{new Date(c.endDate).toLocaleDateString('ar-EG')}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
                          {c.status === 'active' ? 'نشط' : c.status === 'expired' ? 'منتهي' : 'ملغي'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        {/* ─── INVOICES TAB ─── */}
        <TabsContent value="invoices" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="size-4 ml-2" />إضافة فاتورة إيجار</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">فاتورة إيجار باصات</DialogTitle></DialogHeader>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const total = invoiceForm.baseAmount + invoiceForm.taxAmount - invoiceForm.discountAmount;
                  const res = await fetch('/api/rental-invoices', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ ...invoiceForm, totalAmount: total, status: 'pending_review' }),
                  });
                  if (res.ok) {
                    const inv = await res.json();
                    setInvoices((prev) => [inv, ...prev]);
                    toast.success(`تم إضافة الفاتورة ${inv.code}`);
                    setInvoiceDialogOpen(false);
                    setInvoiceForm({ contractId: '', invoiceDate: '', periodFrom: '', periodTo: '', baseAmount: 0, taxAmount: 0, discountAmount: 0, notes: '' });
                  }
                }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>العقد</Label>
                    <Select value={invoiceForm.contractId} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, contractId: v })}>
                      <SelectTrigger><SelectValue placeholder="اختر العقد" /></SelectTrigger>
                      <SelectContent>
                        {contracts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.contractNumber} — {c.company?.nameAr}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2"><Label>تاريخ الفاتورة</Label><Input type="date" required value={invoiceForm.invoiceDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })} /></div>
                    <div className="space-y-2"><Label>من</Label><Input type="date" required value={invoiceForm.periodFrom} onChange={(e) => setInvoiceForm({ ...invoiceForm, periodFrom: e.target.value })} /></div>
                    <div className="space-y-2"><Label>إلى</Label><Input type="date" required value={invoiceForm.periodTo} onChange={(e) => setInvoiceForm({ ...invoiceForm, periodTo: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2"><Label>المبلغ الأساسي</Label><Input type="number" min={0} required value={invoiceForm.baseAmount} onChange={(e) => setInvoiceForm({ ...invoiceForm, baseAmount: Number(e.target.value) })} /></div>
                    <div className="space-y-2"><Label>الضريبة</Label><Input type="number" min={0} value={invoiceForm.taxAmount} onChange={(e) => setInvoiceForm({ ...invoiceForm, taxAmount: Number(e.target.value) })} /></div>
                    <div className="space-y-2"><Label>الخصم</Label><Input type="number" min={0} value={invoiceForm.discountAmount} onChange={(e) => setInvoiceForm({ ...invoiceForm, discountAmount: Number(e.target.value) })} /></div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg text-sm text-center">
                    الإجمالي: <strong>{formatCurrency(invoiceForm.baseAmount + invoiceForm.taxAmount - invoiceForm.discountAmount)}</strong>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setInvoiceDialogOpen(false)}>إلغاء</Button>
                    <Button type="submit" disabled={!invoiceForm.contractId}>إضافة</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكود</TableHead>
                  <TableHead>الشركة</TableHead>
                  <TableHead>الفترة</TableHead>
                  <TableHead>الإجمالي</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد فواتير</TableCell></TableRow>
                ) : (
                  invoices.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono">{inv.code}</TableCell>
                      <TableCell>{inv.contract?.company?.nameAr}</TableCell>
                      <TableCell className="text-xs">{new Date(inv.periodFrom).toLocaleDateString('ar-EG')} — {new Date(inv.periodTo).toLocaleDateString('ar-EG')}</TableCell>
                      <TableCell>{formatCurrency(inv.totalAmount)}</TableCell>
                      <TableCell>
                        <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'approved' ? 'secondary' : 'outline'}>
                          {inv.status === 'paid' ? 'مدفوعة' : inv.status === 'approved' ? 'معتمدة' : 'بانتظار المراجعة'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {inv.status === 'pending_review' && (
                          <Button size="sm" variant="outline" onClick={async () => {
                            const res = await fetch(`/api/rental-invoices/${inv.id}`, {
                              method: 'PATCH', headers: getAuthHeaders(),
                              body: JSON.stringify({ status: 'approved' }),
                            });
                            if (res.ok) {
                              const updated = await res.json();
                              setInvoices((prev) => prev.map((i: any) => i.id === inv.id ? updated : i));
                              toast.success('تم اعتماد الفاتورة');
                            }
                          }}>اعتماد</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── CHANGE SUBSCRIPTION DIALOG ─── */}
      <Dialog open={changeDialogOpen} onOpenChange={setChangeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-[Noto_Kufi_Arabic]">
              تغيير اشتراك: {selectedSubForChange?.subscriberName}
            </DialogTitle>
          </DialogHeader>

          {selectedSubForChange && (() => {
            const selectedNewRoute = routes.find((r) => r.id === changeForm.newRouteId);
            const proRata = changeType === 'route_change' && selectedNewRoute
              ? calculateChangeDifference({
                  previousFullFee: Number(selectedSubForChange.fullFeeAmount),
                  previousDiscountPct: Number(selectedSubForChange.discountPct),
                  newFullFee: Number(selectedNewRoute.annualFee),
                  newDiscountPct: Number(selectedSubForChange.discountPct),
                  changeEffectiveDate: new Date(changeForm.effectiveDate),
                  academicYearEnd: ACADEMIC_YEAR_END,
                })
              : changeType === 'cancel'
              ? {
                  difference: -calculateCancellationRefund({
                    netFeePaid: Number(selectedSubForChange.actualAmount),
                    cancellationDate: new Date(changeForm.effectiveDate),
                    academicYearEnd: ACADEMIC_YEAR_END,
                  }),
                  direction: 'school_refunds' as const,
                  monthsRemaining: 0, proportion: 0,
                  previousRemaining: 0, newRemaining: 0, totalMonths: 10,
                }
              : null;

            return (
              <div className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-lg text-sm">
                  <p>الخط الحالي: <strong>{selectedSubForChange.route?.name || '—'}</strong></p>
                  <p>الرسوم المدفوعة: <strong>{formatCurrency(Number(selectedSubForChange.actualAmount))}</strong></p>
                </div>

                <div className="space-y-2">
                  <Label>نوع التغيير</Label>
                  <Select value={changeType} onValueChange={(v) => setChangeType(v as 'route_change' | 'cancel')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="route_change">تغيير الخط</SelectItem>
                      <SelectItem value="cancel">إلغاء الاشتراك</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {changeType === 'route_change' && (
                  <div className="space-y-2">
                    <Label>الخط الجديد</Label>
                    <Select value={changeForm.newRouteId} onValueChange={(v) => setChangeForm((f) => ({ ...f, newRouteId: v }))}>
                      <SelectTrigger><SelectValue placeholder="اختر الخط الجديد" /></SelectTrigger>
                      <SelectContent>
                        {routes.filter((r) => r.id !== selectedSubForChange.routeId).map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.name} — {formatCurrency(Number(r.annualFee))}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>تاريخ التطبيق</Label>
                  <Input type="date" value={changeForm.effectiveDate} onChange={(e) => setChangeForm((f) => ({ ...f, effectiveDate: e.target.value }))} />
                </div>

                {proRata && proRata.difference !== 0 && (
                  <div className={`p-3 rounded-lg text-sm border ${proRata.direction === 'subscriber_pays' ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                    <p className="font-bold mb-1">حساب الفرق (Pro-Rata)</p>
                    <p>الأشهر المتبقية: {proRata.monthsRemaining} من {proRata.totalMonths}</p>
                    {changeType === 'route_change' && (
                      <>
                        <p>المبلغ المتبقي السابق: {formatCurrency(proRata.previousRemaining)}</p>
                        <p>المبلغ المتبقي الجديد: {formatCurrency(proRata.newRemaining)}</p>
                      </>
                    )}
                    <p className="font-bold mt-1">
                      {proRata.direction === 'subscriber_pays'
                        ? `➕ يستحق إضافي: ${formatCurrency(proRata.difference)}`
                        : `➖ مبلغ مسترد: ${formatCurrency(Math.abs(proRata.difference))}`}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>سبب التغيير</Label>
                  <Textarea value={changeForm.reason} onChange={(e) => setChangeForm((f) => ({ ...f, reason: e.target.value }))} rows={2} />
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setChangeDialogOpen(false)}>إلغاء</Button>
                  <Button
                    onClick={async () => {
                      const selectedNewRoute = routes.find((r) => r.id === changeForm.newRouteId);
                      const res = await fetch('/api/subscription-changes', {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({
                          subscriptionId: selectedSubForChange.id,
                          changeType,
                          effectiveDate: changeForm.effectiveDate,
                          newRouteId: changeForm.newRouteId || null,
                          changeReason: changeForm.reason,
                          previousFullFee: proRata?.previousRemaining != null ? Number(selectedSubForChange.fullFeeAmount) : undefined,
                          newFullFee: proRata?.newRemaining != null ? (changeType === 'route_change' && selectedNewRoute ? Number(selectedNewRoute.annualFee) : undefined) : undefined,
                          monthsRemaining: proRata?.monthsRemaining,
                          previousRemaining: proRata?.previousRemaining,
                          newRemaining: proRata?.newRemaining,
                          proRataDifference: proRata?.difference,
                          direction: proRata?.direction,
                        }),
                      });
                      if (res.ok) {
                        toast.success('تم تسجيل التغيير بنجاح');
                        setChangeDialogOpen(false);
                        fetchSubscriptions({ academicYear: CURRENT_YEAR });
                      } else {
                        toast.error('فشل تسجيل التغيير');
                      }
                    }}
                    disabled={changeType === 'route_change' && !changeForm.newRouteId}
                    variant={changeType === 'cancel' ? 'destructive' : 'default'}
                  >
                    {changeType === 'cancel' ? 'تأكيد الإلغاء' : 'تأكيد التغيير'}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
