import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, Loader2, Users, Percent, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Badge } from '@/types';
import { getAuthHeaders } from '@/stores/authStore';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4', '#84cc16', '#a855f7',
];

const PRESET_ICONS = ['🏆', '⭐', '🌟', '🎖️', '🥇', '🎗️', '🔵', '🟢', '🟡', '🟠', '🔴', '💎', '🌺', '🦁', '🦅'];

function BadgeForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<Badge>;
  onSave: (data: Partial<Badge>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    color: initial?.color || '#6366f1',
    icon: initial?.icon || '🏆',
    discountPercentage: initial?.discountPercentage ?? 0,
    description: initial?.description || '',
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>اسم الشارة *</Label>
          <Input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="مثال: طالب متفوق"
            className="mt-1"
          />
        </div>

        <div>
          <Label>نسبة الخصم (%)</Label>
          <div className="relative mt-1">
            <Input
              type="number"
              min={0}
              max={100}
              value={form.discountPercentage}
              onChange={e => setForm(f => ({ ...f, discountPercentage: Number(e.target.value) }))}
              className="pl-8"
            />
            <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>
        </div>

        <div>
          <Label>أيقونة الشارة</Label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {PRESET_ICONS.map(icon => (
              <button
                key={icon}
                type="button"
                onClick={() => setForm(f => ({ ...f, icon }))}
                className={`text-xl p-1 rounded border-2 transition-colors ${form.icon === icon ? 'border-primary' : 'border-transparent hover:border-muted'}`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2">
          <Label>لون الشارة</Label>
          <div className="mt-1 flex flex-wrap gap-2 items-center">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setForm(f => ({ ...f, color: c }))}
                style={{ backgroundColor: c }}
                className={`size-7 rounded-full border-2 transition-all ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
              />
            ))}
            <input
              type="color"
              value={form.color}
              onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              className="size-7 rounded cursor-pointer border"
              title="اختر لوناً مخصصاً"
            />
          </div>
        </div>

        <div className="col-span-2">
          <Label>وصف (اختياري)</Label>
          <Input
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="وصف قصير للشارة..."
            className="mt-1"
          />
        </div>
      </div>

      {/* Preview */}
      <div className="bg-muted/40 rounded-lg p-4 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">معاينة:</span>
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: form.color }}
        >
          {form.icon && <span>{form.icon}</span>}
          {form.name || 'اسم الشارة'}
        </span>
        {form.discountPercentage > 0 && (
          <span className="text-xs text-muted-foreground">خصم {form.discountPercentage}%</span>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          <X className="size-4 ml-1" /> إلغاء
        </Button>
        <Button onClick={() => onSave(form)} disabled={saving || !form.name.trim()}>
          {saving ? <Loader2 className="size-4 animate-spin ml-1" /> : <Save className="size-4 ml-1" />}
          حفظ الشارة
        </Button>
      </div>
    </div>
  );
}

export default function BadgeSettings() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBadges = async () => {
    try {
      const res = await fetch(`/api/badges`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) setBadges(await res.json());
    } catch {
      toast.error('فشل تحميل الشارات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBadges(); }, []);

  const handleSave = async (data: Partial<Badge>) => {
    setSaving(true);
    try {
      const url = editingBadge
        ? `${API_BASE}/api/badges/${editingBadge.id}`
        : `/api/badges`;
      const method = editingBadge ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      toast.success(editingBadge ? 'تم تعديل الشارة' : 'تم إنشاء الشارة');
      setDialogOpen(false);
      setEditingBadge(null);
      await fetchBadges();
    } catch {
      toast.error('فشل حفظ الشارة');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (badge: Badge) => {
    if (!window.confirm(`هل أنت متأكد من حذف شارة "${badge.name}"؟`)) return;
    setDeletingId(badge.id);
    try {
      const res = await fetch(`/api/badges/${badge.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error();
      toast.success('تم حذف الشارة');
      await fetchBadges();
    } catch {
      toast.error('فشل حذف الشارة');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-[Noto_Kufi_Arabic]">إعدادات الشارات</h1>
          <p className="text-muted-foreground text-sm mt-1">
            أنشئ شارات بخصومات محددة تُطبَّق تلقائياً على الطلاب بدون موافقة إدارية
          </p>
        </div>
        <Button onClick={() => { setEditingBadge(null); setDialogOpen(true); }}>
          <Plus className="size-4 ml-1" /> شارة جديدة
        </Button>
      </div>

      {/* Info card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>كيف تعمل الشارات؟</strong> — عند تعيين شارة لطالب، يُطبَّق الخصم المحدد للشارة تلقائياً
        على إجمالي رسومه دون الحاجة إلى موافقة المدير أو رئيس الحسابات.
      </div>

      {/* Badges Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-10 animate-spin text-primary" />
        </div>
      ) : badges.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Tag className="size-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد شارات بعد. أنشئ أول شارة الآن.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map(badge => (
            <div key={badge.id} className="bg-card border rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: badge.color }}
                >
                  {badge.icon && <span>{badge.icon}</span>}
                  {badge.name}
                </span>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => { setEditingBadge(badge); setDialogOpen(true); }}
                  >
                    <Edit2 className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(badge)}
                    disabled={deletingId === badge.id}
                  >
                    {deletingId === badge.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </Button>
                </div>
              </div>

              {badge.description && (
                <p className="text-sm text-muted-foreground">{badge.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 bg-green-50 text-green-700 rounded-lg px-2.5 py-1.5">
                  <Percent className="size-3.5" />
                  <span className="font-bold">{badge.discountPercentage}%</span>
                  <span className="text-xs">خصم تلقائي</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="size-3.5" />
                  <span>{badge._count?.students ?? 0} طالب</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setDialogOpen(false); setEditingBadge(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-[Noto_Kufi_Arabic]">
              {editingBadge ? 'تعديل الشارة' : 'إنشاء شارة جديدة'}
            </DialogTitle>
          </DialogHeader>
          <BadgeForm
            initial={editingBadge || undefined}
            onSave={handleSave}
            onCancel={() => { setDialogOpen(false); setEditingBadge(null); }}
            saving={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
