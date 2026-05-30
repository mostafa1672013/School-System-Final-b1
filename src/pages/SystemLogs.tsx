import { useEffect, useState, useMemo } from 'react';
import { useAuditLogsStore } from '@/stores/auditLogsStore';
import { useUsersStore } from '@/stores/usersStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Loader2, ChevronRight, ChevronLeft, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function SystemLogs() {
  const { data, isLoading, fetchLogs } = useAuditLogsStore();
  const { users, fetchUsers } = useUsersStore();

  const [page, setPage] = useState(1);
  const [userIdFilter, setUserIdFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchLogs({ page, userId: userIdFilter, entityType: entityTypeFilter });
  }, [fetchLogs, page, userIdFilter, entityTypeFilter]);

  const entityTypes = [
    { value: 'all', label: 'الكل' },
    { value: 'User', label: 'المستخدمون' },
    { value: 'Student', label: 'الطلاب' },
    { value: 'Payment', label: 'المدفوعات' },
    { value: 'TreasurySession', label: 'جلسات الخزينة' },
    { value: 'Expense', label: 'المصروفات' },
    { value: 'Discount', label: 'الخصومات' },
    { value: 'InventoryTransaction', label: 'حركات المخزن' },
  ];

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-emerald-600 bg-emerald-50';
      case 'UPDATE': return 'text-blue-600 bg-blue-50';
      case 'DELETE': return 'text-red-600 bg-red-50';
      case 'LOGIN': return 'text-indigo-600 bg-indigo-50';
      case 'LOGOUT': return 'text-gray-600 bg-gray-100';
      case 'APPROVE': return 'text-teal-600 bg-teal-50';
      case 'REJECT': return 'text-rose-600 bg-rose-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatAction = (action: string) => {
    switch (action) {
      case 'CREATE': return 'إنشاء';
      case 'UPDATE': return 'تعديل';
      case 'DELETE': return 'حذف';
      case 'LOGIN': return 'تسجيل دخول';
      case 'LOGOUT': return 'تسجيل خروج';
      case 'APPROVE': return 'اعتماد';
      case 'REJECT': return 'رفض';
      default: return action;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Activity className="size-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold font-[Noto_Kufi_Arabic]">سجلات النظام</h2>
          <p className="text-sm text-muted-foreground">تتبع جميع الإجراءات والحركات التي قام بها المستخدمون</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium font-[Noto_Kufi_Arabic]">فلاتر البحث</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-64">
              <Select value={userIdFilter} onValueChange={(v) => { setUserIdFilter(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="المستخدم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المستخدمين</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-64">
              <Select value={entityTypeFilter} onValueChange={(v) => { setEntityTypeFilter(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="نوع السجل" />
                </SelectTrigger>
                <SelectContent>
                  {entityTypes.map(e => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-right p-4 font-semibold">المستخدم</th>
                <th className="text-right p-4 font-semibold">الإجراء</th>
                <th className="text-right p-4 font-semibold">القسم</th>
                <th className="text-right p-4 font-semibold">رقم المرجع (ID)</th>
                <th className="text-right p-4 font-semibold">التاريخ والوقت</th>
                <th className="text-center p-4 font-semibold">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 className="size-8 animate-spin text-primary mx-auto" />
                    <p className="mt-2 text-muted-foreground">جاري تحميل السجلات...</p>
                  </td>
                </tr>
              ) : !data || data.logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <ShieldAlert className="size-10 text-muted-foreground opacity-30 mx-auto mb-3" />
                    <p className="text-muted-foreground">لا توجد سجلات مطابقة للبحث</p>
                  </td>
                </tr>
              ) : (
                data.logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium">{log.userName}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">{entityTypes.find(e => e.value === log.entityType)?.label || log.entityType}</td>
                    <td className="p-4 font-mono text-xs">{log.entityId || '-'}</td>
                    <td className="p-4 text-muted-foreground text-xs" dir="ltr">
                      {new Date(log.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'medium' })}
                    </td>
                    <td className="p-4 text-center">
                      {(log.before || log.after) && (
                        <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                          عرض
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-muted-foreground">
              صفحة {data.page} من {data.totalPages} (إجمالي {data.total} سجل)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={data.page === 1}
              >
                <ChevronRight className="size-4 ml-1" /> السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={data.page === data.totalPages}
              >
                التالي <ChevronLeft className="size-4 mr-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-[Noto_Kufi_Arabic]">تفاصيل السجل</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 text-sm mt-4">
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg">
                <div><span className="text-muted-foreground ml-2">المستخدم:</span> {selectedLog.userName}</div>
                <div><span className="text-muted-foreground ml-2">الإجراء:</span> {formatAction(selectedLog.action)}</div>
                <div><span className="text-muted-foreground ml-2">القسم:</span> {selectedLog.entityType}</div>
                <div><span className="text-muted-foreground ml-2">IP:</span> {selectedLog.ip || '-'}</div>
              </div>

              {selectedLog.before && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-red-600">قبل التعديل:</h4>
                  <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-xs" dir="ltr">
                    {JSON.stringify(selectedLog.before, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.after && (
                <div className="space-y-2 mt-4">
                  <h4 className="font-semibold text-emerald-600">بعد التعديل (القيمة الجديدة):</h4>
                  <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-xs" dir="ltr">
                    {JSON.stringify(selectedLog.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
