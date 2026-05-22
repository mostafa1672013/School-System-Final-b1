import type { TreasurySession } from '@/types';

export function usePrintTreasuryReport() {
  const printReport = (
    session: TreasurySession,
    payments: any[],
    expenses: any[],
    totals: { totalIncome: number; totalExpenses: number; currentBalance: number }
  ) => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: 'EGP'
      }).format(amount);
    };

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('ar-EG');
    };

    const paymentRows = payments
      .map(
        (p) =>
          `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${p.studentName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${p.type}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${formatCurrency(p.amount)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${p.receiptNumber}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${p.collectedBy}</td>
      </tr>`
      )
      .join('');

    const expenseRows = expenses
      .map(
        (e) =>
          `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${e.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${e.account?.name || 'N/A'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${formatCurrency(e.amount)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${e.paidBy}</td>
      </tr>`
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تقرير جلسة الخزينة - ${session.date}</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      direction: rtl;
      text-align: right;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background-color: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1, h2, h3 {
      color: #333;
      margin-top: 0;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #003366;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .summary {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin: 30px 0;
    }
    .summary-card {
      background-color: #f9f9f9;
      padding: 15px;
      border-right: 4px solid #003366;
      border-radius: 4px;
    }
    .summary-card h4 {
      margin: 0 0 10px 0;
      color: #666;
      font-size: 14px;
    }
    .summary-card .amount {
      font-size: 24px;
      font-weight: bold;
      color: #003366;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    table thead {
      background-color: #f0f0f0;
    }
    table th {
      padding: 12px;
      text-align: right;
      font-weight: bold;
      border-bottom: 2px solid #ddd;
    }
    table td {
      padding: 8px;
      border-bottom: 1px solid #ddd;
    }
    .difference-warning {
      background-color: #fff3cd;
      border: 1px solid #ffc107;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .difference-warning.positive {
      background-color: #d4edda;
      border-color: #28a745;
    }
    .footer {
      margin-top: 40px;
      border-top: 2px solid #ddd;
      padding-top: 20px;
      display: flex;
      justify-content: space-around;
    }
    .signature {
      text-align: center;
      width: 30%;
    }
    .signature-line {
      margin-top: 40px;
      border-top: 1px solid #333;
      padding-top: 10px;
    }
    .print-only {
      display: none;
    }
    @media print {
      body {
        background-color: white;
      }
      .print-only {
        display: block;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 تقرير جلسة الخزينة اليومية</h1>
      <p style="margin: 10px 0; color: #666;">التاريخ: ${formatDate(session.date)}</p>
    </div>

    <div class="summary">
      <div class="summary-card">
        <h4>الرصيد الافتتاحي</h4>
        <div class="amount">${formatCurrency(session.openingBalance)}</div>
      </div>
      <div class="summary-card">
        <h4>إجمالي المقبوضات</h4>
        <div class="amount" style="color: #28a745;">${formatCurrency(totals.totalIncome)}</div>
      </div>
      <div class="summary-card">
        <h4>إجمالي المصروفات</h4>
        <div class="amount" style="color: #dc3545;">-${formatCurrency(totals.totalExpenses)}</div>
      </div>
    </div>

    <div class="summary">
      <div class="summary-card">
        <h4>الرصيد المتوقع</h4>
        <div class="amount">${formatCurrency(session.closingBalance || 0)}</div>
      </div>
      <div class="summary-card">
        <h4>الرصيد الفعلي</h4>
        <div class="amount">${formatCurrency(session.actualBalance || 0)}</div>
      </div>
      <div class="summary-card">
        <h4>الفرق</h4>
        <div class="amount" style="color: ${session.difference === 0 ? '#28a745' : '#dc3545'};
">
          ${session.difference === 0 ? '✓ متطابق' : formatCurrency(session.difference || 0)}
        </div>
      </div>
    </div>

    ${
      session.difference !== 0 && session.closureNote
        ? `<div class="difference-warning">
      <strong>📝 ملاحظة الإغلاق:</strong>
      <p>${session.closureNote}</p>
      <p style="font-size: 12px; margin-bottom: 0;">تم الموافقة من قبل: ${session.approvedBy || 'N/A'}</p>
    </div>`
        : ''
    }

    <h3>📥 المقبوضات (عدد: ${payments.length})</h3>
    <table>
      <thead>
        <tr>
          <th>اسم الطالب</th>
          <th>النوع</th>
          <th>المبلغ</th>
          <th>رقم الإيصال</th>
          <th>المحصل</th>
        </tr>
      </thead>
      <tbody>
        ${paymentRows}
      </tbody>
    </table>

    <h3>📤 المصروفات (عدد: ${expenses.length})</h3>
    <table>
      <thead>
        <tr>
          <th>البيان</th>
          <th>الحساب</th>
          <th>المبلغ</th>
          <th>الصارف</th>
        </tr>
      </thead>
      <tbody>
        ${expenseRows}
      </tbody>
    </table>

    <div class="footer">
      <div class="signature">
        <h4>أمين الخزينة</h4>
        <p style="font-size: 12px;">${session.openedByName || session.openedBy}</p>
        <div class="signature-line"></div>
      </div>
      <div class="signature">
        <h4>رئيس المحاسبين</h4>
        <p style="font-size: 12px;">${session.closedBy || '___________'}</p>
        <div class="signature-line"></div>
      </div>
      <div class="signature">
        <h4>المدير</h4>
        <p style="font-size: 12px;">${session.approvedBy || '___________'}</p>
        <div class="signature-line"></div>
      </div>
    </div>
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>
    `;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'width=900,height=800');
  };

  return { printReport };
}
