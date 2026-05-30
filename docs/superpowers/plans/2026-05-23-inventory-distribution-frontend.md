# Inventory Distribution System — Frontend Plan (C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the frontend stores and screens for the student inventory distribution system — Grade Item Lists management, Delivery Orders workflow, Distribution Reports, and a new Student Detail tab.

**Architecture:** Three new Zustand stores (no `persist` middleware), four new pages, two existing file modifications. All data fetched from API on mount — no localStorage caching. Frontend is display-only; all business logic lives in the API (Plan B).

**Tech Stack:** React + TypeScript, Zustand (no persist), TailwindCSS + shadcn/ui, React Router

**Prerequisite:** Plan B (`2026-05-23-inventory-distribution-backend.md`) must be complete — all API endpoints must be running.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/types/index.ts` | Modify | Add GradeItemList, DeliveryOrder types |
| `src/stores/gradeItemListStore.ts` | Create | Fetch/mutate grade item lists (no persist) |
| `src/stores/deliveryOrderStore.ts` | Create | Fetch/mutate delivery orders (no persist) |
| `src/pages/GradeItemLists.tsx` | Create | Admin: define items per grade/term |
| `src/pages/DeliveryOrders.tsx` | Create | Accounting + Warehouse workflow screen |
| `src/pages/InventoryDistribution.tsx` | Create | Distribution reports + deficit + purchase trigger |
| `src/pages/StudentDetail.tsx` | Modify | Add "ما تم استلامه" tab |
| `src/App.tsx` | Modify | Register 3 new lazy routes |
| `src/components/layout/Sidebar.tsx` | Modify | Add 3 new nav items under المخازن والمشتريات |

---

## Task 1: Add TypeScript Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Append new types at the end of `src/types/index.ts`**

Open `src/types/index.ts` and append after the last type:

```typescript
// ========================
// Inventory Distribution
// ========================

export interface GradeItemListEntry {
  id: string;
  listId: string;
  inventoryItemId: string;
  inventoryItem?: {
    id: string;
    name: string;
    unit: string;
    category: string;
    quantity: number;
    grade?: string;
    unitPrice: number;
  };
  quantity: number;
  preferredSupplierId?: string;
  preferredSupplier?: { id: string; name: string };
  notes?: string;
  createdAt: string;
}

export interface GradeItemList {
  id: string;
  stage: string;
  grade: string;
  track: string;
  academicYear: string;
  term: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  entries: GradeItemListEntry[];
}

export type DeliveryOrderStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled';
export type DeliveryChargeType = 'within_fees' | 'external';

export interface DeliveryOrderItem {
  id: string;
  orderId: string;
  inventoryItemId: string;
  inventoryItem?: { id: string; name: string; unit: string; grade?: string; quantity: number };
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  deliveredAt?: string;
  returnedAt?: string;
  returnNotes?: string;
  createdAt: string;
}

export interface DeliveryOrder {
  id: string;
  code: string;
  studentId: string;
  student?: { id: string; name: string; stage: string; grade: string; track: string };
  academicYear: string;
  term: string;
  status: DeliveryOrderStatus;
  chargeType: DeliveryChargeType;
  requestedBy: string;
  confirmedBy?: string;
  deliveredBy?: string;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: DeliveryOrderItem[];
}

export interface DistributionItemStat {
  inventoryItemId: string;
  itemName: string;
  unit: string;
  quantityPerStudent: number;
  preferredSupplierId?: string;
  required: number;
  currentStock: number;
  delivered: number;
  deficit: number;
  needsPurchase: boolean;
}

export interface GradeDistributionSummary {
  listId: string;
  stage: string;
  grade: string;
  track: string;
  term: string;
  studentCount: number;
  items: DistributionItemStat[];
}

export interface StudentDeliveryStatus {
  studentId: string;
  studentName: string;
  status: 'delivered' | 'in_progress' | 'not_started';
  receivedItems: Array<{
    itemName: string;
    inventoryItemId: string;
    quantity: number;
    deliveredAt: string;
    orderCode: string;
  }>;
  pendingOrdersCount: number;
  confirmedOrdersCount: number;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add GradeItemList, DeliveryOrder, distribution report types"
```

---

## Task 2: Grade Item List Store

**Files:**
- Create: `src/stores/gradeItemListStore.ts`

No `persist` — data always fetched fresh from API.

- [ ] **Step 1: Create the store**

Create `src/stores/gradeItemListStore.ts`:

```typescript
import { create } from 'zustand';
import { getAuthHeaders } from './authStore';
import type { GradeItemList } from '@/types';

interface GradeItemListState {
  lists: GradeItemList[];
  loading: boolean;

  fetchLists: (params?: { academicYear?: string; term?: string; stage?: string; grade?: string }) => Promise<void>;
  createList: (data: {
    stage: string; grade: string; track: string;
    academicYear: string; term: string;
    entries: Array<{ inventoryItemId: string; quantity: number; preferredSupplierId?: string; notes?: string }>;
  }) => Promise<GradeItemList | null>;
  updateEntries: (listId: string, entries: Array<{ inventoryItemId: string; quantity: number; preferredSupplierId?: string; notes?: string }>) => Promise<boolean>;
  deleteList: (listId: string) => Promise<boolean>;
}

export const useGradeItemListStore = create<GradeItemListState>((set) => ({
  lists: [],
  loading: false,

  fetchLists: async (params = {}) => {
    set({ loading: true });
    try {
      const query = new URLSearchParams(params as Record<string, string>).toString();
      const res = await fetch(`/api/grade-item-lists${query ? `?${query}` : ''}`, { headers: getAuthHeaders() });
      const data = await res.json();
      set({ lists: Array.isArray(data) ? data : [] });
    } catch (err) {
      console.error('fetchLists error', err);
    } finally {
      set({ loading: false });
    }
  },

  createList: async (data) => {
    try {
      const res = await fetch('/api/grade-item-lists', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل الإنشاء');
      }
      const created: GradeItemList = await res.json();
      set((state) => ({ lists: [created, ...state.lists] }));
      return created;
    } catch (err: any) {
      console.error('createList error', err);
      throw err;
    }
  },

  updateEntries: async (listId, entries) => {
    try {
      const res = await fetch(`/api/grade-item-lists/${listId}/entries`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ entries })
      });
      if (!res.ok) return false;
      const updated: GradeItemList = await res.json();
      set((state) => ({ lists: state.lists.map(l => l.id === listId ? updated : l) }));
      return true;
    } catch {
      return false;
    }
  },

  deleteList: async (listId) => {
    try {
      const res = await fetch(`/api/grade-item-lists/${listId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) return false;
      set((state) => ({ lists: state.lists.filter(l => l.id !== listId) }));
      return true;
    } catch {
      return false;
    }
  }
}));
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/stores/gradeItemListStore.ts
git commit -m "feat(store): add gradeItemListStore — no persist, API-backed"
```

---

## Task 3: Delivery Order Store

**Files:**
- Create: `src/stores/deliveryOrderStore.ts`

No `persist` — operational data, always fresh from server.

- [ ] **Step 1: Create the store**

Create `src/stores/deliveryOrderStore.ts`:

```typescript
import { create } from 'zustand';
import { getAuthHeaders } from './authStore';
import type { DeliveryOrder } from '@/types';

interface DeliveryOrderState {
  orders: DeliveryOrder[];
  loading: boolean;

  fetchOrders: (params?: { status?: string; studentId?: string; academicYear?: string; term?: string }) => Promise<void>;
  createOrder: (data: {
    studentId: string; academicYear: string; term: string;
    chargeType: 'within_fees' | 'external'; notes?: string;
    items: Array<{ inventoryItemId: string; itemName: string; quantity: number; unitPrice: number }>;
  }) => Promise<DeliveryOrder | null>;
  confirmOrder: (orderId: string) => Promise<boolean>;
  deliverOrder: (orderId: string) => Promise<boolean>;
  returnItem: (orderId: string, itemId: string, returnNotes?: string) => Promise<boolean>;
  cancelOrder: (orderId: string) => Promise<boolean>;
}

export const useDeliveryOrderStore = create<DeliveryOrderState>((set, get) => ({
  orders: [],
  loading: false,

  fetchOrders: async (params = {}) => {
    set({ loading: true });
    try {
      const query = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<string, string>
      ).toString();
      const res = await fetch(`/api/delivery-orders${query ? `?${query}` : ''}`, { headers: getAuthHeaders() });
      const data = await res.json();
      set({ orders: Array.isArray(data) ? data : [] });
    } catch (err) {
      console.error('fetchOrders error', err);
    } finally {
      set({ loading: false });
    }
  },

  createOrder: async (data) => {
    try {
      const res = await fetch('/api/delivery-orders', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل الإنشاء');
      }
      const created: DeliveryOrder = await res.json();
      set((state) => ({ orders: [created, ...state.orders] }));
      return created;
    } catch (err: any) {
      console.error('createOrder error', err);
      throw err;
    }
  },

  confirmOrder: async (orderId) => {
    try {
      const res = await fetch(`/api/delivery-orders/${orderId}/confirm`, {
        method: 'PATCH', headers: getAuthHeaders()
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      await get().fetchOrders();
      return true;
    } catch (err: any) {
      throw err;
    }
  },

  deliverOrder: async (orderId) => {
    try {
      const res = await fetch(`/api/delivery-orders/${orderId}/deliver`, {
        method: 'PATCH', headers: getAuthHeaders()
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      await get().fetchOrders();
      return true;
    } catch (err: any) {
      throw err;
    }
  },

  returnItem: async (orderId, itemId, returnNotes) => {
    try {
      const res = await fetch(`/api/delivery-orders/${orderId}/return/${itemId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ returnNotes })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      await get().fetchOrders();
      return true;
    } catch (err: any) {
      throw err;
    }
  },

  cancelOrder: async (orderId) => {
    try {
      const res = await fetch(`/api/delivery-orders/${orderId}`, {
        method: 'DELETE', headers: getAuthHeaders()
      });
      if (!res.ok) return false;
      set((state) => ({ orders: state.orders.filter(o => o.id !== orderId) }));
      return true;
    } catch {
      return false;
    }
  }
}));
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/stores/deliveryOrderStore.ts
git commit -m "feat(store): add deliveryOrderStore — no persist, full workflow actions"
```

---

## Task 4: Grade Item Lists Page

**Files:**
- Create: `src/pages/GradeItemLists.tsx`

Admin screen to define what items each grade/term needs. Uses `useGradeItemListStore` and `useInventoryStore` (for item picker).

- [ ] **Step 1: Create the page**

Create `src/pages/GradeItemLists.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Settings, BookOpen, Pencil } from 'lucide-react';
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
import { formatCurrency } from '@/lib/utils';
import StatCard from '@/components/features/StatCard';
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

  const [selectedYear, setSelectedYear] = useState(activeAcademicYear);
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingList, setEditingList] = useState<GradeItemList | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // New list form
  const [formStage, setFormStage] = useState('');
  const [formGrade, setFormGrade] = useState('');
  const [formTrack, setFormTrack] = useState('local');
  const [formEntries, setFormEntries] = useState<Array<{ inventoryItemId: string; quantity: number; preferredSupplierId?: string; notes?: string }>>([]);

  useEffect(() => {
    fetchLists({ academicYear: selectedYear, term: selectedTerm });
    fetchItems();
    fetchSuppliers();
  }, [selectedYear, selectedTerm]);

  const addEntryRow = () => {
    setFormEntries([...formEntries, { inventoryItemId: '', quantity: 1 }]);
  };

  const removeEntryRow = (idx: number) => {
    setFormEntries(formEntries.filter((_, i) => i !== idx));
  };

  const updateEntryRow = (idx: number, field: string, value: any) => {
    const updated = [...formEntries];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormEntries(updated);
  };

  const resetForm = () => {
    setFormStage(''); setFormGrade(''); setFormTrack('local'); setFormEntries([]);
  };

  const handleCreate = async () => {
    if (!formStage || !formGrade) { toast.error('المرحلة والصف مطلوبان'); return; }
    const validEntries = formEntries.filter(e => e.inventoryItemId && e.quantity > 0);
    if (validEntries.length === 0) { toast.error('أضف صنفاً واحداً على الأقل'); return; }
    try {
      await createList({ stage: formStage, grade: formGrade, track: formTrack, academicYear: selectedYear, term: selectedTerm, entries: validEntries });
      toast.success('تم إنشاء القائمة');
      setCreateOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'فشل الإنشاء');
    }
  };

  const handleUpdateEntries = async () => {
    if (!editingList) return;
    const validEntries = formEntries.filter(e => e.inventoryItemId && e.quantity > 0);
    if (validEntries.length === 0) { toast.error('أضف صنفاً واحداً على الأقل'); return; }
    const ok = await updateEntries(editingList.id, validEntries);
    if (ok) { toast.success('تم تحديث القائمة'); setEditingList(null); }
    else toast.error('فشل التحديث');
  };

  const openEdit = (list: GradeItemList) => {
    setEditingList(list);
    setFormEntries(list.entries.map(e => ({
      inventoryItemId: e.inventoryItemId,
      quantity: e.quantity,
      preferredSupplierId: e.preferredSupplierId,
      notes: e.notes
    })));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const ok = await deleteList(deleteId);
    if (ok) toast.success('تم الحذف');
    else toast.error('فشل الحذف');
    setDeleteId(null);
  };

  const EntryEditor = () => (
    <div className="space-y-3">
      {formEntries.map((entry, idx) => (
        <div key={idx} className="grid grid-cols-12 gap-2 items-end border rounded p-2 bg-muted/20">
          <div className="col-span-5 space-y-1">
            <Label className="text-xs">الصنف</Label>
            <Select value={entry.inventoryItemId} onValueChange={(v) => updateEntryRow(idx, 'inventoryItemId', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختر صنف" /></SelectTrigger>
              <SelectContent>{inventoryItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">الكمية</Label>
            <Input type="number" min={1} className="h-8 text-xs" value={entry.quantity} onChange={(e) => updateEntryRow(idx, 'quantity', Number(e.target.value))} />
          </div>
          <div className="col-span-4 space-y-1">
            <Label className="text-xs">المورد المفضل (اختياري)</Label>
            <Select value={entry.preferredSupplierId || ''} onValueChange={(v) => updateEntryRow(idx, 'preferredSupplierId', v || undefined)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="أي مورد" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">أي مورد</SelectItem>
                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="icon" className="col-span-1 h-8 text-red-600" onClick={() => removeEntryRow(idx)}>
            <Trash2 className="size-3" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addEntryRow} className="w-full">
        <Plus className="size-3 ml-1" /> إضافة صنف
      </Button>
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
          <DialogTrigger asChild>
            <Button><Plus className="size-4 ml-2" />قائمة جديدة</Button>
          </DialogTrigger>
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

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['2025-2026', '2026-2027', '2024-2025'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedTerm} onValueChange={setSelectedTerm}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{TERMS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-muted-foreground col-span-3">جاري التحميل...</p>
        ) : lists.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            <BookOpen className="size-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد قوائم لهذا الترم — ابدأ بإنشاء واحدة</p>
          </div>
        ) : (
          lists.map(list => (
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
                    <span className="text-muted-foreground">{e.quantity} {e.inventoryItem?.unit || 'وحدة'}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{list.entries.length} صنف</p>
            </div>
          ))
        )}
      </div>

      {/* Edit Dialog */}
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

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>حذف القائمة؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف قائمة المستلزمات وجميع أصنافها. لا يمكن التراجع.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600">حذف</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/GradeItemLists.tsx
git commit -m "feat(ui): add GradeItemLists page — define items per grade/term"
```

---

## Task 5: Delivery Orders Page

**Files:**
- Create: `src/pages/DeliveryOrders.tsx`

Dual-role screen: Accounting creates orders; Warehouse confirms and delivers. Tabs by status.

- [ ] **Step 1: Create the page**

Create `src/pages/DeliveryOrders.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, CheckCircle, Package, RotateCcw, Loader2 } from 'lucide-react';
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
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [returnDialog, setReturnDialog] = useState<{ orderId: string; itemId: string; itemName: string } | null>(null);
  const [returnNotes, setReturnNotes] = useState('');

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [formStudentId, setFormStudentId] = useState('');
  const [formTerm, setFormTerm] = useState('1');
  const [formChargeType, setFormChargeType] = useState<'within_fees' | 'external'>('within_fees');
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<Array<{ inventoryItemId: string; itemName: string; quantity: number; unitPrice: number }>>([]);

  const isWarehouse = ['warehouse_keeper', 'system_admin', 'school_director'].includes(user?.role || '');
  const isAccounting = ['accountant', 'head_accountant', 'system_admin', 'school_director'].includes(user?.role || '');

  useEffect(() => {
    fetchOrders({ academicYear: activeAcademicYear });
  }, [activeAcademicYear]);

  const filtered = activeTab === 'all' ? orders : orders.filter(o => o.status === activeTab);

  const addItem = () => setFormItems([...formItems, { inventoryItemId: '', itemName: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => setFormItems(formItems.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: any) => {
    const updated = [...formItems];
    if (field === 'inventoryItemId') {
      const inv = inventoryItems.find(x => x.id === value);
      updated[i] = { ...updated[i], inventoryItemId: value, itemName: inv?.name || '', unitPrice: inv?.unitPrice || 0 };
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
    try {
      await confirmOrder(id);
      toast.success('تم تأكيد الطلب');
    } catch (err: any) { toast.error(err.message || 'فشل التأكيد'); }
    finally { setSubmitting(null); }
  };

  const handleDeliver = async (id: string) => {
    setSubmitting(id);
    try {
      await deliverOrder(id);
      toast.success('تم تسجيل التسليم');
    } catch (err: any) { toast.error(err.message || 'فشل التسليم'); }
    finally { setSubmitting(null); }
  };

  const handleReturn = async () => {
    if (!returnDialog) return;
    setSubmitting(returnDialog.orderId);
    try {
      await returnItem(returnDialog.orderId, returnDialog.itemId, returnNotes);
      toast.success('تم تسجيل الإرجاع');
      setReturnDialog(null);
      setReturnNotes('');
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
            <p className="text-xs text-muted-foreground">{order.chargeType === 'external' ? '💰 خارجي' : '📋 ضمن المصاريف'}</p>
            <p className="font-semibold">{formatCurrency(order.totalAmount)}</p>
          </div>
          <div className="flex gap-2">
            {order.status === 'pending' && isWarehouse && (
              <Button size="sm" variant="outline" disabled={submitting === order.id} onClick={() => handleConfirm(order.id)}>
                {submitting === order.id ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle className="size-3 ml-1" />}
                تأكيد
              </Button>
            )}
            {order.status === 'confirmed' && isWarehouse && (
              <Button size="sm" disabled={submitting === order.id} onClick={() => handleDeliver(order.id)}>
                {submitting === order.id ? <Loader2 className="size-3 animate-spin" /> : <Package className="size-3 ml-1" />}
                تسليم
              </Button>
            )}
            {order.status === 'pending' && isAccounting && (
              <Button size="sm" variant="ghost" className="text-red-600" disabled={submitting === order.id}
                onClick={() => cancelOrder(order.id).then(() => toast.success('تم الإلغاء'))}>
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
                    <SelectTrigger><SelectValue placeholder="ابحث عن الطالب" /></SelectTrigger>
                    <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — صف {s.grade}</SelectItem>)}</SelectContent>
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
                    <Select value={formChargeType} onValueChange={(v: any) => setFormChargeType(v)}>
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
                          <SelectContent>{inventoryItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
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
                <div className="space-y-1"><Label>ملاحظات (اختياري)</Label><Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} /></div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>إلغاء</Button>
                  <Button onClick={handleCreate} disabled={creating}>{creating ? 'جاري...' : 'إنشاء'}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList>
          <TabsTrigger value="all">الكل ({orders.length})</TabsTrigger>
          <TabsTrigger value="pending">معلق ({orders.filter(o => o.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="confirmed">مؤكد ({orders.filter(o => o.status === 'confirmed').length})</TabsTrigger>
          <TabsTrigger value="delivered">مُسلَّم ({orders.filter(o => o.status === 'delivered').length})</TabsTrigger>
        </TabsList>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 py-16 flex justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="col-span-3 text-center py-12 text-muted-foreground">لا توجد طلبات</p>
          ) : (
            filtered.map(order => <OrderCard key={order.id} order={order} />)
          )}
        </div>
      </Tabs>

      {/* Return Dialog */}
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
```

Note: `Trash2` is needed above — add `import { ..., Trash2 } from 'lucide-react';` to the import line.

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/DeliveryOrders.tsx
git commit -m "feat(ui): add DeliveryOrders page — create, confirm, deliver, return workflow"
```

---

## Task 6: Distribution Reports Page

**Files:**
- Create: `src/pages/InventoryDistribution.tsx`

Shows deficit per grade, per-student status, and triggers PurchaseRequest when deficit detected.

- [ ] **Step 1: Create the page**

Create `src/pages/InventoryDistribution.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BarChart3, AlertTriangle, CheckCircle, Clock, ShoppingCart, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAuthHeaders } from '@/stores/authStore';
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
  const { activeAcademicYear } = useSettingsStore();
  const [selectedYear, setSelectedYear] = useState(activeAcademicYear);
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [summaries, setSummaries] = useState<GradeDistributionSummary[]>([]);
  const [studentStatus, setStudentStatus] = useState<{ summary: any; students: StudentDeliveryStatus[] } | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<{ stage: string; grade: string; track: string } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [creatingPR, setCreatingPR] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch(
        `/api/distribution/grade-summary?academicYear=${selectedYear}&term=${selectedTerm}`,
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
        `/api/distribution/student-status?academicYear=${selectedYear}&term=${selectedTerm}&stage=${stage}&grade=${grade}&track=${track}`,
        { headers: getAuthHeaders() }
      );
      const data = await res.json();
      setStudentStatus(data);
    } catch { toast.error('فشل تحميل بيانات الطلاب'); }
    finally { setLoadingStudents(false); }
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
          requestedBy: 'system',
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
    } catch (err: any) {
      toast.error(err.message || 'فشل إنشاء طلب الشراء');
    } finally {
      setCreatingPR(null);
    }
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
        <Select value={selectedYear} onValueChange={v => { setSelectedYear(v); }}>
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
        </TabsList>

        <TabsContent value="grades" className="mt-4 space-y-4">
          {loadingSummary ? (
            <p className="text-muted-foreground py-8 text-center">جاري التحميل...</p>
          ) : summaries.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart3 className="size-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد قوائم مستلزمات لهذا الترم — أنشئها أولاً من شاشة قوائم المستلزمات</p>
            </div>
          ) : (
            summaries.map(summary => {
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
            })
          )}
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
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/InventoryDistribution.tsx
git commit -m "feat(ui): add InventoryDistribution reports page — deficit, student status, purchase trigger"
```

---

## Task 7: Add Received Items Tab to Student Detail

**Files:**
- Modify: `src/pages/StudentDetail.tsx`

Add a "ما تم استلامه" tab showing all delivery orders for this student.

- [ ] **Step 1: Find the Tabs section in StudentDetail.tsx**

```bash
grep -n "TabsTrigger\|TabsContent\|value=" src/pages/StudentDetail.tsx | head -20
```
Note the last `TabsTrigger` and `TabsContent` to know where to insert the new tab.

- [ ] **Step 2: Add import at top of StudentDetail.tsx**

Find the imports section and add:
```tsx
import { useDeliveryOrderStore } from '@/stores/deliveryOrderStore';
```

- [ ] **Step 3: Fetch delivery orders for the student**

Inside the `StudentDetail` component, after existing `useEffect` calls, add:

```tsx
const { orders: deliveryOrders, fetchOrders: fetchDeliveryOrders } = useDeliveryOrderStore();

useEffect(() => {
  if (student?.id) {
    fetchDeliveryOrders({ studentId: student.id });
  }
}, [student?.id]);

const studentDeliveries = deliveryOrders.filter(o => o.studentId === student?.id);
```

- [ ] **Step 4: Add the tab trigger**

In the `TabsList`, after the last existing `TabsTrigger`, add:
```tsx
<TabsTrigger value="deliveries">ما تم استلامه</TabsTrigger>
```

- [ ] **Step 5: Add the tab content**

After the last `TabsContent` closing tag, add:

```tsx
<TabsContent value="deliveries">
  <div className="space-y-3">
    {studentDeliveries.length === 0 ? (
      <p className="text-muted-foreground text-sm py-8 text-center">لا توجد طلبات تسليم لهذا الطالب</p>
    ) : (
      studentDeliveries.map(order => (
        <div key={order.id} className="border rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center">
            <p className="font-semibold text-sm">{order.code} — ترم {order.term}</p>
            <Badge className={
              order.status === 'delivered' ? 'bg-green-100 text-green-700' :
              order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
              order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-600'
            }>
              {order.status === 'delivered' ? 'مُسلَّم' :
               order.status === 'confirmed' ? 'مؤكد' :
               order.status === 'pending' ? 'معلق' : 'ملغي'}
            </Badge>
          </div>
          <div className="space-y-1">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                <span className={item.returnedAt ? 'line-through' : ''}>
                  {item.itemName} × {item.quantity}
                  {item.returnedAt && ' (مُرجَع)'}
                </span>
                {item.deliveredAt && (
                  <span>{new Date(item.deliveredAt).toLocaleDateString('ar-EG')}</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{order.chargeType === 'external' ? '💰 خارجي' : '📋 ضمن المصاريف'}</p>
        </div>
      ))
    )}
  </div>
</TabsContent>
```

- [ ] **Step 6: Build check**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/StudentDetail.tsx
git commit -m "feat(ui): add received items tab to StudentDetail page"
```

---

## Task 8: Register Routes and Nav Items

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add lazy imports to App.tsx**

After the existing lazy imports, add:
```tsx
const GradeItemLists = lazy(() => import('@/pages/GradeItemLists'));
const DeliveryOrders = lazy(() => import('@/pages/DeliveryOrders'));
const InventoryDistribution = lazy(() => import('@/pages/InventoryDistribution'));
```

- [ ] **Step 2: Add routes to App.tsx**

Inside the `<Routes>` block, after the existing inventory/purchasing routes, add:
```tsx
<Route path="/grade-item-lists" element={<GradeItemLists />} />
<Route path="/delivery-orders" element={<DeliveryOrders />} />
<Route path="/inventory-distribution" element={<InventoryDistribution />} />
```

- [ ] **Step 3: Add nav items to Sidebar.tsx**

Find the `المخازن والمشتريات` group in `Sidebar.tsx` (the array item with `label: 'المخازن والمشتريات'`). Inside its `children` array, after the purchasing entry, add:

```typescript
{ label: 'قوائم المستلزمات', path: '/grade-item-lists', icon: BookOpen, roles: ['system_admin', 'school_director', 'head_accountant', 'accountant'] },
{ label: 'طلبات التسليم', path: '/delivery-orders', icon: Package, roles: ['system_admin', 'school_director', 'head_accountant', 'accountant', 'warehouse_keeper'] },
{ label: 'تقارير التوزيع', path: '/inventory-distribution', icon: BarChart3, roles: ['system_admin', 'school_director', 'head_accountant', 'accountant', 'warehouse_keeper'] },
```

Make sure `BookOpen` and `BarChart3` are imported at the top of Sidebar.tsx (check existing imports first):
```bash
grep "BookOpen\|BarChart3" src/components/layout/Sidebar.tsx
```
If missing, add them to the lucide-react import.

- [ ] **Step 4: Final build check**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -10
```
Expected: Build successful, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat(router): register GradeItemLists, DeliveryOrders, InventoryDistribution routes and nav items"
```

---

## Self-Review

| Spec Requirement | Task |
|-----------------|------|
| No localStorage persist on new stores | Tasks 2, 3 — no `persist` used |
| All data fetched fresh from API | Tasks 2, 3 — `fetchXxx` called on mount |
| GradeItemList management UI | Task 4 |
| Delivery order create (Accounting) | Task 5 |
| Delivery confirm + deliver (Warehouse) | Task 5 |
| Return dialog with notes | Task 5 |
| Distribution reports with deficit | Task 6 |
| Per-student status table | Task 6 |
| PurchaseRequest trigger from deficit | Task 6 Step 1 — calls `/api/purchasing/requests` |
| Student Detail: received items tab | Task 7 |
| Routes + Sidebar nav | Task 8 |
| TypeScript types for all new models | Task 1 |
