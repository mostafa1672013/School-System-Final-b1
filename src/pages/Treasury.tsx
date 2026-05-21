import { useState, useEffect } from 'react';
import { useTreasuryStore } from '@/stores/treasuryStore';
import { useAuthStore } from '@/stores/authStore';
import { usePrintTreasuryReport } from '@/hooks/usePrintTreasuryReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Vault, Lock, TrendingUp, TrendingDown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

export default function Treasury() {
  const { status, loading, fetchStatus, openTreasury, requestClose, approveClose } = useTreasuryStore();
  const { user } = useAuthStore();
  const { printReport } = usePrintTreasuryReport();

  const [openingBalanceInput, setOpeningBalanceInput] = useState('');
  const [actualBalanceInput, setActualBalanceInput] = useState('');
  const [closureNote, setClosureNote] = useState('');
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [closeRequestResult, setCloseRequestResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 120000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // التحقق من تفويض المستخدم: هل هو من فتح الخزينة؟
  useEffect(() => {
    if (!status || status.status !== 'open') {
      // الخزينة مغلقة أو لا توجد جلسة
      setIsAuthorized(false);
      return;
    }

    if (!status.session || !status.session.openedBy) {
      // بيانات الجلسة غير كاملة
      setIsAuthorized(false);
      return;
    }

    if (!user || !user.id) {
      // المستخدم غير مسجل دخول
      setIsAuthorized(false);
      return;
    }

    // مقارنة صارمة: هل المستخدم الحالي هو من فتح الخزينة؟
    const authorized = status.session.openedBy === user.id;
    setIsAuthorized(authorized);
  }, [status, user]);

  const handleOpenTreasury = async () => {
    if (!openingBalanceInput || parseFloat(openingBalanceInput) < 0) {
      toast.error('الرجاء إدخال رصيد صحيح');
      return;
    }

    setIsSubmitting(true);
    const success = await openTreasury(parseFloat(openingBalanceInput), user?.id || '');
    setIsSubmitting(false);

    if (success) {
      toast.success('تم فتح الخزينة بنجاح');
      setOpeningBalanceInput('');
      setShowOpenDialog(false);
    } else {
      toast.error('فشل فتح الخزينة');
    }
  };

  const handleRequestClose = async () => {
    // Security check: Only the treasury opener can close
    if (!user || !user.id) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    if (!status || !status.session || !status.session.openedBy) {
      toast.error('لا توجد جلسة خزينة مفتوحة');
      return;
    }

    if (status.session.openedBy !== user.id) {
      toast.error('فقط الشخص الذي فتح الخزينة يمكنه إغلاقها');
      return;
    }

    if (!actualBalanceInput || parseFloat(actualBalanceInput) < 0) {
      toast.error('الرجاء إدخال المبلغ الفعلي');
      return;
    }

    setIsSubmitting(true);
    const result = await requestClose(parseFloat(actualBalanceInput), user?.name || 'أمين الخزينة');
    setIsSubmitting(false);

    if (result) {
      setCloseRequestResult(result);
      if (result.status === 'closed') {
        toast.success('تم إغلاق الخزينة بنجاح');
        setShowCloseDialog(false);
        setActualBalanceInput('');
      } else {
        toast.warning('يوجد فرق في الجرد - يحتاج موافقة المدير');
        setShowCloseDialog(false);
        setShowApprovalDialog(true);
      }
    } else {
      toast.error('فشل جرد الخزينة');
    }
  };

  const handleApproveClose = async () => {
    // Security check: Only the treasury opener can approve close
    if (!user || !user.id) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    if (!status || !status.session || !status.session.openedBy) {
      toast.error('لا توجد جلسة خزينة مفتوحة');
      return;
    }

    if (status.session.openedBy !== user.id) {
      toast.error('فقط الشخص الذي فتح الخزينة يمكنه الموافقة على الإغلاق');
      return;
    }

    if (!closureNote || closureNote.trim().length < 10) {
      toast.error('يجب كتابة سبب الفرق (10 أحرف على الأقل)');
      return;
    }

    if (!closeRequestResult?.sessionId) {
      toast.error('معلومات الجلسة غير صحيحة');
      return;
    }

    setIsSubmitting(true);
    const success = await approveClose(
      closeRequestResult.sessionId,
      closeRequestResult.actualBalance,
      user?.name || 'أمين الخزينة',
      user?.id || '',
      closureNote
    );
    setIsSubmitting(false);

    if (success) {
      toast.success('تم إغلاق الخزينة مع الموافقة');
      setShowApprovalDialog(false);
      setClosureNote('');
      setActualBalanceInput('');
    } else {
      toast.error('فشل إغلاق الخزينة');
    }
  };

  // === حالة no_session ===
  if (!status || status.status === 'no_session') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-md mx-auto h-screen flex flex-col items-center justify-center">
          <Card className="w-full border-2 border-dashed">
            <CardHeader className="text-center">
              <Vault className="w-16 h-16 mx-auto text-blue-600 mb-4" />
              <CardTitle>فتح الخزينة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {status?.suggestedOpeningBalance !== null && status?.suggestedOpeningBalance !== undefined ? (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600 mb-2">الرصيد المقترح من الإغلاق السابق:</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(status.suggestedOpeningBalance)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 text-center">هذه أول جلسة خزينة</p>
                )}

                <Input
                  type="number"
                  placeholder="الرصيد الافتتاحي"
                  value={openingBalanceInput}
                  onChange={(e) => setOpeningBalanceInput(e.target.value)}
                  className="text-lg"
                  step="0.01"
                  min="0"
                />

                <Button
                  onClick={() => setShowOpenDialog(true)}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                  disabled={!openingBalanceInput}
                >
                  <Vault className="w-4 h-4 ml-2" />
                  فتح الخزينة الآن
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dialog التأكيد */}
        <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأكيد فتح الخزينة</DialogTitle>
              <DialogDescription>
                سيتم تسجيل الرصيد الافتتاحي: <strong>{formatCurrency(parseFloat(openingBalanceInput) || 0)}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">بعد الفتح، ستتمكن من تسجيل المقبوضات والمصروفات.</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowOpenDialog(false)}
                  disabled={isSubmitting}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleOpenTreasury}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? 'جاري الفتح...' : 'تأكيد الفتح'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // === حالة open ===
  if (status.status === 'open' && status.session) {
    const totalIncome = status.totalIncome || 0;
    const totalExpenses = status.totalExpenses || 0;
    const currentBalance = status.currentBalance || 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">جلسة الخزينة المفتوحة</h1>
              <p className="text-gray-600 mt-2">
                {new Date(status.session.date).toLocaleDateString('ar-EG', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={async () => {
                  const sessionDetails = await fetch(`/api/treasury/sessions/${status.session.id}`).then((r) =>
                    r.json()
                  );
                  printReport(
                    status.session,
                    sessionDetails.session.payments || [],
                    sessionDetails.session.expenses || [],
                    { totalIncome, totalExpenses, currentBalance }
                  );
                }}
                variant="outline"
                className="gap-2"
                disabled={!isAuthorized}
              >
                🖨️ طباعة التقرير
              </Button>
              <Button onClick={() => setShowCloseDialog(true)} variant="destructive" className="gap-2" disabled={!isAuthorized}>
                <Lock className="w-4 h-4" />
                جرد وإغلاق
              </Button>
            </div>
          </div>

          {!isAuthorized && (
            <Alert variant="destructive" className="mb-6">
              <Lock className="h-4 w-4" />
              <AlertTitle>🔒 صلاحية مرفوضة</AlertTitle>
              <AlertDescription>
                فقط الشخص الذي فتح الخزينة يمكنه إجراء العمليات عليها. الخزينة الآن مفتوحة من قبل مستخدم آخر.
              </AlertDescription>
            </Alert>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">الرصيد الافتتاحي</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(status.session.openingBalance)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">إجمالي المقبوضات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <p className="text-2xl font-bold text-green-600">+{formatCurrency(totalIncome)}</p>
                </div>
                <p className="text-xs text-gray-500 mt-2">{status.paymentsCount} عملية</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">إجمالي المصروفات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <p className="text-2xl font-bold text-red-600">-{formatCurrency(totalExpenses)}</p>
                </div>
                <p className="text-xs text-gray-500 mt-2">{status.expensesCount} عملية</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-300 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-700">الرصيد الحالي</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-700">{formatCurrency(currentBalance)}</p>
                <p className="text-xs text-blue-600 mt-2">محسوب لحظياً</p>
              </CardContent>
            </Card>
          </div>

          {/* Transactions Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payments Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📥 المقبوضات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-3 text-right font-semibold">الطالب</th>
                        <th className="p-3 text-right font-semibold">المبلغ</th>
                        <th className="p-3 text-right font-semibold">الإيصال</th>
                      </tr>
                    </thead>
                    <tbody>
                      {status.session.payments && status.session.payments.length > 0 ? (
                        status.session.payments.map((p: any) => (
                          <tr key={p.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">{p.studentName}</td>
                            <td className="p-3 text-green-600 font-semibold">{formatCurrency(p.amount)}</td>
                            <td className="p-3 text-gray-500 text-xs">{p.receiptNumber}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-gray-500">
                            لا توجد مقبوضات حتى الآن
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Expenses Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📤 المصروفات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-3 text-right font-semibold">البيان</th>
                        <th className="p-3 text-right font-semibold">المبلغ</th>
                        <th className="p-3 text-right font-semibold">الصارف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {status.session.expenses && status.session.expenses.length > 0 ? (
                        status.session.expenses.map((e: any) => (
                          <tr key={e.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">{e.description}</td>
                            <td className="p-3 text-red-600 font-semibold">{formatCurrency(e.amount)}</td>
                            <td className="p-3 text-gray-500 text-xs">{e.paidBy}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-gray-500">
                            لا توجد مصروفات حتى الآن
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Close Dialog */}
        <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>جرد الخزينة وإغلاق الجلسة</DialogTitle>
              <DialogDescription>أدخل المبلغ الفعلي في صندوق الخزينة</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">الرصيد المتوقع:</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(currentBalance)}</p>
                </div>

                <Input
                  type="number"
                  placeholder="المبلغ الفعلي في الصندوق"
                  value={actualBalanceInput}
                  onChange={(e) => setActualBalanceInput(e.target.value)}
                  className="text-lg"
                  step="0.01"
                  min="0"
                />

                {actualBalanceInput && (
                  <div className={`p-4 rounded-lg ${
                    Math.abs(parseFloat(actualBalanceInput) - currentBalance) < 0.01
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className="text-sm text-gray-600">الفرق:</p>
                    <p className={`text-xl font-bold ${
                      Math.abs(parseFloat(actualBalanceInput) - currentBalance) < 0.01
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(parseFloat(actualBalanceInput) - currentBalance)}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowCloseDialog(false)} disabled={isSubmitting}>
                  إلغاء
                </Button>
                <Button
                  onClick={handleRequestClose}
                  disabled={!actualBalanceInput || isSubmitting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isSubmitting ? 'جاري المعالجة...' : 'جرد وإغلاق'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Approval Dialog (for discrepancies) */}
        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                طلب موافقة على الفرق
              </DialogTitle>
              <DialogDescription>يوجد فرق في الجرد - يحتاج موافقة من المدير</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>فرق في الجرد</AlertTitle>
                <AlertDescription>
                  الفرق: {formatCurrency(closeRequestResult?.difference || 0)}
                  <br />
                  المتوقع: {formatCurrency(closeRequestResult?.expectedBalance || 0)}
                  <br />
                  الفعلي: {formatCurrency(closeRequestResult?.actualBalance || 0)}
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <label className="text-sm font-medium">سبب الفرق (إجباري)</label>
                <textarea
                  placeholder="اشرح سبب وجود الفرق..."
                  value={closureNote}
                  onChange={(e) => setClosureNote(e.target.value)}
                  className="w-full p-3 border rounded-lg resize-none h-24"
                />
                <p className="text-xs text-gray-500">{closureNote.length}/10 أحرف</p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowApprovalDialog(false)} disabled={isSubmitting}>
                  إلغاء
                </Button>
                <Button
                  onClick={handleApproveClose}
                  disabled={closureNote.trim().length < 10 || isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? 'جاري الموافقة...' : 'الموافقة والإغلاق'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">جاري التحميل...</p>
      </div>
    );
  }

  return null;
}
