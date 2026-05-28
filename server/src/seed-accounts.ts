import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * شجرة الحسابات الرسمية — مدرسة الشروق
 * ===========================================
 * المستوى ١: الفئات الرئيسية (١، ٢، ٣، ٤، ٥)
 * المستوى ٢: المجموعات  (١١، ١٢، ... إلخ)
 * المستوى ٣: الحسابات الفرعية (١١٠٠، ٢١٠٠، ... إلخ)
 * المستوى ٤: الحسابات التفصيلية — يُجرى عليها القيود فعلياً
 *
 * الأكواد الحرجة المستخدمة في كود التطبيق:
 *   1001 → نقدية صندوق (Cash)             ← مدين في كل مقبوضة نقدية
 *   1002 → محفظة إلكترونية (E-Wallet)     ← مدين في كل مقبوضة محفظة
 *   1300 → مخزون سلع                      ← مستخدم في المخزون
 *   2001 → موردون                          ← مستخدم في مشتريات المخزون
 *   4001 → إيرادات رسوم دراسية             ← دائن عند تحصيل مصاريف
 *   4002 → إيرادات كتب                     ← دائن عند تحصيل كتب
 *   4003 → إيرادات زي مدرسي                ← دائن عند تحصيل زي
 *   4004 → إيرادات نقل مدرسي               ← دائن عند تحصيل نقل
 *   4005 → رسوم قبول وتسجيل                ← دائن عند تحصيل رسوم ملف
 *   4006 → إيرادات أخرى                    ← دائن للأنواع الأخرى
 *   5001 → تكلفة البضاعة المباعة (COGS)    ← مدين عند بيع مخزون
 *   5002 → مصروفات استهلاك داخلي           ← مدين عند صرف مستلزمات
 */
const accounts = [
  // ═══════════════════════════════════════
  // المستوى ١ — الفئات الرئيسية الخمس
  // ═══════════════════════════════════════
  { code: '1', name: 'الأصول', nameEn: 'Assets', type: 'asset', level: 1, normalBalance: 'debit' },
  { code: '2', name: 'الالتزامات', nameEn: 'Liabilities', type: 'liability', level: 1, normalBalance: 'credit' },
  { code: '3', name: 'حقوق الملكية', nameEn: 'Equity', type: 'equity', level: 1, normalBalance: 'credit' },
  { code: '4', name: 'الإيرادات', nameEn: 'Revenue', type: 'revenue', level: 1, normalBalance: 'credit' },
  { code: '5', name: 'المصروفات', nameEn: 'Expenses', type: 'expense', level: 1, normalBalance: 'debit' },

  // ═══════════════════════════════════════
  // المستوى ٢ — المجموعات
  // ═══════════════════════════════════════
  { code: '11', name: 'أصول متداولة', nameEn: 'Current Assets', type: 'asset', level: 2, normalBalance: 'debit', parentCode: '1' },
  { code: '12', name: 'أصول ثابتة', nameEn: 'Fixed Assets', type: 'asset', level: 2, normalBalance: 'debit', parentCode: '1' },
  { code: '21', name: 'خصوم متداولة', nameEn: 'Current Liabilities', type: 'liability', level: 2, normalBalance: 'credit', parentCode: '2' },
  { code: '22', name: 'خصوم طويلة الأجل', nameEn: 'Long-term Liabilities', type: 'liability', level: 2, normalBalance: 'credit', parentCode: '2' },
  { code: '31', name: 'رأس المال', nameEn: 'Capital', type: 'equity', level: 2, normalBalance: 'credit', parentCode: '3' },
  { code: '32', name: 'احتياطيات وأرباح', nameEn: 'Reserves & Earnings', type: 'equity', level: 2, normalBalance: 'credit', parentCode: '3' },
  { code: '41', name: 'إيرادات الرسوم الدراسية', nameEn: 'Tuition Revenue', type: 'revenue', level: 2, normalBalance: 'credit', parentCode: '4' },
  { code: '42', name: 'إيرادات المبيعات', nameEn: 'Sales Revenue', type: 'revenue', level: 2, normalBalance: 'credit', parentCode: '4' },
  { code: '43', name: 'إيرادات أخرى', nameEn: 'Other Revenue', type: 'revenue', level: 2, normalBalance: 'credit', parentCode: '4' },
  { code: '51', name: 'تكلفة البضاعة المباعة', nameEn: 'Cost of Goods Sold', type: 'expense', level: 2, normalBalance: 'debit', parentCode: '5' },
  { code: '52', name: 'رواتب وأجور', nameEn: 'Salaries & Wages', type: 'expense', level: 2, normalBalance: 'debit', parentCode: '5' },
  { code: '53', name: 'مصروفات إدارية وتشغيلية', nameEn: 'Admin & Operational', type: 'expense', level: 2, normalBalance: 'debit', parentCode: '5' },
  { code: '54', name: 'مصروفات النقل', nameEn: 'Transport Expenses', type: 'expense', level: 2, normalBalance: 'debit', parentCode: '5' },
  { code: '55', name: 'مصروفات تعليمية', nameEn: 'Educational Expenses', type: 'expense', level: 2, normalBalance: 'debit', parentCode: '5' },
  { code: '56', name: 'إهلاكات', nameEn: 'Depreciation', type: 'expense', level: 2, normalBalance: 'debit', parentCode: '5' },
  { code: '59', name: 'مصروفات متنوعة', nameEn: 'Miscellaneous', type: 'expense', level: 2, normalBalance: 'debit', parentCode: '5' },

  // ═══════════════════════════════════════
  // المستوى ٣ — الحسابات الفرعية
  // ═══════════════════════════════════════

  // ── أصول متداولة ──
  { code: '1100', name: 'النقدية والبنوك', nameEn: 'Cash & Banks', type: 'asset', level: 3, normalBalance: 'debit', parentCode: '11' },
  { code: '1200', name: 'ذمم مدينة - طلاب', nameEn: 'Student Receivables', type: 'asset', level: 3, normalBalance: 'debit', parentCode: '11' },
  { code: '1300', name: 'مخزون سلع', nameEn: 'Goods Inventory', type: 'asset', level: 3, normalBalance: 'debit', parentCode: '11', isSystemAccount: true, allowManualEntry: false },
  { code: '1400', name: 'مصروفات مدفوعة مقدماً', nameEn: 'Prepaid Expenses', type: 'asset', level: 3, normalBalance: 'debit', parentCode: '11' },

  // ── أصول ثابتة ──
  { code: '1500', name: 'أصول ثابتة - تكلفة', nameEn: 'Fixed Assets - Cost', type: 'asset', level: 3, normalBalance: 'debit', parentCode: '12' },
  { code: '1600', name: 'مجمع الإهلاك', nameEn: 'Accumulated Depreciation', type: 'asset', level: 3, normalBalance: 'credit', parentCode: '12' },

  // ── خصوم ──
  { code: '2100', name: 'دائنون تجاريون', nameEn: 'Trade Payables', type: 'liability', level: 3, normalBalance: 'credit', parentCode: '21' },
  { code: '2200', name: 'رواتب مستحقة', nameEn: 'Accrued Salaries', type: 'liability', level: 3, normalBalance: 'credit', parentCode: '21' },
  { code: '2300', name: 'إيرادات مقبوضة مقدماً', nameEn: 'Deferred Revenue', type: 'liability', level: 3, normalBalance: 'credit', parentCode: '21' },
  { code: '2400', name: 'ضرائب وتأمينات مستحقة', nameEn: 'Tax & Insurance Payable', type: 'liability', level: 3, normalBalance: 'credit', parentCode: '21' },

  // ── حقوق الملكية ──
  { code: '3100', name: 'رأس المال المدفوع', nameEn: 'Paid-in Capital', type: 'equity', level: 3, normalBalance: 'credit', parentCode: '31' },
  { code: '3200', name: 'الأرباح المحتجزة', nameEn: 'Retained Earnings', type: 'equity', level: 3, normalBalance: 'credit', parentCode: '32' },
  { code: '3300', name: 'احتياطي قانوني', nameEn: 'Legal Reserve', type: 'equity', level: 3, normalBalance: 'credit', parentCode: '32' },

  // ── إيرادات ──
  { code: '4100', name: 'رسوم دراسية ورسوم التحاق', nameEn: 'Tuition & Application Fees', type: 'revenue', level: 3, normalBalance: 'credit', parentCode: '41' },
  { code: '4200', name: 'مبيعات مخزون (كتب، زي)', nameEn: 'Inventory Sales', type: 'revenue', level: 3, normalBalance: 'credit', parentCode: '42' },
  { code: '4300', name: 'إيرادات نقل واشتراكات', nameEn: 'Transport & Subscriptions', type: 'revenue', level: 3, normalBalance: 'credit', parentCode: '43' },
  { code: '4400', name: 'إيرادات أخرى متنوعة', nameEn: 'Miscellaneous Income', type: 'revenue', level: 3, normalBalance: 'credit', parentCode: '43' },

  // ── مصروفات ──
  { code: '5100', name: 'تكلفة المبيعات', nameEn: 'Cost of Sales', type: 'expense', level: 3, normalBalance: 'debit', parentCode: '51' },
  { code: '5200', name: 'رواتب المدرسين والإداريين', nameEn: 'Teaching & Admin Salaries', type: 'expense', level: 3, normalBalance: 'debit', parentCode: '52' },
  { code: '5300', name: 'مصروفات إدارية عامة', nameEn: 'General Admin Expenses', type: 'expense', level: 3, normalBalance: 'debit', parentCode: '53' },
  { code: '5400', name: 'مصروفات استهلاك داخلي', nameEn: 'Internal Consumption', type: 'expense', level: 3, normalBalance: 'debit', parentCode: '53' },
  { code: '5500', name: 'مصروفات إيجار حافلات', nameEn: 'Bus Rental Costs', type: 'expense', level: 3, normalBalance: 'debit', parentCode: '54' },
  { code: '5600', name: 'مصروفات تعليمية وأنشطة', nameEn: 'Educational & Activities', type: 'expense', level: 3, normalBalance: 'debit', parentCode: '55' },
  { code: '5700', name: 'إهلاك الأصول الثابتة', nameEn: 'Fixed Asset Depreciation', type: 'expense', level: 3, normalBalance: 'debit', parentCode: '56' },
  { code: '5900', name: 'مصروفات متنوعة وطوارئ', nameEn: 'Misc & Emergency Expenses', type: 'expense', level: 3, normalBalance: 'debit', parentCode: '59' },

  // ═══════════════════════════════════════════════════════════════════════════
  // المستوى ٤ — الحسابات التفصيلية (يُجرى عليها القيد الفعلي)
  // ملاحظة: الأكواد القصيرة (1001, 1002, 4001...) هي المُستخدمة في الكود
  // ═══════════════════════════════════════════════════════════════════════════

  // ── نقدية وبنوك — الأكواد الحرجة ──
  { code: '1001', name: 'خزينة نقدية (صندوق)', nameEn: 'Cash Box', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1100', isSystemAccount: true, allowManualEntry: false },
  { code: '1002', name: 'محفظة إلكترونية', nameEn: 'E-Wallet', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1100', isSystemAccount: true, allowManualEntry: false },
  { code: '1003', name: 'حساب بنكي جاري', nameEn: 'Bank Current Account', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1100' },

  // ── ذمم مدينة ──
  { code: '1201', name: 'ذمم طلاب مدينة (رسوم مستحقة)', nameEn: 'Student Receivables', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1200', isSystemAccount: true },
  { code: '1202', name: 'سلف موظفين', nameEn: 'Employee Advances', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1200' },

  // ── مخزون تفصيلي ──
  { code: '1301', name: 'مخزون كتب', nameEn: 'Books Inventory', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1300', isSystemAccount: true, allowManualEntry: false },
  { code: '1302', name: 'مخزون زي مدرسي', nameEn: 'Uniform Inventory', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1300', isSystemAccount: true, allowManualEntry: false },
  { code: '1303', name: 'مخزون أدوات مكتبية', nameEn: 'Office Supplies Inventory', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1300', isSystemAccount: true, allowManualEntry: false },
  { code: '1304', name: 'مخزون مستلزمات معامل', nameEn: 'Lab Supplies Inventory', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1300', isSystemAccount: true, allowManualEntry: false },

  // ── أصول ثابتة ──
  { code: '1501', name: 'أراضي ومباني', nameEn: 'Land & Buildings', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1500' },
  { code: '1502', name: 'أثاث وتجهيزات', nameEn: 'Furniture & Fixtures', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1500' },
  { code: '1503', name: 'أجهزة وحواسب', nameEn: 'Equipment & Computers', type: 'asset', level: 4, normalBalance: 'debit', parentCode: '1500' },
  { code: '1601', name: 'مجمع إهلاك المباني', nameEn: 'Accum. Dep. - Buildings', type: 'asset', level: 4, normalBalance: 'credit', parentCode: '1600', isSystemAccount: true },
  { code: '1602', name: 'مجمع إهلاك الأثاث', nameEn: 'Accum. Dep. - Furniture', type: 'asset', level: 4, normalBalance: 'credit', parentCode: '1600', isSystemAccount: true },
  { code: '1603', name: 'مجمع إهلاك الأجهزة', nameEn: 'Accum. Dep. - Equipment', type: 'asset', level: 4, normalBalance: 'credit', parentCode: '1600', isSystemAccount: true },

  // ── خصوم — الكود الحرج 2001 ──
  { code: '2001', name: 'موردون (مشتريات مخزون)', nameEn: 'Suppliers Payable', type: 'liability', level: 4, normalBalance: 'credit', parentCode: '2100', isSystemAccount: true },
  { code: '2002', name: 'دائنو إيجار الحافلات', nameEn: 'Bus Rental Payable', type: 'liability', level: 4, normalBalance: 'credit', parentCode: '2100' },
  { code: '2201', name: 'رواتب مستحقة الدفع', nameEn: 'Accrued Salaries', type: 'liability', level: 4, normalBalance: 'credit', parentCode: '2200', isSystemAccount: true },
  { code: '2202', name: 'تأمينات اجتماعية مستحقة', nameEn: 'Social Insurance Payable', type: 'liability', level: 4, normalBalance: 'credit', parentCode: '2400', isSystemAccount: true },
  { code: '2203', name: 'ضرائب رواتب مستحقة', nameEn: 'Payroll Tax Payable', type: 'liability', level: 4, normalBalance: 'credit', parentCode: '2400', isSystemAccount: true },
  { code: '2301', name: 'رسوم مقبوضة مقدماً', nameEn: 'Deferred Tuition Fees', type: 'liability', level: 4, normalBalance: 'credit', parentCode: '2300' },

  // ── حقوق الملكية ──
  { code: '3001', name: 'رأس المال المدفوع', nameEn: 'Paid-in Capital', type: 'equity', level: 4, normalBalance: 'credit', parentCode: '3100', isSystemAccount: true },
  { code: '3201', name: 'أرباح محتجزة', nameEn: 'Retained Earnings', type: 'equity', level: 4, normalBalance: 'credit', parentCode: '3200', isSystemAccount: true },
  { code: '3202', name: 'أرباح/خسائر السنة الحالية', nameEn: 'Current Year P&L', type: 'equity', level: 4, normalBalance: 'credit', parentCode: '3200', isSystemAccount: true },
  { code: '3301', name: 'احتياطي قانوني', nameEn: 'Legal Reserve', type: 'equity', level: 4, normalBalance: 'credit', parentCode: '3300' },

  // ── إيرادات — الأكواد الحرجة 4001-4006 ──
  { code: '4001', name: 'إيرادات رسوم دراسية', nameEn: 'Tuition Fee Revenue', type: 'revenue', level: 4, normalBalance: 'credit', parentCode: '4100', isSystemAccount: true, allowManualEntry: false },
  { code: '4002', name: 'إيرادات كتب مدرسية', nameEn: 'Books Revenue', type: 'revenue', level: 4, normalBalance: 'credit', parentCode: '4200', isSystemAccount: true, allowManualEntry: false },
  { code: '4003', name: 'إيرادات زي مدرسي', nameEn: 'Uniform Revenue', type: 'revenue', level: 4, normalBalance: 'credit', parentCode: '4200', isSystemAccount: true, allowManualEntry: false },
  { code: '4004', name: 'إيرادات نقل مدرسي', nameEn: 'Bus Revenue', type: 'revenue', level: 4, normalBalance: 'credit', parentCode: '4300', isSystemAccount: true, allowManualEntry: false },
  { code: '4005', name: 'رسوم قبول وتسجيل (ملف)', nameEn: 'Application & Reg. Fees', type: 'revenue', level: 4, normalBalance: 'credit', parentCode: '4100', isSystemAccount: true, allowManualEntry: false },
  { code: '4006', name: 'إيرادات أخرى', nameEn: 'Other Revenue', type: 'revenue', level: 4, normalBalance: 'credit', parentCode: '4400', isSystemAccount: true, allowManualEntry: false },
  { code: '4007', name: 'إيرادات فوائد بنكية', nameEn: 'Bank Interest Income', type: 'revenue', level: 4, normalBalance: 'credit', parentCode: '4400' },

  // ── مصروفات — الأكواد الحرجة 5001-5003 ──
  { code: '5001', name: 'تكلفة البضاعة المباعة (COGS)', nameEn: 'Cost of Goods Sold', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5100', isSystemAccount: true, allowManualEntry: false },
  { code: '5002', name: 'مصروفات استهلاك داخلي (مستلزمات)', nameEn: 'Internal Consumption Expense', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5400', isSystemAccount: true, allowManualEntry: false },
  { code: '5003', name: 'تسوية المخزون', nameEn: 'Inventory Adjustment', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5400', isSystemAccount: true, allowManualEntry: false },

  // ── رواتب وأجور ──
  { code: '5101', name: 'رواتب أساسية - مدرسون', nameEn: 'Teacher Salaries', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5200' },
  { code: '5102', name: 'رواتب أساسية - إداريون', nameEn: 'Admin Salaries', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5200' },
  { code: '5103', name: 'بدلات وحوافز', nameEn: 'Allowances & Bonuses', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5200' },
  { code: '5104', name: 'تأمينات اجتماعية (حصة المدرسة)', nameEn: 'Social Insurance (Employer)', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5200', isSystemAccount: true },

  // ── مصروفات إدارية ──
  { code: '5201', name: 'إيجار المبنى', nameEn: 'Building Rent', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5300' },
  { code: '5202', name: 'كهرباء ومياه', nameEn: 'Utilities', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5300' },
  { code: '5203', name: 'صيانة وإصلاحات', nameEn: 'Maintenance & Repairs', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5300' },
  { code: '5204', name: 'نظافة وأمن', nameEn: 'Cleaning & Security', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5300' },
  { code: '5205', name: 'اتصالات وإنترنت', nameEn: 'Telecom & Internet', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5300' },
  { code: '5206', name: 'مطبوعات وقرطاسية', nameEn: 'Printing & Stationery', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5300', isSystemAccount: true },
  { code: '5207', name: 'ضيافة واستقبال', nameEn: 'Hospitality', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5300' },

  // ── مصروفات نقل ──
  { code: '5301', name: 'إيجار حافلات (شهري)', nameEn: 'Monthly Bus Rental', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5500', isSystemAccount: true },
  { code: '5302', name: 'صيانة ووقود حافلات', nameEn: 'Bus Maintenance & Fuel', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5500' },
  { code: '5303', name: 'تأمين حافلات', nameEn: 'Bus Insurance', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5500' },

  // ── مصروفات تعليمية ──
  { code: '5401', name: 'كتب ومراجع مكتبة', nameEn: 'Library Books', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5600' },
  { code: '5402', name: 'أدوات معامل', nameEn: 'Lab Supplies', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5600' },
  { code: '5403', name: 'أنشطة ورحلات طلابية', nameEn: 'Student Activities & Trips', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5600' },

  // ── إهلاكات ──
  { code: '5501', name: 'إهلاك المباني', nameEn: 'Depreciation - Buildings', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5700', isSystemAccount: true },
  { code: '5502', name: 'إهلاك الأثاث والتجهيزات', nameEn: 'Depreciation - Furniture', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5700', isSystemAccount: true },
  { code: '5503', name: 'إهلاك الأجهزة والحواسب', nameEn: 'Depreciation - Equipment', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5700', isSystemAccount: true },

  // ── مصروفات متنوعة ──
  { code: '5901', name: 'مصروفات قانونية وضرائب', nameEn: 'Legal & Tax Expenses', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5900' },
  { code: '5902', name: 'مصروفات طوارئ', nameEn: 'Emergency Expenses', type: 'expense', level: 4, normalBalance: 'debit', parentCode: '5900' },
] as const;

async function seedAccounts() {
  console.log('🌱 جاري زراعة شجرة الحسابات...');

  const codeToId = new Map<string, string>();

  // تهيئة: جمع IDs الحسابات الموجودة مسبقاً
  const allExisting = await prisma.account.findMany({ select: { id: true, code: true } });
  for (const acc of allExisting) {
    codeToId.set(acc.code, acc.id);
  }

  // المرحلة الأولى: إنشاء/تحديث الحسابات بدون parentId
  for (const acc of accounts) {
    try {
      const existingId = codeToId.get(acc.code);
      if (existingId) {
        await prisma.account.update({
          where: { code: acc.code },
          data: {
            name: acc.name,
            nameEn: acc.nameEn,
            type: acc.type,
            level: acc.level,
            normalBalance: acc.normalBalance,
            isSystemAccount: (acc as any).isSystemAccount ?? false,
            allowManualEntry: (acc as any).allowManualEntry ?? (acc.level === 4),
            isActive: true,
          }
        });
      } else {
        const created = await prisma.account.create({
          data: {
            code: acc.code,
            name: acc.name,
            nameEn: acc.nameEn,
            type: acc.type,
            level: acc.level,
            normalBalance: acc.normalBalance,
            isSystemAccount: (acc as any).isSystemAccount ?? false,
            allowManualEntry: (acc as any).allowManualEntry ?? (acc.level === 4),
            isActive: true,
          }
        });
        codeToId.set(acc.code, created.id);
      }
    } catch (e: any) {
      console.error(`❌ فشل إنشاء الحساب ${acc.code} (${acc.name}):`, e.message);
    }
  }

  // المرحلة الثانية: ربط العلاقات الأبوية
  let linkedCount = 0;
  for (const acc of accounts) {
    const parentCode = (acc as any).parentCode;
    if (parentCode) {
      const parentId = codeToId.get(parentCode);
      const childId = codeToId.get(acc.code);
      if (parentId && childId) {
        await prisma.account.update({
          where: { id: childId },
          data: { parentId }
        });
        linkedCount++;
      } else {
        console.warn(`⚠️  الحساب ${acc.code}: لم يوجد الأب "${parentCode}"`);
      }
    }
  }

  console.log(`✅ تم إنشاء/تحديث ${accounts.length} حساب، ربط ${linkedCount} علاقة أبوية`);
}

async function seedFiscalYear() {
  console.log('🌱 جاري إنشاء السنة المالية والفترات...');

  const existingYear = await prisma.fiscalYear.findFirst({ where: { yearCode: '2025-2026' } });
  if (existingYear) {
    console.log('⏭  السنة المالية 2025-2026 موجودة مسبقاً');
    return;
  }

  const fiscalYear = await prisma.fiscalYear.create({
    data: {
      yearCode: '2025-2026',
      nameAr: 'السنة المالية 2025-2026',
      nameEn: 'Fiscal Year 2025-2026',
      startDate: '2025-07-01',
      endDate: '2026-06-30',
      status: 'active'
    }
  });

  const months = [
    { code: '2025-07', nameAr: 'يوليو 2025',    nameEn: 'July 2025',      start: '2025-07-01', end: '2025-07-31' },
    { code: '2025-08', nameAr: 'أغسطس 2025',    nameEn: 'August 2025',    start: '2025-08-01', end: '2025-08-31' },
    { code: '2025-09', nameAr: 'سبتمبر 2025',   nameEn: 'September 2025', start: '2025-09-01', end: '2025-09-30' },
    { code: '2025-10', nameAr: 'أكتوبر 2025',   nameEn: 'October 2025',   start: '2025-10-01', end: '2025-10-31' },
    { code: '2025-11', nameAr: 'نوفمبر 2025',   nameEn: 'November 2025',  start: '2025-11-01', end: '2025-11-30' },
    { code: '2025-12', nameAr: 'ديسمبر 2025',   nameEn: 'December 2025',  start: '2025-12-01', end: '2025-12-31' },
    { code: '2026-01', nameAr: 'يناير 2026',    nameEn: 'January 2026',   start: '2026-01-01', end: '2026-01-31' },
    { code: '2026-02', nameAr: 'فبراير 2026',   nameEn: 'February 2026',  start: '2026-02-01', end: '2026-02-28' },
    { code: '2026-03', nameAr: 'مارس 2026',     nameEn: 'March 2026',     start: '2026-03-01', end: '2026-03-31' },
    { code: '2026-04', nameAr: 'أبريل 2026',    nameEn: 'April 2026',     start: '2026-04-01', end: '2026-04-30' },
    { code: '2026-05', nameAr: 'مايو 2026',     nameEn: 'May 2026',       start: '2026-05-01', end: '2026-05-31' },
    { code: '2026-06', nameAr: 'يونيو 2026',    nameEn: 'June 2026',      start: '2026-06-01', end: '2026-06-30' },
  ];

  for (const m of months) {
    await prisma.accountingPeriod.upsert({
      where: { periodCode: m.code },
      create: {
        periodCode: m.code,
        nameAr: m.nameAr,
        nameEn: m.nameEn,
        startDate: m.start,
        endDate: m.end,
        fiscalYearId: fiscalYear.id,
        status: 'open'
      },
      update: {}
    });
  }

  console.log('✅ السنة المالية والفترات الشهرية جاهزة');
}

async function seedCostCenters() {
  console.log('🌱 جاري إنشاء مراكز التكلفة...');
  const centers = [
    { code: 'ADMIN', nameAr: 'الإدارة العامة',     nameEn: 'Administration' },
    { code: 'TEACH', nameAr: 'قسم التدريس',         nameEn: 'Teaching' },
    { code: 'BUS',   nameAr: 'قسم النقل',           nameEn: 'Transportation' },
    { code: 'STORE', nameAr: 'المخزن',              nameEn: 'Warehouse' },
    { code: 'MAINT', nameAr: 'الصيانة والخدمات',   nameEn: 'Maintenance & Services' },
    { code: 'KG',    nameAr: 'مرحلة الروضة',        nameEn: 'Kindergarten' },
    { code: 'PRIM',  nameAr: 'المرحلة الابتدائية',  nameEn: 'Primary' },
    { code: 'PREP',  nameAr: 'المرحلة الإعدادية',   nameEn: 'Preparatory' },
    { code: 'SEC',   nameAr: 'المرحلة الثانوية',    nameEn: 'Secondary' },
  ];

  let created = 0;
  for (const c of centers) {
    const existing = await prisma.costCenter.findUnique({ where: { code: c.code } });
    if (!existing) {
      await prisma.costCenter.create({ data: { code: c.code, nameAr: c.nameAr, nameEn: c.nameEn } });
      created++;
    }
  }
  console.log(`✅ تم إنشاء ${created} مراكز تكلفة (${centers.length - created} موجودة مسبقاً)`);
}

async function main() {
  try {
    await seedAccounts();
    await seedFiscalYear();
    await seedCostCenters();
    console.log('\n🎉 اكتملت عملية زراعة البيانات المحاسبية بنجاح');
  } catch (e) {
    console.error('خطأ:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
