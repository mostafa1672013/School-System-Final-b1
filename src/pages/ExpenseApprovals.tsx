import { useEffect } from 'react';
import { useAccountingStore } from '@/stores/accountingStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertCircle, Clock, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDateShort } from '@/lib/utils';

export default function ExpenseApprovals() {
  const { user } = useAuthStore();
  const { expenses, fetchExpenses, approveExpense, rejectExpense, loading } = useAccountingStore();

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const pendingExpenses = expenses.filter(e => e.status === 'pending_approval');

  const handleApprove = async (id: string) => {
    const success = await approveExpense(id, user?.name || 'المدير المالي');
    if (success) {
      toast.success('تم الاعتماد بنجاح. الطلب الآن في قائمة الصرف بالخزينة');
    } else {
      toast.error('حدث خطأ أثناء الاعتماد');
    }
  };

  const handleReject = async (id: string) => {
    const success = await rejectExpense(id);
    if (success) {
      toast.error('تم رفض طلب الصرف');
    } else {
      toast.error('حدث خطأ أثناء معالجة الطلب');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm">
        <h1 className="text-2xl font-bold font-[Noto_Kufi_Arabic] text-slate-800">اعتمادات المصروفات</h1>
        <p className="text-sm text-slate-500 mt-1">مراجعة واعتماد طلبات الصرف التي تتجاوز صلاحية المحاسب</p>
      </div>

      {pendingExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-slate-300">
          <CheckCircle className="size-12 text-emerald-100 mb-4" />
          <p className="text-slate-500 font-medium">لا توجد طلبات صرف معلقة حالياً</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingExpenses.map((exp) => (
            <Card key={exp.id} className="overflow-hidden border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="bg-slate-50/50 pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Banknote className="size-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">{exp.description}</CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">بواسطة: {exp.requestedBy} | {formatDateShort(exp.date)}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    <Clock className="ml-1 size-3" /> بانتظار الاعتماد المالي
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">حساب المصروف</p>
                    <p className="font-semibold text-slate-800">{exp.account?.name} ({exp.account?.code})</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">طريقة الدفع</p>
                    <p className="font-semibold text-slate-800">{exp.paymentMethod === 'cash' ? 'نقداً (الخزينة)' : 'تحويل بنكي / شيك'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">المبلغ المطلوب</p>
                    <p className="text-xl font-black text-slate-900 tabular-nums">{formatCurrency(exp.amount)}</p>
                  </div>
                </div>
                
                {exp.notes && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 border border-slate-100 flex gap-2">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <span><strong>ملاحظات:</strong> {exp.notes}</span>
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleReject(exp.id)} disabled={loading}>
                    <XCircle className="ml-2 size-4" /> رفض الطلب
                  </Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApprove(exp.id)} disabled={loading}>
                    <CheckCircle className="ml-2 size-4" /> اعتماد وصرف المبلغ
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
