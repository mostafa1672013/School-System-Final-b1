import type { Payment } from '@/types';
import { formatCurrency, formatDate, paymentTypeLabels, paymentMethodLabels } from '@/lib/utils';

interface ReceiptData {
  receiptNumber: string;
  studentName: string;
  amount: number;
  date: string;
  type: string;
  method: string;
  collectedBy: string;
  notes?: string;
  grade?: string;
  guardianName?: string;
}

export function printReceipt(data: ReceiptData) {
  const printWindow = window.open('', '_blank', 'width=420,height=600');
  if (!printWindow) return;

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>إيصال دفع - ${data.receiptNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Tajawal', sans-serif;
      background: #fff;
      color: #1a1a2e;
      padding: 0;
    }
    .receipt {
      width: 380px;
      margin: 0 auto;
      padding: 24px 20px;
    }
    .header {
      text-align: center;
      padding-bottom: 16px;
      border-bottom: 3px double #0d9488;
      margin-bottom: 16px;
    }
    .logo-circle {
      width: 56px; height: 56px;
      background: linear-gradient(135deg, #0d9488, #115e59);
      border-radius: 50%;
      margin: 0 auto 10px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 22px; font-weight: 700;
      font-family: 'Noto Kufi Arabic', sans-serif;
    }
    .school-name {
      font-family: 'Noto Kufi Arabic', sans-serif;
      font-size: 20px; font-weight: 700;
      color: #0d9488;
      margin-bottom: 2px;
    }
    .school-sub {
      font-size: 11px; color: #6b7280;
    }
    .receipt-title {
      text-align: center;
      background: #f0fdfa;
      border: 1px solid #ccfbf1;
      border-radius: 8px;
      padding: 8px;
      margin-bottom: 16px;
    }
    .receipt-title h2 {
      font-family: 'Noto Kufi Arabic', sans-serif;
      font-size: 16px; font-weight: 700;
      color: #115e59;
    }
    .receipt-title .rec-num {
      font-size: 13px; color: #0d9488;
      font-weight: 600;
      margin-top: 2px;
      direction: ltr; display: inline-block;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 16px;
    }
    .info-item {
      background: #f8fafc;
      border-radius: 6px;
      padding: 10px;
    }
    .info-item.full { grid-column: 1 / -1; }
    .info-label {
      font-size: 10px; color: #9ca3af;
      font-weight: 500;
      margin-bottom: 3px;
    }
    .info-value {
      font-size: 13px; font-weight: 600;
      color: #1a1a2e;
    }
    .amount-box {
      text-align: center;
      background: linear-gradient(135deg, #f0fdfa, #ccfbf1);
      border: 2px solid #0d9488;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .amount-label {
      font-size: 12px; color: #115e59;
      font-weight: 500;
      margin-bottom: 4px;
    }
    .amount-value {
      font-family: 'Noto Kufi Arabic', sans-serif;
      font-size: 28px; font-weight: 700;
      color: #0d9488;
      direction: ltr; display: inline-block;
    }
    .notes {
      background: #fffbeb;
      border-radius: 6px;
      padding: 10px;
      font-size: 12px;
      color: #92400e;
      margin-bottom: 16px;
    }
    .notes strong { font-weight: 600; }
    .divider {
      border: none;
      border-top: 1px dashed #d1d5db;
      margin: 16px 0;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      padding-top: 8px;
    }
    .sig-block {
      text-align: center;
      width: 45%;
    }
    .sig-line {
      border-top: 1px solid #9ca3af;
      margin-bottom: 4px;
      margin-top: 32px;
    }
    .sig-label {
      font-size: 11px; color: #6b7280;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 12px;
      border-top: 3px double #0d9488;
    }
    .footer p {
      font-size: 10px; color: #9ca3af;
    }
    .footer .stamp {
      font-size: 11px;
      color: #0d9488;
      font-weight: 600;
      margin-bottom: 4px;
    }
    @media print {
      body { padding: 0; }
      .receipt { width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="logo-circle">م</div>
      <div class="school-name">مدرسة مدرستي</div>
      <div class="school-sub">نظام الإدارة المدرسية المتكامل</div>
    </div>

    <div class="receipt-title">
      <h2>إيصال دفع</h2>
      <div class="rec-num">${data.receiptNumber}</div>
    </div>

    <div class="info-grid">
      <div class="info-item full">
        <div class="info-label">اسم الطالب</div>
        <div class="info-value">${data.studentName}</div>
      </div>
      ${data.grade ? `
      <div class="info-item">
        <div class="info-label">الصف</div>
        <div class="info-value">${data.grade}</div>
      </div>` : ''}
      ${data.guardianName ? `
      <div class="info-item">
        <div class="info-label">ولي الأمر</div>
        <div class="info-value">${data.guardianName}</div>
      </div>` : ''}
      <div class="info-item">
        <div class="info-label">التاريخ</div>
        <div class="info-value">${formatDate(data.date)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">نوع الدفع</div>
        <div class="info-value">${paymentTypeLabels[data.type] || data.type}</div>
      </div>
      <div class="info-item">
        <div class="info-label">طريقة الدفع</div>
        <div class="info-value">${paymentMethodLabels[data.method] || data.method}</div>
      </div>
      <div class="info-item">
        <div class="info-label">المحصّل</div>
        <div class="info-value">${data.collectedBy}</div>
      </div>
    </div>

    <div class="amount-box">
      <div class="amount-label">المبلغ المدفوع</div>
      <div class="amount-value">${formatCurrency(data.amount)}</div>
    </div>

    ${data.notes ? `
    <div class="notes">
      <strong>ملاحظات:</strong> ${data.notes}
    </div>` : ''}

    <div class="signatures">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">توقيع المحصّل</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">توقيع ولي الأمر</div>
      </div>
    </div>

    <div class="footer">
      <p class="stamp">هذا الإيصال صادر إلكترونياً من نظام مدرستي</p>
      <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  </div>

  <div class="no-print" style="text-align:center; margin-top:16px;">
    <button onclick="window.print()" style="background:#0d9488; color:#fff; border:none; padding:10px 32px; border-radius:8px; font-size:14px; font-family:Tajawal; cursor:pointer; font-weight:600;">
      🖨️ طباعة الإيصال
    </button>
    <button onclick="window.close()" style="background:#e5e7eb; color:#374151; border:none; padding:10px 32px; border-radius:8px; font-size:14px; font-family:Tajawal; cursor:pointer; margin-right:8px; font-weight:600;">
      إغلاق
    </button>
  </div>

  <script>
    window.onafterprint = function() {};
  </script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}

export function printPaymentReceipt(payment: Payment, extra?: { grade?: string; guardianName?: string }) {
  printReceipt({
    receiptNumber: payment.receiptNumber,
    studentName: payment.studentName,
    amount: payment.amount,
    date: payment.date,
    type: payment.type,
    method: payment.method,
    collectedBy: payment.collectedBy,
    notes: payment.notes,
    grade: extra?.grade,
    guardianName: extra?.guardianName,
  });
}
