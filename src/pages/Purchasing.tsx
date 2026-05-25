import { useEffect, useState } from 'react';
import { usePurchasingStore } from '@/stores/purchasingStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, FileText, Truck, Receipt, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

export default function Purchasing() {
  const store = usePurchasingStore();

  useEffect(() => {
    store.fetchRequests();
    store.fetchOrders();
    store.fetchReceipts();
    store.fetchInvoices();
    store.fetchPayments();
    store.fetchSuppliers(); // Required for dropdowns if we add create functionality
  }, []);

  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { label: string; variant: any }> = {
      pending_approval: { label: 'قيد الاعتماد', variant: 'secondary' },
      approved: { label: 'معتمد', variant: 'default' },
      rejected: { label: 'مرفوض', variant: 'destructive' },
      po_created: { label: 'أمر شراء مصدر', variant: 'outline' },
      issued: { label: 'مصدر', variant: 'default' },
      partially_received: { label: 'مستلم جزئياً', variant: 'secondary' },
      completed: { label: 'مكتمل', variant: 'outline' },
      received: { label: 'مستلم', variant: 'default' },
      invoiced: { label: 'مفوتر', variant: 'outline' },
      unpaid: { label: 'غير مسدد', variant: 'destructive' },
      partial: { label: 'مسدد جزئياً', variant: 'secondary' },
      paid: { label: 'مسدد بالكامل', variant: 'default' },
    };
    const s = map[status] || { label: status, variant: 'outline' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <ShoppingCart className="size-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">إدارة المشتريات (Procure-to-Pay)</h1>
            <p className="text-sm text-muted-foreground">دورة المشتريات المتكاملة</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6">
          <TabsTrigger value="requests" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3">
            <FileText className="size-4 ml-2" />
            طلبات الشراء (PR)
          </TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3">
            <ShoppingCart className="size-4 ml-2" />
            أوامر الشراء (PO)
          </TabsTrigger>
          <TabsTrigger value="receipts" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3">
            <Truck className="size-4 ml-2" />
            أذون الاستلام (GRN)
          </TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3">
            <Receipt className="size-4 ml-2" />
            الفواتير والاستحقاق (AP)
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3">
            <CreditCard className="size-4 ml-2" />
            سداد الموردين
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>طلبات الشراء</CardTitle>
              <Button size="sm">طلب شراء جديد</Button>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-3 px-4 text-right">رقم الطلب</th>
                    <th className="py-3 px-4 text-right">التاريخ</th>
                    <th className="py-3 px-4 text-right">طالب الشراء</th>
                    <th className="py-3 px-4 text-right">القسم</th>
                    <th className="py-3 px-4 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {store.requests.map((r: any) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-3 px-4 font-mono">{r.requestNumber.split('-')[0]}...</td>
                      <td className="py-3 px-4">{format(new Date(r.date), 'yyyy-MM-dd')}</td>
                      <td className="py-3 px-4">{r.requestedBy}</td>
                      <td className="py-3 px-4">{r.department || '-'}</td>
                      <td className="py-3 px-4 text-center"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                  {store.requests.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">لا توجد طلبات شراء</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>أوامر الشراء</CardTitle>
              <Button size="sm">أمر شراء جديد</Button>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-3 px-4 text-right">رقم الأمر</th>
                    <th className="py-3 px-4 text-right">التاريخ</th>
                    <th className="py-3 px-4 text-right">المورد</th>
                    <th className="py-3 px-4 text-right">الإجمالي</th>
                    <th className="py-3 px-4 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {store.orders.map((o: any) => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="py-3 px-4 font-mono">{o.orderNumber.split('-')[0]}...</td>
                      <td className="py-3 px-4">{format(new Date(o.date), 'yyyy-MM-dd')}</td>
                      <td className="py-3 px-4">{o.supplier?.name}</td>
                      <td className="py-3 px-4">{Number(o.totalAmount).toLocaleString()} ج.م</td>
                      <td className="py-3 px-4 text-center"><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                  {store.orders.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">لا توجد أوامر شراء</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>أذون الاستلام</CardTitle>
              <Button size="sm">إذن استلام جديد</Button>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-3 px-4 text-right">رقم الإذن</th>
                    <th className="py-3 px-4 text-right">التاريخ</th>
                    <th className="py-3 px-4 text-right">المورد</th>
                    <th className="py-3 px-4 text-right">مستلم بواسطة</th>
                    <th className="py-3 px-4 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {store.receipts.map((r: any) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-3 px-4 font-mono">{r.receiptNumber.split('-')[0]}...</td>
                      <td className="py-3 px-4">{format(new Date(r.date), 'yyyy-MM-dd')}</td>
                      <td className="py-3 px-4">{r.supplier?.name}</td>
                      <td className="py-3 px-4">{r.receivedBy}</td>
                      <td className="py-3 px-4 text-center"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                  {store.receipts.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">لا توجد أذون استلام</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>الفواتير واستحقاق الموردين</CardTitle>
              <Button size="sm">تسجيل فاتورة مورد</Button>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-3 px-4 text-right">رقم الفاتورة</th>
                    <th className="py-3 px-4 text-right">التاريخ</th>
                    <th className="py-3 px-4 text-right">المورد</th>
                    <th className="py-3 px-4 text-right">الإجمالي المستحق</th>
                    <th className="py-3 px-4 text-right">المدفوع</th>
                    <th className="py-3 px-4 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {store.invoices.map((inv: any) => (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="py-3 px-4 font-mono">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4">{format(new Date(inv.date), 'yyyy-MM-dd')}</td>
                      <td className="py-3 px-4">{inv.supplier?.name}</td>
                      <td className="py-3 px-4">{Number(inv.netAmount).toLocaleString()} ج.م</td>
                      <td className="py-3 px-4 text-green-600">{Number(inv.paidAmount).toLocaleString()} ج.م</td>
                      <td className="py-3 px-4 text-center"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                  {store.invoices.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">لا توجد فواتير</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>سداد الموردين</CardTitle>
              <Button size="sm">تسجيل دفعة سداد</Button>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-3 px-4 text-right">رقم السداد</th>
                    <th className="py-3 px-4 text-right">التاريخ</th>
                    <th className="py-3 px-4 text-right">المورد</th>
                    <th className="py-3 px-4 text-right">رقم الفاتورة</th>
                    <th className="py-3 px-4 text-right">المبلغ</th>
                    <th className="py-3 px-4 text-center">طريقة الدفع</th>
                  </tr>
                </thead>
                <tbody>
                  {store.payments.map((p: any) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-3 px-4 font-mono">{p.paymentNumber.split('-')[0]}...</td>
                      <td className="py-3 px-4">{format(new Date(p.date), 'yyyy-MM-dd')}</td>
                      <td className="py-3 px-4">{p.supplier?.name}</td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">{p.invoice?.invoiceNumber || '-'}</td>
                      <td className="py-3 px-4 font-bold">{Number(p.amount).toLocaleString()} ج.م</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline">
                          {p.paymentMethod === 'cash' ? 'نقدي' : p.paymentMethod === 'bank' ? 'تحويل بنكي' : p.paymentMethod === 'check' ? 'شيك' : 'أخرى'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {store.payments.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">لا توجد عمليات سداد</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
