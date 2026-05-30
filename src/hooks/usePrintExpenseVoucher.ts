import { useCallback } from 'react';
import type { Expense } from '@/types';
import { formatCurrency, formatDateShort } from '@/lib/utils';

export function usePrintExpenseVoucher() {
  const printVoucher = useCallback((expense: Expense) => {
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>سند صرف - ${expense.id.slice(0, 8)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #e5e7eb;
      color: #1f2937;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    .receipt-card {
      background: #ffffff;
      width: 100%;
      max-width: 800px;
      padding: 40px 50px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      position: relative;
      border-top: 8px solid #0f766e;
      border-radius: 4px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .school-info {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .logo {
      width: 65px;
      height: 65px;
      background: #0f766e;
      color: white;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: bold;
    }
    .school-details h1 {
      font-size: 24px;
      color: #0f766e;
      margin-bottom: 6px;
    }
    .school-details p {
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 2px;
    }
    .receipt-meta {
      text-align: left;
    }
    .receipt-meta h2 {
      font-size: 28px;
      color: #374151;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
    }
    .meta-item {
      font-size: 14px;
      color: #4b5563;
      margin-bottom: 6px;
    }
    .meta-item strong {
      color: #111827;
      display: inline-block;
      width: 80px;
    }
    .info-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 30px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
    }
    .info-group {
      display: flex;
      flex-direction: column;
    }
    .info-label {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .details-table th {
      background: #f1f5f9;
      color: #334155;
      font-size: 14px;
      font-weight: 600;
      text-align: right;
      padding: 14px 16px;
      border-bottom: 2px solid #cbd5e1;
    }
    .details-table td {
      padding: 16px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 15px;
      color: #1e293b;
    }
    .details-table td.amount-col {
      font-weight: 700;
      font-family: monospace;
      font-size: 18px;
    }
    .totals-area {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }
    .total-box {
      background: #0f766e;
      color: white;
      padding: 20px 30px;
      border-radius: 8px;
      text-align: center;
      min-width: 280px;
    }
    .total-label {
      font-size: 15px;
      margin-bottom: 8px;
      opacity: 0.9;
    }
    .total-amount {
      font-size: 36px;
      font-weight: bold;
      direction: ltr;
      display: inline-block;
    }
    .notes-section {
      margin-bottom: 40px;
      padding-right: 16px;
      border-right: 4px solid #cbd5e1;
      background: #f8fafc;
      padding: 16px;
      border-radius: 4px;
    }
    .notes-section h4 {
      font-size: 15px;
      color: #475569;
      margin-bottom: 8px;
    }
    .notes-section p {
      font-size: 14px;
      color: #64748b;
      line-height: 1.6;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 60px;
      padding-top: 30px;
      border-top: 1px dashed #cbd5e1;
    }
    .sig-box {
      text-align: center;
      width: 30%;
    }
    .sig-line {
      height: 1px;
      background: #94a3b8;
      margin-bottom: 12px;
      margin-top: 50px;
    }
    .sig-title {
      font-size: 14px;
      color: #475569;
      font-weight: 600;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
    .no-print {
      margin-top: 24px;
      display: flex;
      gap: 12px;
      justify-content: center;
      width: 100%;
      max-width: 800px;
    }
    .btn {
      padding: 12px 28px;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: inherit;
    }
    .btn-print { background: #0f766e; color: white; box-shadow: 0 4px 6px -1px rgba(15, 118, 110, 0.2); }
    .btn-close { background: #e2e8f0; color: #475569; }
    .btn:hover { opacity: 0.9; transform: translateY(-1px); }

    @media print {
      body { background: white; padding: 0; display: block; }
      .receipt-card { box-shadow: none; max-width: 100%; padding: 0; border-top: 0; }
      .receipt-card::before {
        content: '';
        display: block;
        height: 8px;
        background: #0f766e !important;
        margin-bottom: 30px;
      }
      .no-print { display: none !important; }
      .total-box { border: 2px solid #0f766e; color: #0f766e; background: transparent !important; }
      .total-label { color: #0f766e; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="header">
      <div class="school-info">
        <div class="logo">ش</div>
        <div class="school-details">
          <h1>مدرسة الشروق</h1>
          <p>نظام الإدارة المدرسية المتكامل</p>
          <p>إدارة الحسابات والخزينة</p>
        </div>
      </div>
      <div class="receipt-meta">
        <h2>سند صرف</h2>
        <div class="meta-item"><strong>رقم السند:</strong> <span dir="ltr">${expense.id.slice(0, 8).toUpperCase()}</span></div>
        <div class="meta-item"><strong>التاريخ:</strong> ${formatDateShort(expense.date)}</div>
        <div class="meta-item"><strong>المُحاسب:</strong> ${expense.paidBy || 'موظف الخزينة'}</div>
      </div>
    </div>

    <div class="info-section">
      <div class="info-group">
        <span class="info-label">يصرف للسيد / السادة</span>
        <span class="info-value">________________________________________________</span>
      </div>
      <div class="info-group">
        <span class="info-label">الموظف الطالب للصرف</span>
        <span class="info-value">${expense.requestedBy}</span>
      </div>
    </div>

    <table class="details-table">
      <thead>
        <tr>
          <th>البيان (سبب الصرف)</th>
          <th>توجيه الحساب</th>
          <th style="text-align: left;">المبلغ</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${expense.description}</td>
          <td>${expense.account?.name || 'مصروفات تشغيلية'} (${expense.account?.code || ''})</td>
          <td class="amount-col" style="text-align: left;">${formatCurrency(expense.amount)}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals-area">
      <div class="total-box">
        <div class="total-label">إجمالي المبلغ المصروف</div>
        <div class="total-amount">${formatCurrency(expense.amount)}</div>
      </div>
    </div>

    ${expense.notes ? `
    <div class="notes-section">
      <h4>ملاحظات إضافية:</h4>
      <p>${expense.notes}</p>
    </div>` : ''}

    <div class="signatures">
      <div class="sig-box">
        <div class="sig-title">توقيع المستلم</div>
        <div class="sig-line"></div>
      </div>
      <div class="sig-box">
        <div class="sig-title">يعتمد (المدير المالي)</div>
        <div class="sig-line"></div>
        <div style="font-size: 11px; color: #94a3b8;">${expense.approvedBy || 'نظام آلي'}</div>
      </div>
      <div class="sig-box">
        <div class="sig-title">أمين الخزينة</div>
        <div class="sig-line"></div>
      </div>
    </div>

    <div class="footer">
      <p>تم إصدار هذا السند إلكترونياً من خلال نظام إدارة مدرسة الشروق</p>
      <p>تاريخ ووقت الطباعة: ${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  </div>

  <div class="no-print">
    <button class="btn btn-print" onclick="window.print()">طباعة السند</button>
    <button class="btn btn-close" onclick="window.close()">إغلاق</button>
  </div>
  <script>
    window.onafterprint = function() { setTimeout(function(){ window.close(); }, 500); };
  </script>
</body>
</html>`;

    try {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank', 'width=800,height=900');
      if (!printWindow) {
        URL.revokeObjectURL(url);
        alert('يرجى السماح للمتصفح بفتح النوافذ المنبثقة لإتمام الطباعة');
        return;
      }
      printWindow.addEventListener('load', () => {
        URL.revokeObjectURL(url);
        printWindow.focus();
      });
    } catch (e) {
      console.error('Print error:', e);
    }
  }, []);

  return { printVoucher };
}
