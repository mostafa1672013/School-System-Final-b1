import { useState, useEffect } from 'react';
import { useAccountingStore } from '@/stores/accountingStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const roleLabels: Record<string, string> = {
  system_admin: 'مدير النظام',
  school_director: 'مدير المدرسة',
  head_accountant: 'رئيس الحسابات',
  accountant: 'محاسب',
  warehouse_keeper: 'أمين المخزن',
  bus_supervisor: 'مشرف الباصات',
};

export default function ExpensePermissions() {
  const { limits, fetchLimits, updateLimit } = useAccountingStore();
  const [localLimits, setLocalLimits] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  useEffect(() => {
    const map: Record<string, number> = {};
    limits.forEach(l => {
      map[l.role] = l.maxAmount;
    });
    setLocalLimits(map);
  }, [limits]);

  const handleSave = async (role: string) => {
    const success = await updateLimit(role, localLimits[role] || 0);
    if (success) {
      toast.success(`تم تحديث صلاحية ${roleLabels[role]}`);
    } else {
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-lg text-white">
            <Shield className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-[Noto_Kufi_Arabic] text-slate-800">صلاحيات وحدود الصرف</h1>
            <p className="text-sm text-slate-500 mt-1">تحديد الحد الأقصى لكل دور وظيفي لطلب صرف مباشر دون موافقة مسبقة</p>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800 text-sm">
        <AlertCircle className="size-5 shrink-0" />
        <p>المبالغ التي تزيد عن هذه الحدود ستتطلب اعتماداً من "المدير المالي" أو "مدير النظام" قبل أن تظهر في قائمة الصرف بالخزينة.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-right">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 font-semibold text-slate-600">الدور الوظيفي</th>
              <th className="p-4 font-semibold text-slate-600">الحد الأقصى للصرف المباشر (ج.م)</th>
              <th className="p-4 font-semibold text-slate-600 w-32">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(roleLabels).map(([role, label]) => (
              <tr key={role} className="border-b last:border-0 border-slate-100 hover:bg-slate-50/50">
                <td className="p-4 font-medium text-slate-800">{label}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2 max-w-[200px]">
                    <Input 
                      type="number" 
                      value={localLimits[role] ?? 0} 
                      onChange={(e) => setLocalLimits({ ...localLimits, [role]: Number(e.target.value) })}
                      className="text-left font-mono"
                    />
                    <span className="text-xs text-slate-400">ج.م</span>
                  </div>
                </td>
                <td className="p-4">
                  <Button size="sm" onClick={() => handleSave(role)}>
                    <Save className="ml-2 size-4" /> حفظ
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
