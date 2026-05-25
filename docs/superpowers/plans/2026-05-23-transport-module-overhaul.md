# Transport Module Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate bus subscriptions from localStorage to the database, add fleet/contract management, and build the pro-rata financial engine — per `docs/08_TRANSPORT_MODULE.md`.

**Architecture:** Three independent phases. Phase A fixes the critical data-loss bug (subscriptions in localStorage). Phase B adds the rental fleet layer. Phase C adds the financial engine (pro-rata, changes, invoices, profitability). Each phase produces working, testable software on its own.

**Tech Stack:** React 18 + TypeScript + Zustand, Express + Prisma + PostgreSQL, shadcn/ui, Sonner toasts, Lucide icons, Arabic RTL UI.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `server/prisma/schema.prisma` | Modify | Add BusSubscription, RentalCompany, RentalContract, Bus, ExternalDriver, RouteAssignment, SubscriptionChange, RentalInvoice |
| `server/src/index.ts` | Modify | Add all transport API endpoints |
| `src/types/index.ts` | Modify | Add/update transport types |
| `src/stores/busStore.ts` | Modify | Wire subscriptions to API |
| `src/stores/transportStore.ts` | Create | Fleet, companies, contracts store |
| `src/lib/proRata.ts` | Create | Pro-rata calculator (TypeScript) |
| `src/pages/BusManagement.tsx` | Modify | Tabs: Routes, Subscriptions, Fleet, Companies, Invoices |

---

## PHASE A — Subscriptions to Database

### Task 1: Add BusSubscription Prisma model

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add BusSubscription model to schema**

Open `server/prisma/schema.prisma` and add after the `BusRoute` model (after line 202):

```prisma
model BusSubscription {
  id              String    @id @default(uuid())
  code            String    @unique
  subscriberType  String    // 'student' | 'employee' | 'supervisor'
  studentId       String?
  subscriberName  String    // denormalized display name
  routeId         String
  route           BusRoute  @relation(fields: [routeId], references: [id])
  academicYear    String
  startDate       DateTime
  endDate         DateTime?
  fullFeeAmount   Decimal   @db.Decimal(12, 2)
  discountPct     Decimal   @default(0) @db.Decimal(5, 2)
  actualAmount    Decimal   @db.Decimal(12, 2)
  pickupAddress   String?
  pickupPhone     String?
  status          String    @default("active") // active|suspended|cancelled|completed
  notes           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

Also add the relation to `BusRoute`:

```prisma
model BusRoute {
  id              String              @id @default(uuid())
  name            String
  driverName      String
  driverPhone     String
  busNumber       String
  capacity        Int
  monthlyFee      Decimal             @db.Decimal(12, 2)
  annualFee       Decimal             @db.Decimal(12, 2)
  stops           String[]            @default([])
  subscriptions   BusSubscription[]
}
```

- [ ] **Step 2: Run migration**

```bash
cd server
npx prisma migrate dev --name add_bus_subscription
```

Expected: Migration created and applied, `BusSubscription` table created in DB.

- [ ] **Step 3: Verify schema applied**

```bash
npx prisma studio
```

Confirm `BusSubscription` table is visible with all fields.

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat(transport): add BusSubscription model to Prisma schema"
```

---

### Task 2: Add Subscription API Endpoints

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Add subscription counter helper near top of index.ts**

Find the bus routes section (around line 1357) and add the subscription API right after `app.patch('/api/bus-routes/:id', ...)` ends (after line 1395):

```typescript
// --- Bus Subscriptions API ---

// Helper: generate subscription code like SUB-2026-0001
async function generateSubCode(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.busSubscription.count();
  return `SUB-${year}-${String(count + 1).padStart(4, '0')}`;
}

app.get('/api/bus-subscriptions', requireAuth, async (req, res) => {
  try {
    const { routeId, status, academicYear } = req.query as Record<string, string>;
    const where: any = {};
    if (routeId) where.routeId = routeId;
    if (status) where.status = status;
    if (academicYear) where.academicYear = academicYear;
    const subs = await prisma.busSubscription.findMany({
      where,
      include: { route: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(subs);
  } catch (error) {
    console.error('Fetch subscriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

app.post('/api/bus-subscriptions', requireAuth, async (req, res) => {
  try {
    const code = await generateSubCode();
    const sub = await prisma.busSubscription.create({
      data: { ...req.body, code },
      include: { route: true },
    });
    console.log('✅ اشتراك جديد:', sub.code);
    res.json(sub);
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

app.patch('/api/bus-subscriptions/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const sub = await prisma.busSubscription.update({
      where: { id },
      data: req.body,
      include: { route: true },
    });
    res.json(sub);
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

app.delete('/api/bus-subscriptions/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.busSubscription.update({
      where: { id },
      data: { status: 'cancelled' },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});
```

- [ ] **Step 2: Restart server and test endpoints**

```bash
cd server && npm run dev
```

In another terminal:
```bash
curl -s http://localhost:3001/api/bus-subscriptions \
  -H "Authorization: Bearer $(cat .test-token 2>/dev/null || echo 'get-token-from-login')"
```

Expected: Returns `[]` (empty array, no error).

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "feat(transport): add bus subscription CRUD API endpoints"
```

---

### Task 3: Update Frontend Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Replace BusSubscription type**

Find and replace the `BusSubscription` interface in `src/types/index.ts`:

```typescript
// OLD (remove this):
export interface BusSubscription {
  id: string;
  studentId: string;
  studentName: string;
  routeId: string;
  routeName: string;
  type: 'monthly' | 'annual';
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
}

// NEW (replace with):
export type SubscriberType = 'student' | 'employee' | 'supervisor';

export interface BusSubscription {
  id: string;
  code: string;
  subscriberType: SubscriberType;
  studentId?: string;
  subscriberName: string;
  routeId: string;
  route?: BusRoute;
  academicYear: string;
  startDate: string;
  endDate?: string;
  fullFeeAmount: number;
  discountPct: number;
  actualAmount: number;
  pickupAddress?: string;
  pickupPhone?: string;
  status: 'active' | 'suspended' | 'cancelled' | 'completed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionInput {
  subscriberType: SubscriberType;
  studentId?: string;
  subscriberName: string;
  routeId: string;
  academicYear: string;
  startDate: string;
  endDate?: string;
  fullFeeAmount: number;
  discountPct: number;
  actualAmount: number;
  pickupAddress?: string;
  pickupPhone?: string;
  notes?: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/me/Downloads/Project/untitled folder"
npx tsc --noEmit
```

Expected: No errors related to BusSubscription (other pre-existing errors are OK if any).

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(transport): update BusSubscription type to match new schema"
```

---

### Task 4: Update busStore to use API

**Files:**
- Modify: `src/stores/busStore.ts`

- [ ] **Step 1: Rewrite busStore.ts**

```typescript
import { getAuthHeaders } from './authStore';
import { create } from 'zustand';
import { toast } from 'sonner';
import type { BusRoute, BusSubscription, CreateSubscriptionInput } from '@/types';
import { generateId } from '@/lib/utils';

interface BusState {
  routes: BusRoute[];
  subscriptions: BusSubscription[];
  isLoading: boolean;
  isSubLoading: boolean;
  fetchRoutes: () => Promise<void>;
  fetchSubscriptions: (filters?: { routeId?: string; academicYear?: string }) => Promise<void>;
  addRoute: (route: Omit<BusRoute, 'id'>) => Promise<void>;
  updateRoute: (id: string, data: Partial<BusRoute>) => Promise<void>;
  addSubscription: (data: CreateSubscriptionInput) => Promise<BusSubscription | null>;
  cancelSubscription: (id: string) => Promise<void>;
  getRouteSubscribers: (routeId: string) => BusSubscription[];
  getStudentSubscription: (studentId: string) => BusSubscription | undefined;
}

export const useBusStore = create<BusState>()((set, get) => ({
  routes: [],
  subscriptions: [],
  isLoading: false,
  isSubLoading: false,

  fetchRoutes: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/bus-routes', { headers: getAuthHeaders() });
      const data = await res.json();
      set({ routes: data, isLoading: false });
    } catch {
      set({ isLoading: false });
      toast.error('فشل تحميل خطوط الباصات');
    }
  },

  fetchSubscriptions: async (filters = {}) => {
    set({ isSubLoading: true });
    try {
      const params = new URLSearchParams();
      if (filters.routeId) params.set('routeId', filters.routeId);
      if (filters.academicYear) params.set('academicYear', filters.academicYear);
      const res = await fetch(`/api/bus-subscriptions?${params}`, { headers: getAuthHeaders() });
      const data = await res.json();
      set({ subscriptions: data, isSubLoading: false });
    } catch {
      set({ isSubLoading: false });
    }
  },

  addRoute: async (route) => {
    try {
      const res = await fetch('/api/bus-routes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(route),
      });
      if (!res.ok) throw new Error();
      const newRoute = await res.json();
      set((s) => ({ routes: [...s.routes, newRoute] }));
    } catch {
      toast.error('فشل إضافة الخط');
    }
  },

  updateRoute: async (id, data) => {
    try {
      const res = await fetch(`/api/bus-routes/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      set((s) => ({ routes: s.routes.map((r) => (r.id === id ? updated : r)) }));
    } catch {
      toast.error('فشل تحديث بيانات الخط');
    }
  },

  addSubscription: async (data) => {
    try {
      const res = await fetch('/api/bus-subscriptions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const sub = await res.json();
      set((s) => ({ subscriptions: [sub, ...s.subscriptions] }));
      return sub;
    } catch {
      toast.error('فشل إنشاء الاشتراك');
      return null;
    }
  },

  cancelSubscription: async (id) => {
    try {
      await fetch(`/api/bus-subscriptions/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      set((s) => ({
        subscriptions: s.subscriptions.map((sub) =>
          sub.id === id ? { ...sub, status: 'cancelled' as const } : sub
        ),
      }));
    } catch {
      toast.error('فشل إلغاء الاشتراك');
    }
  },

  getRouteSubscribers: (routeId) =>
    get().subscriptions.filter((s) => s.routeId === routeId && s.status === 'active'),

  getStudentSubscription: (studentId) =>
    get().subscriptions.find((s) => s.studentId === studentId && s.status === 'active'),
}));
```

Note: Removed `persist` middleware since data is now in the DB. Also removed dependency on `mockBusSubscriptions` — the mock data will be seeded to DB in the next step.

- [ ] **Step 2: Remove mock subscription import from constants**

In `src/constants/mockData.ts`, the `mockBusSubscriptions` array can stay (it's used for seeding) but the busStore no longer imports it. Verify busStore compiles without it.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep busStore
```

Expected: No errors from busStore.ts

- [ ] **Step 4: Commit**

```bash
git add src/stores/busStore.ts
git commit -m "feat(transport): wire busStore subscriptions to API, remove localStorage persist"
```

---

### Task 5: Update BusManagement UI

**Files:**
- Modify: `src/pages/BusManagement.tsx`

- [ ] **Step 1: Replace BusManagement.tsx entirely**

The new version adds: subscriber type selector (student/employee/supervisor), automatic discount calculation, pickup address fields, academic year field, and loads subscriptions from API on mount.

```typescript
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Bus, MapPin, Phone, Users, Plus, X, Loader2, Edit } from 'lucide-react';
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
import type { SubscriberType } from '@/types';

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

  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);

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
  const [routeForm, setRouteForm] = useState({
    name: '', driverName: '', driverPhone: '', busNumber: '',
    capacity: 20, monthlyFee: 0, annualFee: 0, stops: [] as string[],
  });

  useEffect(() => {
    fetchRoutes();
    fetchSubscriptions({ academicYear: CURRENT_YEAR });
  }, [fetchRoutes, fetchSubscriptions]);

  // Auto-fill subscriber name when student selected
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

  // Fee calculation for subscription form
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

  const openEditDialog = (route: any) => {
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="عدد الخطوط" value={routes.length.toString()} icon={Bus} colorClass="teal" />
        <StatCard title="إجمالي المشتركين" value={activeSubscriptions.length.toString()} icon={Users} colorClass="sky" />
        <StatCard title="إيرادات الباصات" value={formatCurrency(totalBusRevenue)} icon={Bus} colorClass="emerald" />
      </div>

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
              {/* Subscriber Type */}
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

              {/* Subscriber identity */}
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

              {/* Route */}
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

              {/* Pickup Details */}
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

              {/* Fee Summary */}
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                          <p className="text-xs text-muted-foreground">{sub.pickupAddress}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {sub.subscriberType === 'student' ? 'طالب' : sub.subscriberType === 'employee' ? 'موظف' : 'مشرف'}
                          </Badge>
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
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep BusManagement
```

Expected: No errors from BusManagement.tsx.

- [ ] **Step 3: Run dev server and verify UI**

```bash
npm run dev
```

Open browser → Bus Management page. Verify:
1. Routes load from API
2. "اشتراك جديد" dialog shows subscriber type dropdown
3. Selecting "موظف" shows name field (not student dropdown)
4. Fee summary shows 50% discount for employee, 100% for supervisor
5. Submit creates subscription in DB

- [ ] **Step 4: Commit**

```bash
git add src/pages/BusManagement.tsx
git commit -m "feat(transport): Phase A complete — subscriptions persisted to DB with subscriber types"
```

---

## PHASE B — Rental Companies, Fleet & Contracts

### Task 6: Add Fleet Prisma Models

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add RentalCompany, RentalContract, Bus, ExternalDriver models**

Add after `BusSubscription` model in schema:

```prisma
model RentalCompany {
  id                     String            @id @default(uuid())
  code                   String            @unique
  nameAr                 String
  nameEn                 String?
  contactPerson          String?
  phone                  String?
  email                  String?
  address                String?
  taxId                  String?
  bankName               String?
  bankAccountNumber      String?
  notes                  String?
  isActive               Boolean           @default(true)
  createdAt              DateTime          @default(now())
  updatedAt              DateTime          @updatedAt
  contracts              RentalContract[]
  drivers                ExternalDriver[]
}

model RentalContract {
  id                   String          @id @default(uuid())
  companyId            String
  company              RentalCompany   @relation(fields: [companyId], references: [id])
  contractNumber       String          @unique
  title                String?
  startDate            DateTime
  endDate              DateTime
  monthlyFeePerBus     Decimal         @db.Decimal(12, 2)
  busesCount           Int
  includesDriver       Boolean         @default(true)
  includesFuel         Boolean         @default(true)
  includesMaintenance  Boolean         @default(true)
  includesInsurance    Boolean         @default(true)
  paymentFrequency     String          @default("monthly")
  paymentDueDay        Int?
  status               String          @default("active") // draft|active|expired|terminated
  notes                String?
  createdAt            DateTime        @default(now())
  updatedAt            DateTime        @updatedAt
  buses                Bus[]
}

model Bus {
  id                 String           @id @default(uuid())
  code               String           @unique
  plateNumber        String           @unique
  capacity           Int
  ownershipType      String           @default("rented_full") // rented_full|rented_no_driver|owned
  rentalContractId   String?
  rentalContract     RentalContract?  @relation(fields: [rentalContractId], references: [id])
  make               String?
  model              String?
  year               Int?
  color              String?
  status             String           @default("active") // active|maintenance|retired
  insuranceExpiry    DateTime?
  licenseExpiry      DateTime?
  notes              String?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt
}

model ExternalDriver {
  id                  String         @id @default(uuid())
  code                String         @unique
  fullName            String
  phone               String?
  companyId           String
  company             RentalCompany  @relation(fields: [companyId], references: [id])
  licenseNumber       String?
  licenseExpiry       DateTime?
  isActive            Boolean        @default(true)
  notes               String?
  createdAt           DateTime       @default(now())
}
```

- [ ] **Step 2: Run migration**

```bash
cd server
npx prisma migrate dev --name add_fleet_models
```

Expected: 4 new tables created.

- [ ] **Step 3: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat(transport): add RentalCompany, RentalContract, Bus, ExternalDriver models"
```

---

### Task 7: Add Fleet API Endpoints

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Add fleet API section after the subscription routes**

```typescript
// --- Rental Companies API ---
app.get('/api/rental-companies', requireAuth, async (req, res) => {
  try {
    const companies = await prisma.rentalCompany.findMany({
      where: { isActive: true },
      include: { _count: { select: { contracts: true, drivers: true } } },
      orderBy: { nameAr: 'asc' },
    });
    res.json(companies);
  } catch { res.status(500).json({ error: 'Failed to fetch companies' }); }
});

app.post('/api/rental-companies', requireAuth, async (req, res) => {
  try {
    const count = await prisma.rentalCompany.count();
    const code = `RC-${String(count + 1).padStart(3, '0')}`;
    const company = await prisma.rentalCompany.create({ data: { ...req.body, code } });
    res.json(company);
  } catch { res.status(500).json({ error: 'Failed to create company' }); }
});

app.patch('/api/rental-companies/:id', requireAuth, async (req, res) => {
  try {
    const company = await prisma.rentalCompany.update({ where: { id: req.params.id }, data: req.body });
    res.json(company);
  } catch { res.status(500).json({ error: 'Failed to update company' }); }
});

// --- Rental Contracts API ---
app.get('/api/rental-contracts', requireAuth, async (req, res) => {
  try {
    const contracts = await prisma.rentalContract.findMany({
      include: { company: true, _count: { select: { buses: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(contracts);
  } catch { res.status(500).json({ error: 'Failed to fetch contracts' }); }
});

app.post('/api/rental-contracts', requireAuth, async (req, res) => {
  try {
    const contract = await prisma.rentalContract.create({
      data: req.body,
      include: { company: true },
    });
    res.json(contract);
  } catch { res.status(500).json({ error: 'Failed to create contract' }); }
});

app.patch('/api/rental-contracts/:id', requireAuth, async (req, res) => {
  try {
    const contract = await prisma.rentalContract.update({
      where: { id: req.params.id },
      data: req.body,
      include: { company: true },
    });
    res.json(contract);
  } catch { res.status(500).json({ error: 'Failed to update contract' }); }
});

// --- Buses API ---
app.get('/api/buses', requireAuth, async (req, res) => {
  try {
    const buses = await prisma.bus.findMany({
      include: { rentalContract: { include: { company: true } } },
      orderBy: { code: 'asc' },
    });
    res.json(buses);
  } catch { res.status(500).json({ error: 'Failed to fetch buses' }); }
});

app.post('/api/buses', requireAuth, async (req, res) => {
  try {
    const count = await prisma.bus.count();
    const code = `BUS-${String(count + 1).padStart(3, '0')}`;
    const bus = await prisma.bus.create({
      data: { ...req.body, code },
      include: { rentalContract: { include: { company: true } } },
    });
    res.json(bus);
  } catch { res.status(500).json({ error: 'Failed to create bus' }); }
});

app.patch('/api/buses/:id', requireAuth, async (req, res) => {
  try {
    const bus = await prisma.bus.update({
      where: { id: req.params.id },
      data: req.body,
      include: { rentalContract: { include: { company: true } } },
    });
    res.json(bus);
  } catch { res.status(500).json({ error: 'Failed to update bus' }); }
});

// --- External Drivers API ---
app.get('/api/external-drivers', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.query as Record<string, string>;
    const drivers = await prisma.externalDriver.findMany({
      where: { isActive: true, ...(companyId ? { companyId } : {}) },
      include: { company: true },
      orderBy: { fullName: 'asc' },
    });
    res.json(drivers);
  } catch { res.status(500).json({ error: 'Failed to fetch drivers' }); }
});

app.post('/api/external-drivers', requireAuth, async (req, res) => {
  try {
    const count = await prisma.externalDriver.count();
    const code = `DRV-${String(count + 1).padStart(3, '0')}`;
    const driver = await prisma.externalDriver.create({
      data: { ...req.body, code },
      include: { company: true },
    });
    res.json(driver);
  } catch { res.status(500).json({ error: 'Failed to create driver' }); }
});
```

- [ ] **Step 2: Restart server and verify endpoints**

```bash
cd server && npm run dev
```

```bash
curl -s http://localhost:3001/api/rental-companies \
  -H "Authorization: Bearer <TOKEN>"
# Expected: []
curl -s http://localhost:3001/api/buses \
  -H "Authorization: Bearer <TOKEN>"
# Expected: []
```

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "feat(transport): add fleet CRUD API (companies, contracts, buses, drivers)"
```

---

### Task 8: Add Fleet Types and Transport Store

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/stores/transportStore.ts`

- [ ] **Step 1: Add fleet types to src/types/index.ts**

Add after the `BusSubscription` block:

```typescript
export interface RentalCompany {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  bankName?: string;
  bankAccountNumber?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  _count?: { contracts: number; drivers: number };
}

export interface RentalContract {
  id: string;
  companyId: string;
  company?: RentalCompany;
  contractNumber: string;
  title?: string;
  startDate: string;
  endDate: string;
  monthlyFeePerBus: number;
  busesCount: number;
  includesDriver: boolean;
  includesFuel: boolean;
  includesMaintenance: boolean;
  includesInsurance: boolean;
  paymentFrequency: string;
  paymentDueDay?: number;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  notes?: string;
  createdAt: string;
  _count?: { buses: number };
}

export interface FleetBus {
  id: string;
  code: string;
  plateNumber: string;
  capacity: number;
  ownershipType: 'rented_full' | 'rented_no_driver' | 'owned';
  rentalContractId?: string;
  rentalContract?: RentalContract;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  status: 'active' | 'maintenance' | 'retired';
  insuranceExpiry?: string;
  licenseExpiry?: string;
  notes?: string;
}

export interface ExternalDriver {
  id: string;
  code: string;
  fullName: string;
  phone?: string;
  companyId: string;
  company?: RentalCompany;
  licenseNumber?: string;
  licenseExpiry?: string;
  isActive: boolean;
  notes?: string;
}
```

- [ ] **Step 2: Create src/stores/transportStore.ts**

```typescript
import { create } from 'zustand';
import { toast } from 'sonner';
import { getAuthHeaders } from './authStore';
import type { RentalCompany, RentalContract, FleetBus, ExternalDriver } from '@/types';

interface TransportState {
  companies: RentalCompany[];
  contracts: RentalContract[];
  buses: FleetBus[];
  drivers: ExternalDriver[];
  isLoading: boolean;
  fetchAll: () => Promise<void>;
  addCompany: (data: Omit<RentalCompany, 'id' | 'code' | 'createdAt' | '_count'>) => Promise<void>;
  updateCompany: (id: string, data: Partial<RentalCompany>) => Promise<void>;
  addContract: (data: Omit<RentalContract, 'id' | 'createdAt' | '_count' | 'company'>) => Promise<void>;
  updateContract: (id: string, data: Partial<RentalContract>) => Promise<void>;
  addBus: (data: Omit<FleetBus, 'id' | 'code' | 'rentalContract'>) => Promise<void>;
  updateBus: (id: string, data: Partial<FleetBus>) => Promise<void>;
  addDriver: (data: Omit<ExternalDriver, 'id' | 'code' | 'company'>) => Promise<void>;
}

export const useTransportStore = create<TransportState>()((set, get) => ({
  companies: [],
  contracts: [],
  buses: [],
  drivers: [],
  isLoading: false,

  fetchAll: async () => {
    set({ isLoading: true });
    try {
      const [companies, contracts, buses, drivers] = await Promise.all([
        fetch('/api/rental-companies', { headers: getAuthHeaders() }).then((r) => r.json()),
        fetch('/api/rental-contracts', { headers: getAuthHeaders() }).then((r) => r.json()),
        fetch('/api/buses', { headers: getAuthHeaders() }).then((r) => r.json()),
        fetch('/api/external-drivers', { headers: getAuthHeaders() }).then((r) => r.json()),
      ]);
      set({ companies, contracts, buses, drivers, isLoading: false });
    } catch {
      set({ isLoading: false });
      toast.error('فشل تحميل بيانات الأسطول');
    }
  },

  addCompany: async (data) => {
    try {
      const res = await fetch('/api/rental-companies', {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const company = await res.json();
      set((s) => ({ companies: [...s.companies, company] }));
      toast.success('تم إضافة شركة التأجير');
    } catch { toast.error('فشل إضافة الشركة'); }
  },

  updateCompany: async (id, data) => {
    try {
      const res = await fetch(`/api/rental-companies/${id}`, {
        method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      set((s) => ({ companies: s.companies.map((c) => c.id === id ? updated : c) }));
    } catch { toast.error('فشل تحديث بيانات الشركة'); }
  },

  addContract: async (data) => {
    try {
      const res = await fetch('/api/rental-contracts', {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const contract = await res.json();
      set((s) => ({ contracts: [...s.contracts, contract] }));
      toast.success('تم إضافة العقد');
    } catch { toast.error('فشل إضافة العقد'); }
  },

  updateContract: async (id, data) => {
    try {
      const res = await fetch(`/api/rental-contracts/${id}`, {
        method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      set((s) => ({ contracts: s.contracts.map((c) => c.id === id ? updated : c) }));
    } catch { toast.error('فشل تحديث العقد'); }
  },

  addBus: async (data) => {
    try {
      const res = await fetch('/api/buses', {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const bus = await res.json();
      set((s) => ({ buses: [...s.buses, bus] }));
      toast.success(`تم إضافة الباص ${bus.code}`);
    } catch { toast.error('فشل إضافة الباص'); }
  },

  updateBus: async (id, data) => {
    try {
      const res = await fetch(`/api/buses/${id}`, {
        method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      set((s) => ({ buses: s.buses.map((b) => b.id === id ? updated : b) }));
    } catch { toast.error('فشل تحديث الباص'); }
  },

  addDriver: async (data) => {
    try {
      const res = await fetch('/api/external-drivers', {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const driver = await res.json();
      set((s) => ({ drivers: [...s.drivers, driver] }));
      toast.success('تم إضافة السائق');
    } catch { toast.error('فشل إضافة السائق'); }
  },
}));
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -E "transportStore|types"
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/stores/transportStore.ts
git commit -m "feat(transport): add fleet types and transportStore"
```

---

### Task 9: Add Fleet Tabs to BusManagement

**Files:**
- Modify: `src/pages/BusManagement.tsx`

- [ ] **Step 1: Add Tabs import and fleet sections**

Add to the top of BusManagement.tsx imports:

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, FileText, Car, UserCheck } from 'lucide-react';
import { useTransportStore } from '@/stores/transportStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
```

Add inside the component body (after existing state declarations):

```typescript
const {
  companies, contracts, buses, drivers, isLoading: isFleetLoading,
  fetchAll, addCompany, addContract, addBus, addDriver,
} = useTransportStore();

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

useEffect(() => { fetchAll(); }, [fetchAll]);
```

- [ ] **Step 2: Wrap existing JSX in Tabs, add Fleet/Companies/Contracts tabs**

Replace the `return (...)` block in BusManagement.tsx with:

```typescript
return (
  <div className="space-y-6">
    {/* Stats */}
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <StatCard title="عدد الخطوط" value={routes.length.toString()} icon={Bus} colorClass="teal" />
      <StatCard title="إجمالي المشتركين" value={activeSubscriptions.length.toString()} icon={Users} colorClass="sky" />
      <StatCard title="الباصات النشطة" value={buses.filter((b) => b.status === 'active').length.toString()} icon={Car} colorClass="violet" />
      <StatCard title="إيرادات الباصات" value={formatCurrency(totalBusRevenue)} icon={Bus} colorClass="emerald" />
    </div>

    <Tabs defaultValue="routes">
      <TabsList className="grid grid-cols-4 w-full max-w-xl">
        <TabsTrigger value="routes" className="gap-1.5"><Bus className="size-3.5" />الخطوط</TabsTrigger>
        <TabsTrigger value="fleet" className="gap-1.5"><Car className="size-3.5" />الأسطول</TabsTrigger>
        <TabsTrigger value="companies" className="gap-1.5"><Building2 className="size-3.5" />الشركات</TabsTrigger>
        <TabsTrigger value="contracts" className="gap-1.5"><FileText className="size-3.5" />العقود</TabsTrigger>
      </TabsList>

      {/* ─── ROUTES TAB ─── */}
      <TabsContent value="routes" className="mt-6">
        {/* [paste existing routes grid JSX here, including dialogs] */}
        {/* ...existing route + subscription dialogs and grid... */}
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
                  <Select value={contractForm.companyId} onValueChange={(v) => setContractForm({ ...contractForm, companyId: v })} required>
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
              {contracts.length === 0 ? (
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
    </Tabs>
  </div>
);
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep BusManagement
```

- [ ] **Step 3: Manual test in browser**

Open Bus Management. Verify:
1. Stats row shows 4 cards including "الباصات النشطة"
2. Tabs: الخطوط / الأسطول / الشركات / العقود — all navigate correctly
3. Add company dialog works
4. Add contract dialog shows company dropdown, calculates total
5. Add bus dialog shows active contracts in dropdown

- [ ] **Step 4: Commit**

```bash
git add src/pages/BusManagement.tsx
git commit -m "feat(transport): Phase B complete — fleet tabs (buses, companies, contracts)"
```

---

## PHASE C — Pro-Rata Financial Engine

### Task 10: Pro-Rata Calculator (TypeScript)

**Files:**
- Create: `src/lib/proRata.ts`

- [ ] **Step 1: Create src/lib/proRata.ts**

```typescript
export interface ProRataResult {
  monthsRemaining: number;
  totalMonths: number;
  proportion: number;
  previousRemaining: number;
  newRemaining: number;
  difference: number;
  direction: 'subscriber_pays' | 'school_refunds' | 'no_change';
}

const DEFAULT_ACADEMIC_MONTHS = 10;

function calculateMonthsRemaining(fromDate: Date, toDate: Date): number {
  if (fromDate >= toDate) return 0;
  let months = (toDate.getFullYear() - fromDate.getFullYear()) * 12
    + (toDate.getMonth() - fromDate.getMonth());
  if (fromDate.getDate() > toDate.getDate()) months -= 1;
  return Math.max(0, months);
}

export function calculateChangeDifference(params: {
  previousFullFee: number;
  previousDiscountPct: number;
  newFullFee: number;
  newDiscountPct: number;
  changeEffectiveDate: Date;
  academicYearEnd: Date;
  totalMonths?: number;
}): ProRataResult {
  const {
    previousFullFee, previousDiscountPct,
    newFullFee, newDiscountPct,
    changeEffectiveDate, academicYearEnd,
    totalMonths = DEFAULT_ACADEMIC_MONTHS,
  } = params;

  const previousNet = previousFullFee * (100 - previousDiscountPct) / 100;
  const newNet = newFullFee * (100 - newDiscountPct) / 100;

  const monthsRemaining = calculateMonthsRemaining(changeEffectiveDate, academicYearEnd);
  const proportion = totalMonths > 0 ? monthsRemaining / totalMonths : 0;

  const previousRemaining = Math.round(previousNet * proportion * 100) / 100;
  const newRemaining = Math.round(newNet * proportion * 100) / 100;
  const difference = Math.round((newRemaining - previousRemaining) * 100) / 100;

  return {
    monthsRemaining,
    totalMonths,
    proportion,
    previousRemaining,
    newRemaining,
    difference,
    direction: difference > 0 ? 'subscriber_pays' : difference < 0 ? 'school_refunds' : 'no_change',
  };
}

export function calculatePartialSubscription(params: {
  fullAnnualFee: number;
  discountPct: number;
  startDate: Date;
  academicYearEnd: Date;
  totalMonths?: number;
}): number {
  const { fullAnnualFee, discountPct, startDate, academicYearEnd, totalMonths = DEFAULT_ACADEMIC_MONTHS } = params;
  const netAnnual = fullAnnualFee * (100 - discountPct) / 100;
  const months = calculateMonthsRemaining(startDate, academicYearEnd);
  const proportion = totalMonths > 0 ? months / totalMonths : 0;
  return Math.round(netAnnual * proportion * 100) / 100;
}

export function calculateCancellationRefund(params: {
  netFeePaid: number;
  cancellationDate: Date;
  academicYearEnd: Date;
  cancellationFee?: number;
  totalMonths?: number;
}): number {
  const { netFeePaid, cancellationDate, academicYearEnd, cancellationFee = 0, totalMonths = DEFAULT_ACADEMIC_MONTHS } = params;
  const months = calculateMonthsRemaining(cancellationDate, academicYearEnd);
  const proportion = totalMonths > 0 ? months / totalMonths : 0;
  const refund = Math.round(netFeePaid * proportion * 100) / 100;
  return Math.max(0, refund - cancellationFee);
}
```

- [ ] **Step 2: Write tests for the calculator**

Create `src/__tests__/proRata.test.ts`:

```typescript
import {
  calculateChangeDifference,
  calculatePartialSubscription,
  calculateCancellationRefund,
} from '@/lib/proRata';

describe('ProRata Calculator', () => {
  const yearEnd = new Date('2027-06-30');

  test('route change — student pays additional 800 EGP', () => {
    const result = calculateChangeDifference({
      previousFullFee: 6000,
      previousDiscountPct: 0,
      newFullFee: 8000,
      newDiscountPct: 0,
      changeEffectiveDate: new Date('2027-02-15'),
      academicYearEnd: yearEnd,
    });
    expect(result.monthsRemaining).toBe(4);
    expect(result.proportion).toBeCloseTo(0.4);
    expect(result.previousRemaining).toBe(2400);
    expect(result.newRemaining).toBe(3200);
    expect(result.difference).toBe(800);
    expect(result.direction).toBe('subscriber_pays');
  });

  test('employee cancellation — 1800 EGP refund', () => {
    const refund = calculateCancellationRefund({
      netFeePaid: 3000,
      cancellationDate: new Date('2027-01-01'),
      academicYearEnd: yearEnd,
    });
    expect(refund).toBe(1800);
  });

  test('new student joins mid-year — 4800 EGP', () => {
    const fee = calculatePartialSubscription({
      fullAnnualFee: 6000,
      discountPct: 0,
      startDate: new Date('2026-11-01'),
      academicYearEnd: yearEnd,
    });
    expect(fee).toBe(4800);
  });

  test('supervisor always pays 0', () => {
    const fee = calculatePartialSubscription({
      fullAnnualFee: 6000,
      discountPct: 100,
      startDate: new Date('2026-11-01'),
      academicYearEnd: yearEnd,
    });
    expect(fee).toBe(0);
  });

  test('no months remaining returns 0', () => {
    const result = calculateChangeDifference({
      previousFullFee: 6000,
      previousDiscountPct: 0,
      newFullFee: 8000,
      newDiscountPct: 0,
      changeEffectiveDate: new Date('2027-07-01'),
      academicYearEnd: yearEnd,
    });
    expect(result.monthsRemaining).toBe(0);
    expect(result.difference).toBe(0);
    expect(result.direction).toBe('no_change');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/__tests__/proRata.test.ts
```

Expected: All 5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/proRata.ts src/__tests__/proRata.test.ts
git commit -m "feat(transport): add pro-rata calculator with tests (all examples from spec pass)"
```

---

### Task 11: Subscription Change Models + API

**Files:**
- Modify: `server/prisma/schema.prisma`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Add SubscriptionChange and RentalInvoice models**

Add to schema.prisma:

```prisma
model SubscriptionChange {
  id                   String          @id @default(uuid())
  subscriptionId       String
  subscription         BusSubscription @relation(fields: [subscriptionId], references: [id])
  changeType           String          // route_change|cancel|suspend|reactivate
  changeDate           DateTime        @default(now())
  effectiveDate        DateTime
  previousRouteId      String?
  newRouteId           String?
  previousFullFee      Decimal?        @db.Decimal(12, 2)
  newFullFee           Decimal?        @db.Decimal(12, 2)
  monthsRemaining      Int?
  previousRemaining    Decimal?        @db.Decimal(12, 2)
  newRemaining         Decimal?        @db.Decimal(12, 2)
  proRataDifference    Decimal?        @db.Decimal(12, 2)
  direction            String?         // subscriber_pays|school_refunds|no_change
  changeReason         String?
  status               String          @default("pending") // pending|approved|applied|cancelled
  notes                String?
  createdAt            DateTime        @default(now())
  createdBy            String?
}

model RentalInvoice {
  id                   String          @id @default(uuid())
  code                 String          @unique
  contractId           String
  contract             RentalContract  @relation(fields: [contractId], references: [id])
  invoiceDate          DateTime
  periodFrom           DateTime
  periodTo             DateTime
  baseAmount           Decimal         @db.Decimal(12, 2)
  discountAmount       Decimal         @default(0) @db.Decimal(12, 2)
  taxAmount            Decimal         @default(0) @db.Decimal(12, 2)
  totalAmount          Decimal         @db.Decimal(12, 2)
  status               String          @default("pending_review") // pending_review|approved|paid|disputed
  paymentDate          DateTime?
  notes                String?
  attachmentUrl        String?
  createdAt            DateTime        @default(now())
  updatedAt            DateTime        @updatedAt
}
```

Also add relations to existing models:

```prisma
// In BusSubscription, add:
  changes   SubscriptionChange[]

// In RentalContract, add:
  invoices  RentalInvoice[]
```

- [ ] **Step 2: Run migration**

```bash
cd server
npx prisma migrate dev --name add_subscription_changes_and_invoices
```

Expected: 2 new tables created.

- [ ] **Step 3: Add Subscription Change API**

Add to `server/src/index.ts` after rental invoices section:

```typescript
// --- Subscription Changes API ---
app.get('/api/subscription-changes', requireAuth, async (req, res) => {
  try {
    const changes = await (prisma as any).subscriptionChange.findMany({
      include: { subscription: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(changes);
  } catch { res.status(500).json({ error: 'Failed to fetch changes' }); }
});

app.post('/api/subscription-changes', requireAuth, async (req, res) => {
  try {
    const { subscriptionId, changeType, effectiveDate, newRouteId, changeReason, proRataData } = req.body;
    
    const sub = await prisma.busSubscription.findUnique({
      where: { id: subscriptionId },
      include: { route: true },
    });
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    const change = await (prisma as any).subscriptionChange.create({
      data: {
        subscriptionId,
        changeType,
        effectiveDate: new Date(effectiveDate),
        previousRouteId: sub.routeId,
        newRouteId: newRouteId || null,
        previousFullFee: sub.fullFeeAmount,
        newFullFee: proRataData?.newFullFee || null,
        monthsRemaining: proRataData?.monthsRemaining || null,
        previousRemaining: proRataData?.previousRemaining || null,
        newRemaining: proRataData?.newRemaining || null,
        proRataDifference: proRataData?.difference || null,
        direction: proRataData?.direction || null,
        changeReason,
        status: 'pending',
        createdBy: req.user?.userId,
      },
    });

    // Apply cancellation immediately
    if (changeType === 'cancel') {
      await prisma.busSubscription.update({
        where: { id: subscriptionId },
        data: { status: 'cancelled', endDate: new Date(effectiveDate) },
      });
    }

    res.json(change);
  } catch (error) {
    console.error('Create change error:', error);
    res.status(500).json({ error: 'Failed to create change request' });
  }
});

// --- Rental Invoices API ---
async function generateInvoiceCode(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await (prisma as any).rentalInvoice.count();
  return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
}

app.get('/api/rental-invoices', requireAuth, async (req, res) => {
  try {
    const invoices = await (prisma as any).rentalInvoice.findMany({
      include: { contract: { include: { company: true } } },
      orderBy: { invoiceDate: 'desc' },
    });
    res.json(invoices);
  } catch { res.status(500).json({ error: 'Failed to fetch invoices' }); }
});

app.post('/api/rental-invoices', requireAuth, async (req, res) => {
  try {
    const code = await generateInvoiceCode();
    const invoice = await (prisma as any).rentalInvoice.create({
      data: { ...req.body, code },
      include: { contract: { include: { company: true } } },
    });
    res.json(invoice);
  } catch { res.status(500).json({ error: 'Failed to create invoice' }); }
});

app.patch('/api/rental-invoices/:id', requireAuth, async (req, res) => {
  try {
    const invoice = await (prisma as any).rentalInvoice.update({
      where: { id: req.params.id },
      data: req.body,
      include: { contract: { include: { company: true } } },
    });
    res.json(invoice);
  } catch { res.status(500).json({ error: 'Failed to update invoice' }); }
});
```

- [ ] **Step 4: Restart server and verify new endpoints work**

```bash
curl -s http://localhost:3001/api/subscription-changes -H "Authorization: Bearer <TOKEN>"
# Expected: []
curl -s http://localhost:3001/api/rental-invoices -H "Authorization: Bearer <TOKEN>"
# Expected: []
```

- [ ] **Step 5: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/ server/src/index.ts
git commit -m "feat(transport): add SubscriptionChange and RentalInvoice models + API"
```

---

### Task 12: Subscription Change UI + Rental Invoices Tab

**Files:**
- Modify: `src/pages/BusManagement.tsx`

- [ ] **Step 1: Add a 5th tab "التغييرات والفواتير" to BusManagement**

Add to the imports at top:

```typescript
import { calculateChangeDifference, calculateCancellationRefund } from '@/lib/proRata';
import { ArrowLeftRight, Receipt } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
```

Add state inside the component:

```typescript
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

// Load invoices
useEffect(() => {
  fetch('/api/rental-invoices', { headers: getAuthHeaders() })
    .then((r) => r.json())
    .then(setInvoices)
    .catch(() => {});
}, []);
```

Add the Change Subscription dialog component before the closing `</div>` of the return:

```typescript
{/* Change Subscription Dialog */}
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
            previousFullFee: selectedSubForChange.fullFeeAmount,
            previousDiscountPct: selectedSubForChange.discountPct,
            newFullFee: selectedNewRoute.annualFee,
            newDiscountPct: selectedSubForChange.discountPct,
            changeEffectiveDate: new Date(changeForm.effectiveDate),
            academicYearEnd: ACADEMIC_YEAR_END,
          })
        : changeType === 'cancel'
        ? { difference: -calculateCancellationRefund({
              netFeePaid: selectedSubForChange.actualAmount,
              cancellationDate: new Date(changeForm.effectiveDate),
              academicYearEnd: ACADEMIC_YEAR_END,
            }), direction: 'school_refunds' as const, monthsRemaining: 0, proportion: 0,
            previousRemaining: 0, newRemaining: 0, totalMonths: 10 }
        : null;

      return (
        <div className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p>الخط الحالي: <strong>{selectedSubForChange.route?.name || '—'}</strong></p>
            <p>الرسوم المدفوعة: <strong>{formatCurrency(selectedSubForChange.actualAmount)}</strong></p>
          </div>

          <div className="space-y-2">
            <Label>نوع التغيير</Label>
            <Select value={changeType} onValueChange={(v) => setChangeType(v as any)}>
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
                    <SelectItem key={r.id} value={r.id}>{r.name} — {formatCurrency(r.annualFee)}</SelectItem>
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
                const res = await fetch('/api/subscription-changes', {
                  method: 'POST',
                  headers: getAuthHeaders(),
                  body: JSON.stringify({
                    subscriptionId: selectedSubForChange.id,
                    changeType,
                    effectiveDate: changeForm.effectiveDate,
                    newRouteId: changeForm.newRouteId || null,
                    changeReason: changeForm.reason,
                    proRataData: proRata,
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
```

Add a 5th tab `invoices` to the TabsList:

```tsx
<TabsTrigger value="invoices" className="gap-1.5"><Receipt className="size-3.5" />الفواتير</TabsTrigger>
```

Change the grid to `grid-cols-5`:
```tsx
<TabsList className="grid grid-cols-5 w-full max-w-2xl">
```

Add the TabsContent:

```tsx
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
                      setInvoices((prev) => prev.map((i) => i.id === inv.id ? updated : i));
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
```

Also add a "تغيير" button in the subscriber list inside the route detail panel, alongside the existing cancel button:

```tsx
// In the subscriber map inside route detail panel, replace the buttons div:
<div className="flex items-center gap-1">
  <button
    onClick={() => { setSelectedSubForChange(sub); setChangeDialogOpen(true); }}
    className="text-blue-500 hover:text-blue-700 text-xs px-1"
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
```

- [ ] **Step 2: Add `getAuthHeaders` import to BusManagement.tsx**

```typescript
import { getAuthHeaders } from '@/stores/authStore';
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep BusManagement
```

Expected: No errors.

- [ ] **Step 4: Manual test in browser**

1. Open Bus Management → route detail panel → click the `↔` icon on a subscriber
2. Select "تغيير الخط", pick a route with higher fee, set effective date
3. Verify pro-rata calculation shows correct breakdown
4. Submit — toast "تم تسجيل التغيير بنجاح" 
5. Try "إلغاء الاشتراك" — subscription disappears from list
6. Open "الفواتير" tab → add a rental invoice → click "اعتماد"

- [ ] **Step 5: Commit**

```bash
git add src/pages/BusManagement.tsx src/stores/transportStore.ts
git commit -m "feat(transport): Phase C complete — pro-rata change dialog, rental invoices tab"
```

---

## Self-Review

### Spec Coverage

| Spec Section | Covered | Task |
|---|---|---|
| Subscription CRUD to DB | ✅ | Tasks 1–5 |
| subscriber_type (student/employee/supervisor) | ✅ | Tasks 3–5 |
| Discount tiers (0%/50%/100%) | ✅ | Task 5 |
| Pickup address fields | ✅ | Task 5 |
| Pro-rata: change | ✅ | Tasks 10–12 |
| Pro-rata: partial subscription | ✅ | Task 10 |
| Pro-rata: cancellation | ✅ | Tasks 10–12 |
| Rental companies CRUD | ✅ | Tasks 6–9 |
| Rental contracts CRUD | ✅ | Tasks 6–9 |
| Bus fleet management | ✅ | Tasks 6–9 |
| External drivers | ✅ | Tasks 6–8 |
| Rental invoice management | ✅ | Tasks 11–12 |
| Subscription change workflow | ✅ (simplified) | Tasks 11–12 |
| Approval workflows (W-025 to W-031) | ❌ | Deferred — needs approval engine |
| Bus daily operations | ❌ | Phase 2 per spec |
| Profitability per-bus report | ❌ | Phase 2 per spec |
| Real-time GPS tracking | ❌ | Phase 3 per spec |
| HR payroll integration | ❌ | Needs HR module |

### Deferred Items

- **Approval workflows**: The spec references W-025–W-031 in `07_APPROVAL_WORKFLOWS.md`. These require a workflow engine that doesn't exist yet. For now, subscription creation goes straight to "active". Add approval when the workflow engine is built.
- **Profitability reports**: Requires aggregating subscription revenue vs. rental costs by bus. Add as a "تقرير الربحية" tab in Phase 2.
- **Payroll deduction for employees**: Requires HR module integration. The subscription is created but no deduction is registered.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-23-transport-module-overhaul.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks

**2. Inline Execution** — Execute tasks in this session using executing-plans

**Which approach?**
