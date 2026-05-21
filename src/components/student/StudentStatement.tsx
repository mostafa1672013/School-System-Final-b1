import { useState, useMemo, useRef } from 'react';
import {
  Printer, Download, BookOpen, CreditCard, ArrowRightLeft,
  Tag, ShoppingBag, AlertCircle, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  formatCurrency, formatDateShort, stageLabels,
  paymentTypeLabels, paymentMethodLabels,
} from '@/lib/utils';
import type { Student, Payment, InstallmentPlan, InventoryTransaction } from '@/types';

type TxFilter = 'all' | 'payments' | 'inventory' | 'installments';

type TimelineEventType =
  | 'enrollment' | 'promotion' | 'discount'
  | 'payment' | 'installment_plan' | 'installment_overdue' | 'inventory';

interface TimelineEvent {
  id: string;
  date: string;
  type: TimelineEventType;
  label: string;
  amount?: number;
  subLabel?: string;
}

interface Props {
  student: Student;
  payments: Payment[];
  installmentPlan: InstallmentPlan | null;
  inventoryTx: InventoryTransaction[];
}

const eventConfig: Record<TimelineEventType, { color: string; Icon: React.ElementType }> = {
  enrollment:          { color: 'text-blue-600 bg-blue-50 border-blue-200',     Icon: BookOpen },
  promotion:           { color: 'text-blue-600 bg-blue-50 border-blue-200',     Icon: ArrowRightLeft },
  discount:            { color: 'text-green-600 bg-green-50 border-green-200',  Icon: Tag },
  payment:             { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', Icon: CreditCard },
  installment_plan:    { color: 'text-amber-600 bg-amber-50 border-amber-200',  Icon: Clock },
  installment_overdue: { color: 'text-red-600 bg-red-50 border-red-200',        Icon: AlertCircle },
  inventory:           { color: 'text-purple-600 bg-purple-50 border-purple-200', Icon: ShoppingBag },
};

export default function StudentStatement({ student, payments, installmentPlan, inventoryTx }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [txFilter, setTxFilter] = useState<TxFilter>('all');

  const paidAmount = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const remaining = Math.max(0, student.totalFees - paidAmount);

  // ── Timeline ───────────────────────────────────────────────────────────────
  const events = useMemo((): TimelineEvent[] => {
    const list: TimelineEvent[] = [];

    if (student.enrollmentDate) {
      list.push({
        id: 'enroll',
        date: student.enrollmentDate,
        type: 'enrollment',
        label: `تم قبول الطالب — ${stageLabels[student.stage]} / ${student.grade}`,
      });
    }

    (student.yearlyFinance ?? []).forEach(yf => {
      list.push({
        id: `yf-${yf.id}`,
        date: `${yf.academicYear.slice(0, 4)}-09-01`,
        type: 'promotion',
        label: `نُقل للعام ${yf.academicYear} — ${stageLabels[yf.stage]} / ${yf.grade}`,
        subLabel: yf.arrearsFees > 0 ? `متأخرات مرحّلة: ${formatCurrency(yf.arrearsFees)}` : undefined,
        amount: yf.arrearsFees > 0 ? yf.arrearsFees : undefined,
      });
    });

    if (student.discountAmount > 0 && student.enrollmentDate) {
      list.push({
        id: 'discount',
        date: student.enrollmentDate,
        type: 'discount',
        label: `خصم معتمد ${student.discountPercentage}% — ${formatCurrency(student.discountAmount)}`,
      });
    }

    if (installmentPlan) {
      list.push({
        id: `plan-${installmentPlan.id}`,
        date: installmentPlan.createdDate,
        type: 'installment_plan',
        label: `إنشاء خطة أقساط — ${formatCurrency(installmentPlan.totalAmount)} / ${installmentPlan.numberOfInstallments} أقساط`,
      });
      const today = new Date().toISOString().split('T')[0];
      installmentPlan.installments.forEach(inst => {
        const overdue = (inst.status === 'pending' || inst.status === 'overdue') && inst.dueDate < today;
        if (overdue) {
          list.push({
            id: `overdue-${inst.id}`,
            date: inst.dueDate,
            type: 'installment_overdue',
            label: `قسط متأخر — استحق ${formatDateShort(inst.dueDate)}`,
            amount: inst.amount - (inst.paidAmount ?? 0),
          });
        }
      });
    }

    payments.forEach(p => {
      list.push({
        id: `pay-${p.id}`,
        date: p.date,
        type: 'payment',
        label: `دفعة ${paymentTypeLabels[p.type] ?? p.type} — ${paymentMethodLabels[p.method] ?? p.method}`,
        amount: p.amount,
      });
    });

    inventoryTx.forEach(tx => {
      list.push({
        id: `inv-${tx.id}`,
        date: tx.createdAt.slice(0, 10),
        type: 'inventory',
        label: `شراء ${tx.item?.name ?? tx.itemName ?? ''} × ${tx.quantity}`,
        amount: tx.totalAmount,
      });
    });

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [student, payments, installmentPlan, inventoryTx]);

  // ── Transactions table ─────────────────────────────────────────────────────
  const filteredTx = useMemo(() => {
    type TxRow = { id: string; date: string; type: string; label: string; amount: number; method?: string };
    const rows: TxRow[] = [];

    if (txFilter === 'all' || txFilter === 'payments') {
      payments.forEach(p => rows.push({
        id: p.id,
        date: p.date,
        type: paymentTypeLabels[p.type] ?? p.type,
        label: 'دفعة',
        amount: p.amount,
        method: paymentMethodLabels[p.method] ?? p.method,
      }));
    }
    if (txFilter === 'all' || txFilter === 'inventory') {
      inventoryTx.forEach(tx => rows.push({
        id: tx.id,
        date: tx.createdAt.slice(0, 10),
        type: 'مخزن',
        label: tx.item?.name ?? tx.itemName ?? '',
        amount: tx.totalAmount,
      }));
    }
    if (txFilter === 'all' || txFilter === 'installments') {
      installmentPlan?.installments.filter(i => i.status === 'paid').forEach(i => rows.push({
        id: i.id,
        date: i.paidDate ?? i.dueDate,
        type: 'قسط',
        label: 'تسديد قسط',
        amount: i.paidAmount ?? i.amount,
      }));
    }
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, [payments, inventoryTx, installmentPlan, txFilter]);

  // ── Print / PDF ────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const content = printRef.current?.innerHTML ?? '';
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html dir="rtl">
        <head>
          <title>كشف حساب — ${student.name}</title>
          <style>
            body { font-family: sans-serif; padding: 24px; direction: rtl; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; }
            td, th { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background: #f5f5f5; font-weight: 600; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.print();
    win.close();
  };

  const handleExportPdf = async () => {
    if (!printRef.current) return;
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);
    const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = (canvas.height * pdfW) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
    pdf.save(`كشف-حساب-${student.name}.pdf`);
  };

  const filterLabels: Record<TxFilter, string> = {
    all: 'الكل', payments: 'مدفوعات', inventory: 'مخزن', installments: 'أقساط',
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="size-4 ml-1" />طباعة
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPdf}>
          <Download className="size-4 ml-1" />تصدير PDF
        </Button>
      </div>

      <div ref={printRef} className="space-y-6">
        {/* 1. Financial Summary */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-bold font-[Noto_Kufi_Arabic] mb-3">الملخص المالي</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-muted/30 rounded p-3">
              <p className="text-muted-foreground text-xs mb-1">إجمالي الرسوم</p>
              <p className="font-bold tabular-nums">{formatCurrency(student.totalFees)}</p>
            </div>
            <div className="bg-emerald-50 rounded p-3">
              <p className="text-muted-foreground text-xs mb-1">المدفوع</p>
              <p className="font-bold text-emerald-600 tabular-nums">{formatCurrency(paidAmount)}</p>
            </div>
            <div className="bg-red-50 rounded p-3">
              <p className="text-muted-foreground text-xs mb-1">المتبقي</p>
              <p className="font-bold text-red-600 tabular-nums">{formatCurrency(remaining)}</p>
            </div>
            {student.discountAmount > 0 && (
              <div className="bg-green-50 rounded p-3">
                <p className="text-muted-foreground text-xs mb-1">الخصم المعتمد</p>
                <p className="font-bold text-green-600 tabular-nums">{formatCurrency(student.discountAmount)}</p>
              </div>
            )}
            {student.arrearsFees > 0 && (
              <div className="bg-amber-50 rounded p-3">
                <p className="text-muted-foreground text-xs mb-1">متأخرات سابقة</p>
                <p className="font-bold text-amber-600 tabular-nums">{formatCurrency(student.arrearsFees)}</p>
              </div>
            )}
          </div>
        </div>

        {/* 2. Student Journey Timeline */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-bold font-[Noto_Kufi_Arabic] mb-4">رحلة الطالب</h3>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">لا توجد أحداث مسجلة</p>
          ) : (
            <div className="relative">
              <div className="absolute right-[18px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-4">
                {events.map(ev => {
                  const { color, Icon } = eventConfig[ev.type];
                  return (
                    <div key={ev.id} className="flex items-start gap-3 relative">
                      <span className={`relative z-10 flex items-center justify-center size-9 rounded-full border-2 shrink-0 ${color}`}>
                        <Icon className="size-4" />
                      </span>
                      <div className="flex-1 pt-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{ev.label}</p>
                        {ev.subLabel && (
                          <p className="text-xs text-red-600 mt-0.5">{ev.subLabel}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDateShort(ev.date)}</p>
                      </div>
                      {ev.amount != null && (
                        <span className={`text-sm font-bold tabular-nums pt-1 shrink-0 ${
                          ev.type === 'installment_overdue' ? 'text-red-600'
                          : ev.type === 'payment' ? 'text-emerald-600'
                          : 'text-foreground'
                        }`}>
                          {formatCurrency(ev.amount)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. Transactions Table */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-bold font-[Noto_Kufi_Arabic]">سجل المعاملات</h3>
            <div className="flex gap-1">
              {(Object.keys(filterLabels) as TxFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setTxFilter(f)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    txFilter === f
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {filterLabels[f]}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-right">
                  <th className="p-3 font-semibold">التاريخ</th>
                  <th className="p-3 font-semibold">النوع</th>
                  <th className="p-3 font-semibold">البيان</th>
                  <th className="p-3 font-semibold">المبلغ</th>
                  <th className="p-3 font-semibold">طريقة الدفع</th>
                </tr>
              </thead>
              <tbody>
                {filteredTx.map(row => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 tabular-nums">{formatDateShort(row.date)}</td>
                    <td className="p-3">{row.type}</td>
                    <td className="p-3">{row.label}</td>
                    <td className="p-3 tabular-nums font-medium">{formatCurrency(row.amount)}</td>
                    <td className="p-3 text-muted-foreground">{row.method ?? '—'}</td>
                  </tr>
                ))}
                {filteredTx.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      لا توجد معاملات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
