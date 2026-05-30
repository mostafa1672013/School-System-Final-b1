import type { InventoryItem } from '@/types';

export function usePrintInventoryReport() {
  const printReport = (items: InventoryItem[], categoryMap: Record<string, string>, schoolName = 'مدرسة الشروق') => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: 'EGP'
      }).format(amount);
    };

    const totalValue = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
    const lowStockItems = items.filter(i => i.quantity <= i.minQuantity);

    const itemTypeMap: Record<string, string> = {
      sale: '🛍️ للبيع',
      consumable: '📦 استهلاكي'
    };

    const itemRows = items
      .map(
        (item) =>
          `<tr style="${item.quantity <= item.minQuantity ? 'background-color: #fff3cd;' : ''}">
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: ${item.quantity <= item.minQuantity ? 'bold' : 'normal'};">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${categoryMap[item.category] || item.category}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${itemTypeMap[item.itemType] || item.itemType}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity} ${item.unit}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${formatCurrency(item.unitCost)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${formatCurrency(item.quantity * item.unitCost)}</td>
      </tr>`
      )
      .join('');

    const lowStockRows = lowStockItems
      .map(
        (item) =>
          `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity} ${item.unit}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.minQuantity} ${item.unit}</td>
      </tr>`
      )
      .join('');

    const today = new Date().toLocaleDateString('ar-EG');

    const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تقرير المخزن</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      direction: rtl;
      text-align: right;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 1000px;
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
      border-bottom: 2px solid #1e40af;
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
      border-right: 4px solid #1e40af;
      border-radius: 4px;
    }
    .summary-card h4 {
      margin: 0 0 10px 0;
      color: #666;
      font-size: 14px;
    }
    .summary-card .amount {
      font-size: 20px;
      font-weight: bold;
      color: #1e40af;
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
      background-color: #e0e7ff;
    }
    table td {
      padding: 10px;
      border-bottom: 1px solid #ddd;
    }
    .low-stock-warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .low-stock-warning h4 {
      margin: 0 0 10px 0;
      color: #92400e;
    }
    .footer {
      margin-top: 40px;
      border-top: 2px solid #ddd;
      padding-top: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    @media print {
      body {
        background-color: white;
      }
      .container {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📦 تقرير المخزن</h1>
      <p style="margin: 10px 0; color: #666;">${schoolName}</p>
      <p style="margin: 5px 0; color: #999; font-size: 14px;">التاريخ: ${today}</p>
    </div>

    <div class="summary">
      <div class="summary-card">
        <h4>إجمالي الأصناف</h4>
        <div class="amount">${items.length}</div>
      </div>
      <div class="summary-card">
        <h4>قيمة المخزن</h4>
        <div class="amount" style="color: #16a34a;">${formatCurrency(totalValue)}</div>
      </div>
      <div class="summary-card">
        <h4>أصناف تحت الحد الأدنى</h4>
        <div class="amount" style="color: #dc2626;">${lowStockItems.length}</div>
      </div>
    </div>

    ${
      lowStockItems.length > 0
        ? `<div class="low-stock-warning">
      <h4>⚠️ أصناف تحت الحد الأدنى (${lowStockItems.length})</h4>
      <table>
        <thead>
          <tr>
            <th>اسم الصنف</th>
            <th>الكمية الحالية</th>
            <th>الحد الأدنى</th>
          </tr>
        </thead>
        <tbody>
          ${lowStockRows}
        </tbody>
      </table>
    </div>`
        : ''
    }

    <h3>📊 قائمة الأصناف</h3>
    <table>
      <thead>
        <tr>
          <th>اسم الصنف</th>
          <th>التصنيف</th>
          <th>النوع</th>
          <th>الكمية</th>
          <th>تكلفة الوحدة</th>
          <th>إجمالي القيمة</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="footer">
      <p>هذا التقرير تم إنشاؤه تلقائياً من نظام إدارة المدرسة</p>
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
    window.open(url, '_blank', 'width=1000,height=800');
  };

  return { printReport };
}
